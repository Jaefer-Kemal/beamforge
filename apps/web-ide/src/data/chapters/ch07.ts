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

## Parallel Worked Example

The following runnable demo implements a simple operational counter that demonstrates \`init/1\`, \`handle_call/3\`, \`handle_cast/2\`, and live introspection with \`sys:get_state/1\`:

\`\`\`erlang
-module(counter_demo).
-behaviour(gen_server).
-export([start_link/0, inc/2, get/1, stop/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link() -> gen_server:start_link(?MODULE, [], []).
inc(Pid, N) -> gen_server:cast(Pid, {inc, N}).
get(Pid)    -> gen_server:call(Pid, get_value).
stop(Pid)   -> gen_server:stop(Pid).

init([]) -> {ok, #{count => 0}}.
handle_call(get_value, _From, State = #{count := C}) -> {reply, C, State}.
handle_cast({inc, N}, State = #{count := C}) -> {noreply, State#{count := C + N}}.
handle_info(_Info, State) -> {noreply, State}.
terminate(_Reason, _State) -> ok.
code_change(_Old, State, _Extra) -> {ok, State}.
\`\`\`

## Assignment Specification

This is a **Guided Runnable Demo**. No code changes are required!
1. Inspect the pre-written \`otp_intro_demo\` module in the editor.
2. Click **\`Run\`** below to execute the demo.
3. Observe how the server initializes with state \`#{counter => 0, ops => 0}\`, executes synchronous calls and asynchronous casts, and uses \`sys:get_state/1\` to query the live internal map!

## Rules & Verification Constraints

- Must export \`start_link/0\`, \`increment/2\`, \`get_count/1\`, \`stop/1\`, and \`run_demo/0\`.
- Must export all 6 mandatory \`gen_server\` callbacks.
- Must verify live state using \`sys:get_state/1\`.
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

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

get_count(Pid) ->
    gen_server:call(Pid, get_count).

stop(Pid) ->
    gen_server:stop(Pid).

%% Demonstrates full lifecycle and live sys:get_state/1 introspection
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% gen_server Callbacks
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

get_count(Pid) ->
    gen_server:call(Pid, get_count).

stop(Pid) ->
    gen_server:stop(Pid).

%% Demonstrates full lifecycle and live sys:get_state/1 introspection
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% gen_server Callbacks
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

get_count(Pid) ->
    gen_server:call(Pid, get_count).

stop(Pid) ->
    gen_server:stop(Pid).

%% Demonstrates full lifecycle and live sys:get_state/1 introspection
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% gen_server Callbacks
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

get_count(Pid) ->
    gen_server:call(Pid, get_count).

stop(Pid) ->
    gen_server:stop(Pid).

%% Demonstrates full lifecycle and live sys:get_state/1 introspection
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% gen_server Callbacks
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

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

## Parallel Worked Example

The following module implements a simple inventory stock counter demonstrating \`call\` and \`cast\`:

\`\`\`erlang
-module(stock_server).
-behaviour(gen_server).
-export([start_link/1, restock/2, reserve/2, get_stock/1, stop/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link(Initial) -> gen_server:start_link(?MODULE, Initial, []).
restock(Pid, Qty)   -> gen_server:cast(Pid, {restock, Qty}).
reserve(Pid, Qty)   -> gen_server:call(Pid, {reserve, Qty}).
get_stock(Pid)      -> gen_server:call(Pid, get_stock).
stop(Pid)           -> gen_server:stop(Pid).

init(InitialQty) -> {ok, #{stock => InitialQty}}.

handle_call({reserve, Qty}, _From, State = #{stock := Stock}) when Qty =< 0 ->
    {reply, {error, invalid_quantity}, State};
handle_call({reserve, Qty}, _From, State = #{stock := Stock}) when Stock >= Qty ->
    NewStock = Stock - Qty,
    {reply, {ok, NewStock}, State#{stock := NewStock}};
handle_call({reserve, _Qty}, _From, State) ->
    {reply, {error, out_of_stock}, State};
handle_call(get_stock, _From, State = #{stock := Stock}) ->
    {reply, Stock, State}.

handle_cast({restock, Qty}, State = #{stock := Stock}) when Qty > 0 ->
    {noreply, State#{stock := Stock + Qty}}.

handle_info(_Info, State) -> {noreply, State}.
terminate(_Reason, _State) -> ok.
code_change(_Old, State, _Extra) -> {ok, State}.
\`\`\`

## Assignment Specification

Implement \`src/wallet_server.erl\` representing a multi-currency banking ledger:
1. \`start_link(InitialBalancesMap) -> {ok, Pid}\`:
   - Starts a linked \`gen_server\`. Initial state must be \`#{balances => InitialBalancesMap}\`.
2. \`credit(Pid, Currency, Amount)\`:
   - Asynchronously casts \`{credit, Currency, Amount}\` to the server.
   - If \`Currency\` is already present, adds \`Amount\` to existing balance; if absent, initializes at \`Amount\`.
3. \`debit(Pid, Currency, Amount)\`:
   - Synchronously calls the server with \`{debit, Currency, Amount}\`.
   - If \`Amount =< 0\`, replies \`{error, invalid_amount}\`.
   - If balance of \`Currency\` is absent or \`< Amount\`, replies \`{error, insufficient_funds}\`.
   - If balance \`>= Amount\`, deducts \`Amount\` and replies \`{ok, NewBalance}\`.
4. \`get_balances(Pid) -> BalancesMap\`:
   - Synchronously queries the server and returns the current \`BalancesMap\`.
5. \`stop(Pid) -> ok\`:
   - Stops the server gracefully via \`gen_server:stop(Pid)\`.

## Rules & Verification Constraints

- Must export \`start_link/1\`, \`credit/3\`, \`debit/3\`, \`get_balances/1\`, and \`stop/1\`.
- \`credit/3\` must use \`gen_server:cast/2\`.
- \`debit/3\` and \`get_balances/1\` must use \`gen_server:call/2\`.
- Internal state map must follow \`#{balances => #{Currency => Balance}}\`.
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

%% Client API
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

credit(Pid, Currency, Amount) when Amount > 0 ->
    ok.

debit(Pid, Currency, Amount) ->
    ok.

get_balances(Pid) ->
    ok.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

credit(Pid, Currency, Amount) when Amount > 0 ->
    gen_server:cast(Pid, {credit, Currency, Amount}).

debit(Pid, Currency, Amount) ->
    gen_server:call(Pid, {debit, Currency, Amount}).

get_balances(Pid) ->
    gen_server:call(Pid, get_balances).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

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

handle_cast({credit, Currency, Amount}, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    NewBalances = maps:put(Currency, CurrentBal + Amount, Balances),
    {noreply, State#{balances := NewBalances}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

credit(Pid, Currency, Amount) when Amount > 0 ->
    ok.

debit(Pid, Currency, Amount) ->
    ok.

get_balances(Pid) ->
    ok.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

credit(Pid, Currency, Amount) when Amount > 0 ->
    gen_server:cast(Pid, {credit, Currency, Amount}).

debit(Pid, Currency, Amount) ->
    gen_server:call(Pid, {debit, Currency, Amount}).

get_balances(Pid) ->
    gen_server:call(Pid, get_balances).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

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

handle_cast({credit, Currency, Amount}, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    NewBalances = maps:put(Currency, CurrentBal + Amount, Balances),
    {noreply, State#{balances := NewBalances}};
handle_cast(_Msg, State) ->
    {noreply, State}.

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
        title: 'Credit and Query Balances',
        erlangCall: 'begin {ok, W} = wallet_server:start_link(#{<<"USD">> => 100}), wallet_server:credit(W, <<"EUR">>, 50), timer:sleep(20), Bals = wallet_server:get_balances(W), wallet_server:stop(W), Bals end',
        expectedOutput: '#{<<"EUR">> => 50, <<"USD">> => 100}',
        explanation: 'Asynchronously credits 50 EUR and retrieves current balance map.',
      },
      {
        id: 'tc2',
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

## Parallel Worked Example

The following cache module hydrates default items after startup and purges expired entries using \`handle_info\`:

\`\`\`erlang
-module(temp_cache).
-behaviour(gen_server).
-export([start_link/0, put/2, get/1]).
-export([init/1, handle_continue/2, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link() -> gen_server:start_link(?MODULE, [], []).
put(Pid, Key) -> gen_server:cast(Pid, {put, Key, erlang:system_time(second)}).
get(Pid) -> gen_server:call(Pid, get_all).

init([]) ->
    {ok, #{items => #{}}, {continue, seed_cache}}.

handle_continue(seed_cache, State) ->
    erlang:send_after(500, self(), tick),
    {noreply, State#{items => #{default => erlang:system_time(second)}}}.

handle_call(get_all, _From, State = #{items := Items}) ->
    {reply, Items, State}.

handle_cast({put, K, V}, State = #{items := Items}) ->
    {noreply, State#{items := maps:put(K, V, Items)}}.

handle_info(tick, State) ->
    erlang:send_after(500, self(), tick),
    {noreply, State}.

terminate(_R, _S) -> ok.
code_change(_Old, S, _E) -> {ok, S}.
\`\`\`

## Assignment Specification

Implement \`src/session_ttl_server.erl\` managing in-memory user sessions with automated TTL expiration:
1. \`start_link(TtlSeconds) -> {ok, Pid}\`:
   - Returns immediately with \`{ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}\`.
2. \`handle_continue(hydrate_defaults, State)\`:
   - Seeds a default guest session: \`<<"guest">> => erlang:system_time(second)\`.
   - Schedules the first expiration tick: \`erlang:send_after(1000, self(), cleanup_tick)\`.
   - Returns \`{noreply, StateWithGuest}\`.
3. \`create_session(Pid, SessionId)\`:
   - Synchronously associates \`SessionId => erlang:system_time(second)\` in the sessions map. Returns \`ok\`.
4. \`is_valid(Pid, SessionId) -> boolean()\`:
   - Checks if \`SessionId\` exists and \`(Now - CreatedAt) =< TtlSeconds\`.
5. \`get_active_count(Pid) -> non_neg_integer()\`:
   - Returns the count of currently stored sessions in the map.
6. \`handle_info(cleanup_tick, State)\`:
   - Purges all sessions where \`Now - CreatedAt > TtlSeconds\`.
   - Re-arms the timer via \`erlang:send_after(1000, self(), cleanup_tick)\`.
   - Returns \`{noreply, PurgedState}\`.
7. \`stop(Pid) -> ok\`.

## Rules & Verification Constraints

- Must export \`handle_continue/2\` and return \`{continue, hydrate_defaults}\` from \`init/1\`.
- Must use \`erlang:send_after/3\` to schedule \`cleanup_tick\`.
- All timestamps must be generated using \`erlang:system_time(second)\`.
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

%% Client API
start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds > 0 ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

create_session(Pid, SessionId) ->
    ok.

is_valid(Pid, SessionId) ->
    false.

get_active_count(Pid) ->
    0.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(TtlSeconds) ->
    %% Return 3-element tuple with continue
    {ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}.

handle_continue(hydrate_defaults, State) ->
    {noreply, State}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds > 0 ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

create_session(Pid, SessionId) ->
    ok.

is_valid(Pid, SessionId) ->
    false.

get_active_count(Pid) ->
    0.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(TtlSeconds) ->
    %% Return 3-element tuple with continue
    {ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}.

handle_continue(hydrate_defaults, State) ->
    {noreply, State}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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
        id: 'tc1',
        title: 'Non-Blocking Guest Session Hydration',
        erlangCall: 'begin {ok, S} = session_ttl_server:start_link(60), Valid = session_ttl_server:is_valid(S, <<"guest">>), session_ttl_server:stop(S), Valid end',
        expectedOutput: 'true',
        explanation: 'Confirms that handle_continue populated default guest session immediately.',
      },
      {
        id: 'tc2',
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

## Parallel Worked Example

The following image processor coordinator demonstrates async worker offloading with \`gen_server:reply/2\`:

\`\`\`erlang
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
\`\`\`

## Assignment Specification

Implement \`src/async_report_server.erl\` managing background computational reports without blocking client traffic:
1. \`start_link() -> {ok, Pid}\`:
   - Initializes with state \`#{in_flight => 0, completed => 0}\`.
2. \`generate_report(Pid, JobId, ComputeFun) -> {ok, JobId, Result}\`:
   - Synchronous call \`gen_server:call(Pid, {generate_report, JobId, ComputeFun}, 3000)\`.
   - In \`handle_call/3\`:
     - Spawns a background worker executing \`Result = ComputeFun()\`.
     - The worker invokes \`gen_server:reply(From, {ok, JobId, Result})\` directly to unblock the caller.
     - The worker informs the server via \`ServerPid ! {job_finished, JobId}\`.
     - Immediately returns \`{noreply, State#{in_flight := InFlight + 1}}\`.
3. \`handle_info({job_finished, _JobId}, State)\`:
   - Decrements \`in_flight - 1\` and increments \`completed + 1\`. Returns \`{noreply, NewState}\`.
4. \`get_completed_count(Pid) -> {ok, #{in_flight => non_neg_integer(), completed => non_neg_integer()}}\`:
   - Synchronous call returning the current in-flight and completed counters.
5. \`hibernate_idle(Pid) -> hibernated\`:
   - Calls \`gen_server:call(Pid, hibernate_now)\` whose \`handle_call\` returns \`{reply, hibernated, State, hibernate}\`.
6. \`stop(Pid) -> ok\`.

## Rules & Verification Constraints

- Must export \`start_link/0\`, \`generate_report/3\`, \`get_completed_count/1\`, \`hibernate_idle/1\`, and \`stop/1\`.
- \`handle_call\` for \`generate_report\` must return \`{noreply, ...}\` and use \`gen_server:reply/2\` from the worker.
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

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

generate_report(Pid, JobId, ComputeFun) ->
    ok.

get_completed_count(Pid) ->
    ok.

hibernate_idle(Pid) ->
    ok.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init([]) ->
    {ok, #{in_flight => 0, completed => 0}}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

generate_report(Pid, JobId, ComputeFun) ->
    ok.

get_completed_count(Pid) ->
    ok.

hibernate_idle(Pid) ->
    ok.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init([]) ->
    {ok, #{in_flight => 0, completed => 0}}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

## Parallel Worked Example

The following is an abbreviated 2-state toggle switch demonstrating \`gen_statem\` with \`state_functions\`:

\`\`\`erlang
-module(toggle_statem).
-behaviour(gen_statem).
-export([start_link/0, press/1, get_state/1, stop/1]).
-export([callback_mode/0, init/1, terminate/3, code_change/4]).
-export([off/3, on/3]).

callback_mode() -> state_functions.
start_link() -> gen_statem:start_link(?MODULE, [], []).
press(Pid) -> gen_statem:call(Pid, press).
get_state(Pid) -> gen_statem:call(Pid, get_state).
stop(Pid) -> gen_statem:stop(Pid).

init([]) -> {ok, off, #{presses => 0}}.

off({call, From}, press, Data = #{presses := P}) ->
    {next_state, on, Data#{presses := P + 1}, [{reply, From, switched_on}]};
off({call, From}, get_state, Data) ->
    {keep_state, Data, [{reply, From, off}]}.

on({call, From}, press, Data = #{presses := P}) ->
    {next_state, off, Data#{presses := P + 1}, [{reply, From, switched_off}]};
on({call, From}, get_state, Data) ->
    {keep_state, Data, [{reply, From, on}]}.

terminate(_R, _State, _Data) -> ok.
code_change(_Old, State, Data, _Extra) -> {ok, State, Data}.
\`\`\`

## Assignment Specification

Implement \`src/circuit_breaker_statem.erl\` representing a self-healing circuit breaker:
1. \`callback_mode() -> state_functions\`.
2. \`start_link(FailureThreshold, OpenTimeoutMs) -> {ok, Pid}\`:
   - Initial state is \`closed\`. Initial data is \`#{threshold => FailureThreshold, timeout => OpenTimeoutMs, failures => 0}\`.
3. \`execute(Pid, ActionFun)\`:
   - In \`closed\`:
     - Calls \`ActionFun()\`. If it returns \`{ok, Val}\`, resets \`failures => 0\` and replies \`{ok, Val}\`.
     - If it returns \`{error, Reason}\` or crashes, increments \`failures\`. If \`failures + 1 >= Threshold\`, transitions to \`open\` with action \`[{state_timeout, OpenTimeoutMs, try_half_open}]\` and replies \`{error, Reason}\`.
   - In \`open\`:
     - **Fast-fails immediately without running \`ActionFun()\`**, replying \`{error, circuit_open}\`.
     - When \`state_timeout\` event \`try_half_open\` triggers, transitions to \`half_open\`.
   - In \`half_open\`:
     - Executes \`ActionFun()\`. If \`{ok, Val}\`, transitions back to \`closed\` with \`failures => 0\` and replies \`{ok, Val}\`.
     - If \`{error, Reason}\`, trips back to \`open\` with \`state_timeout\` and replies \`{error, Reason}\`.
4. \`get_state_name(Pid) -> closed | open | half_open\`.
5. \`stop(Pid) -> ok\`.

## Rules & Verification Constraints

- Must implement \`-behaviour(gen_statem).\` and export \`callback_mode/0\`.
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

%% Client API
start_link(FailureThreshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {FailureThreshold, OpenTimeoutMs}, []).

execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    ok.

get_state_name(Pid) ->
    closed.

stop(Pid) ->
    gen_statem:stop(Pid).

%% gen_statem Callbacks
callback_mode() ->
    state_functions.

init({Threshold, TimeoutMs}) ->
    Data = #{threshold => Threshold, timeout => TimeoutMs, failures => 0},
    {ok, closed, Data}.

closed({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, closed}]};
closed({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, ok}]}.

open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, open}]};
open({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, {error, circuit_open}}]};
open(state_timeout, _Event, Data) ->
    {next_state, half_open, Data}.

half_open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, half_open}]};
half_open({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, ok}]}.

terminate(_Reason, _State, _Data) ->
    ok.

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

%% Client API
start_link(FailureThreshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {FailureThreshold, OpenTimeoutMs}, []).

execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    ok.

get_state_name(Pid) ->
    closed.

stop(Pid) ->
    gen_statem:stop(Pid).

%% gen_statem Callbacks
callback_mode() ->
    state_functions.

init({Threshold, TimeoutMs}) ->
    Data = #{threshold => Threshold, timeout => TimeoutMs, failures => 0},
    {ok, closed, Data}.

closed({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, closed}]};
closed({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, ok}]}.

open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, open}]};
open({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, {error, circuit_open}}]};
open(state_timeout, _Event, Data) ->
    {next_state, half_open, Data}.

half_open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, half_open}]};
half_open({call, From}, _Msg, Data) ->
    {keep_state, Data, [{reply, From, ok}]}.

terminate(_Reason, _State, _Data) ->
    ok.

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

The following is an audit event logger that tracks system warnings:

\`\`\`erlang
-module(warning_logger).
-behaviour(gen_event).
-export([add_handler/1, get_warnings/1]).
-export([init/1, handle_event/2, handle_call/2, handle_info/2, terminate/2, code_change/3]).

add_handler(Mgr) -> gen_event:add_handler(Mgr, ?MODULE, []).
get_warnings(Mgr) -> gen_event:call(Mgr, ?MODULE, get_warnings).

init([]) -> {ok, []}.

handle_event({warning, Msg}, Warnings) ->
    {ok, [Msg | Warnings]};
handle_event(_Other, Warnings) ->
    {ok, Warnings}.

handle_call(get_warnings, Warnings) ->
    {ok, lists:reverse(Warnings), Warnings}.

handle_info(_Info, State) -> {ok, State}.
terminate(_Reason, _State) -> ok.
code_change(_Old, State, _Extra) -> {ok, State}.
\`\`\`

## Assignment Specification

Implement \`src/security_audit_handler.erl\` tracking brute-force IP login attacks:
1. \`add_to_manager(ManagerPid, MaxAttempts) -> ok\`:
   - Attaches \`?MODULE\` to \`ManagerPid\` with initial state \`#{max => MaxAttempts, tracker => #{}}\`.
2. \`handle_event({login_failed, IpBinary}, State = #{max := Max, tracker := Tracker})\`:
   - Increments the failed attempt counter for \`IpBinary\`.
   - If \`NewCount >= Max\`, records \`alert => true\` for that IP.
   - Returns \`{ok, UpdatedState}\`.
3. \`handle_event({login_success, IpBinary}, State = #{tracker := Tracker})\`:
   - Clears previous failures for \`IpBinary\` (setting \`attempts => 0, alert => false\`).
   - Returns \`{ok, UpdatedState}\`.
4. \`get_ip_status(ManagerPid, IpBinary) -> {ok, #{attempts => non_neg_integer(), alert => boolean()}}\`:
   - Uses \`gen_event:call(ManagerPid, ?MODULE, {get_status, IpBinary})\`.
   - Replies with the status map for that IP (defaulting to \`attempts => 0, alert => false\` if IP was never seen).

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

%% Client API
add_to_manager(ManagerPid, MaxAttempts) ->
    ok.

get_ip_status(ManagerPid, IpBinary) ->
    ok.

%% gen_event Callbacks
init(MaxAttempts) ->
    {ok, #{max => MaxAttempts, tracker => #{}}}.

handle_event(_Event, State) ->
    {ok, State}.

handle_call(_Req, State) ->
    {ok, ok, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
add_to_manager(ManagerPid, MaxAttempts) ->
    ok.

get_ip_status(ManagerPid, IpBinary) ->
    ok.

%% gen_event Callbacks
init(MaxAttempts) ->
    {ok, #{max => MaxAttempts, tracker => #{}}}.

handle_event(_Event, State) ->
    {ok, State}.

handle_call(_Req, State) ->
    {ok, ok, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

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
    incidentAlert: {
      incidentId: 'INC-103',
      severity: 'CRITICAL',
      serviceName: 'firewall-rule-hydrator',
      symptom: 'During rolling deployments, the root supervisor times out and aborts boot whenever the firewall rule list exceeds 5,000 entries.',
      impact: 'Cluster nodes fail health checks and get killed by Kubernetes during rolling updates, causing service outages.',
      rootCauseHint: 'incident_blocking_init:init/1 performs synchronous rule compilation and normalization directly inside init/1 before returning {ok, State}, blocking gen_server:start_link/3.',
      fixObjective: 'Refactor init/1 to return {ok, #{status => booting, raw => SeedRules, rules => #{}}, {continue, {hydrate, SeedRules}}} immediately, and move rule compilation into handle_continue({hydrate, SeedRules}, State) setting status => ready.',
    },
    conceptMarkdown: `## 🚨 Incident Triage: Root Supervisor Boot Timeout (INC-103)

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
Inspecting \`src/incident_blocking_init.erl\` reveals that the server attempts to compile, normalize, and parse all firewall rules synchronously inside \`init/1\`:
\`\`\`erlang
%% BROKEN IMPLEMENTATION:
init(SeedRules) ->
    %% Heavy CPU loop compiling 5,000 rules blocks the caller for 6,200ms!
    CompiledMap = compile_all_rules(SeedRules),
    {ok, #{status => ready, rules => CompiledMap}}.
\`\`\`

Because \`gen_server:start_link/3\` blocks the parent supervisor until \`init/1\` returns, the supervisor reached its 5,000ms child startup timeout and killed the process!

### Your Fix Objective
Refactor \`incident_blocking_init.erl\` using the modern OTP 21+ **\`{continue, Term}\`** pattern:
1. \`init/1\` must return immediately in **< 1ms**:
   \`\`\`erlang
   {ok, #{status => booting, raw => SeedRules, rules => #{}}, {continue, {hydrate, SeedRules}}}
   \`\`\`
2. Move rule compilation into **\`handle_continue({hydrate, SeedRules}, State)\`**:
   - Compile \`SeedRules\` into the rules map: \`maps:from_list(SeedRules)\`.
   - Update internal state: \`State#{status := ready, rules := CompiledRules}\`.
   - Return \`{noreply, State}\`.
3. \`lookup_rule(Pid, Port)\`:
   - If \`status =:= ready\`, returns \`{ok, Action}\` if found, \`{error, not_found}\` otherwise.
   - If \`status =:= booting\`, returns \`{error, still_booting}\`.
4. Ensure \`get_status(Pid)\` returns \`ready\` after hydration completes.
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

%% Client API
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

get_status(Pid) ->
    gen_server:call(Pid, get_status).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(SeedRules) ->
    %% BUGGY BLOCKING IMPLEMENTATION:
    Compiled = maps:from_list(SeedRules),
    {ok, #{status => ready, rules => Compiled, items => Compiled}}.

handle_continue(_Continue, State) ->
    {noreply, State}.

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

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

get_status(Pid) ->
    gen_server:call(Pid, get_status).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(SeedRules) ->
    {ok, #{status => booting, raw => SeedRules, rules => #{}, items => #{}}, {continue, {hydrate, SeedRules}}}.

handle_continue({hydrate, SeedRules}, State) ->
    Compiled = maps:from_list(SeedRules),
    {noreply, State#{status := ready, rules := Compiled, items := Compiled}}.

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

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

get_status(Pid) ->
    gen_server:call(Pid, get_status).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(SeedRules) ->
    %% BUGGY BLOCKING IMPLEMENTATION:
    Compiled = maps:from_list(SeedRules),
    {ok, #{status => ready, rules => Compiled, items => Compiled}}.

handle_continue(_Continue, State) ->
    {noreply, State}.

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

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

get_status(Pid) ->
    gen_server:call(Pid, get_status).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(SeedRules) ->
    {ok, #{status => booting, raw => SeedRules, rules => #{}, items => #{}}, {continue, {hydrate, SeedRules}}}.

handle_continue({hydrate, SeedRules}, State) ->
    Compiled = maps:from_list(SeedRules),
    {noreply, State#{status := ready, rules := Compiled, items := Compiled}}.

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

handle_cast(_Msg, State) ->
    {noreply, State}.

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
    conceptMarkdown: `## Why This Matters in Production

