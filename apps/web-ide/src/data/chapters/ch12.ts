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
      'Subject the 5-module cluster to dynamic fault injection. Verify that killing xmpp_session_registry triggers rest_for_one supervisor cascades, safely terminating and restarting xmpp_router while preserving tree stability.',
    verificationHint:
      'Boot xmpp_sup, inject an abnormal exit into xmpp_session_registry, and verify the supervisor restarts both registry and router with fresh PIDs.',
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

Attach to local process registration with \`whereis/1\` when implementing \`stop/0\` so calling \`stop/0\` on an already-stopped supervisor returns \`ok\` instead of raising \`noproc\` *(see attached OTP \`supervisor\` card below)*.

---

### Chunked Reference Architecture (Domain-Neutral OTP Anatomy)

The generic \`billing_sup\` skeleton below shows how \`start_link/0\`, \`stop/0\`, and \`init/1\` fit together using OTP 29 map-based flags and child specifications (for a separate billing pipeline with different strategy and budget limits):

\`\`\`erlang
-module(billing_sup).
-behaviour(supervisor).
-export([start_link/0, stop/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> supervisor:stop(Pid)
    end.

init([]) ->
    SupFlags = #{strategy => one_for_all, intensity => 3, period => 30},
    Children = [
        #{
            id => tax_rate_cache,
            start => {tax_rate_cache, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [tax_rate_cache]
        }
    ],
    {ok, {SupFlags, Children}}.
\`\`\`

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
      codeSnippet: `MRef = erlang:monitor(process, C2sPid),
ets:insert(?TAB, {FullJid, BareJid, Resource, Priority, C2sPid, MRef})`,
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
    conceptMarkdown: "## Milestone 3: High-Concurrency ETS Tables & Process Monitors\n\n### Why This Matters in Production\nIn an enterprise messaging backend, hundreds of thousands of users are concurrently online, sending stanzas and presence updates. If every routing lookup had to be processed synchronously through a single coordinator actor's message queue, that actor's mailbox would quickly become a massive CPU bottleneck.\n\nTo achieve maximum throughput, BeamForge uses a **hybrid Actor + ETS architecture**:\n- **State Writes (Registration / Teardown)**: Handled by the `xmpp_session_registry` gen_server to establish process monitors and maintain consistency.\n- **State Reads (Message Routing Lookups)**: Any routing worker executes direct, concurrent, lock-free reads from the public ETS table using `{read_concurrency, true}`.\n\n> **ETS Registration Pipeline:** Client C2S processes register via `xmpp_session_registry:register_session/3`, which creates a unidirectional monitor (`erlang:monitor/2`) and inserts a record into the public ETS table `xmpp_sessions_tab` (`{read_concurrency, true}`).\n\n### Deep Concept Breakdown: Process Monitors vs Links\nWhy does the registry use `erlang:monitor(process, C2sPid)` instead of `link(C2sPid)`?\n- **Process Links (`link/1`)**: Links are **bidirectional**. If process A links to process B, and process B crashes with reason `killed` or `badmatch`, an exit signal is sent to process A. Unless process A explicitly traps exits with `process_flag(trap_exit, true)`, process A crashes too! In a registry tracking 50,000 client sockets, a bug in a client parser could bring down the entire registry.\n- **Process Monitors (`monitor/2`)**: Monitors are **unidirectional**. The registry monitors `C2sPid`, receiving a unique reference (`MonitorRef`). If `C2sPid` crashes or its TCP socket drops, the BEAM VM automatically delivers an asynchronous message to the registry's mailbox:\n  ```erlang\n  {'DOWN', MonitorRef, process, DeadPid, Reason}\n  ```\n  The registry handles this message inside `handle_info/2`, purges the dead process from the ETS table, and cleans up without disturbing any other connection!\n\n### Full JIDs vs Bare JIDs & Priority Dispatch (RFC 6121)\nIn the XMPP protocol:\n- **Full JID**: `alice@localhost/desktop` (identifies a specific client socket connection).\n- **Bare JID**: `alice@localhost` (identifies the account).\n\nA user may be logged in simultaneously from multiple devices (e.g. iPhone with priority `5`, Desktop workstation with priority `10`). When another user sends a message to the bare JID `alice@localhost`:\n1. The registry scans the ETS table for all sessions matching that bare JID.\n2. It sorts the matching sessions in descending order of `Priority`.\n3. It returns the PID of the session with the **highest numerical priority** (`[TopPid]`).\n\n### Step-by-Step Assignment Task\n1. Open `src/xmpp_session_registry.erl`.\n2. In `ensure_table/0`, create a named public table `xmpp_sessions_tab` with `[named_table, public, set, {read_concurrency, true}]`.\n3. In `handle_call({register_session, FullJidBin, Priority, C2sPid}, ...)`:\n   - Parse `{BareJid, Resource}` with `parse_jid/1`.\n   - Monitor the PID: `MRef = erlang:monitor(process, C2sPid)`.\n   - Insert into ETS: `ets:insert(?TAB, {FullJidBin, BareJid, Resource, Priority, C2sPid, MRef})`.\n   - Store `MRef => FullJidBin` in the `monitors` map in state.\n4. In `lookup_by_jid/1`:\n   - If `TargetJid` contains `<<\"/\">>` (Full JID): return `[Pid]` from `ets:lookup(?TAB, TargetJid)` or `[]`.\n   - If `TargetJid` is a Bare JID: query all records matching `BareJid`, sort by priority descending, and return `[TopPid]` (or `[]` if none online).\n5. In `handle_info({'DOWN', MRef, process, _DeadPid, _Reason}, State)`:\n   - Find the registered `FullJid` mapped to `MRef` in `State.monitors`.\n   - Delete the entry from the ETS table with `ets:delete(?TAB, FullJid)`.\n   - Remove `MRef` from the monitors map.",
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
Network protocol connections are fundamentally stateful. A client socket connected to port 5222 cannot simply begin sending chat stanzas immediately. The connection must strictly progress through authentication and resource binding gates:

