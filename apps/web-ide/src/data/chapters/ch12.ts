import { LessonContent, CapstoneMilestone, MentalModelCheckSpec } from '../../types/workspace';

// ── Capstone Milestones Definition for Chapter 12 ────────────────────────────
export const CH12_CAPSTONE_MILESTONES: CapstoneMilestone[] = [
  {
    id: 'm1-sup',
    number: 1,
    title: 'Root Supervisor Tree (xmpp_sup)',
    targetFile: 'src/xmpp_sup.erl',
    targetFunctions: ['start_link/0', 'init/1'],
    description:
      'Configure the root OTP supervisor using rest_for_one restart strategy with intensity 5 and period 10. Order child specs so xmpp_session_registry boots before xmpp_router to prevent stale ETS lookups.',
    verificationHint:
      'Call xmpp_sup:start_link(), inspect child processes with supervisor:which_children(xmpp_sup), and verify both xmpp_session_registry and xmpp_router are running as supervised permanent workers.',
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
    targetFunctions: ['start_link/0', 'init/1'],
    verificationHint: 'Call xmpp_sup:start_link(), inspect child processes with supervisor:which_children(xmpp_sup), and verify both xmpp_session_registry and xmpp_router are running as supervised permanent workers.',
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
    conceptMarkdown: "## Milestone 1: The Root OTP Supervisor Hierarchy\n\n### Why This Matters in Production\nIn production telecom backends, distributed message brokers, and mission-critical chat platforms (like WhatsApp, Discord, or ejabberd), software failure is not an unexpected anomaly—it is a guaranteed certainty. Hardware degrades, network sockets terminate abruptly, out-of-spec client frames trigger badmatch exceptions, and memory spikes occur under load.\n\nThe Erlang/OTP philosophy does not attempt to wrap every single line of code in defensive try/catch blocks. Instead, it embraces the **\"Let It Crash\"** design pattern. By structuring processes into a strict, hierarchical **Supervision Tree**, crashes are localized to small worker processes, while supervisor actors immediately restore deterministic state through automated, ordered restarts.\n\n> **Supervision Hierarchy:** `xmpp_sup` (`rest_for_one`) supervises `xmpp_session_registry` (Child 1: ETS Shared Table Owner) and `xmpp_router` (Child 2: Message Dispatcher & Offline Spooler).\n\n### Deep Concept Breakdown: Choosing the Supervisor Strategy\nThe core architectural decision in any supervisor is selecting the correct restart strategy from the 4 OTP strategies:\n\n1. **`one_for_one`**: If a child terminates, only that child is restarted.\n   - *Why it is DANGEROUS here:* The message router (`xmpp_router`) directly queries the in-memory ETS table owned by the session registry (`xmpp_session_registry`). If the registry crashes and restarts under `one_for_one`, its in-memory ETS table is deleted and recreated. If `xmpp_router` were left running, any concurrent lookup against the old table identifier causes silent routing dropouts or crashes!\n\n2. **`one_for_all`**: If any child terminates, all other children are terminated and restarted.\n   - *Why it is UNNECESSARILY DISRUPTIVE here:* If `xmpp_router` crashes due to a malformed XML stanza, there is zero reason to kill `xmpp_session_registry` and disconnect thousands of active client sessions!\n\n3. **`rest_for_one`**: If a child process terminates, any child process started **after** it in the specification list is terminated and restarted in order.\n   - *Why it is PERFECT here:* `xmpp_session_registry` is child #1, and `xmpp_router` is child #2. If the registry terminates, the router (started *after* it) is automatically terminated and cleanly restarted against the newly initialized registry. But if the router crashes, the registry is left untouched!\n\n```\nProcess Startup Order:     1. xmpp_session_registry  -->  2. xmpp_router\nShutdown on Crash of #1:   1. Terminate xmpp_router  -->  2. Restart xmpp_session_registry  -->  3. Restart xmpp_router\nShutdown on Crash of #2:   1. Restart xmpp_router only (Registry untouched!)\n```\n\n### Supervisor Specification Anatomy\nA supervisor callback module implements `init/1` and returns `{ok, {SupFlags, ChildSpecs}}`.\n\n```erlang\nSupFlags = #{\n    strategy  => rest_for_one, %% Restart subsequent siblings on crash\n    intensity => 5,            %% Maximum 5 restarts...\n    period    => 10            %% ...within a 10-second sliding time window\n}.\n```\n\nEach child specification in `ChildSpecs` is defined as a map:\n- **`id`**: Unique atom identifier (`xmpp_session_registry`, `xmpp_router`).\n- **`start`**: The MFA tuple `{Module, Function, Args}` invoked by the supervisor to spawn the process (e.g., `{xmpp_session_registry, start_link, []}`).\n- **`restart`**: `permanent` specifies that the child worker must always be restarted if it terminates.\n- **`shutdown`**: Grace period in milliseconds (`2000`) allowing the process to execute its `terminate/2` callback before the supervisor issues a brutal kill.\n- **`type`**: `worker` (designating an actor performing business logic, as opposed to a nested `supervisor`).\n- **`modules`**: `[Module]` containing callback modules for BEAM code hot-reloading.\n\n### Step-by-Step Assignment Task\n1. Open `src/xmpp_sup.erl`.\n2. In `start_link/0`, register and boot the root supervisor locally under `?MODULE`:\n   `supervisor:start_link({local, ?MODULE}, ?MODULE, []).`\n3. In `init/1`, configure `SupFlags` with:\n   - `strategy => rest_for_one`\n   - `intensity => 5`\n   - `period => 10`\n4. In `ChildSpecs`, declare:\n   - Child 1: `xmpp_session_registry` (permanent worker, 2000ms shutdown, start MFA `{xmpp_session_registry, start_link, []}`)\n   - Child 2: `xmpp_router` (permanent worker, 2000ms shutdown, start MFA `{xmpp_router, start_link, []}`)\n5. Return `{ok, {SupFlags, ChildSpecs}}`.\n\n### Verification & Testing\nWhen you click **Submit Milestone**, the test runner boots `xmpp_sup:start_link()`, calls `supervisor:which_children(xmpp_sup)`, verifies that both worker PIDs are alive, and validates that the restart strategy is strictly `rest_for_one`.",
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
    conceptMarkdown: "## Milestone 2: Binary TCP Stream Framing & Memory Unpinning\n\n### Why This Matters in Production\nTCP is a streaming byte protocol, not a message-oriented protocol. When an XMPP client on an iPhone or Android device sends a packet over cellular LTE or Wi-Fi, the network stack does **not** preserve application message boundaries.\n\nAn XML stanza like `<message to='alice@localhost'><body>Hello</body></message>` can be fragmented across two separate TCP packets by OS buffer flushing, IP MTU segmentation, or Nagle's algorithm:\n\n```\nTCP Packet 1: <<\"<message to='alice@localhost'><body>Hel\">>\nTCP Packet 2: <<\"lo</body></message><ping id='p1'/>\">>\n```\n\nIf your server attempts to parse each TCP packet in isolation with a standard XML parser, it will crash with a syntax error on Packet 1! A production network server must implement an **incremental accumulator pattern** that buffers incomplete trailing bytes and extracts complete protocol frames across packet arrivals.\n\n### Deep Concept Breakdown: Sub-Binary Heap Retention Leaks\nErlang's binary pattern matching is the fastest in the industry because binary slicing (`<<Slice:Len/binary, Rest/binary>> = Bin`) is an **O(1)** operation. It does not copy memory; it creates a lightweight `sub_binary` reference pointing directly into the original parent binary allocation.\n\nHowever, this creates a notorious BEAM memory leak known as **Sub-Binary Retention**:\n- In Erlang, binaries larger than 64 bytes are allocated in a global off-heap memory area called **ProcBins** (reference-counted binaries).\n- Suppose your server reads a 64KB TCP buffer from a socket.\n- Your parser slices out a 4-byte username `<<\"alex\">>` and stores it inside the user's persistent session state.\n- **THE PITFALL:** The BEAM garbage collector *cannot* free the 64KB parent binary as long as that 4-byte slice exists! If your server handles 100,000 users, you have just pinned 6.4 GB of dead TCP buffer memory in RAM!\n\n> **Memory Pinning Rule:** Without `binary:copy/1`, a 4-byte username slice pins the entire 64 KB TCP buffer in RAM. With `binary:copy/1`, the slice is copied to the local process heap, allowing the 64 KB off-heap ProcBin buffer to be reclaimed immediately.\n\n> **MANDATORY PRODUCTION RULE:** Whenever you extract an attribute string or XML body payload that will outlive the current function call, always pass it through `binary:copy/1`. This forces a fresh, unpinned heap allocation and allows the underlying TCP buffer to be immediately reclaimed by garbage collection.\n\n### Protocol Stanzas to Recognize\nYour framer must recognize and emit:\n- `<stream:stream to='...'>` -> `{stream_open, Domain}`\n- `</stream:stream>` -> `stream_close`\n- `<ping id='...'/>` -> `{ping, Id}`\n- `<auth mechanism='...'>user</auth>` -> `{sasl_auth, Mechanism, Payload}`\n- `<iq id='...'><resource>res</resource></iq>` -> `{iq_bind, Id, Resource}`\n- `<message id='...' to='...'><body>text</body></message>` -> `{chat_message, Id, To, Body}`\n\n### Step-by-Step Assignment Task\n1. Open `src/xmpp_stream_parser.erl`.\n2. In `feed_chunk(BufferBin, IncomingBin)`, concatenate `<<BufferBin/binary, IncomingBin/binary>>` and invoke `extract_events(Combined, [])`.\n3. In `extract_events/2`, handle whitespace trimming and pattern match each stanza:\n   - For `<ping`: match `<<\"/>\">>`, extract `\"id\"` attribute with `binary:copy/1`, and emit `{ping, Id}`.\n   - For `<auth`: match closing `<<\"</auth>\">>`, extract `\"mechanism\"` attribute and body, copy with `binary:copy/1`, and emit `{sasl_auth, Mech, Payload}`.\n   - For `<iq`: match closing `<<\"</iq>\">>`, extract `\"id\"` and `<resource>` body, copy with `binary:copy/1`, and emit `{iq_bind, Id, Res}`.\n   - For `<message`: match closing `<<\"</message>\">>`, extract `\"id\"`, `\"to\"`, and `<body>` body, copy with `binary:copy/1`, and emit `{chat_message, Id, To, Body}`.\n4. If the trailing bytes contain an incomplete XML element, return `{lists:reverse(Acc), binary:copy(CleanBin)}` so the leftover bytes are preserved for the next chunk!",
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
    conceptMarkdown: "## Milestone 4: Client-to-Server State Machine (`gen_statem`)\n\n### Why This Matters in Production\nNetwork protocol connections are fundamentally stateful. A client socket connected to port 5222 cannot simply begin sending chat stanzas immediately. The connection must strictly progress through authentication and resource binding gates:\n\n1. It must initiate an XML stream and negotiate encryption/features.\n2. It must authenticate identity via SASL PLAIN.\n3. It must bind an authorized resource identifier (e.g. `/mobile` or `/web`).\n4. Only upon entering the **established** state is it permitted to route stanzas and receive incoming messages.\n\nIn Erlang/OTP, the premier abstraction for modeling complex connection lifecycles is the `gen_statem` behaviour using **`callback_mode() -> state_functions`**.\n\n> **4-Phase Connection Lifecycle:** `wait_for_stream` (`<stream:stream>`) -> `wait_for_sasl` (`<auth mechanism='PLAIN'>`) -> `authenticated` (`<iq bind>`) -> `session_established` (real-time stanza routing).\n\n### Deep Concept Breakdown: `state_functions` vs `handle_event_function`\n`gen_statem` supports two callback modes:\n- **`handle_event_function`**: A single central callback `handle_event/4` with large nested `case StateName of ...` statements. This quickly becomes unwieldy in production.\n- **`state_functions` (RECOMMENDED)**: Each state in the state machine is represented by an individual Erlang function named after that state, with arity 3:\n  ```erlang\n  StateName(EventType, EventContent, Data) ->\n      {next_state, NextStateName, NewData, Actions}.\n  ```\n  This provides compile-time isolation between protocol phases: code handling SASL tokens cannot accidentally execute while in the established chat state!\n\n### Active-Once TCP Flow Control & Mailbox Protection\nHow does a production Erlang server prevent a rogue client from flooding the BEAM process with millions of TCP packets?\n- In Erlang socket programming, we set the socket to `{active, once}`.\n- The OS kernel delivers exactly one packet to the actor as an Erlang message `{tcp, Socket, Data}`, and then immediately switches the socket to passive mode!\n- The actor parses the chunk, processes the state transition, and only when it is ready calls `inet:setopts(Socket, [{active, once}])` to request the next packet. This provides built-in TCP backpressure!\n\n### Step-by-Step Assignment Task\n1. Open `src/xmpp_c2s_statem.erl`.\n2. Implement `wait_for_stream({call, From}, {feed_xml, XmlBin}, Data)`:\n   - Parse `XmlBin` with `xmpp_stream_parser:feed_chunk/2`.\n   - On `{stream_open, Domain}`: reply with stream features XML advertising SASL PLAIN, and transition to `wait_for_sasl`.\n3. Implement `wait_for_sasl({call, From}, {feed_xml, XmlBin}, Data)`:\n   - On `{sasl_auth, <<\"PLAIN\">>, Payload}`: extract the username, reply with `<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>`, store `user` in state data, and advance to `authenticated`.\n4. Implement `authenticated({call, From}, {feed_xml, XmlBin}, Data)`:\n   - On `{iq_bind, Id, Resource}`: construct full JID `user@domain/resource`, register the session in `xmpp_session_registry:register_session/3`, reply with result IQ containing the bound JID, and advance to `session_established`.\n5. Implement `session_established`:\n   - Handle incoming chat messages and dispatch them via `xmpp_router:route_stanza/3`.\n   - Handle `{info, {deliver_stanza, StanzaXml}}` and forward the stanza to the attached client socket.",
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
];

export const CH12_SOLUTION_FILES: Record<string, string> = {
  'src/xmpp_sup.erl': `-module(xmpp_sup).
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

new_buffer() ->
    <<>>.

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
            catch xmpp_session_registry:unregister_session(FullJid),
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
    catch xmpp_session_registry:register_session(FullJid, maps:get(priority, Data, 10), self()),
    Reply = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>,
    process_events(Rest, session_established, Data#{resource => Res, full_jid => FullJid}, [Reply | OutAcc]);

process_events([{chat_message, Id, ToJid, Body} | Rest], session_established, Data, OutAcc) ->
    FromJid = maps:get(full_jid, Data, <<"alice@localhost/obsidian">>),
    TargetJid = case ToJid of <<>> -> FromJid; T -> T end,
    StanzaXml = <<"<message from='", FromJid/binary, "' to='", TargetJid/binary, "' id='", Id/binary, "' type='chat'><body>", Body/binary, "</body></message>">>,
    _ = (catch xmpp_router:route_stanza(FromJid, TargetJid, StanzaXml)),
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
    catch gen_tcp:send(Socket, Data),
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
  'src/xmpp_sup.erl': "-module(xmpp_sup).\n-behaviour(supervisor).\n\n-export([start_link/0, init/1]).\n\nstart_link() ->\n    supervisor:start_link({local, ?MODULE}, ?MODULE, []).\n\ninit([]) ->\n    %% % TODO [Milestone 1 - Step 1]: Configure the Root Supervisor Flags\n    %% Set:\n    %%   strategy  => rest_for_one  (router depends on registry, so if registry restarts, router must too)\n    %%   intensity => 5             (allow up to 5 restarts)\n    %%   period    => 10            (within a 10-second window)\n    SupFlags = #{\n        strategy => rest_for_one,\n        intensity => 5,\n        period => 10\n    },\n\n    %% % TODO [Milestone 1 - Step 2]: Declare the Ordered Child Specifications\n    %% Under rest_for_one, child startup order is critical!\n    %% Child 1 (xmpp_session_registry):\n    %%   - id: xmpp_session_registry\n    %%   - start: {xmpp_session_registry, start_link, []}\n    %%   - restart: permanent\n    %%   - shutdown: 2000\n    %%   - type: worker\n    %%   - modules: [xmpp_session_registry]\n    %%\n    %% Child 2 (xmpp_router):\n    %%   - id: xmpp_router\n    %%   - start: {xmpp_router, start_link, []}\n    %%   - restart: permanent\n    %%   - shutdown: 2000\n    %%   - type: worker\n    %%   - modules: [xmpp_router]\n    ChildSpecs = [\n        %% Add child specification map for xmpp_session_registry here:\n\n        %% Add child specification map for xmpp_router here:\n\n    ],\n    {ok, {SupFlags, ChildSpecs}}.\n",
  'src/xmpp_stream_parser.erl': "-module(xmpp_stream_parser).\n-export([new_buffer/0, feed_chunk/2, extract_attr/2, extract_tag_body/2]).\n\nnew_buffer() ->\n    <<>>.\n\nfeed_chunk(BufferBin, IncomingBin) when is_binary(BufferBin), is_binary(IncomingBin) ->\n    Combined = <<BufferBin/binary, IncomingBin/binary>>,\n    extract_events(Combined, []).\n\nextract_events(Bin, Acc) ->\n    CleanBin = trim_leading_ws(Bin),\n    case CleanBin of\n        <<>> ->\n            {lists:reverse(Acc), <<>>};\n\n        <<\"</stream:stream>\", Rest/binary>> ->\n            extract_events(Rest, [stream_close | Acc]);\n\n        <<\"<stream:stream\", _/binary>> ->\n            case binary:match(CleanBin, <<\">\">>) of\n                {Pos, 1} ->\n                    HeaderLen = Pos + 1,\n                    <<HeaderBin:HeaderLen/binary, Rest/binary>> = CleanBin,\n                    Domain = binary:copy(extract_attr(HeaderBin, <<\"to\">>, <<\"localhost\">>)),\n                    extract_events(Rest, [{stream_open, Domain} | Acc]);\n                nomatch ->\n                    {lists:reverse(Acc), binary:copy(CleanBin)}\n            end;\n\n        %% % TODO [Milestone 2 - Step 1]: Parse self-closing <ping id='...'/>\n        %% 1. Match prefix <<\"<ping\", _/binary>>.\n        %% 2. Check for closing <<\"/>\">>. If incomplete, return {lists:reverse(Acc), binary:copy(CleanBin)}.\n        %% 3. Extract the \"id\" attribute (default <<\"ping_1\">>).\n        %% 4. CRITICAL: Unpin with binary:copy/1!\n        %% 5. Recurse with [{ping, Id} | Acc].\n        <<\"<ping\", _/binary>> ->\n            %% Implement ping stanza extraction here:\n            {lists:reverse(Acc), binary:copy(CleanBin)};\n\n        %% % TODO [Milestone 2 - Step 2]: Parse <auth mechanism='...'>payload</auth>\n        %% 1. Use extract_closed_tag(CleanBin, <<\"</auth>\">>, Fun, Acc).\n        %% 2. In Fun, extract attribute \"mechanism\" (default <<\"PLAIN\">>).\n        %% 3. Extract tag body using extract_tag_body(FrameBin, <<\"auth\">>).\n        %% 4. CRITICAL: Unpin both strings with binary:copy/1!\n        %% 5. Return event: {sasl_auth, Mech, Payload}.\n        <<\"<auth\", _/binary>> ->\n            %% Implement sasl auth stanza extraction here:\n            {lists:reverse(Acc), binary:copy(CleanBin)};\n\n        %% % TODO [Milestone 2 - Step 3]: Parse <iq id='...'><resource>res</resource></iq>\n        %% 1. Use extract_closed_tag(CleanBin, <<\"</iq>\">>, Fun, Acc).\n        %% 2. In Fun, extract attribute \"id\" (default <<\"bind_1\">>).\n        %% 3. Extract resource body using extract_tag_body(FrameBin, <<\"resource\">>).\n        %% 4. Unpin with binary:copy/1, and return: {iq_bind, Id, Res}.\n        <<\"<iq\", _/binary>> ->\n            %% Implement iq bind stanza extraction here:\n            {lists:reverse(Acc), binary:copy(CleanBin)};\n\n        %% % TODO [Milestone 2 - Step 4]: Parse <message id='...' to='...'><body>body</body></message>\n        %% 1. Use extract_closed_tag(CleanBin, <<\"</message>\">>, Fun, Acc).\n        %% 2. In Fun, extract \"id\" (default <<\"msg_1\">>), \"to\" (default <<>>), and body with extract_tag_body/2.\n        %% 3. Unpin all three with binary:copy/1, and return: {chat_message, Id, To, Body}.\n        <<\"<message\", _/binary>> ->\n            %% Implement chat message stanza extraction here:\n            {lists:reverse(Acc), binary:copy(CleanBin)};\n\n        Other ->\n            {lists:reverse(Acc), binary:copy(Other)}\n    end.\n\n%% ── Helper Framing Utilities (Pre-built for you) ─────────────────────────────\nextract_closed_tag(Bin, CloseTag, Fun, Acc) ->\n    CloseTagLen = byte_size(CloseTag),\n    case binary:match(Bin, CloseTag) of\n        {Pos, CloseTagLen} ->\n            TotalLen = Pos + CloseTagLen,\n            <<FrameBin:TotalLen/binary, Rest/binary>> = Bin,\n            Event = Fun(FrameBin),\n            extract_events(Rest, [Event | Acc]);\n        nomatch ->\n            {lists:reverse(Acc), binary:copy(Bin)}\n    end.\n\nextract_attr(Bin, AttrName) ->\n    extract_attr(Bin, AttrName, <<>>).\n\nextract_attr(Bin, AttrName, Default) ->\n    Key1 = <<AttrName/binary, 61, 34>>,\n    Key2 = <<AttrName/binary, 61, 39>>,\n    case find_attr_val(Bin, Key1, <<34>>) of\n        {ok, Val} -> Val;\n        nomatch ->\n            case find_attr_val(Bin, Key2, <<39>>) of\n                {ok, Val} -> Val;\n                nomatch -> Default\n            end\n    end.\n\nfind_attr_val(Bin, Key, QuoteChar) ->\n    case binary:match(Bin, Key) of\n        {Pos, Len} ->\n            Start = Pos + Len,\n            <<_:Start/binary, Rem/binary>> = Bin,\n            case binary:match(Rem, QuoteChar) of\n                {ValLen, _} ->\n                    <<Val:ValLen/binary, _/binary>> = Rem,\n                    {ok, Val};\n                nomatch ->\n                    nomatch\n            end;\n        nomatch ->\n            nomatch\n    end.\n\nextract_tag_body(Bin, TagName) ->\n    OpenTag = <<\"<\", TagName/binary>>,\n    CloseTag = <<\"</\", TagName/binary, \">\">>,\n    case binary:match(Bin, OpenTag) of\n        {PosOpen, _} ->\n            <<_:PosOpen/binary, Rem1/binary>> = Bin,\n            case binary:match(Rem1, <<\">\">>) of\n                {PosCloseOpen, 1} ->\n                    ContentStart = PosCloseOpen + 1,\n                    <<_:ContentStart/binary, Rem2/binary>> = Rem1,\n                    case binary:match(Rem2, CloseTag) of\n                        {BodyLen, _} ->\n                            <<Body:BodyLen/binary, _/binary>> = Rem2,\n                            Body;\n                        nomatch ->\n                            <<>>\n                    end;\n                nomatch ->\n                    <<>>\n            end;\n        nomatch ->\n            <<>>\n    end.\n\ntrim_leading_ws(<<C, Rest/binary>>) when C =:= 32; C =:= 9; C =:= 10; C =:= 13 ->\n    trim_leading_ws(Rest);\ntrim_leading_ws(Bin) ->\n    Bin.\n",
  'src/xmpp_session_registry.erl': "-module(xmpp_session_registry).\n-behaviour(gen_server).\n\n-export([\n    start_link/0,\n    stop/0,\n    register_session/3,\n    unregister_session/1,\n    lookup_by_jid/1,\n    list_all_sessions/0,\n    parse_jid/1\n]).\n-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).\n\n-define(TAB, xmpp_sessions_tab).\n\nstart_link() ->\n    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).\n\nstop() ->\n    case whereis(?MODULE) of\n        undefined -> ok;\n        Pid -> gen_server:stop(Pid)\n    end.\n\nregister_session(FullJid, Priority, C2sPid)\n  when is_binary(FullJid), is_integer(Priority), is_pid(C2sPid) ->\n    gen_server:call(?MODULE, {register_session, FullJid, Priority, C2sPid}).\n\nunregister_session(FullJid) when is_binary(FullJid) ->\n    gen_server:call(?MODULE, {unregister_session, FullJid}).\n\n%% % TODO [Milestone 3 - Step 1]: Direct Concurrent ETS Lookup\n%% 1. Ensure table exists with ensure_table().\n%% 2. Check if TargetJid contains <<\"/\">>:\n%%    - If YES (Full JID): Use ets:lookup(?TAB, TargetJid).\n%%      If found, return [Pid]. If not found, return [].\n%%    - If NO (Bare JID): Find all sessions in ?TAB matching BareJid.\n%%      Sort matching sessions by Priority descending.\n%%      Return the list containing the single highest-priority PID: [TopPid], or [] if none.\nlookup_by_jid(TargetJid) when is_binary(TargetJid) ->\n    ensure_table(),\n    %% Implement lookup logic here:\n    [].\n\nlist_all_sessions() ->\n    ensure_table(),\n    ets:tab2list(?TAB).\n\nparse_jid(JidBin) when is_binary(JidBin) ->\n    case binary:split(JidBin, <<\"/\">>) of\n        [Bare, Res] -> {Bare, Res};\n        [Bare] -> {Bare, <<>>}\n    end.\n\nensure_table() ->\n    case ets:info(?TAB) of\n        undefined ->\n            ets:new(?TAB, [named_table, public, set, {read_concurrency, true}]);\n        _ ->\n            ?TAB\n    end.\n\ninit([]) ->\n    ensure_table(),\n    {ok, #{monitors => #{}}}.\n\n%% % TODO [Milestone 3 - Step 2]: Implement Session Registration & Monitoring\n%% 1. Call parse_jid(FullJidBin) to get {BareJid, Resource}.\n%% 2. Call MRef = erlang:monitor(process, C2sPid).\n%% 3. Insert record into ?TAB: {FullJidBin, BareJid, Resource, Priority, C2sPid, MRef}.\n%% 4. Save MRef => FullJidBin in State.monitors map.\n%% 5. Return {reply, ok, NewState}.\nhandle_call({register_session, FullJidBin, Priority, C2sPid}, _From, State) ->\n    ensure_table(),\n    %% Implement registration here:\n    {reply, ok, State};\n\n%% % TODO [Milestone 3 - Step 3]: Implement Session Unregistration\n%% 1. Look up FullJidBin in ?TAB to find MRef.\n%% 2. Demonitor with erlang:demonitor(MRef, [flush]).\n%% 3. Delete from ?TAB with ets:delete(?TAB, FullJidBin).\n%% 4. Return {reply, ok, State}.\nhandle_call({unregister_session, FullJidBin}, _From, State) ->\n    ensure_table(),\n    %% Implement unregistration here:\n    {reply, ok, State};\n\nhandle_call(_Req, _From, State) ->\n    {reply, {error, unknown_request}, State}.\n\nhandle_cast(_Msg, State) ->\n    {noreply, State}.\n\n%% % TODO [Milestone 3 - Step 4]: Process Monitor Termination Handler\n%% When a monitored C2S process terminates, the BEAM delivers:\n%% {'DOWN', MRef, process, DeadPid, Reason}\n%% 1. Find FullJid mapped to MRef in State.monitors.\n%% 2. Delete entry from ?TAB with ets:delete(?TAB, FullJid).\n%% 3. Remove MRef from the monitors map.\n%% 4. Return {noreply, NewState}.\nhandle_info({'DOWN', MRef, process, _DeadPid, _Reason}, State) ->\n    ensure_table(),\n    %% Implement monitor cleanup here:\n    {noreply, State};\n\nhandle_info(_Info, State) ->\n    {noreply, State}.\n\nterminate(_Reason, _State) ->\n    ok.\n",
  'src/xmpp_c2s_statem.erl': "-module(xmpp_c2s_statem).\n-behaviour(gen_statem).\n\n-export([start_link/1, stop/1, feed_xml/2, get_session_info/1]).\n-export([init/1, callback_mode/0, terminate/3]).\n\n%% State functions (gen_statem)\n-export([wait_for_stream/3, wait_for_sasl/3, authenticated/3, session_established/3]).\n\nstart_link(Opts) ->\n    gen_statem:start_link(?MODULE, Opts, []).\n\nstop(Pid) ->\n    gen_statem:stop(Pid).\n\nfeed_xml(Pid, XmlBin) when is_binary(XmlBin) ->\n    gen_statem:call(Pid, {feed_xml, XmlBin}).\n\nget_session_info(Pid) ->\n    gen_statem:call(Pid, get_session_info).\n\ncallback_mode() ->\n    state_functions.\n\ninit(Opts) ->\n    Domain = maps:get(domain, Opts, <<\"localhost\">>),\n    Socket = maps:get(socket, Opts, undefined),\n    Data = #{\n        domain => Domain,\n        socket => Socket,\n        parser_buf => xmpp_stream_parser:new_buffer(),\n        user => undefined,\n        resource => undefined,\n        full_jid => undefined,\n        priority => 0\n    },\n    {ok, wait_for_stream, Data}.\n\n%% % TODO [Milestone 4 - Step 1]: wait_for_stream State Function\n%% 1. Parse XmlBin using xmpp_stream_parser:feed_chunk/2.\n%% 2. If events contain {stream_open, RequestedDomain}:\n%%    - Construct StreamFeaturesXml = <<\"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>\">>\n%%    - Transition to wait_for_sasl:\n%%      {next_state, wait_for_sasl, NewData, [{reply, From, {ok, wait_for_sasl, [StreamFeaturesXml]}}]}\n%% 3. Otherwise keep state with {keep_state, NewData, [{reply, From, {ok, wait_for_stream, []}}]}.\nwait_for_stream({call, From}, {feed_xml, XmlBin}, Data) ->\n    Buf = maps:get(parser_buf, Data, <<>>),\n    {Events, NewBuf} = xmpp_stream_parser:feed_chunk(Buf, XmlBin),\n    NewData = Data#{parser_buf => NewBuf},\n    %% Implement state transition logic here:\n    {keep_state, NewData, [{reply, From, {ok, wait_for_stream, []}}]};\n\nwait_for_stream({call, From}, get_session_info, Data) ->\n    {keep_state, Data, [{reply, From, {ok, wait_for_stream, Data}}]};\nwait_for_stream(_EventType, _EventContent, Data) ->\n    {keep_state, Data}.\n\n%% % TODO [Milestone 4 - Step 2]: wait_for_sasl State Function\n%% 1. Parse XmlBin with xmpp_stream_parser:feed_chunk/2.\n%% 2. If events contain {sasl_auth, <<\"PLAIN\">>, Payload}:\n%%    - Extract username with extract_user_from_sasl(Payload, <<\"anonymous\">>).\n%%    - SuccessXml = <<\"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>\">>.\n%%    - Transition to authenticated state:\n%%      {next_state, authenticated, NewData#{user => User}, [{reply, From, {ok, authenticated, [SuccessXml]}}]}\nwait_for_sasl({call, From}, {feed_xml, XmlBin}, Data) ->\n    Buf = maps:get(parser_buf, Data, <<>>),\n    {Events, NewBuf} = xmpp_stream_parser:feed_chunk(Buf, XmlBin),\n    NewData = Data#{parser_buf => NewBuf},\n    %% Implement state transition logic here:\n    {keep_state, NewData, [{reply, From, {ok, wait_for_sasl, []}}]};\n\nwait_for_sasl({call, From}, get_session_info, Data) ->\n    {keep_state, Data, [{reply, From, {ok, wait_for_sasl, Data}}]};\nwait_for_sasl(_EventType, _EventContent, Data) ->\n    {keep_state, Data}.\n\n%% % TODO [Milestone 4 - Step 3]: authenticated State Function\n%% 1. Parse XmlBin with xmpp_stream_parser:feed_chunk/2.\n%% 2. If events contain {iq_bind, Id, Resource}:\n%%    - SafeResource = if Resource =:= <<>> -> <<\"default\">>; true -> Resource end.\n%%    - FullJid = <<User/binary, \"@\", Domain/binary, \"/\", SafeResource/binary>>.\n%%    - Register session: xmpp_session_registry:register_session(FullJid, 10, self()).\n%%    - ReplyXml = <<\"<iq type='result' id='\", Id/binary, \"'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>\", FullJid/binary, \"</jid></bind></iq>\">>.\n%%    - Transition to session_established:\n%%      {next_state, session_established, NewData#{resource => SafeResource, full_jid => FullJid, priority => 10},\n%%       [{reply, From, {ok, session_established, [ReplyXml]}}]}\nauthenticated({call, From}, {feed_xml, XmlBin}, Data) ->\n    Buf = maps:get(parser_buf, Data, <<>>),\n    {Events, NewBuf} = xmpp_stream_parser:feed_chunk(Buf, XmlBin),\n    NewData = Data#{parser_buf => NewBuf},\n    %% Implement state transition logic here:\n    {keep_state, NewData, [{reply, From, {ok, authenticated, []}}]};\n\nauthenticated({call, From}, get_session_info, Data) ->\n    {keep_state, Data, [{reply, From, {ok, authenticated, Data}}]};\nauthenticated(_EventType, _EventContent, Data) ->\n    {keep_state, Data}.\n\n%% % TODO [Milestone 4 - Step 4]: session_established State Function\n%% In established session:\n%% 1. On {feed_xml, XmlBin}: parse events and forward chat messages to xmpp_router:route_stanza/3.\n%% 2. On {info, {deliver_stanza, StanzaXml}}: push to client socket if attached.\nsession_established({call, From}, {feed_xml, XmlBin}, Data) ->\n    Buf = maps:get(parser_buf, Data, <<>>),\n    {Events, NewBuf} = xmpp_stream_parser:feed_chunk(Buf, XmlBin),\n    NewData = Data#{parser_buf => NewBuf},\n    {NextState, FinalData, OutXmls} = process_events(Events, session_established, NewData, []),\n    {next_state, NextState, FinalData, [{reply, From, {ok, NextState, lists:reverse(OutXmls)}}]};\n\nsession_established({call, From}, get_session_info, Data) ->\n    {keep_state, Data, [{reply, From, {ok, session_established, Data}}]};\n\nsession_established(info, {deliver_stanza, StanzaXml}, Data) ->\n    send_to_socket(maps:get(socket, Data, undefined), StanzaXml),\n    {keep_state, Data};\n\nsession_established(_EventType, _EventContent, Data) ->\n    {keep_state, Data}.\n\nterminate(_Reason, _State, _Data) ->\n    ok.\n\n%% ── Helpers ──────────────────────────────────────────────────────────────────\nprocess_events([], State, Data, OutAcc) ->\n    {State, Data, OutAcc};\nprocess_events([{chat_message, Id, TargetJid, Body} | Rest], session_established, Data, OutAcc) ->\n    FromJid = maps:get(full_jid, Data, <<\"unknown@localhost/anon\">>),\n    StanzaXml = <<\"<message from='\", FromJid/binary, \"' to='\", TargetJid/binary, \"' id='\", Id/binary, \"' type='chat'><body>\", Body/binary, \"</body></message>\">>,\n    _ = (catch xmpp_router:route_stanza(FromJid, TargetJid, StanzaXml)),\n    process_events(Rest, session_established, Data, OutAcc);\nprocess_events([{ping, Id} | Rest], State, Data, OutAcc) ->\n    Reply = <<\"<iq type='result' id='\", Id/binary, \"'/>\">>,\n    process_events(Rest, State, Data, [Reply | OutAcc]);\nprocess_events([stream_close | Rest], _State, Data, OutAcc) ->\n    Reply = <<\"</stream:stream>\">>,\n    process_events(Rest, wait_for_stream, Data, [Reply | OutAcc]);\nprocess_events([_Other | Rest], State, Data, OutAcc) ->\n    process_events(Rest, State, Data, OutAcc).\n\nextract_user_from_sasl(<<>>, Default) -> Default;\nextract_user_from_sasl(Payload, Default) ->\n    case binary:split(Payload, <<0>>, [global]) of\n        [_Authzid, Authcid, _Pass | _] when Authcid =/= <<>> -> Authcid;\n        [Single | _] when Single =/= <<>> -> Single;\n        _ -> Default\n    end.\n\nsend_to_socket(undefined, _Data) -> ok;\nsend_to_socket(Socket, Data) ->\n    catch gen_tcp:send(Socket, Data),\n    ok.\n",
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
    xpReward: 500,
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
        erlangCall: 'xmpp_sup:start_link()',
        expectedOutput: '{ok, Pid}',
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
        erlangCall: 'xmpp_session_registry:register_session(<<"alice@localhost/obsidian">>, 10, self()), xmpp_session_registry:lookup_by_jid(<<"alice@localhost">>)',
        expectedOutput: '[<self>]',
        explanation: 'Verifies session registration and bare JID priority dispatch.',
      },
      {
        id: 'tc-cap-4',
        title: 'Milestone 4: C2S Handshake State Transitions',
        erlangCall: 'xmpp_c2s_statem:feed_xml(Pid, <<"<auth mechanism=\'PLAIN\'>alice</auth>">>)',
        expectedOutput: '{ok, authenticated, [<<"<success.../>">>]}',
        explanation: 'Verifies SASL authentication advances state machine from wait_for_sasl to authenticated.',
      },
      {
        id: 'tc-cap-5',
        title: 'Milestone 5: Routing & Offline Fallback Queue',
        erlangCall: 'xmpp_router:route_stanza(<<"alice@localhost">>, <<"charlie@localhost">>, <<"<message>Hi</message>">>)',
        expectedOutput: '{queued_offline, <<"charlie@localhost">>}',
        explanation: 'Verifies message routing falls back to the in-memory offline message store when recipient is offline.',
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
