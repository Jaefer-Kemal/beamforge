## Why This Matters in Production

A `gen_server` process handles messages from its mailbox strictly one at a time. This guarantees that your state map is never subject to concurrent data races.
However, this serial execution model introduces a severe architectural danger: **Head-of-Line (HoL) Blocking**.

Imagine an analytics coordinator server:
1. Client A calls `generate_report(Server, "report_monthly")`, which requires heavy computational aggregation taking **500ms**.
2. While the server is executing that 500ms computation inside `handle_call/3`, Clients B, C, and D submit fast requests: `get_completed_count(Server)` (which takes **0.01ms**).
3. **Clients B, C, and D are frozen waiting in the mailbox!** Fast queries experience unacceptable latency spikes solely because a slow job blocked the server thread.

Erlang solves this elegant design challenge with **`gen_server:reply/2`**!

## Deep Concept Breakdown & Under the Hood

### Unblocking the Server: `{noreply, State}` + `gen_server:reply/2`

Look closely at the arguments of `handle_call/3`:
```erlang
handle_call(Request, From, State)
```
What is `From`?
As we discovered in Chapter 6 (Lesson 6.8), `From` is the tuple `{ClientPid, MonitorRefTag}`!
Usually, your callback returns `{reply, Reply, NewState}`, and the `gen_server` engine immediately sends the reply to `From`.

However, OTP provides an alternative:
1. When a heavy request arrives, you **do not compute it inside `handle_call`**.
2. Instead, you spawn a disposable helper worker process and pass `From` to that worker.
3. Your `handle_call` immediately returns **`{noreply, UpdatedState}`**!

```erlang
handle_call({generate_report, JobId, ComputeFun}, From, State = #{in_flight := InFlight}) ->
    ServerSelf = self(),
    spawn(fun() ->
        Result = ComputeFun(),
        %% 1. Worker directly unblocks waiting client via From tag!
        gen_server:reply(From, {ok, JobId, Result}),
        %% 2. Worker informs coordinator of completion
        ServerSelf ! {job_finished, JobId}
    end),
    %% Server loop returns in 2 microseconds!
    {noreply, State#{in_flight := InFlight + 1}}.
```

Because `handle_call/3` returned `{noreply, ...}` in **2 microseconds**, the `gen_server` is immediately free to answer incoming fast queries from Clients B, C, and D! Meanwhile, Client A remains paused in its synchronous `call` until the background worker delivers the answer directly via `gen_server:reply(From, ...)`.

### Process Hibernation: `hibernate`

In large-scale systems (like chat servers with 1,000,000 connected rooms or background workers waiting between cron sweeps), thousands of processes sit idle for minutes or hours. Even an idle BEAM process occupies memory for its heap, stack, and reduction tables.

When an actor is idle, returning `hibernate` as the 4th element of a return tuple:
```erlang
{reply, Reply, NewState, hibernate}
%% or
{noreply, NewState, hibernate}
```
instructs the BEAM VM to:
1. Run an immediate, aggressive full-sweep garbage collection.
2. Discard the call stack.
3. Compact the heap into a single contiguous block of minimal memory (~300 bytes).
4. Put the process into deep hibernation until the next message arrives in its mailbox!

When a new message arrives, the BEAM automatically wakes the process without any special handling in your code.

> [!warning] Production OTP Trap: Forgetting to Reply from the Spawned Worker
> If you spawn a worker to handle a call and that worker crashes or exits before calling `gen_server:reply(From, ...)`, the client process will hang until its 5,000ms call timeout expires! In production, wrap the worker computation in `try...catch` to guarantee that `gen_server:reply(From, {error, worker_crashed})` is always invoked.

## Parallel Worked Example

The following image processor coordinator demonstrates async worker offloading with `gen_server:reply/2`:

```erlang
-module(image_coordinator).
-behaviour(gen_server).
-export([start_link/0, resize_image/3, get_metrics/1, sleep_idle/1, stop/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link() -> gen_server:start_link(?MODULE, [], []).
resize_image(Pid, ImgId, ResizeFun) -> gen_server:call(Pid, {resize, ImgId, ResizeFun}, 5000).
get_metrics(Pid) -> gen_server:call(Pid, get_metrics).
sleep_idle(Pid) -> gen_server:call(Pid, sleep_idle).
stop(Pid) -> gen_server:stop(Pid).

init([]) -> {ok, #{active => 0, done => 0}}.

handle_call({resize, ImgId, ResizeFun}, From, State = #{active := Active}) ->
    Self = self(),
    spawn(fun() ->
        Res = ResizeFun(),
        gen_server:reply(From, {ok, ImgId, Res}),
        Self ! {task_done, ImgId}
    end),
    {noreply, State#{active := Active + 1}};
handle_call(get_metrics, _From, State = #{active := A, done := D}) ->
    {reply, #{active => A, done => D}, State};
handle_call(sleep_idle, _From, State) ->
    {reply, sleeping, State, hibernate}.

handle_cast(_Msg, State) -> {noreply, State}.

handle_info({task_done, _ImgId}, State = #{active := A, done := D}) ->
    {noreply, State#{active := A - 1, done := D + 1}};
handle_info(_Info, State) -> {noreply, State}.

terminate(_R, _S) -> ok.
code_change(_O, S, _E) -> {ok, S}.
```

## Assignment Specification

Implement `src/async_report_server.erl` managing background computational reports without blocking client traffic:
1. `start_link() -> {ok, Pid}`:
   - Initializes with state `#{in_flight => 0, completed => 0}`.
2. `generate_report(Pid, JobId, ComputeFun) -> {ok, JobId, Result}`:
   - Synchronous call `gen_server:call(Pid, {generate_report, JobId, ComputeFun}, 3000)`.
   - In `handle_call/3`:
     - Spawns a background worker executing `Result = ComputeFun()`.
     - The worker invokes `gen_server:reply(From, {ok, JobId, Result})` directly to unblock the caller.
     - The worker informs the server via `ServerPid ! {job_finished, JobId}`.
     - Immediately returns `{noreply, State#{in_flight := InFlight + 1}}`.
3. `handle_info({job_finished, _JobId}, State)`:
   - Decrements `in_flight - 1` and increments `completed + 1`. Returns `{noreply, NewState}`.
4. `get_completed_count(Pid) -> {ok, #{in_flight => non_neg_integer(), completed => non_neg_integer()}}`:
   - Synchronous call returning the current in-flight and completed counters.
5. `hibernate_idle(Pid) -> hibernated`:
   - Calls `gen_server:call(Pid, hibernate_now)` whose `handle_call` returns `{reply, hibernated, State, hibernate}`.
6. `stop(Pid) -> ok`.

## Rules & Verification Constraints

- Must export `start_link/0`, `generate_report/3`, `get_completed_count/1`, `hibernate_idle/1`, and `stop/1`.
- `handle_call` for `generate_report` must return `{noreply, ...}` and use `gen_server:reply/2` from the worker.
- Must support `hibernate` return tuple in `hibernate_idle/1`.