1. It must initiate an XML stream and negotiate encryption/features.
2. It must authenticate identity via SASL PLAIN.
3. It must bind an authorized resource identifier (e.g. \`/obsidian\` or \`/desktop\`).
4. Only upon entering the **session_established** state is it permitted to route stanzas and receive incoming messages.

In Erlang/OTP, the premier abstraction for modeling complex connection lifecycles is the \`gen_statem\` behaviour using **\`callback_mode() -> state_functions\`**.

> **4-Phase Connection Lifecycle:** \`wait_for_stream\` (\`<stream:stream>\`) -> \`wait_for_sasl\` (\`<auth mechanism='PLAIN'>\`) -> \`authenticated\` (\`<iq bind>\`) -> \`session_established\` (real-time stanza routing).

### Deep Concept Breakdown: \`state_functions\` & \`process_events/4\`
In our industrial architecture, incoming chunks from either unit-test calls (\`{xml_chunk, Chunk}\`) or live TCP sockets (\`{tcp, Socket, Chunk}\`) are fed into \`xmpp_stream_parser:feed_chunk/2\`. The resulting list of structured XML events is then processed sequentially by \`process_events(Events, CurrentState, Data, OutXmlAcc)\`:

\`\`\`erlang
process_events([], State, Data, OutAcc) ->
    {State, Data, lists:reverse(OutAcc)};
\`\`\`

Each clause of \`process_events/4\` inspects the current protocol state:
- **\`wait_for_stream\`**: When \`{stream_open, Domain}\` arrives, respond with the opening stream header advertising SASL PLAIN, and advance state to \`wait_for_sasl\`.
- **\`wait_for_sasl\`**: When \`{sasl_auth, Mech, Payload}\` arrives, extract the username, reply with \`<success .../>\`, and advance state to \`authenticated\`.
- **Pre-Auth Security Rejection**: In \`wait_for_sasl\`, any unauthenticated message stanza (\`_PreAuthStanza\`) received before SASL authentication is completed MUST be rejected with:
  \`\`\`xml
  <stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>
  \`\`\`
  The state machine remains in \`wait_for_sasl\`.
- **\`authenticated\`**: When \`{iq_bind, Id, ResourceBin}\` arrives, default resource to \`<<"obsidian">\`, register in \`xmpp_session_registry\`, reply with the bound JID result IQ, and advance state to \`session_established\`.
- **\`session_established\`**: Normal chat stanzas are passed to \`xmpp_router:route_stanza/3\`.

### Active-Once TCP Flow Control & Mailbox Protection
In Erlang socket programming, we set the socket to \`{active, once}\` during \`init/1\` and after every received packet. The OS kernel delivers exactly one packet to the actor as an Erlang message \`{tcp, Socket, Data}\`, switching the socket to passive mode until we process it and re-enable active-once. This provides built-in TCP backpressure!

### Step-by-Step Assignment Task
1. Open \`src/xmpp_c2s_statem.erl\`.
2. In \`process_events([{stream_open, Domain} | Rest], wait_for_stream, Data, OutAcc)\`:
   - Construct \`Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>\`.
   - Recurse with \`wait_for_sasl\`, \`Data#{domain => Domain}\`, and \`[Reply | OutAcc]\`.
3. In \`process_events([{sasl_auth, _Mech, Payload} | Rest], wait_for_sasl, Data, OutAcc)\`:
   - Extract user: \`User = extract_user_from_sasl(Payload, maps:get(username, Data, <<"alice">>))\`.
   - Construct \`Reply = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>\`.
   - Recurse with \`authenticated\`, \`Data#{username => User}\`, and \`[Reply | OutAcc]\`.
4. In \`process_events([_PreAuthStanza | Rest], wait_for_sasl, Data, OutAcc)\`:
   - Construct \`Err = <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>\`.
   - Recurse with \`wait_for_sasl\`, \`Data\`, and \`[Err | OutAcc]\`.
5. In \`process_events([{stream_open, Domain} | Rest], authenticated, Data, OutAcc)\`:
   - Construct \`Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>">>\`.
   - Recurse with \`authenticated\`, \`Data#{domain => Domain}\`, and \`[Reply | OutAcc]\`.
6. In \`process_events([{iq_bind, Id, ResourceBin} | Rest], authenticated, Data, OutAcc)\`:
   - Format resource and \`FullJid = <<User/binary, "@", Domain/binary, "/", Res/binary>>\`.
   - Register: \`xmpp_session_registry:register_session(FullJid, maps:get(priority, Data, 10), self())\`.
   - Construct \`Reply = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>\`.
   - Recurse with \`session_established\`, \`Data#{resource => Res, full_jid => FullJid}\`, and \`[Reply | OutAcc]\`.`,
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
    conceptMarkdown: "## Milestone 5: Stanza Routing Engine & Offline Message Queue\n\n### Why This Matters in Production\nThe final piece of our production XMPP architecture is the **Stanza Router**. The router acts as the central messaging switchboard: it decouples client connection processes from each other. Individual C2S connection actors do not need to know where recipient sockets are hosted; they simply pass outgoing stanzas to `xmpp_router:route_stanza/3`.\n\nFurthermore, in mobile networks, users are frequently disconnected due to dead zones, subway tunnels, or app backgrounding. If a message arrives for an offline user, the router must safely spool the stanza in an offline message store so it can be delivered immediately upon the user's next login.\n\n> **Routing Dispatch Semantics:** Incoming stanzas query `xmpp_session_registry:lookup_by_jid/1`. If target PIDs are online, the stanza is dispatched directly (`Pid ! {deliver_stanza, Xml}`); if offline, it is spooled into the router's in-memory `offline_store` map.\n\n### Deep Concept Breakdown: Dispatch Semantics\nWhen `route_stanza(FromFullJid, ToJid, XmlBin)` is called:\n1. It queries `xmpp_session_registry:lookup_by_jid(ToJid)`.\n2. **If PIDs are found (User is Online)**:\n   It dispatches the raw XML directly to each target process's mailbox:\n   ```erlang\n   lists:foreach(fun(Pid) ->\n       Pid ! {deliver_stanza, binary:copy(XmlBin)}\n   end, TargetPids)\n   ```\n   And increments the internal `total_routed` telemetry counter.\n3. **If no PIDs are found (User is Offline)**:\n   It extracts the bare JID with `xmpp_session_registry:parse_jid(ToJid)`, retrieves the user's existing queue from the `offline_store` map (defaulting to `[]`), appends `binary:copy(XmlBin)`, and updates the map.\n\n### Offline Message Retrieval\nWhen a previously offline user finishes connecting and authenticating, their client requests unread messages:\n- `pop_offline_messages(TargetJid)`: Extracts all pending stanzas for that user's bare JID, deletes them from the `offline_store` map, and returns `{ok, StanzaList}`.\n- `get_offline_count(TargetJid)`: Returns an integer count of queued messages for monitoring.\n\n### Step-by-Step Assignment Task\n1. Open `src/xmpp_router.erl`.\n2. In `init/1`, initialize the state map with `offline_store => #{}` and `total_routed => 0`.\n3. In `handle_call({route_stanza, FromFullJid, ToJid, XmlBin}, ...)`:\n   - Query `xmpp_session_registry:lookup_by_jid(ToJid)`.\n   - If `TargetPids` is non-empty, deliver `{deliver_stanza, binary:copy(XmlBin)}` to each PID and return `{reply, {routed, length(TargetPids)}, NewState}`.\n   - If empty, append `binary:copy(XmlBin)` to `offline_store[BareJid]` and return `{reply, {queued_offline, BareJid}, NewState}`.\n4. In `handle_call({pop_offline, TargetJid}, ...)`:\n   - Extract messages for `BareJid`, remove key from `offline_store`, and return `{reply, {ok, Messages}, NewState}`.\n5. In `handle_call({get_offline_count, TargetJid}, ...)`:\n   - Return `{reply, length(Messages), State}`.",
  },
  {
    id: 'ch12-m6',
    milestoneId: 'm6-chaos',
    milestoneNumber: 6,
    title: 'Milestone 6: Chaos Monkey Resilience & Fault-Injection (xmpp_sup)',
    targetFile: 'src/xmpp_sup.erl',
    targetFunctions: ['start_link/0', 'stop/0', 'init/1'],
    verificationHint: 'Boot xmpp_sup, inject an abnormal exit into xmpp_session_registry, and verify the supervisor restarts both registry and router with fresh PIDs.',
    mentalModelCheck: {
      question: 'When xmpp_session_registry terminates abnormally under rest_for_one, why is xmpp_router terminated and restarted even if it experienced no internal errors?',
      codeSnippet: `#{strategy => rest_for_one, intensity => 5, period => 10}\n[RegistryChildSpec, RouterChildSpec]`,
      options: [
        {
          id: 'A',
          label: 'The router depends on the registry\'s ETS table. Restarting the router ensures it reconnects to the newly created ETS table rather than crashing on stale references.',
          isCorrect: true,
          explanation: 'Correct! Under rest_for_one, child processes booted after the failed process are terminated and restarted in forward sequence, guaranteeing all downstream dependencies re-synchronize with the fresh upstream state.',
        },
        {
          id: 'B',
          label: 'In OTP, rest_for_one is an alias for one_for_all and terminates all processes unconditionally.',
          isCorrect: false,
          explanation: 'rest_for_one only terminates siblings started after the failed process; earlier siblings remain unaffected.',
        },
        {
          id: 'C',
          label: 'The BEAM runtime automatically kills all processes that share the same atom table.',
          isCorrect: false,
          explanation: 'Process isolation guarantees that one process crash does not kill others unless linked or managed by a supervisor.',
        },
      ],
    },
    conceptMarkdown: "## Milestone 6: Chaos Monkey Resilience & 5-Module Integration\\n\\n### Why This Matters in Production\\nIn distributed messaging backends, testing happy paths is never enough. Production systems inevitably encounter network partitions, unexpected packet bursts, OOM kills, and runtime crashes. Erlang's core design philosophy—**'Let It Crash'**—is only effective if your supervision hierarchy deterministically recovers from failures without human intervention.\\n\\nIn this final milestone, you subject your complete 5-module XMPP cluster to **Chaos Monkey Fault Injection**: deliberately killing key worker processes and verifying that the supervision hierarchy cleanly self-heals.\\n\\n> **Chaos Invariant:** When `xmpp_session_registry` is killed with `exit(RegPid, kill)`, `xmpp_sup` must immediately detect the termination, kill all downstream children (`xmpp_router`), restart the registry (creating a fresh ETS table), and restart the router.\\n\\n### Supervision Cascade Mechanics\\nBecause `xmpp_sup` uses the `rest_for_one` strategy with child order `[xmpp_session_registry, xmpp_router]`:\\n\\n1. **Registry Crash**: If `xmpp_session_registry` terminates:\\n   - `xmpp_router` is terminated by the supervisor (because it was started *after* the registry).\\n   - `xmpp_session_registry` is started anew (`init([])` creates a new public ETS table).\\n   - `xmpp_router` is restarted, binding to the fresh registry.\\n2. **Router Crash**: If `xmpp_router` terminates:\\n   - Only `xmpp_router` is restarted.\\n   - `xmpp_session_registry` and all active client sessions remain completely undisturbed!\\n\\n### Step-by-Step Assignment Task\\n1. Open `src/xmpp_sup.erl`.\\n2. Ensure `stop/0` is exported and properly implemented using modern OTP 29 `supervisor:stop(Pid)`:\\n   ```erlang\\n   stop() ->\\n       case whereis(?MODULE) of\\n           undefined -> ok;\\n           Pid -> supervisor:stop(Pid)\\n       end.\\n   ```\\n3. Verify that `start_link/0` registers `{local, ?MODULE}`.\\n4. Click **Submit** to run the complete 6-stage verification suite, including the live Chaos Monkey resilience test!",
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

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

register_session(FullJid, Priority, C2sPid)
  when is_binary(FullJid), is_integer(Priority), is_pid(C2sPid) ->
    gen_server:call(?MODULE, {register_session, FullJid, Priority, C2sPid}).

unregister_session(FullJid) when is_binary(FullJid) ->
    gen_server:call(?MODULE, {unregister_session, FullJid}).

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

list_all_sessions() ->
    ensure_table(),
    ets:tab2list(?TAB).

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

start_link(Opts) when is_map(Opts) ->
    gen_statem:start_link(?MODULE, Opts, []).

feed_xml(Pid, XmlChunkBin) when is_pid(Pid), is_binary(XmlChunkBin) ->
    gen_statem:call(Pid, {xml_chunk, XmlChunkBin}).

get_session_info(Pid) when is_pid(Pid) ->
    gen_statem:call(Pid, get_session_info).

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

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

route_stanza(FromFullJid, ToJid, XmlBin)
  when is_binary(FromFullJid), is_binary(ToJid), is_binary(XmlBin) ->
    gen_server:call(?MODULE, {route_stanza, FromFullJid, ToJid, XmlBin}).

pop_offline_messages(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {pop_offline, TargetJid}).

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

// ── Starter Code Files (SCAFFOLDED WITH % TODO CHALLENGES - NOT PRE-SOLVED!) ─
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
  'src/xmpp_session_registry.erl': "-module(xmpp_session_registry).\n-behaviour(gen_server).\n\n-export([\n    start_link/0,\n    stop/0,\n    register_session/3,\n    unregister_session/1,\n    lookup_by_jid/1,\n    list_all_sessions/0,\n    parse_jid/1\n]).\n-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).\n\n-define(TAB, xmpp_sessions_tab).\n\nstart_link() ->\n    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).\n\nstop() ->\n    case whereis(?MODULE) of\n        undefined -> ok;\n        Pid -> gen_server:stop(Pid)\n    end.\n\nregister_session(FullJid, Priority, C2sPid)\n  when is_binary(FullJid), is_integer(Priority), is_pid(C2sPid) ->\n    gen_server:call(?MODULE, {register_session, FullJid, Priority, C2sPid}).\n\nunregister_session(FullJid) when is_binary(FullJid) ->\n    gen_server:call(?MODULE, {unregister_session, FullJid}).\n\n%% % TODO [Milestone 3 - Step 1]: Direct Concurrent ETS Lookup\n%% 1. Ensure table exists with ensure_table().\n%% 2. Check if TargetJid contains <<\"/\">>:\n%%    - If YES (Full JID): Use ets:lookup(?TAB, TargetJid).\n%%      If found, return [Pid]. If not found, return [].\n%%    - If NO (Bare JID): Find all sessions in ?TAB matching BareJid.\n%%      Sort matching sessions by Priority descending.\n%%      Return the list containing the single highest-priority PID: [TopPid], or [] if none.\nlookup_by_jid(TargetJid) when is_binary(TargetJid) ->\n    ensure_table(),\n    %% Implement lookup logic here:\n    [].\n\nlist_all_sessions() ->\n    ensure_table(),\n    ets:tab2list(?TAB).\n\nparse_jid(JidBin) when is_binary(JidBin) ->\n    case binary:split(JidBin, <<\"/\">>) of\n        [Bare, Res] -> {Bare, Res};\n        [Bare] -> {Bare, <<>>}\n    end.\n\nensure_table() ->\n    case ets:info(?TAB) of\n        undefined ->\n            ets:new(?TAB, [named_table, public, set, {read_concurrency, true}]);\n        _ ->\n            ?TAB\n    end.\n\ninit([]) ->\n    ensure_table(),\n    {ok, #{monitors => #{}}}.\n\n%% % TODO [Milestone 3 - Step 2]: Implement Session Registration & Monitoring\n%% 1. Call parse_jid(FullJidBin) to get {BareJid, Resource}.\n%% 2. Call MRef = erlang:monitor(process, C2sPid).\n%% 3. Insert record into ?TAB: {FullJidBin, BareJid, Resource, Priority, C2sPid, MRef}.\n%% 4. Save MRef => FullJidBin in State.monitors map.\n%% 5. Return {reply, ok, NewState}.\nhandle_call({register_session, FullJidBin, Priority, C2sPid}, _From, State) ->\n    ensure_table(),\n    %% Implement registration here:\n    {reply, ok, State};\n\n%% % TODO [Milestone 3 - Step 3]: Implement Session Unregistration\n%% 1. Look up FullJidBin in ?TAB to find MRef.\n%% 2. Demonitor with erlang:demonitor(MRef, [flush]).\n%% 3. Delete from ?TAB with ets:delete(?TAB, FullJidBin).\n%% 4. Return {reply, ok, State}.\nhandle_call({unregister_session, FullJidBin}, _From, State) ->\n    ensure_table(),\n    %% Implement unregistration here:\n    {reply, ok, State};\n\nhandle_call(_Req, _From, State) ->\n    {reply, {error, unknown_request}, State}.\n\nhandle_cast(_Msg, State) ->\n    {noreply, State}.\n\n%% % TODO [Milestone 3 - Step 4]: Process Monitor Termination Handler\n%% When a monitored C2S process terminates, the BEAM delivers:\n%% {'DOWN', MRef, process, DeadPid, Reason}\n%% 1. Find FullJid mapped to MRef in State.monitors.\n%% 2. Delete entry from ?TAB with ets:delete(?TAB, FullJid).\n%% 3. Remove MRef from the monitors map.\n%% 4. Return {noreply, NewState}.\nhandle_info({'DOWN', MRef, process, _DeadPid, _Reason}, State) ->\n    ensure_table(),\n    %% Implement monitor cleanup here:\n    {noreply, State};\n\nhandle_info(_Info, State) ->\n    {noreply, State}.\n\nterminate(_Reason, _State) ->\n    ok.\n",
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

start_link(Opts) when is_map(Opts) ->
    gen_statem:start_link(?MODULE, Opts, []).

feed_xml(Pid, XmlChunkBin) when is_pid(Pid), is_binary(XmlChunkBin) ->
    gen_statem:call(Pid, {xml_chunk, XmlChunkBin}).

get_session_info(Pid) when is_pid(Pid) ->
    gen_statem:call(Pid, get_session_info).

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

%% % TODO [Milestone 4 - Event Processing Engine]:
%% process_events(Events, CurrentState, Data, OutXmlAcc) -> {NextState, UpdatedData, OutXmlList}

process_events([], State, Data, OutAcc) ->
    {State, Data, lists:reverse(OutAcc)};

%% % TODO [Milestone 4 - Step 1]: Handle {stream_open, Domain} in wait_for_stream
%% Reply with stream header advertising SASL PLAIN mechanism:
%%   Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>
%% Advance state to 'wait_for_sasl', store domain in Data, append Reply to OutAcc.
process_events([{stream_open, Domain} | Rest], wait_for_stream, Data, OutAcc) ->
    %% Implement stream_open transition here:
    process_events(Rest, wait_for_stream, Data, OutAcc);

%% % TODO [Milestone 4 - Step 2]: Handle {sasl_auth, Mech, Payload} in wait_for_sasl
%% Extract username with extract_user_from_sasl(Payload, maps:get(username, Data, <<"alice">>))
%% Reply with success stanza: <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>
%% Advance state to 'authenticated', store username in Data, append Reply to OutAcc.
process_events([{sasl_auth, _Mech, Payload} | Rest], wait_for_sasl, Data, OutAcc) ->
    %% Implement sasl_auth transition here:
    process_events(Rest, wait_for_sasl, Data, OutAcc);

%% % TODO [Milestone 4 - Step 3]: Pre-Auth Security Rejection in wait_for_sasl
%% Any unauthenticated stanza received before SASL authentication completes MUST be rejected!
%% Reply with: <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>
%% Remain in wait_for_sasl state.
process_events([_PreAuthStanza | Rest], wait_for_sasl, Data, OutAcc) ->
    %% Implement pre-auth stanza rejection here:
    process_events(Rest, wait_for_sasl, Data, OutAcc);

%% % TODO [Milestone 4 - Step 4]: Handle {stream_open, Domain} in authenticated
%% After SASL success, client re-opens stream. Reply advertising bind feature:
%%   Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>">>
%% Remain in 'authenticated' state.
process_events([{stream_open, Domain} | Rest], authenticated, Data, OutAcc) ->
    %% Implement second stream_open response here:
    process_events(Rest, authenticated, Data, OutAcc);

%% % TODO [Milestone 4 - Step 5]: Handle {iq_bind, Id, ResourceBin} in authenticated
%% 1. Res = if ResourceBin == <<>> -> <<"obsidian">>; true -> ResourceBin end.
%% 2. FullJid = <<User/binary, "@", Domain/binary, "/", Res/binary>>.
%% 3. Register session: try xmpp_session_registry:register_session(FullJid, maps:get(priority, Data, 10), self()) catch _:_ -> ok end.
%% 4. Reply = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>.
%% 5. Advance state to 'session_established', update Data with resource and full_jid.
process_events([{iq_bind, Id, ResourceBin} | Rest], authenticated, Data, OutAcc) ->
    %% Implement resource binding and session registration here:
    process_events(Rest, authenticated, Data, OutAcc);

process_events([{chat_message, Id, ToJid, Body} | Rest], session_established, Data, OutAcc) ->
    FromJid = maps:get(full_jid, Data, <<"alice@localhost/obsidian">>),
    TargetJid = case ToJid of <<>> -> FromJid; T -> T end,
    StanzaXml = <<"<message from='", FromJid/binary, "' to='", TargetJid/binary, "' id='", Id/binary, "' type='chat'><body>", Body/binary, "</body></message>">>,
    _ = try xmpp_router:route_stanza(FromJid, TargetJid, StanzaXml) catch _:_ -> ok end,
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
  'src/xmpp_router.erl': "-module(xmpp_router).\n-behaviour(gen_server).\n\n-export([\n    start_link/0,\n    stop/0,\n    route_stanza/3,\n    pop_offline_messages/1,\n    get_offline_count/1\n]).\n-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).\n\nstart_link() ->\n    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).\n\nstop() ->\n    case whereis(?MODULE) of\n        undefined -> ok;\n        Pid -> gen_server:stop(Pid)\n    end.\n\nroute_stanza(FromFullJid, ToJid, XmlBin)\n  when is_binary(FromFullJid), is_binary(ToJid), is_binary(XmlBin) ->\n    gen_server:call(?MODULE, {route_stanza, FromFullJid, ToJid, XmlBin}).\n\npop_offline_messages(TargetJid) when is_binary(TargetJid) ->\n    gen_server:call(?MODULE, {pop_offline, TargetJid}).\n\nget_offline_count(TargetJid) when is_binary(TargetJid) ->\n    gen_server:call(?MODULE, {get_offline_count, TargetJid}).\n\ninit([]) ->\n    {ok, #{offline_store => #{}, total_routed => 0}}.\n\n%% % TODO [Milestone 5 - Step 1]: Online Routing vs Offline Fallback Spooling\n%% 1. Query target recipients with xmpp_session_registry:lookup_by_jid(ToJid).\n%% 2. If target PIDs exist ([_ | _]):\n%%    - For each Pid, send: Pid ! {deliver_stanza, binary:copy(XmlBin)}\n%%    - Increment total_routed counter\n%%    - Return {reply, {routed, length(TargetPids)}, UpdatedState}\n%% 3. If no target PIDs exist (recipient is offline: []):\n%%    - Parse BareJid with xmpp_session_registry:parse_jid(ToJid)\n%%    - Append binary:copy(XmlBin) to list for BareJid in State.offline_store\n%%    - Return {reply, {queued_offline, BareJid}, UpdatedState}\nhandle_call({route_stanza, _FromFullJid, ToJid, XmlBin}, _From, State) ->\n    %% Implement online delivery vs offline queueing here:\n    {reply, {queued_offline, ToJid}, State};\n\n%% % TODO [Milestone 5 - Step 2]: Pop Offline Messages for Target JID\n%% 1. Parse BareJid with xmpp_session_registry:parse_jid(TargetJid).\n%% 2. Get list of queued messages from State.offline_store (default []).\n%% 3. Remove BareJid from State.offline_store map.\n%% 4. Return {reply, {ok, Messages}, UpdatedState}.\nhandle_call({pop_offline, TargetJid}, _From, State) ->\n    %% Implement offline message retrieval here:\n    {reply, {ok, []}, State};\n\n%% % TODO [Milestone 5 - Step 3]: Get Count of Offline Messages\n%% 1. Parse BareJid with xmpp_session_registry:parse_jid(TargetJid).\n%% 2. Return {reply, length(Messages), State}.\nhandle_call({get_offline_count, TargetJid}, _From, State) ->\n    %% Implement offline count query here:\n    {reply, 0, State};\n\nhandle_call(_Req, _From, State) ->\n    {reply, {error, unknown_request}, State}.\n\nhandle_cast(_Msg, State) ->\n    {noreply, State}.\n\nhandle_info(_Info, State) ->\n    {noreply, State}.\n\nterminate(_Reason, _State) ->\n    ok.\n",
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

Welcome to the **BeamForge Final Capstone**. In this capstone project, you unify all concepts mastered across the curriculum—immutable functional terms, tail-call recursion, binary packet framing, lightweight BEAM actors, OTP \`gen_server\` and \`gen_statem\` behaviours, crash-resilient shared ETS tables, and ordered \`rest_for_one\` supervision trees—into a **fully functional, production-grade XMPP chat server**.

### The 5 Interconnected Modules
1. **Module 1 (\`src/xmpp_sup.erl\`):** The root OTP supervisor using \`rest_for_one\` restart strategy.
2. **Module 2 (\`src/xmpp_stream_parser.erl\`):** High-speed binary XML framer that handles TCP chunk fragmentation.
3. **Module 3 (\`src/xmpp_session_registry.erl\`):** Shared concurrent ETS table storing active user sessions with Erlang process monitors (\`erlang:monitor/2\`).
4. **Module 4 (\`src/xmpp_c2s_statem.erl\`):** Client-to-server connection state machine implementing the 4-phase XMPP lifecycle.
5. **Module 5 (\`src/xmpp_router.erl\`):** Message routing engine with online delivery and fallback offline queue.`,

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
