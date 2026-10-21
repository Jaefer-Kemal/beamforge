import { WorkspaceFile, BeamNode, BeamEdge, XmppC2SState, VisualSceneId, MentalModelCheckSpec } from '../types/workspace';

export type CapabilityMode = 'code_only' | 'code_and_memory' | 'beam_graph' | 'xmpp_full';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Production';
export type ReferenceCategory = 'erlang_docs' | 'github_otp' | 'github_ecosystem' | 'book_rfc';

export interface ExternalReference {
  title: string;
  url: string;
  category: ReferenceCategory;
  description: string;
}

export interface VerificationStageSpec {
  id: string;
  title: string;
  description: string;
  hintOnFail?: string;
}

export interface CurriculumLevel {
  id: string;
  worldId: string;
  levelNumber: string; // e.g. "1.1", "1.2"
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  xpReward: number;
  capabilityMode: CapabilityMode;
  conceptMarkdown: string;
  references: ExternalReference[];
  files: WorkspaceFile[];
  solutionFiles: Record<string, string>; // filepath -> solution content
  verificationStages: VerificationStageSpec[];
  initialNodes?: BeamNode[];
  initialEdges?: BeamEdge[];
  initialXmppState?: XmppC2SState;
  visualScene?: VisualSceneId;
  mentalModelCheck?: MentalModelCheckSpec;
}

export interface CurriculumWorld {
  id: string;
  worldNumber: number;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  levels: CurriculumLevel[];
}

