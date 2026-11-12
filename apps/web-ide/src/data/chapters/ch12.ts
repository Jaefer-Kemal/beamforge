import { LessonContent, CapstoneMilestone, MentalModelCheckSpec } from '../../types/workspace';

// ── Capstone Milestones Definition for Chapter 12 ────────────────────────────
export const CH12_CAPSTONE_MILESTONES: CapstoneMilestone[] = [
  {
    id: 'm1-sup',
    number: 1,
    title: 'Root Supervisor Tree (xmpp_sup)',
    targetFile: 'src/xmpp_sup.erl',
    targetFunctions: ['start_link/0', 'stop/0', 'init/1'],
    description:
      'Configure the root OTP supervisor using rest_for_one restart strategy with intensity 5 and period 10, booting xmpp_session_registry before xmpp_router as permanent workers with clean stop/0 lifecycle shutdown.',
    verificationHint:
      'Call xmpp_sup:start_link(), inspect child processes with supervisor:which_children(xmpp_sup) to confirm two permanent workers, and verify xmpp_sup:stop() shuts down cleanly.',
  },
  {
    id: 'm2-parser',
    number: 2,
    title: 'Incremental XML Stream Framer (xmpp_stream_parser)',
    targetFile: 'src/xmpp_stream_parser.erl',
    targetFunctions: ['new_buffer/0', 'feed_chunk/2', 'extract_attr/2', 'extract_tag_body/2'],
    description:
      'Implement binary packet framing over fragmented TCP streams. Handle <stream:stream>, <auth>, <iq>, <ping/>, and <message> stanzas while calling binary:copy/1 to unpin heap memory and prevent sub-binary retention leaks.',
    verificationHint:
      'Feed partial chunks like <<"<stream:st">> followed by <<"ream to=\'localhost\'>">>. Verify the parser emits [{stream_open, <<"localhost">>}] with an empty leftover buffer.',
  },
  {
    id: 'm3-registry',
    number: 3,
    title: 'Concurrent ETS Session Registry & Monitors (xmpp_session_registry)',
    targetFile: 'src/xmpp_session_registry.erl',
    targetFunctions: [
      'start_link/0',
      'register_session/3',
      'unregister_session/1',
      'lookup_by_jid/1',
      'list_all_sessions/0',
      'parse_jid/1',
    ],
    description:
      'Manage concurrent user sessions inside a high-throughput public ETS table with {read_concurrency, true}. Monitor C2S pids and automatically purge sessions upon receiving process \'DOWN\' messages.',
    verificationHint:
      'Register two sessions for the same bare JID with different priorities. Verify lookup_by_jid returns the highest-priority PID, and that killing that PID causes the monitor to fall back to the surviving session.',
  },
  {
    id: 'm4-statem',
    number: 4,
    title: 'C2S Connection State Machine (xmpp_c2s_statem)',
    targetFile: 'src/xmpp_c2s_statem.erl',
    targetFunctions: ['start_link/1', 'feed_xml/2', 'get_session_info/1', 'stop/1'],
    description:
      'Build the client-to-server connection lifecycle as an OTP gen_statem using state_functions: wait_for_stream -> wait_for_sasl -> authenticated -> session_established, with active-once TCP flow control.',
    verificationHint:
      'Step through stream opening, SASL PLAIN authentication, and IQ resource binding. Confirm transition to session_established and registration in xmpp_session_registry.',
  },
  {
    id: 'm5-router',
    number: 5,
    title: 'Stanza Router & Offline Store (xmpp_router)',
    targetFile: 'src/xmpp_router.erl',
    targetFunctions: ['start_link/0', 'route_stanza/3', 'pop_offline_messages/1', 'get_offline_count/1'],
    description:
      'Dispatch messages to online C2S processes via lookup_by_jid/1. If the recipient is offline, spool the stanza into the in-memory offline message store for retrieval on next login.',
    verificationHint:
      'Route a message between two active C2S pids, then route to an unregistered user. Verify the offline message is queued and retrievable via pop_offline_messages/1.',
  },
  {
    id: 'm6-chaos',
    number: 6,
    title: 'Chaos Monkey Resilience & 5-Module Integration (xmpp_sup)',
    targetFile: 'src/xmpp_sup.erl',
    targetFunctions: ['start_link/0', 'stop/0', 'init/1'],
    description:
      'Subject the integrated 5-module XMPP cluster to live Chaos Monkey fault injection: verify that killing xmpp_router (#2) restarts only the router while keeping xmpp_session_registry (#1) and active ETS sessions intact for zero-loss delivery, and killing xmpp_session_registry (#1) cascades under rest_for_one.',
    verificationHint:
      'Boot xmpp_sup, verify full 5-module routing, and inject exit(whereis(xmpp_router), kill) to confirm registry preservation and zero-loss message recovery (plus rest_for_one cascade when killing xmpp_session_registry).',
  },
];

// ── Milestone Pedagogical Lessons (Rich Textbooks for Every Milestone) ──────
export interface MilestoneLesson {
  id?: string;
  milestoneId: string;
  milestoneNumber: number;
  title: string;
  targetFile: string;
  conceptMarkdown: string;
  targetFunctions: string[];
  verificationHint: string;
  mentalModelCheck?: MentalModelCheckSpec;
}