In microservice ecosystems and public developer platforms (such as Stripe, GitHub, or AWS API Gateway), rate limiting is the primary defense line against distributed denial-of-service (DDoS) attacks, abusive web scrapers, and runaway client retry loops.

The gold standard for API throttling is the **Token-Bucket Algorithm**:
- Each client starts with a maximum bucket capacity of \`MaxTokens\`.
- Every incoming API request consumes $N$ tokens depending on its computational cost (e.g., \`GET /v1/user\` costs 1 token; heavy \`POST /v1/reports\` costs 5 tokens).
- If a client has sufficient tokens, the request is allowed immediately.
- If tokens are insufficient, the request is denied with an HTTP 429 status (\`{deny, Remaining}\`).
- Periodically, a background sweep refills $R$ tokens back into every active bucket, capped strictly at \`MaxTokens\`.

In this Capstone Problem Set for Chapter 7, you will engineer a high-throughput, production-grade **Token-Bucket Rate Limiter Server** using \`gen_server\`!

## Deep Concept Breakdown & Under the Hood

### State Architecture

Your \`gen_server\` maintains state as a map holding configuration, dynamic client balances, and global telemetry:

\`\`\`erlang
#{
    max_tokens => MaxTokens,         %% Maximum capacity per bucket (pos_integer())
    refill_amount => RefillAmount,   %% Tokens added per refill cycle (pos_integer())
    clients => #{                    %% Dynamic client token buckets (map())
        <<"client_1">> => 7,
        <<"client_2">> => 10
    },
    total_allowed => 0,              %% Global counter of approved requests (integer())
    total_rejected => 0              %% Global counter of rejected requests (integer())
}
\`\`\`

### Dynamic On-Demand Client Bucket Creation
When a request arrives for a previously unseen \`ClientId\`, your server must **automatically provision a fresh bucket with full \`MaxTokens\` capacity** before deducting the requested cost.

### Capped Batch Refills
When \`refill_all(Pid)\` is executed, every existing client bucket in \`clients\` receives \`RefillAmount\` additional tokens, capped at \`max_tokens\`:
\`\`\`erlang
NewTokens = min(CurrentTokens + RefillAmount, MaxTokens)
\`\`\`

### Live Introspection via \`sys:get_state/1\`
Because your module implements standard \`gen_server\` callbacks, production operators can inspect the exact internal balances and counters in real time using \`sys:get_state(Pid)\`!

> [!warning] Production OTP Trap: Map Allocation Leaks on Infinite Clients
> In a production gateway handling millions of ephemeral IP addresses, inserting an entry into \`clients\` for every unique IP will eventually exhaust memory. In production systems (as we will explore in Chapter 9), client buckets are backed by off-heap ETS tables with automatic TTL evictions (\`select_delete\`).

## Assignment Specification

Implement \`src/rate_limiter_srv.erl\` with the following exports:

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

1. \`start_link(MaxTokens, RefillAmount) -> {ok, Pid}\`:
   - Spawns and links the \`gen_server\`. Initial state:
     \`#{max_tokens => MaxTokens, refill_amount => RefillAmount, clients => #{}, total_allowed => 0, total_rejected => 0}\`.
2. \`check_request(Pid, ClientId, Cost) -> {allow, Remaining} | {deny, Remaining}\`:
   - Synchronous \`call\`.
   - If \`ClientId\` is new, initial balance is \`MaxTokens\`.
   - If \`Balance >= Cost\`:
     - Decrements balance by \`Cost\`.
     - Increments \`total_allowed + 1\`.
     - Returns \`{allow, NewBalance}\`.
   - If \`Balance < Cost\`:
     - Balance remains unchanged.
     - Increments \`total_rejected + 1\`.
     - Returns \`{deny, Balance}\`.
3. \`refill_all(Pid) -> ok\`:
   - Synchronous \`call\` (or \`cast\`).
   - For every entry in \`clients\`, updates tokens to \`min(Tokens + RefillAmount, MaxTokens)\`. Returns \`ok\`.
4. \`reset_client(Pid, ClientId) -> ok\`:
   - Asynchronous \`cast\`. Resets \`ClientId\`'s balance directly to full \`MaxTokens\`. Returns \`ok\`.
5. \`get_stats(Pid) -> #{total_allowed => integer(), total_rejected => integer(), active_clients => integer()}\`:
   - Synchronous \`call\` returning aggregate metrics. \`active_clients\` is the number of keys in \`clients\`.
6. \`stop(Pid) -> ok\`:
   - Stops the server gracefully via \`gen_server:stop(Pid)\`.

## Rules & Verification Constraints

- Must export \`start_link/2\`, \`check_request/3\`, \`refill_all/1\`, \`reset_client/2\`, \`get_stats/1\`, and \`stop/1\`.
- Must export all 6 mandatory \`gen_server\` callbacks.
- \`reset_client/2\` must use \`gen_server:cast/2\`.
- \`check_request/3\` and \`get_stats/1\` must use \`gen_server:call/2\`.
- Token balances must never exceed \`MaxTokens\`.
`,
    mentalModelCheck: {
      question: 'In a token-bucket rate limiter, why is refill_all capped at MaxTokens?',
      codeSnippet: `NewTokens = min(Current + Refill, MaxTokens)`,
      options: [
        {
          id: 'A',
          label: 'To prevent clients from accumulating infinite credits during idle periods and subsequently overwhelming the downstream service with an uncontrolled burst.',
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

%% Client API
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    ok.

refill_all(Pid) ->
    ok.

reset_client(Pid, ClientId) ->
    ok.

get_stats(Pid) ->
    ok.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    gen_server:call(Pid, {check_request, ClientId, Cost}).

refill_all(Pid) ->
    gen_server:call(Pid, refill_all).

reset_client(Pid, ClientId) ->
    gen_server:cast(Pid, {reset_client, ClientId}).

get_stats(Pid) ->
    gen_server:call(Pid, get_stats).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

handle_call({check_request, ClientId, Cost}, _From, State = #{max_tokens := Max, clients := Clients, total_allowed := Allowed, total_rejected := Rejected}) ->
    CurrentTokens = maps:get(ClientId, Clients, Max),
    if
        CurrentTokens >= Cost ->
            Remaining = CurrentTokens - Cost,
            NewClients = maps:put(ClientId, Remaining, Clients),
            {reply, {allow, Remaining}, State#{clients := NewClients, total_allowed := Allowed + 1}};
        true ->
            {reply, {deny, CurrentTokens}, State#{total_rejected := Rejected + 1}}
    end;

handle_call(refill_all, _From, State = #{max_tokens := Max, refill_amount := Refill, clients := Clients}) ->
    RefilledClients = maps:map(fun(_Id, Tokens) ->
        min(Tokens + Refill, Max)
    end, Clients),
    {reply, ok, State#{clients := RefilledClients}};

handle_call(get_stats, _From, State = #{clients := Clients, total_allowed := Allowed, total_rejected := Rejected}) ->
    Stats = #{
        total_allowed => Allowed,
        total_rejected => Rejected,
        active_clients => maps:size(Clients)
    },
    {reply, Stats, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({reset_client, ClientId}, State = #{max_tokens := Max, clients := Clients}) ->
    NewClients = maps:put(ClientId, Max, Clients),
    {noreply, State#{clients := NewClients}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    ok.

refill_all(Pid) ->
    ok.

reset_client(Pid, ClientId) ->
    ok.

get_stats(Pid) ->
    ok.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% Client API
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    gen_server:call(Pid, {check_request, ClientId, Cost}).

refill_all(Pid) ->
    gen_server:call(Pid, refill_all).

reset_client(Pid, ClientId) ->
    gen_server:cast(Pid, {reset_client, ClientId}).

get_stats(Pid) ->
    gen_server:call(Pid, get_stats).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

handle_call({check_request, ClientId, Cost}, _From, State = #{max_tokens := Max, clients := Clients, total_allowed := Allowed, total_rejected := Rejected}) ->
    CurrentTokens = maps:get(ClientId, Clients, Max),
    if
        CurrentTokens >= Cost ->
            Remaining = CurrentTokens - Cost,
            NewClients = maps:put(ClientId, Remaining, Clients),
            {reply, {allow, Remaining}, State#{clients := NewClients, total_allowed := Allowed + 1}};
        true ->
            {reply, {deny, CurrentTokens}, State#{total_rejected := Rejected + 1}}
    end;

handle_call(refill_all, _From, State = #{max_tokens := Max, refill_amount := Refill, clients := Clients}) ->
    RefilledClients = maps:map(fun(_Id, Tokens) ->
        min(Tokens + Refill, Max)
    end, Clients),
    {reply, ok, State#{clients := RefilledClients}};

handle_call(get_stats, _From, State = #{clients := Clients, total_allowed := Allowed, total_rejected := Rejected}) ->
    Stats = #{
        total_allowed => Allowed,
        total_rejected => Rejected,
        active_clients => maps:size(Clients)
    },
    {reply, Stats, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({reset_client, ClientId}, State = #{max_tokens := Max, clients := Clients}) ->
    NewClients = maps:put(ClientId, Max, Clients),
    {noreply, State#{clients := NewClients}};
handle_cast(_Msg, State) ->
    {noreply, State}.

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
