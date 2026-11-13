import { LessonContent } from '../../types/workspace';

export const CHAPTER_7_LESSONS: LessonContent[] = [
  // ── Lesson 7.1: Guided Demo ───────────────────────────────────────────────
  {
    id: 'ch07-l01',
    chapterNumber: 7,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'From my_gen_server to OTP gen_server & Live sys:get_state/1 Introspection',
    difficulty: 'Intermediate',
    xpReward: 50,
    visualScene: 'supervision_rest_for_one_ets_heir',
    conceptMarkdown: `## Why This Matters in Production

In Chapters 5 and 6, we designed custom actor loops using \`spawn\`, \`receive\`, \`make_ref()\`, and \`monitor\`. In Lesson 6.8, we even built our own \`my_gen_server.erl\` from scratch, demonstrating that synchronous calls under the hood are simply a monitor, a tagged message, and a selective receive.

While writing raw actor loops teaches the foundational mechanics of the BEAM, **writing raw process loops in production is a severe anti-pattern**.

Why? Because a production backend process in WhatsApp, Klarna, or Ericsson must handle dozens of complex system concerns beyond its core domain logic:
1. **Supervisor Integration**: Responding to parent shutdown signals (\`{'EXIT', Sup, shutdown}\`) and graceful termination timeouts.
2. **Hot Code Upgrades**: Migrating internal process state across version upgrades without restarting the VM via \`code_change/3\`.
3. **Live System Introspection**: Allowing operators to inspect live state using \`sys:get_state/1\` and \`sys:get_status/1\` without halting the process or creating concurrency races.
4. **Debug Tracing & Event Logging**: Dynamically enabling execution tracing via \`sys:trace(Pid, true)\`.

Erlang solves this with **OTP Behaviours**. An OTP Behaviour uses the **Inversion of Control (IoC)** pattern: the OTP runtime provides the battle-hardened generic engine that handles concurrency, timeouts, and system messages, while you supply a clean, pure callback module.

## Deep Concept Breakdown & Under the Hood

### Inversion of Control: The Engine vs. Callback Model

In a raw process loop, your code is in control:
\`\`\`erlang
%% Raw Loop: You control everything (and must handle every edge case!)
loop(State) ->
    receive
        {call, From, Msg} ->
            NewState = handle_msg(Msg, State),
            From ! {reply, ok},
            loop(NewState)
    end.
\`\`\`

In an OTP Behaviour, **OTP is in control**. The standard library module \`gen_server.erl\` owns the \`receive\` loop. When a message arrives, the \`gen_server\` engine invokes your exported callback functions:

| Generic Engine (\`gen_server.erl\`) | Your Callback Module (\`Mod.erl\`) | Architectural Responsibility |
| :--- | :--- | :--- |
| \`gen_server:start_link(Mod, Args, Opts)\` | \`Mod:init(Args)\` | Process spawning, linking, and initial state creation. |
| \`gen_server:call(Pid, Request)\` | \`Mod:handle_call(Req, From, State)\` | Synchronous request-reply with monitor crash detection. |
| \`gen_server:cast(Pid, Message)\` | \`Mod:handle_cast(Msg, State)\` | Asynchronous fire-and-forget message handling. |
| Raw incoming messages (\`!\`, timers, sockets) | \`Mod:handle_info(Info, State)\` | Handling out-of-band signals and system timers. |
| Supervisor shutdown or \`gen_server:stop/1\` | \`Mod:terminate(Reason, State)\` | Cleaning up file handles, sockets, and ports. |
| Live code loading | \`Mod:code_change(OldVsn, State, Extra)\` | Transforming state maps between software releases. |

### The \`-behaviour(gen_server).\` Compiler Contract

Adding \`-behaviour(gen_server).\` tells the Erlang compiler to verify that your module exports all required callbacks. If you forget to export \`handle_call/3\` or \`handle_info/2\`, \`erlc\` emits compilation warnings alerting you before deployment:

\`\`\`erlang
-module(my_server).
-behaviour(gen_server).

%% Client API
-export([start_link/0, get_value/1, stop/1]).

%% Required gen_server Callbacks
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).
\`\`\`

### Inspecting Live State with \`sys:get_state/1\`

One of the greatest operational superpowers of the BEAM VM is zero-downtime introspection. In languages like C++, Java, or Go, inspecting the private memory of a running thread requires attaching a heavy debugger (like GDB or Delve) that pauses thread execution.

In Erlang, because every \`gen_server\` process understands system protocol messages, an operator in the production Erlang shell can run:

\`\`\`erlang
State = sys:get_state(ServerPid).
\`\`\`

The \`gen_server\` engine intercepts the system message, extracts its current internal \`State\` term, and replies to the operator **without dropping client requests or mutating state**!

> [!warning] Production OTP Trap: Never Block Inside gen_server Callbacks
> Because a \`gen_server\` processes its mailbox sequentially, calling a slow external API (e.g. \`httpc:request\`) or sleeping with \`timer:sleep/1\` inside \`handle_call/3\` freezes the entire server. All subsequent client calls get stuck in the mailbox and will eventually crash with \`{timeout, {gen_server, call, ...}}\` after 5,000ms!

## Official Erlang Docs & Function Reference

Before inspecting the parallel monitor implementation, familiarize yourself with the official OTP core interfaces:

- **\`gen_server:start_link/3,4\`** — Spawns and links a new \`gen_server\` process, synchronously calling \`Mod:init/1\` before returning. Ensures the caller receives exit signals if the server crashes during startup.
- **\`gen_server:call/2,3\`** — Sends a synchronous request to the \`gen_server\` and suspends caller execution until a reply arrives (or default 5,000ms timeout expires). Uses internal monitors to fail immediately if the target process dies.
- **\`gen_server:cast/2\`** — Sends an asynchronous, non-blocking fire-and-forget message to the \`gen_server\` mailbox and returns \`ok\` immediately.
- **\`sys:get_state/1,2\`** — Synchronously retrieves the internal state term of an OTP process via the system message protocol without disrupting normal message dispatching.

## Parallel Worked Example: The IoT Telemetry Monitor (device_telemetry.erl)

To see how an OTP behaviour separates client API wrappers from internal callback evaluation, consider \`device_telemetry.erl\`. This server monitors an IoT edge node: tracking battery percentage, counting transmitted packets asynchronously, and allowing synchronous status queries and live operator inspection with \`sys:get_state/1\`.

Notice how the module exports both the **Client API** (invoked by external processes) and the **gen_server Callbacks** (invoked internally by the OTP engine):

\`\`\`erlang
-module(device_telemetry).
-behaviour(gen_server).

%% Client API
-export([start_link/1, record_packet/2, query_status/1, stop/1]).

%% gen_server Callbacks
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

%% @doc Starts and links the telemetry monitor gen_server with initial battery percentage.
start_link(InitialBattery) ->
    gen_server:start_link(?MODULE, [InitialBattery], []).

%% @doc Asynchronously records transmitted telemetry packet bytes without blocking caller.
record_packet(Pid, ByteCount) when is_integer(ByteCount), ByteCount > 0 ->
    gen_server:cast(Pid, {record_packet, ByteCount}).

%% @doc Synchronously queries the current telemetry metrics from the server.
query_status(Pid) ->
    gen_server:call(Pid, get_status).

%% @doc Synchronously requests clean termination of the telemetry server.
stop(Pid) ->
    gen_server:stop(Pid).

%% ── gen_server Callbacks ─────────────────────────────────────────────────────

%% @doc Initializes internal state map with initial battery and zeroed packet counts.
init([InitialBattery]) ->
    InitialState = #{
        battery_pct => InitialBattery,
        packets_sent => 0,
        total_bytes => 0
    },
    {ok, InitialState}.

%% @doc Handles synchronous call requests.
handle_call(get_status, _From, State) ->
    {reply, {ok, State}, State};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handles asynchronous fire-and-forget cast messages.
handle_cast({record_packet, ByteCount}, State = #{packets_sent := Pkts, total_bytes := Bytes}) ->
    NewState = State#{
        packets_sent := Pkts + 1,
        total_bytes := Bytes + ByteCount
    },
    {noreply, NewState};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Transforms state across hot code releases.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
\`\`\`

### Architectural Deep Dive: What the BEAM is Doing

1. **Step 1: Inversion of Control & Process Initialization (\`init/1\`)**
   When \`device_telemetry:start_link(100)\` is called, the calling process invokes \`gen_server:start_link/3\`. The OTP engine allocates a new BEAM process, atomically links it to the caller, and synchronously invokes \`device_telemetry:init([100])\` in the child process. The child constructs its initial state map (\`#{battery_pct => 100, packets_sent => 0, total_bytes => 0}\`) and returns \`{ok, InitialState}\`. The OTP engine completes the handshake and returns \`{ok, ChildPid}\` to the caller.

2. **Step 2: Non-Blocking Asynchronous Telemetry Ingestion (\`handle_cast/2\`)**
   Calling \`device_telemetry:record_packet(Pid, 64)\` evaluates \`gen_server:cast(Pid, {record_packet, 64})\`. The OTP engine delivers a special tagged tuple \`{'$gen_cast', {record_packet, 64}}\` directly into \`Pid\`'s mailbox and immediately returns \`ok\` to the caller. When the server process reaches this message in its mailbox, the OTP engine invokes \`handle_cast/2\`. The callback updates its byte count and packet tally, returning \`{noreply, NewState}\`.

3. **Step 3: Synchronous Request-Reply Lifecycle (\`handle_call/3\`)**
   Calling \`device_telemetry:query_status(Pid)\` evaluates \`gen_server:call(Pid, get_status)\`. The caller sets up a monitor on \`Pid\`, generates a unique reference \`MRef\`, transmits \`{'$gen_call', {self(), MRef}, get_status}\`, and suspends in a selective receive. The server receives the call, invokes \`handle_call(get_status, From, State)\`, and returns \`{reply, {ok, State}, State}\`. The OTP engine sends \`{MRef, {ok, State}}\` back to the caller and flushes the monitor.

4. **Step 4: Live System Introspection via System Protocol Messages (\`sys:get_state/1\`)**
   When an operator or monitoring tool calls \`sys:get_state(Pid)\`, the system library transmits a tagged system message \`{system, From, get_state}\`. The OTP \`gen_server\` engine intercepts this message before invoking normal domain callbacks, queries its internal \`State\` variable, and sends the raw state map back to the caller without stopping or modifying the process.

### Inspecting Live State in Production
Because \`device_telemetry\` implements the standard \`gen_server\` behaviour, operators in an Erlang shell or telemetry dashboard can inspect its live metrics at any time without disturbing active packet streams:

\`\`\`erlang
%% In the Erlang shell:
{ok, Pid} = device_telemetry:start_link(95),
device_telemetry:record_packet(Pid, 128),
LiveState = sys:get_state(Pid).
%% => #{battery_pct => 95, packets_sent => 1, total_bytes => 128}
\`\`\`

## Assignment Specification

This is a **Guided Runnable Demo**. The code in the editor is already fully operational.
1. Inspect the pre-written \`otp_intro_demo\` module in the editor.
2. Review the structured function definitions below.
3. Click **\`Run\`** below to execute the demo and observe the live lifecycle!

### 1. \`start_link/0\`
- **Input**: None.
- **Behavior**: Starts and links a \`gen_server\` process executing the \`otp_intro_demo\` callback module. Initializes internal state with \`counter\` set to \`0\` and \`ops\` tally set to \`0\`.
- **Examples**:
  - \`otp_intro_demo:start_link()\` returns \`{ok, <0.210.0>}\`.

### 2. \`increment/2\`
- **Input**: Process identifier \`Pid\`, integer \`Amount\`.
- **Behavior**: Asynchronously casts an increment message to \`Pid\`, increasing the internal \`counter\` by \`Amount\` and incrementing the \`ops\` count by 1 without blocking the caller.
- **Examples**:
  - \`otp_intro_demo:increment(Pid, 10)\` returns \`ok\`.

### 3. \`get_count/1\`
- **Input**: Process identifier \`Pid\`.
- **Behavior**: Synchronously queries the current integer \`counter\` value via \`gen_server:call/2\`, incrementing the internal \`ops\` tally by 1.
- **Examples**:
  - \`otp_intro_demo:get_count(Pid)\` returns \`35\`.

### 4. \`stop/1\`
- **Input**: Process identifier \`Pid\`.
- **Behavior**: Synchronously commands the server to terminate cleanly via \`gen_server:stop/1\`.
- **Examples**:
  - \`otp_intro_demo:stop(Pid)\` returns \`ok\`.

### 5. \`run_demo/0\`
- **Input**: None.
- **Behavior**: Orchestrates the complete demonstration lifecycle:
  1. Starts the server via \`start_link/0\`.
  2. Issues two asynchronous increments: \`increment(Pid, 10)\` and \`increment(Pid, 25)\`.
  3. Pauses briefly (15ms) to permit asynchronous casts to settle in the server mailbox.
  4. Queries the count with \`get_count(Pid)\`.
  5. Inspects live internal state using \`sys:get_state/1\`.
  6. Stops the server with \`stop(Pid)\`.
  7. Returns a summary map containing \`final_count\` and \`live_state\`.
- **Examples**:
  - \`otp_intro_demo:run_demo()\` returns \`#{final_count => 35, live_state => #{counter => 35, ops => 3}}\`.

## Rules & Verification Constraints

- Must export \`start_link/0\`, \`increment/2\`, \`get_count/1\`, \`stop/1\`, and \`run_demo/0\`.
- Must export all 6 mandatory \`gen_server\` callbacks: \`init/1\`, \`handle_call/3\`, \`handle_cast/2\`, \`handle_info/2\`, \`terminate/2\`, and \`code_change/3\`.
- Must verify live state using \`sys:get_state/1\`.
- Must invoke \`gen_server:start_link/3\`, \`gen_server:call/2\`, and \`gen_server:cast/2\`.
`,
    mentalModelCheck: {
      question: 'Why is writing raw spawn and receive loops considered an anti-pattern in production Erlang systems?',
      codeSnippet: `%% Raw Process Loop:
loop(State) ->
    receive Msg -> loop(handle(Msg, State)) end.`,
      options: [
        {
          id: 'A',
          label: 'Raw loops fail to handle standard OTP system messages, breaking supervisor shutdowns, live sys:get_state/1 inspection, and hot code upgrades.',
          isCorrect: true,
          explanation: 'Correct! An OTP gen_server handles supervisor signals, live tracing, sys introspection, and code_change/3 out of the box, whereas raw loops silently ignore or break on system protocol messages.',
        },
        {
          id: 'B',
          label: 'Raw spawn loops consume 100x more RAM than gen_server processes.',
          isCorrect: false,
          explanation: 'Both use standard BEAM processes with ~2.5 KB initial heap.',
        },
        {
          id: 'C',
          label: 'Erlang prevents modules from compiling if they use spawn.',
          isCorrect: false,
          explanation: 'spawn/1 and spawn/3 are standard built-in functions, but OTP provides higher-level abstractions.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'gen_server',
        signature: 'gen_server:start_link(Mod, Args, Opts) -> {ok, Pid} | {error, Reason}',
        typesSpec: ['Mod = module()', 'Args = term()', 'Opts = list()'],
        description: 'Spawns a gen_server linked to the caller, synchronously invoking Mod:init(Args).',
        complexityNote: 'O(1) process creation with atomic link.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#start_link/3',
      },
      {
        functionName: 'call',
        module: 'gen_server',
        signature: 'gen_server:call(ServerRef, Request) -> Reply',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()', 'Reply = term()'],
        description: 'Makes a synchronous call to the ServerRef by sending a request and waiting for a reply.',
        complexityNote: 'O(1) message round-trip with monitor guarantee.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#call/2',
      },
      {
        functionName: 'cast',
        module: 'gen_server',
        signature: 'gen_server:cast(ServerRef, Request) -> ok',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()'],
        description: 'Sends an asynchronous request to the ServerRef and returns ok immediately, without waiting for a reply.',
        complexityNote: 'O(1) asynchronous message send.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#cast/2',
      },
      {
        functionName: 'get_state',
        module: 'sys',
        signature: 'sys:get_state(Pid) -> State',
        typesSpec: ['Pid = pid() | atom()', 'State = term()'],
        description: 'Synchronously queries the internal state of a process implementing OTP system messages.',
        complexityNote: 'O(1) system message round-trip.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/sys.html#get_state/1',
      },
    ],
    starterCode: `-module(otp_intro_demo).
-behaviour(gen_server).

-export([
    start_link/0,
    increment/2,
    get_count/1,
    stop/1,
    run_demo/0
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the OTP intro demo gen_server.
start_link() ->
    gen_server:start_link(?MODULE, [], []).

%% @doc Asynchronously casts an increment amount to the server.
increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

%% @doc Synchronously queries the current counter value.
get_count(Pid) ->
    gen_server:call(Pid, get_count).

%% @doc Synchronously requests clean termination of the gen_server.
stop(Pid) ->
    gen_server:stop(Pid).

%% @doc Demonstrates the full server lifecycle and live sys:get_state/1 introspection.
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% @doc Initializes the server with counter and operations tally set to zero.
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

%% @doc Handles synchronous call requests.
handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handles asynchronous cast messages.
handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Handles state transformations across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(otp_intro_demo).
-behaviour(gen_server).

-export([
    start_link/0,
    increment/2,
    get_count/1,
    stop/1,
    run_demo/0
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the OTP intro demo gen_server.
start_link() ->
    gen_server:start_link(?MODULE, [], []).

%% @doc Asynchronously casts an increment amount to the server.
increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

%% @doc Synchronously queries the current counter value.
get_count(Pid) ->
    gen_server:call(Pid, get_count).

%% @doc Synchronously requests clean termination of the gen_server.
stop(Pid) ->
    gen_server:stop(Pid).

%% @doc Demonstrates the full server lifecycle and live sys:get_state/1 introspection.
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% @doc Initializes the server with counter and operations tally set to zero.
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

%% @doc Handles synchronous call requests.
handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handles asynchronous cast messages.
handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Handles state transformations across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    files: [
      {
        name: 'otp_intro_demo.erl',
        path: 'src/otp_intro_demo.erl',
        content: `-module(otp_intro_demo).
-behaviour(gen_server).

-export([
    start_link/0,
    increment/2,
    get_count/1,
    stop/1,
    run_demo/0
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the OTP intro demo gen_server.
start_link() ->
    gen_server:start_link(?MODULE, [], []).

%% @doc Asynchronously casts an increment amount to the server.
increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

%% @doc Synchronously queries the current counter value.
get_count(Pid) ->
    gen_server:call(Pid, get_count).

%% @doc Synchronously requests clean termination of the gen_server.
stop(Pid) ->
    gen_server:stop(Pid).

%% @doc Demonstrates the full server lifecycle and live sys:get_state/1 introspection.
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% @doc Initializes the server with counter and operations tally set to zero.
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

%% @doc Handles synchronous call requests.
handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handles asynchronous cast messages.
handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Handles state transformations across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/otp_intro_demo.erl': `-module(otp_intro_demo).
-behaviour(gen_server).

-export([
    start_link/0,
    increment/2,
    get_count/1,
    stop/1,
    run_demo/0
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the OTP intro demo gen_server.
start_link() ->
    gen_server:start_link(?MODULE, [], []).

%% @doc Asynchronously casts an increment amount to the server.
increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

%% @doc Synchronously queries the current counter value.
get_count(Pid) ->
    gen_server:call(Pid, get_count).

%% @doc Synchronously requests clean termination of the gen_server.
stop(Pid) ->
    gen_server:stop(Pid).

%% @doc Demonstrates the full server lifecycle and live sys:get_state/1 introspection.
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% @doc Initializes the server with counter and operations tally set to zero.
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

%% @doc Handles synchronous call requests.
handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handles asynchronous cast messages.
handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Handles state transformations across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    visibleTestCases: [
      {
        id: 'tc-ch07-01-1',
        title: 'Run Guided Demo & Verify Final State',
        erlangCall: 'otp_intro_demo:run_demo()',
        expectedOutput: '#{final_count => 35, live_state => #{counter => 35, ops => 3}}',
        explanation: 'Spawns server, performs 2 increments and 1 call, inspects live state via sys:get_state/1, and stops cleanly.',
      },
    ],
    solutionExplanation: 'Demonstrates OTP Inversion of Control with gen_server callbacks and live state inspection via sys:get_state/1 without taking down the process.',
    astRules: {
      requiredCalls: ['gen_server:start_link/3', 'gen_server:call/2', 'gen_server:cast/2'],
    },
  },

  // ── Lesson 7.2: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch07-l02',
    chapterNumber: 7,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'gen_server Essentials: start_link, Synchronous call & Async cast',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In distributed systems, choosing between synchronous and asynchronous communication dictates system reliability, throughput, and memory stability:
- **Synchronous Calls (\`gen_server:call/2,3\`)** provide **natural backpressure**. When a client invokes \`call\`, the client process suspends execution until the server replies (or a 5,000ms timeout occurs). This physical pause acts as an automatic throttle: clients cannot submit requests faster than the server can process them!
- **Asynchronous Casts (\`gen_server:cast/2\`)** are **fire-and-forget**. The client sends the message and immediately continues executing without waiting for confirmation. While casts achieve ultra-low caller latency, they lack backpressure: if producers emit 100,000 casts/second to a server that can only handle 10,000/second, the server's mailbox swells until the BEAM node crashes with Out-Of-Memory (OOM)!

In financial backends (such as multi-currency wallets), balance queries and debit operations must be strictly synchronous to guarantee funds availability, while non-blocking credits can be cast asynchronously.

## Deep Concept Breakdown & Under the Hood

### The Callback Return Contract

In an Erlang \`gen_server\`, callback return tuples follow a strict, standardized contract:

| Callback Function | Permitted Return Tuples | Architectural Effect |
| :--- | :--- | :--- |
| **\`init(Args)\`** | \`{ok, State}\`<br>\`{ok, State, {continue, Term}}\`<br>\`{stop, Reason}\` | Spawns and links the process. Returns \`{ok, Pid}\` to the \`start_link\` caller. |
| **\`handle_call(Req, From, State)\`** | \`{reply, Reply, NewState}\`<br>\`{noreply, NewState}\`<br>\`{stop, Reason, Reply, NewState}\` | Synchronous request. \`{reply, ...}\` immediately sends the reply to \`From\`. |
| **\`handle_cast(Msg, State)\`** | \`{noreply, NewState}\`<br>\`{stop, Reason, NewState}\` | Asynchronous message. No reply is sent to the sender. |
| **\`handle_info(Info, State)\`** | \`{noreply, NewState}\`<br>\`{stop, Reason, NewState}\` | Raw messages, exit signals, and timer ticks. |

### How \`gen_server:call\` Works Under the Hood

When client code invokes \`gen_server:call(ServerPid, {debit, <<"USD">>, 50})\`:
1. The client process creates a unique monitor reference (\`MRef = erlang:monitor(process, ServerPid)\`).
2. The client sends a tagged tuple \`ServerPid ! {'$gen_call', {self(), MRef}, {debit, <<"USD">>, 50}}\`.
3. The client waits in a selective \`receive\` for either \`{MRef, Reply}\` or \`{'DOWN', MRef, process, ServerPid, Reason}\`.
4. The \`gen_server\` engine receives the message, unpacks \`From = {ClientPid, MRef}\`, invokes your \`handle_call/3\`, and automatically sends \`ClientPid ! {MRef, Reply}\` when your callback returns \`{reply, Reply, NewState}\`!

> [!warning] Production OTP Trap: The Cast Mailbox Explosion
> Never use \`gen_server:cast/2\` for requests that require backpressure or acknowledgement. If upstream traffic spikes, a \`cast\` pipeline can queue millions of messages in the server's mailbox in seconds. When in doubt, prefer \`call\`—the 5ms roundtrip latency is far cheaper than an unrecoverable production OOM restart!

## Official Erlang Docs & Function Reference

Before inspecting the parallel storage quota manager, review the key OTP primitives and map helpers:

- **\`gen_server:start_link/3,4\`** — Spawns and links a new \`gen_server\` process, synchronously calling \`Mod:init/1\` before returning. Atomically ties the lifecycle of the child server to the caller or supervisor.
- **\`gen_server:call/2,3\`** — Sends a synchronous request to the server and blocks caller execution until a reply arrives (or 5,000ms timeout expires). Provides natural backpressure and monitor-based crash detection.
- **\`gen_server:cast/2\`** — Sends an asynchronous fire-and-forget message to the server mailbox and returns \`ok\` immediately.
- **\`gen_server:stop/1,3\`** — Synchronously requests clean termination of the server with reason \`normal\`.
- **\`maps:get/3\`** — Returns the value associated with \`Key\` in \`Map\`, or returns \`Default\` if \`Key\` is not present.
- **\`maps:put/3\`** — Associates \`Key\` with \`Value\` in \`Map\`, returning a new map.

## Parallel Worked Example: Cloud Storage Quota Manager (cloud_storage_bucket.erl)

To see how synchronous calls and asynchronous casts are orchestrated in a production system, consider \`cloud_storage_bucket.erl\`. This server manages departmental cloud storage quotas: allowing non-blocking asynchronous upload notifications, while enforcing strict synchronous reservations that prevent total storage from exceeding the provisioned ceiling.

Notice how the module exports both the **Client API** and the **gen_server Callbacks**, handling both fire-and-forget uploads and synchronous space reservations:

\`\`\`erlang
-module(cloud_storage_bucket).
-behaviour(gen_server).

%% Client API
-export([
    start_link/1,
    upload_async/3,
    allocate_reserved/3,
    query_usage/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the storage bucket gen_server with a maximum byte ceiling.
start_link(MaxBytes) when is_integer(MaxBytes), MaxBytes > 0 ->
    gen_server:start_link(?MODULE, [MaxBytes], []).

%% @doc Asynchronously records department upload bytes without blocking the caller.
upload_async(Pid, Department, ByteSize) when is_integer(ByteSize), ByteSize > 0 ->
    gen_server:cast(Pid, {upload, Department, ByteSize}).

%% @doc Synchronously requests reserved department storage space with quota verification.
allocate_reserved(Pid, Department, RequestedBytes) when is_integer(RequestedBytes) ->
    gen_server:call(Pid, {reserve_space, Department, RequestedBytes}).

%% @doc Synchronously queries the total usage and per-department storage breakdown.
query_usage(Pid) ->
    gen_server:call(Pid, get_usage).

%% @doc Synchronously requests clean termination of the storage server.
stop(Pid) ->
    gen_server:stop(Pid).

%% ── gen_server Callbacks ─────────────────────────────────────────────────────

%% @doc Initializes the server state with a total quota ceiling and empty department map.
init([MaxBytes]) ->
    State = #{
        ceiling => MaxBytes,
        total_used => 0,
        departments => #{}
    },
    {ok, State}.

%% @doc Handles synchronous storage reservation and usage queries.
handle_call({reserve_space, _Department, RequestedBytes}, _From, State) when RequestedBytes =< 0 ->
    {reply, {error, invalid_request_size}, State};
handle_call({reserve_space, Department, RequestedBytes}, _From, State = #{ceiling := Max, total_used := Used, departments := Depts}) ->
    if
        Used + RequestedBytes =< Max ->
            NewUsed = Used + RequestedBytes,
            CurrentDeptUsage = maps:get(Department, Depts, 0),
            NewDepts = maps:put(Department, CurrentDeptUsage + RequestedBytes, Depts),
            RemainingQuota = Max - NewUsed,
            NewState = State#{total_used := NewUsed, departments := NewDepts},
            {reply, {ok, RemainingQuota}, NewState};
        true ->
            {reply, {error, quota_exceeded}, State}
    end;
handle_call(get_usage, _From, State) ->
    {reply, State, State};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handles asynchronous upload notifications.
handle_cast({upload, Department, ByteSize}, State = #{ceiling := Max, total_used := Used, departments := Depts}) ->
    NewUsed = min(Max, Used + ByteSize),
    CurrentDept = maps:get(Department, Depts, 0),
    NewDepts = maps:put(Department, CurrentDept + ByteSize, Depts),
    {noreply, State#{total_used := NewUsed, departments := NewDepts}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Transforms state across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
\`\`\`

### Architectural Deep Dive: What the BEAM is Doing

1. **Step 1: Process Initialization with Atomic Link (\`init/1\`)**
   When client code calls \`cloud_storage_bucket:start_link(1000)\`, the caller invokes \`gen_server:start_link/3\`. The BEAM spawns a fresh process linked to the caller and synchronously executes \`init([1000])\`. The server builds its initial state map containing its byte ceiling and an empty department usage map, returning \`{ok, State}\`. The caller unblocks receiving \`{ok, ServerPid}\`.

2. **Step 2: Asynchronous Non-Blocking Cast Notification (\`handle_cast/2\`)**
   When a service reports an upload with \`upload_async(Pid, engineering, 200)\`, \`gen_server:cast/2\` deposits \`{'$gen_cast', {upload, engineering, 200}}\` into \`Pid\`'s mailbox and immediately returns \`ok\` to the caller. The caller continues without waiting. The server loop sequentially picks up the message, invokes \`handle_cast/2\`, updates its cumulative usage, and returns \`{noreply, NewState}\`.

3. **Step 3: Synchronous Reservation Call with Backpressure (\`handle_call/3\`)**
   When requesting reserved quota with \`allocate_reserved(Pid, finance, 200)\`, \`gen_server:call/2\` issues a tagged \`$gen_call\` with a unique monitor reference and blocks the calling process. The server receives the request, evaluates whether \`Used + RequestedBytes =< Max\`, updates its state if allowed, and returns \`{reply, {ok, RemainingQuota}, NewState}\` (or \`{reply, {error, quota_exceeded}, State}\`). The engine delivers the reply to the waiting caller and drops the monitor.

4. **Step 4: Clean Resource Teardown (\`terminate/2\`)**
   Calling \`stop(Pid)\` evaluates \`gen_server:stop/1\`. The OTP engine issues a system stop request, executes \`terminate(normal, State)\` to allow the server to flush buffers or notify external nodes, and gracefully terminates the process with exit reason \`normal\`.

## Assignment Specification

Implement \`src/wallet_server.erl\` representing a multi-currency banking ledger:
\`\`\`erlang
-module(wallet_server).
-behaviour(gen_server).

-export([
    start_link/1,
    credit/3,
    debit/3,
    get_balances/1,
    stop/1
]).
\`\`\`

### 1. \`start_link/1\`
- **Input**: Map \`InitialBalances\` containing binary currency keys and non-negative integer balances.
- **Behavior**: Starts and links a \`gen_server\` process executing the \`wallet_server\` callback module. Initializes internal state as \`#{balances => InitialBalances}\`. Returns \`{ok, Pid}\` on success.
- **Examples**:
  - \`wallet_server:start_link(#{<<"USD">> => 500, <<"EUR">> => 200})\` returns \`{ok, <0.150.0>}\`.

### 2. \`credit/3\`
- **Input**: Process identifier \`Pid\`, binary \`Currency\`, positive integer \`Amount\`.
- **Behavior**: Asynchronously credits \`Amount\` to \`Currency\` via \`gen_server:cast/2\`. If \`Currency\` already exists in the ledger, increments its balance; if absent, initializes the currency with balance \`Amount\`. Returns \`ok\` immediately without waiting for server confirmation.
- **Examples**:
  - \`wallet_server:credit(W, <<"GBP">>, 150)\` returns \`ok\`.

### 3. \`debit/3\`
- **Input**: Process identifier \`Pid\`, binary \`Currency\`, integer \`Amount\`.
- **Behavior**: Synchronously debits \`Amount\` from \`Currency\` via \`gen_server:call/2\`.
  - If \`Amount\` is less than or equal to zero, replies with \`{error, invalid_amount}\`.
  - If \`Currency\` is absent from the ledger or its current balance is less than \`Amount\`, replies with \`{error, insufficient_funds}\` and leaves all balances unchanged.
  - If the existing balance is greater than or equal to \`Amount\`, deducts \`Amount\` and replies with \`{ok, NewBalance}\`.
- **Examples**:
  - \`wallet_server:debit(W, <<"USD">>, 50)\` returns \`{ok, 450}\`.
  - \`wallet_server:debit(W, <<"USD">>, 1000)\` returns \`{error, insufficient_funds}\`.
  - \`wallet_server:debit(W, <<"JPY">>, 50)\` returns \`{error, insufficient_funds}\`.
  - \`wallet_server:debit(W, <<"USD">>, -10)\` returns \`{error, invalid_amount}\`.

### 4. \`get_balances/1\`
- **Input**: Process identifier \`Pid\`.
- **Behavior**: Synchronously retrieves the current map of all currency balances via \`gen_server:call/2\`.
- **Examples**:
  - \`wallet_server:get_balances(W)\` returns \`#{<<"USD">> => 450, <<"EUR">> => 200, <<"GBP">> => 150}\`.

### 5. \`stop/1\`
- **Input**: Process identifier \`Pid\`.
- **Behavior**: Synchronously commands clean termination of the wallet server via \`gen_server:stop/1\`.
- **Examples**:
  - \`wallet_server:stop(W)\` returns \`ok\`.

## Rules & Verification Constraints

- Must export \`start_link/1\`, \`credit/3\`, \`debit/3\`, \`get_balances/1\`, and \`stop/1\`.
- Must export all 6 mandatory \`gen_server\` callbacks: \`init/1\`, \`handle_call/3\`, \`handle_cast/2\`, \`handle_info/2\`, \`terminate/2\`, and \`code_change/3\`.
- \`credit/3\` must use \`gen_server:cast/2\`.
- \`debit/3\` and \`get_balances/1\` must use \`gen_server:call/2\`.
- Internal state map must follow \`#{balances => #{Currency => Balance}}\` (verified by \`sys:get_state/1\`).
`,
    mentalModelCheck: {
      question: 'Under high traffic bursts, why is gen_server:call safer than gen_server:cast for processing operations?',
      codeSnippet: `%% Cast: returns ok instantly, zero client wait
gen_server:cast(Server, {process_transaction, Tx})

%% Call: blocks caller until server replies
gen_server:call(Server, {process_transaction, Tx})`,
      options: [
        {
          id: 'A',
          label: 'Call forces callers to wait for a reply, providing natural backpressure that prevents the server mailbox from overflowing into an Out-Of-Memory crash.',
          isCorrect: true,
          explanation: 'Correct! Callers cannot produce faster than the server consumes because each caller process is paused waiting for handle_call/3 to return.',
        },
        {
          id: 'B',
          label: 'Cast messages are encrypted, which consumes 10x more CPU cycles.',
          isCorrect: false,
          explanation: 'Cast messages are not encrypted; they are raw Erlang terms.',
        },
        {
          id: 'C',
          label: 'Call bypasses the server mailbox and writes directly to server memory.',
          isCorrect: false,
          explanation: 'Processes have completely isolated heaps; call still sends a message through the mailbox.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'gen_server',
        signature: 'gen_server:start_link(Mod, Args, Opts) -> {ok, Pid} | {error, Reason}',
        typesSpec: ['Mod = module()', 'Args = term()', 'Opts = list()'],
        description: 'Spawns a gen_server linked to the caller, synchronously invoking Mod:init(Args).',
        complexityNote: 'O(1) process creation with atomic link.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#start_link/3',
      },
      {
        functionName: 'call',
        module: 'gen_server',
        signature: 'gen_server:call(ServerRef, Request) -> Reply',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()', 'Reply = term()'],
        description: 'Performs a synchronous call to ServerRef, waiting for a reply with a default 5000ms timeout.',
        complexityNote: 'Synchronous round-trip; provides natural flow-control backpressure.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#call/2',
      },
      {
        functionName: 'cast',
        module: 'gen_server',
        signature: 'gen_server:cast(ServerRef, Request) -> ok',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()'],
        description: 'Sends an asynchronous message to ServerRef, returning ok immediately without waiting for a reply.',
        complexityNote: 'O(1) non-blocking send; lacks natural backpressure.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#cast/2',
      },
      {
        functionName: 'stop',
        module: 'gen_server',
        signature: 'gen_server:stop(ServerRef) -> ok',
        typesSpec: ['ServerRef = pid() | atom()'],
        description: 'Synchronously requests clean termination of the gen_server process with exit reason normal.',
        complexityNote: 'O(1) synchronous shutdown protocol.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#stop/1',
      },
      {
        functionName: 'get',
        module: 'maps',
        signature: 'maps:get(Key, Map, Default) -> Value | Default',
        typesSpec: ['Key = term()', 'Map = map()', 'Default = term()'],
        description: 'Returns the value associated with Key in Map, or Default if Key is not present.',
        complexityNote: 'O(log N) HAMT lookup.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#get/3',
      },
      {
        functionName: 'put',
        module: 'maps',
        signature: 'maps:put(Key, Value, Map) -> Map',
        typesSpec: ['Key = term()', 'Value = term()', 'Map = map()'],
        description: 'Associates Key with Value in Map, returning a new updated map.',
        complexityNote: 'O(log N) HAMT insertion/update.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#put/3',
      },
    ],
    starterCode: `-module(wallet_server).
-behaviour(gen_server).

-export([
    start_link/1,
    credit/3,
    debit/3,
    get_balances/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the wallet server with an initial balances map.
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

%% @doc Asynchronously credits funds to the specified currency balance.
credit(_Pid, _Currency, _Amount) when _Amount > 0 ->
    ok.

%% @doc Synchronously debits funds from the specified currency balance.
debit(_Pid, _Currency, _Amount) ->
    ok.

%% @doc Synchronously queries the map of all active currency balances.
get_balances(_Pid) ->
    ok.

%% @doc Synchronously requests clean termination of the wallet server.
stop(Pid) ->
    gen_server:stop(Pid).

%% ── gen_server Callbacks ─────────────────────────────────────────────────────

%% @doc Initializes the server state with the balances map.
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

%% @doc Handles synchronous call requests.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handles asynchronous cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Handles state transformations across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(wallet_server).
-behaviour(gen_server).

-export([
    start_link/1,
    credit/3,
    debit/3,
    get_balances/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the wallet server with an initial balances map.
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

%% @doc Asynchronously credits funds to the specified currency balance.
credit(Pid, Currency, Amount) when Amount > 0 ->
    gen_server:cast(Pid, {credit, Currency, Amount}).

%% @doc Synchronously debits funds from the specified currency balance.
debit(Pid, Currency, Amount) ->
    gen_server:call(Pid, {debit, Currency, Amount}).

%% @doc Synchronously queries the map of all active currency balances.
get_balances(Pid) ->
    gen_server:call(Pid, get_balances).

%% @doc Synchronously requests clean termination of the wallet server.
stop(Pid) ->
    gen_server:stop(Pid).

%% ── gen_server Callbacks ─────────────────────────────────────────────────────

%% @doc Initializes the server state with the balances map.
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

%% @doc Handles synchronous call requests.
handle_call({debit, _Currency, Amount}, _From, State) when Amount =< 0 ->
    {reply, {error, invalid_amount}, State};
handle_call({debit, Currency, Amount}, _From, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    if
        CurrentBal >= Amount ->
            NewBal = CurrentBal - Amount,
            NewBalances = maps:put(Currency, NewBal, Balances),
            {reply, {ok, NewBal}, State#{balances := NewBalances}};
        true ->
            {reply, {error, insufficient_funds}, State}
    end;
handle_call(get_balances, _From, State = #{balances := Balances}) ->
    {reply, Balances, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handles asynchronous cast messages.
handle_cast({credit, Currency, Amount}, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    NewBalances = maps:put(Currency, CurrentBal + Amount, Balances),
    {noreply, State#{balances := NewBalances}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Handles state transformations across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    files: [
      {
        name: 'wallet_server.erl',
        path: 'src/wallet_server.erl',
        content: `-module(wallet_server).
-behaviour(gen_server).

-export([
    start_link/1,
    credit/3,
    debit/3,
    get_balances/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the wallet server with an initial balances map.
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

%% @doc Asynchronously credits funds to the specified currency balance.
credit(_Pid, _Currency, _Amount) when _Amount > 0 ->
    ok.

%% @doc Synchronously debits funds from the specified currency balance.
debit(_Pid, _Currency, _Amount) ->
    ok.

%% @doc Synchronously queries the map of all active currency balances.
get_balances(_Pid) ->
    ok.

%% @doc Synchronously requests clean termination of the wallet server.
stop(Pid) ->
    gen_server:stop(Pid).

%% ── gen_server Callbacks ─────────────────────────────────────────────────────

%% @doc Initializes the server state with the balances map.
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

%% @doc Handles synchronous call requests.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handles asynchronous cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Handles state transformations across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/wallet_server.erl': `-module(wallet_server).
-behaviour(gen_server).

-export([
    start_link/1,
    credit/3,
    debit/3,
    get_balances/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Starts and links the wallet server with an initial balances map.
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

%% @doc Asynchronously credits funds to the specified currency balance.
credit(Pid, Currency, Amount) when Amount > 0 ->
    gen_server:cast(Pid, {credit, Currency, Amount}).

%% @doc Synchronously debits funds from the specified currency balance.
debit(Pid, Currency, Amount) ->
    gen_server:call(Pid, {debit, Currency, Amount}).

%% @doc Synchronously queries the map of all active currency balances.
get_balances(Pid) ->
    gen_server:call(Pid, get_balances).

%% @doc Synchronously requests clean termination of the wallet server.
stop(Pid) ->
    gen_server:stop(Pid).

%% ── gen_server Callbacks ─────────────────────────────────────────────────────

%% @doc Initializes the server state with the balances map.
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

%% @doc Handles synchronous call requests.
handle_call({debit, _Currency, Amount}, _From, State) when Amount =< 0 ->
    {reply, {error, invalid_amount}, State};
handle_call({debit, Currency, Amount}, _From, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    if
        CurrentBal >= Amount ->
            NewBal = CurrentBal - Amount,
            NewBalances = maps:put(Currency, NewBal, Balances),
            {reply, {ok, NewBal}, State#{balances := NewBalances}};
        true ->
            {reply, {error, insufficient_funds}, State}
    end;
handle_call(get_balances, _From, State = #{balances := Balances}) ->
    {reply, Balances, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handles asynchronous cast messages.
handle_cast({credit, Currency, Amount}, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    NewBalances = maps:put(Currency, CurrentBal + Amount, Balances),
    {noreply, State#{balances := NewBalances}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handles out-of-band signals and raw messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Cleans up server resources upon termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Handles state transformations across hot code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    visibleTestCases: [
      {
        id: 'tc-ch07-02-1',
        title: 'Credit and Query Balances',
        erlangCall: 'begin {ok, W} = wallet_server:start_link(#{<<"USD">> => 100}), wallet_server:credit(W, <<"EUR">>, 50), timer:sleep(20), Bals = wallet_server:get_balances(W), wallet_server:stop(W), Bals end',
        expectedOutput: '#{<<"EUR">> => 50, <<"USD">> => 100}',
        explanation: 'Asynchronously credits 50 EUR and retrieves current balance map.',
      },
      {
        id: 'tc-ch07-02-2',
        title: 'Debit with Insufficient Funds',
        erlangCall: 'begin {ok, W} = wallet_server:start_link(#{<<"USD">> => 100}), Err = wallet_server:debit(W, <<"USD">>, 1000), wallet_server:stop(W), Err end',
        expectedOutput: '{error, insufficient_funds}',
        explanation: 'Rejects overdraft without modifying balances.',
      },
    ],
    solutionExplanation: 'Implements synchronous call for debit/get_balances with backpressure and asynchronous cast for credit, maintaining an atomic multi-currency ledger map.',
    astRules: {
      requiredCalls: ['gen_server:start_link/3', 'gen_server:call/2', 'gen_server:cast/2'],
    },
  },

  // ── Lesson 7.3: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch07-l03',
    chapterNumber: 7,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Non-Blocking Init with {continue, Term}, handle_continue/2 & Periodic handle_info/2 Timers',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In production backend clusters, slow startup times can bring down an entire system during a rolling deployment.
When a supervisor starts a child process via \`gen_server:start_link\`, **the supervisor process freezes and blocks until the child's \`init/1\` callback returns**!

If \`init/1\` executes slow operations (such as loading 10,000 cached records from disk or waiting for a network handshake), the parent supervisor is held hostage. If the supervisor takes longer than its startup timeout (typically 5,000ms), it crashes, triggering a catastrophic cascading failure up the supervision tree.

To eliminate this architectural risk, OTP 21 introduced **\`{continue, Term}\`** and **\`handle_continue/2\`**.

## Deep Concept Breakdown & Under the Hood

### The Non-Blocking \`{continue, Term}\` Protocol

Instead of performing expensive initialization inside \`init/1\`, your \`init/1\` callback returns a 3-element tuple:

\`\`\`erlang
init(Args) ->
    InitialState = #{status => booting, items => #{}},
    {ok, InitialState, {continue, hydrate_defaults}}.
\`\`\`

Here is what happens inside the BEAM:
1. \`gen_server:start_link\` immediately returns \`{ok, Pid}\` to the supervisor in less than 5 microseconds.
2. Before the \`gen_server\` engine processes **any** incoming \`call\` or \`cast\` message in its mailbox, it guarantees that **\`handle_continue(hydrate_defaults, State)\` is executed first**!
3. The process state transitions safely to \`ready\` without blocking parent supervisors during node boots.

### Why Periodic Timers Arrive in \`handle_info/2\`

A production \`gen_server\` frequently needs to run background maintenance tasks (such as purging expired TTL sessions, sweeping caches, or emitting telemetry).

In Erlang, you schedule a timer using the built-in function \`erlang:send_after(TimeMs, self(), Message)\`.

Why does this message arrive in \`handle_info/2\` instead of \`handle_cast/2\`?
- \`gen_server:cast/2\` wraps your term in an internal tuple: \`{'$gen_cast', Message}\`. The OTP engine checks for this prefix.
- Messages sent via \`erlang:send_after/3\`, raw \`!\`, socket events (\`{tcp, Sock, Data}\`), or monitor signals (\`{'DOWN', ...}\`) lack the \`'$gen_cast'\` wrapper.
- Therefore, the OTP engine routes all unwrapped messages directly to your **\`handle_info(Info, State)\`** callback!

\`\`\`erlang
%% Scheduling a self-tick every 1,000 milliseconds
handle_continue(start_timer, State) ->
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State}.

handle_info(cleanup_tick, State) ->
    NewState = purge_expired(State),
    erlang:send_after(1000, self(), cleanup_tick), %% Reschedule
    {noreply, NewState}.
\`\`\`

> [!warning] Production OTP Trap: Swallowing Unknown Messages in handle_info
> Always include a defensive catch-all clause at the bottom of your \`handle_info/2\` implementation:
> \`handle_info(_Unknown, State) -> {noreply, State}.\`
> If an unexpected message (such as a delayed monitor \`'DOWN'\` or an OS signal) arrives and no clause matches, your \`gen_server\` will immediately crash with a \`function_clause\` runtime error!

## Official Erlang Docs & Function Reference

Before inspecting the parallel lease coordinator, review the key OTP lifecycle and timer primitives:

- **\`gen_server:start_link/3,4\`** — Spawns and links a new \`gen_server\` process, synchronously calling \`Mod:init/1\` before returning. Atomically ties the lifecycle of the child server to the caller or supervisor.
- **\`gen_server:call/2,3\`** — Sends a synchronous request to the server and blocks caller execution until a reply arrives (or 5,000ms timeout expires). Provides natural backpressure and monitor-based crash detection.
- **\`gen_server:stop/1,3\`** — Synchronously requests clean termination of the server with reason \`normal\`.
- **\`erlang:send_after/3\`** — Starts a timer that delivers \`Msg\` directly to \`Dest\`'s mailbox after \`TimeMs\` milliseconds. Arrives unwrapped in \`handle_info/2\`.
- **\`erlang:system_time/1\`** — Returns the current OS system time in the specified time unit (\`second\`, \`millisecond\`, etc.).
- **\`maps:filter/2\`** — Evaluates predicate fun \`Pred(Key, Value)\` for every key-value pair in \`Map\`, returning a map of matching entries.

## Parallel Worked Example: The Device Lease Coordinator (device_lease_manager.erl)

The following production-style \`device_lease_manager\` module manages temporary edge-node hardware leases. It demonstrates two foundational OTP architectural patterns:
1. **Non-blocking boot**: Returning \`{ok, State, {continue, Term}}\` from \`init/1\` so the parent supervisor unblocks immediately, followed by post-boot warmup in \`handle_continue/2\`.
2. **Periodic background maintenance**: Using \`erlang:send_after/3\` to deliver background timer ticks to \`handle_info/2\` for automated lease auditing and eviction.

\`\`\`erlang
-module(device_lease_manager).
-behaviour(gen_server).

%% Client API
-export([
    start_link/1,
    acquire_lease/3,
    is_leased/2,
    active_count/1,
    release_lease/2,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% =============================================================================
%% 1. Client API & Interface Wrappers
%% =============================================================================

%% @doc Start and link the lease manager process with a lease duration in seconds.
start_link(LeaseTimeoutSeconds) when is_integer(LeaseTimeoutSeconds), LeaseTimeoutSeconds > 0 ->
    gen_server:start_link(?MODULE, LeaseTimeoutSeconds, []).

%% @doc Synchronously request a hardware lease for a specific device and operator.
acquire_lease(Pid, DeviceId, Operator) ->
    gen_server:call(Pid, {acquire, DeviceId, Operator}).

%% @doc Synchronously verify whether a given device currently holds an active lease.
is_leased(Pid, DeviceId) ->
    gen_server:call(Pid, {is_leased, DeviceId}).

%% @doc Query the total number of currently registered leases.
active_count(Pid) ->
    gen_server:call(Pid, active_count).

%% @doc Synchronously relinquish an existing device lease.
release_lease(Pid, DeviceId) ->
    gen_server:call(Pid, {release, DeviceId}).

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% =============================================================================
%% 2. Non-Blocking Startup & Post-Init Continuation
%% =============================================================================

init(LeaseTimeoutSeconds) ->
    InitialState = #{
        timeout => LeaseTimeoutSeconds,
        leases => #{}
    },
    %% Unblocks gen_server:start_link immediately while queueing warmup
    {ok, InitialState, {continue, warmup_master_controller}}.

handle_continue(warmup_master_controller, State = #{leases := Leases}) ->
    Now = erlang:system_time(second),
    DefaultReservation = #{
        operator => <<"system_kernel">>,
        acquired_at => Now
    },
    UpdatedLeases = maps:put(<<"edge_master_01">>, DefaultReservation, Leases),
    %% Schedule first periodic audit tick to self in 1,000ms
    erlang:send_after(1000, self(), audit_leases),
    {noreply, State#{leases := UpdatedLeases}}.

%% =============================================================================
%% 3. Synchronous Callbacks (Requests & State Queries)
%% =============================================================================

handle_call({acquire, DeviceId, Operator}, _From, State = #{leases := Leases}) ->
    Now = erlang:system_time(second),
    LeaseRecord = #{
        operator => Operator,
        acquired_at => Now
    },
    NewLeases = maps:put(DeviceId, LeaseRecord, Leases),
    {reply, ok, State#{leases := NewLeases}};

handle_call({is_leased, DeviceId}, _From, State = #{timeout := Timeout, leases := Leases}) ->
    Now = erlang:system_time(second),
    IsActive = case maps:find(DeviceId, Leases) of
        {ok, #{acquired_at := AcquiredAt}} ->
            (Now - AcquiredAt) =< Timeout;
        error ->
            false
    end,
    {reply, IsActive, State};

handle_call(active_count, _From, State = #{leases := Leases}) ->
    {reply, maps:size(Leases), State};

handle_call({release, DeviceId}, _From, State = #{leases := Leases}) ->
    {reply, ok, State#{leases := maps:remove(DeviceId, Leases)}};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% =============================================================================
%% 4. Asynchronous Casts & Periodic Maintenance in handle_info
%% =============================================================================

handle_cast(_Msg, State) ->
    {noreply, State}.

%% Timer signals from erlang:send_after/3 arrive unwrapped here
handle_info(audit_leases, State = #{timeout := Timeout, leases := Leases}) ->
    Now = erlang:system_time(second),
    ValidLeases = maps:filter(
        fun(_DevId, #{acquired_at := AcquiredAt}) ->
            (Now - AcquiredAt) =< Timeout
        end,
        Leases
    ),
    %% Re-arm periodic timer for the next maintenance window
    erlang:send_after(1000, self(), audit_leases),
    {noreply, State#{leases := ValidLeases}};

%% Defensive catch-all prevents unhandled monitor/OS signals from crashing process
handle_info(_UnknownInfo, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
\`\`\`

### Architectural Deep Dive: What the BEAM is Doing

1. **Step 1: Non-Blocking Startup & Supervisor Handshake (\`init/1\`)**
   When \`device_lease_manager:start_link(10)\` is called, the caller invokes \`gen_server:start_link/3\`. The child process executes \`init(10)\`, constructs its initial state map, and returns \`{ok, InitialState, {continue, warmup_master_controller}}\`. The OTP engine immediately completes the startup handshake and returns \`{ok, ChildPid}\` to the supervisor in microseconds without waiting for edge controllers to warm up.

2. **Step 2: Immediate Post-Init State Warmup (\`handle_continue/2\`)**
   Before the \`gen_server\` engine checks its mailbox for external client calls, it immediately evaluates \`handle_continue(warmup_master_controller, State)\`. The callback registers the default \`<<"edge_master_01">>\` reservation, arms the periodic audit timer via \`erlang:send_after(1000, self(), audit_leases)\`, and transitions to ready state.

3. **Step 3: Periodic Background Sweep via \`erlang:send_after/3\` (\`handle_info/2\`)**
   When the 1,000ms timer fires, the ERTS timer wheel delivers raw atom \`audit_leases\` to the process mailbox. Because this message lacks the \`$gen_call\` or \`$gen_cast\` prefix, the OTP engine routes it directly to \`handle_info/2\`. The callback purges expired leases using \`maps:filter/2\`, re-arms the next 1,000ms timer, and returns \`{noreply, State#{leases := ValidLeases}}\`.

4. **Step 4: Synchronous State Queries with Backpressure (\`handle_call/3\`)**
   When client processes query \`is_leased(Pid, DeviceId)\` or \`active_count(Pid)\`, the caller sends a tagged synchronous call and blocks. The server evaluates validity against \`Now - AcquiredAt =< Timeout\` and returns \`{reply, Result, State}\`. Callers cannot overwhelm the server faster than the server can process calls.

## Assignment Specification

Implement \`src/session_ttl_server.erl\` as a production-grade OTP \`gen_server\` that stores active user session tokens and automatically purges expired records using periodic background timers.

### Client API

#### \`start_link/1\`
- **Input**: \`TtlSeconds\` (positive integer representing session time-to-live in seconds).
- **Behavior**: Spawns and links the \`session_ttl_server\` process. Unblocks the caller immediately by deferring guest session hydration to \`handle_continue/2\` using the continuation term \`hydrate_defaults\`. Initializes state with the specified TTL and an empty session store.
- **Examples**:
  - \`session_ttl_server:start_link(60)\` returns \`{ok, Pid}\`.

#### \`create_session/2\`
- **Input**: \`Pid\` (pid of the running server), \`SessionId\` (binary session token).
- **Behavior**: Synchronously records the session token paired with the current system time in seconds. If the session already exists, updates its timestamp to the current time. Returns \`ok\`.
- **Examples**:
  - \`session_ttl_server:create_session(Pid, <<"sess_alpha">>)\` returns \`ok\`.

#### \`is_valid/2\`
- **Input**: \`Pid\` (pid of the running server), \`SessionId\` (binary session token).
- **Behavior**: Synchronously determines whether \`SessionId\` exists in the active session store and whether the elapsed seconds since its creation are less than or equal to the configured TTL threshold.
- **Examples**:
  - \`session_ttl_server:is_valid(Pid, <<"sess_alpha">>)\` returns \`true\` (within TTL).
  - \`session_ttl_server:is_valid(Pid, <<"sess_unknown">>)\` returns \`false\`.

#### \`get_active_count/1\`
- **Input**: \`Pid\` (pid of the running server).
- **Behavior**: Synchronously queries the total number of sessions currently stored in the server state.
- **Examples**:
  - \`session_ttl_server:get_active_count(Pid)\` returns \`1\` (immediately post-init with guest session).

#### \`stop/1\`
- **Input**: \`Pid\` (pid of the running server).
- **Behavior**: Gracefully terminates the \`gen_server\` process via \`gen_server:stop/1\`. Returns \`ok\`.
- **Examples**:
  - \`session_ttl_server:stop(Pid)\` returns \`ok\`.

### Callback Specifications

#### \`init/1\`
- **Input**: \`TtlSeconds\` (positive integer).
- **Behavior**: Returns a 3-element tuple containing \`ok\`, the initial state map holding \`ttl\` and an empty \`sessions\` map, and the continuation action \`{continue, hydrate_defaults}\`.

#### \`handle_continue/2\`
- **Input**: Continuation term \`hydrate_defaults\`, \`State\`.
- **Behavior**: Populates a default session with binary identifier \`<<"guest">>\` timestamped at the current system time in seconds. Arms the first background expiration timer to deliver \`cleanup_tick\` to \`self()\` after 1,000 milliseconds via \`erlang:send_after/3\`. Returns \`{noreply, UpdatedState}\`.

#### \`handle_info/2\`
- **Input**: Info message \`cleanup_tick\`, \`State\`.
- **Behavior**: Filters the session store to retain only records whose elapsed time from creation is within the configured TTL. Re-arms the 1,000 millisecond timer with \`cleanup_tick\` via \`erlang:send_after/3\`. Returns \`{noreply, PurgedState}\`. Includes a defensive catch-all clause for any unhandled messages.

## Rules & Verification Constraints

- Must export all required client functions and OTP callbacks.
- Must execute non-blocking post-init hydration via \`handle_continue(hydrate_defaults, State)\`.
- Must schedule periodic sweeps using \`erlang:send_after(1000, self(), cleanup_tick)\`.
- Must generate timestamps using \`erlang:system_time(second)\`.
`,
    mentalModelCheck: {
      question: 'Why does returning {ok, State, {continue, Term}} prevent supervisor boot timeouts?',
      codeSnippet: `init(Args) ->
    {ok, #{items => #{}}, {continue, hydrate_data}}.`,
      options: [
        {
          id: 'A',
          label: 'start_link returns immediately to the supervisor, while handle_continue runs before any mailbox messages are processed.',
          isCorrect: true,
          explanation: 'Correct! The supervisor unblocks in microseconds, while OTP guarantees that handle_continue/2 runs before any client calls or casts in the process mailbox.',
        },
        {
          id: 'B',
          label: 'continue spawns a separate OS thread to execute the code.',
          isCorrect: false,
          explanation: 'No OS threads are spawned; handle_continue runs in the same Erlang process.',
        },
        {
          id: 'C',
          label: 'continue disables all timeouts permanently in the BEAM runtime.',
          isCorrect: false,
          explanation: 'Timeouts remain fully active.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'gen_server',
        signature: 'gen_server:start_link(Mod, Args, Opts) -> {ok, Pid} | {error, Reason}',
        typesSpec: ['Mod = module()', 'Args = term()', 'Opts = list()'],
        description: 'Spawns a gen_server linked to the caller, synchronously invoking Mod:init(Args).',
        complexityNote: 'O(1) process creation with atomic link.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#start_link/3',
      },
      {
        functionName: 'call',
        module: 'gen_server',
        signature: 'gen_server:call(ServerRef, Request) -> Reply',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()', 'Reply = term()'],
        description: 'Performs a synchronous call to ServerRef, waiting for a reply with a default 5000ms timeout.',
        complexityNote: 'Synchronous round-trip; provides natural flow-control backpressure.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#call/2',
      },
      {
        functionName: 'stop',
        module: 'gen_server',
        signature: 'gen_server:stop(ServerRef) -> ok',
        typesSpec: ['ServerRef = pid() | atom()'],
        description: 'Synchronously requests clean termination of the gen_server process with exit reason normal.',
        complexityNote: 'O(1) synchronous shutdown protocol.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#stop/1',
      },
      {
        functionName: 'send_after',
        module: 'erlang',
        signature: 'erlang:send_after(TimeMs, Dest, Msg) -> TimerRef',
        typesSpec: ['TimeMs = non_neg_integer()', 'Dest = pid() | atom()', 'Msg = term()'],
        description: 'Starts a timer which sends Msg to Dest after TimeMs milliseconds.',
        complexityNote: 'O(log N) timer wheel insertion in ERTS runtime.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#send_after/3',
      },
      {
        functionName: 'system_time',
        module: 'erlang',
        signature: 'erlang:system_time(Unit) -> integer()',
        typesSpec: ['Unit = second | millisecond | microsecond | nanosecond'],
        description: 'Returns the current OS system time in the requested time unit.',
        complexityNote: 'O(1) hardware clock read.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#system_time/1',
      },
      {
        functionName: 'filter',
        module: 'maps',
        signature: 'maps:filter(Pred, Map) -> Map',
        typesSpec: ['Pred = fun((Key, Value) -> boolean())', 'Map = map()'],
        description: 'Returns a map containing entries for which Pred evaluates to true.',
        complexityNote: 'O(N) full map traversal.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#filter/2',
      },
    ],
    starterCode: `-module(session_ttl_server).
-behaviour(gen_server).

-export([
    start_link/1,
    create_session/2,
    is_valid/2,
    get_active_count/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the session TTL server with a given time-to-live in seconds.
start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds > 0 ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

%% @doc Synchronously record a session timestamped at the current system time.
create_session(_Pid, _SessionId) ->
    ok.

%% @doc Synchronously check if a session exists and has not exceeded its TTL.
is_valid(_Pid, _SessionId) ->
    false.

%% @doc Synchronously query the total count of active sessions.
get_active_count(_Pid) ->
    0.

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize state and defer guest hydration via handle_continue.
init(TtlSeconds) ->
    {ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}.

%% @doc Perform post-init hydration and arm the periodic sweep timer.
handle_continue(hydrate_defaults, State) ->
    {noreply, State}.

%% @doc Handle synchronous calls.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle timer messages and out-of-band signals.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(session_ttl_server).
-behaviour(gen_server).

-export([
    start_link/1,
    create_session/2,
    is_valid/2,
    get_active_count/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds > 0 ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

create_session(Pid, SessionId) ->
    gen_server:call(Pid, {create_session, SessionId}).

is_valid(Pid, SessionId) ->
    gen_server:call(Pid, {is_valid, SessionId}).

get_active_count(Pid) ->
    gen_server:call(Pid, get_active_count).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(TtlSeconds) ->
    {ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}.

handle_continue(hydrate_defaults, State = #{sessions := Sessions}) ->
    Now = erlang:system_time(second),
    NewSessions = maps:put(<<"guest">>, Now, Sessions),
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State#{sessions := NewSessions}}.

handle_call({create_session, SessionId}, _From, State = #{sessions := Sessions}) ->
    Now = erlang:system_time(second),
    NewSessions = maps:put(SessionId, Now, Sessions),
    {reply, ok, State#{sessions := NewSessions}};

handle_call({is_valid, SessionId}, _From, State = #{ttl := Ttl, sessions := Sessions}) ->
    Now = erlang:system_time(second),
    Valid = case maps:find(SessionId, Sessions) of
        {ok, CreatedAt} -> (Now - CreatedAt) =< Ttl;
        error -> false
    end,
    {reply, Valid, State};

handle_call(get_active_count, _From, State = #{sessions := Sessions}) ->
    {reply, maps:size(Sessions), State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(cleanup_tick, State = #{ttl := Ttl, sessions := Sessions}) ->
    Now = erlang:system_time(second),
    ActiveSessions = maps:filter(fun(_Id, CreatedAt) -> (Now - CreatedAt) =< Ttl end, Sessions),
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State#{sessions := ActiveSessions}};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    files: [
      {
        name: 'session_ttl_server.erl',
        path: 'src/session_ttl_server.erl',
        content: `-module(session_ttl_server).
-behaviour(gen_server).

-export([
    start_link/1,
    create_session/2,
    is_valid/2,
    get_active_count/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the session TTL server with a given time-to-live in seconds.
start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds > 0 ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

%% @doc Synchronously record a session timestamped at the current system time.
create_session(_Pid, _SessionId) ->
    ok.

%% @doc Synchronously check if a session exists and has not exceeded its TTL.
is_valid(_Pid, _SessionId) ->
    false.

%% @doc Synchronously query the total count of active sessions.
get_active_count(_Pid) ->
    0.

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize state and defer guest hydration via handle_continue.
init(TtlSeconds) ->
    {ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}.

%% @doc Perform post-init hydration and arm the periodic sweep timer.
handle_continue(hydrate_defaults, State) ->
    {noreply, State}.

%% @doc Handle synchronous calls.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle timer messages and out-of-band signals.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/session_ttl_server.erl': `-module(session_ttl_server).
-behaviour(gen_server).

-export([
    start_link/1,
    create_session/2,
    is_valid/2,
    get_active_count/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds > 0 ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

create_session(Pid, SessionId) ->
    gen_server:call(Pid, {create_session, SessionId}).

is_valid(Pid, SessionId) ->
    gen_server:call(Pid, {is_valid, SessionId}).

get_active_count(Pid) ->
    gen_server:call(Pid, get_active_count).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(TtlSeconds) ->
    {ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}.

handle_continue(hydrate_defaults, State = #{sessions := Sessions}) ->
    Now = erlang:system_time(second),
    NewSessions = maps:put(<<"guest">>, Now, Sessions),
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State#{sessions := NewSessions}}.

handle_call({create_session, SessionId}, _From, State = #{sessions := Sessions}) ->
    Now = erlang:system_time(second),
    NewSessions = maps:put(SessionId, Now, Sessions),
    {reply, ok, State#{sessions := NewSessions}};

handle_call({is_valid, SessionId}, _From, State = #{ttl := Ttl, sessions := Sessions}) ->
    Now = erlang:system_time(second),
    Valid = case maps:find(SessionId, Sessions) of
        {ok, CreatedAt} -> (Now - CreatedAt) =< Ttl;
        error -> false
    end,
    {reply, Valid, State};

handle_call(get_active_count, _From, State = #{sessions := Sessions}) ->
    {reply, maps:size(Sessions), State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(cleanup_tick, State = #{ttl := Ttl, sessions := Sessions}) ->
    Now = erlang:system_time(second),
    ActiveSessions = maps:filter(fun(_Id, CreatedAt) -> (Now - CreatedAt) =< Ttl end, Sessions),
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State#{sessions := ActiveSessions}};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    visibleTestCases: [
      {
        id: 'tc-ch07-03-1',
        title: 'Non-Blocking Guest Session Hydration',
        erlangCall: 'begin {ok, S} = session_ttl_server:start_link(60), Valid = session_ttl_server:is_valid(S, <<"guest">>), session_ttl_server:stop(S), Valid end',
        expectedOutput: 'true',
        explanation: 'Confirms that handle_continue populated default guest session immediately.',
      },
      {
        id: 'tc-ch07-03-2',
        title: 'Active Session Count Tracking',
        erlangCall: 'begin {ok, S} = session_ttl_server:start_link(60), session_ttl_server:create_session(S, <<"user_101">>), Count = session_ttl_server:get_active_count(S), session_ttl_server:stop(S), Count end',
        expectedOutput: '2',
        explanation: 'Verifies active session tally after registering user_101.',
      },
    ],
    solutionExplanation: 'Uses {continue, hydrate_defaults} for instant start_link supervisor unblocking and erlang:send_after/3 timer ticks in handle_info to sweep expired sessions.',
    astRules: {
      requiredCalls: ['erlang:send_after/3'],
    },
  },

  // ── Lesson 7.4: Concept Exercise (NEW Essential Production OTP Pattern) ────
  {
    id: 'ch07-l04',
    chapterNumber: 7,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Async Worker Offloading with gen_server:reply/2 & Process Hibernation',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

A \`gen_server\` process handles messages from its mailbox strictly one at a time. This guarantees that your state map is never subject to concurrent data races.
However, this serial execution model introduces a severe architectural danger: **Head-of-Line (HoL) Blocking**.

Imagine an analytics coordinator server:
1. Client A calls \`generate_report(Server, "report_monthly")\`, which requires heavy computational aggregation taking **500ms**.
2. While the server is executing that 500ms computation inside \`handle_call/3\`, Clients B, C, and D submit fast requests: \`get_completed_count(Server)\` (which takes **0.01ms**).
3. **Clients B, C, and D are frozen waiting in the mailbox!** Fast queries experience unacceptable latency spikes solely because a slow job blocked the server thread.

Erlang solves this elegant design challenge with **\`gen_server:reply/2\`**!

## Deep Concept Breakdown & Under the Hood

### Unblocking the Server: \`{noreply, State}\` + \`gen_server:reply/2\`

Look closely at the arguments of \`handle_call/3\`:
\`\`\`erlang
handle_call(Request, From, State)
\`\`\`
What is \`From\`?
As we discovered in Chapter 6 (Lesson 6.8), \`From\` is the tuple \`{ClientPid, MonitorRefTag}\`!
Usually, your callback returns \`{reply, Reply, NewState}\`, and the \`gen_server\` engine immediately sends the reply to \`From\`.

However, OTP provides an alternative:
1. When a heavy request arrives, you **do not compute it inside \`handle_call\`**.
2. Instead, you spawn a disposable helper worker process and pass \`From\` to that worker.
3. Your \`handle_call\` immediately returns **\`{noreply, UpdatedState}\`**!

\`\`\`erlang
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
\`\`\`

Because \`handle_call/3\` returned \`{noreply, ...}\` in **2 microseconds**, the \`gen_server\` is immediately free to answer incoming fast queries from Clients B, C, and D! Meanwhile, Client A remains paused in its synchronous \`call\` until the background worker delivers the answer directly via \`gen_server:reply(From, ...)\`.

### Process Hibernation: \`hibernate\`

In large-scale systems (like chat servers with 1,000,000 connected rooms or background workers waiting between cron sweeps), thousands of processes sit idle for minutes or hours. Even an idle BEAM process occupies memory for its heap, stack, and reduction tables.

When an actor is idle, returning \`hibernate\` as the 4th element of a return tuple:
\`\`\`erlang
{reply, Reply, NewState, hibernate}
%% or
{noreply, NewState, hibernate}
\`\`\`
instructs the BEAM VM to:
1. Run an immediate, aggressive full-sweep garbage collection.
2. Discard the call stack.
3. Compact the heap into a single contiguous block of minimal memory (~300 bytes).
4. Put the process into deep hibernation until the next message arrives in its mailbox!

When a new message arrives, the BEAM automatically wakes the process without any special handling in your code.

> [!warning] Production OTP Trap: Forgetting to Reply from the Spawned Worker
> If you spawn a worker to handle a call and that worker crashes or exits before calling \`gen_server:reply(From, ...)\`, the client process will hang until its 5,000ms call timeout expires! In production, wrap the worker computation in \`try...catch\` to guarantee that \`gen_server:reply(From, {error, worker_crashed})\` is always invoked.

## Parallel Worked Example: The Payload Hasher Coordinator

The following \`payload_hasher\` module demonstrates how a \`gen_server\` offloads CPU-intensive hashing jobs to background workers using \`gen_server:reply/2\`, completely preventing Head-of-Line blocking for quick queries, and how it enters memory-compacted hibernation when idle:

\`\`\`erlang
-module(payload_hasher).
-behaviour(gen_server).

%% Client API
-export([
    start_link/0,
    digest/3,
    get_metrics/1,
    hibernate_idle/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% =============================================================================
%% Client API
%% =============================================================================

%% @doc Start and link the payload hasher server.
start_link() ->
    gen_server:start_link(?MODULE, [], []).

%% @doc Synchronously request a cryptographic digest computed in a background worker.
digest(Pid, Algorithm, BinaryPayload) when is_atom(Algorithm), is_binary(BinaryPayload) ->
    gen_server:call(Pid, {digest, Algorithm, BinaryPayload}, 5000).

%% @doc Synchronously retrieve the current job throughput counters.
get_metrics(Pid) ->
    gen_server:call(Pid, get_metrics).

%% @doc Request the server to perform memory compaction and enter idle hibernation.
hibernate_idle(Pid) ->
    gen_server:call(Pid, hibernate_idle).

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% =============================================================================
%% gen_server Callbacks
%% =============================================================================

init([]) ->
    {ok, #{dispatched => 0, completed => 0}}.

%% Offload CPU-bound hash computation to an ephemeral worker process
handle_call({digest, Algorithm, BinaryPayload}, From, State = #{dispatched := Dispatched}) ->
    Coordinator = self(),
    spawn(fun() ->
        %% Compute digest off-process so coordinator mailbox remains unblocked
        Digest = crypto:hash(Algorithm, BinaryPayload),
        %% Directly unblock the waiting caller via the From token
        gen_server:reply(From, {ok, Digest}),
        %% Notify the coordinator that this computation finished
        Coordinator ! digest_completed
    end),
    %% Return in microseconds to continue processing incoming queries
    {noreply, State#{dispatched := Dispatched + 1}};

handle_call(get_metrics, _From, State) ->
    {reply, {ok, State}, State};

%% Instruct the BEAM VM to compact heap and hibernate until the next message
handle_call(hibernate_idle, _From, State) ->
    {reply, ok, State, hibernate};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(digest_completed, State = #{completed := Completed}) ->
    {noreply, State#{completed := Completed + 1}};
handle_info(_Unknown, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
\`\`\`

## Assignment Specification

Implement \`src/async_report_server.erl\` as an asynchronous OTP coordinator that offloads heavy computational reports to background workers without blocking quick queries in its mailbox.

### Client API

#### \`start_link/0\`
- **Input**: None.
- **Behavior**: Spawns and links the \`async_report_server\` coordinator process. Initializes internal state tracking active in-flight jobs and completed job counts, both initialized to zero. Returns \`{ok, Pid}\`.
- **Examples**:
  - \`async_report_server:start_link()\` returns \`{ok, Pid}\`.

#### \`generate_report/3\`
- **Input**: \`Pid\` (pid of the running server), \`JobId\` (binary report identifier), \`ComputeFun\` (nullary function of type \`fun(() -> term())\`).
- **Behavior**: Submits a report generation job as a synchronous call with a 3,000 millisecond timeout. The coordinator captures the caller's continuation token, spawns an ephemeral worker to evaluate \`ComputeFun\`, and returns immediately so its message loop is never blocked. Once the calculation completes, the worker directly unblocks the waiting caller with \`{ok, JobId, Result}\` and notifies the coordinator that the job has finished.
- **Examples**:
  - \`async_report_server:generate_report(Pid, <<"q1_sales">>, fun() -> 100 end)\` returns \`{ok, <<"q1_sales">>, 100}\`.

#### \`get_completed_count/1\`
- **Input**: \`Pid\` (pid of the running server).
- **Behavior**: Synchronously retrieves a map containing the current count of active in-flight jobs and successfully completed jobs.
- **Examples**:
  - \`async_report_server:get_completed_count(Pid)\` returns \`{ok, #{in_flight => 0, completed => 1}}\`.

#### \`hibernate_idle/1\`
- **Input**: \`Pid\` (pid of the running server).
- **Behavior**: Synchronously commands the coordinator to enter BEAM process hibernation, triggering immediate heap compaction and garbage collection until the next mailbox message arrives. Returns \`hibernated\`.
- **Examples**:
  - \`async_report_server:hibernate_idle(Pid)\` returns \`hibernated\`.

#### \`stop/1\`
- **Input**: \`Pid\` (pid of the running server).
- **Behavior**: Gracefully terminates the \`gen_server\` process via \`gen_server:stop/1\`. Returns \`ok\`.
- **Examples**:
  - \`async_report_server:stop(Pid)\` returns \`ok\`.

### Callback Invariants

#### \`handle_call/3\`
- For report generation requests, captures the \`From\` token and coordinator pid, spawns an ephemeral worker to evaluate \`ComputeFun\`, delivers \`{ok, JobId, Result}\` directly to \`From\` via \`gen_server:reply/2\`, and increments the \`in_flight\` counter while returning \`{noreply, UpdatedState}\` immediately.
- For hibernation requests, returns \`hibernated\` with the \`hibernate\` action atom in the 4-element return tuple.
- For metric queries, synchronously returns the current counter map wrapped in \`{ok, ...}\`.

#### \`handle_info/2\`
- When notified of job completion by an offloaded worker, decrements \`in_flight\` and increments \`completed\`. Includes a defensive catch-all clause.

## Rules & Verification Constraints

- Must export \`start_link/0\`, \`generate_report/3\`, \`get_completed_count/1\`, \`hibernate_idle/1\`, and \`stop/1\`.
- \`handle_call\` for report requests must return \`{noreply, ...}\` and use \`gen_server:reply/2\` from the worker.
- Must support \`hibernate\` return tuple in \`hibernate_idle/1\`.
`,
    mentalModelCheck: {
      question: 'How does returning {noreply, State} and using gen_server:reply/2 inside a spawned worker resolve Head-of-Line blocking?',
      codeSnippet: `handle_call({slow_task, Data}, From, State) ->
    Self = self(),
    spawn(fun() ->
        Result = compute(Data),
        gen_server:reply(From, Result),
        Self ! task_done
    end),
    {noreply, State}.`,
      options: [
        {
          id: 'A',
          label: 'The server returns {noreply, State} in microseconds, freeing it to serve other clients immediately while the worker computes the slow result and unblocks the original caller.',
          isCorrect: true,
          explanation: 'Correct! The server process is not blocked during computation. The From token carries the client PID and monitor tag, enabling the worker to reply directly to the client.',
        },
        {
          id: 'B',
          label: 'The client is terminated immediately and replaced with a websocket.',
          isCorrect: false,
          explanation: 'The client remains in a standard gen_server:call selective receive awaiting reply.',
        },
        {
          id: 'C',
          label: 'gen_server:reply/2 bypasses the Erlang runtime and writes directly to socket buffers.',
          isCorrect: false,
          explanation: 'gen_server:reply/2 simply sends the tagged {MRef, Reply} message to the client PID.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'reply',
        module: 'gen_server',
        signature: 'gen_server:reply(From, Reply) -> ok',
        typesSpec: ['From = {pid(), Tag :: term()}', 'Reply = term()'],
        description: 'Explicitly sends a reply to a client that invoked gen_server:call.',
        complexityNote: 'O(1) direct message delivery to waiting client.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#reply/2',
      },
    ],
    starterCode: `-module(async_report_server).
-behaviour(gen_server).

-export([
    start_link/0,
    generate_report/3,
    get_completed_count/1,
    hibernate_idle/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the asynchronous report coordinator.
start_link() ->
    gen_server:start_link(?MODULE, [], []).

%% @doc Offload report generation to a worker and unblock caller upon completion.
generate_report(Pid, JobId, ComputeFun) ->
    ok.

%% @doc Query the current count of in-flight and completed report jobs.
get_completed_count(Pid) ->
    ok.

%% @doc Command the coordinator process to enter memory-compacted idle hibernation.
hibernate_idle(Pid) ->
    ok.

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize in-flight and completed job counters to zero.
init([]) ->
    {ok, #{in_flight => 0, completed => 0}}.

%% @doc Handle synchronous calls.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle worker completion notifications.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(async_report_server).
-behaviour(gen_server).

-export([
    start_link/0,
    generate_report/3,
    get_completed_count/1,
    hibernate_idle/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

generate_report(Pid, JobId, ComputeFun) ->
    gen_server:call(Pid, {generate_report, JobId, ComputeFun}, 3000).

get_completed_count(Pid) ->
    gen_server:call(Pid, get_completed_count).

hibernate_idle(Pid) ->
    gen_server:call(Pid, hibernate_now).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init([]) ->
    {ok, #{in_flight => 0, completed => 0}}.

handle_call({generate_report, JobId, ComputeFun}, From, State = #{in_flight := InFlight}) ->
    ServerSelf = self(),
    spawn(fun() ->
        Result = ComputeFun(),
        gen_server:reply(From, {ok, JobId, Result}),
        ServerSelf ! {job_finished, JobId}
    end),
    {noreply, State#{in_flight := InFlight + 1}};

handle_call(get_completed_count, _From, State = #{in_flight := InFlight, completed := Completed}) ->
    {reply, {ok, #{in_flight => InFlight, completed => Completed}}, State};

handle_call(hibernate_now, _From, State) ->
    {reply, hibernated, State, hibernate};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({job_finished, _JobId}, State = #{in_flight := InFlight, completed := Completed}) ->
    {noreply, State#{in_flight := InFlight - 1, completed := Completed + 1}};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    files: [
      {
        name: 'async_report_server.erl',
        path: 'src/async_report_server.erl',
        content: `-module(async_report_server).
-behaviour(gen_server).

-export([
    start_link/0,
    generate_report/3,
    get_completed_count/1,
    hibernate_idle/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the asynchronous report coordinator.
start_link() ->
    gen_server:start_link(?MODULE, [], []).

%% @doc Offload report generation to a worker and unblock caller upon completion.
generate_report(Pid, JobId, ComputeFun) ->
    ok.

%% @doc Query the current count of in-flight and completed report jobs.
get_completed_count(Pid) ->
    ok.

%% @doc Command the coordinator process to enter memory-compacted idle hibernation.
hibernate_idle(Pid) ->
    ok.

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize in-flight and completed job counters to zero.
init([]) ->
    {ok, #{in_flight => 0, completed => 0}}.

%% @doc Handle synchronous calls.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle worker completion notifications.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/async_report_server.erl': `-module(async_report_server).
-behaviour(gen_server).

-export([
    start_link/0,
    generate_report/3,
    get_completed_count/1,
    hibernate_idle/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

generate_report(Pid, JobId, ComputeFun) ->
    gen_server:call(Pid, {generate_report, JobId, ComputeFun}, 3000).

get_completed_count(Pid) ->
    gen_server:call(Pid, get_completed_count).

hibernate_idle(Pid) ->
    gen_server:call(Pid, hibernate_now).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init([]) ->
    {ok, #{in_flight => 0, completed => 0}}.

handle_call({generate_report, JobId, ComputeFun}, From, State = #{in_flight := InFlight}) ->
    ServerSelf = self(),
    spawn(fun() ->
        Result = ComputeFun(),
        gen_server:reply(From, {ok, JobId, Result}),
        ServerSelf ! {job_finished, JobId}
    end),
    {noreply, State#{in_flight := InFlight + 1}};

handle_call(get_completed_count, _From, State = #{in_flight := InFlight, completed := Completed}) ->
    {reply, {ok, #{in_flight => InFlight, completed => Completed}}, State};

handle_call(hibernate_now, _From, State) ->
    {reply, hibernated, State, hibernate};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({job_finished, _JobId}, State = #{in_flight := InFlight, completed := Completed}) ->
    {noreply, State#{in_flight := InFlight - 1, completed := Completed + 1}};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Asynchronous Worker Report Offload',
        erlangCall: 'begin {ok, S} = async_report_server:start_link(), Res = async_report_server:generate_report(S, "rep_1", fun() -> 42 * 2 end), async_report_server:stop(S), Res end',
        expectedOutput: '{ok, "rep_1", 84}',
        explanation: 'Worker computes 84 and delivers reply directly via gen_server:reply/2.',
      },
      {
        id: 'tc2',
        title: 'Process Hibernation Verification',
        erlangCall: 'begin {ok, S} = async_report_server:start_link(), Res = async_report_server:hibernate_idle(S), async_report_server:stop(S), Res end',
        expectedOutput: 'hibernated',
        explanation: 'Puts idle gen_server into compact heap hibernation.',
      },
    ],
    solutionExplanation: 'Eliminates Head-of-Line blocking by returning {noreply, State} immediately from handle_call while an offloaded worker evaluates the report and delivers the reply via gen_server:reply/2.',
    astRules: {
      requiredCalls: ['gen_server:reply/2'],
    },
  },

  // ── Lesson 7.5: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch07-l05',
    chapterNumber: 7,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'gen_statem: Protocol & Circuit Breaker State Machines',
    difficulty: 'Production',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In Chapter 5 (Lesson 5.6), we modeled a stateful door lock actor using **mutual tail-recursion** (\`locked(Code, Attempts)\` $\leftrightarrow$ \`unlocked(Code)\`).
While manual tail-recursive state functions work well for small scripts, complex network protocols (such as TCP handshakes, TLS negotiation, and XMPP client-to-server connections) require tracking states, state timeouts, delayed events, and transitions across dozens of phases.

For production state machines, the OTP framework provides **\`gen_statem\`** (which replaced the legacy \`gen_fsm\` in OTP 19).

In modern cloud architectures, one of the most critical patterns implemented using \`gen_statem\` is the **Circuit Breaker**:
- When downstream external services (payment APIs, database clusters, third-party auth) experience outages, naive callers keep hammering them with retries, making the outage worse and exhausting connection pools.
- A **Circuit Breaker** sits between your backend and the remote service. If calls fail repeatedly, it "trips" into an \`open\` state that **immediately fast-fails all subsequent calls in 0ms without contacting the network**!
- After an idle cooldown timeout, it transitions to \`half_open\` to test a single trial request. If successful, it automatically heals back to \`closed\`!

## Deep Concept Breakdown & Under the Hood

### The \`state_functions\` Callback Mode

A \`gen_statem\` can operate in two modes declared via \`callback_mode/0\`:
1. \`handle_event_function\`: A single callback handles all states.
2. **\`state_functions\` (Recommended & Idiomatic)**: Each state in your state machine is represented by **its own exported function of arity 3**:
   \`\`\`erlang
   StateName(EventType, EventContent, Data) ->
       {next_state, NextStateName, NewData} |
       {keep_state, NewData} |
       {keep_state, NewData, Actions}
   \`\`\`

### Event Types & State Machine Actions

Inside your state functions, \`EventType\` can be:
- \`{call, From}\`: Synchronous request initiated by \`gen_statem:call(Pid, Msg)\`. To reply, return action \`[{reply, From, Reply}]\`.
- \`cast\`: Asynchronous cast from \`gen_statem:cast(Pid, Msg)\`.
- \`info\`: Raw process messages (timers, monitors).
- **\`state_timeout\`**: A built-in timer attached strictly to the current state.

### Automated Timer Cancellation via \`state_timeout\`

When transitioning states, you can attach a state timeout action:
\`\`\`erlang
{next_state, open, NewData, [{state_timeout, 5000, try_half_open}]}
\`\`\`
The beauty of \`state_timeout\` is that **it automatically cancels itself** if the state machine leaves that state before the timer expires! You never have to manually track or cancel timer references.

### Circuit Breaker State Transition Matrix

| Current State | Event Received | Resulting Action | Next State |
| :--- | :--- | :--- | :--- |
| **\`closed\`** | \`execute(Fun)\` succeeds | Return \`{ok, Res}\`; reset failure count to 0. | \`closed\` |
| **\`closed\`** | \`execute(Fun)\` fails (Failures < MaxFailures) | Return \`{error, Reason}\`; increment failures. | \`closed\` |
| **\`closed\`** | \`execute(Fun)\` fails (Failures >= MaxFailures) | Return \`{error, Reason}\`; arm \`state_timeout\`. | **\`open\`** |
| **\`open\`** | \`execute(Fun)\` | Fast-fail immediately with \`{error, circuit_open}\` (Do NOT run \`Fun\`!). | \`open\` |
| **\`open\`** | \`state_timeout\` fires | Transition to probe mode. | **\`half_open\`** |
| **\`half_open\`** | Trial \`execute(Fun)\` succeeds | Return \`{ok, Res}\`; reset failures to 0. | **\`closed\`** |
| **\`half_open\`** | Trial \`execute(Fun)\` fails | Return \`{error, Reason}\`; re-arm timeout. | **\`open\`** |

> [!warning] Production OTP Trap: State Timeout Cancellation Invariants
> Remember that \`{state_timeout, Ms, Event}\` is tied strictly to the state name. If your state machine executes an internal transition from \`open\` to \`open\` (e.g. \`{next_state, open, NewData}\`), the state timeout is **reset**! If you want to keep the existing running timer while updating state data, you must return \`{keep_state, NewData}\` instead of \`{next_state, CurrentState, NewData}\`.

## Parallel Worked Example: The Session Probe State Machine

The following \`session_probe_statem\` module demonstrates how to implement a finite state machine using OTP's modern \`gen_statem\` behaviour in \`state_functions\` callback mode.
It models an automated connection probe transitioning across three distinct states: \`disconnected\`, \`probing\`, and \`connected\`. When entering \`probing\`, it arms an automatic \`state_timeout\` action that cleanly falls back to \`disconnected\` if confirmation does not arrive within the expected window:

\`\`\`erlang
-module(session_probe_statem).
-behaviour(gen_statem).

%% Client API
-export([
    start_link/1,
    connect/1,
    confirm/1,
    disconnect/1,
    get_state/1,
    stop/1
]).

%% gen_statem Callbacks
-export([
    callback_mode/0,
    init/1,
    disconnected/3,
    probing/3,
    connected/3,
    terminate/3,
    code_change/4
]).

%% =============================================================================
%% Client API
%% =============================================================================

%% @doc Start and link the probe state machine with a probe timeout in milliseconds.
start_link(ProbeTimeoutMs) when is_integer(ProbeTimeoutMs), ProbeTimeoutMs > 0 ->
    gen_statem:start_link(?MODULE, ProbeTimeoutMs, []).

%% @doc Request to initiate connection probing.
connect(Pid) ->
    gen_statem:call(Pid, connect).

%% @doc Confirm successful handshake receipt.
confirm(Pid) ->
    gen_statem:call(Pid, confirm).

%% @doc Disconnect the active session.
disconnect(Pid) ->
    gen_statem:call(Pid, disconnect).

%% @doc Query the current state atom of the probe.
get_state(Pid) ->
    gen_statem:call(Pid, get_state).

%% @doc Gracefully stop the state machine.
stop(Pid) ->
    gen_statem:stop(Pid).

%% =============================================================================
%% gen_statem Callbacks
%% =============================================================================

%% @doc Declare state_functions callback mode where each state is a distinct function.
callback_mode() ->
    state_functions.

%% @doc Initialize state machine in disconnected state with initial configuration.
init(ProbeTimeoutMs) ->
    Data = #{timeout => ProbeTimeoutMs, attempts => 0},
    {ok, disconnected, Data}.

%% ── State: disconnected ───────────────────────────────────────────────────────
disconnected({call, From}, get_state, Data) ->
    {keep_state, Data, [{reply, From, disconnected}]};
disconnected({call, From}, connect, Data = #{timeout := Timeout, attempts := Attempts}) ->
    NewData = Data#{attempts := Attempts + 1},
    %% Transition to probing and arm an automatic state timeout
    Actions = [{state_timeout, Timeout, probe_timeout}, {reply, From, ok}],
    {next_state, probing, NewData, Actions};
disconnected({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, {error, not_connected}}]}.

%% ── State: probing ────────────────────────────────────────────────────────────
probing({call, From}, get_state, Data) ->
    {keep_state, Data, [{reply, From, probing}]};
probing({call, From}, confirm, Data) ->
    %% Confirmation received within timeout -> transition to connected
    {next_state, connected, Data, [{reply, From, ok}]};
probing(state_timeout, probe_timeout, Data) ->
    %% Built-in state timer fired: probe timed out, fall back to disconnected
    {next_state, disconnected, Data};
probing({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, {error, probing_in_progress}}]}.

%% ── State: connected ──────────────────────────────────────────────────────────
connected({call, From}, get_state, Data) ->
    {keep_state, Data, [{reply, From, connected}]};
connected({call, From}, disconnect, Data) ->
    {next_state, disconnected, Data, [{reply, From, ok}]};
connected({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, ok}]}.

terminate(_Reason, _State, _Data) ->
    ok.

code_change(_OldVsn, State, Data, _Extra) ->
    {ok, State, Data}.
\`\`\`

## Assignment Specification

Implement \`src/circuit_breaker_statem.erl\` representing an automated, self-healing circuit breaker that protects downstream systems from cascading failures by tracking execution results across three states: \`closed\`, \`open\`, and \`half_open\`.

### Client API

#### \`callback_mode/0\`
- **Input**: None.
- **Behavior**: Declares the callback mode for the \`gen_statem\` engine. Returns the atom \`state_functions\`.
- **Examples**:
  - \`circuit_breaker_statem:callback_mode()\` returns \`state_functions\`.

#### \`start_link/2\`
- **Input**: \`FailureThreshold\` (positive integer specifying consecutive failure limit before tripping), \`OpenTimeoutMs\` (positive integer cooldown period in milliseconds).
- **Behavior**: Spawns and links the circuit breaker process. Initializes the state machine in \`closed\` state with consecutive failure count set to zero, and records the threshold and timeout configuration in state data.
- **Examples**:
  - \`circuit_breaker_statem:start_link(3, 500)\` returns \`{ok, Pid}\`.

#### \`execute/2\`
- **Input**: \`Pid\` (pid of the running state machine), \`ActionFun\` (nullary function of type \`fun(() -> term())\`).
- **Behavior**: Synchronously submits a protected operation to the circuit breaker for execution. The behavior depends strictly on current state:
  - In \`closed\`: Executes \`ActionFun\`. If it returns \`{ok, Result}\`, resets consecutive failures to zero and replies with \`{ok, Result}\` while maintaining \`closed\` state. If it returns an error or crashes, increments consecutive failures; if failures reach or exceed \`FailureThreshold\`, transitions to \`open\`, arms the \`OpenTimeoutMs\` state timeout, and replies with the error.
  - In \`open\`: Immediately fast-fails without executing \`ActionFun\`, replying with \`{error, circuit_open}\`.
  - In \`half_open\`: Executes \`ActionFun\` as a trial probe. If it succeeds with \`{ok, Result}\`, self-heals by resetting failures to zero and transitioning back to \`closed\`. If it fails or crashes, trips back to \`open\` with the state timeout re-armed and replies with the error.
- **Examples**:
  - \`circuit_breaker_statem:execute(CB, fun() -> {ok, 100} end)\` returns \`{ok, 100}\` (in \`closed\`).
  - \`circuit_breaker_statem:execute(CB, fun() -> {ok, 100} end)\` returns \`{error, circuit_open}\` (in \`open\`).

#### \`get_state_name/1\`
- **Input**: \`Pid\` (pid of the running state machine).
- **Behavior**: Synchronously queries the current state atom of the circuit breaker.
- **Examples**:
  - \`circuit_breaker_statem:get_state_name(CB)\` returns \`closed\`, \`open\`, or \`half_open\`.

#### \`stop/1\`
- **Input**: \`Pid\` (pid of the running state machine).
- **Behavior**: Gracefully terminates the state machine via \`gen_statem:stop/1\`. Returns \`ok\`.
- **Examples**:
  - \`circuit_breaker_statem:stop(CB)\` returns \`ok\`.

### State Callback Invariants

#### \`closed/3\`
- Handles queries for \`get_state_name\` by replying with \`closed\`.
- Evaluates protected executions. If an attempt succeeds, resets failures to zero. If an attempt fails, increments the failure count; when reaching \`FailureThreshold\`, transitions to \`open\` and arms \`OpenTimeoutMs\` state timeout.

#### \`open/3\`
- Handles queries for \`get_state_name\` by replying with \`open\`.
- Immediately rejects all protected execution calls with \`{error, circuit_open}\` without invoking the provided closure.
- Upon receiving the \`state_timeout\` event, transitions automatically to \`half_open\`.

#### \`half_open/3\`
- Handles queries for \`get_state_name\` by replying with \`half_open\`.
- Evaluates trial execution. A successful attempt transitions back to \`closed\` with failures reset to zero. A failed attempt trips back to \`open\` with the state timeout re-armed.

## Rules & Verification Constraints

- Must implement \`-behaviour(gen_statem).\` and export \`callback_mode/0\` returning \`state_functions\`.
- Must export state functions \`closed/3\`, \`open/3\`, and \`half_open/3\`.
- In \`open\` state, must never invoke \`ActionFun()\`.
`,
    mentalModelCheck: {
      question: 'Why does a circuit breaker in the open state immediately reject client calls without invoking the provided action function?',
      codeSnippet: `open({call, From}, {execute, _ActionFun}, Data) ->
    {keep_state, Data, [{reply, From, {error, circuit_open}}]}.`,
      options: [
        {
          id: 'A',
          label: 'To protect failing downstream services from being overwhelmed by traffic, and to prevent client connection pools from exhausting on slow network timeouts.',
          isCorrect: true,
          explanation: 'Correct! Fast-failing immediately in 0ms sheds load from failing backend resources and keeps caller threads responsive.',
        },
        {
          id: 'B',
          label: 'Erlang disables network sockets when a process enters open state.',
          isCorrect: false,
          explanation: 'The state machine is purely application-level logic; sockets are not automatically modified.',
        },
        {
          id: 'C',
          label: 'Action functions can only be executed when the computer is connected to AC power.',
          isCorrect: false,
          explanation: 'Action functions are standard Erlang lambdas.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'call',
        module: 'gen_statem',
        signature: 'gen_statem:call(ServerRef, Request) -> Reply',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()', 'Reply = term()'],
        description: 'Synchronously sends a request to a gen_statem process and waits for a reply.',
        complexityNote: 'O(1) synchronous message round-trip.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_statem.html#call/2',
      },
    ],
    starterCode: `-module(circuit_breaker_statem).
-behaviour(gen_statem).

-export([
    start_link/2,
    execute/2,
    get_state_name/1,
    stop/1
]).

%% gen_statem Callbacks
-export([
    callback_mode/0,
    init/1,
    closed/3,
    open/3,
    half_open/3,
    terminate/3,
    code_change/4
]).

%% @doc Start and link the circuit breaker with a failure threshold and cooldown timeout in ms.
start_link(FailureThreshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {FailureThreshold, OpenTimeoutMs}, []).

%% @doc Execute a protected operation through the circuit breaker.
execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    ok.

%% @doc Synchronously query the current state name atom of the circuit breaker.
get_state_name(Pid) ->
    closed.

%% @doc Gracefully terminate the state machine.
stop(Pid) ->
    gen_statem:stop(Pid).

%% gen_statem Callbacks

%% @doc Declare state_functions callback mode.
callback_mode() ->
    state_functions.

%% @doc Initialize the circuit breaker in closed state.
init({Threshold, TimeoutMs}) ->
    Data = #{threshold => Threshold, timeout => TimeoutMs, failures => 0},
    {ok, closed, Data}.

%% @doc Closed state: normal execution, increments failures on error and trips to open.
closed(_EventType, _EventContent, Data) ->
    {keep_state, Data}.

%% @doc Open state: immediately fast-fails calls and awaits state_timeout.
open(_EventType, _EventContent, Data) ->
    {keep_state, Data}.

%% @doc Half-open state: trial probe, heals to closed on success or trips back to open on error.
half_open(_EventType, _EventContent, Data) ->
    {keep_state, Data}.

%% @doc Clean up state machine resources on shutdown.
terminate(_Reason, _State, _Data) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, Data, _Extra) ->
    {ok, State, Data}.
`,
    solutionCode: `-module(circuit_breaker_statem).
-behaviour(gen_statem).

-export([
    start_link/2,
    execute/2,
    get_state_name/1,
    stop/1
]).

%% gen_statem Callbacks
-export([
    callback_mode/0,
    init/1,
    closed/3,
    open/3,
    half_open/3,
    terminate/3,
    code_change/4
]).

%% Client API
start_link(FailureThreshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {FailureThreshold, OpenTimeoutMs}, []).

execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    gen_statem:call(Pid, {execute, ActionFun}).

get_state_name(Pid) ->
    gen_statem:call(Pid, get_state_name).

stop(Pid) ->
    gen_statem:stop(Pid).

%% gen_statem Callbacks
callback_mode() ->
    state_functions.

init({Threshold, TimeoutMs}) ->
    Data = #{threshold => Threshold, timeout => TimeoutMs, failures => 0},
    {ok, closed, Data}.

%% ── Closed State ───────────────────────────────────────────────────────────
closed({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, closed}]};
closed({call, From}, {execute, ActionFun}, Data = #{threshold := Threshold, timeout := TimeoutMs, failures := Failures}) ->
    case (try ActionFun() catch _:Crash -> {error, Crash} end) of
        {ok, Res} ->
            {keep_state, Data#{failures := 0}, [{reply, From, {ok, Res}}]};
        Err ->
            NewFailures = Failures + 1,
            if
                NewFailures >= Threshold ->
                    {next_state, open, Data#{failures := NewFailures}, [{state_timeout, TimeoutMs, try_half_open}, {reply, From, Err}]};
                true ->
                    {keep_state, Data#{failures := NewFailures}, [{reply, From, Err}]}
            end
    end.

%% ── Open State ─────────────────────────────────────────────────────────────
open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, open}]};
open({call, From}, {execute, _ActionFun}, Data) ->
    {keep_state, Data, [{reply, From, {error, circuit_open}}]};
open(state_timeout, try_half_open, Data) ->
    {next_state, half_open, Data}.

%% ── Half-Open State ────────────────────────────────────────────────────────
half_open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, half_open}]};
half_open({call, From}, {execute, ActionFun}, Data = #{timeout := TimeoutMs}) ->
    case (try ActionFun() catch _:Crash -> {error, Crash} end) of
        {ok, Res} ->
            {next_state, closed, Data#{failures := 0}, [{reply, From, {ok, Res}}]};
        Err ->
            {next_state, open, Data, [{state_timeout, TimeoutMs, try_half_open}, {reply, From, Err}]}
    end.

terminate(_Reason, _State, _Data) ->
    ok.

code_change(_OldVsn, State, Data, _Extra) ->
    {ok, State, Data}.
`,
    files: [
      {
        name: 'circuit_breaker_statem.erl',
        path: 'src/circuit_breaker_statem.erl',
        content: `-module(circuit_breaker_statem).
-behaviour(gen_statem).

-export([
    start_link/2,
    execute/2,
    get_state_name/1,
    stop/1
]).

%% gen_statem Callbacks
-export([
    callback_mode/0,
    init/1,
    closed/3,
    open/3,
    half_open/3,
    terminate/3,
    code_change/4
]).

%% @doc Start and link the circuit breaker with a failure threshold and cooldown timeout in ms.
start_link(FailureThreshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {FailureThreshold, OpenTimeoutMs}, []).

%% @doc Execute a protected operation through the circuit breaker.
execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    ok.

%% @doc Synchronously query the current state name atom of the circuit breaker.
get_state_name(Pid) ->
    closed.

%% @doc Gracefully terminate the state machine.
stop(Pid) ->
    gen_statem:stop(Pid).

%% gen_statem Callbacks

%% @doc Declare state_functions callback mode.
callback_mode() ->
    state_functions.

%% @doc Initialize the circuit breaker in closed state.
init({Threshold, TimeoutMs}) ->
    Data = #{threshold => Threshold, timeout => TimeoutMs, failures => 0},
    {ok, closed, Data}.

%% @doc Closed state: normal execution, increments failures on error and trips to open.
closed(_EventType, _EventContent, Data) ->
    {keep_state, Data}.

%% @doc Open state: immediately fast-fails calls and awaits state_timeout.
open(_EventType, _EventContent, Data) ->
    {keep_state, Data}.

%% @doc Half-open state: trial probe, heals to closed on success or trips back to open on error.
half_open(_EventType, _EventContent, Data) ->
    {keep_state, Data}.

%% @doc Clean up state machine resources on shutdown.
terminate(_Reason, _State, _Data) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, Data, _Extra) ->
    {ok, State, Data}.
`,
      },
    ],
    solutionFiles: {
      'src/circuit_breaker_statem.erl': `-module(circuit_breaker_statem).
-behaviour(gen_statem).

-export([
    start_link/2,
    execute/2,
    get_state_name/1,
    stop/1
]).

%% gen_statem Callbacks
-export([
    callback_mode/0,
    init/1,
    closed/3,
    open/3,
    half_open/3,
    terminate/3,
    code_change/4
]).

%% Client API
start_link(FailureThreshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {FailureThreshold, OpenTimeoutMs}, []).

execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    gen_statem:call(Pid, {execute, ActionFun}).

get_state_name(Pid) ->
    gen_statem:call(Pid, get_state_name).

stop(Pid) ->
    gen_statem:stop(Pid).

%% gen_statem Callbacks
callback_mode() ->
    state_functions.

init({Threshold, TimeoutMs}) ->
    Data = #{threshold => Threshold, timeout => TimeoutMs, failures => 0},
    {ok, closed, Data}.

%% ── Closed State ───────────────────────────────────────────────────────────
closed({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, closed}]};
closed({call, From}, {execute, ActionFun}, Data = #{threshold := Threshold, timeout := TimeoutMs, failures := Failures}) ->
    case (try ActionFun() catch _:Crash -> {error, Crash} end) of
        {ok, Res} ->
            {keep_state, Data#{failures := 0}, [{reply, From, {ok, Res}}]};
        Err ->
            NewFailures = Failures + 1,
            if
                NewFailures >= Threshold ->
                    {next_state, open, Data#{failures := NewFailures}, [{state_timeout, TimeoutMs, try_half_open}, {reply, From, Err}]};
                true ->
                    {keep_state, Data#{failures := NewFailures}, [{reply, From, Err}]}
            end
    end.

%% ── Open State ─────────────────────────────────────────────────────────────
open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, open}]};
open({call, From}, {execute, _ActionFun}, Data) ->
    {keep_state, Data, [{reply, From, {error, circuit_open}}]};
open(state_timeout, try_half_open, Data) ->
    {next_state, half_open, Data}.

%% ── Half-Open State ────────────────────────────────────────────────────────
half_open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, half_open}]};
half_open({call, From}, {execute, ActionFun}, Data = #{timeout := TimeoutMs}) ->
    case (try ActionFun() catch _:Crash -> {error, Crash} end) of
        {ok, Res} ->
            {next_state, closed, Data#{failures := 0}, [{reply, From, {ok, Res}}]};
        Err ->
            {next_state, open, Data, [{state_timeout, TimeoutMs, try_half_open}, {reply, From, Err}]}
    end.

terminate(_Reason, _State, _Data) ->
    ok.

code_change(_OldVsn, State, Data, _Extra) ->
    {ok, State, Data}.
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Closed State Normal Passthrough',
        erlangCall: 'begin {ok, CB} = circuit_breaker_statem:start_link(2, 5000), Res = circuit_breaker_statem:execute(CB, fun() -> {ok, 42} end), circuit_breaker_statem:stop(CB), Res end',
        expectedOutput: '{ok, 42}',
        explanation: 'In closed state, requests execute and return successfully.',
      },
      {
        id: 'tc2',
        title: 'Tripping to Open & Immediate Fast-Fail',
        erlangCall: 'begin {ok, CB} = circuit_breaker_statem:start_link(2, 5000), catch circuit_breaker_statem:execute(CB, fun() -> error(fail1) end), catch circuit_breaker_statem:execute(CB, fun() -> error(fail2) end), Res = circuit_breaker_statem:execute(CB, fun() -> {ok, 42} end), circuit_breaker_statem:stop(CB), Res end',
        expectedOutput: '{error, circuit_open}',
        explanation: 'Fails immediately without running user action fun.',
      },
    ],
    solutionExplanation: 'Implements a 3-state circuit breaker using gen_statem state_functions callback mode and state_timeout to self-heal from open to half_open automatically.',
    astRules: {
      requiredCalls: ['gen_statem:start_link/3', 'gen_statem:call/2'],
    },
  },

  // ── Lesson 7.6: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch07-l06',
    chapterNumber: 7,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'gen_event: Decoupled Event Buses & Security Audit Loggers',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In microservices and high-throughput backends, decoupling event producers from consumers is essential for software evolution.
For example, when a user fails to log in:
- The security service wants to track failed attempts and trigger IP blocks.
- The compliance service wants to write an audit log to an immutable S3 bucket.
- The metrics service wants to increment a StatsD counter.

If the authentication service directly called three different \`gen_server\` processes for every login, it would create tight coupling: if the compliance server slowed down or crashed, the login pipeline would stall.

The OTP framework solves this with **\`gen_event\`**: a central event bus process that dispatches events to dynamically registered handler modules.

## Deep Concept Breakdown & Under the Hood

### The \`gen_event\` Architecture

Unlike a \`gen_server\` (which maps 1 process to 1 callback module), a \`gen_event\` architecture separates the **Event Manager process** from the **Handler modules**:
1. You start the manager process: \`{ok, ManagerPid} = gen_event:start_link()\`.
2. Different subsystems dynamically attach their callback handlers: \`gen_event:add_handler(ManagerPid, security_handler, Args)\`.
3. Producers broadcast events with **\`gen_event:notify(ManagerPid, Event)\`**.
4. The manager process iterates through all attached handlers, executing each handler's \`handle_event(Event, HandlerState)\` callback in order.

### Fault Isolation: What Happens When a Handler Crashes?

The most profound feature of \`gen_event\` is its resilience:
If handler A throws a runtime crash (e.g. \`badarith\` or network failure) during \`handle_event/2\`:
- **The Event Manager process does NOT crash!**
- Other handlers (B, C, and D) continue running unhurt!
- The manager simply catches the exception, logs a warning report, and automatically removes the broken handler A from its active handler list!

### Callback Signatures for \`gen_event\`

\`\`\`erlang
-module(my_handler).
-behaviour(gen_event).

init(Args) -> {ok, InitialState}.
handle_event(Event, State) -> {ok, NewState}.
handle_call(Query, State) -> {ok, Reply, NewState}.
handle_info(Info, State) -> {ok, NewState}.
terminate(Reason, State) -> ok.
code_change(OldVsn, State, Extra) -> {ok, NewState}.
\`\`\`

> [!warning] Production OTP Trap: Silent Removal of Crashing Event Handlers
> Because \`gen_event\` automatically unregisters handlers that crash without taking down the manager process, a bug in a handler can silently stop all event processing for that subsystem while your server appears completely healthy. In production, always monitor your SASL crash logs or use \`gen_event:add_sup_handler/3\` (which links the handler to the caller).

## Parallel Worked Example

## Parallel Worked Example: The Latency Monitor Event Handler

The following \`latency_monitor_handler\` module demonstrates the architecture of OTP's \`gen_event\` behaviour.
It dynamically attaches to an event manager process, receives broadcasted request timing events without coupling to the event producers, tracks latency spikes exceeding a configured threshold, and answers synchronous queries via \`gen_event:call/3\`:

\`\`\`erlang
-module(latency_monitor_handler).
-behaviour(gen_event).

%% Client API
-export([
    add_to_manager/2,
    get_spike_count/1
]).

%% gen_event Callbacks
-export([
    init/1,
    handle_event/2,
    handle_call/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% =============================================================================
%% Client API
%% =============================================================================

%% @doc Register the latency monitor handler with an event manager.
add_to_manager(ManagerPid, LatencyThresholdMs) when is_integer(LatencyThresholdMs), LatencyThresholdMs > 0 ->
    gen_event:add_handler(ManagerPid, ?MODULE, LatencyThresholdMs).

%% @doc Query the total count of high-latency events detected.
get_spike_count(ManagerPid) ->
    gen_event:call(ManagerPid, ?MODULE, get_spike_count).

%% =============================================================================
%% gen_event Callbacks
%% =============================================================================

init(LatencyThresholdMs) ->
    {ok, #{threshold => LatencyThresholdMs, spikes => 0}}.

%% Process incoming request timing broadcast events
handle_event({request_timing, _Route, LatencyMs}, State = #{threshold := Threshold, spikes := Spikes}) ->
    NewSpikes = if
        LatencyMs > Threshold -> Spikes + 1;
        true -> Spikes
    end,
    {ok, State#{spikes := NewSpikes}};
handle_event(_OtherEvent, State) ->
    {ok, State}.

%% Synchronously query the handler's internal metrics
handle_call(get_spike_count, State = #{spikes := Spikes}) ->
    {ok, {ok, Spikes}, State};
handle_call(_Request, State) ->
    {ok, {error, unknown_call}, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
\`\`\`

## Assignment Specification

Implement \`src/security_audit_handler.erl\` as a decoupled \`gen_event\` handler module that tracks repeated login failures per IP address and triggers security alerts when brute-force thresholds are exceeded.

### Client API

#### \`add_to_manager/2\`
- **Input**: \`ManagerPid\` (pid of the running \`gen_event\` manager process), \`MaxAttempts\` (positive integer specifying the failed attempt threshold before triggering an alert).
- **Behavior**: Registers the \`security_audit_handler\` callback module with the specified event manager process via \`gen_event:add_handler/3\`, passing \`MaxAttempts\` as configuration arguments to \`init/1\`. Returns \`ok\`.
- **Examples**:
  - \`security_audit_handler:add_to_manager(Mgr, 3)\` returns \`ok\`.

#### \`get_ip_status/2\`
- **Input**: \`ManagerPid\` (pid of the running \`gen_event\` manager process), \`IpBinary\` (binary IP address identifier).
- **Behavior**: Synchronously queries the installed \`security_audit_handler\` on \`ManagerPid\` via \`gen_event:call/3\` for the tracking status of \`IpBinary\`. Returns \`{ok, StatusMap}\`, where \`StatusMap\` contains non-negative integer \`attempts\` and boolean \`alert\`. If the IP has never been observed, defaults to zero attempts and false alert.
- **Examples**:
  - \`security_audit_handler:get_ip_status(Mgr, <<"10.0.0.1">>)\` returns \`{ok, #{attempts => 1, alert => false}}\`.
  - \`security_audit_handler:get_ip_status(Mgr, <<"10.0.0.2">>)\` returns \`{ok, #{attempts => 3, alert => true}}\`.

### Callback Invariants

#### \`init/1\`
- Receives \`MaxAttempts\` and initializes handler state map with the threshold and an empty IP tracking map. Returns \`{ok, State}\`.

#### \`handle_event/2\`
- For \`{login_failed, IpBinary}\` events: Increments the failed attempt count for \`IpBinary\`. If the updated tally meets or exceeds \`MaxAttempts\`, sets \`alert\` to \`true\`. Returns \`{ok, UpdatedState}\`.
- For \`{login_success, IpBinary}\` events: Clears previous failures for \`IpBinary\`, resetting its count to zero and alert flag to \`false\`. Returns \`{ok, UpdatedState}\`.
- For any other unhandled event: Preserves state unchanged. Returns \`{ok, State}\`.

#### \`handle_call/2\`
- For \`{get_status, IpBinary}\` queries: Retrieves the recorded map for \`IpBinary\` (defaulting to zero attempts and false alert if unseen) and returns \`{ok, {ok, StatusMap}, State}\`.
- For unknown queries: Returns \`{ok, {error, unknown_call}, State}\`.

## Rules & Verification Constraints

- Must export \`add_to_manager/2\` and \`get_ip_status/2\`.
- Must export all 6 mandatory \`gen_event\` callbacks.
- \`add_to_manager/2\` must use \`gen_event:add_handler/3\`.
- \`get_ip_status/2\` must use \`gen_event:call/3\`.
`,
    mentalModelCheck: {
      question: 'What happens inside a gen_event manager process if an individual handler crashes with a runtime error during handle_event/2?',
      codeSnippet: `handle_event({bad_event, _}, _State) ->
    1 / 0. %% Deliberate crash`,
      options: [
        {
          id: 'A',
          label: 'The event manager catches the exception, removes the faulty handler, and continues running normal event dispatch for all other attached handlers.',
          isCorrect: true,
          explanation: 'Correct! gen_event provides strict fault isolation: one broken handler module cannot crash the shared event bus.',
        },
        {
          id: 'B',
          label: 'The entire BEAM node reboots to restore memory consistency.',
          isCorrect: false,
          explanation: 'The BEAM node is completely unaffected.',
        },
        {
          id: 'C',
          label: 'The manager forwards the crash exception to every client in the cluster.',
          isCorrect: false,
          explanation: 'Exceptions are trapped locally by the gen_event process.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'add_handler',
        module: 'gen_event',
        signature: 'gen_event:add_handler(EventMgrRef, Handler, Args) -> ok | {\'EXIT\', Reason} | term()',
        typesSpec: ['EventMgrRef = pid() | atom()', 'Handler = module() | {module(), Id :: term()}', 'Args = term()'],
        description: 'Adds a new event handler to the event manager EventMgrRef.',
        complexityNote: 'O(1) handler registration.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_event.html#add_handler/3',
      },
      {
        functionName: 'notify',
        module: 'gen_event',
        signature: 'gen_event:notify(EventMgrRef, Event) -> ok',
        typesSpec: ['EventMgrRef = pid() | atom()', 'Event = term()'],
        description: 'Sends an event notification to an event manager, notifying all installed handlers.',
        complexityNote: 'Iterates through N registered handlers sequentially.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_event.html#notify/2',
      },
    ],
    starterCode: `-module(security_audit_handler).
-behaviour(gen_event).

-export([
    add_to_manager/2,
    get_ip_status/2
]).

%% gen_event Callbacks
-export([
    init/1,
    handle_event/2,
    handle_call/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Register the security audit handler with an event manager process.
add_to_manager(ManagerPid, MaxAttempts) ->
    ok.

%% @doc Synchronously retrieve the current security status map for an IP address.
get_ip_status(ManagerPid, IpBinary) ->
    ok.

%% gen_event Callbacks

%% @doc Initialize handler state with failure threshold and an empty tracker map.
init(MaxAttempts) ->
    {ok, #{max => MaxAttempts, tracker => #{}}}.

%% @doc Process broadcast security events.
handle_event(_Event, State) ->
    {ok, State}.

%% @doc Handle synchronous queries directed to this handler module.
handle_call(_Req, State) ->
    {ok, ok, State}.

%% @doc Handle unhandled process messages.
handle_info(_Info, State) ->
    {ok, State}.

%% @doc Clean up handler resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(security_audit_handler).
-behaviour(gen_event).

-export([
    add_to_manager/2,
    get_ip_status/2
]).

%% gen_event Callbacks
-export([
    init/1,
    handle_event/2,
    handle_call/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
add_to_manager(ManagerPid, MaxAttempts) ->
    gen_event:add_handler(ManagerPid, ?MODULE, MaxAttempts).

get_ip_status(ManagerPid, IpBinary) ->
    gen_event:call(ManagerPid, ?MODULE, {get_status, IpBinary}).

%% gen_event Callbacks
init(MaxAttempts) ->
    {ok, #{max => MaxAttempts, tracker => #{}}}.

handle_event({login_failed, Ip}, State = #{max := Max, tracker := Tracker}) ->
    Current = maps:get(Ip, Tracker, #{attempts => 0, alert => false}),
    NewAttempts = maps:get(attempts, Current) + 1,
    Alert = NewAttempts >= Max,
    NewTracker = maps:put(Ip, #{attempts => NewAttempts, alert => Alert}, Tracker),
    {ok, State#{tracker := NewTracker}};

handle_event({login_success, Ip}, State = #{tracker := Tracker}) ->
    NewTracker = maps:put(Ip, #{attempts => 0, alert => false}, Tracker),
    {ok, State#{tracker := NewTracker}};

handle_event(_OtherEvent, State) ->
    {ok, State}.

handle_call({get_status, Ip}, State = #{tracker := Tracker}) ->
    Status = maps:get(Ip, Tracker, #{attempts => 0, alert => false}),
    {ok, {ok, Status}, State};
handle_call(_Req, State) ->
    {ok, {error, unknown_call}, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    files: [
      {
        name: 'security_audit_handler.erl',
        path: 'src/security_audit_handler.erl',
        content: `-module(security_audit_handler).
-behaviour(gen_event).

-export([
    add_to_manager/2,
    get_ip_status/2
]).

%% gen_event Callbacks
-export([
    init/1,
    handle_event/2,
    handle_call/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Register the security audit handler with an event manager process.
add_to_manager(ManagerPid, MaxAttempts) ->
    ok.

%% @doc Synchronously retrieve the current security status map for an IP address.
get_ip_status(ManagerPid, IpBinary) ->
    ok.

%% gen_event Callbacks

%% @doc Initialize handler state with failure threshold and an empty tracker map.
init(MaxAttempts) ->
    {ok, #{max => MaxAttempts, tracker => #{}}}.

%% @doc Process broadcast security events.
handle_event(_Event, State) ->
    {ok, State}.

%% @doc Handle synchronous queries directed to this handler module.
handle_call(_Req, State) ->
    {ok, ok, State}.

%% @doc Handle unhandled process messages.
handle_info(_Info, State) ->
    {ok, State}.

%% @doc Clean up handler resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/security_audit_handler.erl': `-module(security_audit_handler).
-behaviour(gen_event).

-export([
    add_to_manager/2,
    get_ip_status/2
]).

%% gen_event Callbacks
-export([
    init/1,
    handle_event/2,
    handle_call/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
add_to_manager(ManagerPid, MaxAttempts) ->
    gen_event:add_handler(ManagerPid, ?MODULE, MaxAttempts).

get_ip_status(ManagerPid, IpBinary) ->
    gen_event:call(ManagerPid, ?MODULE, {get_status, IpBinary}).

%% gen_event Callbacks
init(MaxAttempts) ->
    {ok, #{max => MaxAttempts, tracker => #{}}}.

handle_event({login_failed, Ip}, State = #{max := Max, tracker := Tracker}) ->
    Current = maps:get(Ip, Tracker, #{attempts => 0, alert => false}),
    NewAttempts = maps:get(attempts, Current) + 1,
    Alert = NewAttempts >= Max,
    NewTracker = maps:put(Ip, #{attempts => NewAttempts, alert => Alert}, Tracker),
    {ok, State#{tracker := NewTracker}};

handle_event({login_success, Ip}, State = #{tracker := Tracker}) ->
    NewTracker = maps:put(Ip, #{attempts => 0, alert => false}, Tracker),
    {ok, State#{tracker := NewTracker}};

handle_event(_OtherEvent, State) ->
    {ok, State}.

handle_call({get_status, Ip}, State = #{tracker := Tracker}) ->
    Status = maps:get(Ip, Tracker, #{attempts => 0, alert => false}),
    {ok, {ok, Status}, State};
handle_call(_Req, State) ->
    {ok, {error, unknown_call}, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Threshold Alert Triggering on Brute-Force Pattern',
        erlangCall: 'begin {ok, Mgr} = gen_event:start_link(), ok = security_audit_handler:add_to_manager(Mgr, 3), gen_event:sync_notify(Mgr, {login_failed, <<"192.168.1.5">>}), gen_event:sync_notify(Mgr, {login_failed, <<"192.168.1.5">>}), gen_event:sync_notify(Mgr, {login_failed, <<"192.168.1.5">>}), Res = security_audit_handler:get_ip_status(Mgr, <<"192.168.1.5">>), gen_event:stop(Mgr), Res end',
        expectedOutput: '{ok, #{alert => true, attempts => 3}}',
        explanation: 'Three consecutive failed logins toggle alert flag to true.',
      },
    ],
    solutionExplanation: 'Implements an isolated, dynamically attachable security audit event handler using gen_event to track failed logins and trigger brute-force alerts.',
    astRules: {
      requiredCalls: ['gen_event:add_handler/3', 'gen_event:call/3'],
    },
  },

  // ── Lesson 7.7: Production Incident Triage Lab ────────────────────────────
  {
    id: 'ch07-l07',
    chapterNumber: 7,
    lessonNumber: 7,
    lessonType: 'incident_triage',
    title: 'Incident #103: Slow gen_server:init/1 Blocking Supervisor Startup',
    difficulty: 'Production',
    xpReward: 175,
    incidentAlert: {
      incidentId: 'INC-103',
      severity: 'CRITICAL',
      serviceName: 'firewall-rule-hydrator',
      symptom: 'During rolling deployments, the root supervisor times out and aborts boot whenever the firewall rule list exceeds 5,000 entries.',
      impact: 'Cluster nodes fail health checks and get killed by Kubernetes during rolling updates, causing service outages.',
      rootCauseHint: 'Synchronous rule compilation and normalization inside init/1 blocks gen_server:start_link/3, exceeding supervisor child startup timeouts during cluster deployment.',
      fixObjective: 'Refactor initialization using the OTP {continue, Term} protocol: return immediately from init/1 in booting status, and execute rule compilation in handle_continue/2 to transition status to ready.',
    },
    conceptMarkdown: `## Incident Triage: Root Supervisor Boot Timeout (INC-103)

### Incident Context & Telemetry
At 03:14 UTC, during a routine zero-downtime rolling update of the security gateway cluster, Kubernetes pods running the \`firewall-rule-hydrator\` service failed their liveness probes.
The root OTP supervisor aborted startup with the following error log:

\`\`\`text
=CRASH REPORT====
  crasher:
    initial call: firewall_sup:init/1
    pid: <0.412.0>
    error: {shutdown, {failed_to_start_child, firewall_rules, timeout}}
\`\`\`

### Root-Cause Inspection
Inspecting \`src/incident_blocking_init.erl\` reveals that the server attempts to compile, normalize, and parse all firewall rules synchronously inside \`init/1\`.
Because \`gen_server:start_link/3\` blocks the parent supervisor process until \`init/1\` returns, heavy rule sets exceeding 5,000 entries cause the supervisor to hit its default 5,000ms child startup timeout and abort the node boot!

## Parallel Worked Example: The Geo IP Database

The following \`geo_ip_database\` module demonstrates how a high-volume service resolves slow startup blocking by decoupling initial registration from heavy parsing using OTP's non-blocking \`{continue, Term}\` protocol:

\`\`\`erlang
-module(geo_ip_database).
-behaviour(gen_server).

%% Client API
-export([
    start_link/1,
    lookup_country/2,
    get_status/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% =============================================================================
%% Client API
%% =============================================================================

%% @doc Start and link the geo database with a raw list of IP ranges.
start_link(RawRanges) ->
    gen_server:start_link(?MODULE, RawRanges, []).

%% @doc Query the country code for an IP address.
lookup_country(Pid, Ip) ->
    gen_server:call(Pid, {lookup_country, Ip}).

%% @doc Query the current lifecycle status of the database.
get_status(Pid) ->
    gen_server:call(Pid, get_status).

%% @doc Gracefully stop the database server.
stop(Pid) ->
    gen_server:stop(Pid).

%% =============================================================================
%% gen_server Callbacks
%% =============================================================================

%% @doc Return immediately to unblock supervisor; defer compilation to continue.
init(RawRanges) ->
    InitialState = #{
        status => booting,
        raw => RawRanges,
        ranges => #{}
    },
    {ok, InitialState, {continue, {compile_ranges, RawRanges}}}.

%% @doc Process heavy range compilation before mailbox messages are dispatched.
handle_continue({compile_ranges, RawRanges}, State) ->
    CompiledMap = maps:from_list(RawRanges),
    UpdatedState = State#{
        status := ready,
        ranges := CompiledMap
    },
    {noreply, UpdatedState}.

handle_call({lookup_country, _Ip}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({lookup_country, Ip}, _From, #{status := ready, ranges := Ranges} = State) ->
    Reply = case maps:find(Ip, Ranges) of
        {ok, Country} -> {ok, Country};
        error -> {error, not_found}
    end,
    {reply, Reply, State};
handle_call(get_status, _From, #{status := Status} = State) ->
    {reply, Status, State};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
\`\`\`

## Assignment Specification

Refactor \`src/incident_blocking_init.erl\` using the modern OTP 21+ \`{continue, Term}\` pattern to eliminate supervisor boot timeouts during cluster deployments.

### Functional Requirements

#### \`start_link/1\`
- **Input**: \`SeedRules\` (list of key-value pairs representing raw firewall rules or catalog entries).
- **Behavior**: Spawns and links the \`incident_blocking_init\` server process. Unblocks immediately in sub-millisecond time.
- **Examples**:
  - \`incident_blocking_init:start_link([{"http", 80}])\` returns \`{ok, Pid}\`.

#### \`init/1\`
- **Input**: \`SeedRules\` (list of raw rule pairs).
- **Behavior**: Must return immediately without executing rule compilation. Returns a 3-element tuple containing \`ok\`, an initial state map recording status as \`booting\` and an empty \`rules\` map, and the continuation action with tag \`hydrate\` paired with \`SeedRules\`.
- **Examples**:
  - \`incident_blocking_init:init([{"k1", 100}])\` returns \`{ok, #{status => booting, ...}, {continue, {hydrate, [{"k1", 100}]}}}\`.

#### \`handle_continue/2\`
- **Input**: Continuation term matching \`{hydrate, SeedRules}\`, \`State\`.
- **Behavior**: Converts \`SeedRules\` into the compiled map using map conversion, transitions the \`status\` flag to \`ready\`, and stores the compiled rules. Returns \`{noreply, UpdatedState}\`.

#### \`lookup_rule/2\` and \`get_item/2\`
- **Input**: \`Pid\` (running server pid), \`Port\` or \`Key\` (search term).
- **Behavior**: Synchronously retrieves the rule or item value from the compiled map. If \`status\` is \`ready\`, returns \`{ok, Value}\` when found or \`{error, not_found}\` when missing. If \`status\` is \`booting\`, replies with \`{error, still_booting}\`.
- **Examples**:
  - \`incident_blocking_init:lookup_rule(Pid, "product_a")\` returns \`{ok, 29.99}\`.

#### \`get_status/1\`
- **Input**: \`Pid\` (running server pid).
- **Behavior**: Synchronously queries the current lifecycle status atom (\`booting\` or \`ready\`).
- **Examples**:
  - \`incident_blocking_init:get_status(Pid)\` returns \`ready\` (after hydration).

#### \`stop/1\`
- **Input**: \`Pid\` (running server pid).
- **Behavior**: Gracefully terminates the \`gen_server\` process via \`gen_server:stop/1\`. Returns \`ok\`.
- **Examples**:
  - \`incident_blocking_init:stop(Pid)\` returns \`ok\`.

## Rules & Verification Constraints

- Must export \`handle_continue/2\` from \`incident_blocking_init\`.
- \`init/1\` must return a 3-element tuple with \`{continue, {hydrate, SeedRules}}\`.
- \`handle_continue/2\` must transition internal status to \`ready\`.
`,
    mentalModelCheck: {
      question: 'Why does moving heavy startup logic into handle_continue/2 fix supervisor timeout crashes?',
      codeSnippet: `init(Rules) ->
    {ok, #{status => booting, rules => #{}}, {continue, {hydrate, Rules}}}.`,
      options: [
        {
          id: 'A',
          label: 'start_link returns {ok, Pid} to the supervisor immediately, allowing the supervisor to complete child registration while hydration proceeds without blocking boot.',
          isCorrect: true,
          explanation: 'Correct! The supervisor child registration completes in microseconds, preventing supervision timeouts during rolling releases.',
        },
        {
          id: 'B',
          label: 'handle_continue runs on a separate remote computer.',
          isCorrect: false,
          explanation: 'handle_continue runs inside the same local BEAM process.',
        },
        {
          id: 'C',
          label: 'It increases the supervisor timeout from 5 seconds to 10 minutes.',
          isCorrect: false,
          explanation: 'Supervisor timeouts are not modified; the initialization latency is removed.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'handle_continue',
        module: 'gen_server',
        signature: 'Mod:handle_continue(Continue, State) -> {noreply, NewState}',
        typesSpec: ['Continue = term()', 'State = term()', 'NewState = term()'],
        description: 'Invoked by gen_server immediately after init/1 or handle_call/cast returns {..., {continue, Continue}}.',
        complexityNote: 'Executed before any message in the process mailbox is dispatched.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#Module:handle_continue/2',
      },
    ],
    starterCode: `-module(incident_blocking_init).
-behaviour(gen_server).

-export([
    start_link/1,
    lookup_rule/2,
    get_item/2,
    get_status/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the firewall rule hydrator with a seed rules list.
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

%% @doc Lookup a firewall rule action for a given port.
lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

%% @doc Lookup an item value by key.
get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

%% @doc Query the current lifecycle status of the server.
get_status(Pid) ->
    gen_server:call(Pid, get_status).

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize the server. Synchronous rule compilation blocks supervisor boot.
init(SeedRules) ->
    Compiled = maps:from_list(SeedRules),
    {ok, #{status => ready, rules => Compiled, items => Compiled}}.

%% @doc Post-init continuation callback.
handle_continue(_Continue, State) ->
    {noreply, State}.

%% @doc Handle synchronous calls.
handle_call({lookup_rule, Port}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Port, Rules) of
        {ok, Action} -> {reply, {ok, Action}, State};
        error        -> {reply, {error, not_found}, State}
    end;
handle_call({get_item, Key}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Key, Rules) of
        {ok, Val} -> {reply, {ok, Val}, State};
        error     -> {reply, {error, not_found}, State}
    end;
handle_call(get_status, _From, #{status := Status} = State) ->
    {reply, Status, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(incident_blocking_init).
-behaviour(gen_server).

-export([
    start_link/1,
    lookup_rule/2,
    get_item/2,
    get_status/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the firewall rule hydrator with a seed rules list.
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

%% @doc Lookup a firewall rule action for a given port.
lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

%% @doc Lookup an item value by key.
get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

%% @doc Query the current lifecycle status of the server.
get_status(Pid) ->
    gen_server:call(Pid, get_status).

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize the server immediately and defer rule hydration to handle_continue.
init(SeedRules) ->
    {ok, #{status => booting, raw => SeedRules, rules => #{}, items => #{}}, {continue, {hydrate, SeedRules}}}.

%% @doc Asynchronously compile seed rules before client calls are processed.
handle_continue({hydrate, SeedRules}, State) ->
    Compiled = maps:from_list(SeedRules),
    {noreply, State#{status := ready, rules := Compiled, items := Compiled}}.

%% @doc Handle synchronous calls.
handle_call({lookup_rule, _Port}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({lookup_rule, Port}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Port, Rules) of
        {ok, Action} -> {reply, {ok, Action}, State};
        error        -> {reply, {error, not_found}, State}
    end;
handle_call({get_item, _Key}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({get_item, Key}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Key, Rules) of
        {ok, Val} -> {reply, {ok, Val}, State};
        error     -> {reply, {error, not_found}, State}
    end;
handle_call(get_status, _From, #{status := Status} = State) ->
    {reply, Status, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    files: [
      {
        name: 'incident_blocking_init.erl',
        path: 'src/incident_blocking_init.erl',
        content: `-module(incident_blocking_init).
-behaviour(gen_server).

-export([
    start_link/1,
    lookup_rule/2,
    get_item/2,
    get_status/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the firewall rule hydrator with a seed rules list.
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

%% @doc Lookup a firewall rule action for a given port.
lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

%% @doc Lookup an item value by key.
get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

%% @doc Query the current lifecycle status of the server.
get_status(Pid) ->
    gen_server:call(Pid, get_status).

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize the server. Synchronous rule compilation blocks supervisor boot.
init(SeedRules) ->
    Compiled = maps:from_list(SeedRules),
    {ok, #{status => ready, rules => Compiled, items => Compiled}}.

%% @doc Post-init continuation callback.
handle_continue(_Continue, State) ->
    {noreply, State}.

%% @doc Handle synchronous calls.
handle_call({lookup_rule, Port}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Port, Rules) of
        {ok, Action} -> {reply, {ok, Action}, State};
        error        -> {reply, {error, not_found}, State}
    end;
handle_call({get_item, Key}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Key, Rules) of
        {ok, Val} -> {reply, {ok, Val}, State};
        error     -> {reply, {error, not_found}, State}
    end;
handle_call(get_status, _From, #{status := Status} = State) ->
    {reply, Status, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/incident_blocking_init.erl': `-module(incident_blocking_init).
-behaviour(gen_server).

-export([
    start_link/1,
    lookup_rule/2,
    get_item/2,
    get_status/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the firewall rule hydrator with a seed rules list.
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

%% @doc Lookup a firewall rule action for a given port.
lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

%% @doc Lookup an item value by key.
get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

%% @doc Query the current lifecycle status of the server.
get_status(Pid) ->
    gen_server:call(Pid, get_status).

%% @doc Gracefully terminate the server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize the server immediately and defer rule hydration to handle_continue.
init(SeedRules) ->
    {ok, #{status => booting, raw => SeedRules, rules => #{}, items => #{}}, {continue, {hydrate, SeedRules}}}.

%% @doc Asynchronously compile seed rules before client calls are processed.
handle_continue({hydrate, SeedRules}, State) ->
    Compiled = maps:from_list(SeedRules),
    {noreply, State#{status := ready, rules := Compiled, items := Compiled}}.

%% @doc Handle synchronous calls.
handle_call({lookup_rule, _Port}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({lookup_rule, Port}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Port, Rules) of
        {ok, Action} -> {reply, {ok, Action}, State};
        error        -> {reply, {error, not_found}, State}
    end;
handle_call({get_item, _Key}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({get_item, Key}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Key, Rules) of
        {ok, Val} -> {reply, {ok, Val}, State};
        error     -> {reply, {error, not_found}, State}
    end;
handle_call(get_status, _From, #{status := Status} = State) ->
    {reply, Status, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Non-Blocking Init 3-Tuple Return Contract',
        erlangCall: 'begin {ok, State, Cont} = incident_blocking_init:init([{"item1", 100}]), {maps:get(status, State), Cont} end',
        expectedOutput: '{booting, {continue, {hydrate, [{"item1", 100}]}}}',
        explanation: 'Verifies init/1 returns 3-element tuple with continue without blocking supervisor.',
      },
      {
        id: 'tc2',
        title: 'Asynchronous Hydration & Status Verification',
        erlangCall: 'begin {ok, S} = incident_blocking_init:start_link([{"alpha", 99}]), Status = incident_blocking_init:get_status(S), gen_server:stop(S), Status end',
        expectedOutput: 'ready',
        explanation: 'Verifies status transitioned to ready after handle_continue executed.',
      },
    ],
    solutionExplanation: 'Resolves supervisor boot timeout incident INC-103 by returning {continue, {hydrate, SeedRules}} from init/1 in 0ms and compiling firewall rules inside handle_continue/2.',
    astRules: {
      requiredCalls: ['gen_server:start_link/3'],
    },
  },

  // ── Lesson 7.8: Problem Set ───────────────────────────────────────────────
  {
    id: 'ch07-l08',
    chapterNumber: 7,
    lessonNumber: 8,
    lessonType: 'problem_set',
    title: 'Chapter 7 Problem Set: API Gateway Token-Bucket Rate Limiter (rate_limiter_srv.erl)',
    difficulty: 'Production',
    xpReward: 250,
    conceptMarkdown: `## Why This Matters in Production

In microservice ecosystems and public developer platforms (such as Stripe, GitHub, or AWS API Gateway), rate limiting is the primary defense line against distributed denial-of-service (DDoS) attacks, abusive web scrapers, and runaway client retry loops.

The gold standard for API throttling is the **Token-Bucket Algorithm**:
- Each client starts with a maximum bucket capacity of \`MaxTokens\`.
- Every incoming API request consumes $N$ tokens depending on its computational cost (e.g., \`GET /v1/user\` costs 1 token; heavy \`POST /v1/reports\` costs 5 tokens).
- If a client has sufficient tokens, the request is allowed immediately.
- If tokens are insufficient, the request is denied with an HTTP 429 status (\`{deny, Remaining}\`).
- Periodically, a background sweep refills $R$ tokens back into every active bucket, capped strictly at \`MaxTokens\`.

In this Capstone Problem Set for Chapter 7, you will engineer a high-throughput, production-grade **Token-Bucket Rate Limiter Server** using \`gen_server\`!

## Parallel Worked Example: The Download Budget Server

The following \`download_budget_srv\` module demonstrates how a \`gen_server\` tracks dynamic per-client resource balances, enforces quotas with fallback defaults, executes batch replenishments, and accepts asynchronous reset casts:

\`\`\`erlang
-module(download_budget_srv).
-behaviour(gen_server).

%% Client API
-export([
    start_link/2,
    consume_mb/3,
    replenish_all/1,
    reset_user/2,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% =============================================================================
%% Client API
%% =============================================================================

%% @doc Start and link the budget server with maximum MB capacity and refill rate.
start_link(MaxMb, ReplenishMb) ->
    gen_server:start_link(?MODULE, {MaxMb, ReplenishMb}, []).

%% @doc Synchronously request and consume megabytes from a user allowance.
consume_mb(Pid, UserId, Mb) ->
    gen_server:call(Pid, {consume_mb, UserId, Mb}).

%% @doc Synchronously replenish all user budgets up to maximum capacity.
replenish_all(Pid) ->
    gen_server:call(Pid, replenish_all).

%% @doc Asynchronously reset a user budget back to full capacity.
reset_user(Pid, UserId) ->
    gen_server:cast(Pid, {reset_user, UserId}).

%% @doc Stop the budget server.
stop(Pid) ->
    gen_server:stop(Pid).

%% =============================================================================
%% gen_server Callbacks
%% =============================================================================

%% @doc Initialize the server with capacity limits and empty balances map.
init({MaxMb, ReplenishMb}) ->
    InitialState = #{
        max_mb => MaxMb,
        replenish_mb => ReplenishMb,
        budgets => #{}
    },
    {ok, InitialState}.

%% @doc Handle synchronous calls for consumption and replenishment.
handle_call({consume_mb, UserId, Mb}, _From, #{max_mb := Max, budgets := Budgets} = State) ->
    CurrentMb = maps:get(UserId, Budgets, Max),
    if
        CurrentMb >= Mb ->
            Remaining = CurrentMb - Mb,
            NewBudgets = maps:put(UserId, Remaining, Budgets),
            {reply, {ok, Remaining}, State#{budgets := NewBudgets}};
        true ->
            {reply, {error, limit_exceeded}, State}
    end;
handle_call(replenish_all, _From, #{max_mb := Max, replenish_mb := Add, budgets := Budgets} = State) ->
    UpdatedBudgets = maps:map(fun(_User, Balance) ->
        min(Balance + Add, Max)
    end, Budgets),
    {reply, ok, State#{budgets := UpdatedBudgets}};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handle asynchronous casts for user resets.
handle_cast({reset_user, UserId}, #{max_mb := Max, budgets := Budgets} = State) ->
    NewBudgets = maps:put(UserId, Max, Budgets),
    {noreply, State#{budgets := NewBudgets}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
\`\`\`

## Architecture & Under the Hood

### State Architecture

Your \`rate_limiter_srv\` maintains state as a map holding configuration, dynamic client balances, and global telemetry:

\`\`\`erlang
#{
    max_tokens => MaxTokens,
    refill_amount => RefillAmount,
    clients => #{
        <<"client_1">> => 7,
        <<"client_2">> => 10
    },
    total_allowed => 0,
    total_rejected => 0
}
\`\`\`

### Dynamic On-Demand Client Bucket Creation
When a request arrives for a previously unseen \`ClientId\`, your server provisions a fresh bucket initialized to \`MaxTokens\` before deducting the requested cost.

### Capped Batch Refills
When \`refill_all(Pid)\` is executed, every existing client bucket in \`clients\` receives \`RefillAmount\` additional tokens, capped strictly at \`max_tokens\`.

### Live Introspection via \`sys:get_state/1\`
Because your module implements standard \`gen_server\` callbacks, production operators can inspect internal balances and counters in real time using \`sys:get_state(Pid)\`.

> [!warning] Production OTP Trap: Map Allocation Leaks on Infinite Clients
> In a production gateway handling millions of ephemeral IP addresses, inserting an entry into \`clients\` for every unique IP will eventually exhaust memory. In production systems (as we will explore in Chapter 9), client buckets are backed by off-heap ETS tables with automatic TTL evictions (\`select_delete\`).

## Assignment Specification

Implement \`src/rate_limiter_srv.erl\` with the following client API and OTP callbacks:

\`\`\`erlang
-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).
\`\`\`

### Functional Requirements

#### \`start_link/2\`
- **Input**: \`MaxTokens\` (positive integer capacity), \`RefillAmount\` (positive integer added per refill).
- **Behavior**: Spawns and links the \`rate_limiter_srv\` gen_server. Initializes state map with \`max_tokens\`, \`refill_amount\`, an empty \`clients\` map, \`total_allowed => 0\`, and \`total_rejected => 0\`.
- **Examples**:
  - \`rate_limiter_srv:start_link(10, 3)\` returns \`{ok, Pid}\`.

#### \`check_request/3\`
- **Input**: \`Pid\` (server pid), \`ClientId\` (binary client identifier), \`Cost\` (positive integer tokens required).
- **Behavior**: Synchronously verifies if \`ClientId\` has sufficient tokens. If \`ClientId\` is new, its starting balance is \`MaxTokens\`. If balance is greater than or equal to \`Cost\`, deducts \`Cost\`, increments \`total_allowed\`, and replies with \`{allow, Remaining}\`. If balance is less than \`Cost\`, leaves balance unchanged, increments \`total_rejected\`, and replies with \`{deny, Balance}\`.
- **Examples**:
  - \`rate_limiter_srv:check_request(Pid, <<"client_a">>, 3)\` returns \`{allow, 7}\` (from 10 capacity).
  - \`rate_limiter_srv:check_request(Pid, <<"client_a">>, 8)\` returns \`{deny, 7}\` (when 7 remain).

#### \`refill_all/1\`
- **Input**: \`Pid\` (server pid).
- **Behavior**: Synchronously adds \`RefillAmount\` tokens to every registered client bucket in \`clients\`, capping each balance at \`MaxTokens\`. Returns \`ok\`.
- **Examples**:
  - \`rate_limiter_srv:refill_all(Pid)\` returns \`ok\`.

#### \`reset_client/2\`
- **Input**: \`Pid\` (server pid), \`ClientId\` (binary client identifier).
- **Behavior**: Asynchronously resets \`ClientId\`'s token balance directly to full \`MaxTokens\` capacity via \`gen_server:cast/2\`. Returns \`ok\` immediately.
- **Examples**:
  - \`rate_limiter_srv:reset_client(Pid, <<"client_a">>)\` returns \`ok\`.

#### \`get_stats/1\`
- **Input**: \`Pid\` (server pid).
- **Behavior**: Synchronously returns a map containing global counters and active client count: \`#{total_allowed => integer(), total_rejected => integer(), active_clients => integer()}\`.
- **Examples**:
  - \`rate_limiter_srv:get_stats(Pid)\` returns \`#{total_allowed => 2, total_rejected => 1, active_clients => 1}\`.

#### \`stop/1\`
- **Input**: \`Pid\` (server pid).
- **Behavior**: Gracefully stops the server process via \`gen_server:stop/1\`. Returns \`ok\`.
- **Examples**:
  - \`rate_limiter_srv:stop(Pid)\` returns \`ok\`.

## Rules & Verification Constraints

- Must export \`start_link/2\`, \`check_request/3\`, \`refill_all/1\`, \`reset_client/2\`, \`get_stats/1\`, and \`stop/1\`.
- Must export all 6 standard \`gen_server\` callbacks.
- \`reset_client/2\` must use \`gen_server:cast/2\`.
- \`check_request/3\`, \`refill_all/1\`, and \`get_stats/1\` must use \`gen_server:call/2\`.
- Token balances must never exceed \`MaxTokens\`.
`,
    mentalModelCheck: {
      question: 'In a token-bucket rate limiter, why is refill_all capped at MaxTokens?',
      codeSnippet: `NewTokens = min(Current + Refill, MaxTokens)`,
      options: [
        {
          id: 'A',
          label: 'To prevent clients from accumulating infinite credits during idle periods and subsequently overwhelming downstream services with uncontrolled bursts.',
          isCorrect: true,
          explanation: 'Correct! Without capping at MaxTokens, a client idle for 24 hours would accumulate millions of tokens and bypass all throttling protections.',
        },
        {
          id: 'B',
          label: 'Erlang maps can only hold numbers less than 100.',
          isCorrect: false,
          explanation: 'Erlang integers have arbitrary precision.',
        },
        {
          id: 'C',
          label: 'Tokens are physical hardware chips in the CPU.',
          isCorrect: false,
          explanation: 'Tokens are pure logical units in software.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'cast',
        module: 'gen_server',
        signature: 'gen_server:cast(ServerRef, Request) -> ok',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()'],
        description: 'Sends an asynchronous request to the ServerRef and returns ok immediately.',
        complexityNote: 'O(1) fire-and-forget message send.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#cast/2',
      },
    ],
    starterCode: `-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the rate limiter server with capacity and refill parameters.
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

%% @doc Request tokens for a client. Returns {allow, Remaining} or {deny, Current}.
check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    ok.

%% @doc Refill all active client buckets up to maximum token capacity.
refill_all(Pid) ->
    ok.

%% @doc Asynchronously reset a client bucket to full capacity.
reset_client(Pid, ClientId) ->
    ok.

%% @doc Query aggregate server metrics and active client count.
get_stats(Pid) ->
    ok.

%% @doc Gracefully terminate the rate limiter server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize the rate limiter state with configuration and telemetry counters.
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

%% @doc Handle synchronous calls.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the rate limiter server with capacity and refill parameters.
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

%% @doc Request tokens for a client. Returns {allow, Remaining} or {deny, Current}.
check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    gen_server:call(Pid, {check_request, ClientId, Cost}).

%% @doc Refill all active client buckets up to maximum token capacity.
refill_all(Pid) ->
    gen_server:call(Pid, refill_all).

%% @doc Asynchronously reset a client bucket to full capacity.
reset_client(Pid, ClientId) ->
    gen_server:cast(Pid, {reset_client, ClientId}).

%% @doc Query aggregate server metrics and active client count.
get_stats(Pid) ->
    gen_server:call(Pid, get_stats).

%% @doc Gracefully terminate the rate limiter server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize the rate limiter state with configuration and telemetry counters.
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

%% @doc Handle synchronous calls for token checking, batch refills, and stats.
handle_call({check_request, ClientId, Cost}, _From, #{max_tokens := Max, clients := Clients, total_allowed := Allowed, total_rejected := Rejected} = State) ->
    CurrentTokens = maps:get(ClientId, Clients, Max),
    if
        CurrentTokens >= Cost ->
            Remaining = CurrentTokens - Cost,
            NewClients = maps:put(ClientId, Remaining, Clients),
            {reply, {allow, Remaining}, State#{clients := NewClients, total_allowed := Allowed + 1}};
        true ->
            {reply, {deny, CurrentTokens}, State#{total_rejected := Rejected + 1}}
    end;
handle_call(refill_all, _From, #{max_tokens := Max, refill_amount := Refill, clients := Clients} = State) ->
    RefilledClients = maps:map(fun(_Id, Tokens) ->
        min(Tokens + Refill, Max)
    end, Clients),
    {reply, ok, State#{clients := RefilledClients}};
handle_call(get_stats, _From, #{clients := Clients, total_allowed := Allowed, total_rejected := Rejected} = State) ->
    Stats = #{
        total_allowed => Allowed,
        total_rejected => Rejected,
        active_clients => maps:size(Clients)
    },
    {reply, Stats, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handle asynchronous casts for resetting client buckets.
handle_cast({reset_client, ClientId}, #{max_tokens := Max, clients := Clients} = State) ->
    NewClients = maps:put(ClientId, Max, Clients),
    {noreply, State#{clients := NewClients}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    files: [
      {
        name: 'rate_limiter_srv.erl',
        path: 'src/rate_limiter_srv.erl',
        content: `-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the rate limiter server with capacity and refill parameters.
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

%% @doc Request tokens for a client. Returns {allow, Remaining} or {deny, Current}.
check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    ok.

%% @doc Refill all active client buckets up to maximum token capacity.
refill_all(Pid) ->
    ok.

%% @doc Asynchronously reset a client bucket to full capacity.
reset_client(Pid, ClientId) ->
    ok.

%% @doc Query aggregate server metrics and active client count.
get_stats(Pid) ->
    ok.

%% @doc Gracefully terminate the rate limiter server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize the rate limiter state with configuration and telemetry counters.
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

%% @doc Handle synchronous calls.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/rate_limiter_srv.erl': `-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link the rate limiter server with capacity and refill parameters.
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

%% @doc Request tokens for a client. Returns {allow, Remaining} or {deny, Current}.
check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    gen_server:call(Pid, {check_request, ClientId, Cost}).

%% @doc Refill all active client buckets up to maximum token capacity.
refill_all(Pid) ->
    gen_server:call(Pid, refill_all).

%% @doc Asynchronously reset a client bucket to full capacity.
reset_client(Pid, ClientId) ->
    gen_server:cast(Pid, {reset_client, ClientId}).

%% @doc Query aggregate server metrics and active client count.
get_stats(Pid) ->
    gen_server:call(Pid, get_stats).

%% @doc Gracefully terminate the rate limiter server.
stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks

%% @doc Initialize the rate limiter state with configuration and telemetry counters.
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

%% @doc Handle synchronous calls for token checking, batch refills, and stats.
handle_call({check_request, ClientId, Cost}, _From, #{max_tokens := Max, clients := Clients, total_allowed := Allowed, total_rejected := Rejected} = State) ->
    CurrentTokens = maps:get(ClientId, Clients, Max),
    if
        CurrentTokens >= Cost ->
            Remaining = CurrentTokens - Cost,
            NewClients = maps:put(ClientId, Remaining, Clients),
            {reply, {allow, Remaining}, State#{clients := NewClients, total_allowed := Allowed + 1}};
        true ->
            {reply, {deny, CurrentTokens}, State#{total_rejected := Rejected + 1}}
    end;
handle_call(refill_all, _From, #{max_tokens := Max, refill_amount := Refill, clients := Clients} = State) ->
    RefilledClients = maps:map(fun(_Id, Tokens) ->
        min(Tokens + Refill, Max)
    end, Clients),
    {reply, ok, State#{clients := RefilledClients}};
handle_call(get_stats, _From, #{clients := Clients, total_allowed := Allowed, total_rejected := Rejected} = State) ->
    Stats = #{
        total_allowed => Allowed,
        total_rejected => Rejected,
        active_clients => maps:size(Clients)
    },
    {reply, Stats, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

%% @doc Handle asynchronous casts for resetting client buckets.
handle_cast({reset_client, ClientId}, #{max_tokens := Max, clients := Clients} = State) ->
    NewClients = maps:put(ClientId, Max, Clients),
    {noreply, State#{clients := NewClients}};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up server resources on shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle hot-code configuration upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Quota Enforcement & Token Consumption',
        erlangCall: 'begin {ok, S} = rate_limiter_srv:start_link(10, 3), {allow, 7} = rate_limiter_srv:check_request(S, <<"client_a">>, 3), Res = rate_limiter_srv:check_request(S, <<"client_a">>, 5), rate_limiter_srv:stop(S), Res end',
        expectedOutput: '{allow, 2}',
        explanation: 'Deducts 3 and 5 tokens from 10 capacity, leaving 2 tokens.',
      },
      {
        id: 'tc2',
        title: 'Denial When Cost Exceeds Remaining Tokens',
        erlangCall: 'begin {ok, S} = rate_limiter_srv:start_link(10, 3), {allow, 2} = rate_limiter_srv:check_request(S, <<"client_b">>, 8), Res = rate_limiter_srv:check_request(S, <<"client_b">>, 5), rate_limiter_srv:stop(S), Res end',
        expectedOutput: '{deny, 2}',
        explanation: 'Denies request when 5 tokens are requested but only 2 remain.',
      },
      {
        id: 'tc3',
        title: 'Batch Refill All Clients',
        erlangCall: 'begin {ok, S} = rate_limiter_srv:start_link(10, 3), {allow, 0} = rate_limiter_srv:check_request(S, <<"client_c">>, 10), rate_limiter_srv:refill_all(S), Res = rate_limiter_srv:check_request(S, <<"client_c">>, 2), rate_limiter_srv:stop(S), Res end',
        expectedOutput: '{allow, 1}',
        explanation: 'Refills tokens and caps strictly at max_tokens.',
      },
    ],
    solutionExplanation: 'Implements an API Gateway token-bucket rate limiter with per-client burst quotas, atomic bucket deduction, batch refilling, and live sys:get_state inspection.',
    astRules: {
      requiredCalls: ['gen_server:start_link/3', 'gen_server:call/2', 'gen_server:cast/2'],
    },
  },
];