export const CH12_MILESTONE_LESSONS: MilestoneLesson[] = [
  {
    id: 'ch12-m1',
    milestoneId: 'm1-sup',
    milestoneNumber: 1,
    title: 'Milestone 1: The Root OTP Supervisor Hierarchy (xmpp_sup)',
    targetFile: 'src/xmpp_sup.erl',
    targetFunctions: ['start_link/0', 'stop/0', 'init/1'],
    verificationHint: 'Call xmpp_sup:start_link(), inspect child processes with supervisor:which_children(xmpp_sup), and verify xmpp_sup:stop() returns ok with xmpp_sup unregistered.',
    mentalModelCheck: {
      question: 'In xmpp_sup, why is xmpp_session_registry ordered before xmpp_router under rest_for_one?',
      codeSnippet: `#{strategy => rest_for_one, intensity => 5, period => 10}
[RegistryChildSpec, RouterChildSpec]`,
      options: [
        {
          id: 'A',
          label: 'The router depends on the ETS table owned by the registry; crashing the registry restarts the router, but a router crash leaves the registry and client sessions intact.',
          isCorrect: true,
          explanation: 'Correct! Under rest_for_one, child processes booted AFTER the crashed child are killed and restarted. Because router queries registry\'s ETS table, restarting registry cleanly restarts router without dropping all client sessions when only the router fails.',
        },
        {
          id: 'B',
          label: 'rest_for_one requires supervisor children to be declared in alphabetical order by registered name.',
          isCorrect: false,
          explanation: 'Child spec ordering in rest_for_one dictates startup sequence and crash termination cascades, not alphabetical sorting.',
        },
        {
          id: 'C',
          label: 'If xmpp_router crashes, the registry must always restart to clear all active sessions.',
          isCorrect: false,
          explanation: 'Router crashes should NOT kill the session registry; disconnecting online users due to a routing error would violate fault isolation.',
        },
      ],
    },
    conceptMarkdown: `## Milestone 1: The Root OTP Supervisor Hierarchy

### Why This Matters in Production
In production telecom switches, distributed brokers, and real-time chat backends (WhatsApp, ejabberd, MongooseIM), faults are inevitable: sockets drop mid-frame, out-of-spec client payloads raise exceptions, and memory pressure hits individual workers.

Rather than burying every line inside defensive \`try/catch\` blocks, Erlang/OTP embraces **"Let It Crash"**: workers fail cleanly inside isolated processes while a **Supervision Tree** deterministically restores a known-good topology around them.

> [!IMPORTANT]
> **Architectural Dependency:** \`xmpp_router\` queries the in-memory ETS session table owned by \`xmpp_session_registry\`. Because child startup order defines dependency direction in OTP, \`xmpp_sup\` must guarantee the registry always starts first and any registry restart resets the downstream router.

---

### Deep Concept Breakdown & Under the Hood

| Strategy | Crash on Child #1 (\`registry\`) | Crash on Child #2 (\`router\`) | Verdict for XMPP Core |
| :--- | :--- | :--- | :--- |
| \`one_for_one\` | Restarts #1 only; #2 holds stale table state | Restarts #2 only | Unsafe on #1 reset |
| \`one_for_all\` | Restarts #1 and #2 | Kills healthy #1 unnecessarily | Disruptive on #2 crash |
| \`rest_for_one\` | Terminates #2 first, restarts #1 then #2 | Restarts #2 only (#1 stays alive) | Ideal dependency isolation |

Under the hood, the OTP \`supervisor\` terminates downstream siblings in **reverse start order** before starting recovered children in **forward start order**, using \`shutdown\` timeouts so each \`terminate/2\` runs cleanly before forced termination. If restarts exceed \`intensity\` within \`period\` seconds, the supervisor gives up and propagates failure upward rather than spinning in an infinite crash loop.

---

### Official OTP Supervisor API Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / supervisor)
supervisor:start_link(SupName, Module, Args) -> StartLinkRet
  Types: SupName = {local, Name :: atom()} | {global, term()} | {via, module(), term()}
         Module = module(), Args = term()
         StartLinkRet = {ok, pid()} | ignore | {error, term()}

supervisor:stop(SupRef) -> ok
  Types: SupRef = pid() | atom() | {global, term()} | {via, module(), term()} | {atom(), node()}
\`\`\`

Attach to local process registration with \`whereis/1\` when implementing \`stop/0\` so calling \`stop/0\` on an already-stopped supervisor returns \`ok\` instead of raising \`noproc\` *(see starter export stubs and the attached OTP \`supervisor\` card below)*.

---

## Assignment Specification

Implement \`src/xmpp_sup.erl\` with \`-behaviour(supervisor)\`, exporting \`start_link/0\`, \`stop/0\`, and \`init/1\`:

### 1. \`start_link()\`
- **Input**: None.
- **Behavior**: Starts the OTP supervisor locally registered as \`?MODULE\` with initialization arguments \`[]\`.
- **Examples**:
  - \`xmpp_sup:start_link()\` boots both children and returns \`{ok, SupPid}\` where \`is_pid(SupPid)\` is \`true\`.

### 2. \`stop()\`
- **Input**: None.
- **Behavior**: Looks up the locally registered \`?MODULE\` process; if unregistered (\`undefined\`), returns \`ok\` idempotently; if alive, stops the supervisor cleanly and returns \`ok\` so \`whereis(xmpp_sup)\` becomes \`undefined\`.
- **Examples**:
  - \`xmpp_sup:stop()\` returns \`ok\` both when running and when already stopped.

### 3. \`init([])\`
- **Input**: Empty list \`[]\`.
- **Behavior**: Returns \`{ok, {SupFlags, ChildSpecs}}\` configuring:
  - \`SupFlags\`: \`rest_for_one\` strategy, max restart intensity \`5\`, sliding period \`10\` seconds.
  - \`ChildSpecs\`: Two \`permanent\` \`worker\` child maps in strict startup order with \`shutdown => 2000\`:
    1. \`id => xmpp_session_registry\`, start MFA calling \`xmpp_session_registry:start_link/0\`, modules \`[xmpp_session_registry]\`.
    2. \`id => xmpp_router\`, start MFA calling \`xmpp_router:start_link/0\`, modules \`[xmpp_router]\`.
- **Examples**:
  - \`xmpp_sup:init([])\` yields child IDs \`[xmpp_session_registry, xmpp_router]\` in exact order under \`rest_for_one\`.

---

## Rules & Verification Constraints
- Compile cleanly with \`erlc -Wall\` (zero warnings under \`-behaviour(supervisor)\`).
- \`start_link/0\`, \`stop/0\`, and \`init/1\` must all be exported.
- Child specification order MUST place \`xmpp_session_registry\` first and \`xmpp_router\` second as \`permanent\` workers (\`shutdown => 2000\`).
- Live boot verification executes \`xmpp_sup:start_link()\`, \`supervisor:which_children(SupPid)\`, and \`xmpp_sup:stop()\`.`,
  },
  {
    id: 'ch12-m2',
    milestoneId: 'm2-parser',
    milestoneNumber: 2,
    title: 'Milestone 2: Incremental XML Stream Framer (xmpp_stream_parser)',
    targetFile: 'src/xmpp_stream_parser.erl',
    targetFunctions: ['new_buffer/0', 'feed_chunk/2', 'extract_attr/2', 'extract_tag_body/2'],
    verificationHint: 'Feed partial chunks like <<"<stream:st">> followed by <<"ream to=\'localhost\'>">>. Verify the parser emits [{stream_open, <<"localhost">>}] with an empty leftover buffer.',
    mentalModelCheck: {
      question: 'Why MUST xmpp_stream_parser call binary:copy/1 when extracting stanza attributes from TCP chunks?',
      codeSnippet: `<<Header:10/binary, User:4/binary, Rest/binary>> = PacketBin,
%% Storing User into persistent session state`,
      options: [
        {
          id: 'A',
          label: 'Without binary:copy/1, the 4-byte slice pins the entire 64KB off-heap ProcBin in memory, preventing GC from freeing it.',
          isCorrect: true,
          explanation: 'Correct! BEAM reference-counted binaries (>64 bytes) cannot be freed until all sub-binary slices are GC-collected. Calling binary:copy/1 forces a local heap copy, unpinning the 64KB TCP buffer.',
        },
        {
          id: 'B',
          label: 'Binary slices cannot be matched with Erlang pattern matching without copying.',
          isCorrect: false,
          explanation: 'Binary pattern matching works natively on slices without copying.',
        },
        {
          id: 'C',
          label: 'binary:copy/1 encrypts the binary before storing it in the ETS table.',
          isCorrect: false,
          explanation: 'binary:copy/1 merely copies the binary bytes into fresh unreferenced memory.',
        },
      ],
    },
    conceptMarkdown: `## Milestone 2: Binary TCP Stream Framing & Memory Unpinning

### Why This Matters in Production
TCP is a streaming byte protocol rather than a message-oriented transport: cellular or Wi-Fi segments split and coalesce application payloads arbitrarily. A single \`<message>\` element can span two OS reads, or two complete stanzas can arrive glued together inside one TCP packet. Parsing chunks without an accumulator crashes on partial frames, whereas keeping raw binary slices forever leaks off-heap socket buffers.

> [!IMPORTANT]
> **Sub-Binary Retention Invariant:** Binaries larger than 64 bytes live on the shared off-heap allocator (\`ProcBin\`). Slicing a short field such as an attribute value with \`<<Slice:Len/binary, _/binary>>\` creates an $O(1)$ \`sub_binary\` reference that keeps the entire parent \`ProcBin\` pinned until GC reclaims every slice. Passing extracted fields and leftover buffers through \`binary:copy/1\` detaches long-lived events from the incoming chunk immediately.

---

### Deep Concept Breakdown & Under the Hood

1. **Concatenate and Scan Incrementally**: Append incoming bytes onto the caller's trailing buffer (\`<<BufferBin/binary, IncomingBin/binary>>\`), skip leading XML whitespace (space \`32\`, tab \`9\`, LF \`10\`, CR \`13\`), and decode as many complete frames in order as fit in the combined buffer.
2. **Accumulate Leftover Incomplete Bytes**: Whenever a tag header lacks its closing delimiter (\`>\`, \`/>\`, or closing element tag), stop scanning, reverse the decoded events accumulator, and return a detached copy of the unparsed tail so the next \`feed_chunk/2\` call resumes seamlessly.

---

### Official OTP Binary Framing API Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / binary)
binary:match(Subject, Pattern) -> {Pos, Length} | nomatch
  Types: Subject = binary(), Pattern = binary() | [binary()], Pos = non_neg_integer(), Length = non_neg_integer()

binary:copy(Subject) -> binary()
  Types: Subject = binary()
\`\`\`

\`binary:match/2\` performs fast C-implemented byte search without list conversion; combine its \`{Pos, Length}\` match offset with binary bit-syntax slicing, then unpin retained attributes, bodies, and leftover fragments with \`binary:copy/1\`.

---

### Chunked Reference Architecture (Domain-Neutral Byte Framer)

The small \`kv_line_framer\` example below shows how a stateless accumulator appends buffers, slices complete semicolon-delimited records with \`binary:match/2\`, unpins retained values with \`binary:copy/1\`, and returns any trailing incomplete fragment (for a separate key-value wire format unrelated to XMPP):

\`\`\`erlang
-module(kv_line_framer).
-export([push/2]).

push(Buf, Chunk) ->
    scan(<<Buf/binary, Chunk/binary>>, []).

scan(<<>>, Acc) ->
    {lists:reverse(Acc), <<>>};
scan(Bin, Acc) ->
    case binary:match(Bin, <<";">>) of
        {Pos, 1} ->
            <<Frame:Pos/binary, ";", Rest/binary>> = Bin,
            scan(Rest, [{record, binary:copy(Frame)} | Acc]);
        nomatch ->
            {lists:reverse(Acc), binary:copy(Bin)}
    end.
\`\`\`

---

## Assignment Specification

Complete \`src/xmpp_stream_parser.erl\` exporting \`new_buffer/0\`, \`feed_chunk/2\`, \`extract_attr/2\`, and \`extract_tag_body/2\` (clean EDoc XML slice helpers \`extract_attr/2\` and \`extract_tag_body/2\` are pre-provided in the starter file—their slices still reference parent binaries, so callers must unpin extracted fields):

### 1. \`new_buffer()\`
- **Input**: None.
- **Behavior**: Returns an empty binary \`<<>>\` representing an initial stream buffer.

### 2. \`extract_attr(Bin, AttrName)\` & \`extract_tag_body(Bin, TagName)\`
- **Input**: XML frame binary and attribute/tag name binary.
- **Behavior**:
  - \`extract_attr/2\` returns the attribute value quoted with \`"\` or \`'\`, or \`<<>>\` if absent.
  - \`extract_tag_body/2\` returns the inner bytes between \`<TagName ...>\` and \`</TagName>\`, or \`<<>>\` if absent.

### 3. \`feed_chunk(BufferBin, IncomingBin)\`
- **Input**: Existing leftover buffer binary and newly arrived TCP chunk binary.
- **Behavior**: Concatenates both binaries, strips leading whitespace before each frame, parses all complete XMPP elements in order into event terms, unpins extracted strings and incomplete remainders via \`binary:copy/1\`, and returns \`{EventsList, NewBufferBin}\`. Recognize all 6 protocol frames:
  - \`<stream:stream ...>\` -> \`{stream_open, Domain}\` (default \`to\` fallback \`<<"localhost">>\`)
  - \`</stream:stream>\` -> \`stream_close\`
  - \`<ping .../>\` -> \`{ping, Id}\` (default \`id\` fallback \`<<"ping_1">>\`)
  - \`<auth ...>Payload</auth>\` -> \`{sasl_auth, Mechanism, Payload}\` (default \`mechanism\` fallback \`<<"PLAIN">>\`)
  - \`<iq ...>...<resource>Res</resource>...</iq>\` -> \`{iq_bind, Id, Resource}\` (default \`id\` fallback \`<<"bind_1">>\`)
  - \`<message ...>...<body>Body</body>...</message>\` -> \`{chat_message, Id, To, Body}\` (default \`id\` fallback \`<<"msg_1">>\`, default \`to\` fallback \`<<>>\`)
- **Examples**:
  - \`feed_chunk(<<"<stream:str">>, <<"eam to='localhost'><ping id='p1'/>">>)\` -> \`{[{stream_open, <<"localhost">>}, {ping, <<"p1">>}], <<>>}\`
  - \`feed_chunk(<<>>, <<"<auth mechanism='PLAIN'>token">>) \` -> \`{[], <<"<auth mechanism='PLAIN'>token">>}\`

---

## Rules & Verification Constraints
- Compile cleanly with \`erlc -Wall\` (zero warnings).
- Export \`new_buffer/0\`, \`feed_chunk/2\`, \`extract_attr/2\`, and \`extract_tag_body/2\`.
- Must invoke \`binary:copy/1\` and \`binary:match/2\`; live heap safety verification asserts \`binary:referenced_byte_size(Id) < 500\` on a 4 KB source frame.
- Must handle arbitrary TCP splits across all 6 stanza types (\`stream_open\`, \`stream_close\`, \`ping\`, \`sasl_auth\`, \`iq_bind\`, \`chat_message\`).`,
  },
  {
    id: 'ch12-m3',
    milestoneId: 'm3-registry',
    milestoneNumber: 3,
    title: 'Milestone 3: Concurrent ETS Session Registry & Process Monitors (xmpp_session_registry)',
    targetFile: 'src/xmpp_session_registry.erl',
    targetFunctions: ['start_link/0', 'register_session/3', 'unregister_session/1', 'lookup_by_jid/1', 'list_all_sessions/0', 'parse_jid/1'],
    verificationHint: 'Register two sessions for the same bare JID with different priorities. Verify lookup_by_jid returns the highest-priority PID, and that killing that PID causes the monitor to fall back to the surviving session.',
    mentalModelCheck: {
      question: 'Why does xmpp_session_registry use erlang:monitor/2 instead of link/1 when tracking client C2S processes?',
      codeSnippet: `MonitorRef = erlang:monitor(process, ClientPid)
%% Unidirectional failure notification vs link(ClientPid)`,
      options: [
        {
          id: 'A',
          label: 'Monitors are unidirectional: if a client connection drops, the registry receives a {\'DOWN\', ...} message without being killed by exit signals.',
          isCorrect: true,
          explanation: 'Correct! Process links are bidirectional and propagate exit signals. A client crash would crash the registry unless trapped. Monitors deliver a non-fatal message directly to handle_info/2.',
        },
        {
          id: 'B',
          label: 'Erlang only allows up to 1024 links per node, whereas monitors are unlimited.',
          isCorrect: false,
          explanation: 'BEAM supports millions of both links and monitors; the distinction is bidirectional exit propagation vs unidirectional messaging.',
        },
        {
          id: 'C',
          label: 'Monitors automatically restart crashed processes without a supervisor.',
          isCorrect: false,
          explanation: 'Monitors only notify the observer; supervisors are responsible for process restarts.',
        },
      ],
    },
    conceptMarkdown: `## Milestone 3: High-Concurrency ETS Tables & Process Monitors

### Why This Matters in Production
In an enterprise messaging backend with hundreds of thousands of online sockets, routing every incoming stanza synchronously through a single registry \`gen_server\` mailbox serializes the entire cluster behind one queue.

BeamForge avoids that bottleneck with a **hybrid Actor + Public ETS architecture**:
- **Writes & Monitor Lifecycle**: Serialized safely inside \`xmpp_session_registry\` (\`gen_server\`), which binds process monitors and updates rows.
- **Reads (Hot Path Lookups)**: Executed directly by callers against a named \`public\` ETS table configured with \`{read_concurrency, true}\`, bypassing the registry mailbox completely.

> [!IMPORTANT]
> **Links vs Monitors:** \`link/1\` is bidirectional—if a buggy client C2S process crashes, it sends a lethal exit signal back into the registry unless trapped. \`erlang:monitor(process, C2sPid)\` is **unidirectional**: the registry stays insulated and receives an ordinary \`{'DOWN', MonitorRef, process, DeadPid, Reason}\` message in \`handle_info/2\` to purge the dead session from ETS.

---

### Deep Concept Breakdown & Under the Hood

1. **Named Public ETS Table with \`{read_concurrency, true}\`**: \`public\` allows \`register_session/3\` writes from the owning \`gen_server\` while permitting any router worker calling \`lookup_by_jid/1\` to read lock-optimistically without mailbox hops.
2. **Idempotent Table Guard**: Always inspect \`ets:whereis(xmpp_sessions_tab)\` before creating the table so concurrent reads or restarts never crash on duplicate table creation.
3. **Demonitor Flush on Graceful Unregister**: When a client disconnects cleanly via \`unregister_session/1\`, calling \`erlang:demonitor(MRef, [flush])\` cancels the monitor and discards any already-enqueued \`'DOWN'\` message in one atomic step.

---

### Official OTP ETS & Monitor API Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / ets & erts / erlang)
ets:new(Name, Options) -> tid() | atom()
  Types: Name = atom(), Options = [Option]

erlang:monitor(Type, Item) -> MonitorRef
  Types: Type = process, Item = pid() | RegName, MonitorRef = reference()

erlang:demonitor(MonitorRef, OptionList) -> boolean()
  Types: MonitorRef = reference(), OptionList = [flush | info]
\`\`\`

Compare how ETS key lookups and unidirectional monitors pair *(see attached \`ets:lookup/2\` and \`erlang:monitor/2\` reference cards below)*.

---

### Chunked Reference Architecture (Domain-Neutral ETS + Monitor Pattern)

The compact \`lease_tracker\` module below demonstrates ETS table initialization, unidirectional worker monitoring, \`'DOWN'\` cleanup, and \`demonitor(MRef, [flush])\` teardown (for a generic compute-lease registry unrelated to XMPP JIDs or priority sorting):

\`\`\`erlang
-module(lease_tracker).
-behaviour(gen_server).
-export([start_link/0, claim/2, release/1, init/1, handle_call/3, handle_cast/2, handle_info/2]).
-define(LEASE_TAB, lease_tracker_tab).

start_link() -> gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).
claim(TaskId, WorkerPid) -> gen_server:call(?MODULE, {claim, TaskId, WorkerPid}).
release(TaskId) -> gen_server:call(?MODULE, {release, TaskId}).

init([]) ->
    case ets:whereis(?LEASE_TAB) of
        undefined -> ets:new(?LEASE_TAB, [set, named_table, public, {read_concurrency, true}]);
        _ -> ?LEASE_TAB
    end,
    {ok, #{refs => #{}}}.

handle_call({claim, TaskId, Pid}, _From, State = #{refs := Refs}) ->
    MRef = erlang:monitor(process, Pid),
    ets:insert(?LEASE_TAB, {TaskId, Pid, MRef}),
    {reply, ok, State#{refs => Refs#{MRef => TaskId}}};
handle_call({release, TaskId}, _From, State) ->
    case ets:lookup(?LEASE_TAB, TaskId) of
        [{TaskId, _Pid, MRef}] ->
            erlang:demonitor(MRef, [flush]),
            ets:delete(?LEASE_TAB, TaskId);
        [] -> ok
    end,
    {reply, ok, State}.

handle_cast(_Msg, State) -> {noreply, State}.
handle_info({'DOWN', MRef, process, _Pid, _Reason}, State = #{refs := Refs}) ->
    case maps:take(MRef, Refs) of
        {TaskId, RestRefs} ->
            ets:delete(?LEASE_TAB, TaskId),
            {noreply, State#{refs => RestRefs}};
        error -> {noreply, State}
    end.
\`\`\`

---

## Assignment Specification

Implement \`src/xmpp_session_registry.erl\` (\`-behaviour(gen_server)\`) maintaining the public ETS table \`xmpp_sessions_tab\` with 6-tuple entries \`{FullJidBin, BareJidBin, ResourceBin, PriorityInt, C2sPid, MRef}\`:

### 1. \`start_link()\` & \`stop()\`
- **Input**: None.
- **Behavior**: Boots and locally registers \`?MODULE\`, ensuring \`xmpp_sessions_tab\` exists with \`[set, named_table, public, {read_concurrency, true}]\`. \`stop/0\` halts the server cleanly if running or returns \`ok\`.

### 2. \`parse_jid(JidBin)\`
- **Input**: JID binary (Full \`<<"user@host/res">>\` or Bare \`<<"user@host">>\`).
- **Behavior**: Splits on \`<<"/">>\`, returning \`{BareJidBin, ResourceBin}\` (or \`{BareJidBin, <<>>}\` when no resource slash is present).
- **Examples**:
  - \`parse_jid(<<"alice@localhost/mobile">>)\` -> \`{<<"alice@localhost">>, <<"mobile">>}\`

### 3. \`register_session(FullJid, Priority, C2sPid)\` & \`unregister_session(FullJid)\`
- **Input**: \`FullJid :: binary()\`, \`Priority :: integer()\`, \`C2sPid :: pid()\`.
- **Behavior**:
  - \`register_session/3\`: Parses JID, attaches \`erlang:monitor(process, C2sPid)\`, inserts the 6-tuple row into \`xmpp_sessions_tab\`, records \`MRef => FullJid\` in state, and returns \`ok\`.
  - \`unregister_session/1\`: Looks up \`FullJid\`, calls \`erlang:demonitor(MRef, [flush])\`, deletes the ETS row, and returns \`ok\`.
  - When a monitored \`C2sPid\` crashes, \`handle_info/2\` handles \`{'DOWN', MRef, process, DeadPid, _Reason}\`, deletes the ETS row, and removes \`MRef\` from state.

### 4. \`lookup_by_jid(TargetJid)\` & \`list_all_sessions()\`
- **Input**: Full or Bare JID binary for \`lookup_by_jid/1\`; none for \`list_all_sessions/0\`.
- **Behavior**:
  - If \`TargetJid\` is a **Full JID** (contains \`"/"\`): returns \`[Pid]\` via direct \`ets:lookup/2\`, or \`[]\` if absent.
  - If \`TargetJid\` is a **Bare JID**: scans \`xmpp_sessions_tab\` for matching \`BareJid\`, sorts descending by \`Priority\`, and returns \`[HighestPriorityPid]\` (or \`[]\` if offline).
  - \`list_all_sessions/0\` returns all ETS rows via \`ets:tab2list/1\`.

---

## Rules & Verification Constraints
- Compile cleanly with \`erlc -Wall\` (zero warnings under \`-behaviour(gen_server)\`).
- Must invoke \`ets:new/2\`, \`erlang:monitor/2\`, and \`erlang:demonitor/2\`.
- \`xmpp_sessions_tab\` MUST have \`protection =:= public\` and \`read_concurrency =:= true\`.
- Killing a monitored client PID must automatically purge its row so subsequent \`lookup_by_jid/1\` returns \`[]\` (or falls back to a surviving session).`,
  },
  {
    id: 'ch12-m4',
    milestoneId: 'm4-statem',
    milestoneNumber: 4,
    title: 'Milestone 4: C2S Connection State Machine (xmpp_c2s_statem)',
    targetFile: 'src/xmpp_c2s_statem.erl',
    targetFunctions: ['start_link/1', 'feed_xml/2', 'get_session_info/1', 'stop/1'],
    verificationHint: 'Step through stream opening, SASL PLAIN authentication, and IQ resource binding. Confirm transition to session_established and registration in xmpp_session_registry.',
    mentalModelCheck: {
      question: 'In gen_statem with callback_mode state_functions, how is protocol phase isolation guaranteed?',
      codeSnippet: `wait_for_sasl({call, From}, {feed_xml, Xml}, Data) -> ...\nsession_established({call, From}, {feed_xml, Xml}, Data) -> ...`,
      options: [
        {
          id: 'A',
          label: 'Each state is a separate Erlang function clause; messages not handled in the current state function cannot accidentally trigger handlers from another state.',
          isCorrect: true,
          explanation: 'Correct! In state_functions mode, each state is isolated to its own function clauses, eliminating the risk of cross-state logic leaks.',
        },
        {
          id: 'B',
          label: 'gen_statem creates a separate BEAM OS thread for every state function.',
          isCorrect: false,
          explanation: 'A gen_statem is a single Erlang process running sequentially on the BEAM scheduler.',
        },
        {
          id: 'C',
          label: 'All state transitions must write to ETS before proceeding.',
          isCorrect: false,
          explanation: 'State transitions occur purely in memory within the process state.',
        },
      ],
    },
    conceptMarkdown: `## Milestone 4: Client-to-Server State Machine (\`gen_statem\`)

### Why This Matters in Production
Client TCP connections on port 5222 are strictly phase-gated: an unauthenticated socket must never route chat stanzas or bind resources before negotiating the XML stream and completing SASL authentication. Treating every incoming packet in one flat \`gen_server\` handler risks privilege bypass bugs whenever a clause forgets a phase check.

> [!IMPORTANT]
> **\`state_functions\` Isolation:** Modeling the connection with OTP \`gen_statem\` in \`callback_mode() -> state_functions\` isolates each lifecycle phase (\`wait_for_stream\`, \`wait_for_sasl\`, \`authenticated\`, \`session_established\`) into its own callback function, while pipelined XML events returned by \`xmpp_stream_parser:feed_chunk/2\` advance sequentially via \`process_events/4\`.

---

### Deep Concept Breakdown & Under the Hood

1. **Coalesced Pipelining Across States**: A single TCP read can carry multiple complete stanzas (e.g., \`<auth>...</auth><ping/>\` in one packet). Folding through the event list while carrying \`NextState\` ensures transitions apply deterministically mid-chunk.
2. **Active-Once Backpressure**: On socket creation and each \`{tcp, Socket, Chunk}\` message, arm \`inet:setopts(Socket, [{active, once}])\` so kernel packets cannot flood the actor mailbox faster than the FSM processes them.
3. **Clean Session Teardown**: When a client disconnects or the FSM terminates in \`terminate/3\`, invoke \`xmpp_session_registry:unregister_session/1\` if a \`full_jid\` was bound.

---

### Official OTP \`gen_statem\` & Socket API Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / gen_statem & kernel / inet)
gen_statem:start_link(Module, Args, Opts) -> StartRet
  Types: Module = module(), Args = term(), Opts = [term()], StartRet = {ok, pid()} | {error, term()}

inet:setopts(Socket, Options) -> ok | {error, posix()}
  Types: Socket = port(), Options = [{active, once | true | false} | term()]
\`\`\`

Attach \`xmpp_c2s_statem\` lifecycle details via the attached \`gen_statem:start_link/3\` reference card *(below)*.

---

### Chunked Reference Architecture (Domain-Neutral \`gen_statem\` Pattern)

The compact \`proto_gate_statem\` example demonstrates \`callback_mode() -> state_functions\`, synchronous \`{call, From}\` dispatch, and asynchronous \`info\` mailbox accumulation (for a tiny two-step command gate unrelated to XMPP):

\`\`\`erlang
-module(proto_gate_statem).
-behaviour(gen_statem).
-export([start_link/0, send_cmd/2, stop/1, callback_mode/0, init/1, locked/3, unlocked/3]).

start_link() -> gen_statem:start_link(?MODULE, [], []).
send_cmd(Pid, Cmd) -> gen_statem:call(Pid, {cmd, Cmd}).
stop(Pid) -> gen_statem:stop(Pid).
callback_mode() -> state_functions.

init([]) -> {ok, locked, #{inbox => []}}.

locked({call, From}, {cmd, <<"OPEN">>}, Data) ->
    {next_state, unlocked, Data, [{reply, From, {ok, unlocked}}]};
locked({call, From}, {cmd, _Other}, _Data) ->
    {keep_state_and_data, [{reply, From, {error, locked}}]}.

unlocked({call, From}, {cmd, <<"CLOSE">>}, Data) ->
    {next_state, locked, Data, [{reply, From, {ok, locked}}]};
unlocked(info, {push, Payload}, Data = #{inbox := Inbox}) ->
    {keep_state, Data#{inbox => Inbox ++ [Payload]}};
unlocked({call, From}, _Other, Data) ->
    {keep_state_and_data, [{reply, From, {ok, unlocked, Data}}]}.
\`\`\`

---

## Assignment Specification

Implement \`src/xmpp_c2s_statem.erl\` (\`-behaviour(gen_statem)\`, \`callback_mode() -> state_functions\`) coordinating \`xmpp_stream_parser:feed_chunk/2\`, \`xmpp_session_registry:register_session/3\`, and \`xmpp_router:route_stanza/3\`:

### 1. Client API & Lifecycle (\`start_link/1\`, \`feed_xml/2\`, \`get_session_info/1\`, \`stop/1\`)
- **Input**: \`Opts :: map()\` (optional keys \`socket\`, \`domain\` defaulting to \`<<"localhost">>\`, \`username\` defaulting to \`<<"alice">>\`); raw XML chunk binaries for \`feed_xml/2\`.
- **Behavior**: Starts in \`wait_for_stream\` tracking \`#{socket, buffer, domain, username, resource, full_jid, priority => 10, delivered_inbox => []}\` and arms \`[{active, once}]\` when a socket is provided.
  - \`feed_xml(Pid, XmlChunkBin)\` feeds the chunk synchronously and returns \`{ok, NextState, OutXmlList}\`.
  - \`get_session_info(Pid)\` returns \`{ok, CurrentState, Data}\`.
  - In \`session_established\`, receiving \`info\` message \`{deliver_stanza, XmlBin}\` forwards to any socket and appends \`XmlBin\` to \`delivered_inbox\`.
  - \`terminate/3\` unregisters any non-empty \`full_jid\` from \`xmpp_session_registry\`.

### 2. Protocol Phase Transitions & Wire Replies (\`process_events/4\`)
- **\`wait_for_stream\` + \`{stream_open, Domain}\`**: Updates \`domain => Domain\`, transitions to \`wait_for_sasl\`, and emits \`<stream:stream from='<Domain>' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>\`.
- **\`wait_for_sasl\` + \`{sasl_auth, _Mech, Payload}\`**: Extracts username from \`<<0, Authcid, 0, Pass>>\` (or non-empty single token, falling back to existing \`username\`), advances to \`authenticated\`, and emits \`<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>\`.
- **Pre-Auth Guard (\`wait_for_sasl\` + any non-ping/non-close stanza)**: Remains in \`wait_for_sasl\` and emits \`<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>\`.
- **\`authenticated\` + \`{stream_open, Domain}\`**: Remains in \`authenticated\`, updates \`domain\`, and emits \`<stream:stream ...><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>\`.
- **\`authenticated\` + \`{iq_bind, Id, ResourceBin}\`**: Defaults empty resource to \`<<"obsidian">>\`, constructs the Full JID binary formatted as \`User@Domain/Res\`, calls \`xmpp_session_registry:register_session(FullJid, Priority, self())\`, stores \`resource\` & \`full_jid\`, advances to \`session_established\`, and emits \`<iq type='result' id='<Id>'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid><FullJid></jid></bind></iq>\`.
- **\`session_established\` + \`{chat_message, Id, ToJid, Body}\`**: Formats \`<message from='<FromJid>' to='<TargetJid>' id='<Id>' type='chat'><body><Body></body></message>\` (defaulting empty \`ToJid\` to \`FromJid\`) and routes via \`xmpp_router:route_stanza/3\`.
- **Any state**: \`{ping, Id}\` replies \`<iq type='result' id='<Id>'/>\`; \`stream_close\` replies \`</stream:stream>\` and resets state to \`wait_for_stream\`.

---

## Rules & Verification Constraints
- Compile cleanly with \`erlc -Wall\` (zero warnings under \`-behaviour(gen_statem)\`).
- \`callback_mode/0\` MUST return \`state_functions\`; must integrate \`xmpp_stream_parser:feed_chunk/2\`, \`xmpp_session_registry:register_session/3\`, and \`xmpp_router:route_stanza/3\`.
- Must reject unauthenticated message stanzas during \`wait_for_sasl\` with \`not-authorized\` without advancing state.`,
  },
  {
    id: 'ch12-m5',
    milestoneId: 'm5-router',
    milestoneNumber: 5,
    title: 'Milestone 5: Stanza Router & In-Memory Offline Store (xmpp_router)',
    targetFile: 'src/xmpp_router.erl',
    targetFunctions: ['start_link/0', 'route_stanza/3', 'pop_offline_messages/1', 'get_offline_count/1'],
    verificationHint: 'Route a message between two active C2S pids, then route to an unregistered user. Verify the offline message is queued and retrievable via pop_offline_messages/1.',
    mentalModelCheck: {
      question: 'When routing a stanza to a bare JID with multiple active resources, how does xmpp_router dispatch the message?',
      codeSnippet: `xmpp_router:route_stanza(FromJid, <<"alice@localhost">>, StanzaXml)`,
      options: [
        {
          id: 'A',
          label: 'It queries xmpp_session_registry:lookup_by_jid/1, which returns the PID with the highest numerical priority.',
          isCorrect: true,
          explanation: 'Correct! Under RFC 6121, bare JID dispatch routes to the session resource possessing the highest numerical priority, or spools offline if none are online.',
        },
        {
          id: 'B',
          label: 'It broadcasts the stanza to every connected user on the server.',
          isCorrect: false,
          explanation: 'Stanzas are strictly routed to the recipient\'s registered sessions.',
        },
        {
          id: 'C',
          label: 'It rejects bare JIDs with an error because full JIDs are required.',
          isCorrect: false,
          explanation: 'Bare JIDs are standard in XMPP; the server resolves them to the active session with highest priority.',
        },
      ],
    },
    conceptMarkdown: `## Milestone 5: Stanza Routing Engine & Offline Message Queue

### Why This Matters in Production
Individual client \`gen_statem\` connection actors must stay decoupled from one another: Alice's TCP handler shouldn't track where Bob is connected or whether Bob just stepped into a subway dead zone. Centralizing stanza dispatch inside \`xmpp_router\` allows senders to pass formatted XML payloads to one switchboard, while ETS reads handle target PID resolution and an in-memory offline spool preserves messages for disconnected users in FIFO order.

> [!IMPORTANT]
> **Unpinned Delivery & Bare JID Normalization:** When delivering online via \`Pid ! {deliver_stanza, XmlCopy}\` or spooling offline by **Bare JID**, pass \`XmlBin\` through \`binary:copy/1\` so stalled or offline queues never pin large upstream TCP buffers, and always key offline queues by \`BareJid\` so messages addressed to either \`user@host\` or \`user@host/res\` drain together on reconnect.

---

### Deep Concept Breakdown & Under the Hood

1. **Online Dispatch**: Query \`xmpp_session_registry:lookup_by_jid(ToJid)\`. If one or more target PIDs are returned, send \`{deliver_stanza, binary:copy(XmlBin)}\` to every target PID, increment \`total_routed\`, and reply \`{routed, Count}\`.
2. **Offline FIFO Spooling & Drain**: When \`lookup_by_jid/1\` returns \`[]\`, normalize \`ToJid\` via \`xmpp_session_registry:parse_jid/1\` to its Bare JID, append \`binary:copy(XmlBin)\` to that user's FIFO list in \`offline_store\`, and reply \`{queued_offline, BareJid}\`. Calling \`pop_offline_messages/1\` returns \`{ok, Msgs}\` and removes the Bare JID key atomically.

---

### Official OTP \`gen_server\` API Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / gen_server & binary)
gen_server:start_link(ServerName, Module, Args, Options) -> Result
  Types: ServerName = {local, Name :: atom()}, Module = module(), Args = term(), Options = [term()]

gen_server:call(ServerRef, Request) -> Reply
  Types: ServerRef = pid() | atom(), Request = term(), Reply = term()
\`\`\`

---

### Chunked Reference Architecture (Domain-Neutral Event Relay & DLQ)

The \`webhook_relay\` server below shows the same online-dispatch vs. map-backed offline FIFO spool and drain pattern on HTTP webhook events (unrelated to XMPP JIDs or stanzas):

\`\`\`erlang
-module(webhook_relay).
-behaviour(gen_server).
-export([start_link/0, forward/2, drain_dlq/1, init/1, handle_call/3, handle_cast/2]).

start_link() -> gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).
forward(HookId, Payload) -> gen_server:call(?MODULE, {forward, HookId, Payload}).
drain_dlq(HookId) -> gen_server:call(?MODULE, {drain, HookId}).

init([]) -> {ok, #{dlq => #{}}}.

handle_call({forward, HookId, Payload}, _From, State = #{dlq := Dlq}) ->
    case whereis(HookId) of
        Pid when is_pid(Pid) ->
            Pid ! {hook_event, binary:copy(Payload)},
            {reply, {sent, 1}, State};
        undefined ->
            Q = maps:get(HookId, Dlq, []),
            {reply, {spooled, HookId}, State#{dlq => Dlq#{HookId => Q ++ [binary:copy(Payload)]}}}
    end;
handle_call({drain, HookId}, _From, State = #{dlq := Dlq}) ->
    Q = maps:get(HookId, Dlq, []),
    {reply, {ok, Q}, State#{dlq => maps:remove(HookId, Dlq)}}.

handle_cast(_Msg, State) -> {noreply, State}.
\`\`\`

---

## Assignment Specification

Implement \`src/xmpp_router.erl\` (\`-behaviour(gen_server)\`) exporting \`start_link/0\`, \`stop/0\`, \`route_stanza/3\`, \`pop_offline_messages/1\`, and \`get_offline_count/1\`:

### 1. \`start_link()\`, \`stop()\` & \`init([])\`
- **Input**: None for \`start_link/0\` / \`stop/0\`; empty list \`[]\` for \`init/1\`.
- **Behavior**: Registers locally as \`?MODULE\`. \`init([])\` initializes state map \`#{offline_store => #{}, total_routed => 0}\`. \`stop/0\` stops cleanly if running or returns \`ok\`.

### 2. \`route_stanza(FromFullJid, ToJid, XmlBin)\`
- **Input**: Three binaries (\`FromFullJid\`, \`ToJid\`, \`XmlBin\`).
- **Behavior**:
  - Looks up recipients via \`xmpp_session_registry:lookup_by_jid(ToJid)\`.
  - **Online**: Sends \`Pid ! {deliver_stanza, binary:copy(XmlBin)}\` to each PID, updates \`total_routed\`, and returns \`{routed, length(TargetPids)}\`.
  - **Offline**: Extracts \`BareJid\` via \`xmpp_session_registry:parse_jid(ToJid)\`, appends \`binary:copy(XmlBin)\` to the FIFO list for \`BareJid\` in \`offline_store\`, and returns \`{queued_offline, BareJid}\`.
- **Examples**:
  - Online Bob: \`route_stanza(<<"alice@host/a">>, <<"bob@host/b">>, Xml)\` -> \`{routed, 1}\`.
  - Offline Charlie: \`route_stanza(<<"alice@host/a">>, <<"charlie@host">>, Xml)\` -> \`{queued_offline, <<"charlie@host">>}\`.

### 3. \`pop_offline_messages(TargetJid)\` & \`get_offline_count(TargetJid)\`
- **Input**: Full or Bare \`TargetJid :: binary()\`.
- **Behavior**:
  - \`pop_offline_messages/1\` parses \`BareJid\`, returns \`{ok, FIFOOrderedMsgs}\` (or \`{ok, []}\`), and removes \`BareJid\` from \`offline_store\`.
  - \`get_offline_count/1\` parses \`BareJid\` and returns the non-negative integer count of queued messages.

---

## Rules & Verification Constraints
- Compile cleanly with \`erlc -Wall\` (zero warnings under \`-behaviour(gen_server)\`).
- \`init([])\` MUST return a map containing \`offline_store => #{}\`.
- Must invoke \`xmpp_session_registry:lookup_by_jid/1\`, \`xmpp_session_registry:parse_jid/1\`, and \`binary:copy/1\`.
- Online dispatch must send \`{deliver_stanza, StanzaBin}\`; offline spooling must preserve FIFO order and reset count to \`0\` on \`pop_offline_messages/1\`.`,
  },
  {
    id: 'ch12-m6',
    milestoneId: 'm6-chaos',
    milestoneNumber: 6,
    title: 'Milestone 6: Chaos Monkey Resilience & Fault-Injection (xmpp_sup)',
    targetFile: 'src/xmpp_sup.erl',
    targetFunctions: ['start_link/0', 'stop/0', 'init/1'],
    verificationHint: 'Boot all 5 modules under xmpp_sup, verify full E2E message routing and offline spooling, and confirm killing xmpp_router or xmpp_session_registry recovers cleanly under rest_for_one.',
    mentalModelCheck: {
      question: 'When Chaos Monkey injects exit(whereis(xmpp_router), kill) while Alice has an established C2S session registered in xmpp_session_registry, what happens?',
      codeSnippet: `#{strategy => rest_for_one, intensity => 5, period => 10}
%% Child #1: xmpp_session_registry | Child #2: xmpp_router`,
      options: [
        {
          id: 'A',
          label: 'Only xmpp_router restarts with a fresh PID; xmpp_session_registry stays untouched with the same PID and active sessions keep routing immediately.',
          isCorrect: true,
          explanation: 'Correct! Under rest_for_one, crashing a downstream child (#2 xmpp_router) only restarts that child (#2) while leaving upstream siblings (#1 xmpp_session_registry) and all registered ETS sessions intact.',
        },
        {
          id: 'B',
          label: 'xmpp_sup kills xmpp_session_registry as well, disconnecting Alice and wiping xmpp_sessions_tab.',
          isCorrect: false,
          explanation: 'rest_for_one only restarts siblings started AFTER the crashed worker. Upstream xmpp_session_registry is isolated from router crashes.',
        },
        {
          id: 'C',
          label: 'Both workers exit permanently until a client reconnects manually.',
          isCorrect: false,
          explanation: 'Both children are configured as permanent workers, so xmpp_sup automatically restarts xmpp_router in milliseconds.',
        },
      ],
    },
    conceptMarkdown: `## Milestone 6: Chaos Monkey Resilience & 5-Module Integration

### Why This Matters in Production
Passing isolated unit tests on happy paths does not guarantee reliability when live TCP sockets drop, ETS table owners crash, or burst malformed frames take down a routing worker. Erlang/OTP's **"Let It Crash"** architecture earns its reputation only when every module composes under a supervision tree that heals autonomously under chaos fault injection.

> [!IMPORTANT]
> **End-to-End 5-Module Contract:** \`xmpp_sup\` boots \`xmpp_session_registry\` (#1) and \`xmpp_router\` (#2) under \`rest_for_one\`; client C2S FSMs (\`xmpp_c2s_statem\`) frame fragmented wire chunks via \`xmpp_stream_parser\`, register into \`xmpp_session_registry\`, and route live or offline stanzas through \`xmpp_router\`.

---

### Fault-Injection Verification Breakdown

1. **Registry Failure (Upstream Crash -> Downstream Cascade)**: Killing \`xmpp_session_registry\` triggers \`rest_for_one\` termination of \`xmpp_router\`, followed by ordered restart of a fresh registry (with a clean ETS table) and fresh router.
2. **Router Failure (Downstream Crash -> Zero-Session-Loss Recovery)**: Killing \`xmpp_router\` restarts **only** \`xmpp_router\` with a new PID while preserving \`xmpp_session_registry\`'s PID and all registered client sessions—new messages route immediately once the router restarts.
3. **Client Crash (Monitor Auto-Pruning)**: Killing a high-priority \`C2sPid\` fires an asynchronous \`'DOWN'\` monitor into \`xmpp_session_registry\`, evicting the dead row so traffic fails over to any lower-priority surviving session automatically.

---

## Integration Checklist & Rules
- Ensure all 5 modules (\`xmpp_sup\`, \`xmpp_stream_parser\`, \`xmpp_session_registry\`, \`xmpp_c2s_statem\`, \`xmpp_router\`) compile cleanly with \`erlc -Wall\`.
- Run **Submit** on this final milestone to execute all **6 live integration & Chaos Monkey stages**:
  1. **M1**: \`xmpp_sup\` boot with \`rest_for_one\` and ordered child specs.
  2. **M2**: Fragmented TCP stream framing & \`binary:copy/1\` heap unpinning.
  3. **M3**: Priority lookup & automatic \`'DOWN'\` monitor pruning in ETS.
  4. **M4**: 4-phase \`gen_statem\` handshake, pre-auth rejection, and ETS bind.
  5. **M5**: Multi-client online delivery into \`delivered_inbox\` and FIFO offline drain.
  6. **M6 Chaos Monkey**: Live \`exit(RouterPid, kill)\` confirming registry preservation and immediate zero-loss message recovery.`,
  },
];