export const CURRICULUM_WORLDS: CurriculumWorld[] = [
  // =========================================================================
  // WORLD 1: BEAM Foundations & Binary Craft
  // =========================================================================
  {
    id: 'world-1-foundations',
    worldNumber: 1,
    title: 'BEAM Foundations & Binary Craft',
    subtitle: 'Immutable Terms, Tail Recursion & Memory Invariants',
    description: 'Master pattern matching, accumulator-based recursion, and sub-binary memory leak prevention directly on the BEAM heap.',
    accentColor: '#10b981', // Emerald
    levels: [
      // Level 1.1
      {
        id: 'erl-101-pattern-matching',
        worldId: 'world-1-foundations',
        levelNumber: '1.1',
        title: 'Pattern Matching, Guards & Immutable Stanza Tuples',
        subtitle: 'Parse incoming protocol terms cleanly with deep tuple destructuring and guard clauses',
        difficulty: 'Beginner',
        estimatedMinutes: 15,
        xpReward: 100,
        capabilityMode: 'code_only',
        conceptMarkdown: `## Pattern Matching, Guards & Immutable Stanza Tuples

In Erlang, pattern matching is not simply a conditional switch—it is the foundational mechanism for term extraction, assertion, and dispatch.

> [!abstract] Under the Hood: The BEAM Match Engine
> The Erlang compiler compiles pattern matches into efficient decision trees (using BEAM opcodes like \`select_tuple_arity\`, \`select_val\`, and \`test_heap\`). Variables in patterns are bound once. If a term does not match any clause, the BEAM throws a \`function_clause\` runtime exception.
> 
> Guard clauses (\`when is_binary(From), Priority >= 0\`) are strictly side-effect free and evaluated in the VM without altering process state.

### Code Pattern:
\`\`\`erlang
parse_stanza({message, Id, From, To, Body}) when is_binary(From), is_binary(To) ->
    {ok, #{id => Id, from => From, to => To, body => Body, type => message}};
parse_stanza({presence, From, Status}) when is_binary(From) ->
    {ok, #{from => From, status => Status, type => presence}};
parse_stanza(_) ->
    {error, invalid_stanza}.
\`\`\`

### Your Task:
Complete \`src/stanza_parser.erl\` to parse incoming \`{message, ...}\`, \`{presence, ...}\`, and \`{iq, ...}\` stanzas according to the specification, rejecting invalid terms with \`{error, invalid_stanza}\`.`,
        references: [
          {
            title: 'Erlang Reference Manual: Pattern Matching',
            url: 'https://www.erlang.org/doc/system/expressions.html#pattern-matching',
            category: 'erlang_docs',
            description: 'Official OTP specification for pattern matching and term bindings.',
          },
          {
            title: 'Learn You Some Erlang: Syntax in Functions',
            url: 'https://learnyousomeerlang.com/syntax-in-functions',
            category: 'book_rfc',
            description: 'Deep dive into pattern matching, guards, and clause dispatching.',
          },
        ],
        files: [
          {
            path: 'src/stanza_parser.erl',
            name: 'stanza_parser.erl',
            behaviour: 'header',
            content: `-module(stanza_parser).
-export([parse/1, validate_priority/1]).

%% @doc Parse incoming stanza tuples into normalized maps.
%% Supported formats:
%%   {message, Id, From, To, Body} when is_binary(From), is_binary(To)
%%   {presence, From, Status, Priority} when is_binary(From), is_integer(Priority), Priority >= -128, Priority =< 127
%%   {iq, Id, Type, From, Payload} when Type =:= get orelse Type =:= set orelse Type =:= result orelse Type =:= error
%% Invalid terms must return {error, invalid_stanza}.
parse({message, Id, From, To, Body}) when is_binary(From), is_binary(To) ->
    %% TODO: Return {ok, #{type => message, id => Id, from => From, to => To, body => Body}}
    {error, not_implemented};
parse({presence, From, Status, Priority}) when is_binary(From), is_integer(Priority) ->
    %% TODO: Validate Priority is between -128 and 127 and return {ok, Map}
    {error, not_implemented};
parse({iq, Id, Type, From, Payload}) ->
    %% TODO: Match Type in [get, set, result, error] and return {ok, Map}
    {error, not_implemented};
parse(_) ->
    {error, invalid_stanza}.

validate_priority(P) when is_integer(P), P >= -128, P =< 127 ->
    true;
validate_priority(_) ->
    false.
`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/stanza_parser.erl': `-module(stanza_parser).
-export([parse/1, validate_priority/1]).

parse({message, Id, From, To, Body}) when is_binary(From), is_binary(To) ->
    {ok, #{
        type => message,
        id => Id,
        from => From,
        to => To,
        body => Body
    }};
parse({presence, From, Status, Priority}) when is_binary(From), is_integer(Priority), Priority >= -128, Priority =< 127 ->
    {ok, #{
        type => presence,
        from => From,
        status => Status,
        priority => Priority
    }};
parse({iq, Id, Type, From, Payload}) when Type =:= get; Type =:= set; Type =:= result; Type =:= error ->
    {ok, #{
        type => iq,
        id => Id,
        iq_type => Type,
        from => From,
        payload => Payload
    }};
parse(_) ->
    {error, invalid_stanza}.

validate_priority(P) when is_integer(P), P >= -128, P =< 127 ->
    true;
validate_priority(_) ->
    false.
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles stanza_parser.erl with warnings_as_errors under OTP 29.',
          },
          {
            id: 'tuple_pattern_matching',
            title: 'Message & IQ Tuple Destructuring',
            description: 'Verifies structured field extraction for message and IQ stanzas.',
          },
          {
            id: 'guard_expression_validation',
            title: 'Presence Priority Guard Bounds (-128..127)',
            description: 'Ensures invalid integer boundaries are cleanly rejected.',
          },
          {
            id: 'error_case_handling',
            title: 'Malformed Input Defensive Matching',
            description: 'Confirms malformed stanzas return {error, invalid_stanza} with zero crashes.',
          },
        ],
      },

      // Level 1.2
      {
        id: 'erl-102-tail-recursion',
        worldId: 'world-1-foundations',
        levelNumber: '1.2',
        title: 'Tail-Call Optimization (TCO) & BEAM Stack Frames',
        subtitle: 'Eliminate stack frame allocation using accumulator parameters in high-throughput loops',
        difficulty: 'Beginner',
        estimatedMinutes: 20,
        xpReward: 150,
        capabilityMode: 'code_and_memory',
        visualScene: 'tco_vs_body_stack',
        conceptMarkdown: `## Tail-Call Optimization (TCO) & BEAM Stack Frames

Erlang processes have no loops (\`while\`, \`for\`). All iteration is achieved via recursion.

> [!abstract] Under the Hood: The \`call_last\` Instruction
> When a function call is in **tail position** (the very last expression to evaluate before returning), the BEAM compiler emits the \`call_last\` instruction.
> Instead of pushing a new stack frame onto the process's execution stack, the BEAM overwrites the current stack frame and reuses it.
> 
> A non-tail recursive function accumulates $O(N)$ stack frames on the process heap, leading to memory exhaustion and garbage collection thrashing when processing millions of packets.

### Non-Tail Recursive (Stack Growth):
\`\`\`erlang
sum([]) -> 0;
sum([H|T]) -> H + sum(T). %% Must preserve stack frame to perform addition!
\`\`\`

### Tail Recursive with Accumulator (O(1) Stack):
\`\`\`erlang
sum(List) -> sum(List, 0).

sum([], Acc) -> Acc;
sum([H|T], Acc) -> sum(T, Acc + H). %% Strict tail position!
\`\`\`

### Your Task:
Transform the naive list processing functions in \`src/packet_accumulator.erl\` into strict tail-recursive versions utilizing accumulator parameters, then reverse the list with \`lists:reverse/1\` upon completion.`,
        references: [
          {
            title: 'Erlang Efficiency Guide: The Eight Myths of Erlang Performance (Tail Recursion)',
            url: 'https://www.erlang.org/doc/system/eff_guide_functions.html',
            category: 'erlang_docs',
            description: 'Official OTP guide discussing tail calls, stack re-use, and accumulator efficiency.',
          },
          {
            title: 'GitHub erlang/otp: BEAM Emulator Instruction Loop (beam_emu.c)',
            url: 'https://github.com/erlang/otp/tree/master/erts/emulator/beam',
            category: 'github_otp',
            description: 'C source code for the BEAM virtual machine instruction dispatch loop.',
          },
        ],
        files: [
          {
            path: 'src/packet_accumulator.erl',
            name: 'packet_accumulator.erl',
            behaviour: 'header',
            content: `-module(packet_accumulator).
-export([sum_packets/1, filter_active_sessions/1]).

%% @doc Sum integer packet lengths in strict tail-call position.
sum_packets(List) ->
    %% TODO: Implement accumulator helper sum_packets/2
    sum_packets_naive(List).

sum_packets_naive([]) -> 0;
sum_packets_naive([H|T]) -> H + sum_packets_naive(T).

%% @doc Filter sessions where status == active in tail position.
filter_active_sessions(Sessions) ->
    %% TODO: Implement filter_active_sessions/2 with accumulator and lists:reverse/1
    filter_naive(Sessions).

filter_naive([]) -> [];
filter_naive([{Id, active}|T]) -> [{Id, active} | filter_naive(T)];
filter_naive([_|T]) -> filter_naive(T).
`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/packet_accumulator.erl': `-module(packet_accumulator).
-export([sum_packets/1, filter_active_sessions/1]).

sum_packets(List) ->
    sum_packets(List, 0).

sum_packets([], Acc) ->
    Acc;
sum_packets([H|T], Acc) ->
    sum_packets(T, Acc + H).

filter_active_sessions(Sessions) ->
    filter_active_sessions(Sessions, []).

filter_active_sessions([], Acc) ->
    lists:reverse(Acc);
filter_active_sessions([{Id, active} = Session | T], Acc) ->
    filter_active_sessions(T, [Session | Acc]);
filter_active_sessions([_ | T], Acc) ->
    filter_active_sessions(T, Acc).
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles packet_accumulator.erl with debug_info.',
          },
          {
            id: 'tco_stack_frame_audit',
            title: 'BEAM Instruction Audit (call_last)',
            description: 'Inspects BEAM bytecode disassembly to confirm tail-call optimization in loops.',
          },
          {
            id: 'large_input_recursion',
            title: 'Deep Recursion (1,000,000 Iterations)',
            description: 'Executes million-element list iteration verifying constant stack size (< 64 words).',
          },
          {
            id: 'correctness_and_ordering',
            title: 'Accumulator Reversal & Result Verification',
            description: 'Confirms exact numerical sum and preserves session element ordering.',
          },
        ],
      },

      // Level 1.3
      {
        id: 'erl-103-bit-syntax-binaries',
        worldId: 'world-1-foundations',
        levelNumber: '1.3',
        title: 'Erlang Bit Syntax & Sub-Binary Memory Leak Prevention',
        subtitle: 'Parse wire frames with binary patterns and break references to 64KB+ buffers with binary:copy/1',
        difficulty: 'Intermediate',
        estimatedMinutes: 25,
        xpReward: 200,
        capabilityMode: 'code_and_memory',
        visualScene: 'sub_binary_procbin_refc',
        conceptMarkdown: `## Erlang Bit Syntax & Sub-Binary Memory Leak Prevention

Erlang features unmatched support for unpacking binary wire protocols via bit-level pattern matching.

> [!abstract] Under the Hood: ProcBin vs HeapBin & Refc Leaks
> - Binaries $\\le 64$ bytes are **HeapBin** terms allocated directly on the process heap.
> - Binaries $> 64$ bytes are **ProcBin** terms allocated in globally shared, reference-counted off-heap memory.
> 
> When you slice a binary:
> \`\`\`erlang
> <<Magic:16, Len:16, Payload:Len/binary, Rest/binary>> = SocketBuffer
> \`\`\`
> \`Payload\` is a **sub-binary reference**. It retains a pointer and reference count to the entire \`SocketBuffer\` (which might be 64KB!).
> If you store \`Payload\` in a long-lived state or ETS table, the **entire 64KB buffer cannot be garbage collected**!
> 
> To break the reference, you must copy it:
> \`\`\`erlang
> CopiedPayload = binary:copy(Payload)
> \`\`\`

### Your Task:
Implement \`parse_header/1\` in \`src/wire_frame.erl\` to extract the 4-byte header (\`Magic:16, Len:16\`), the \`Len\`-byte payload, and copy the payload using \`binary:copy/1\` to prevent sub-binary reference leaks.`,
        references: [
          {
            title: 'Erlang Efficiency Guide: Constructing and Matching Binaries',
            url: 'https://www.erlang.org/doc/system/eff_guide_binaryhandling.html',
            category: 'erlang_docs',
            description: 'Reference counting, sub-binaries, and binary matching optimizations.',
          },
          {
            title: 'Erlang in Anger: Chapter 7 - Memory Leaks & ProcBin Refc Binaries',
            url: 'https://www.erlanginanger.com/',
            category: 'book_rfc',
            description: 'Diagnostic guide for production binary memory retention leaks.',
          },
        ],
        files: [
          {
            path: 'src/wire_frame.erl',
            name: 'wire_frame.erl',
            behaviour: 'header',
            content: `-module(wire_frame).
-export([parse_frame/1]).

-define(MAGIC_BYTES, 16#BEAM).

%% @doc Unpack <<Magic:16, Len:16, Payload:Len/binary, Rest/binary>>.
%% Must verify Magic == ?MAGIC_BYTES.
%% Must return {ok, CopiedPayload, Rest} where CopiedPayload has NO reference
%% to the parent buffer!
parse_frame(<<?MAGIC_BYTES:16, Len:16, Payload:Len/binary, Rest/binary>>) ->
    %% TODO: Return {ok, binary:copy(Payload), Rest} to prevent sub-binary leaks
    {ok, Payload, Rest};
parse_frame(<<_BadMagic:16, _/binary>>) ->
    {error, bad_magic};
parse_frame(_) ->
    {error, incomplete_frame}.
`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/wire_frame.erl': `-module(wire_frame).
-export([parse_frame/1]).

-define(MAGIC_BYTES, 16#BEAM).

parse_frame(<<?MAGIC_BYTES:16, Len:16, Payload:Len/binary, Rest/binary>>) ->
    CopiedPayload = binary:copy(Payload),
    {ok, CopiedPayload, Rest};
parse_frame(<<_BadMagic:16, _/binary>>) ->
    {error, bad_magic};
parse_frame(_) ->
    {error, incomplete_frame}.
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles wire_frame.erl with strict binary syntax.',
          },
          {
            id: 'bit_syntax_parsing',
            title: 'Header & Frame Length Extraction',
            description: 'Validates 16-bit magic word and variable-length payload slicing.',
          },
          {
            id: 'refc_leak_audit',
            title: 'ProcBin Reference Count & Sub-Binary Leak Audit',
            description: 'Calls binary:referenced_byte_size/1 to verify the payload does not retain the 64KB parent buffer.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WORLD 2: Concurrency & "OTP From Scratch"
  // =========================================================================
  {
    id: 'world-2-raw-concurrency',
    worldNumber: 2,
    title: 'Concurrency & "OTP From Scratch"',
    subtitle: 'Process Links, Monitors & Custom gen_server Engine',
    description: 'Explore the foundations of Erlang concurrency by building message loops, selective receives, and fault watchdogs from scratch before touching OTP behaviours.',
    accentColor: '#8b5cf6', // Violet
    levels: [
      // Level 2.1
      {
        id: 'raw-201-links-monitors',
        worldId: 'world-2-raw-concurrency',
        levelNumber: '2.1',
        title: 'Process Links, Monitors & trap_exit Fault Signals',
        subtitle: 'Master bidirectional links, unidirectional monitors, and system message traps',
        difficulty: 'Intermediate',
        estimatedMinutes: 25,
        xpReward: 200,
        capabilityMode: 'beam_graph',
        visualScene: 'links_monitors_signals',
        conceptMarkdown: `## Process Links, Monitors & trap_exit Fault Signals

The foundation of Erlang fault tolerance is the principle: *"Let it crash, but detect it immediately."*

> [!abstract] Under the Hood: Links vs Monitors
> - **Links (\`link/1\`):** Bidirectional. When either process crashes, an **exit signal** is delivered to the linked partner. Unless the partner calls \`process_flag(trap_exit, true)\`, the exit signal kills the partner too!
> - **Monitors (\`monitor(process, Pid)\`):** Unidirectional. If the monitored process dies, the monitoring process receives a \`{'DOWN', Ref, process, Pid, Reason}\` message. The monitoring process never crashes.

### Trapping Exits Pattern:
\`\`\`erlang
init() ->
    process_flag(trap_exit, true),
    WorkerPid = spawn_link(fun worker_loop/0),
    loop(WorkerPid).

loop(WorkerPid) ->
    receive
        {'EXIT', WorkerPid, Reason} ->
            io:format("Worker died with ~p, restarting...~n", [Reason]),
            NewWorker = spawn_link(fun worker_loop/0),
            loop(NewWorker)
    end.
\`\`\`

### Your Task:
Implement \`src/process_watchdog.erl\` to spawn a monitored worker, link to it with \`trap_exit\` enabled, and capture termination signals.`,
        references: [
          {
            title: 'Erlang Official Guide: Concurrent Programming & Error Handling',
            url: 'https://www.erlang.org/doc/system/conc_prog.html',
            category: 'erlang_docs',
            description: 'Official introduction to processes, links, monitors, and exit signals.',
          },
          {
            title: 'Erlang ERTS Docs: erlang:monitor/2 vs erlang:link/1',
            url: 'https://www.erlang.org/doc/apps/erts/erlang.html#monitor/2',
            category: 'erlang_docs',
            description: 'BIF reference for process links and monitors.',
          },
        ],
        files: [
          {
            path: 'src/process_watchdog.erl',
            name: 'process_watchdog.erl',
            behaviour: 'gen_server',
            content: `-module(process_watchdog).
-export([start/0, supervise_worker/1]).

start() ->
    spawn(fun() ->
        process_flag(trap_exit, true),
        supervise_worker(undefined)
    end).

supervise_worker(undefined) ->
    %% TODO: Spawn link worker and loop
    receive
        {spawn_worker, Fun, From} ->
            Pid = spawn_link(Fun),
            From ! {worker_started, Pid},
            supervise_worker(Pid);
        stop ->
            ok
    end;
supervise_worker(WorkerPid) ->
    receive
        {'EXIT', WorkerPid, Reason} ->
            %% Caught exit signal!
            io:format("Caught worker exit: ~p~n", [Reason]),
            supervise_worker(undefined);
        stop ->
            exit(WorkerPid, shutdown),
            ok
    end.
`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/process_watchdog.erl': `-module(process_watchdog).
-export([start/0, supervise_worker/1]).

start() ->
    spawn(fun() ->
        process_flag(trap_exit, true),
        supervise_worker(undefined)
    end).

supervise_worker(undefined) ->
    receive
        {spawn_worker, Fun, From} ->
            Pid = spawn_link(Fun),
            From ! {worker_started, Pid},
            supervise_worker(Pid);
        stop ->
            ok
    end;
supervise_worker(WorkerPid) ->
    receive
        {'EXIT', WorkerPid, Reason} ->
            supervise_worker(undefined);
        stop ->
            exit(WorkerPid, shutdown),
            ok
    end.
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles process_watchdog.erl with trap_exit handling.',
          },
          {
            id: 'link_signal_trap',
            title: 'Link Exit Signal Trapping',
            description: 'Verifies watchdog catches {\'EXIT\', Pid, Reason} without crashing itself.',
          },
          {
            id: 'isolation_resilience',
            title: 'Watchdog Fault Isolation Audit',
            description: 'Forces exit(Pid, kill) on worker and confirms watchdog survives.',
          },
        ],
      },

      // Level 2.2
      {
        id: 'raw-202-gen-server-from-scratch',
        worldId: 'world-2-raw-concurrency',
        levelNumber: '2.2',
        title: 'Under the Hood: Building my_gen_server with make_ref() & Selective Receive',
        subtitle: 'Construct a synchronous call/reply loop using unique reference tags and timeout traps',
        difficulty: 'Advanced',
        estimatedMinutes: 30,
        xpReward: 250,
        capabilityMode: 'beam_graph',
        conceptMarkdown: `## Building \`my_gen_server\` with \`make_ref()\` & Selective Receive

Before standardizing on \`gen_server\`, it is essential to understand the exact message mechanics that make synchronous RPC safe in Erlang.

> [!abstract] Under the Hood: The \`make_ref()\` Contract
> When a client invokes \`call(Pid, Msg)\`:
> 1. Client creates a unique tag: \`Ref = make_ref()\`.
> 2. Client sends: \`Pid ! {'$call', {self(), Ref}, Msg}\`.
> 3. Client waits in selective receive:
> \`\`\`erlang
> receive
>     {Ref, Reply} -> Reply
> after Timeout ->
>     exit(timeout)
> end
> \`\`\`
> Because \`Ref\` is a 128-bit globally unique term produced by \`make_ref()\`, stale replies from previous timed-out calls will **never match**!

### Your Task:
Implement \`call/2\`, \`cast/2\`, and the main message loop in \`src/my_gen_server.erl\`.`,
        references: [
          {
            title: 'GitHub erlang/otp: stdlib/src/gen.erl (See how do_call/4 uses monitor + reference)',
            url: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/gen.erl',
            category: 'github_otp',
            description: 'Production implementation of synchronous RPC calls in Erlang stdlib.',
          },
          {
            title: 'Erlang Efficiency Guide: Receiving Messages (Reference Optimization)',
            url: 'https://www.erlang.org/doc/system/eff_guide_processes.html#receiving-messages',
            category: 'erlang_docs',
            description: 'How the BEAM optimizes selective receive matching on make_ref terms.',
          },
        ],
        files: [
          {
            path: 'src/my_gen_server.erl',
            name: 'my_gen_server.erl',
            behaviour: 'gen_server',
            content: `-module(my_gen_server).
-export([start/2, call/2, cast/2]).

start(Mod, InitArgs) ->
    spawn(fun() ->
        {ok, State} = Mod:init(InitArgs),
        loop(Mod, State)
    end).

call(Pid, Request) ->
    Ref = make_ref(),
    Pid ! {'$call', {self(), Ref}, Request},
    receive
        {Ref, Reply} ->
            Reply
    after 5000 ->
        exit(timeout)
    end.

cast(Pid, Request) ->
    Pid ! {'$cast', Request},
    ok.

loop(Mod, State) ->
    receive
        {'$call', {From, Ref}, Request} ->
            {reply, Reply, NewState} = Mod:handle_call(Request, From, State),
            From ! {Ref, Reply},
            loop(Mod, NewState);
        {'$cast', Request} ->
            {noreply, NewState} = Mod:handle_cast(Request, State),
            loop(Mod, NewState);
        _Other ->
            loop(Mod, State)
    end.
`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/my_gen_server.erl': `-module(my_gen_server).
-export([start/2, call/2, cast/2]).

start(Mod, InitArgs) ->
    spawn(fun() ->
        {ok, State} = Mod:init(InitArgs),
        loop(Mod, State)
    end).

call(Pid, Request) ->
    Ref = make_ref(),
    Pid ! {'$call', {self(), Ref}, Request},
    receive
        {Ref, Reply} ->
            Reply
    after 5000 ->
        exit(timeout)
    end.

cast(Pid, Request) ->
    Pid ! {'$cast', Request},
    ok.

loop(Mod, State) ->
    receive
        {'$call', {From, Ref}, Request} ->
            {reply, Reply, NewState} = Mod:handle_call(Request, From, State),
            From ! {Ref, Reply},
            loop(Mod, NewState);
        {'$cast', Request} ->
            {noreply, NewState} = Mod:handle_cast(Request, State),
            loop(Mod, NewState);
        _Other ->
            loop(Mod, State)
    end.
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles my_gen_server.erl.',
          },
          {
            id: 'synchronous_call_contract',
            title: 'Synchronous call/2 Contract & make_ref Matching',
            description: 'Verifies call/2 blocks until reply is delivered with matching unique reference.',
          },
          {
            id: 'asynchronous_cast_dispatch',
            title: 'Asynchronous cast/2 Non-Blocking Dispatch',
            description: 'Verifies cast/2 returns ok immediately.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WORLD 3: Production OTP, Supervision Trees & ETS Resilience
  // =========================================================================
  {
    id: 'world-3-production-otp',
    worldNumber: 3,
    title: 'Production OTP, Supervision Trees & ETS Resilience',
    subtitle: 'Industrial Supervisors, {continue, Term} & ETS Heir Transfer',
    description: 'Build enterprise-grade OTP systems with non-blocking initializations, granular restart strategies, and zero-data-loss ETS table survivability.',
    accentColor: '#38bdf8', // Cyan
    levels: [
      // Level 3.1
      {
        id: 'otp-301-gen-server-continue',
        worldId: 'world-3-production-otp',
        levelNumber: '3.1',
        title: 'Non-Blocking gen_server Init with {continue, Term} & State Introspection',
        subtitle: 'Prevent supervisor lockup during slow I/O init and implement sys:get_status/1',
        difficulty: 'Intermediate',
        estimatedMinutes: 20,
        xpReward: 200,
        capabilityMode: 'beam_graph',
        conceptMarkdown: `## Non-Blocking \`gen_server\` Init with \`{continue, Term}\`

In production, calling external databases or remote peers inside \`init/1\` is an **anti-pattern**.

> [!warning] The Supervisor Lockup Hazard
> Supervisors start children **synchronously** in order. If child 1 blocks for 10 seconds connecting to a socket, the entire supervisor is blocked and cannot start other workers or handle crash signals!
> 
> Starting in OTP 21, Erlang introduced \`{continue, ContinueArg}\`:
> \`\`\`erlang
> init([]) ->
>     {ok, #state{status = initializing}, {continue, load_cache}}.
> 
> handle_continue(load_cache, State) ->
>     Data = slow_io_fetch(),
>     {noreply, State#state{status = ready, cache = Data}}.
> \`\`\`
> \`start_link\` returns \`{ok, Pid}\` immediately, unlocking the supervisor, while \`handle_continue/2\` executes before any incoming call or cast.

### Your Task:
Implement \`init/1\` and \`handle_continue/2\` in \`src/async_init_worker.erl\` to guarantee instant supervisor child startup.`,
        references: [
          {
            title: 'Erlang stdlib Docs: gen_server Behaviour & handle_continue/2',
            url: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html',
            category: 'erlang_docs',
            description: 'Official OTP gen_server documentation explaining handle_continue semantics.',
          },
          {
            title: 'GitHub erlang/otp: stdlib/src/gen_server.erl',
            url: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/gen_server.erl',
            category: 'github_otp',
            description: 'OTP stdlib source for gen_server execution loop.',
          },
        ],
        files: [
          {
            path: 'src/async_init_worker.erl',
            name: 'async_init_worker.erl',
            behaviour: 'gen_server',
            content: `-module(async_init_worker).
-behaviour(gen_server).

-export([start_link/0, get_status/0]).
-export([init/1, handle_continue/2, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-record(state, {
    status :: initializing | ready,
    data :: list()
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

get_status() ->
    gen_server:call(?MODULE, get_status).

init([]) ->
    %% Return {ok, State, {continue, load_remote_data}} to start non-blocking
    {ok, #state{status = initializing, data = []}, {continue, load_remote_data}}.

handle_continue(load_remote_data, State) ->
    %% Simulate brief I/O resolution
    LoadedData = [item1, item2, item3],
    {noreply, State#state{status = ready, data = LoadedData}}.

handle_call(get_status, _From, State) ->
    {reply, State#state.status, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/async_init_worker.erl': `-module(async_init_worker).
-behaviour(gen_server).

-export([start_link/0, get_status/0]).
-export([init/1, handle_continue/2, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-record(state, {
    status :: initializing | ready,
    data :: list()
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

get_status() ->
    gen_server:call(?MODULE, get_status).

init([]) ->
    {ok, #state{status = initializing, data = []}, {continue, load_remote_data}}.

handle_continue(load_remote_data, State) ->
    LoadedData = [item1, item2, item3],
    {noreply, State#state{status = ready, data = LoadedData}}.

handle_call(get_status, _From, State) ->
    {reply, State#state.status, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles async_init_worker.erl with OTP 21+ continue callback.',
          },
          {
            id: 'instant_start_link',
            title: 'Non-Blocking start_link/0 (< 2ms)',
            description: 'Verifies start_link returns immediately without waiting for slow I/O.',
          },
          {
            id: 'continue_state_transition',
            title: 'handle_continue/2 State Transition',
            description: 'Ensures state transitions to ready with populated data.',
          },
        ],
      },

      // Level 3.2
      {
        id: 'otp-302-supervisor-strategies',
        worldId: 'world-3-production-otp',
        levelNumber: '3.2',
        title: 'Supervision Strategies: one_for_one vs rest_for_one & Restart Intensity',
        subtitle: 'Structure dependency trees where worker crashes restart dependent pipelines without killing unrelated pools',
        difficulty: 'Advanced',
        estimatedMinutes: 25,
        xpReward: 250,
        capabilityMode: 'beam_graph',
        visualScene: 'supervision_rest_for_one_ets_heir',
        conceptMarkdown: `## Supervision Strategies: \`one_for_one\` vs \`rest_for_one\`

Choosing the wrong supervision strategy is the #1 cause of cascading failures in distributed Erlang.

> [!abstract] Under the Hood: The 3 Classic Strategies
> - \`one_for_one\`: If child A crashes, only child A is restarted. Ideal for independent workers.
> - \`one_for_all\`: If any child crashes, all children are stopped and restarted.
> - \`rest_for_one\`: If child A crashes, only children started **after** child A are stopped and restarted. Ideal for linear pipelines (e.g. Socket -> Decoder -> Session)!

### Restart Intensity (\`MaxR\`, \`MaxT\`):
\`\`\`erlang
#{strategy => rest_for_one, intensity => 5, period => 10}
\`\`\`
If more than 5 restarts happen within 10 seconds, the supervisor concludes the failure is fatal, terminates all children, and crashes upward to its parent.

### Your Task:
Configure \`src/pipeline_sup.erl\` using \`rest_for_one\` with an intensity of \`{5, 10}\`.`,
        references: [
          {
            title: 'OTP Design Principles: Supervisor Behaviour',
            url: 'https://www.erlang.org/doc/system/sup_princ.html',
            category: 'erlang_docs',
            description: 'Definitive guide to supervisor child specifications and restart strategies.',
          },
          {
            title: 'GitHub erlang/otp: stdlib/src/supervisor.erl',
            url: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/supervisor.erl',
            category: 'github_otp',
            description: 'OTP supervisor engine source code.',
          },
        ],
        files: [
          {
            path: 'src/pipeline_sup.erl',
            name: 'pipeline_sup.erl',
            behaviour: 'supervisor',
            content: `-module(pipeline_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => tcp_acceptor,
            start => {sample_session_cache, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [sample_session_cache]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.
`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/pipeline_sup.erl': `-module(pipeline_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => session_cache,
            start => {sample_session_cache, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [sample_session_cache]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles pipeline_sup.erl with strict child specifications.',
          },
          {
            id: 'child_specification_audit',
            title: 'Supervisor Flags & Strategy Audit',
            description: 'Verifies strategy is rest_for_one with intensity #{5, 10}.',
          },
        ],
      },

      // Level 3.3
      {
        id: 'otp-04-ets-heir-resilience',
        worldId: 'world-3-production-otp',
        levelNumber: '3.3',
        title: 'Fault-Tolerant Session Cache with ETS Heir Transfer',
        subtitle: 'Protect volatile ETS memory across worker crashes using OTP heir inheritance patterns',
        difficulty: 'Production',
        estimatedMinutes: 30,
        xpReward: 300,
        capabilityMode: 'beam_graph',
        visualScene: 'supervision_rest_for_one_ets_heir',
        conceptMarkdown: `## Fault-Tolerant Session Cache with ETS Heir Transfer

In production distributed systems, killing or restarting a \`gen_server\` worker must **never** drop active user sessions or in-memory routing tables.

> [!abstract] Under the Hood: BEAM Heap & ETS Ownership
> In the BEAM runtime, an **ETS table is tied to its creating process**. When that process dies, the BEAM's internal memory manager immediately frees the table's underlying allocator pages—instantly dropping thousands of cached sessions.
> To prevent this, OTP allows designating an **heir process**:
> \`\`\`erlang
> ets:new(session_tab, [named_table, public, {heir, HeirPid, HeirData}])
> \`\`\`
> When the owner process dies, the BEAM transfers ownership to \`HeirPid\` instead of deallocating the table, delivering the message \`{'ETS-TRANSFER', TableId, FromPid, HeirData}\`.

### Your Task:
Ensure \`session_cache\` creates \`session_tab\` with \`table_manager\` as heir, traps exits, and reclaims ownership after supervisor restarts.`,
        references: [
          {
            title: 'Erlang stdlib Docs: ets:new/2 & The Heir Option',
            url: 'https://www.erlang.org/doc/apps/stdlib/ets.html#new/2',
            category: 'erlang_docs',
            description: 'Official OTP manual for ETS table creation, heir designation, and ownership transfer.',
          },
          {
            title: 'Learn You Some Erlang: Bears, ETS, Beets (Heir & Give Away)',
            url: 'https://learnyousomeerlang.com/ets',
            category: 'book_rfc',
            description: 'Comprehensive guide to preserving ETS tables through supervisor crashes.',
          },
        ],
        files: [
          {
            path: 'src/session_cache.erl',
            name: 'session_cache.erl',
            behaviour: 'gen_server',
            content: `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/2, get_session/1, reclaim_table/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-include("include/session.hrl").

-record(state, {
    tab :: ets:tid() | atom(),
    table_mgr :: pid()
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

put_session(UserId, SessionData) ->
    gen_server:call(?MODULE, {put, UserId, SessionData}).

get_session(UserId) ->
    gen_server:call(?MODULE, {get, UserId}).

reclaim_table(TableId) ->
    gen_server:call(?MODULE, {reclaim_table, TableId}).

init([]) ->
    process_flag(trap_exit, true),
    TableMgr = whereis(table_manager),
    Tab = case ets:whereis(?SESSION_TAB) of
        undefined ->
            ets:new(?SESSION_TAB, [
                named_table,
                public,
                set,
                {read_concurrency, true},
                {heir, TableMgr, {retained_by, table_manager}}
            ]);
        ExistingTab ->
            ExistingTab
    end,
    {ok, #state{tab = Tab, table_mgr = TableMgr}}.

handle_call({put, UserId, SessionData}, _From, #state{tab = Tab} = State) ->
    ets:insert(Tab, {UserId, SessionData, erlang:system_time(millisecond)}),
    {reply, ok, State};

handle_call({get, UserId}, _From, #state{tab = Tab} = State) ->
    Reply = case ets:lookup(Tab, UserId) of
        [{UserId, Data, _Time}] -> {ok, Data};
        [] -> {error, not_found}
    end,
    {reply, Reply, State};

handle_call({reclaim_table, Tab}, _From, State) ->
    {reply, ok, State#state{tab = Tab}};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', Tab, _FromPid, _Data}, State) ->
    {noreply, State#state{tab = Tab}};

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
          },
          {
            path: 'src/table_manager.erl',
            name: 'table_manager.erl',
            behaviour: 'gen_server',
            content: `-module(table_manager).
-behaviour(gen_server).

-export([start_link/0, handover/2]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-record(state, {
    held_tables = #{} :: map()
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

handover(TableId, TargetPid) ->
    gen_server:call(?MODULE, {handover, TableId, TargetPid}).

init([]) ->
    process_flag(trap_exit, true),
    {ok, #state{}}.

handle_call({handover, TableId, TargetPid}, _From, #state{held_tables = Held} = State) ->
    case maps:is_key(TableId, Held) of
        true ->
            ets:give_away(TableId, TargetPid, reclaimed),
            {reply, ok, State#state{held_tables = maps:remove(TableId, Held)}};
        false ->
            {reply, {error, table_not_held}, State}
    end;

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', TableId, FromPid, Data}, #state{held_tables = Held} = State) ->
    NewHeld = Held#{TableId => {FromPid, Data}},
    {noreply, State#state{held_tables = NewHeld}};

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
          },
          {
            path: 'include/session.hrl',
            name: 'session.hrl',
            behaviour: 'header',
            content: `-define(SESSION_TAB, sample_session_tab).\n-record(session_entry, {user_id :: binary(), metadata :: map(), updated_at :: integer()}).\n`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/session_cache.erl': `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/2, get_session/1, reclaim_table/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-include("include/session.hrl").

-record(state, {
    tab :: ets:tid() | atom(),
    table_mgr :: pid()
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

put_session(UserId, SessionData) ->
    gen_server:call(?MODULE, {put, UserId, SessionData}).

get_session(UserId) ->
    gen_server:call(?MODULE, {get, UserId}).

reclaim_table(TableId) ->
    gen_server:call(?MODULE, {reclaim_table, TableId}).

init([]) ->
    process_flag(trap_exit, true),
    TableMgr = whereis(table_manager),
    Tab = case ets:whereis(?SESSION_TAB) of
        undefined ->
            ets:new(?SESSION_TAB, [
                named_table,
                public,
                set,
                {read_concurrency, true},
                {heir, TableMgr, {retained_by, table_manager}}
            ]);
        ExistingTab ->
            ExistingTab
    end,
    {ok, #state{tab = Tab, table_mgr = TableMgr}}.

handle_call({put, UserId, SessionData}, _From, #state{tab = Tab} = State) ->
    ets:insert(Tab, {UserId, SessionData, erlang:system_time(millisecond)}),
    {reply, ok, State};

handle_call({get, UserId}, _From, #state{tab = Tab} = State) ->
    Reply = case ets:lookup(Tab, UserId) of
        [{UserId, Data, _Time}] -> {ok, Data};
        [] -> {error, not_found}
    end,
    {reply, Reply, State};

handle_call({reclaim_table, Tab}, _From, State) ->
    {reply, ok, State#state{tab = Tab}};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', Tab, _FromPid, _Data}, State) ->
    {noreply, State#state{tab = Tab}};

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles session_cache.erl and table_manager.erl.',
          },
          {
            id: 'ets_heir_designation',
            title: 'ETS Table Initialization & Heir Inheritance Spec',
            description: 'Audits ets:new options for named_table and {heir, Pid, Data}.',
          },
          {
            id: 'trap_exit_flag',
            title: 'Process Trapping Exits & Linkage Verification',
            description: 'Ensures process_flag(trap_exit, true) is armed.',
          },
          {
            id: 'chaos_worker_kill',
            title: 'Chaos Engineering: Worker Termination & ETS Survival',
            description: 'Fires exit(whereis(session_cache), kill) and verifies active user session survived across restart.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WORLD 4: Raw TCP Networking & Acceptor Pools
  // =========================================================================
  {
    id: 'world-4-tcp-networking',
    worldNumber: 4,
    title: 'Raw TCP Networking & Acceptor Pools',
    subtitle: 'Flow Control: {active, once} vs {active, true}',
    description: 'Master non-blocking asynchronous socket I/O, backpressure regulation, and acceptor pool concurrency.',
    accentColor: '#f59e0b', // Amber
    levels: [
      // Level 4.1
      {
        id: 'net-401-active-once-backpressure',
        worldId: 'world-4-tcp-networking',
        levelNumber: '4.1',
        title: 'TCP Flow Control: {active, once} vs {active, true} Mailbox Flood Prevention',
        subtitle: 'Enforce socket backpressure using {active, once} / {active, N} to prevent Erlang mailbox OOM crashes',
        difficulty: 'Advanced',
        estimatedMinutes: 25,
        xpReward: 250,
        capabilityMode: 'beam_graph',
        visualScene: 'tcp_xmpp_stream_framing',
        conceptMarkdown: `## TCP Flow Control: \`{active, once}\` vs \`{active, true}\`

In network servers handling untrusted clients, how the BEAM reads from the kernel socket buffer determines whether your node survives a DDoS attack or crashes with Out-Of-Memory (OOM).

> [!abstract] Under the Hood: Socket Active Modes
> - \`{active, true}\`: The Erlang VM automatically reads all incoming TCP packets from the OS kernel and turns them into Erlang messages: \`{tcp, Socket, Data}\`. If a client sends 50,000 packets/sec faster than your process can process them, your process **mailbox length explodes**, allocating gigabytes of RAM until the BEAM is killed by the OS!
> - \`{active, once}\`: The VM reads **exactly ONE packet**, sends \`{tcp, Socket, Data}\`, and immediately sets the socket back to passive mode! TCP flow control kicks in at the OS kernel level (TCP window shrinking, Zero Window Advertisement).
> When your process finishes processing the packet, it re-arms the socket:
> \`\`\`erlang
> inet:setopts(Socket, [{active, once}])
> \`\`\`

### Your Task:
Implement the receive loop in \`src/tcp_receiver.erl\` using \`{active, once}\`, re-arming the socket after each message to maintain constant queue length.`,
        references: [
          {
            title: 'Erlang kernel Docs: inet:setopts/2 ({active, once} & {active, N})',
            url: 'https://www.erlang.org/doc/apps/kernel/inet.html#setopts/2',
            category: 'erlang_docs',
            description: 'Official kernel networking documentation for active modes and flow control.',
          },
          {
            title: 'GitHub ninenines/ranch: TCP Acceptor Pool Architecture',
            url: 'https://github.com/ninenines/ranch',
            category: 'github_ecosystem',
            description: 'Production socket acceptor pool powering Cowboy and MongooseIM.',
          },
        ],
        files: [
          {
            path: 'src/tcp_receiver.erl',
            name: 'tcp_receiver.erl',
            behaviour: 'gen_server',
            content: `-module(tcp_receiver).
-export([start/1, loop/2]).

start(Socket) ->
    inet:setopts(Socket, [{active, once}, {mode, binary}]),
    spawn(fun() -> loop(Socket, 0) end).

loop(Socket, PacketCount) ->
    receive
        {tcp, Socket, _Data} ->
            %% TODO: Re-arm socket with inet:setopts(Socket, [{active, once}])
            inet:setopts(Socket, [{active, once}]),
            loop(Socket, PacketCount + 1);
        {tcp_closed, Socket} ->
            {ok, PacketCount};
        {tcp_error, Socket, Reason} ->
            {error, Reason}
    end.
`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/tcp_receiver.erl': `-module(tcp_receiver).
-export([start/1, loop/2]).

start(Socket) ->
    inet:setopts(Socket, [{active, once}, {mode, binary}]),
    spawn(fun() -> loop(Socket, 0) end).

loop(Socket, PacketCount) ->
    receive
        {tcp, Socket, _Data} ->
            inet:setopts(Socket, [{active, once}]),
            loop(Socket, PacketCount + 1);
        {tcp_closed, Socket} ->
            {ok, PacketCount};
        {tcp_error, Socket, Reason} ->
            {error, Reason}
    end.
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles tcp_receiver.erl with inet socket options.',
          },
          {
            id: 'active_once_socket_loop',
            title: 'Socket Re-arming Verification',
            description: 'Confirms inet:setopts(Socket, [{active, once}]) is called on every packet.',
          },
          {
            id: 'mailbox_backpressure_test',
            title: 'Burst Flood Backpressure Verification (150 Packets)',
            description: 'Verifies target process mailbox length remains <= 1 during packet flood.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WORLD 5: Production XMPP Distributed Engine
  // =========================================================================
  {
    id: 'world-5-xmpp-engine',
    worldNumber: 5,
    title: 'Production XMPP Distributed Engine',
    subtitle: 'RFC 6120 State Machine, SASL PLAIN & TCP Framing',
    description: 'Construct a carrier-grade XMPP client-to-server (C2S) engine using gen_statem, handling fragmented TCP chunks and stream authentication.',
    accentColor: '#ec4899', // Pink
    levels: [
      // Level 5.1
      {
        id: 'xmpp-03-c2s-statem-handshake',
        worldId: 'world-5-xmpp-engine',
        levelNumber: '5.1',
        title: 'XMPP C2S gen_statem Stream Negotiation, SASL & Fragmented XML Frames',
        subtitle: 'Build a RFC 6120 compliant client-to-server state machine handling fragmented TCP streams and PLAIN auth',
        difficulty: 'Production',
        estimatedMinutes: 35,
        xpReward: 350,
        capabilityMode: 'xmpp_full',
        visualScene: 'xmpp_5_module_capstone_arch',
        conceptMarkdown: `## XMPP C2S \`gen_statem\` Stream Negotiation & SASL

XMPP (Extensible Messaging and Presence Protocol) is the protocol powering WhatsApp, Cisco Webex, and enterprise chat backbones.

> [!abstract] Under the Hood: RFC 6120 Stream Negotiation
> 1. **Initial Stream:** Client connects via TCP and sends:
>    \`<stream:stream to='localhost' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>\`
> 2. **TCP Chunk Fragmentation:** TCP is a streaming protocol, NOT a packet protocol! The opening stanza may arrive in fragments:
>    - Packet 1: \`<stream:st\`
>    - Packet 2: \`ream to='localhost' ...>\`
>    The server must accumulate incoming bytes in an internal binary buffer until complete opening/closing tags are detected.
> 3. **Stream Features:** Server responds with \`<stream:features><mechanisms ...>\`.
> 4. **SASL Authentication:** Client submits Base64 PLAIN credentials \`\0user\0password\`.
> 5. **Resource Binding:** Session transitions to \`session_established\`.

### Your Task:
Implement \`xmpp_c2s.erl\` using \`gen_statem\` with state enter calls, coalescing fragmented TCP frames and completing the RFC 6120 handshake.`,
        references: [
          {
            title: 'RFC 6120: Extensible Messaging and Presence Protocol (XMPP): Core',
            url: 'https://datatracker.ietf.org/doc/html/rfc6120',
            category: 'book_rfc',
            description: 'Official IETF specification for XML stream framing, TLS, and SASL.',
          },
          {
            title: 'GitHub esl/MongooseIM: src/c2s/mongoose_c2s.erl',
            url: 'https://github.com/esl/MongooseIM/blob/master/src/c2s/mongoose_c2s.erl',
            category: 'github_ecosystem',
            description: 'Production XMPP C2S gen_statem engine in MongooseIM.',
          },
          {
            title: 'OTP Design Principles: gen_statem State Machine Behaviour',
            url: 'https://www.erlang.org/doc/system/statem.html',
            category: 'erlang_docs',
            description: 'Official OTP guide for the gen_statem behaviour and state enter calls.',
          },
        ],
        files: [
          {
            path: 'src/xmpp_c2s.erl',
            name: 'xmpp_c2s.erl',
            behaviour: 'gen_statem',
            content: `-module(xmpp_c2s).
-behaviour(gen_statem).

-export([start_link/1, handle_tcp_data/2]).
-export([init/1, callback_mode/0, terminate/3]).
-export([wait_for_stream/3, wait_for_features/3, wait_for_sasl/3, authenticated/3, session_established/3]).

-include("include/xmpp.hrl").

-record(data, {
    socket :: gen_tcp:socket() | undefined,
    buffer = <<>> :: binary(),
    jid :: binary() | undefined
}).

start_link(Socket) ->
    gen_statem:start_link(?MODULE, [Socket], []).

handle_tcp_data(Pid, BinaryChunk) ->
    gen_statem:cast(Pid, {tcp_data, BinaryChunk}).

callback_mode() ->
    [state_functions, state_enter].

init([Socket]) ->
    {ok, wait_for_stream, #data{socket = Socket}}.

wait_for_stream(enter, _OldState, _Data) ->
    keep_state_and_data;
wait_for_stream(cast, {tcp_data, Chunk}, #data{buffer = Buf} = Data) ->
    NewBuf = <<Buf/binary, Chunk/binary>>,
    case binary:match(NewBuf, <<">">>) of
        nomatch ->
            {keep_state, Data#data{buffer = NewBuf}};
        {Pos, Len} ->
            TagLen = Pos + Len,
            <<Stanza:TagLen/binary, Rest/binary>> = NewBuf,
            case binary:match(Stanza, <<"stream:stream">>) of
                nomatch ->
                    {stop, invalid_stream_header, Data};
                _ ->
                    Features = <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
                    send_xml(Data#data.socket, Features),
                    {next_state, wait_for_sasl, Data#data{buffer = Rest}}
            end
    end.

wait_for_sasl(enter, _OldState, _Data) ->
    keep_state_and_data;
wait_for_sasl(cast, {tcp_data, Chunk}, Data) ->
    case binary:match(Chunk, <<"auth">>) of
        nomatch ->
            keep_state_and_data;
        _ ->
            Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
            send_xml(Data#data.socket, Success),
            {next_state, session_established, Data#data{jid = <<"user@localhost">>}}
    end.

session_established(enter, _OldState, _Data) ->
    keep_state_and_data;
session_established(cast, {tcp_data, _Chunk}, _Data) ->
    keep_state_and_data.

terminate(_Reason, _State, _Data) ->
    ok.

send_xml(undefined, _Xml) -> ok;
send_xml(Socket, Xml) ->
    gen_tcp:send(Socket, Xml).
`,
          },
          {
            path: 'include/xmpp.hrl',
            name: 'xmpp.hrl',
            behaviour: 'header',
            content: `-define(NS_XMPP_STREAMS, <<"http://etherx.jabber.org/streams">>).\n-define(NS_JABBER_CLIENT, <<"jabber:client">>).\n`,
          },
          {
            path: 'rebar.config',
            name: 'rebar.config',
            behaviour: 'config',
            content: `{erl_opts, [debug_info, warnings_as_errors]}.\n{deps, []}.\n`,
          },
        ],
        solutionFiles: {
          'src/xmpp_c2s.erl': `-module(xmpp_c2s).
-behaviour(gen_statem).

-export([start_link/1, handle_tcp_data/2]).
-export([init/1, callback_mode/0, terminate/3]).
-export([wait_for_stream/3, wait_for_features/3, wait_for_sasl/3, authenticated/3, session_established/3]).

-include("include/xmpp.hrl").

-record(data, {
    socket :: gen_tcp:socket() | undefined,
    buffer = <<>> :: binary(),
    jid :: binary() | undefined
}).

start_link(Socket) ->
    gen_statem:start_link(?MODULE, [Socket], []).

handle_tcp_data(Pid, BinaryChunk) ->
    gen_statem:cast(Pid, {tcp_data, BinaryChunk}).

callback_mode() ->
    [state_functions, state_enter].

init([Socket]) ->
    {ok, wait_for_stream, #data{socket = Socket}}.

wait_for_stream(enter, _OldState, _Data) ->
    keep_state_and_data;
wait_for_stream(cast, {tcp_data, Chunk}, #data{buffer = Buf} = Data) ->
    NewBuf = <<Buf/binary, Chunk/binary>>,
    case binary:match(NewBuf, <<">">>) of
        nomatch ->
            {keep_state, Data#data{buffer = NewBuf}};
        {Pos, Len} ->
            TagLen = Pos + Len,
            <<Stanza:TagLen/binary, Rest/binary>> = NewBuf,
            case binary:match(Stanza, <<"stream:stream">>) of
                nomatch ->
                    {stop, invalid_stream_header, Data};
                _ ->
                    Features = <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
                    send_xml(Data#data.socket, Features),
                    {next_state, wait_for_sasl, Data#data{buffer = Rest}}
            end
    end.

wait_for_sasl(enter, _OldState, _Data) ->
    keep_state_and_data;
wait_for_sasl(cast, {tcp_data, Chunk}, Data) ->
    case binary:match(Chunk, <<"auth">>) of
        nomatch ->
            keep_state_and_data;
        _ ->
            Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
            send_xml(Data#data.socket, Success),
            {next_state, session_established, Data#data{jid = <<"user@localhost">>}}
    end.

session_established(enter, _OldState, _Data) ->
    keep_state_and_data;
session_established(cast, {tcp_data, _Chunk}, _Data) ->
    keep_state_and_data.

terminate(_Reason, _State, _Data) ->
    ok.

send_xml(undefined, _Xml) -> ok;
send_xml(Socket, Xml) ->
    gen_tcp:send(Socket, Xml).
`,
        },
        verificationStages: [
          {
            id: 'syntax_and_compilation',
            title: 'BEAM Bytecode Compilation & Export Audit',
            description: 'Compiles xmpp_c2s.erl with OTP gen_statem callbacks.',
          },
          {
            id: 'stream_init_negotiation',
            title: 'RFC 6120 Opening Stream Negotiation & Features',
            description: 'Verifies <stream:stream> initiates SASL feature advertisement.',
          },
          {
            id: 'tcp_fragmentation_coalescing',
            title: 'Fragmented TCP Frame Buffering (<stream:st + ream>)',
            description: 'Validates that partial TCP chunks are buffered and reconstructed without drops.',
          },
          {
            id: 'sasl_plain_authentication',
            title: 'SASL PLAIN Authentication Transition',
            description: 'Confirms credential verification transitions state machine to session_established.',
          },
        ],
      },
    ],
  },
];

// Helper functions for easy lookup across the platform
export const getLevelById = (id: string): CurriculumLevel | undefined => {
  for (const world of CURRICULUM_WORLDS) {
    const level = world.levels.find((l) => l.id === id);
    if (level) return level;
  }
  return undefined;
};

export const getNextLevelId = (currentId: string): string | null => {
  const allLevels: CurriculumLevel[] = [];
  for (const world of CURRICULUM_WORLDS) {
    allLevels.push(...world.levels);
  }
  const currentIndex = allLevels.findIndex((l) => l.id === currentId);
  if (currentIndex >= 0 && currentIndex < allLevels.length - 1) {
    return allLevels[currentIndex + 1].id;
  }
  return null;
};

export const getAllLevelIds = (): string[] => {
  const ids: string[] = [];
  for (const world of CURRICULUM_WORLDS) {
    for (const level of world.levels) {
      ids.push(level.id);
    }
  }
  return ids;
};

// Re-export modular chapters
export * from './chapters';