export const CH12_SOLUTION_FILES: Record<string, string> = {
  'src/xmpp_sup.erl': `-module(xmpp_sup).
-behaviour(supervisor).

-export([start_link/0, stop/0, init/1]).

%% @doc Starts and locally registers the root XMPP OTP supervisor process,
%% returning {ok, Pid} on success or an error tuple if startup fails.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Synchronously stops the locally registered root supervisor if running,
%% or returns ok immediately when already stopped.
stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> supervisor:stop(Pid)
    end.

%% @doc Returns the root supervisor flags and ordered child specifications
%% governing the session registry and message router workers.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => xmpp_session_registry,
            start => {xmpp_session_registry, start_link, []},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [xmpp_session_registry]
        },
        #{
            id => xmpp_router,
            start => {xmpp_router, start_link, []},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [xmpp_router]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.
`,

  'src/xmpp_stream_parser.erl': `-module(xmpp_stream_parser).
-export([new_buffer/0, feed_chunk/2, extract_attr/2, extract_tag_body/2]).

%% @doc Returns an empty initial framing buffer binary.
new_buffer() ->
    <<>>.

%% @doc Appends IncomingBin onto BufferBin, decodes all complete XMPP stream
%% frames into event tuples with unpinned binaries, and returns leftover bytes.
feed_chunk(BufferBin, IncomingBin) when is_binary(BufferBin), is_binary(IncomingBin) ->
    Combined = <<BufferBin/binary, IncomingBin/binary>>,
    extract_events(Combined, []).

extract_events(Bin, Acc) ->
    CleanBin = trim_leading_ws(Bin),
    case CleanBin of
        <<>> ->
            {lists:reverse(Acc), <<>>};
        <<"</stream:stream>", Rest/binary>> ->
            extract_events(Rest, [stream_close | Acc]);
        <<"<stream:stream", _/binary>> ->
            case binary:match(CleanBin, <<">">>) of
                {Pos, 1} ->
                    HeaderLen = Pos + 1,
                    <<HeaderBin:HeaderLen/binary, Rest/binary>> = CleanBin,
                    Domain = binary:copy(extract_attr(HeaderBin, <<"to">>, <<"localhost">>)),
                    extract_events(Rest, [{stream_open, Domain} | Acc]);
                nomatch ->
                    {lists:reverse(Acc), binary:copy(CleanBin)}
            end;
        <<"<ping", _/binary>> ->
            case binary:match(CleanBin, <<"/>">>) of
                {Pos, 2} ->
                    FrameLen = Pos + 2,
                    <<FrameBin:FrameLen/binary, Rest/binary>> = CleanBin,
                    Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"ping_1">>)),
                    extract_events(Rest, [{ping, Id} | Acc]);
                nomatch ->
                    {lists:reverse(Acc), binary:copy(CleanBin)}
            end;
        <<"<auth", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</auth>">>, fun(FrameBin) ->
                Mech = binary:copy(extract_attr(FrameBin, <<"mechanism">>, <<"PLAIN">>)),
                Payload = binary:copy(extract_tag_body(FrameBin, <<"auth">>)),
                {sasl_auth, Mech, Payload}
            end, Acc);
        <<"<iq", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</iq>">>, fun(FrameBin) ->
                Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"bind_1">>)),
                Res = binary:copy(extract_tag_body(FrameBin, <<"resource">>)),
                {iq_bind, Id, Res}
            end, Acc);
        <<"<message", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</message>">>, fun(FrameBin) ->
                Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"msg_1">>)),
                To = binary:copy(extract_attr(FrameBin, <<"to">>, <<>>)),
                Body = binary:copy(extract_tag_body(FrameBin, <<"body">>)),
                {chat_message, Id, To, Body}
            end, Acc);
        Other ->
            {lists:reverse(Acc), binary:copy(Other)}
    end.

extract_closed_tag(Bin, CloseTag, Fun, Acc) ->
    CloseTagLen = byte_size(CloseTag),
    case binary:match(Bin, CloseTag) of
        {Pos, CloseTagLen} ->
            TotalLen = Pos + CloseTagLen,
            <<FrameBin:TotalLen/binary, Rest/binary>> = Bin,
            Event = Fun(FrameBin),
            extract_events(Rest, [Event | Acc]);
        nomatch ->
            {lists:reverse(Acc), binary:copy(Bin)}
    end.

%% @doc Extracts the unquoted value of AttrName from an XML element binary,
%% returning empty binary if the attribute is absent.
extract_attr(Bin, AttrName) ->
    extract_attr(Bin, AttrName, <<>>).

extract_attr(Bin, AttrName, Default) ->
    Key1 = <<AttrName/binary, 61, 34>>,
    Key2 = <<AttrName/binary, 61, 39>>,
    case find_attr_val(Bin, Key1, <<34>>) of
        {ok, Val} -> Val;
        nomatch ->
            case find_attr_val(Bin, Key2, <<39>>) of
                {ok, Val} -> Val;
                nomatch -> Default
            end
    end.

find_attr_val(Bin, Key, QuoteChar) ->
    case binary:match(Bin, Key) of
        {Pos, Len} ->
            Start = Pos + Len,
            <<_:Start/binary, Rem/binary>> = Bin,
            case binary:match(Rem, QuoteChar) of
                {ValLen, _} ->
                    <<Val:ValLen/binary, _/binary>> = Rem,
                    {ok, Val};
                nomatch ->
                    nomatch
            end;
        nomatch ->
            nomatch
    end.

%% @doc Extracts the inner text bytes delimited by <TagName ...> and </TagName>,
%% returning empty binary if the element is absent or unclosed.
extract_tag_body(Bin, TagName) ->
    OpenTag = <<"<", TagName/binary>>,
    CloseTag = <<"</", TagName/binary, ">">>,
    case binary:match(Bin, OpenTag) of
        {PosOpen, _} ->
            <<_:PosOpen/binary, Rem1/binary>> = Bin,
            case binary:match(Rem1, <<">">>) of
                {PosCloseOpen, 1} ->
                    ContentStart = PosCloseOpen + 1,
                    <<_:ContentStart/binary, Rem2/binary>> = Rem1,
                    case binary:match(Rem2, CloseTag) of
                        {BodyLen, _} ->
                            <<Body:BodyLen/binary, _/binary>> = Rem2,
                            Body;
                        nomatch ->
                            <<>>
                    end;
                nomatch ->
                    <<>>
            end;
        nomatch ->
            <<>>
    end.

trim_leading_ws(<<C, Rest/binary>>) when C =:= 32; C =:= 9; C =:= 10; C =:= 13 ->
    trim_leading_ws(Rest);
trim_leading_ws(Bin) ->
    Bin.
`,

  'src/xmpp_session_registry.erl': `-module(xmpp_session_registry).
-behaviour(gen_server).

-export([
    start_link/0,
    stop/0,
    register_session/3,
    unregister_session/1,
    lookup_by_jid/1,
    list_all_sessions/0,
    parse_jid/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, xmpp_sessions_tab).

%% @doc Starts and locally registers the ETS session registry gen_server.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Synchronously stops the locally registered session registry if running.
stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

%% @doc Registers FullJid with integer Priority and monitors C2sPid in ETS.
register_session(FullJid, Priority, C2sPid)
  when is_binary(FullJid), is_integer(Priority), is_pid(C2sPid) ->
    gen_server:call(?MODULE, {register_session, FullJid, Priority, C2sPid}).

%% @doc Unregisters FullJid, flushes its process monitor, and removes its ETS row.
unregister_session(FullJid) when is_binary(FullJid) ->
    gen_server:call(?MODULE, {unregister_session, FullJid}).

%% @doc Looks up recipient PIDs concurrently in ETS by exact Full JID or highest
%% numerical priority matching a Bare JID.
lookup_by_jid(TargetJid) when is_binary(TargetJid) ->
    ensure_table(),
    case binary:match(TargetJid, <<"/">>) of
        {_, _} ->
            case ets:lookup(?TAB, TargetJid) of
                [{TargetJid, _Bare, _Res, _Prio, Pid, _MRef}] -> [Pid];
                [] -> []
            end;
        nomatch ->
            All = ets:tab2list(?TAB),
            Matching = [Item || Item = {_Full, Bare, _Res, _Prio, _Pid, _MRef} <- All, Bare =:= TargetJid],
            Sorted = lists:sort(fun({_, _, _, P1, _, _}, {_, _, _, P2, _, _}) -> P1 >= P2 end, Matching),
            case Sorted of
                [{_F, _B, _R, _P, TopPid, _Ref} | _] -> [TopPid];
                [] -> []
            end
    end.

%% @doc Returns all active 6-tuple session records stored in xmpp_sessions_tab.
list_all_sessions() ->
    ensure_table(),
    ets:tab2list(?TAB).

%% @doc Splits a JID binary into {BareJid, Resource} (empty resource when absent).
parse_jid(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"/">>) of
        [Bare, Res] -> {Bare, Res};
        [Bare] -> {Bare, <<>>}
    end.

init([]) ->
    ensure_table(),
    {ok, #{monitors => #{}}}.

handle_call({register_session, FullJidBin, Priority, C2sPid}, _From, State) ->
    ensure_table(),
    {BareJid, Resource} = parse_jid(FullJidBin),
    MRef = erlang:monitor(process, C2sPid),
    ets:insert(?TAB, {FullJidBin, BareJid, Resource, Priority, C2sPid, MRef}),
    Monitors = maps:get(monitors, State, #{}),
    NewMonitors = Monitors#{MRef => FullJidBin},
    {reply, ok, State#{monitors => NewMonitors}};

handle_call({unregister_session, FullJidBin}, _From, State) ->
    ensure_table(),
    case ets:lookup(?TAB, FullJidBin) of
        [{FullJidBin, _Bare, _Res, _Prio, _Pid, MRef}] ->
            erlang:demonitor(MRef, [flush]),
            ets:delete(?TAB, FullJidBin);
        [] ->
            ok
    end,
    {reply, ok, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'DOWN', MRef, process, DeadPid, _Reason}, State) ->
    ensure_table(),
    Monitors = maps:get(monitors, State, #{}),
    case maps:get(MRef, Monitors, undefined) of
        undefined ->
            lists:foreach(fun({FullJid, _B, _R, _P, Pid, _Ref}) ->
                if Pid =:= DeadPid -> ets:delete(?TAB, FullJid); true -> ok end
            end, ets:tab2list(?TAB)),
            {noreply, State};
        FullJidBin ->
            ets:delete(?TAB, FullJidBin),
            {noreply, State#{monitors => maps:remove(MRef, Monitors)}}
    end;

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

ensure_table() ->
    case ets:whereis(?TAB) of
        undefined ->
            ets:new(?TAB, [set, named_table, public, {read_concurrency, true}]);
        _Tid ->
            ?TAB
    end.
`,

  'src/xmpp_c2s_statem.erl': `-module(xmpp_c2s_statem).
-behaviour(gen_statem).

-export([
    start_link/1,
    feed_xml/2,
    get_session_info/1,
    stop/1
]).
-export([
    callback_mode/0,
    init/1,
    wait_for_stream/3,
    wait_for_sasl/3,
    authenticated/3,
    session_established/3,
    terminate/3
]).

%% @doc Starts a linked C2S connection state machine configured with Opts map.
start_link(Opts) when is_map(Opts) ->
    gen_statem:start_link(?MODULE, Opts, []).

%% @doc Feeds an incoming XML chunk binary synchronously into the C2S FSM,
%% returning {ok, NextState, OutXmlList}.
feed_xml(Pid, XmlChunkBin) when is_pid(Pid), is_binary(XmlChunkBin) ->
    gen_statem:call(Pid, {xml_chunk, XmlChunkBin}).

%% @doc Returns the current protocol phase atom and connection state map.
get_session_info(Pid) when is_pid(Pid) ->
    gen_statem:call(Pid, get_session_info).

%% @doc Synchronously stops the C2S connection process and triggers cleanup.
stop(Pid) when is_pid(Pid) ->
    gen_statem:stop(Pid).

callback_mode() ->
    state_functions.

init(Opts) ->
    Socket = maps:get(socket, Opts, undefined),
    if Socket =/= undefined ->
        _ = inet:setopts(Socket, [{active, once}]);
       true ->
        ok
    end,
    Data = #{
        socket => Socket,
        buffer => xmpp_stream_parser:new_buffer(),
        domain => maps:get(domain, Opts, <<"localhost">>),
        username => maps:get(username, Opts, <<"alice">>),
        resource => <<>>,
        full_jid => <<>>,
        priority => 10,
        delivered_inbox => []
    },
    {ok, wait_for_stream, Data}.

wait_for_stream({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, wait_for_stream, Data, From);
wait_for_stream(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, wait_for_stream, Data, undefined);
wait_for_stream({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, wait_for_stream, Data}}]};
wait_for_stream(_EventType, _Event, _Data) ->
    keep_state_and_data.

wait_for_sasl({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, wait_for_sasl, Data, From);
wait_for_sasl(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, wait_for_sasl, Data, undefined);
wait_for_sasl({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, wait_for_sasl, Data}}]};
wait_for_sasl(_EventType, _Event, _Data) ->
    keep_state_and_data.

authenticated({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, authenticated, Data, From);
authenticated(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, authenticated, Data, undefined);
authenticated({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, authenticated, Data}}]};
authenticated(_EventType, _Event, _Data) ->
    keep_state_and_data.

session_established({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, session_established, Data, From);
session_established(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, session_established, Data, undefined);
session_established(info, {deliver_stanza, XmlBin}, Data) ->
    send_to_socket(maps:get(socket, Data, undefined), XmlBin),
    Inbox = maps:get(delivered_inbox, Data, []),
    {keep_state, Data#{delivered_inbox => Inbox ++ [XmlBin]}};
session_established({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, session_established, Data}}]};
session_established(_EventType, _Event, _Data) ->
    keep_state_and_data.

terminate(_Reason, _State, Data) ->
    case maps:get(full_jid, Data, <<>>) of
        <<>> -> ok;
        FullJid ->
            try xmpp_session_registry:unregister_session(FullJid) catch _:_ -> ok end,
            ok
    end.

handle_incoming_chunk(Chunk, CurrentState, Data, ReplyFrom) ->
    OldBuf = maps:get(buffer, Data, <<>>),
    {Events, NewBuf} = xmpp_stream_parser:feed_chunk(OldBuf, Chunk),
    {NextState, UpdatedData, OutXmlList} =
        process_events(Events, CurrentState, Data#{buffer => NewBuf}, []),
    lists:foreach(fun(Xml) ->
        send_to_socket(maps:get(socket, UpdatedData, undefined), Xml)
    end, OutXmlList),
    case ReplyFrom of
        undefined ->
            {next_state, NextState, UpdatedData};
        From ->
            {next_state, NextState, UpdatedData, [{reply, From, {ok, NextState, OutXmlList}}]}
    end.

process_events([], State, Data, OutAcc) ->
    {State, Data, lists:reverse(OutAcc)};

process_events([{stream_open, Domain} | Rest], wait_for_stream, Data, OutAcc) ->
    Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
    process_events(Rest, wait_for_sasl, Data#{domain => Domain}, [Reply | OutAcc]);

process_events([{sasl_auth, _Mech, Payload} | Rest], wait_for_sasl, Data, OutAcc) ->
    User = extract_user_from_sasl(Payload, maps:get(username, Data, <<"alice">>)),
    Reply = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
    process_events(Rest, authenticated, Data#{username => User}, [Reply | OutAcc]);

process_events([_PreAuthStanza | Rest], wait_for_sasl, Data, OutAcc) ->
    Err = <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>,
    process_events(Rest, wait_for_sasl, Data, [Err | OutAcc]);

process_events([{stream_open, Domain} | Rest], authenticated, Data, OutAcc) ->
    Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>">>,
    process_events(Rest, authenticated, Data#{domain => Domain}, [Reply | OutAcc]);

process_events([{iq_bind, Id, ResourceBin} | Rest], authenticated, Data, OutAcc) ->
    Res = case ResourceBin of <<>> -> <<"obsidian">>; R -> R end,
    User = maps:get(username, Data, <<"alice">>),
    Domain = maps:get(domain, Data, <<"localhost">>),
    FullJid = <<User/binary, "@", Domain/binary, "/", Res/binary>>,
    try xmpp_session_registry:register_session(FullJid, maps:get(priority, Data, 10), self()) catch _:_ -> ok end,
    Reply = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>,
    process_events(Rest, session_established, Data#{resource => Res, full_jid => FullJid}, [Reply | OutAcc]);

process_events([{chat_message, Id, ToJid, Body} | Rest], session_established, Data, OutAcc) ->
    FromJid = maps:get(full_jid, Data, <<"alice@localhost/obsidian">>),
    TargetJid = case ToJid of <<>> -> FromJid; T -> T end,
    StanzaXml = <<"<message from='", FromJid/binary, "' to='", TargetJid/binary, "' id='", Id/binary, "' type='chat'><body>", Body/binary, "</body></message>">>,
    _ = (try xmpp_router:route_stanza(FromJid, TargetJid, StanzaXml) catch _:_ -> ok end),
    process_events(Rest, session_established, Data, OutAcc);

process_events([{ping, Id} | Rest], State, Data, OutAcc) ->
    Reply = <<"<iq type='result' id='", Id/binary, "'/>">>,
    process_events(Rest, State, Data, [Reply | OutAcc]);

process_events([stream_close | Rest], _State, Data, OutAcc) ->
    Reply = <<"</stream:stream>">>,
    process_events(Rest, wait_for_stream, Data, [Reply | OutAcc]);

process_events([_Other | Rest], State, Data, OutAcc) ->
    process_events(Rest, State, Data, OutAcc).

extract_user_from_sasl(<<>>, Default) -> Default;
extract_user_from_sasl(Payload, Default) ->
    case binary:split(Payload, <<0>>, [global]) of
        [_Authzid, Authcid, _Pass | _] when Authcid =/= <<>> -> Authcid;
        [Single | _] when Single =/= <<>> -> Single;
        _ -> Default
    end.

send_to_socket(undefined, _Data) -> ok;
send_to_socket(Socket, Data) ->
    try gen_tcp:send(Socket, Data) catch _:_ -> ok end,
    ok.
`,

  'src/xmpp_router.erl': `-module(xmpp_router).
-behaviour(gen_server).

-export([
    start_link/0,
    stop/0,
    route_stanza/3,
    pop_offline_messages/1,
    get_offline_count/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

%% @doc Starts and locally registers the stanza router gen_server process.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Synchronously stops the locally registered stanza router if running.
stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

%% @doc Dispatches XmlBin to online target PIDs or spools it offline by Bare JID.
route_stanza(FromFullJid, ToJid, XmlBin)
  when is_binary(FromFullJid), is_binary(ToJid), is_binary(XmlBin) ->
    gen_server:call(?MODULE, {route_stanza, FromFullJid, ToJid, XmlBin}).

%% @doc Retrieves and clears FIFO offline messages queued for TargetJid's Bare JID.
pop_offline_messages(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {pop_offline, TargetJid}).

%% @doc Returns the integer count of offline messages spooled for TargetJid's Bare JID.
get_offline_count(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {get_offline_count, TargetJid}).

init([]) ->
    {ok, #{offline_store => #{}, total_routed => 0}}.

handle_call({route_stanza, _FromFullJid, ToJid, XmlBin}, _From, State) ->
    TargetPids = xmpp_session_registry:lookup_by_jid(ToJid),
    case TargetPids of
        [_ | _] ->
            lists:foreach(fun(Pid) ->
                Pid ! {deliver_stanza, binary:copy(XmlBin)}
            end, TargetPids),
            Count = length(TargetPids),
            Total = maps:get(total_routed, State, 0) + Count,
            {reply, {routed, Count}, State#{total_routed => Total}};
        [] ->
            {BareJid, _Res} = xmpp_session_registry:parse_jid(ToJid),
            OfflineStore = maps:get(offline_store, State, #{}),
            Existing = maps:get(BareJid, OfflineStore, []),
            UpdatedStore = OfflineStore#{BareJid => Existing ++ [binary:copy(XmlBin)]},
            {reply, {queued_offline, BareJid}, State#{offline_store => UpdatedStore}}
    end;

handle_call({pop_offline, TargetJid}, _From, State) ->
    {BareJid, _Res} = xmpp_session_registry:parse_jid(TargetJid),
    OfflineStore = maps:get(offline_store, State, #{}),
    Msgs = maps:get(BareJid, OfflineStore, []),
    UpdatedStore = maps:remove(BareJid, OfflineStore),
    {reply, {ok, Msgs}, State#{offline_store => UpdatedStore}};

handle_call({get_offline_count, TargetJid}, _From, State) ->
    {BareJid, _Res} = xmpp_session_registry:parse_jid(TargetJid),
    OfflineStore = maps:get(offline_store, State, #{}),
    Msgs = maps:get(BareJid, OfflineStore, []),
    {reply, length(Msgs), State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
};

// ── Starter Code Files (CLEAN ANTI-SPOILER STUBS - NOT PRE-SOLVED!) ──────────
export const CH12_STARTER_FILES: Record<string, string> = {
  'src/xmpp_sup.erl': `-module(xmpp_sup).
-behaviour(supervisor).

-export([start_link/0, stop/0, init/1]).

%% @doc Starts and locally registers the root XMPP OTP supervisor process,
%% returning {ok, Pid} on success or an error tuple if startup fails.
start_link() ->
    {error, not_implemented}.

%% @doc Synchronously stops the locally registered root supervisor if running,
%% or returns ok immediately when already stopped.
stop() ->
    ok.

%% @doc Returns the root supervisor flags and ordered child specifications
%% governing the session registry and message router workers.
init([]) ->
    {ok, {#{strategy => one_for_one, intensity => 0, period => 1}, []}}.
`,
  'src/xmpp_stream_parser.erl': `-module(xmpp_stream_parser).
-export([new_buffer/0, feed_chunk/2, extract_attr/2, extract_tag_body/2]).

%% @doc Returns an empty initial framing buffer binary.
new_buffer() ->
    <<>>.

%% @doc Appends IncomingBin onto BufferBin, decodes all complete XMPP stream
%% frames into event tuples with unpinned binaries, and returns leftover bytes.
feed_chunk(_BufferBin, _IncomingBin) ->
    {[], <<>>}.

%% @doc Extracts the unquoted value of AttrName from an XML element binary,
%% returning empty binary if the attribute is absent.
extract_attr(Bin, AttrName) ->
    extract_attr(Bin, AttrName, <<>>).

extract_attr(Bin, AttrName, Default) ->
    Key1 = <<AttrName/binary, 61, 34>>,
    Key2 = <<AttrName/binary, 61, 39>>,
    case find_attr_val(Bin, Key1, <<34>>) of
        {ok, Val} -> Val;
        nomatch ->
            case find_attr_val(Bin, Key2, <<39>>) of
                {ok, Val} -> Val;
                nomatch -> Default
            end
    end.

find_attr_val(Bin, Key, QuoteChar) ->
    case binary:match(Bin, Key) of
        {Pos, Len} ->
            Start = Pos + Len,
            <<_:Start/binary, Rem/binary>> = Bin,
            case binary:match(Rem, QuoteChar) of
                {ValLen, _} ->
                    <<Val:ValLen/binary, _/binary>> = Rem,
                    {ok, Val};
                nomatch ->
                    nomatch
            end;
        nomatch ->
            nomatch
    end.

%% @doc Extracts the inner text bytes delimited by <TagName ...> and </TagName>,
%% returning empty binary if the element is absent or unclosed.
extract_tag_body(Bin, TagName) ->
    OpenTag = <<"<", TagName/binary>>,
    CloseTag = <<"</", TagName/binary, ">">>,
    case binary:match(Bin, OpenTag) of
        {PosOpen, _} ->
            <<_:PosOpen/binary, Rem1/binary>> = Bin,
            case binary:match(Rem1, <<">">>) of
                {PosCloseOpen, 1} ->
                    ContentStart = PosCloseOpen + 1,
                    <<_:ContentStart/binary, Rem2/binary>> = Rem1,
                    case binary:match(Rem2, CloseTag) of
                        {BodyLen, _} ->
                            <<Body:BodyLen/binary, _/binary>> = Rem2,
                            Body;
                        nomatch ->
                            <<>>
                    end;
                nomatch ->
                    <<>>
            end;
        nomatch ->
            <<>>
    end.
`,
  'src/xmpp_session_registry.erl': `-module(xmpp_session_registry).
-behaviour(gen_server).

-export([
    start_link/0,
    stop/0,
    register_session/3,
    unregister_session/1,
    lookup_by_jid/1,
    list_all_sessions/0,
    parse_jid/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, xmpp_sessions_tab).

%% @doc Starts and locally registers the ETS session registry gen_server.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Synchronously stops the locally registered session registry if running.
stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

%% @doc Registers FullJid with integer Priority and monitors C2sPid in ETS.
register_session(FullJid, Priority, C2sPid)
  when is_binary(FullJid), is_integer(Priority), is_pid(C2sPid) ->
    gen_server:call(?MODULE, {register_session, FullJid, Priority, C2sPid}).

%% @doc Unregisters FullJid, flushes its process monitor, and removes its ETS row.
unregister_session(FullJid) when is_binary(FullJid) ->
    gen_server:call(?MODULE, {unregister_session, FullJid}).

%% @doc Looks up recipient PIDs concurrently in ETS by exact Full JID or highest
%% numerical priority matching a Bare JID.
lookup_by_jid(TargetJid) when is_binary(TargetJid) ->
    [].

%% @doc Returns all active 6-tuple session records stored in xmpp_sessions_tab.
list_all_sessions() ->
    [].

%% @doc Splits a JID binary into {BareJid, Resource} (empty resource when absent).
parse_jid(JidBin) when is_binary(JidBin) ->
    {JidBin, <<>>}.

init([]) ->
    {ok, #{monitors => #{}}}.

handle_call({register_session, _FullJidBin, _Priority, _C2sPid}, _From, State) ->
    {reply, ok, State};
handle_call({unregister_session, _FullJidBin}, _From, State) ->
    {reply, ok, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'DOWN', _MRef, process, _DeadPid, _Reason}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
  'src/xmpp_c2s_statem.erl': `-module(xmpp_c2s_statem).
-behaviour(gen_statem).

-export([
    start_link/1,
    feed_xml/2,
    get_session_info/1,
    stop/1
]).
-export([
    callback_mode/0,
    init/1,
    wait_for_stream/3,
    wait_for_sasl/3,
    authenticated/3,
    session_established/3,
    terminate/3
]).

%% @doc Starts a linked C2S connection state machine configured with Opts map.
start_link(Opts) when is_map(Opts) ->
    gen_statem:start_link(?MODULE, Opts, []).

%% @doc Feeds an incoming XML chunk binary synchronously into the C2S FSM,
%% returning {ok, NextState, OutXmlList}.
feed_xml(Pid, XmlChunkBin) when is_pid(Pid), is_binary(XmlChunkBin) ->
    gen_statem:call(Pid, {xml_chunk, XmlChunkBin}).

%% @doc Returns the current protocol phase atom and connection state map.
get_session_info(Pid) when is_pid(Pid) ->
    gen_statem:call(Pid, get_session_info).

%% @doc Synchronously stops the C2S connection process and triggers cleanup.
stop(Pid) when is_pid(Pid) ->
    gen_statem:stop(Pid).

callback_mode() ->
    state_functions.

init(Opts) ->
    Socket = maps:get(socket, Opts, undefined),
    if Socket =/= undefined ->
        _ = inet:setopts(Socket, [{active, once}]);
       true ->
        ok
    end,
    Data = #{
        socket => Socket,
        buffer => xmpp_stream_parser:new_buffer(),
        domain => maps:get(domain, Opts, <<"localhost">>),
        username => maps:get(username, Opts, <<"alice">>),
        resource => <<>>,
        full_jid => <<>>,
        priority => 10,
        delivered_inbox => []
    },
    {ok, wait_for_stream, Data}.

wait_for_stream({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, wait_for_stream, Data, From);
wait_for_stream(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, wait_for_stream, Data, undefined);
wait_for_stream({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, wait_for_stream, Data}}]};
wait_for_stream(_EventType, _Event, _Data) ->
    keep_state_and_data.

wait_for_sasl({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, wait_for_sasl, Data, From);
wait_for_sasl(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, wait_for_sasl, Data, undefined);
wait_for_sasl({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, wait_for_sasl, Data}}]};
wait_for_sasl(_EventType, _Event, _Data) ->
    keep_state_and_data.

authenticated({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, authenticated, Data, From);
authenticated(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, authenticated, Data, undefined);
authenticated({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, authenticated, Data}}]};
authenticated(_EventType, _Event, _Data) ->
    keep_state_and_data.

session_established({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, session_established, Data, From);
session_established(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, session_established, Data, undefined);
session_established(info, {deliver_stanza, XmlBin}, Data) ->
    send_to_socket(maps:get(socket, Data, undefined), XmlBin),
    Inbox = maps:get(delivered_inbox, Data, []),
    {keep_state, Data#{delivered_inbox => Inbox ++ [XmlBin]}};
session_established({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, session_established, Data}}]};
session_established(_EventType, _Event, _Data) ->
    keep_state_and_data.

terminate(_Reason, _State, Data) ->
    case maps:get(full_jid, Data, <<>>) of
        <<>> -> ok;
        FullJid ->
            try xmpp_session_registry:unregister_session(FullJid) catch _:_ -> ok end,
            ok
    end.

handle_incoming_chunk(Chunk, CurrentState, Data, ReplyFrom) ->
    OldBuf = maps:get(buffer, Data, <<>>),
    {Events, NewBuf} = xmpp_stream_parser:feed_chunk(OldBuf, Chunk),
    {NextState, UpdatedData, OutXmlList} =
        process_events(Events, CurrentState, Data#{buffer => NewBuf}, []),
    lists:foreach(fun(Xml) ->
        send_to_socket(maps:get(socket, UpdatedData, undefined), Xml)
    end, OutXmlList),
    case ReplyFrom of
        undefined ->
            {next_state, NextState, UpdatedData};
        From ->
            {next_state, NextState, UpdatedData, [{reply, From, {ok, NextState, OutXmlList}}]}
    end.

process_events([], State, Data, OutAcc) ->
    {State, Data, lists:reverse(OutAcc)};
process_events([_Event | Rest], State, Data, OutAcc) ->
    process_events(Rest, State, Data, OutAcc).

send_to_socket(undefined, _Data) -> ok;
send_to_socket(Socket, Data) ->
    try gen_tcp:send(Socket, Data) catch _:_ -> ok end,
    ok.
`,
  'src/xmpp_router.erl': `-module(xmpp_router).
-behaviour(gen_server).

-export([
    start_link/0,
    stop/0,
    route_stanza/3,
    pop_offline_messages/1,
    get_offline_count/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

%% @doc Starts and locally registers the stanza router gen_server process.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Synchronously stops the locally registered stanza router if running.
stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

%% @doc Dispatches XmlBin to online target PIDs or spools it offline by Bare JID.
route_stanza(FromFullJid, ToJid, XmlBin)
  when is_binary(FromFullJid), is_binary(ToJid), is_binary(XmlBin) ->
    gen_server:call(?MODULE, {route_stanza, FromFullJid, ToJid, XmlBin}).

%% @doc Retrieves and clears FIFO offline messages queued for TargetJid's Bare JID.
pop_offline_messages(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {pop_offline, TargetJid}).

%% @doc Returns the integer count of offline messages spooled for TargetJid's Bare JID.
get_offline_count(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {get_offline_count, TargetJid}).

init([]) ->
    {ok, #{}}.

handle_call({route_stanza, _FromFullJid, ToJid, _XmlBin}, _From, State) ->
    {reply, {queued_offline, ToJid}, State};

handle_call({pop_offline, _TargetJid}, _From, State) ->
    {reply, {ok, []}, State};

handle_call({get_offline_count, _TargetJid}, _From, State) ->
    {reply, 0, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
};

// ── Chapter 12 Lessons Definition ─────────────────────────────────────────────
export const CHAPTER_12_LESSONS: LessonContent[] = [
  {
    id: 'ch12-capstone',
    chapterNumber: 12,
    lessonNumber: 1,
    lessonType: 'capstone_studio',
    title: 'Capstone: 5-Module Production OTP XMPP Server',
    difficulty: 'Production',
    xpReward: 750,
    capabilityMode: 'xmpp_full',
    visualScene: 'xmpp_5_module_capstone_arch',
    mentalModelCheck: {
      question: 'In the BeamForge XMPP Server, why is xmpp_sup configured with rest_for_one with xmpp_session_registry ordered before xmpp_router?',
      codeSnippet: `Children = [\n    #{id => xmpp_session_registry, start => {xmpp_session_registry, start_link, []}},\n    #{id => xmpp_router, start => {xmpp_router, start_link, []}}\n]`,
      options: [
        {
          id: 'A',
          label: 'The router depends directly on the registry\'s ETS table. Under rest_for_one, if the registry crashes, the router is automatically terminated and restarted against the fresh registry, while a router crash does not kill the registry.',
          isCorrect: true,
          explanation: 'Correct! xmpp_router directly queries xmpp_session_registry\'s in-memory ETS table. If the registry crashed under one_for_one, the router would hold dead table handles. Under rest_for_one, downstream router is restarted cleanly, but upstream registry is safe if router crashes.',
        },
        {
          id: 'B',
          label: 'rest_for_one is the only supervisor strategy that supports gen_statem processes.',
          isCorrect: false,
          explanation: 'All OTP supervisor strategies support any worker behaviour (gen_server, gen_statem, etc.).',
        },
        {
          id: 'C',
          label: 'The router requires higher CPU priority than the registry.',
          isCorrect: false,
          explanation: 'Supervisor child order defines startup sequence and crash restart cascades, not BEAM CPU priority.',
        },
      ],
    },
    conceptMarkdown: `## Building a Production Real-Time XMPP Server in Erlang/OTP

Welcome to the **BeamForge Final Capstone**. Across the 6 Studio Milestones, you compose 5 cooperating Erlang/OTP modules—functional immutability, $O(1)$ sub-binary unpinning, \`gen_server\` + public ETS tables with unidirectional monitors, \`gen_statem\` phase isolation, and \`rest_for_one\` supervision—into a complete real-time XMPP chat server.

### The 5 Interconnected Modules
1. **\`src/xmpp_sup.erl\`**: Root OTP supervisor using \`rest_for_one\` ordering \`[xmpp_session_registry, xmpp_router]\`.
2. **\`src/xmpp_stream_parser.erl\`**: Incremental binary XML framer handling TCP fragmentation with \`binary:copy/1\` heap unpinning.
3. **\`src/xmpp_session_registry.erl\`**: Hybrid \`gen_server\` + \`public\` ETS table (\`xmpp_sessions_tab\`) with \`erlang:monitor/2\` auto-pruning.
4. **\`src/xmpp_c2s_statem.erl\`**: Connection \`gen_statem\` (\`state_functions\`) enforcing \`wait_for_stream -> wait_for_sasl -> authenticated -> session_established\`.
5. **\`src/xmpp_router.erl\`**: Switchboard \`gen_server\` dispatching live stanzas via ETS and spooling offline messages in FIFO order.

### End-to-End Verification Constraints
- Every module must compile cleanly with \`erlc -Wall\` and work independently per milestone before full 5-module Chaos Monkey integration in Milestone 6.`,

    capstoneMilestones: CH12_CAPSTONE_MILESTONES,

    files: [
      {
        path: 'src/xmpp_sup.erl',
        name: 'xmpp_sup.erl',
        content: CH12_STARTER_FILES['src/xmpp_sup.erl'],
        behaviour: 'supervisor',
      },
      {
        path: 'src/xmpp_stream_parser.erl',
        name: 'xmpp_stream_parser.erl',
        content: CH12_STARTER_FILES['src/xmpp_stream_parser.erl'],
      },
      {
        path: 'src/xmpp_session_registry.erl',
        name: 'xmpp_session_registry.erl',
        content: CH12_STARTER_FILES['src/xmpp_session_registry.erl'],
        behaviour: 'gen_server',
      },
      {
        path: 'src/xmpp_c2s_statem.erl',
        name: 'xmpp_c2s_statem.erl',
        content: CH12_STARTER_FILES['src/xmpp_c2s_statem.erl'],
        behaviour: 'gen_statem',
      },
      {
        path: 'src/xmpp_router.erl',
        name: 'xmpp_router.erl',
        content: CH12_STARTER_FILES['src/xmpp_router.erl'],
        behaviour: 'gen_server',
      },
    ],

    solutionFiles: CH12_SOLUTION_FILES,

    starterCode: CH12_STARTER_FILES['src/xmpp_sup.erl'],
    solutionCode: CH12_SOLUTION_FILES['src/xmpp_sup.erl'],

    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'supervisor',
        signature: 'supervisor:start_link(Module, Args) -> {ok, Pid} | {error, Reason}',
        typesSpec: ['Module = module()', 'Args = term()', 'Pid = pid()'],
        description: 'Creates a supervisor process as part of a supervision tree.',
        complexityNote: 'Synchronously invokes Module:init/1 and starts initial permanent child specs.',
        officialUrl: 'https://www.erlang.org/doc/man/supervisor.html#start_link-2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/supervisor.erl',
      },
      {
        functionName: 'start_link',
        module: 'gen_statem',
        signature: 'gen_statem:start_link(Module, Args, Opts) -> {ok, Pid} | {error, Reason}',
        typesSpec: ['Module = module()', 'Args = term()', 'Opts = [Option]'],
        description: 'Starts a generic state machine process in callback_mode state_functions.',
        complexityNote: 'Maintains state transitions and handles call/cast/info events with O(1) state dispatch.',
        officialUrl: 'https://www.erlang.org/doc/man/gen_statem.html#start_link-3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/gen_statem.erl',
      },
      {
        functionName: 'lookup',
        module: 'ets',
        signature: 'ets:lookup(Tab, Key) -> [Object]',
        typesSpec: ['Tab = atom() | tid()', 'Key = term()', 'Object = tuple()'],
        description: 'Returns a list of all objects with key Key in the table Tab.',
        complexityNote: 'O(1) average lookup on set tables; uses read_concurrency locks for lockless parallel reads.',
        officialUrl: 'https://www.erlang.org/doc/man/ets.html#lookup-2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/erl_db.c',
      },
      {
        functionName: 'monitor',
        module: 'erlang',
        signature: 'erlang:monitor(process, Item) -> MonitorRef',
        typesSpec: ['Item = pid() | atom() | {atom(), node()}', 'MonitorRef = reference()'],
        description: 'Sends a monitor request of type process to the entity identified by Item.',
        complexityNote: 'Unidirectional; guarantees {\'DOWN\', MonitorRef, process, Pid, Reason} is sent when target terminates.',
        officialUrl: 'https://www.erlang.org/doc/man/erlang.html#monitor-2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/bif.c',
      },
    ],

    visibleTestCases: [
      {
        id: 'tc-cap-1',
        title: 'Milestone 1: Supervision Tree Boot',
        erlangCall: 'begin catch xmpp_sup:stop(), {ok, SupPid} = xmpp_sup:start_link(), Res = is_pid(SupPid) andalso is_process_alive(SupPid), xmpp_sup:stop(), Res end',
        expectedOutput: 'true',
        explanation: 'Verifies the root supervisor boots with rest_for_one strategy and launches both workers.',
      },
      {
        id: 'tc-cap-2',
        title: 'Milestone 2: Fragmented XML Stream Framer',
        erlangCall: 'xmpp_stream_parser:feed_chunk(<<"<stream:str">>, <<"eam to=\'localhost\'><ping id=\'p1\'/>">>)',
        expectedOutput: '{[{stream_open, <<"localhost">>}, {ping, <<"p1">>}], <<>>}',
        explanation: 'Verifies the stream parser handles packet boundaries and unpins sub-binaries with binary:copy/1.',
      },
      {
        id: 'tc-cap-3',
        title: 'Milestone 3: ETS Session Registry & Highest Priority Lookup',
        erlangCall: 'begin catch xmpp_session_registry:stop(), {ok, _} = xmpp_session_registry:start_link(), ok = xmpp_session_registry:register_session(<<"alice@localhost/mobile">>, 5, self()), ok = xmpp_session_registry:register_session(<<"alice@localhost/desktop">>, 10, self()), Res = xmpp_session_registry:lookup_by_jid(<<"alice@localhost">>), xmpp_session_registry:stop(), Res =:= [self()] end',
        expectedOutput: 'true',
        explanation: 'Verifies session registration and bare JID priority dispatch.',
      },
      {
        id: 'tc-cap-4',
        title: 'Milestone 4: C2S Handshake State Transitions',
        erlangCall: 'begin {ok, C2SPid} = xmpp_c2s_statem:start_link(#{}), {ok, wait_for_sasl, _} = xmpp_c2s_statem:feed_xml(C2SPid, <<"<stream:stream to=\'localhost\'>">>), {ok, AuthState, _} = xmpp_c2s_statem:feed_xml(C2SPid, <<"<auth mechanism=\'PLAIN\'>alice</auth>">>), xmpp_c2s_statem:stop(C2SPid), AuthState end',
        expectedOutput: 'authenticated',
        explanation: 'Verifies SASL authentication advances state machine from wait_for_sasl to authenticated.',
      },
      {
        id: 'tc-cap-5',
        title: 'Milestone 5: Routing & Offline Fallback Queue',
        erlangCall: 'begin catch xmpp_router:stop(), {ok, _} = xmpp_router:start_link(), {queued_offline, Bare} = xmpp_router:route_stanza(<<"alice@localhost">>, <<"bob@localhost">>, <<"<message>Hi</message>">>), Count = xmpp_router:get_offline_count(<<"bob@localhost">>), xmpp_router:stop(), {Bare, Count} end',
        expectedOutput: '{<<"bob@localhost">>, 1}',
        explanation: 'Verifies message routing falls back to the in-memory offline message store when recipient is offline.',
      },
      {
        id: 'tc-cap-6',
        title: 'Milestone 6: Chaos Monkey Supervision Resilience',
        erlangCall: 'begin catch xmpp_sup:stop(), {ok, _} = xmpp_sup:start_link(), Reg1 = whereis(xmpp_session_registry), exit(Reg1, kill), timer:sleep(60), Reg2 = whereis(xmpp_session_registry), xmpp_sup:stop(), Reg2 =/= undefined andalso Reg2 =/= Reg1 end',
        expectedOutput: 'true',
        explanation: 'Verifies that killing the session registry triggers rest_for_one supervisor restart of both registry and router without bringing down the root tree.',
      },
    ],

    solutionExplanation:
      'The 5-module XMPP server coordinates stream framing, stateful connection FSMs, concurrent session tables, and routing under an OTP rest_for_one supervision hierarchy. All sub-binaries are copied to prevent memory bloat, and process monitors guarantee automatic session pruning upon client disconnection.',

    references: [
      {
        title: 'RFC 6120: Extensible Messaging and Presence Protocol (XMPP): Core',
        url: 'https://datatracker.ietf.org/doc/html/rfc6120',
        category: 'book_rfc',
        description: 'The official Internet standard for XML streams, TLS, SASL, and core stanza definitions.',
      },
      {
        title: 'RFC 6121: XMPP: Instant Messaging and Presence',
        url: 'https://datatracker.ietf.org/doc/html/rfc6121',
        category: 'book_rfc',
        description: 'Standards for presence subscriptions, directed presence, and message routing.',
      },
      {
        title: 'MongooseIM Architecture & C2S Engine',
        url: 'https://github.com/esl/MongooseIM',
        category: 'github_ecosystem',
        description: 'Industrial-scale enterprise Erlang XMPP server built by Erlang Solutions.',
      },
      {
        title: 'OTP gen_statem Behaviour Reference',
        url: 'https://www.erlang.org/doc/design_principles/statem.html',
        category: 'erlang_docs',
        description: 'Official OTP Design Principles for finite state machines with state_functions callback mode.',
      },
    ],
  },
];
