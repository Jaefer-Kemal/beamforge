import { LessonContent } from '../../types/workspace';

export const CHAPTER_11_LESSONS: LessonContent[] = [
  {
    id: 'ch11-l01',
    chapterNumber: 11,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'Guided Demo: Observing a Live XMPP Wire Protocol Session Transcript',
    difficulty: 'Intermediate',
    xpReward: 50,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'Why does the XMPP C2S protocol keep a single TCP connection open persistently rather than using short-lived HTTP requests for each chat message?',
      options: [
        {
          id: 'A',
          label: 'To allow the server to push incoming stanzas to the client in real time with sub-millisecond latency without polling overhead.',
          isCorrect: true,
          explanation: 'XMPP maintains a long-lived bidirectional XML stream over a single TCP socket so either peer can push stanzas instantaneously.'
        },
        {
          id: 'B',
          label: 'Because XML documents can only be transmitted over raw TCP sockets.',
          isCorrect: false,
          explanation: 'XML can be sent over any transport, but persistent streaming avoids connection renegotiation latency.'
        },
        {
          id: 'C',
          label: 'Because Erlang processes cannot handle HTTP requests.',
          isCorrect: false,
          explanation: 'Erlang handles HTTP effortlessly (e.g. Cowboy), but real-time messaging requires low-latency bidirectional push streams.'
        },
        {
          id: 'D',
          label: 'Because SASL PLAIN authentication only works on raw sockets.',
          isCorrect: false,
          explanation: 'SASL PLAIN is transport-independent; persistent connections are chosen for real-time delivery.'
        }
      ]
    },
    conceptMarkdown: `## Why This Matters in Production

The **Extensible Messaging and Presence Protocol (XMPP — RFC 6120 & RFC 6121)** powers the communication backends of global real-time platforms: from **WhatsApp's core messaging engine** (which originated as an optimized Erlang XMPP fork) to massive telecom carriers and gaming backends running **ejabberd** and **MongooseIM**.

Unlike HTTP (where the client opens a connection, requests a resource, receives JSON, and closes), XMPP establishes a **persistent, bidirectional XML stream** over a single long-lived TCP socket:

> [!IMPORTANT]
> **The 5-Phase XMPP C2S Protocol Lifecycle:**
> 1. **Phase 1: Stream Open** — \`<stream:stream to='localhost' xmlns='jabber:client' ...>\`
> 2. **Phase 2: Stream Features** — Server advertises supported auth mechanisms (\`<mechanisms>\`)
> 3. **Phase 3: SASL PLAIN Auth** — Client sends credentials (\`<auth>\`) and receives \`<success/>\`
> 4. **Phase 4: IQ Resource Binding** — Client binds session resource (\`<iq><bind>\`) and receives Full JID
> 5. **Phase 5: Discrete Stanzas** — Bidirectional peer XML exchange (\`<iq>\`, \`<presence>\`, \`<message>\`) over the persistent stream

Notice the most crucial property of XMPP: **The initial \`<stream:stream>\` tag is NEVER closed** during active communication! It remains open for hours or days. Discrete stanzas (\`<iq>\`, \`<presence>\`, \`<message>\`) are transmitted inside this stream as peer XML root elements.

## Deep Concept Breakdown & Under the Hood

### 1. The 3 Core XMPP Stanza Types
Once the stream is open and authenticated, all communication consists of three stanzas:
- **\`<iq>\` (Info/Query)**: Synchronous request/response. Every request has \`type='get'\` or \`type='set'\` and a unique \`id='...'\`. The server or recipient MUST reply with \`type='result'\` or \`type='error'\` carrying the identical \`id\`. Used for resource binding, pinging, and roster management.
- **\`<presence>\`**: Unidirectional broadcast of online/offline status and availability priority (\`<show>away</show>\`, \`<priority>10</priority>\`). Sent to the server, which fans it out to all mutual roster contacts.
- **\`<message>\`**: Asynchronous message payload (\`type='chat'\` or \`type='groupchat'\`) directed from one JID to another.

### 2. Why Erlang/OTP is the Undisputed King of XMPP
In object-oriented or thread-per-request architectures, keeping millions of continuous XML streams open exhausts thread limits or requires complex async state machines.

In Erlang:
1. **One Process Per Connected Session**: Every connected client socket is owned by a single \`gen_statem\` Erlang process (e.g., \`mongoose_c2s.erl\`).
2. **Sub-Microsecond Stanza Routing**: Routing a message between Alice and Bob does not require an external database or message broker. The server queries an in-memory ETS table to find Bob's process ID (\`BobC2SPid\`) and executes an instantaneous BEAM message send:
   \`\`\`erlang
   BobC2SPid ! {route_stanza, StanzaXmlBin}
   \`\`\`
3. **Hardware Backpressure**: By using \`inet:setopts(Socket, [{active, once}])\`, a slow client or flooded socket never causes memory leaks or process crashes.

### 3. Opening Stream Envelope (RFC 6120 Section 4.2)
Every XMPP session opens with an unclosed root \`stream\` element declaring both the \`jabber:client\` and \`http://etherx.jabber.org/streams\` namespaces:

\`\`\`xml
<stream:stream from='client@domain' to='server.domain'
               version='1.0' xmlns='jabber:client'
               xmlns:stream='http://etherx.jabber.org/streams'>
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% BeamForge C2S Simulation & Harness Signatures (gen_statem / gen_tcp)
sample_xmpp_c2s:start_link(Options) -> {ok, Pid} | {error, Reason}
  Types:
    Options = #{reg_name => atom(), active_mode => once | true}
    Pid = pid()

sample_xmpp_c2s:get_port(Pid) -> Port
  Types:
    Pid = pid()
    Port = inet:port_number()

sample_xmpp_c2s:stop(Pid) -> ok
  Types:
    Pid = pid()

bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(Port, ClientJid, AuthToken) ->
    {ok, [TranscriptEntry]} | {error, Stage, Reason, [TranscriptEntry]}
  Types:
    Port = inet:port_number()
    ClientJid = AuthToken = binary()
    TranscriptEntry = #{direction := binary(), xml := binary(), stage := binary(), latency_us := non_neg_integer()}
\`\`\`

Consult the attached reference cards below for \`sample_xmpp_c2s:start_link/1\` and \`bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing/3\` lifecycle details.

## Parallel Worked Example: Ephemeral Banner Protocol Transcript

Consider a separate domain: a **Line-Oriented Service Banner Transcript** (\`banner_session_demo\`) that boots a transient passive TCP responder on ephemeral port \`0\`, runs a 2-step greeting and status exchange while timing microsecond deltas, logs each recorded frame with exact map matching (\`:=\`), and cleans up cleanly:

\`\`\`erlang
-module(banner_session_demo).
-export([run_session/0, dump_events/2]).

%% @doc Run a transient line-protocol banner exchange and print timestamped transcript events.
run_session() ->
    {ok, LSock} = gen_tcp:listen(0, [binary, {packet, line}, {active, false}, {reuseaddr, true}]),
    {ok, Port} = inet:port(LSock),
    spawn(fun() ->
        case gen_tcp:accept(LSock, 2000) of
            {ok, Peer} ->
                ok = gen_tcp:send(Peer, <<"+READY v1\\n">>),
                {ok, <<"STATUS\\n">>} = gen_tcp:recv(Peer, 0, 2000),
                ok = gen_tcp:send(Peer, <<"UPTIME_OK\\n">>),
                gen_tcp:close(Peer);
            {error, _} ->
                ok
        end
    end),
    {ok, Sock} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, line}, {active, false}], 2000),
    T0 = erlang:monotonic_time(microsecond),
    {ok, Greeting} = gen_tcp:recv(Sock, 0, 2000),
    T1 = erlang:monotonic_time(microsecond),
    ok = gen_tcp:send(Sock, <<"STATUS\\n">>),
    {ok, Reply} = gen_tcp:recv(Sock, 0, 2000),
    T2 = erlang:monotonic_time(microsecond),
    gen_tcp:close(Sock),
    gen_tcp:close(LSock),
    Events = [
        #{dir => <<"rx">>, tag => <<"banner">>, frame => Greeting, lat_us => T1 - T0},
        #{dir => <<"tx">>, tag => <<"cmd_status">>, frame => <<"STATUS\\n">>, lat_us => 0},
        #{dir => <<"rx">>, tag => <<"status_ok">>, frame => Reply, lat_us => T2 - T1}
    ],
    ok = dump_events(Events, 1),
    {ok, length(Events)}.

%% @doc Recursively format recorded wire events by 1-based step index.
dump_events([], _Step) ->
    ok;
dump_events([#{dir := Dir, tag := Tag, frame := Frame, lat_us := Us} | Tail], Step) ->
    io:format("[~p | ~s | ~p us] ~s -> ~s", [Step, Dir, Us, Tag, Frame]),
    dump_events(Tail, Step + 1).
\`\`\`

### What ERTS Does at Runtime
- **Microsecond Monotonic Telemetry**: Calling \`erlang:monotonic_time(microsecond)\` before and after each blocking \`gen_tcp:recv/3\` measures real scheduler-accurate socket round-trip latency without wall-clock skew.
- **Exact Map Extraction & Tail Recursion**: Matching \`#{dir := Dir, ...}\` in \`dump_events/2\` asserts every required telemetry key exists before printing and recurses in tail position.

## Assignment Specification

This is a **Guided Demonstration** implemented in \`src/xmpp_wire_demo.erl\` (\`-module(xmpp_wire_demo).\`). Inspect the pre-wired demo in the editor and run it to observe an end-to-end XMPP C2S session transcript:

### \`run_demo/0\`
- **Input**: Zero arguments.
- **Behavior**: Constructs a unique registered server atom, boots an ephemeral \`sample_xmpp_c2s\` listener configured for single-packet active flow control, queries the assigned port, runs \`bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing/3\` for Alice's JID and credential token, formats each returned transcript entry via \`print_transcript/2\`, stops the C2S process cleanly, and returns the step count tuple (or formats any partial transcript and returns a tagged stage failure on error).
- **Examples**:
  - \`xmpp_wire_demo:run_demo()\` returns \`{ok, 8}\`.

### \`print_transcript/2\`
- **Input**: List of transcript entry maps (\`direction\`, \`xml\`, \`stage\`, \`latency_us\`) and integer step counter \`Idx\`.
- **Behavior**: Pattern-matches required transcript map keys using exact map matching, maps client-to-server vs server-to-client directions into readable directional banners, logs each step's latency and XML frame via \`io:format/2\`, and tail-recurses until the list is exhausted, returning \`ok\`.
- **Examples**:
  - \`xmpp_wire_demo:print_transcript([], 1)\` returns \`ok\`.

Click **\`▷ Run\`** to stream the live transcript or **\`▶ Submit\`** to verify AST, bytecode TCO, and full protocol execution.

## Rules & Verification Constraints
- **Exported Contract**: \`src/xmpp_wire_demo.erl\` must export \`run_demo/0\` (returning \`{ok, 8}\` covering all 5 C2S handshake/routing phases) and \`print_transcript/2\`.
- **AST & Bytecode Enforcements**: \`bf_ast_verifier\` verifies remote calls \`sample_xmpp_c2s:start_link/1\` and \`bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing/3\`, exact map matching (\`map_exact_match\`), and tail recursion on \`print_transcript/2\`.`,
    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'sample_xmpp_c2s',
        signature: 'sample_xmpp_c2s:start_link(Options) -> {ok, Pid} | {error, Reason}',
        typesSpec: [
          'Options = #{reg_name => atom(), active_mode => once | true}',
          'Pid = pid()',
        ],
        description: 'Boots an RFC 6120 compliant C2S gen_statem process on an ephemeral port.',
        complexityNote: 'Binds listening socket and manages state machine across wait_for_stream, wait_for_sasl, and session_established.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#listen/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl',
      },
      {
        functionName: 'verify_c2s_handshake_and_routing',
        module: 'bf_xmpp_c2s_harness',
        signature: 'bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(Port, ClientJid, AuthToken) -> {ok, Transcript}',
        typesSpec: [
          'Port = inet:port_number()',
          'ClientJid = binary()',
          'AuthToken = binary()',
        ],
        description: 'Executes live automated socket harness verifying all 5 protocol handshake stages.',
        complexityNote: 'Streams fragmented XML frames and coalesced messages with microsecond latency metrics.',
        officialUrl: 'https://datatracker.ietf.org/doc/html/rfc6120',
        githubSourceUrl: 'https://github.com/processone/ejabberd',
      },
    ],
    files: [
      {
        path: 'src/xmpp_wire_demo.erl',
        name: 'xmpp_wire_demo.erl',
        content: `-module(xmpp_wire_demo).
-export([run_demo/0, print_transcript/2]).

%% @doc Boot an ephemeral mock XMPP C2S server, execute the live C2S protocol harness, print each wire step, and return {ok, EntryCount} or {error, Stage}.
-spec run_demo() -> {ok, pos_integer()} | {error, atom()}.
run_demo() ->
    RegName = list_to_atom("sample_xmpp_c2s_" ++ integer_to_list(erlang:unique_integer([positive]))),
    {ok, ServerPid} = sample_xmpp_c2s:start_link(#{reg_name => RegName, active_mode => once}),
    Port = sample_xmpp_c2s:get_port(ServerPid),
    io:format("~n================================================================~n"),
    io:format(">>> BEAMFORGE XMPP WIRE PROTOCOL DEMO (PORT: ~p) <<<~n", [Port]),
    io:format("================================================================~n~n"),
    ClientJid = <<"alice@localhost">>,
    AuthToken = <<"password">>,
    case bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(Port, ClientJid, AuthToken) of
        {ok, Transcript} ->
            print_transcript(Transcript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            io:format("~n================================================================~n"),
            io:format(">>> ALL 5 XMPP PHASES COMPLETED WITH ZERO WIRE VIOLATIONS <<<~n"),
            io:format("================================================================~n"),
            {ok, length(Transcript)};
        {error, Stage, Reason, PartialTranscript} ->
            io:format("[ERROR] Failed at stage: ~p (~p)~n", [Stage, Reason]),
            print_transcript(PartialTranscript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            {error, Stage}
    end.

%% @doc Tail-recursively print ordered XMPP transcript entry maps with direction indicators and microsecond latencies.
-spec print_transcript([map()], pos_integer()) -> ok.
print_transcript([], _Idx) ->
    ok;
print_transcript([#{direction := Dir, xml := Xml, stage := Stage, latency_us := Lat} | Rest], Idx) ->
    Arrow = case Dir of
        <<"c2s">> -> "C ===> S (Client to Server)";
        <<"s2c">> -> "S ===> C (Server to Client)"
    end,
    io:format("[Step ~p | ~s | Latency: ~p us]~n  Stage: ~s~n  XML:   ~s~n~n",
              [Idx, Arrow, Lat, Stage, Xml]),
    print_transcript(Rest, Idx + 1).
`,
      },
    ],
    solutionFiles: {
      'src/xmpp_wire_demo.erl': `-module(xmpp_wire_demo).
-export([run_demo/0, print_transcript/2]).

%% @doc Boot an ephemeral mock XMPP C2S server, execute the live C2S protocol harness, print each wire step, and return {ok, EntryCount} or {error, Stage}.
-spec run_demo() -> {ok, pos_integer()} | {error, atom()}.
run_demo() ->
    RegName = list_to_atom("sample_xmpp_c2s_" ++ integer_to_list(erlang:unique_integer([positive]))),
    {ok, ServerPid} = sample_xmpp_c2s:start_link(#{reg_name => RegName, active_mode => once}),
    Port = sample_xmpp_c2s:get_port(ServerPid),
    io:format("~n================================================================~n"),
    io:format(">>> BEAMFORGE XMPP WIRE PROTOCOL DEMO (PORT: ~p) <<<~n", [Port]),
    io:format("================================================================~n~n"),
    ClientJid = <<"alice@localhost">>,
    AuthToken = <<"password">>,
    case bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(Port, ClientJid, AuthToken) of
        {ok, Transcript} ->
            print_transcript(Transcript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            io:format("~n================================================================~n"),
            io:format(">>> ALL 5 XMPP PHASES COMPLETED WITH ZERO WIRE VIOLATIONS <<<~n"),
            io:format("================================================================~n"),
            {ok, length(Transcript)};
        {error, Stage, Reason, PartialTranscript} ->
            io:format("[ERROR] Failed at stage: ~p (~p)~n", [Stage, Reason]),
            print_transcript(PartialTranscript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            {error, Stage}
    end.

%% @doc Tail-recursively print ordered XMPP transcript entry maps with direction indicators and microsecond latencies.
-spec print_transcript([map()], pos_integer()) -> ok.
print_transcript([], _Idx) ->
    ok;
print_transcript([#{direction := Dir, xml := Xml, stage := Stage, latency_us := Lat} | Rest], Idx) ->
    Arrow = case Dir of
        <<"c2s">> -> "C ===> S (Client to Server)";
        <<"s2c">> -> "S ===> C (Server to Client)"
    end,
    io:format("[Step ~p | ~s | Latency: ~p us]~n  Stage: ~s~n  XML:   ~s~n~n",
              [Idx, Arrow, Lat, Stage, Xml]),
    print_transcript(Rest, Idx + 1).
`,
    },
    starterCode: `-module(xmpp_wire_demo).
-export([run_demo/0, print_transcript/2]).

%% @doc Boot an ephemeral mock XMPP C2S server, execute the live C2S protocol harness, print each wire step, and return {ok, EntryCount} or {error, Stage}.
-spec run_demo() -> {ok, pos_integer()} | {error, atom()}.
run_demo() ->
    RegName = list_to_atom("sample_xmpp_c2s_" ++ integer_to_list(erlang:unique_integer([positive]))),
    {ok, ServerPid} = sample_xmpp_c2s:start_link(#{reg_name => RegName, active_mode => once}),
    Port = sample_xmpp_c2s:get_port(ServerPid),
    io:format("~n================================================================~n"),
    io:format(">>> BEAMFORGE XMPP WIRE PROTOCOL DEMO (PORT: ~p) <<<~n", [Port]),
    io:format("================================================================~n~n"),
    ClientJid = <<"alice@localhost">>,
    AuthToken = <<"password">>,
    case bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(Port, ClientJid, AuthToken) of
        {ok, Transcript} ->
            print_transcript(Transcript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            io:format("~n================================================================~n"),
            io:format(">>> ALL 5 XMPP PHASES COMPLETED WITH ZERO WIRE VIOLATIONS <<<~n"),
            io:format("================================================================~n"),
            {ok, length(Transcript)};
        {error, Stage, Reason, PartialTranscript} ->
            io:format("[ERROR] Failed at stage: ~p (~p)~n", [Stage, Reason]),
            print_transcript(PartialTranscript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            {error, Stage}
    end.

%% @doc Tail-recursively print ordered XMPP transcript entry maps with direction indicators and microsecond latencies.
-spec print_transcript([map()], pos_integer()) -> ok.
print_transcript([], _Idx) ->
    ok;
print_transcript([#{direction := Dir, xml := Xml, stage := Stage, latency_us := Lat} | Rest], Idx) ->
    Arrow = case Dir of
        <<"c2s">> -> "C ===> S (Client to Server)";
        <<"s2c">> -> "S ===> C (Server to Client)"
    end,
    io:format("[Step ~p | ~s | Latency: ~p us]~n  Stage: ~s~n  XML:   ~s~n~n",
              [Idx, Arrow, Lat, Stage, Xml]),
    print_transcript(Rest, Idx + 1).
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l01-1',
        title: 'Run Complete 5-Phase Live XMPP Wire Protocol Demo',
        erlangCall: 'xmpp_wire_demo:run_demo()',
        expectedOutput: '{ok, 8}',
        explanation: 'Boots ephemeral C2S mock server, connects bf_xmpp_c2s_harness over TCP, and executes all 5 handshake and stanza routing phases.',
      },
    ],
    astRules: {
      requireTailRecursion: ['print_transcript/2'],
      forbiddenCalls: [],
      requiredCalls: ['sample_xmpp_c2s:start_link/1', 'bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing/3'],
      requiredConstructs: ['map_exact_match'],
    },
    solutionCode: `-module(xmpp_wire_demo).
-export([run_demo/0, print_transcript/2]).

%% @doc Boot an ephemeral mock XMPP C2S server, execute the live C2S protocol harness, print each wire step, and return {ok, EntryCount} or {error, Stage}.
-spec run_demo() -> {ok, pos_integer()} | {error, atom()}.
run_demo() ->
    RegName = list_to_atom("sample_xmpp_c2s_" ++ integer_to_list(erlang:unique_integer([positive]))),
    {ok, ServerPid} = sample_xmpp_c2s:start_link(#{reg_name => RegName, active_mode => once}),
    Port = sample_xmpp_c2s:get_port(ServerPid),
    io:format("~n================================================================~n"),
    io:format(">>> BEAMFORGE XMPP WIRE PROTOCOL DEMO (PORT: ~p) <<<~n", [Port]),
    io:format("================================================================~n~n"),
    ClientJid = <<"alice@localhost">>,
    AuthToken = <<"password">>,
    case bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(Port, ClientJid, AuthToken) of
        {ok, Transcript} ->
            print_transcript(Transcript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            io:format("~n================================================================~n"),
            io:format(">>> ALL 5 XMPP PHASES COMPLETED WITH ZERO WIRE VIOLATIONS <<<~n"),
            io:format("================================================================~n"),
            {ok, length(Transcript)};
        {error, Stage, Reason, PartialTranscript} ->
            io:format("[ERROR] Failed at stage: ~p (~p)~n", [Stage, Reason]),
            print_transcript(PartialTranscript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            {error, Stage}
    end.

%% @doc Tail-recursively print ordered XMPP transcript entry maps with direction indicators and microsecond latencies.
-spec print_transcript([map()], pos_integer()) -> ok.
print_transcript([], _Idx) ->
    ok;
print_transcript([#{direction := Dir, xml := Xml, stage := Stage, latency_us := Lat} | Rest], Idx) ->
    Arrow = case Dir of
        <<"c2s">> -> "C ===> S (Client to Server)";
        <<"s2c">> -> "S ===> C (Server to Client)"
    end,
    io:format("[Step ~p | ~s | Latency: ~p us]~n  Stage: ~s~n  XML:   ~s~n~n",
              [Idx, Arrow, Lat, Stage, Xml]),
    print_transcript(Rest, Idx + 1).
`,
    solutionExplanation: `The demonstration module boots sample_xmpp_c2s (an OTP gen_statem process) on an ephemeral TCP port and runs bf_xmpp_c2s_harness to execute the five sequential state transitions required by RFC 6120:
1. wait_for_stream: Accepts the initial stream open and advertises SASL PLAIN authentication mechanisms.
2. wait_for_sasl: Receives credentials and responds with <success/>.
3. authenticated: Receives the client's IQ bind request and assigns the bound Full JID alice@localhost/obsidian.
4. session_established: Accepts incoming chat messages and acknowledges delivery.
5. Harness verification: Inspects the latency and protocol structure of each wire transition.`,
    references: [
      {
        title: 'IETF RFC 6120: XMPP Core Stream Initiation & Features',
        url: 'https://datatracker.ietf.org/doc/html/rfc6120',
        category: 'book_rfc',
        description: 'Official standard for XML streams, SASL negotiation, and C2S core mechanics.',
      },
      {
        title: 'Learn You Some Erlang: Buckets of Sockets',
        url: 'https://learnyousomeerlang.com/buckets-of-sockets',
        category: 'book_rfc',
        description: 'Pedagogical guide to Erlang gen_tcp programming and active vs passive modes.',
      },
    ],
  },

  {
    id: 'ch11-l02',
    chapterNumber: 11,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'XMPP Addressing (RFC 7622): Parsing, Validating & Normalizing JIDs',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'Under RFC 7622, what is the architectural difference between a Bare JID (user@domain) and a Full JID (user@domain/resource)?',
      options: [
        {
          id: 'A',
          label: 'A Bare JID identifies the user account (for presence subscriptions and roster management), while a Full JID routes to a specific connected client socket session.',
          isCorrect: true,
          explanation: 'Full JIDs include the bound resource identifier and correspond directly to a unique online socket session.'
        },
        {
          id: 'B',
          label: 'Bare JIDs are only used on localhost, while Full JIDs are used on the internet.',
          isCorrect: false,
          explanation: 'Bare and Full JIDs are used everywhere across local and federated XMPP architectures.'
        },
        {
          id: 'C',
          label: 'Bare JIDs cannot receive chat messages.',
          isCorrect: false,
          explanation: 'Bare JIDs can receive messages; the server routes them to the highest priority connected resource or stores them offline.'
        },
        {
          id: 'D',
          label: 'Full JIDs require RSA signatures.',
          isCorrect: false,
          explanation: 'JIDs are simply structured protocol addresses, not cryptographic signatures.'
        }
      ]
    },
    conceptMarkdown: `## Why This Matters in Production

In the XMPP architecture, the fundamental unit of addressing is the **Jabber Identifier (JID — RFC 7622)**. 

A single user account has a **Bare JID** (\`alice@chat.beamforge.io\`), representing their account identity across all devices. But when Alice logs in from her phone and her laptop simultaneously, the server establishes **two distinct C2S connections**, each assigned a distinct **Full JID**:
- \`alice@chat.beamforge.io/mobile_ios\`
- \`alice@chat.beamforge.io/macbook_desktop\`

> [!IMPORTANT]
> **RFC 7622 JID Addressing Structure:**
> - **Localpart:** \`alice\` (Account identity)
> - **Domainpart:** \`chat.beamforge.io\` (Server host)
> - **Resourcepart:** \`mobile_ios\` (Unique client session)
> - **Bare JID:** \`alice@chat.beamforge.io\` (Account & Roster Identity)
> - **Full JID:** \`alice@chat.beamforge.io/mobile_ios\` (Unique TCP C2S Session)

If your parser fails to validate empty resources, handles sub-binaries incorrectly, or allows malformed JIDs into your routing table, messages get lost or sent to dead processes.

## Deep Concept Breakdown & Under the Hood

### 1. Memory Safety: Avoiding Sub-Binary Memory Leaks
When an Erlang process receives a 64KB network packet from a socket and extracts small fields using binary pattern matching:
\`\`\`erlang
<<Prefix:5/binary, "@", Rest/binary>> = PacketBin
\`\`\`
Erlang creates a **sub-binary reference** that points directly into the original 64KB heap allocation! If you store \`Prefix\` inside an ETS table or process state, the **entire 64KB parent binary is pinned in memory** and cannot be garbage collected.

To prevent this critical production memory leak, whenever you extract string fields from long-lived network packets, allocate an unpinned slice with:
\`\`\`erlang
Detached = binary:copy(Prefix)
\`\`\`
\`binary:copy/1\` forces the BEAM VM to allocate a fresh, minimal byte slice on the heap, allowing the large socket buffer to be freed immediately!

### 2. RFC 7622 Addressing Rules
1. Every valid JID separates a non-empty localpart from a non-empty domainpart with a single \`@\` separator.
2. An optional resourcepart follows a \`/\` separator; when \`/\` is present, the resourcepart cannot be empty (and a resourcepart itself may contain slashes).
3. When no \`/\` appears, the address is a **Bare JID** with an empty binary resource.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / binary)
binary:split(Binary, PatternList) -> [binary()]
  Types:
    Binary = binary()
    PatternList = binary() | [binary()]

%% Forces deep copy of sub-binary to prevent memory pinning:
binary:copy(Subject) -> binary()
  Types:
    Subject = binary()
\`\`\`

Consult the attached documentation cards below for \`binary:split/2\` zero-copy slicing and \`binary:copy/1\` reference detachment complexity.

## Parallel Worked Example: Unpinned Service Endpoint Parser

Consider a separate domain: an **HTTP Endpoint Descriptor Parser** (\`uri_route_parser\`) that splits URLs shaped like \`<<"https://api.internal/v1/health">>\` into unpinned scheme, host, and path binaries using \`binary:split/2\`, detaches slices with \`binary:copy/1\`, validates non-empty fields via guards, and re-serializes canonical endpoints:

\`\`\`erlang
-module(uri_route_parser).
-export([parse_endpoint/1, render_endpoint/1]).

%% @doc Parse a scheme://host[/path] binary into unpinned tuple components or {error, bad_endpoint}.
parse_endpoint(RawUrl) when is_binary(RawUrl) ->
    case binary:split(RawUrl, <<"://">>) of
        [Scheme, HostAndPath] when byte_size(Scheme) > 0, byte_size(HostAndPath) > 0 ->
            split_host_path(binary:copy(Scheme), HostAndPath);
        _ ->
            {error, bad_endpoint}
    end;
parse_endpoint(_) ->
    {error, bad_endpoint}.

split_host_path(Scheme, Rest) ->
    case binary:split(Rest, <<"/">>) of
        [Host, Path] when byte_size(Host) > 0, byte_size(Path) > 0 ->
            {ok, {Scheme, binary:copy(Host), binary:copy(Path)}};
        [Host] when byte_size(Host) > 0 ->
            {ok, {Scheme, binary:copy(Host), <<>>}};
        _ ->
            {error, bad_endpoint}
    end.

%% @doc Reconstruct a canonical endpoint binary from a parsed 3-tuple.
render_endpoint({Scheme, Host, <<>>}) ->
    <<Scheme/binary, "://", Host/binary>>;
render_endpoint({Scheme, Host, Path}) ->
    <<Scheme/binary, "://", Host/binary, "/", Path/binary>>.
\`\`\`

### What ERTS Does at Runtime
- **Sub-Binary Detachment**: Both \`Scheme\` and \`Host\`/\`Path\` returned by \`binary:split/2\` share a reference count with \`RawUrl\`; passing each token through \`binary:copy/1\` frees the original 64KB packet buffer as soon as the caller drops \`RawUrl\`.
- **Two-Stage Guard Validation**: Guard checks on \`byte_size/1\` reject missing schemes, empty hosts, and trailing slashes with empty path segments before building the returned tuple.

## Assignment Specification

Implement the module \`xmpp_jid\` in \`src/xmpp_jid.erl\` exporting \`parse/1\`, \`to_bare/1\`, \`format_jid/1\`, and \`is_same_bare_jid/2\`.

### \`parse/1\`
- **Input**: \`Binary JidBin\` (arbitrary Erlang term accepted at boundary for rejection).
- **Behavior**: Validates and parses an RFC 7622 binary JID into an \`ok\` tuple wrapping a 4-key map with \`user\`, \`domain\`, \`resource\`, and \`bare\` binary entries. Uses \`binary:split/2\` to decompose the wire binary, enforces non-empty \`user\`, non-empty \`domain\`, and a single \`@\` inside the bare segment, rejects an empty trailing resource after \`/\`, defaults missing resource to an empty binary, and copies all stored binary slices with \`binary:copy/1\` so large socket buffers are unpinned. Non-binary or malformed inputs return an \`invalid_jid\` error tuple.
- **Examples**:
  - \`xmpp_jid:parse(<<"alice@localhost/mobile">>)\` returns \`{ok,#{bare => <<"alice@localhost">>,domain => <<"localhost">>,resource => <<"mobile">>,user => <<"alice">>}}\`.
  - \`xmpp_jid:parse(<<"bob@localhost">>)\` returns \`{ok,#{bare => <<"bob@localhost">>,domain => <<"localhost">>,resource => <<>>,user => <<"bob">>}}\`.
  - \`xmpp_jid:parse(<<"alice@localhost/">>)\` returns \`{error,invalid_jid}\`.

### \`to_bare/1\`
- **Input**: Parsed JID map containing a \`bare\` binary key, or raw \`Binary JidBin\`.
- **Behavior**: Returns the normalized \`user@domain\` binary directly when given a parsed JID map, or parses a raw binary and extracts its bare JID binary. Returns an \`invalid_jid\` error tuple for invalid or non-binary inputs.
- **Examples**:
  - \`xmpp_jid:to_bare(<<"alice@localhost/mobile">>)\` returns \`<<"alice@localhost">>\`.
  - \`xmpp_jid:to_bare(<<"bad_jid">>)\` returns \`{error,invalid_jid}\`.

### \`format_jid/1\`
- **Input**: Parsed JID map with \`user\`, \`domain\`, and \`resource\` binary keys.
- **Behavior**: Serializes the JID map back to standard XMPP wire binary form using binary construction syntax, omitting the \`/\` separator when \`resource\` is empty and appending \`/\` plus the resource otherwise.
- **Examples**:
  - \`xmpp_jid:format_jid(#{user => <<"charlie">>, domain => <<"host">>, resource => <<>>})\` returns \`<<"charlie@host">>\`.
  - \`xmpp_jid:format_jid(#{user => <<"charlie">>, domain => <<"host">>, resource => <<"pc">>})\` returns \`<<"charlie@host/pc">>\`.

### \`is_same_bare_jid/2\`
- **Input**: Two JID values (each either a parsed JID map or a raw JID binary).
- **Behavior**: Resolves both inputs to bare JID binaries via \`to_bare/1\` and returns \`true\` only when both inputs are valid and their bare JIDs match identically; returns \`false\` if either input is malformed or differs.
- **Examples**:
  - \`xmpp_jid:is_same_bare_jid(<<"alice@localhost/p1">>, <<"alice@localhost/p2">>)\` returns \`true\`.
  - \`xmpp_jid:is_same_bare_jid(<<"alice@localhost">>, <<"bad">>)\` returns \`false\`.

## Rules & Verification Constraints
- **Required Calls**: \`bf_ast_verifier\` verifies calls to \`binary:split/2\` and \`binary:copy/1\`.
- **Required Constructs**: Must use bit syntax (\`bit_syntax\`) for JID reconstruction and guard clauses (\`guards\`) for length/type validation.
- **Validation Coverage**: All malformed inputs (non-binaries, empty JID, missing \`@\`, multiple \`@\`, empty localpart/domainpart, and trailing \`/\`) must return \`{error, invalid_jid}\`.`,
    otpDocCards: [
      {
        functionName: 'split',
        module: 'binary',
        signature: 'binary:split(Binary, Pattern) -> [binary()]',
        typesSpec: [
          'Binary = binary()',
          'Pattern = binary() | [binary()]',
        ],
        description: 'Splits a binary on occurrences of Pattern into sub-binaries.',
        complexityNote: 'Linear scan with zero-copy sub-binary creation.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#split/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl',
      },
      {
        functionName: 'copy',
        module: 'binary',
        signature: 'binary:copy(Subject) -> binary()',
        typesSpec: [
          'Subject = binary()',
        ],
        description: 'Allocates a fresh, independent heap binary to prevent pinning parent buffers.',
        complexityNote: 'Forces deep copy of sub-binary, freeing parent socket buffers from GC roots.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#copy/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl',
      },
    ],
    files: [
      {
        path: 'src/xmpp_jid.erl',
        name: 'xmpp_jid.erl',
        content: `-module(xmpp_jid).
-export([
    parse/1,
    to_bare/1,
    format_jid/1,
    is_same_bare_jid/2
]).

%% @doc Parse an RFC 7622 binary JID into unpinned user, domain, resource, and bare components, returning an invalid_jid error tuple on malformed or non-binary input.
parse(_JidBin) ->
    ok.

%% @doc Extract the normalized bare JID binary from a parsed JID map or raw JID binary, returning an invalid_jid error tuple for malformed inputs.
to_bare(_JidInput) ->
    ok.

%% @doc Format a parsed JID map back into canonical wire binary form with or without a resource segment.
format_jid(_JidMap) ->
    <<>>.

%% @doc Return whether two JID binaries or parsed JID maps refer to the same valid bare JID, returning false if either is malformed or differs.
is_same_bare_jid(_Jid1, _Jid2) ->
    false.
`,
      },
    ],
    solutionFiles: {
      'src/xmpp_jid.erl': `-module(xmpp_jid).
-export([
    parse/1,
    to_bare/1,
    format_jid/1,
    is_same_bare_jid/2
]).

-type jid_map() :: #{
    user => binary(),
    domain => binary(),
    resource => binary(),
    bare => binary()
}.

%% @doc Parse an RFC 7622 binary JID into unpinned user, domain, resource, and bare components, returning an invalid_jid error tuple on malformed or non-binary input.
-spec parse(binary()) -> {ok, jid_map()} | {error, invalid_jid}.
parse(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"/">>) of
        [BarePart, ResourcePart] ->
            if
                byte_size(ResourcePart) =:= 0 -> {error, invalid_jid};
                true -> parse_bare(BarePart, ResourcePart)
            end;
        [BarePart] ->
            parse_bare(BarePart, <<>>)
    end;
parse(_) ->
    {error, invalid_jid}.

parse_bare(BareBin, ResourceBin) ->
    case binary:split(BareBin, <<"@">>) of
        [UserPart, DomainPart] when byte_size(UserPart) > 0, byte_size(DomainPart) > 0 ->
            case binary:match(DomainPart, <<"@">>) of
                nomatch ->
                    CleanUser = binary:copy(UserPart),
                    CleanDomain = binary:copy(DomainPart),
                    CleanResource = binary:copy(ResourceBin),
                    CleanBare = binary:copy(<<CleanUser/binary, "@", CleanDomain/binary>>),
                    {ok, #{
                        user => CleanUser,
                        domain => CleanDomain,
                        resource => CleanResource,
                        bare => CleanBare
                    }};
                _ ->
                    {error, invalid_jid}
            end;
        _ ->
            {error, invalid_jid}
    end.

%% @doc Extract the normalized bare JID binary from a parsed JID map or raw JID binary, returning an invalid_jid error tuple for malformed inputs.
-spec to_bare(jid_map() | binary()) -> binary() | {error, invalid_jid}.
to_bare(#{bare := Bare}) ->
    Bare;
to_bare(JidBin) when is_binary(JidBin) ->
    case parse(JidBin) of
        {ok, #{bare := Bare}} -> Bare;
        Error -> Error
    end;
to_bare(_) ->
    {error, invalid_jid}.

%% @doc Format a parsed JID map back into canonical wire binary form with or without a resource segment.
-spec format_jid(jid_map()) -> binary().
format_jid(#{user := User, domain := Domain, resource := Resource}) ->
    case Resource of
        <<>> -> <<User/binary, "@", Domain/binary>>;
        _    -> <<User/binary, "@", Domain/binary, "/", Resource/binary>>
    end.

%% @doc Return whether two JID binaries or parsed JID maps refer to the same valid bare JID, returning false if either is malformed or differs.
-spec is_same_bare_jid(jid_map() | binary(), jid_map() | binary()) -> boolean().
is_same_bare_jid(Jid1, Jid2) ->
    case {to_bare(Jid1), to_bare(Jid2)} of
        {{error, _}, _} -> false;
        {_, {error, _}} -> false;
        {Bare1, Bare2}  -> Bare1 =:= Bare2
    end.
`,
    },
    starterCode: `-module(xmpp_jid).
-export([
    parse/1,
    to_bare/1,
    format_jid/1,
    is_same_bare_jid/2
]).

%% @doc Parse an RFC 7622 binary JID into unpinned user, domain, resource, and bare components, returning an invalid_jid error tuple on malformed or non-binary input.
parse(_JidBin) ->
    ok.

%% @doc Extract the normalized bare JID binary from a parsed JID map or raw JID binary, returning an invalid_jid error tuple for malformed inputs.
to_bare(_JidInput) ->
    ok.

%% @doc Format a parsed JID map back into canonical wire binary form with or without a resource segment.
format_jid(_JidMap) ->
    <<>>.

%% @doc Return whether two JID binaries or parsed JID maps refer to the same valid bare JID, returning false if either is malformed or differs.
is_same_bare_jid(_Jid1, _Jid2) ->
    false.
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l02-1',
        title: 'Parse Full JID with Resource',
        erlangCall: 'xmpp_jid:parse(<<"alice@localhost/mobile">>)',
        expectedOutput: '{ok,#{bare => <<"alice@localhost">>,domain => <<"localhost">>,resource => <<"mobile">>,user => <<"alice">>}}',
        explanation: 'Parses Full JID into user, domain, resource, and bare components.',
      },
      {
        id: 'tc-ch11-l02-2',
        title: 'Parse Bare JID without Resource',
        erlangCall: 'xmpp_jid:parse(<<"bob@localhost">>)',
        expectedOutput: '{ok,#{bare => <<"bob@localhost">>,domain => <<"localhost">>,resource => <<>>,user => <<"bob">>}}',
        explanation: 'Parses Bare JID and normalizes resource to empty binary <<>>.',
      },
      {
        id: 'tc-ch11-l02-3',
        title: 'Reject Malformed JIDs',
        erlangCall: '{xmpp_jid:parse(<<"@localhost">>), xmpp_jid:parse(<<"alice@">>), xmpp_jid:parse(<<"alice@localhost/">>)}',
        expectedOutput: '{{error,invalid_jid},{error,invalid_jid},{error,invalid_jid}}',
        explanation: 'Rejects empty user, empty domain, and trailing slash without resource.',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['binary:split/2', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax', 'guards'],
    },
    solutionCode: `-module(xmpp_jid).
-export([
    parse/1,
    to_bare/1,
    format_jid/1,
    is_same_bare_jid/2
]).

-type jid_map() :: #{
    user => binary(),
    domain => binary(),
    resource => binary(),
    bare => binary()
}.

%% @doc Parse an RFC 7622 binary JID into unpinned user, domain, resource, and bare components, returning an invalid_jid error tuple on malformed or non-binary input.
-spec parse(binary()) -> {ok, jid_map()} | {error, invalid_jid}.
parse(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"/">>) of
        [BarePart, ResourcePart] ->
            if
                byte_size(ResourcePart) =:= 0 -> {error, invalid_jid};
                true -> parse_bare(BarePart, ResourcePart)
            end;
        [BarePart] ->
            parse_bare(BarePart, <<>>)
    end;
parse(_) ->
    {error, invalid_jid}.

parse_bare(BareBin, ResourceBin) ->
    case binary:split(BareBin, <<"@">>) of
        [UserPart, DomainPart] when byte_size(UserPart) > 0, byte_size(DomainPart) > 0 ->
            case binary:match(DomainPart, <<"@">>) of
                nomatch ->
                    CleanUser = binary:copy(UserPart),
                    CleanDomain = binary:copy(DomainPart),
                    CleanResource = binary:copy(ResourceBin),
                    CleanBare = binary:copy(<<CleanUser/binary, "@", CleanDomain/binary>>),
                    {ok, #{
                        user => CleanUser,
                        domain => CleanDomain,
                        resource => CleanResource,
                        bare => CleanBare
                    }};
                _ ->
                    {error, invalid_jid}
            end;
        _ ->
            {error, invalid_jid}
    end.

%% @doc Extract the normalized bare JID binary from a parsed JID map or raw JID binary, returning an invalid_jid error tuple for malformed inputs.
-spec to_bare(jid_map() | binary()) -> binary() | {error, invalid_jid}.
to_bare(#{bare := Bare}) ->
    Bare;
to_bare(JidBin) when is_binary(JidBin) ->
    case parse(JidBin) of
        {ok, #{bare := Bare}} -> Bare;
        Error -> Error
    end;
to_bare(_) ->
    {error, invalid_jid}.

%% @doc Format a parsed JID map back into canonical wire binary form with or without a resource segment.
-spec format_jid(jid_map()) -> binary().
format_jid(#{user := User, domain := Domain, resource := Resource}) ->
    case Resource of
        <<>> -> <<User/binary, "@", Domain/binary>>;
        _    -> <<User/binary, "@", Domain/binary, "/", Resource/binary>>
    end.

%% @doc Return whether two JID binaries or parsed JID maps refer to the same valid bare JID, returning false if either is malformed or differs.
-spec is_same_bare_jid(jid_map() | binary(), jid_map() | binary()) -> boolean().
is_same_bare_jid(Jid1, Jid2) ->
    case {to_bare(Jid1), to_bare(Jid2)} of
        {{error, _}, _} -> false;
        {_, {error, _}} -> false;
        {Bare1, Bare2}  -> Bare1 =:= Bare2
    end.
`,
    solutionExplanation: `The solution parses the JID in two stages:
1. binary:split(JidBin, <<"/">>) separates the optional Resource part. If the slash exists but the resource is empty, it returns {error, invalid_jid}.
2. parse_bare splits the bare component on <<"@">>, confirming that both user and domain are non-empty.
3. binary:copy/1 is executed on User, Domain, Resource, and Bare to unpin any references to larger network buffers.
4. to_bare and format_jid handle map and binary representations seamlessly.`,
    references: [
      {
        title: 'IETF RFC 7622: Extensible Messaging and Presence Protocol (XMPP): Address Format',
        url: 'https://datatracker.ietf.org/doc/html/rfc7622',
        category: 'book_rfc',
        description: 'Official RFC defining valid Bare JIDs, Full JIDs, and resourcepart constraints.',
      },
      {
        title: 'Erlang stdlib: binary:split/2 and binary:copy/1',
        url: 'https://www.erlang.org/doc/apps/stdlib/binary.html',
        category: 'erlang_docs',
        description: 'Official documentation for sub-binary management and unpinning memory buffers.',
      },
    ],
  },

  {
    id: 'ch11-l03',
    chapterNumber: 11,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'XMPP Stanza Anatomy (RFC 6120): Parsing & Constructing Stanzas',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'Why does an XMPP <iq type="get"> stanza strictly require the recipient to return an <iq type="result"> or <iq type="error"> with the exact same id attribute?',
      options: [
        {
          id: 'A',
          label: 'To enable asynchronous request-response RPC matching over the persistent stream without head-of-line blocking.',
          isCorrect: true,
          explanation: 'Because stanzas are multiplexed asynchronously over a single TCP stream, the client uses the unique id attribute to match responses to requests.'
        },
        {
          id: 'B',
          label: 'Because Erlang processes will crash if the id is missing.',
          isCorrect: false,
          explanation: 'It is an RFC 6120 protocol specification requirement for multiplexed RPC correlation.'
        },
        {
          id: 'C',
          label: 'To encrypt the payload for privacy.',
          isCorrect: false,
          explanation: 'The id attribute provides correlation, not encryption.'
        },
        {
          id: 'D',
          label: 'Because the XML parser cannot parse closing tags without an id.',
          isCorrect: false,
          explanation: 'XML parsers do not require id attributes to parse closing tags.'
        }
      ]
    },
    conceptMarkdown: `## Why This Matters in Production

In XMPP, after the stream header has been negotiated, all communication consists of discrete XML packets called **Stanzas**. 

Production Erlang servers like MongooseIM and ejabberd handle millions of stanzas per second. Constructing XML efficiently using **IO Lists** and matching incoming stanzas using high-performance binary pattern matching is the foundation of high-throughput messaging.

> [!IMPORTANT]
> **The 3 Fundamental XMPP Stanza Patterns:**
> 1. \`<iq>\` (Info/Query) — Request/Response correlated by unique \`id\` attribute.
> 2. \`<presence>\` (Availability) — Broadcasts presence status and routing priority.
> 3. \`<message>\` (Direct Chat) — Real-time user-to-user and group chat delivery.

## Deep Concept Breakdown & Under the Hood

### 1. Opening Stream, SASL Auth & Stanza Routing
Before dispatching a packet to its handler, the connection state machine inspects the leading XML tag name and key metadata attributes:
- **Opening stream header**: carries destination domain attributes (\`to='...'\`).
- **SASL payload elements**: carry the negotiated Base64 challenge/response inside element text tags.
- **Discrete stanzas**: \`<iq>\`, \`<presence>\`, and \`<message>\` carry routing attributes (\`id\`, \`type\`, \`to\`). Because \`<presence/>\` omits \`type\` when signaling online availability, parsers normalize a missing \`type\` to \`<<"available">>\`.

### 2. Zero-Copy Assembly with IO Lists
Concatenating dozens of nested binaries repeatedly with binary construction allocates intermediate copies on heap or binary space. Passing nested lists of binaries directly to \`erlang:iolist_to_binary/1\` (or writing an IO list to a socket port) computes total byte size in a single pass and fills one contiguous destination buffer.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / binary & erts / erlang)
binary:match(Subject, Pattern) -> {Start, Length} | nomatch
  Types:
    Subject = binary()
    Pattern = binary() | [binary()]
    Start = Length = non_neg_integer()

binary:part(Subject, Pos, Len) -> binary()
  Types:
    Subject = binary()
    Pos = Len = non_neg_integer()

binary:copy(Subject) -> binary()
erlang:iolist_to_binary(IoList) -> binary()
\`\`\`

Consult the attached documentation cards below for \`binary:match/2\` search behavior and \`erlang:iolist_to_binary/1\` allocation guarantees.

## Parallel Worked Example: Log Frame Attribute Scanner & Batch Serializer

Consider a separate domain: an **Edge Audit Frame Codec** (\`audit_frame_codec\`) that classifies bracketed plain-text telemetry tags (\`<<"[EVT src='gw-1']boot</EVT>">>\`), extracts delimited values with \`binary:match/2\` + \`binary:part/3\` + \`binary:copy/1\`, and serializes batched records with \`iolist_to_binary/1\`:

\`\`\`erlang
-module(audit_frame_codec).
-export([inspect_frame/1, encode_batch/1]).

%% @doc Inspect a bracketed telemetry event line and unpin extracted fields.
inspect_frame(Line) when is_binary(Line) ->
    Clean = string:trim(Line),
    case binary:match(Clean, <<"[EVT">>) of
        {_, _} ->
            Src = slice_attr(Clean, <<"src=">>),
            Body = slice_inner(Clean, <<"]">>, <<"</EVT>">>),
            {event, Src, Body};
        nomatch ->
            unrecognized
    end;
inspect_frame(_) ->
    unrecognized.

slice_attr(Bin, Prefix) ->
    case binary:match(Bin, Prefix) of
        {Pos, Len} ->
            Skip = Pos + Len,
            <<_:Skip/binary, Quote, Tail/binary>> = Bin,
            case Quote of
                39 -> slice_until(Tail, <<39>>);
                34 -> slice_until(Tail, <<34>>);
                _ -> <<>>
            end;
        nomatch ->
            <<>>
    end.

slice_inner(Bin, LeftDelim, RightDelim) ->
    case binary:match(Bin, LeftDelim) of
        {LPos, LLen} ->
            Skip = LPos + LLen,
            <<_:Skip/binary, Rest/binary>> = Bin,
            slice_until(Rest, RightDelim);
        nomatch ->
            <<>>
    end.

slice_until(Bin, Delim) ->
    case binary:match(Bin, Delim) of
        {EndPos, _} -> binary:copy(binary:part(Bin, 0, EndPos));
        nomatch -> <<>>
    end.

%% @doc Serialize key-value metric pairs into an ASCII wire batch using an IO list.
encode_batch(Pairs) ->
    Rows = [[K, <<"=">>, V, <<";">>] || {K, V} <- Pairs],
    iolist_to_binary([<<"BATCH[">>, Rows, <<"]">>]).
\`\`\`

### What ERTS Does at Runtime
- **Byte-Offset Bit-Syntax Skipping**: \`<<_:Skip/binary, Rest/binary>>\` advances the bit pointer in $O(1)$ without copying bytes before extracting quoted attributes via \`binary:part/3\` and detaching them via \`binary:copy/1\`.
- **Single-Pass Serialization**: \`encode_batch/1\` builds nested binary lists and collapses them in one allocation inside \`iolist_to_binary/1\`.

## Assignment Specification

Implement \`xmpp_stanza\` in \`src/xmpp_stanza.erl\` exporting \`classify_xml_packet/1\`, \`build_stream_features/1\`, \`build_bind_result/2\`, and \`build_chat_message/4\`.

### \`classify_xml_packet/1\`
- **Input**: Raw XML packet binary (arbitrary Erlang term rejected cleanly as unrecognized).
- **Behavior**: Trims outer whitespace and inspects the packet tag to classify it into one of six forms: a 2-tuple \`{stream_open, ToDomain}\` for opening \`stream:stream\` tags, \`{auth_plain, AuthData}\` for opening \`auth\` tags (extracting inner element text), \`{iq, Id, Type}\` for \`<iq\` stanzas, \`{presence, Type}\` for \`<presence\` stanzas (defaulting empty/absent \`type\` attribute to \`<<"available">>\`), \`{message, Id, Type, To}\` for \`<message\` stanzas, or atom \`unknown\` for unrecognized/closing elements or non-binary input. Supports both single- and double-quoted attributes and copies all extracted slices with \`binary:copy/1\`.
- **Examples**:
  - \`xmpp_stanza:classify_xml_packet(<<"<stream:stream to='localhost' version='1.0'>">>)\` returns \`{stream_open,<<"localhost">>}\`.
  - \`xmpp_stanza:classify_xml_packet(<<"<iq type='get' id='ping_42'><ping/></iq>">>)\` returns \`{iq,<<"ping_42">>,<<"get">>}\`.

### \`build_stream_features/1\`
- **Input**: List of SASL mechanism binaries (e.g., \`[<<"PLAIN">>, <<"SCRAM-SHA-256">>]\`).
- **Behavior**: Wraps each mechanism binary inside a \`<mechanism>\` element and encloses all mechanisms inside a single-quoted SASL \`stream:features\` XML wrapper using IO lists.
- **Examples**:
  - \`xmpp_stanza:build_stream_features([<<"PLAIN">>])\` returns \`<<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>\`.

### \`build_bind_result/2\`
- **Input**: \`Binary Id\`, \`Binary FullJid\`.
- **Behavior**: Assembles an IQ \`result\` stanza carrying single-quoted attributes, the \`urn:ietf:params:xml:ns:xmpp-bind\` namespace, and a \`<jid>\` element holding the bound full JID.
- **Examples**:
  - \`xmpp_stanza:build_bind_result(<<"bind_1">>, <<"alice@localhost/macbook">>)\` returns \`<<"<iq type='result' id='bind_1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>alice@localhost/macbook</jid></bind></iq>">>\`.

### \`build_chat_message/4\`
- **Input**: \`Binary FromJid\`, \`Binary ToJid\`, \`Binary Id\`, \`Binary BodyText\`.
- **Behavior**: Assembles an RFC 6120 chat message stanza with single-quoted \`from\`, \`to\`, \`id\`, and \`type='chat'\` attributes enclosing a \`<body>\` child element.
- **Examples**:
  - \`xmpp_stanza:build_chat_message(<<"alice@localhost">>, <<"bob@localhost">>, <<"msg_01">>, <<"Hello BEAM">>)\` returns \`<<"<message from='alice@localhost' to='bob@localhost' id='msg_01' type='chat'><body>Hello BEAM</body></message>">>\`.

## Rules & Verification Constraints
- **AST Checks**: \`bf_ast_verifier\` enforces \`binary:match/2\`, \`binary:copy/1\`, and \`bit_syntax\` usage in parsing helpers.
- **Wire Formatting**: All generated XML attributes must use single quotes \`'\` and match exact RFC 6120 element nesting.`,
    otpDocCards: [
      {
        functionName: 'match',
        module: 'binary',
        signature: 'binary:match(Subject, Pattern) -> {Start, Length} | nomatch',
        typesSpec: [
          'Subject = binary()',
          'Pattern = binary() | [binary()]',
        ],
        description: 'Searches for first occurrence of Pattern in Subject.',
        complexityNote: 'Boyer-Moore accelerated byte search in BEAM runtime.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#match/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl',
      },
      {
        functionName: 'iolist_to_binary',
        module: 'erlang',
        signature: 'iolist_to_binary(IoList) -> binary()',
        typesSpec: [
          'IoList = iolist()',
        ],
        description: 'Flattens deep nested IO lists and binaries into a contiguous binary.',
        complexityNote: 'Zero intermediate string copying; directly allocates destination buffer.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#iolist_to_binary/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/preloaded/src/erlang.erl',
      },
    ],
    files: [
      {
        path: 'src/xmpp_stanza.erl',
        name: 'xmpp_stanza.erl',
        content: `-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

%% @doc Classify a trimmed RFC 6120 XML binary into a tagged stream, auth, iq, presence, or message tuple, or unknown for unrecognized/non-binary input.
classify_xml_packet(_XmlBin) ->
    unknown.

%% @doc Serialize a list of SASL mechanism binaries into an XML stream:features payload using single-quoted attributes.
build_stream_features(_Mechanisms) ->
    <<>>.

%% @doc Construct an IQ resource-binding result XML stanza with single-quoted attributes matching Id and FullJid.
build_bind_result(_Id, _FullJid) ->
    <<>>.

%% @doc Construct an RFC 6120 chat message XML stanza for FromJid, ToJid, Id, and BodyText using single-quoted attributes.
build_chat_message(_FromJid, _ToJid, _Id, _BodyText) ->
    <<>>.
`,
      },
    ],
    solutionFiles: {
      'src/xmpp_stanza.erl': `-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

%% @doc Classify a trimmed RFC 6120 XML binary into a tagged stream, auth, iq, presence, or message tuple, or unknown for unrecognized/non-binary input.
-spec classify_xml_packet(binary()) ->
    {stream_open, binary()} |
    {auth_plain, binary()} |
    {iq, binary(), binary()} |
    {presence, binary()} |
    {message, binary(), binary(), binary()} |
    unknown.
classify_xml_packet(XmlBin) when is_binary(XmlBin) ->
    Trimmed = string:trim(XmlBin),
    case binary:match(Trimmed, <<"<stream:stream">>) of
        {_, _} ->
            ToDomain = extract_attr(Trimmed, <<"to=">>),
            {stream_open, ToDomain};
        nomatch ->
            case binary:match(Trimmed, <<"<auth">>) of
                {_, _} ->
                    AuthData = extract_tag_body(Trimmed, <<"auth">>),
                    {auth_plain, AuthData};
                nomatch ->
                    case binary:match(Trimmed, <<"<iq">>) of
                        {_, _} ->
                            Id = extract_attr(Trimmed, <<"id=">>),
                            Type = extract_attr(Trimmed, <<"type=">>),
                            {iq, Id, Type};
                        nomatch ->
                            case binary:match(Trimmed, <<"<presence">>) of
                                {_, _} ->
                                    Type = case extract_attr(Trimmed, <<"type=">>) of
                                        <<>> -> <<"available">>;
                                        Val -> Val
                                    end,
                                    {presence, Type};
                                nomatch ->
                                    case binary:match(Trimmed, <<"<message">>) of
                                        {_, _} ->
                                            Id = extract_attr(Trimmed, <<"id=">>),
                                            Type = extract_attr(Trimmed, <<"type=">>),
                                            To = extract_attr(Trimmed, <<"to=">>),
                                            {message, Id, Type, To};
                                        nomatch ->
                                            unknown
                                    end
                            end
                    end
            end
    end;
classify_xml_packet(_) ->
    unknown.

extract_attr(Xml, AttrPrefix) ->
    case binary:match(Xml, AttrPrefix) of
        {Pos, Len} ->
            StartPos = Pos + Len,
            <<_:StartPos/binary, Rest/binary>> = Xml,
            case Rest of
                <<39, ValueRest/binary>> ->
                    case binary:match(ValueRest, <<39>>) of
                        {ValLen, _} -> binary:copy(binary:part(ValueRest, 0, ValLen));
                        nomatch -> <<>>
                    end;
                <<34, ValueRest/binary>> ->
                    case binary:match(ValueRest, <<34>>) of
                        {ValLen, _} -> binary:copy(binary:part(ValueRest, 0, ValLen));
                        nomatch -> <<>>
                    end;
                _ -> <<>>
            end;
        nomatch ->
            <<>>
    end.

extract_tag_body(Xml, TagName) ->
    OpenTag = <<"<", TagName/binary>>,
    CloseTag = <<"</", TagName/binary, ">">>,
    case binary:match(Xml, OpenTag) of
        {OpenPos, _} ->
            <<_:OpenPos/binary, Rest/binary>> = Xml,
            case binary:match(Rest, <<">">>) of
                {GtPos, _} ->
                    BodyStart = GtPos + 1,
                    <<_:BodyStart/binary, BodyAndClose/binary>> = Rest,
                    case binary:match(BodyAndClose, CloseTag) of
                        {ClosePos, _} ->
                            binary:copy(binary:part(BodyAndClose, 0, ClosePos));
                        nomatch -> <<>>
                    end;
                nomatch -> <<>>
            end;
        nomatch -> <<>>
    end.

%% @doc Serialize a list of SASL mechanism binaries into an XML stream:features payload using single-quoted attributes.
-spec build_stream_features([binary()]) -> binary().
build_stream_features(Mechanisms) ->
    Inner = [[<<"<mechanism>">>, M, <<"</mechanism>">>] || M <- Mechanisms],
    MechanismsXml = iolist_to_binary(Inner),
    iolist_to_binary([
        <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>">>,
        MechanismsXml,
        <<"</mechanisms></stream:features>">>
    ]).

%% @doc Construct an IQ resource-binding result XML stanza with single-quoted attributes matching Id and FullJid.
-spec build_bind_result(binary(), binary()) -> binary().
build_bind_result(Id, FullJid) ->
    iolist_to_binary([
        <<"<iq type='result' id='">>, Id,
        <<"'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>">>,
        FullJid,
        <<"</jid></bind></iq>">>
    ]).

%% @doc Construct an RFC 6120 chat message XML stanza for FromJid, ToJid, Id, and BodyText using single-quoted attributes.
-spec build_chat_message(binary(), binary(), binary(), binary()) -> binary().
build_chat_message(FromJid, ToJid, Id, BodyText) ->
    iolist_to_binary([
        <<"<message from='">>, FromJid,
        <<"' to='">>, ToJid,
        <<"' id='">>, Id,
        <<"' type='chat'><body>">>,
        BodyText,
        <<"</body></message>">>
    ]).
`,
    },
    starterCode: `-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

%% @doc Classify a trimmed RFC 6120 XML binary into a tagged stream, auth, iq, presence, or message tuple, or unknown for unrecognized/non-binary input.
classify_xml_packet(_XmlBin) ->
    unknown.

%% @doc Serialize a list of SASL mechanism binaries into an XML stream:features payload using single-quoted attributes.
build_stream_features(_Mechanisms) ->
    <<>>.

%% @doc Construct an IQ resource-binding result XML stanza with single-quoted attributes matching Id and FullJid.
build_bind_result(_Id, _FullJid) ->
    <<>>.

%% @doc Construct an RFC 6120 chat message XML stanza for FromJid, ToJid, Id, and BodyText using single-quoted attributes.
build_chat_message(_FromJid, _ToJid, _Id, _BodyText) ->
    <<>>.
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l03-1',
        title: 'Classify Stream Open and IQ Packet',
        erlangCall: '{xmpp_stanza:classify_xml_packet(<<"<stream:stream to=\'localhost\' version=\'1.0\'>">>), xmpp_stanza:classify_xml_packet(<<"<iq type=\'get\' id=\'ping_42\'><ping/></iq>">>)}',
        expectedOutput: '{{stream_open,<<"localhost">>},{iq,<<"ping_42">>,<<"get">>}}',
        explanation: 'Classifies stream_open and extracts id and type from iq stanza.',
      },
      {
        id: 'tc-ch11-l03-2',
        title: 'Build Bind Result IQ XML',
        erlangCall: 'xmpp_stanza:build_bind_result(<<"bind_1">>, <<"alice@localhost/macbook">>)',
        expectedOutput: '<<"<iq type=\'result\' id=\'bind_1\'><bind xmlns=\'urn:ietf:params:xml:ns:xmpp-bind\'><jid>alice@localhost/macbook</jid></bind></iq>">>',
        explanation: 'Constructs valid XML IQ bind result with matching id and bound jid.',
      },
      {
        id: 'tc-ch11-l03-3',
        title: 'Build Chat Message XML',
        erlangCall: 'xmpp_stanza:build_chat_message(<<"alice@localhost">>, <<"bob@localhost">>, <<"msg_01">>, <<"Hello BEAM">>)',
        expectedOutput: '<<"<message from=\'alice@localhost\' to=\'bob@localhost\' id=\'msg_01\' type=\'chat\'><body>Hello BEAM</body></message>">>',
        explanation: 'Constructs standard XMPP chat message with from, to, id, and body.',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['binary:match/2', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax'],
    },
    solutionCode: `-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

%% @doc Classify a trimmed RFC 6120 XML binary into a tagged stream, auth, iq, presence, or message tuple, or unknown for unrecognized/non-binary input.
-spec classify_xml_packet(binary()) ->
    {stream_open, binary()} |
    {auth_plain, binary()} |
    {iq, binary(), binary()} |
    {presence, binary()} |
    {message, binary(), binary(), binary()} |
    unknown.
classify_xml_packet(XmlBin) when is_binary(XmlBin) ->
    Trimmed = string:trim(XmlBin),
    case binary:match(Trimmed, <<"<stream:stream">>) of
        {_, _} ->
            ToDomain = extract_attr(Trimmed, <<"to=">>),
            {stream_open, ToDomain};
        nomatch ->
            case binary:match(Trimmed, <<"<auth">>) of
                {_, _} ->
                    AuthData = extract_tag_body(Trimmed, <<"auth">>),
                    {auth_plain, AuthData};
                nomatch ->
                    case binary:match(Trimmed, <<"<iq">>) of
                        {_, _} ->
                            Id = extract_attr(Trimmed, <<"id=">>),
                            Type = extract_attr(Trimmed, <<"type=">>),
                            {iq, Id, Type};
                        nomatch ->
                            case binary:match(Trimmed, <<"<presence">>) of
                                {_, _} ->
                                    Type = case extract_attr(Trimmed, <<"type=">>) of
                                        <<>> -> <<"available">>;
                                        Val -> Val
                                    end,
                                    {presence, Type};
                                nomatch ->
                                    case binary:match(Trimmed, <<"<message">>) of
                                        {_, _} ->
                                            Id = extract_attr(Trimmed, <<"id=">>),
                                            Type = extract_attr(Trimmed, <<"type=">>),
                                            To = extract_attr(Trimmed, <<"to=">>),
                                            {message, Id, Type, To};
                                        nomatch ->
                                            unknown
                                    end
                            end
                    end
            end
    end;
classify_xml_packet(_) ->
    unknown.

extract_attr(Xml, AttrPrefix) ->
    case binary:match(Xml, AttrPrefix) of
        {Pos, Len} ->
            StartPos = Pos + Len,
            <<_:StartPos/binary, Rest/binary>> = Xml,
            case Rest of
                <<39, ValueRest/binary>> ->
                    case binary:match(ValueRest, <<39>>) of
                        {ValLen, _} -> binary:copy(binary:part(ValueRest, 0, ValLen));
                        nomatch -> <<>>
                    end;
                <<34, ValueRest/binary>> ->
                    case binary:match(ValueRest, <<34>>) of
                        {ValLen, _} -> binary:copy(binary:part(ValueRest, 0, ValLen));
                        nomatch -> <<>>
                    end;
                _ -> <<>>
            end;
        nomatch ->
            <<>>
    end.

extract_tag_body(Xml, TagName) ->
    OpenTag = <<"<", TagName/binary>>,
    CloseTag = <<"</", TagName/binary, ">">>,
    case binary:match(Xml, OpenTag) of
        {OpenPos, _} ->
            <<_:OpenPos/binary, Rest/binary>> = Xml,
            case binary:match(Rest, <<">">>) of
                {GtPos, _} ->
                    BodyStart = GtPos + 1,
                    <<_:BodyStart/binary, BodyAndClose/binary>> = Rest,
                    case binary:match(BodyAndClose, CloseTag) of
                        {ClosePos, _} ->
                            binary:copy(binary:part(BodyAndClose, 0, ClosePos));
                        nomatch -> <<>>
                    end;
                nomatch -> <<>>
            end;
        nomatch -> <<>>
    end.

%% @doc Serialize a list of SASL mechanism binaries into an XML stream:features payload using single-quoted attributes.
-spec build_stream_features([binary()]) -> binary().
build_stream_features(Mechanisms) ->
    Inner = [[<<"<mechanism>">>, M, <<"</mechanism>">>] || M <- Mechanisms],
    MechanismsXml = iolist_to_binary(Inner),
    iolist_to_binary([
        <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>">>,
        MechanismsXml,
        <<"</mechanisms></stream:features>">>
    ]).

%% @doc Construct an IQ resource-binding result XML stanza with single-quoted attributes matching Id and FullJid.
-spec build_bind_result(binary(), binary()) -> binary().
build_bind_result(Id, FullJid) ->
    iolist_to_binary([
        <<"<iq type='result' id='">>, Id,
        <<"'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>">>,
        FullJid,
        <<"</jid></bind></iq>">>
    ]).

%% @doc Construct an RFC 6120 chat message XML stanza for FromJid, ToJid, Id, and BodyText using single-quoted attributes.
-spec build_chat_message(binary(), binary(), binary(), binary()) -> binary().
build_chat_message(FromJid, ToJid, Id, BodyText) ->
    iolist_to_binary([
        <<"<message from='">>, FromJid,
        <<"' to='">>, ToJid,
        <<"' id='">>, Id,
        <<"' type='chat'><body>">>,
        BodyText,
        <<"</body></message>">>
    ]).
`,
    solutionExplanation: `The solution implements binary string scanning and XML construction:
1. classify_xml_packet detects top-level tag names (stream:stream, auth, iq, presence, message) and extracts attributes using extract_attr.
2. extract_attr supports both single-quote ('val') and double-quote ("val") delimiters without string escape ambiguity, returning binary:copy/1 to prevent memory pinning.
3. build_stream_features, build_bind_result, and build_chat_message use IO lists (iolist_to_binary/1) to assemble wire XML with zero-copy efficiency.`,
    references: [
      {
        title: 'IETF RFC 6120: XMPP XML Stanzas (<iq>, <presence>, <message>)',
        url: 'https://datatracker.ietf.org/doc/html/rfc6120',
        category: 'book_rfc',
        description: 'Specification of standard XML stanza payload structures and attribute semantics.',
      },
    ],
  },

  {
    id: 'ch11-l04',
    chapterNumber: 11,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'RFC 6120 Stanza & Stream Errors and RFC 6121 Roster Subscriptions',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'According to RFC 6120 Section 8, which error type must accompany the <not-authorized/> condition when a client attempts a command without logging in?',
      options: [
        {
          id: 'A',
          label: 'auth (prerequisite authentication or authorization failed)',
          isCorrect: true,
          explanation: 'RFC 6120 Section 8.3 defines auth as the formal error type for not-authorized and forbidden conditions.'
        },
        {
          id: 'B',
          label: 'cancel (the request cannot be retried under any circumstances)',
          isCorrect: false,
          explanation: 'cancel is reserved for fatal errors like item-not-found or service-unavailable.'
        },
        {
          id: 'C',
          label: 'modify (the request syntax is invalid)',
          isCorrect: false,
          explanation: 'modify is used for bad-request or invalid XML parameters.'
        },
        {
          id: 'D',
          label: 'wait (the server is temporarily overloaded)',
          isCorrect: false,
          explanation: 'wait is used for rate limits and resource-constraint.'
        }
      ]
    },
    conceptMarkdown: `## Why This Matters in Production

In production messaging backends, protocol errors cannot be communicated via generic HTTP numeric codes. **RFC 6120 Section 8** defines a formal, structured XML error taxonomy combining retry-semantics **error types** with standardized **condition elements** so client SDKs know immediately whether to re-authenticate, back off, fix malformed payloads, or abort.

> [!IMPORTANT]
> **RFC 6120 Error Types (Section 8.3):**
> - **\`auth\`**: Authentication or authorization prerequisite failed (retry after supplying credentials).
> - **\`cancel\`**: Irrecoverable failure; client must not retry the same stanza as-is.
> - **\`modify\`**: Malformed or unacceptable parameters; retry only after rewriting the payload.
> - **\`wait\`**: Transient overload or resource limit; retry after a backoff delay.

Meanwhile, **RFC 6121 Section 3** models mutual contact visibility as a four-state finite state machine (\`none\`, \`to\`, \`from\`, \`both\`) rather than a single boolean flag—ensuring unidirectional follows never leak reciprocal online presence.

## Deep Concept Breakdown & Under the Hood

### 1. O(1) BEAM Jump-Table Dispatch on Condition Atoms
When all function clauses match literal atoms (\`not_authorized\`, \`bad_request\`, etc.) in the same argument position, the BEAM compiler compiles them into a sorted binary-search or jump-table instruction (\`select_val\`). Dispatch takes constant $O(1)$ time with zero heap allocation regardless of how many RFC conditions are supported.

### 2. Asymmetric vs. Mutual Presence States (RFC 6121)
Subscription state tracks *who can see whom*:
- \`none\`: Neither party sees the other's presence.
- \`to\`: The user sees the contact's presence (outbound authorization granted).
- \`from\`: The contact sees the user's presence (inbound authorization granted).
- \`both\`: Mutual subscription in both directions.

Every \`subscribed\` event adds one direction (\`none -> to\` or \`from -> both\` for outbound; \`none -> from\` or \`to -> both\` for inbound), and every \`unsubscribed\` event revokes only that direction while preserving the opposite grant when transitioning out of \`both\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Multi-Clause Atom Jump-Table & Bit Syntax Construction (stdlib / erts)
%% Mapping error condition atoms in O(1):
classify(Condition) -> {TypeBin, ConditionBin}
  Types:
    Condition = atom()
    TypeBin = ConditionBin = binary()

%% Zero-copy wire element formatting via bit syntax:
<<Prefix/binary, Body/binary, Suffix/binary>> -> binary()
\`\`\`

Consult the attached RFC 6120 Section 8 reference card below for condition-to-type semantics.

## Parallel Worked Example: Alert Policy Classifier & Node Quarantine FSM

Consider a separate domain: an **Edge Telemetry Alert Classifier & Node Quarantine FSM** (\`policy_escalation_fsm\`) demonstrating O(1) multi-clause atom dispatch, wire frame assembly using binary syntax, and a 4-state transition table:

\`\`\`erlang
-module(policy_escalation_fsm).
-export([severity_of/1, format_alert/3, next_health/2]).

%% @doc Map infrastructure fault atoms to {SeverityBin, CodeBin} via BEAM jump-table matching.
severity_of(disk_full)    -> {<<"crit">>, <<"disk-full">>};
severity_of(auth_flood)   -> {<<"sec">>,  <<"auth-flood">>};
severity_of(tls_expiring) -> {<<"warn">>, <<"tls-expiring">>};
severity_of(_)            -> {<<"info">>, <<"unknown-signal">>}.

%% @doc Assemble a pipe-framed alert record using binary interpolation syntax.
format_alert(NodeId, Seq, SignalAtom) ->
    {Sev, Code} = severity_of(SignalAtom),
    <<"[", NodeId/binary, "#", Seq/binary, "|", Sev/binary, "]=", Code/binary>>.

%% @doc Advance node quarantine state (healthy | watch | degraded | isolated) on operational events.
next_health(healthy, spike_warn)       -> watch;
next_health(healthy, hard_fault)       -> isolated;
next_health(watch, hard_fault)         -> degraded;
next_health(watch, clear_signal)       -> healthy;
next_health(degraded, isolate_node)    -> isolated;
next_health(degraded, clear_signal)    -> watch;
next_health(isolated, admin_release)   -> watch;
next_health(State, _Event)             -> State.
\`\`\`

### What ERTS Does at Runtime
- **Jump-Table Clause Selection**: Each clause in \`severity_of/1\` matches a distinct atom constant, so ERTS emits \`select_val\` dispatch without sequential branch scanning.
- **Bit-Syntax Frame Building**: \`format_alert/3\` computes total frame length once before copying \`NodeId\`, \`Seq\`, \`Sev\`, and \`Code\` into a single binary.

## Assignment Specification

Implement \`xmpp_error_and_roster\` in \`src/xmpp_error_and_roster.erl\` exporting \`classify_error_condition/1\`, \`build_stanza_error/4\`, \`build_stream_not_authorized/0\`, and \`transition_subscription/2\`.

### \`classify_error_condition/1\`
- **Input**: Error condition atom \`ConditionAtom\`.
- **Behavior**: Maps known RFC 6120 stanza error atoms to two-element binary pairs \`{TypeBin, ElementBin}\` as follows:
  - \`not_authorized\` -> type \`<<"auth">>\`, element \`<<"not-authorized">>\`
  - \`forbidden\` -> type \`<<"auth">>\`, element \`<<"forbidden">>\`
  - \`item_not_found\` -> type \`<<"cancel">>\`, element \`<<"item-not-found">>\`
  - \`service_unavailable\` -> type \`<<"cancel">>\`, element \`<<"service-unavailable">>\`
  - \`bad_request\` -> type \`<<"modify">>\`, element \`<<"bad-request">>\`
  - \`resource_constraint\` -> type \`<<"wait">>\`, element \`<<"resource-constraint">>\`
  - Any unrecognized atom -> fallback type \`<<"cancel">>\`, element \`<<"undefined-condition">>\`
- **Examples**:
  - \`xmpp_error_and_roster:classify_error_condition(not_authorized)\` returns \`{<<"auth">>, <<"not-authorized">>}\`.
  - \`xmpp_error_and_roster:classify_error_condition(item_not_found)\` returns \`{<<"cancel">>, <<"item-not-found">>}\`.

### \`build_stanza_error/4\`
- **Input**: \`Binary StanzaTagBin\` (e.g. \`<<"iq">>\` or \`<<"message">>\`), \`Binary IdBin\`, \`Binary ToJidBin\`, \`Atom ConditionAtom\`.
- **Behavior**: Resolves the error type and condition element via \`classify_error_condition/1\` and formats an outer stanza element with single-quoted \`type='error'\`, \`id\`, and \`to\` attributes enclosing an \`<error type='...'>\` child element containing the self-closing condition element scoped under \`urn:ietf:params:xml:ns:xmpp-stanzas\`.
- **Examples**:
  - \`xmpp_error_and_roster:build_stanza_error(<<"message">>, <<"msg_1">>, <<"bob@localhost">>, item_not_found)\` returns \`<<"<message type='error' id='msg_1' to='bob@localhost'><error type='cancel'><item-not-found xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></error></message>">>\`.

### \`build_stream_not_authorized/0\`
- **Input**: Zero arguments.
- **Behavior**: Returns the exact RFC 6120 stream-level \`not-authorized\` XML element wrapped in \`<stream:error>\` under the \`urn:ietf:params:xml:ns:xmpp-streams\` namespace using single quotes.
- **Examples**:
  - \`xmpp_error_and_roster:build_stream_not_authorized()\` returns \`<<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>\`.

### \`transition_subscription/2\`
- **Input**: Current state atom (\`none\`, \`to\`, \`from\`, or \`both\`) and event atom (\`outbound_subscribed\`, \`inbound_subscribed\`, \`outbound_unsubscribed\`, \`inbound_unsubscribed\`, or other).
- **Behavior**: Computes the next RFC 6121 roster subscription state atom:
  - From \`none\`: \`outbound_subscribed\` -> \`to\`, \`inbound_subscribed\` -> \`from\`.
  - From \`to\`: \`inbound_subscribed\` -> \`both\`, \`outbound_unsubscribed\` -> \`none\`.
  - From \`from\`: \`outbound_subscribed\` -> \`both\`, \`inbound_unsubscribed\` -> \`none\`.
  - From \`both\`: \`outbound_unsubscribed\` -> \`from\`, \`inbound_unsubscribed\` -> \`to\`.
  - Any other state/event pair preserves \`Current\` unchanged.
- **Examples**:
  - \`xmpp_error_and_roster:transition_subscription(none, outbound_subscribed)\` returns \`to\`.
  - \`xmpp_error_and_roster:transition_subscription(to, inbound_subscribed)\` returns \`both\`.

## Rules & Verification Constraints
- **AST Checks**: \`bf_ast_verifier\` verifies binary construction (\`bit_syntax\`) in XML error formatting.
- **RFC Wire Compliance**: Use single quotes \`'\` on all generated XML attributes and exact IETF namespaces (\`xmpp-stanzas\` / \`xmpp-streams\`).`,
    files: [
      {
        path: 'src/xmpp_error_and_roster.erl',
        name: 'xmpp_error_and_roster.erl',
        content: `-module(xmpp_error_and_roster).
-export([classify_error_condition/1, build_stanza_error/4, build_stream_not_authorized/0, transition_subscription/2]).

%% @doc Map an RFC 6120 stanza error condition atom to its standardized {TypeBin, ElementBin} pair, defaulting unknown conditions to undefined-condition under cancel.
classify_error_condition(_ConditionAtom) ->
    ok.

%% @doc Build a structured RFC 6120 stanza error XML binary for StanzaTagBin with id, to, error type, and condition element scoped to xmpp-stanzas.
build_stanza_error(_StanzaTagBin, _IdBin, _ToJidBin, _ConditionAtom) ->
    <<>>.

%% @doc Return the RFC 6120 stream-level not-authorized error element wrapped in stream:error under the xmpp-streams namespace.
build_stream_not_authorized() ->
    <<>>.

%% @doc Advance an RFC 6121 roster subscription state (none, to, from, or both) for an inbound or outbound subscription event, keeping Current on unrecognized transitions.
transition_subscription(_Current, _Event) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/xmpp_error_and_roster.erl': `-module(xmpp_error_and_roster).
-export([classify_error_condition/1, build_stanza_error/4, build_stream_not_authorized/0, transition_subscription/2]).

%% @doc Map an RFC 6120 stanza error condition atom to its standardized {TypeBin, ElementBin} pair, defaulting unknown conditions to undefined-condition under cancel.
-spec classify_error_condition(atom()) -> {binary(), binary()}.
classify_error_condition(not_authorized)      -> {<<"auth">>, <<"not-authorized">>};
classify_error_condition(forbidden)           -> {<<"auth">>, <<"forbidden">>};
classify_error_condition(item_not_found)       -> {<<"cancel">>, <<"item-not-found">>};
classify_error_condition(service_unavailable)  -> {<<"cancel">>, <<"service-unavailable">>};
classify_error_condition(bad_request)         -> {<<"modify">>, <<"bad-request">>};
classify_error_condition(resource_constraint) -> {<<"wait">>, <<"resource-constraint">>};
classify_error_condition(_)                   -> {<<"cancel">>, <<"undefined-condition">>}.

%% @doc Build a structured RFC 6120 stanza error XML binary for StanzaTagBin with id, to, error type, and condition element scoped to xmpp-stanzas.
-spec build_stanza_error(binary(), binary(), binary(), atom()) -> binary().
build_stanza_error(StanzaTagBin, IdBin, ToJidBin, ConditionAtom) ->
    {TypeBin, ElementBin} = classify_error_condition(ConditionAtom),
    <<"<", StanzaTagBin/binary, " type='error' id='", IdBin/binary, "' to='", ToJidBin/binary, "'><error type='", TypeBin/binary, "'><", ElementBin/binary, " xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></error></", StanzaTagBin/binary, ">">>.

%% @doc Return the RFC 6120 stream-level not-authorized error element wrapped in stream:error under the xmpp-streams namespace.
-spec build_stream_not_authorized() -> binary().
build_stream_not_authorized() ->
    <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>.

%% @doc Advance an RFC 6121 roster subscription state (none, to, from, or both) for an inbound or outbound subscription event, keeping Current on unrecognized transitions.
-spec transition_subscription(atom(), atom()) -> atom().
transition_subscription(none, outbound_subscribed)   -> to;
transition_subscription(none, inbound_subscribed)    -> from;
transition_subscription(none, _)                     -> none;
transition_subscription(to, inbound_subscribed)      -> both;
transition_subscription(to, outbound_unsubscribed)   -> none;
transition_subscription(to, _)                       -> to;
transition_subscription(from, outbound_subscribed)   -> both;
transition_subscription(from, inbound_unsubscribed)  -> none;
transition_subscription(from, _)                     -> from;
transition_subscription(both, outbound_unsubscribed) -> from;
transition_subscription(both, inbound_unsubscribed)  -> to;
transition_subscription(both, _)                     -> both;
transition_subscription(Current, _)                  -> Current.
`,
    },
    starterCode: `-module(xmpp_error_and_roster).
-export([classify_error_condition/1, build_stanza_error/4, build_stream_not_authorized/0, transition_subscription/2]).

%% @doc Map an RFC 6120 stanza error condition atom to its standardized {TypeBin, ElementBin} pair, defaulting unknown conditions to undefined-condition under cancel.
classify_error_condition(_ConditionAtom) ->
    ok.

%% @doc Build a structured RFC 6120 stanza error XML binary for StanzaTagBin with id, to, error type, and condition element scoped to xmpp-stanzas.
build_stanza_error(_StanzaTagBin, _IdBin, _ToJidBin, _ConditionAtom) ->
    <<>>.

%% @doc Return the RFC 6120 stream-level not-authorized error element wrapped in stream:error under the xmpp-streams namespace.
build_stream_not_authorized() ->
    <<>>.

%% @doc Advance an RFC 6121 roster subscription state (none, to, from, or both) for an inbound or outbound subscription event, keeping Current on unrecognized transitions.
transition_subscription(_Current, _Event) ->
    ok.
`,
    solutionCode: `-module(xmpp_error_and_roster).
-export([classify_error_condition/1, build_stanza_error/4, build_stream_not_authorized/0, transition_subscription/2]).

%% @doc Map an RFC 6120 stanza error condition atom to its standardized {TypeBin, ElementBin} pair, defaulting unknown conditions to undefined-condition under cancel.
-spec classify_error_condition(atom()) -> {binary(), binary()}.
classify_error_condition(not_authorized)      -> {<<"auth">>, <<"not-authorized">>};
classify_error_condition(forbidden)           -> {<<"auth">>, <<"forbidden">>};
classify_error_condition(item_not_found)       -> {<<"cancel">>, <<"item-not-found">>};
classify_error_condition(service_unavailable)  -> {<<"cancel">>, <<"service-unavailable">>};
classify_error_condition(bad_request)         -> {<<"modify">>, <<"bad-request">>};
classify_error_condition(resource_constraint) -> {<<"wait">>, <<"resource-constraint">>};
classify_error_condition(_)                   -> {<<"cancel">>, <<"undefined-condition">>}.

%% @doc Build a structured RFC 6120 stanza error XML binary for StanzaTagBin with id, to, error type, and condition element scoped to xmpp-stanzas.
-spec build_stanza_error(binary(), binary(), binary(), atom()) -> binary().
build_stanza_error(StanzaTagBin, IdBin, ToJidBin, ConditionAtom) ->
    {TypeBin, ElementBin} = classify_error_condition(ConditionAtom),
    <<"<", StanzaTagBin/binary, " type='error' id='", IdBin/binary, "' to='", ToJidBin/binary, "'><error type='", TypeBin/binary, "'><", ElementBin/binary, " xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></error></", StanzaTagBin/binary, ">">>.

%% @doc Return the RFC 6120 stream-level not-authorized error element wrapped in stream:error under the xmpp-streams namespace.
-spec build_stream_not_authorized() -> binary().
build_stream_not_authorized() ->
    <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>.

%% @doc Advance an RFC 6121 roster subscription state (none, to, from, or both) for an inbound or outbound subscription event, keeping Current on unrecognized transitions.
-spec transition_subscription(atom(), atom()) -> atom().
transition_subscription(none, outbound_subscribed)   -> to;
transition_subscription(none, inbound_subscribed)    -> from;
transition_subscription(none, _)                     -> none;
transition_subscription(to, inbound_subscribed)      -> both;
transition_subscription(to, outbound_unsubscribed)   -> none;
transition_subscription(to, _)                       -> to;
transition_subscription(from, outbound_subscribed)   -> both;
transition_subscription(from, inbound_unsubscribed)  -> none;
transition_subscription(from, _)                     -> from;
transition_subscription(both, outbound_unsubscribed) -> from;
transition_subscription(both, inbound_unsubscribed)  -> to;
transition_subscription(both, _)                     -> both;
transition_subscription(Current, _)                  -> Current.
`,
    otpDocCards: [
      {
        functionName: 'classify_error_condition',
        module: 'xmpp_error_and_roster',
        signature: 'classify_error_condition(ConditionAtom) -> {TypeBin, ElementBin}',
        typesSpec: ['ConditionAtom = atom()', 'TypeBin = binary()', 'ElementBin = binary()'],
        description: 'Maps RFC 6120 error condition atoms to type and element name binaries.',
        complexityNote: 'O(1) pattern matching jump table.',
        officialUrl: 'https://datatracker.ietf.org/doc/html/rfc6120#section-8',
        githubSourceUrl: 'https://github.com/erlang/otp',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: [],
      requiredConstructs: ['bit_syntax'],
    },
    visibleTestCases: [
      {
        id: 'tc-ch11-l04-1',
        title: 'Error Condition Classification',
        erlangCall: '{xmpp_error_and_roster:classify_error_condition(not_authorized), xmpp_error_and_roster:classify_error_condition(item_not_found)}',
        expectedOutput: '{{<<"auth">>, <<"not-authorized">>}, {<<"cancel">>, <<"item-not-found">>}}',
        explanation: 'Verifies mapping of RFC 6120 error condition atoms to type and element binaries.',
      },
      {
        id: 'tc-ch11-l04-2',
        title: 'Structured Stanza Error Synthesis',
        erlangCall: 'xmpp_error_and_roster:build_stanza_error(<<"message">>, <<"msg_1">>, <<"bob@localhost">>, item_not_found)',
        expectedOutput: '<<"<message type=\'error\' id=\'msg_1\' to=\'bob@localhost\'><error type=\'cancel\'><item-not-found xmlns=\'urn:ietf:params:xml:ns:xmpp-stanzas\'/></error></message>">>',
        explanation: 'Verifies structured XML stanza error formatting.',
      },
      {
        id: 'tc-ch11-l04-3',
        title: 'Roster Subscription State Transitions',
        erlangCall: 'begin S1 = xmpp_error_and_roster:transition_subscription(none, outbound_subscribed), S2 = xmpp_error_and_roster:transition_subscription(S1, inbound_subscribed), {S1, S2} end',
        expectedOutput: '{to, both}',
        explanation: 'Verifies mutual subscription transition logic from none to to to both.',
      },
    ],
    solutionExplanation: 'Implements RFC 6120 structured error classification and RFC 6121 presence subscription state machines.',
    references: [
      {
        title: 'RFC 6120: Section 8 (Extended Stanza and Stream Errors)',
        url: 'https://datatracker.ietf.org/doc/html/rfc6120#section-8',
        category: 'book_rfc',
        description: 'Official IETF specification for XMPP stanza and stream error types and conditions.',
      },
      {
        title: 'RFC 6121: Section 3 (Managing Roster Subscriptions)',
        url: 'https://datatracker.ietf.org/doc/html/rfc6121#section-3',
        category: 'book_rfc',
        description: 'Official IETF specification for mutual presence subscription state machines.',
      },
    ],
  },

  {
    id: 'ch11-l05',
    chapterNumber: 11,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Incremental XML Stream Framing Over Fragmented TCP Sockets',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'Why MUST an incremental XML stream framer call binary:copy/1 when extracting attribute values or stanza bodies from a TCP buffer?',
      options: [
        {
          id: 'A',
          label: 'To prevent sub-binary retention leaks where a tiny extracted slice pins a large 64 KB refc binary in process heap memory.',
          isCorrect: true,
          explanation: 'Sub-binaries retain reference counters to their parent binary. binary:copy/1 copies the small slice and releases the refc binary.'
        },
        {
          id: 'B',
          label: 'Because Erlang binaries are immutable and cannot be read without copying.',
          isCorrect: false,
          explanation: 'Binaries are read directly via pattern matching; binary:copy/1 is used specifically for memory unpinning.'
        },
        {
          id: 'C',
          label: 'Because gen_statem will reject uncopied binaries with a badmatch error.',
          isCorrect: false,
          explanation: 'gen_statem accepts any term; memory management is an engineering optimization.'
        },
        {
          id: 'D',
          label: 'To convert the binary to a null-terminated C string.',
          isCorrect: false,
          explanation: 'Erlang binaries are length-prefixed, not null-terminated.'
        }
      ]
    },
    conceptMarkdown: `## Why This Matters in Production

The single biggest pitfall for engineers building XMPP servers is attempting to use standard XML parsers (like DOM or SAX parsers) directly on the incoming TCP socket stream.

Why does that fail catastrophically?
1. **The Stream is Never Closed**: An XML DOM parser expects \`</stream:stream>\` at the end of the document. If you feed it an open XMPP stream, it blocks forever waiting for EOF!
2. **TCP Packet Fragmentation & Coalescing**: TCP delivers bytes in arbitrary chunks. A client may send an IQ stanza in 3 separate 10-byte packets, or bundle two chat messages into one TCP frame.

> [!IMPORTANT]
> **Incremental XML Stream Framing Pipeline:**
> - **Chunk 1:** \`<<"<stream:stream to='host' ...>  <iq type=">>\` -> Emits \`<stream:stream>\` header, keeps incomplete \`<iq type=\` in buffer.
> - **Chunk 2:** \`<<"'set' id='b1'><bind><resource>obs">>\` -> Accumulates in buffer.
> - **Chunk 3:** \`<<"idian</resource></bind></iq><presence/>">>\` -> Slices and emits \`<iq>\` and self-closing \`<presence/>\`, leaves buffer empty.

## Deep Concept Breakdown & Under the Hood

### 1. Opening Stream Header vs. Child Stanzas
Unlike ordinary XML documents, the opening \`<stream:stream>\` element never closes until session teardown:
- **Opening stream header**: terminates as soon as the first \`>\` closes its opening tag.
- **Self-closing stanzas**: elements ending with \`/>\` inside their opening tag (such as \`<presence/>\` or \`<ping/>\`) complete immediately at \`/>\`.
- **Paired stanzas**: elements whose opening tag closes with \`>\` must buffer bytes until the matching \`</TagName>\` closing delimiter arrives in full.

### 2. Tail-Recursive Buffer Consumption & Sub-Binary Unpinning
Each incoming socket chunk is appended to any partial remainder, trimmed of leading ASCII whitespace (\`32\`, \`13\`, \`10\`, \`9\`), and scanned iteratively in FIFO order until the leading tag is incomplete. Copying both each emitted frame and the unparsed trailing slice with \`binary:copy/1\` detaches the long-lived connection process from large socket buffers.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / binary)
binary:match(Subject, Pattern) -> {Start, Length} | nomatch
binary:part(Subject, Start, Length) -> binary()
binary:copy(Subject) -> binary()
  Types:
    Subject = Pattern = binary()
    Start = Length = non_neg_integer()
\`\`\`

Consult the attached OTP documentation cards below for \`binary:part/3\` constant-time slicing and \`binary:copy/1\` heap unpinning guarantees.

## Parallel Worked Example: Bracketed Telemetry Packet Reassembler

Consider a separate domain: a **Delimited Packet Reassembler** (\`bracket_msg_framer\`) that extracts complete \`[HDR]...\` or paired \`{CMD}...{/CMD}\` / standalone \`!PING\` style bracketed records from split TCP byte streams—looping tail-recursively over coalesced packets and detaching both extracted records and partial remainders with \`binary:copy/1\`:

\`\`\`erlang
-module(bracket_msg_framer).
-export([slice_packets/2]).

%% @doc Append Incoming bytes to Rem and extract all complete bracketed records plus unpinned Remainder.
slice_packets(Rem, Incoming) ->
    loop_slice(<<Rem/binary, Incoming/binary>>, []).

loop_slice(Bin, Acc) ->
    Trimmed = skip_ws(Bin),
    case Trimmed of
        <<>> ->
            {lists:reverse(Acc), <<>>};
        <<"!PING;", Rest/binary>> ->
            loop_slice(Rest, [<<"!PING;">> | Acc]);
        <<"[", _/binary>> ->
            case binary:match(Trimmed, <<";">>) of
                {Pos, Len} ->
                    End = Pos + Len,
                    Frame = binary:copy(binary:part(Trimmed, 0, End)),
                    Rest = binary:part(Trimmed, End, byte_size(Trimmed) - End),
                    loop_slice(Rest, [Frame | Acc]);
                nomatch ->
                    {lists:reverse(Acc), binary:copy(Trimmed)}
            end;
        _ ->
            {lists:reverse(Acc), binary:copy(Trimmed)}
    end.

skip_ws(<<32, T/binary>>) -> skip_ws(T);
skip_ws(<<10, T/binary>>) -> skip_ws(T);
skip_ws(<<13, T/binary>>) -> skip_ws(T);
skip_ws(<<9, T/binary>>)  -> skip_ws(T);
skip_ws(Bin) -> Bin.
\`\`\`

### What ERTS Does at Runtime
- **Accumulator FIFO Extraction**: Collecting matched slices onto \`Acc\` and calling \`lists:reverse/1\` at EOF builds frames in arrival order in $O(N)$ time with zero list appends.
- **Bounded Refc Lifetime**: Calling \`binary:copy/1\` on incomplete trailing slices lets GC reclaim large kernel read buffers after every socket wake-up.

## Assignment Specification

Implement \`xmpp_xml_framer\` in \`src/xmpp_xml_framer.erl\` exporting \`extract_frames/2\`.

### \`extract_frames/2\`
- **Input**: \`Binary BufferBin\` (partial remainder from prior reads), \`Binary NewChunkBin\` (newly arrived socket bytes).
- **Behavior**: Appends \`NewChunkBin\` onto \`BufferBin\` and iteratively scans from left to right after trimming leading ASCII whitespace (space, CR, LF, tab):
  - When the remaining binary starts with an opening \`<stream:stream\` tag, slices up through its closing \`>\` as an individual frame (or stops and buffers if \`>\` has not arrived yet).
  - When the remaining binary starts with another XML element \`<Tag...\`, reads the element's tag name up to whitespace, \`/\`, or \`>\`; emits self-closing tags up to \`/>\` as a frame, or pairs matching \`</Tag>\` boundaries for non-self-closing elements.
  - Stops whenever a frame or closing tag is still incomplete, copies every extracted frame and any non-empty remainder with \`binary:copy/1\` to prevent sub-binary retention, and returns \`{FramesList, RemainingBufferBin}\` with frames in strict FIFO arrival order (returning an empty binary when no bytes remain).
- **Examples**:
  - \`xmpp_xml_framer:extract_frames(<<>>, <<"<stream:stream to='localhost'> <iq type='get'">>)\` returns \`{[<<"<stream:stream to='localhost'>">>],<<"<iq type='get'">>}\`.
  - \`xmpp_xml_framer:extract_frames(<<"<iq type='get'">>, <<" id='1'><ping/></iq><presence/>">>)\` returns \`{[<<"<iq type='get' id='1'><ping/></iq>">>,<<"<presence/>">>],<<>>}\`.

## Rules & Verification Constraints
- **Required Calls & Constructs**: \`bf_ast_verifier\` enforces calls to \`binary:match/2\` and \`binary:copy/1\` alongside binary syntax (\`bit_syntax\`).
- **Stream Integrity**: Must preserve strict FIFO stanza order across arbitrary fragmentation and buffer coalescing without leaking parent binary references.`,
    otpDocCards: [
      {
        functionName: 'part',
        module: 'binary',
        signature: 'binary:part(Subject, Start, Length) -> binary()',
        typesSpec: [
          'Subject = binary()',
          'Start = non_neg_integer()',
          'Length = integer()',
        ],
        description: 'Extracts a slice from Subject as a sub-binary.',
        complexityNote: 'Constant O(1) time sub-binary slicing.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#part/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl',
      },
      {
        functionName: 'copy',
        module: 'binary',
        signature: 'binary:copy(Subject) -> binary()',
        typesSpec: [
          'Subject = binary()',
        ],
        description: 'Forces clean allocation of remaining unparsed buffer bytes.',
        complexityNote: 'Prevents long-lived connection processes from retaining socket buffers.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#copy/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl',
      },
    ],
    files: [
      {
        path: 'src/xmpp_xml_framer.erl',
        name: 'xmpp_xml_framer.erl',
        content: `-module(xmpp_xml_framer).
-export([extract_frames/2]).

%% @doc Append NewChunkBin to BufferBin, extract all complete stream header, self-closing, and paired XML stanza frames in FIFO order with binary:copy/1 unpinning, and return {FramesList, RemainingBufferBin}.
extract_frames(_BufferBin, _NewChunkBin) ->
    {[], <<>>}.
`,
      },
    ],
    solutionFiles: {
      'src/xmpp_xml_framer.erl': `-module(xmpp_xml_framer).
-export([extract_frames/2]).

%% @doc Append NewChunkBin to BufferBin, extract all complete stream header, self-closing, and paired XML stanza frames in FIFO order with binary:copy/1 unpinning, and return {FramesList, RemainingBufferBin}.
-spec extract_frames(binary(), binary()) -> {[binary()], binary()}.
extract_frames(BufferBin, NewChunkBin) ->
    Combined = <<BufferBin/binary, NewChunkBin/binary>>,
    extract_loop(Combined, []).

extract_loop(Bin, Acc) ->
    Trimmed = trim_leading(Bin),
    case byte_size(Trimmed) of
        0 ->
            {lists:reverse(Acc), <<>>};
        _ ->
            case try_extract_frame(Trimmed) of
                {ok, Frame, Rest} ->
                    extract_loop(Rest, [Frame | Acc]);
                need_more ->
                    {lists:reverse(Acc), binary:copy(Trimmed)}
            end
    end.

trim_leading(<<32, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<13, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<10, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<9, Rest/binary>>)  -> trim_leading(Rest);
trim_leading(Bin) -> Bin.

try_extract_frame(Bin) ->
    case Bin of
        <<"<stream:stream", _/binary>> ->
            case binary:match(Bin, <<">">>) of
                {GtPos, _} ->
                    HeaderLen = GtPos + 1,
                    Frame = binary:copy(binary:part(Bin, 0, HeaderLen)),
                    Rest = binary:part(Bin, HeaderLen, byte_size(Bin) - HeaderLen),
                    {ok, Frame, Rest};
                nomatch ->
                    need_more
            end;
        <<"<", Rest/binary>> ->
            case parse_tag_name(Rest, <<>>) of
                {ok, TagName, _} ->
                    try_extract_element(Bin, TagName);
                need_more ->
                    need_more
            end;
        _ ->
            need_more
    end.

parse_tag_name(<<>>, _Acc) -> need_more;
parse_tag_name(<<C, _/binary>>, Acc) when C =:= 32; C =:= $>; C =:= $/ ->
    if
        byte_size(Acc) > 0 -> {ok, Acc, C};
        true -> need_more
    end;
parse_tag_name(<<C, Rest/binary>>, Acc) ->
    parse_tag_name(Rest, <<Acc/binary, C>>).

try_extract_element(Bin, TagName) ->
    case binary:match(Bin, <<">">>) of
        nomatch ->
            need_more;
        {FirstGt, _} ->
            FirstTag = binary:part(Bin, 0, FirstGt + 1),
            case binary:match(FirstTag, <<"/>">>) of
                {_, _} ->
                    %% Self-closing tag
                    Frame = binary:copy(FirstTag),
                    Rest = binary:part(Bin, FirstGt + 1, byte_size(Bin) - (FirstGt + 1)),
                    {ok, Frame, Rest};
                nomatch ->
                    %% Paired tag: search for </TagName>
                    CloseTag = <<"</", TagName/binary, ">">>,
                    case binary:match(Bin, CloseTag) of
                        {ClosePos, CloseLen} ->
                            TotalLen = ClosePos + CloseLen,
                            Frame = binary:copy(binary:part(Bin, 0, TotalLen)),
                            Rest = binary:part(Bin, TotalLen, byte_size(Bin) - TotalLen),
                            {ok, Frame, Rest};
                        nomatch ->
                            need_more
                    end
            end
    end.
`,
    },
    starterCode: `-module(xmpp_xml_framer).
-export([extract_frames/2]).

%% @doc Append NewChunkBin to BufferBin, extract all complete stream header, self-closing, and paired XML stanza frames in FIFO order with binary:copy/1 unpinning, and return {FramesList, RemainingBufferBin}.
extract_frames(_BufferBin, _NewChunkBin) ->
    {[], <<>>}.
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l05-1',
        title: 'Extract Stream Header and Partial IQ',
        erlangCall: 'xmpp_xml_framer:extract_frames(<<>>, <<"<stream:stream to=\'localhost\'> <iq type=\'get\'">>)',
        expectedOutput: '{[<<"<stream:stream to=\'localhost\'>">>],<<"<iq type=\'get\'">>}',
        explanation: 'Extracts stream opening tag and leaves unclosed <iq in remainder buffer.',
      },
      {
        id: 'tc-ch11-l05-2',
        title: 'Complete Fragmented IQ and Coalesced Presence',
        erlangCall: 'xmpp_xml_framer:extract_frames(<<"<iq type=\'get\'">>, <<" id=\'1\'><ping/></iq><presence/>">>)',
        expectedOutput: '{[<<"<iq type=\'get\' id=\'1\'><ping/></iq>">>,<<"<presence/>">>],<<>>}',
        explanation: 'Completes fragmented IQ and extracts subsequent coalesced presence.',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['binary:copy/1', 'binary:match/2'],
      requiredConstructs: ['bit_syntax'],
    },
    solutionCode: `-module(xmpp_xml_framer).
-export([extract_frames/2]).

%% @doc Append NewChunkBin to BufferBin, extract all complete stream header, self-closing, and paired XML stanza frames in FIFO order with binary:copy/1 unpinning, and return {FramesList, RemainingBufferBin}.
-spec extract_frames(binary(), binary()) -> {[binary()], binary()}.
extract_frames(BufferBin, NewChunkBin) ->
    Combined = <<BufferBin/binary, NewChunkBin/binary>>,
    extract_loop(Combined, []).

extract_loop(Bin, Acc) ->
    Trimmed = trim_leading(Bin),
    case byte_size(Trimmed) of
        0 ->
            {lists:reverse(Acc), <<>>};
        _ ->
            case try_extract_frame(Trimmed) of
                {ok, Frame, Rest} ->
                    extract_loop(Rest, [Frame | Acc]);
                need_more ->
                    {lists:reverse(Acc), binary:copy(Trimmed)}
            end
    end.

trim_leading(<<32, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<13, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<10, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<9, Rest/binary>>)  -> trim_leading(Rest);
trim_leading(Bin) -> Bin.

try_extract_frame(Bin) ->
    case Bin of
        <<"<stream:stream", _/binary>> ->
            case binary:match(Bin, <<">">>) of
                {GtPos, _} ->
                    HeaderLen = GtPos + 1,
                    Frame = binary:copy(binary:part(Bin, 0, HeaderLen)),
                    Rest = binary:part(Bin, HeaderLen, byte_size(Bin) - HeaderLen),
                    {ok, Frame, Rest};
                nomatch ->
                    need_more
            end;
        <<"<", Rest/binary>> ->
            case parse_tag_name(Rest, <<>>) of
                {ok, TagName, _} ->
                    try_extract_element(Bin, TagName);
                need_more ->
                    need_more
            end;
        _ ->
            need_more
    end.

parse_tag_name(<<>>, _Acc) -> need_more;
parse_tag_name(<<C, _/binary>>, Acc) when C =:= 32; C =:= $>; C =:= $/ ->
    if
        byte_size(Acc) > 0 -> {ok, Acc, C};
        true -> need_more
    end;
parse_tag_name(<<C, Rest/binary>>, Acc) ->
    parse_tag_name(Rest, <<Acc/binary, C>>).

try_extract_element(Bin, TagName) ->
    case binary:match(Bin, <<">">>) of
        nomatch ->
            need_more;
        {FirstGt, _} ->
            FirstTag = binary:part(Bin, 0, FirstGt + 1),
            case binary:match(FirstTag, <<"/>">>) of
                {_, _} ->
                    %% Self-closing tag
                    Frame = binary:copy(FirstTag),
                    Rest = binary:part(Bin, FirstGt + 1, byte_size(Bin) - (FirstGt + 1)),
                    {ok, Frame, Rest};
                nomatch ->
                    %% Paired tag: search for </TagName>
                    CloseTag = <<"</", TagName/binary, ">">>,
                    case binary:match(Bin, CloseTag) of
                        {ClosePos, CloseLen} ->
                            TotalLen = ClosePos + CloseLen,
                            Frame = binary:copy(binary:part(Bin, 0, TotalLen)),
                            Rest = binary:part(Bin, TotalLen, byte_size(Bin) - TotalLen),
                            {ok, Frame, Rest};
                        nomatch ->
                            need_more
                    end
            end
    end.
`,
    solutionExplanation: `The framer handles arbitrary byte fragmentation:
1. extract_loop trims leading whitespace using ASCII byte comparisons (32, 13, 10, 9) and repeatedly calls try_extract_frame until no more complete XML elements can be formed.
2. If the buffer begins with <stream:stream, it extracts the opening tag up to >.
3. For child tags, it parses the TagName, checks if the tag is self-closing (<tag ... />), and if not, searches for the matching closing tag </tag>.
4. If a tag is incomplete, it returns need_more and copies the remaining slice using binary:copy/1 to prevent sub-binary leaks.`,
    references: [
      {
        title: 'IETF RFC 6120: Section 4.3 XML Streams & Framing',
        url: 'https://datatracker.ietf.org/doc/html/rfc6120',
        category: 'book_rfc',
        description: 'Detailed requirements for parsing open XML streams and child elements.',
      },
    ],
  },

  {
    id: 'ch11-l06',
    chapterNumber: 11,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'The C2S Connection Handshake State Machine (RFC 6120)',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'Why does the C2S connection state machine set inet:setopts(Socket, [{active, once}]) after receiving each TCP packet instead of using {active, true}?',
      options: [
        {
          id: 'A',
          label: 'To implement backpressure flow control at the OS kernel socket buffer level, preventing malicious clients from flooding the BEAM process mailbox.',
          isCorrect: true,
          explanation: '{active, once} stops the kernel from pushing packets to the process mailbox until the current packet has been fully handled.'
        },
        {
          id: 'B',
          label: 'Because {active, true} is not supported on Windows.',
          isCorrect: false,
          explanation: '{active, true} works on all OS platforms, but lacks flow control.'
        },
        {
          id: 'C',
          label: 'Because {active, once} runs twice as fast as passive recv.',
          isCorrect: false,
          explanation: 'The primary benefit of {active, once} is mailbox protection and event-driven backpressure.'
        },
        {
          id: 'D',
          label: 'Because raw TCP sockets can only receive one packet per lifetime.',
          isCorrect: false,
          explanation: 'Sockets receive endless packets; {active, once} requests them one at a time.'
        }
      ]
    },
    conceptMarkdown: `## Why This Matters in Production

In production servers like **MongooseIM** (\`mongoose_c2s.erl\`) and **ejabberd**, each connected TCP client runs an OTP **\`gen_statem\`** process. 

Before a client can send or receive chat messages, it MUST navigate a strict cryptographic and protocol handshake. If an unauthenticated client sends a chat \`<message>\` or an \`<iq>\` before authenticating, the server MUST reject it immediately to prevent unauthorized spoofing.

> [!IMPORTANT]
> **C2S Client Handshake Finite State Machine:**
> - **\`wait_for_stream\`** -> Initial state awaiting the domain-matched \`stream_open\` event.
> - **\`wait_for_sasl\`** -> Negotiates SASL PLAIN credentials; rejects any premature stanza or bind attempt.
> - **\`authenticated\`** -> Identity verified; awaits resource binding before opening stanza delivery.
> - **\`session_established\`** -> Bound Full JID active; routes chat messages and updates presence.

## Deep Concept Breakdown & Under the Hood

### 1. The SASL PLAIN Credential Format (RFC 4616)
In RFC 6120 and RFC 4616, SASL PLAIN transmits identity tokens as a Base64-encoded triple separated by null (\`0\`) bytes:
\`\`\`text
Base64( authzid || 0x00 || authcid || 0x00 || passwd )
\`\`\`
For anonymous \`authzid\`, the decoded binary starts with byte \`0\` followed by \`username\`, \`0\`, and \`password\`. Decoders strip an optional leading null byte, split the remainder on \`<<0>>\`, enforce non-empty credentials, and copy extracted slices with \`binary:copy/1\` inside a \`try ... catch\` guard against invalid Base64 input.

### 2. Phase-Gated Security Invariants
Pure OTP state machines reject out-of-order protocol events cleanly without crashing or mutating state:
- Receiving non-handshake stanzas before the stream opens leaves the connection in \`wait_for_stream\` and returns a structured pre-stream error tuple.
- Receiving chat messages or bind requests while unauthenticated in \`wait_for_sasl\` refuses the operation with an authorization failure while keeping the FSM in \`wait_for_sasl\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / base64 & binary)
base64:decode(Base64) -> Data
  Types:
    Base64 = binary() | string()
    Data = binary()

binary:split(Subject, Pattern, Options) -> [binary()]
  Types:
    Subject = Pattern = binary()
    Options = [global | trim | trim_all]
\`\`\`

Consult the attached documentation cards below for \`base64:decode/1\` and \`binary:split/3\` semantics.

## Parallel Worked Example: Token-Gated Telemetry Channel FSM

Consider a separate domain: a **Gateway Telemetry Channel State Machine** (\`channel_auth_fsm\`) progressing through \`await_hello\` -> \`await_key\` -> \`ready\` using exact map matching (\`:=\`), \`base64:decode/1\`, colon-delimited binary slicing with \`binary:copy/1\`, and strict out-of-phase error rejections:

\`\`\`erlang
-module(channel_auth_fsm).
-export([boot/1, dispatch/2, current_phase/1]).

%% @doc Initialize a gateway channel state map locked in await_hello phase.
boot(Cluster) ->
    #{phase => await_hello, cluster => Cluster, client => <<>>}.

%% @doc Transition the channel FSM cleanly across handshake, key verification, and telemetry emit.
dispatch({hello, Cluster}, #{phase := await_hello, cluster := Cluster} = St) ->
    {reply, <<"CHALLENGE:BASE64_KEY">>, St#{phase => await_key}};
dispatch(_Other, #{phase := await_hello} = St) ->
    {error, hello_required, St};
dispatch({verify_key, B64}, #{phase := await_key} = St) ->
    case decode_key_pair(B64) of
        {ok, ClientId, _Secret} ->
            {reply, <<"KEY_ACCEPTED">>, St#{phase => ready, client => ClientId}};
        bad_key ->
            {error, invalid_key, St}
    end;
dispatch(_Other, #{phase := await_key} = St) ->
    {error, key_required, St};
dispatch({emit, Metric}, #{phase := ready, cluster := Cluster, client := Client} = St) ->
    Endpoint = <<Client/binary, "@", Cluster/binary>>,
    {ok, {accepted, Endpoint, Metric}, St};
dispatch(_Other, #{phase := ready} = St) ->
    {error, unsupported_cmd, St}.

%% @doc Read the active phase atom from a channel state map.
current_phase(#{phase := Phase}) ->
    Phase.

decode_key_pair(B64) ->
    try
        Raw = base64:decode(B64),
        case Raw of
            <<$:, Tail/binary>> ->
                case binary:split(Tail, <<":">>) of
                    [Id, Sec] when byte_size(Id) > 0 ->
                        {ok, binary:copy(Id), binary:copy(Sec)};
                    _ -> bad_key
                end;
            _ -> bad_key
        end
    catch
        _:_ -> bad_key
    end.
\`\`\`

### What ERTS Does at Runtime
- **Compile-Time Exact Key Assertions**: Using \`#{phase := ...}\` asserts key existence in the map header check and fails fast on corrupted state maps while updating only changed keys (\`St#{phase => ready}\`).
- **Exception-Safe Decoding**: Wrapping \`base64:decode/1\` in \`try ... catch\` ensures malformed client payloads return \`{error, invalid_key, St}\` rather than crashing the FSM worker process.

## Assignment Specification

Implement \`xmpp_c2s_fsm\` in \`src/xmpp_c2s_fsm.erl\` exporting \`init/1\`, \`handle_event/2\`, and \`get_state/1\`.

### \`init/1\`
- **Input**: \`Binary Domain\` (server domain handled by this C2S session).
- **Behavior**: Returns an initial session state map whose current phase is \`wait_for_stream\`, storing \`domain\` set to \`Domain\` and empty binaries for \`user\` and \`full_jid\`.
- **Examples**:
  - \`xmpp_c2s_fsm:get_state(xmpp_c2s_fsm:init(<<"localhost">>))\` returns \`wait_for_stream\`.

### \`handle_event/2\`
- **Input**: Tagged event tuple and current FSM state map.
- **Behavior**: Dispatches events strictly according to the active phase:
  - **In \`wait_for_stream\`**: A domain-matching \`stream_open\` event transitions state to \`wait_for_sasl\` and replies with the SASL PLAIN \`stream:features\` XML banner. Any other event preserves state and returns an \`unexpected_stanza_before_stream\` error tuple.
  - **In \`wait_for_sasl\`**: An \`auth_plain\` event carrying a Base64-encoded RFC 4616 credential token decodes the token cleanly (handling both leading-null binary stripping and global null-splitting), detaches the non-empty username with \`binary:copy/1\`, stores \`user\`, transitions to \`authenticated\`, and replies with the SASL \`<success/>\` XML stanza (invalid Base64 or malformed tokens return an \`invalid_credentials\` error tuple without advancing state). Any non-auth event in \`wait_for_sasl\` returns a \`not_authorized\` error tuple.
  - **In \`authenticated\`**: A \`bind_resource\` event carrying stanza \`Id\` and client \`Resource\` constructs \`FullJid\` in \`user@domain/resource\` format, stores \`full_jid\`, transitions to \`session_established\`, and replies with an RFC 6120 IQ bind \`result\` XML stanza carrying \`FullJid\` under \`urn:ietf:params:xml:ns:xmpp-bind\`. Any other event returns an \`expected_bind\` error tuple.
  - **In \`session_established\`**: A \`chat_message\` event carrying target JID, stanza id, and body returns an \`ok\` routing result with \`{routed, To}\` and unchanged state; a \`presence\` event carrying \`Type\` returns an \`ok\` result with \`{presence_updated, Type}\`; any other event returns an \`unknown_event\` error tuple.
- **Examples**:
  - After \`{stream_open, <<"localhost">>}\` from initial state, \`handle_event\` returns \`{reply, FeaturesXml, NextState}\` with \`get_state(NextState) =:= wait_for_sasl\`.
  - Sending \`{chat_message, <<"bob">>, <<"1">>, <<"hi">>}\` in \`wait_for_sasl\` returns \`{error, not_authorized, State}\`.

### \`get_state/1\`
- **Input**: FSM state map containing a \`state\` key.
- **Behavior**: Extracts and returns the active state atom (\`wait_for_stream\`, \`wait_for_sasl\`, \`authenticated\`, or \`session_established\`).
- **Examples**:
  - \`xmpp_c2s_fsm:get_state(#{state => authenticated, domain => <<"localhost">>, user => <<"alice">>, full_jid => <<>>})\` returns \`authenticated\`.

## Rules & Verification Constraints
- **AST Checks**: \`bf_ast_verifier\` enforces \`base64:decode/1\`, \`binary:copy/1\`, \`bit_syntax\`, and \`map_exact_match\`.
- **Handshake Ordering**: Unauthenticated messages must be rejected cleanly with \`not_authorized\`; resource binding must produce an exact RFC 6120 IQ result carrying \`user@domain/resource\`.`,
    otpDocCards: [
      {
        functionName: 'decode',
        module: 'base64',
        signature: 'base64:decode(Base64) -> binary()',
        typesSpec: [
          'Base64 = binary() | string()',
        ],
        description: 'Decodes Base64 encoded binary into raw credential bytes.',
        complexityNote: 'Linear scan decoding 4 Base64 characters into 3 bytes.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/base64.html#decode/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/base64.erl',
      },
      {
        functionName: 'split',
        module: 'binary',
        signature: 'binary:split(Binary, Pattern, Options) -> [binary()]',
        typesSpec: [
          'Binary = binary()',
          'Pattern = binary()',
          'Options = [global]',
        ],
        description: 'Extracts null-delimited username and password from SASL payload.',
        complexityNote: 'Extracts authentication tokens with bounded memory allocations.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#split/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl',
      },
    ],
    files: [
      {
        path: 'src/xmpp_c2s_fsm.erl',
        name: 'xmpp_c2s_fsm.erl',
        content: `-module(xmpp_c2s_fsm).
-export([
    init/1,
    handle_event/2,
    get_state/1
]).

%% @doc Initialize a fresh RFC 6120 C2S handshake state map for Domain awaiting the initial stream opening header.
init(_Domain) ->
    ok.

%% @doc Process an XMPP stream, SASL PLAIN, resource-bind, or session stanza event against State, returning a reply, routing ok result, or phase-specific error tuple.
handle_event(_Event, State) ->
    {error, not_implemented, State}.

%% @doc Extract and return the current FSM state atom from State.
get_state(_State) ->
    undefined.
`,
      },
    ],
    solutionFiles: {
      'src/xmpp_c2s_fsm.erl': `-module(xmpp_c2s_fsm).
-export([
    init/1,
    handle_event/2,
    get_state/1
]).

-type fsm_state() :: #{
    state := atom(),
    domain := binary(),
    user := binary(),
    full_jid := binary()
}.

%% @doc Initialize a fresh RFC 6120 C2S handshake state map for Domain awaiting the initial stream opening header.
-spec init(binary()) -> fsm_state().
init(Domain) ->
    #{state => wait_for_stream, domain => Domain, user => <<>>, full_jid => <<>>}.

%% @doc Process an XMPP stream, SASL PLAIN, resource-bind, or session stanza event against State, returning a reply, routing ok result, or phase-specific error tuple.
-spec handle_event(term(), fsm_state()) ->
    {reply, binary() | [binary()], fsm_state()} |
    {ok, term(), fsm_state()} |
    {error, atom(), fsm_state()}.
handle_event(Event, #{state := wait_for_stream, domain := Domain} = State) ->
    case Event of
        {stream_open, Domain} ->
            Reply = <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
            {reply, Reply, State#{state => wait_for_sasl}};
        _ ->
            {error, unexpected_stanza_before_stream, State}
    end;

handle_event(Event, #{state := wait_for_sasl} = State) ->
    case Event of
        {auth_plain, Base64Token} ->
            case decode_sasl_plain(Base64Token) of
                {ok, User, _Pass} ->
                    Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
                    {reply, Success, State#{state => authenticated, user => User}};
                error ->
                    {error, invalid_credentials, State}
            end;
        _ ->
            {error, not_authorized, State}
    end;

handle_event(Event, #{state := authenticated, domain := Domain, user := User} = State) ->
    case Event of
        {bind_resource, Id, Resource} ->
            FullJid = <<User/binary, "@", Domain/binary, "/", Resource/binary>>,
            Result = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>,
            {reply, Result, State#{state => session_established, full_jid => FullJid}};
        _ ->
            {error, expected_bind, State}
    end;

handle_event(Event, #{state := session_established} = State) ->
    case Event of
        {chat_message, To, _Id, _Body} ->
            {ok, {routed, To}, State};
        {presence, Type} ->
            {ok, {presence_updated, Type}, State};
        _ ->
            {error, unknown_event, State}
    end;

handle_event(_Event, State) ->
    {error, unknown_state, State}.

%% @doc Extract and return the current FSM state atom from State.
-spec get_state(fsm_state()) -> atom().
get_state(#{state := StateName}) -> StateName.

decode_sasl_plain(Base64Token) ->
    try
        Decoded = base64:decode(Base64Token),
        case Decoded of
            <<0, Rest/binary>> ->
                case binary:split(Rest, <<0>>) of
                    [User, Pass] when byte_size(User) > 0 ->
                        {ok, binary:copy(User), binary:copy(Pass)};
                    _ -> error
                end;
            _ ->
                case binary:split(Decoded, <<0>>, [global]) of
                    [User, Pass] when byte_size(User) > 0 ->
                        {ok, binary:copy(User), binary:copy(Pass)};
                    _ -> error
                end
        end
    catch
        _:_ -> error
    end.
`,
    },
    starterCode: `-module(xmpp_c2s_fsm).
-export([
    init/1,
    handle_event/2,
    get_state/1
]).

%% @doc Initialize a fresh RFC 6120 C2S handshake state map for Domain awaiting the initial stream opening header.
init(_Domain) ->
    ok.

%% @doc Process an XMPP stream, SASL PLAIN, resource-bind, or session stanza event against State, returning a reply, routing ok result, or phase-specific error tuple.
handle_event(_Event, State) ->
    {error, not_implemented, State}.

%% @doc Extract and return the current FSM state atom from State.
get_state(_State) ->
    undefined.
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l06-1',
        title: 'Initial Stream Open and Transition to wait_for_sasl',
        erlangCall: 'begin S0 = xmpp_c2s_fsm:init(<<"localhost">>), {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0), xmpp_c2s_fsm:get_state(S1) end',
        expectedOutput: 'wait_for_sasl',
        explanation: 'Transitions from wait_for_stream to wait_for_sasl upon receiving stream_open.',
      },
      {
        id: 'tc-ch11-l06-2',
        title: 'Reject Chat Message Before Authentication',
        erlangCall: 'begin S0 = xmpp_c2s_fsm:init(<<"localhost">>), {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0), {error, Reason, _} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob">>, <<"1">>, <<"hi">>}, S1), Reason end',
        expectedOutput: 'not_authorized',
        explanation: 'Rejects chat messages in wait_for_sasl state with not_authorized.',
      },
      {
        id: 'tc-ch11-l06-3',
        title: 'Complete SASL Auth and Resource Binding',
        erlangCall: 'begin S0 = xmpp_c2s_fsm:init(<<"localhost">>), {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0), Token = base64:encode(<<0, "alice", 0, "secret">>), {reply, _, S2} = xmpp_c2s_fsm:handle_event({auth_plain, Token}, S1), {reply, _, S3} = xmpp_c2s_fsm:handle_event({bind_resource, <<"b1">>, <<"mobile">>}, S2), {xmpp_c2s_fsm:get_state(S3), maps:get(full_jid, S3)} end',
        expectedOutput: '{session_established,<<"alice@localhost/mobile">>}',
        explanation: 'Authenticates with SASL PLAIN, binds resource, and establishes Full JID session.',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['base64:decode/1', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax', 'map_exact_match'],
    },
    solutionCode: `-module(xmpp_c2s_fsm).
-export([
    init/1,
    handle_event/2,
    get_state/1
]).

-type fsm_state() :: #{
    state := atom(),
    domain := binary(),
    user := binary(),
    full_jid := binary()
}.

%% @doc Initialize a fresh RFC 6120 C2S handshake state map for Domain awaiting the initial stream opening header.
-spec init(binary()) -> fsm_state().
init(Domain) ->
    #{state => wait_for_stream, domain => Domain, user => <<>>, full_jid => <<>>}.

%% @doc Process an XMPP stream, SASL PLAIN, resource-bind, or session stanza event against State, returning a reply, routing ok result, or phase-specific error tuple.
-spec handle_event(term(), fsm_state()) ->
    {reply, binary() | [binary()], fsm_state()} |
    {ok, term(), fsm_state()} |
    {error, atom(), fsm_state()}.
handle_event(Event, #{state := wait_for_stream, domain := Domain} = State) ->
    case Event of
        {stream_open, Domain} ->
            Reply = <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
            {reply, Reply, State#{state => wait_for_sasl}};
        _ ->
            {error, unexpected_stanza_before_stream, State}
    end;

handle_event(Event, #{state := wait_for_sasl} = State) ->
    case Event of
        {auth_plain, Base64Token} ->
            case decode_sasl_plain(Base64Token) of
                {ok, User, _Pass} ->
                    Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
                    {reply, Success, State#{state => authenticated, user => User}};
                error ->
                    {error, invalid_credentials, State}
            end;
        _ ->
            {error, not_authorized, State}
    end;

handle_event(Event, #{state := authenticated, domain := Domain, user := User} = State) ->
    case Event of
        {bind_resource, Id, Resource} ->
            FullJid = <<User/binary, "@", Domain/binary, "/", Resource/binary>>,
            Result = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>,
            {reply, Result, State#{state => session_established, full_jid => FullJid}};
        _ ->
            {error, expected_bind, State}
    end;

handle_event(Event, #{state := session_established} = State) ->
    case Event of
        {chat_message, To, _Id, _Body} ->
            {ok, {routed, To}, State};
        {presence, Type} ->
            {ok, {presence_updated, Type}, State};
        _ ->
            {error, unknown_event, State}
    end;

handle_event(_Event, State) ->
    {error, unknown_state, State}.

%% @doc Extract and return the current FSM state atom from State.
-spec get_state(fsm_state()) -> atom().
get_state(#{state := StateName}) -> StateName.

decode_sasl_plain(Base64Token) ->
    try
        Decoded = base64:decode(Base64Token),
        case Decoded of
            <<0, Rest/binary>> ->
                case binary:split(Rest, <<0>>) of
                    [User, Pass] when byte_size(User) > 0 ->
                        {ok, binary:copy(User), binary:copy(Pass)};
                    _ -> error
                end;
            _ ->
                case binary:split(Decoded, <<0>>, [global]) of
                    [User, Pass] when byte_size(User) > 0 ->
                        {ok, binary:copy(User), binary:copy(Pass)};
                    _ -> error
                end
        end
    catch
        _:_ -> error
    end.
`,
    solutionExplanation: `The FSM implements the RFC 6120 handshake flow:
1. wait_for_stream: Verifies domain matching in {stream_open, Domain} and advertises SASL PLAIN mechanism.
2. wait_for_sasl: Rejects any stanzas (like chat messages or IQs) with {error, not_authorized, State}. On valid SASL PLAIN Base64 token, decodes the null-delimited credentials and advances to authenticated.
3. authenticated: Receives bind_resource, constructs Full JID User@Domain/Resource, emits the IQ result, and transitions to session_established.
4. session_established: Enables full stanza routing.`,
    references: [
      {
        title: 'IETF RFC 6120: Section 6 SASL Negotiation & Resource Binding',
        url: 'https://datatracker.ietf.org/doc/html/rfc6120',
        category: 'book_rfc',
        description: 'Standard authentication sequence and resource binding protocol definitions.',
      },
      {
        title: 'GitHub esl/MongooseIM: src/c2s/mongoose_c2s.erl',
        url: 'https://github.com/esl/MongooseIM/blob/master/src/c2s/mongoose_c2s.erl',
        category: 'github_ecosystem',
        description: 'Production battle-tested Erlang gen_statem C2S connection handler.',
      },
    ],
  },

  {
    id: 'ch11-l07',
    chapterNumber: 11,
    lessonNumber: 7,
    lessonType: 'incident_triage',
    title: 'Incident #107: Pre-Auth Stanza Injection & XML Entity Attacks',
    difficulty: 'Advanced',
    xpReward: 175,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'In Incident #107, what allowed unauthenticated attackers to inject fake admin commands into the session?',
      options: [
        {
          id: 'A',
          label: 'The connection state machine processed incoming <message> stanzas before the client finished SASL PLAIN authentication, and lacked an XML character escape loop.',
          isCorrect: true,
          explanation: 'Failing to reject pre-auth stanzas and neglecting to escape &, <, > characters allows authentication bypass and XML injection.'
        },
        {
          id: 'B',
          label: 'The server used MD5 password hashing instead of SHA-256.',
          isCorrect: false,
          explanation: 'The bug was architectural: pre-auth stanza dispatch and unescaped entity strings.'
        },
        {
          id: 'C',
          label: 'The Erlang runtime crashed on large payloads.',
          isCorrect: false,
          explanation: 'The BEAM handles large payloads effortlessly; this was an application security failure.'
        },
        {
          id: 'D',
          label: 'The client used an expired TLS certificate.',
          isCorrect: false,
          explanation: 'The incident occurred over plain C2S TCP streams without pre-auth state validation.'
        }
      ]
    },
    incidentAlert: {
      incidentId: 'INC-107',
      severity: 'CRITICAL',
      serviceName: 'xmpp-c2s-gateway',
      symptom: 'Unauthenticated TCP clients inject routed `<message/>` stanzas during handshake and break downstream XML parsers with unescaped characters.',
      impact: 'Pre-auth message spoofing across tenant JIDs and parser-desync client disconnect cascades cluster-wide.',
      diagnosticClue: 'The C2S dispatcher routes chat tuples regardless of stream phase and interpolates raw body bytes directly into XML elements.',
    },
    conceptMarkdown: `## Incident Briefing: INC-107 Pre-Auth Stanza Injection & XML Entity Attacks

Post-mortem telemetry from \`xmpp-c2s-gateway\` shows two stacked security regressions inside \`src/incident_xmpp_auth_bypass.erl\`:
1. **Unauthenticated Stanza Bypass**: \`process_c2s_stanza/3\` pattern-matches \`{chat_message, To, Body}\` with an ignored \`_Phase\` wildcard, allowing clients still in \`wait_for_stream\` or \`wait_for_sasl\` to forge and route messages before SASL authentication completes.
2. **XML Tag Injection / Parser Desync**: \`escape_xml_text/1\` returns the raw input binary unmodified, allowing \`<\`, \`>\`, and \`&\` inside message text to terminate \`<body>\` prematurely and inject arbitrary child stanzas.

---

## Why This Matters in Production

In RFC 6120 (XMPP Core), a client-to-server (C2S) TCP connection progresses through strict protocol states: TCP stream initiation (\`wait_for_stream\`), TLS/SASL authentication (\`wait_for_sasl\`), resource binding, and only finally \`session_established\`. Every XMPP connection shares one long-lived XML stream document per socket; injecting an unescaped \`</body></message><iq .../>\` payload corrupts framing for the entire stream or smuggles unauthorized commands.

Equally critical is **fail-closed state gating**: real incidents happen when routers allow a command on wildcard states instead of exclusively enabling routing on the authenticated terminal state and rejecting all earlier or unexpected states.

---

## Deep Concept Breakdown & Under the Hood

### 1. Fail-Closed State Machine Dispatch
Instead of writing blacklist clauses for individual pre-auth states and risking a forgotten intermediate phase, bind \`session_established\` explicitly for routing and reject \`wait_for_stream\`, \`wait_for_sasl\`, and the catch-all \`_OtherState\`. In Erlang pattern matching, clause order matters: putting specific rejection heads and a single authenticated route clause followed by a catch-all rejection guarantees no state slips through.

### 2. Single-Pass Bit-Syntax Escaping vs Double-Escaping Bugs
Naive multi-pass string replacement fails subtly when escaping markup:
- If you replace \`<\` with \`&lt;\` first and \`&\` with \`&amp;\` second, \`<\` becomes \`&amp;lt;\`!
- Even in the reverse order, allocating intermediate binaries per pass wastes heap and risks desync.

Using an Erlang bit-syntax tail-recursive scan (\`<<Byte, Rest/binary>>\`) walks each byte **exactly once** in $O(N)$ time. Because \`Acc\` is passed directly into \`<<Acc/binary, ...>>\` in tail position, the BEAM runtime uses its appendable-binary optimization (in-place buffer growth with amortized linear time and zero intermediate sub-binary retention).

---

## Official Erlang Docs & Function Reference

- **\`maps:get/3\`**: Retrieves \`jid\` from the connection state map with an explicit fallback binary when the key is absent *(see OTP reference cards below)*.
- **\`erlang:is_binary/1\` & Bit Syntax Matching**: Guard and single-pass byte extraction (\`<<"&", Rest/binary>>\`, \`<<C, Rest/binary>>\`) *(see OTP reference cards below)*.

---

## Parallel Worked Example (Disjoint Domain: Telemetry Gatekeeper)

The standalone module below demonstrates **fail-closed phase gating** and **single-pass bit-syntax character escaping** for an industrial sensor telemetry bus percent-encoding \`;\` and \`=\` delimiters:

\`\`\`erlang
-module(telemetry_cmd_gate).
-export([handle_frame/3, escape_field/1, demo/0]).

%% Only the armed state permits telemetry frames; all earlier or unknown phases deny fail-closed.
handle_frame(awaiting_sync, _Cmd, Ctx) ->
    {denied, not_calibrated, Ctx};
handle_frame(armed, {emit, Sensor, RawVal}, Ctx) ->
    Safe = escape_field(RawVal),
    Node = maps:get(node_id, Ctx, <<"unknown-node">>),
    Frame = <<"NODE=", Node/binary, ";SENSOR=", Sensor/binary, ";VAL=", Safe/binary>>,
    {forward, Sensor, Frame, Ctx};
handle_frame(_OtherPhase, _Cmd, Ctx) ->
    {denied, not_calibrated, Ctx}.

%% Single-pass O(N) bit-syntax escaping prevents delimiter injection and double-escaping.
escape_field(Bin) when is_binary(Bin) ->
    scan_bytes(Bin, <<>>).

scan_bytes(<<>>, Acc) -> Acc;
scan_bytes(<<";", Rest/binary>>, Acc) -> scan_bytes(Rest, <<Acc/binary, "%3B">>);
scan_bytes(<<"=", Rest/binary>>, Acc) -> scan_bytes(Rest, <<Acc/binary, "%3D">>);
scan_bytes(<<C, Rest/binary>>, Acc)   -> scan_bytes(Rest, <<Acc/binary, C>>).

demo() ->
    Pre = handle_frame(awaiting_sync, {emit, <<"t1">>, <<"9=ok;1">>}, #{node_id => <<"rack-4">>}),
    Post = handle_frame(armed, {emit, <<"t1">>, <<"9=ok;1">>}, #{node_id => <<"rack-4">>}),
    {Pre, Post}.
\`\`\`

---

## Assignment Specification

Repair \`src/incident_xmpp_auth_bypass.erl\` so both security vulnerabilities are eliminated while preserving all exported test probes:

### 1. \`process_c2s_stanza(Phase, Stanza, State)\`
- **Input**:
  - \`Phase :: atom()\` (e.g., \`wait_for_stream\`, \`wait_for_sasl\`, \`session_established\`, or any other phase)
  - \`Stanza :: {chat_message, To :: binary(), Body :: binary()} | term()\`
  - \`State :: map()\` (typically contains \`jid => binary()\`, or \`undefined\`)
- **Behavior**:
  - Whenever \`Phase\` is \`wait_for_stream\`, \`wait_for_sasl\`, or any non-\`session_established\` state (fail-closed catch-all), return:
    \`{reject, <<"<stream:error><not-authorized/></stream:error>">>, State}\`
  - Only when \`Phase\` is \`session_established\` AND \`Stanza\` matches \`{chat_message, To, Body}\`:
    - Sanitize \`Body\` with \`escape_xml_text/1\`.
    - Read \`From\` using \`maps:get(jid, State, <<"system@localhost">>)\`.
    - Format \`Xml\` as \`<message from='<From>' to='<To>' type='chat'><body><EscapedBody></body></message>\`.
    - Return \`{route, To, Xml, State}\`.
- **Examples**:
  - \`process_c2s_stanza(wait_for_stream, {chat_message, <<"victim@localhost">>, <<"Hi">>}, #{jid => undefined})\` -> \`{reject, <<"<stream:error><not-authorized/></stream:error>">>, #{jid => undefined}}\`
  - \`process_c2s_stanza(session_established, {chat_message, <<"bob@localhost">>, <<"A & B">>}, #{jid => <<"alice@localhost">>})\` -> \`{route, <<"bob@localhost">>, <<"<message from='alice@localhost' to='bob@localhost' type='chat'><body>A &amp; B</body></message>">>, #{jid => <<"alice@localhost">>}}\`

### 2. \`escape_xml_text(Bin)\`
- **Input**: \`Bin :: binary()\`
- **Behavior**: Escapes every byte in a single bit-syntax pass over \`Bin\`, replacing:
  - \`&\` with \`&amp;\`
  - \`<\` with \`&lt;\`
  - \`>\` with \`&gt;\`
  - All other bytes preserved verbatim in original order.
- **Examples**:
  - \`escape_xml_text(<<"<b>Tom & Jerry > 1</b>">>)\` -> \`<<"&lt;b&gt;Tom &amp; Jerry &gt; 1&lt;/b&gt;">>\`

---

## Rules & Verification Constraints
- Compile cleanly with \`erlc -Wall\` (zero warnings).
- Use Erlang bit syntax (\`<<...>>\`) for binary matching/construction inside \`incident_xmpp_auth_bypass.erl\` — do not bypass binary processing with string-list \`lists:flatten\` conversions.
- Keep \`test_pre_auth_rejection/0\` and \`test_xml_escaping/0\` exported and unmodified so both Run probes verify your fix.
`,
    files: [
      {
        path: 'src/incident_xmpp_auth_bypass.erl',
        name: 'incident_xmpp_auth_bypass.erl',
        content: `-module(incident_xmpp_auth_bypass).
-export([process_c2s_stanza/3, escape_xml_text/1, test_pre_auth_rejection/0, test_xml_escaping/0]).

%% @doc Dispatches an incoming XMPP C2S stanza according to connection phase.
%% Production incident baseline (BUGGY): routes chat messages in any phase
%% without verifying session_established or escaping Body XML entities.
process_c2s_stanza(_Phase, {chat_message, To, Body}, State) ->
    From = case maps:get(jid, State, undefined) of
        Bin when is_binary(Bin) -> Bin;
        _ -> <<"unauthenticated@localhost">>
    end,
    Xml = <<"<message from='", From/binary, "' to='", To/binary, "' type='chat'><body>", Body/binary, "</body></message>">>,
    {route, To, Xml, State};
process_c2s_stanza(_OtherPhase, _Stanza, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State}.

%% @doc Escapes XML entity characters (&, <, >) in a UTF-8 binary payload.
%% Production incident baseline (BUGGY): returns raw bytes unescaped.
escape_xml_text(Bin) when is_binary(Bin) ->
    Bin.

%% @doc Visible verification probe asserting pre-auth stanzas are rejected.
test_pre_auth_rejection() ->
    State = #{jid => undefined},
    Msg = {chat_message, <<"victim@localhost">>, <<"Spoofed">>},
    Rej1 = process_c2s_stanza(wait_for_stream, Msg, State),
    Rej2 = process_c2s_stanza(wait_for_sasl, Msg, State),
    Expected = {reject, <<"<stream:error><not-authorized/></stream:error>">>, State},
    case Rej1 =:= Expected andalso Rej2 =:= Expected of
        true -> {ok, pre_auth_rejected};
        false -> {error, failed_rejection}
    end.

%% @doc Visible verification probe asserting XML entity sanitization on chat text.
test_xml_escaping() ->
    Input = <<"<b>Tom & Jerry > 1</b>">>,
    Escaped = escape_xml_text(Input),
    {ok, Escaped}.
`,
      },
    ],
    solutionFiles: {
      'src/incident_xmpp_auth_bypass.erl': `-module(incident_xmpp_auth_bypass).
-export([process_c2s_stanza/3, escape_xml_text/1, test_pre_auth_rejection/0, test_xml_escaping/0]).

%% @doc Dispatches an incoming XMPP C2S stanza fail-closed by connection phase,
%% rejecting pre-auth stanzas and XML-escaping established chat bodies.
process_c2s_stanza(wait_for_stream, {chat_message, _To, _Body}, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(wait_for_sasl, {chat_message, _To, _Body}, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(session_established, {chat_message, To, Body}, State) ->
    EscapedBody = escape_xml_text(Body),
    From = maps:get(jid, State, <<"system@localhost">>),
    Xml = <<"<message from='", From/binary, "' to='", To/binary, "' type='chat'><body>", EscapedBody/binary, "</body></message>">>,
    {route, To, Xml, State};
process_c2s_stanza(_OtherState, _Stanza, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State}.

%% @doc Escapes XML entity characters (&, <, >) in a single O(N) binary pass.
escape_xml_text(Bin) when is_binary(Bin) ->
    escape_loop(Bin, <<>>).

escape_loop(<<>>, Acc) -> Acc;
escape_loop(<<"&", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&amp;">>);
escape_loop(<<"<", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&lt;">>);
escape_loop(<<">", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&gt;">>);
escape_loop(<<C, Rest/binary>>, Acc)   -> escape_loop(Rest, <<Acc/binary, C>>).

%% @doc Visible verification probe asserting pre-auth stanzas are rejected.
test_pre_auth_rejection() ->
    State = #{jid => undefined},
    Msg = {chat_message, <<"victim@localhost">>, <<"Spoofed">>},
    Rej1 = process_c2s_stanza(wait_for_stream, Msg, State),
    Rej2 = process_c2s_stanza(wait_for_sasl, Msg, State),
    Expected = {reject, <<"<stream:error><not-authorized/></stream:error>">>, State},
    case Rej1 =:= Expected andalso Rej2 =:= Expected of
        true -> {ok, pre_auth_rejected};
        false -> {error, failed_rejection}
    end.

%% @doc Visible verification probe asserting XML entity sanitization on chat text.
test_xml_escaping() ->
    Input = <<"<b>Tom & Jerry > 1</b>">>,
    Escaped = escape_xml_text(Input),
    {ok, Escaped}.
`,
    },
    starterCode: `-module(incident_xmpp_auth_bypass).
-export([process_c2s_stanza/3, escape_xml_text/1, test_pre_auth_rejection/0, test_xml_escaping/0]).

%% @doc Dispatches an incoming XMPP C2S stanza according to connection phase.
%% Production incident baseline (BUGGY): routes chat messages in any phase
%% without verifying session_established or escaping Body XML entities.
process_c2s_stanza(_Phase, {chat_message, To, Body}, State) ->
    From = case maps:get(jid, State, undefined) of
        Bin when is_binary(Bin) -> Bin;
        _ -> <<"unauthenticated@localhost">>
    end,
    Xml = <<"<message from='", From/binary, "' to='", To/binary, "' type='chat'><body>", Body/binary, "</body></message>">>,
    {route, To, Xml, State};
process_c2s_stanza(_OtherPhase, _Stanza, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State}.

%% @doc Escapes XML entity characters (&, <, >) in a UTF-8 binary payload.
%% Production incident baseline (BUGGY): returns raw bytes unescaped.
escape_xml_text(Bin) when is_binary(Bin) ->
    Bin.

%% @doc Visible verification probe asserting pre-auth stanzas are rejected.
test_pre_auth_rejection() ->
    State = #{jid => undefined},
    Msg = {chat_message, <<"victim@localhost">>, <<"Spoofed">>},
    Rej1 = process_c2s_stanza(wait_for_stream, Msg, State),
    Rej2 = process_c2s_stanza(wait_for_sasl, Msg, State),
    Expected = {reject, <<"<stream:error><not-authorized/></stream:error>">>, State},
    case Rej1 =:= Expected andalso Rej2 =:= Expected of
        true -> {ok, pre_auth_rejected};
        false -> {error, failed_rejection}
    end.

%% @doc Visible verification probe asserting XML entity sanitization on chat text.
test_xml_escaping() ->
    Input = <<"<b>Tom & Jerry > 1</b>">>,
    Escaped = escape_xml_text(Input),
    {ok, Escaped}.
`,
    solutionCode: `-module(incident_xmpp_auth_bypass).
-export([process_c2s_stanza/3, escape_xml_text/1, test_pre_auth_rejection/0, test_xml_escaping/0]).

%% @doc Dispatches an incoming XMPP C2S stanza fail-closed by connection phase,
%% rejecting pre-auth stanzas and XML-escaping established chat bodies.
process_c2s_stanza(wait_for_stream, {chat_message, _To, _Body}, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(wait_for_sasl, {chat_message, _To, _Body}, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(session_established, {chat_message, To, Body}, State) ->
    EscapedBody = escape_xml_text(Body),
    From = maps:get(jid, State, <<"system@localhost">>),
    Xml = <<"<message from='", From/binary, "' to='", To/binary, "' type='chat'><body>", EscapedBody/binary, "</body></message>">>,
    {route, To, Xml, State};
process_c2s_stanza(_OtherState, _Stanza, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State}.

%% @doc Escapes XML entity characters (&, <, >) in a single O(N) binary pass.
escape_xml_text(Bin) when is_binary(Bin) ->
    escape_loop(Bin, <<>>).

escape_loop(<<>>, Acc) -> Acc;
escape_loop(<<"&", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&amp;">>);
escape_loop(<<"<", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&lt;">>);
escape_loop(<<">", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&gt;">>);
escape_loop(<<C, Rest/binary>>, Acc)   -> escape_loop(Rest, <<Acc/binary, C>>).

%% @doc Visible verification probe asserting pre-auth stanzas are rejected.
test_pre_auth_rejection() ->
    State = #{jid => undefined},
    Msg = {chat_message, <<"victim@localhost">>, <<"Spoofed">>},
    Rej1 = process_c2s_stanza(wait_for_stream, Msg, State),
    Rej2 = process_c2s_stanza(wait_for_sasl, Msg, State),
    Expected = {reject, <<"<stream:error><not-authorized/></stream:error>">>, State},
    case Rej1 =:= Expected andalso Rej2 =:= Expected of
        true -> {ok, pre_auth_rejected};
        false -> {error, failed_rejection}
    end.

%% @doc Visible verification probe asserting XML entity sanitization on chat text.
test_xml_escaping() ->
    Input = <<"<b>Tom & Jerry > 1</b>">>,
    Escaped = escape_xml_text(Input),
    {ok, Escaped}.
`,
    otpDocCards: [
      {
        functionName: 'get',
        module: 'maps',
        signature: 'maps:get(Key, Map, Default) -> Value',
        typesSpec: ['Key = term()', 'Map = #{Key => Value}', 'Default = Value'],
        description: 'Looks up Key in Map and returns its associated value, or Default if Key is not present — safe against badkey crashes when building sender attributes.',
        complexityNote: 'O(1) for small maps (=<32 keys); O(log32 N) HAMT lookup for larger maps.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#get/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/maps.erl',
      },
      {
        functionName: 'bit_syntax',
        module: 'erlang',
        signature: '<<Byte, Rest/binary>> / <<Acc/binary, "&amp;">>',
        typesSpec: ['Rest = binary()', 'Acc = binary()'],
        description: 'Single-pass binary pattern matching and BEAM appendable-binary construction used to escape XML delimiters without double-escaping or list allocation.',
        complexityNote: 'O(N) amortized linear time via BEAM binary append optimization in tail recursion.',
        officialUrl: 'https://www.erlang.org/doc/system/bit_syntax.html',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/erl_bits.c',
      },
    ],
    astRules: {
      requiredCalls: [],
      requiredConstructs: ['bit_syntax'],
    },
    visibleTestCases: [
      {
        id: 'tc-ch11-l07-1',
        title: 'Pre-Auth Stanza Rejection',
        erlangCall: 'incident_xmpp_auth_bypass:test_pre_auth_rejection()',
        expectedOutput: '{ok, pre_auth_rejected}',
        explanation: 'Verifies chat stanzas are rejected with not-authorized stream error in pre-auth states.',
      },
      {
        id: 'tc-ch11-l07-2',
        title: 'XML Entity Escaping',
        erlangCall: 'incident_xmpp_auth_bypass:test_xml_escaping()',
        expectedOutput: '{ok, <<"&lt;b&gt;Tom &amp; Jerry &gt; 1&lt;/b&gt;">>}',
        explanation: 'Verifies recursive loop properly escapes &, <, and > into XML entities.',
      },
    ],
    solutionExplanation: 'Enforces pre-auth security gates and recursive XML entity escaping to neutralize injection attacks.',
    references: [
      {
        title: 'OWASP XML External Entity (XXE) Prevention Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html',
        category: 'github_ecosystem',
        description: 'Industry best practices for parsing XML safely and neutralizing malicious payload injections.',
      },
      {
        title: 'RFC 6120: Section 4.9.3.10 (Stream Error: not-authorized)',
        url: 'https://datatracker.ietf.org/doc/html/rfc6120#section-4.9.3.10',
        category: 'book_rfc',
        description: 'Specification for stream-level not-authorized termination conditions.',
      },
    ],
  },

  {
    id: 'ch11-l08',
    chapterNumber: 11,
    lessonNumber: 8,
    lessonType: 'problem_set',
    title: 'Chapter 11 Mini-Capstone: Multi-Device Presence Priority & Routing Engine',
    difficulty: 'Advanced',
    xpReward: 250,
        visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'When routing a message to a Bare JID (user@domain), how does RFC 6121 select the destination among multiple online client sessions?',
      options: [
        {
          id: 'A',
          label: 'It selects the session(s) with the highest non-negative priority (>= 0), or queues offline if all priorities are negative or no sessions exist.',
          isCorrect: true,
          explanation: 'RFC 6121 Section 8.5.2 specifies priority-based dispatch; negative priorities do not receive bare JID messages.'
        },
        {
          id: 'B',
          label: 'It broadcasts the message to every online session regardless of priority.',
          isCorrect: false,
          explanation: 'Messages are delivered to the highest priority session; ties result in multi-delivery.'
        },
        {
          id: 'C',
          label: 'It always stores the message offline first, then notifies clients via push.',
          isCorrect: false,
          explanation: 'Online sessions receive instantaneous BEAM message delivery.'
        },
        {
          id: 'D',
          label: 'It randomly picks an active socket PID.',
          isCorrect: false,
          explanation: 'Routing is deterministic based on integer priority rankings.'
        }
      ]
    },
    conceptMarkdown: `## Why This Matters in Production

In real-world chat networks (WhatsApp, ejabberd, MongooseIM), an active user is routinely connected from several devices at the same time: phone, smartwatch, desktop client, and web tab. When a peer sends a message to a Bare JID (\`alice@chat.beamforge.io\`), the server must deterministically pick which live socket process(es) receive the stanza rather than broadcasting blindly to every tab or dropping it.

**RFC 6121 Section 8 (Priority-Based Message Routing & Presence Broadcast)** solves both multi-device delivery and presence fan-out without external coordination overhead:

> [!IMPORTANT]
> **RFC 6121 Priority & Fan-Out Invariants:**
> 1. **Negative Priority Exclusion:** Sessions with priority below zero (such as \`-5\` Do-Not-Disturb / passive background clients) are excluded from bare-JID message delivery.
> 2. **Highest Non-Negative Priority & Ties:** Bare-JID messages route to the session(s) sharing the highest priority \`>= 0\`, fanning out to all tied PIDs.
> 3. **Exact Resource Lookup with Fallback:** Messages addressed to a Full JID (\`user@host/res\`) deliver straight to that exact resource if connected; otherwise routing falls back to bare-JID priority resolution.
> 4. **Offline Fallback:** If no non-negative priority sessions remain online, the router returns an offline-storage directive instead of dropping the stanza.

---

## Deep Concept Breakdown & Under the Hood

### 1. Memory Unpinning When Indexing Sub-Binaries
Because XMPP Full JIDs arrive over TCP inside larger packet buffers, slicing \`<<"alice@host/phone">>\` with \`binary:split/2\` creates **SubBinary** descriptors referencing the original off-heap \`ProcBin\`. Copying the split bare JID and resource binaries via \`binary:copy/1\` detaches long-lived session entries from transient packet buffers so socket receive heaps can be garbage-collected immediately.

### 2. Constant-Stack Session Pruning (TCO)
When a C2S connection supervisor emits a \`DOWN\` signal, the router must evict every session owned by that dead PID. A body-recursive filter would push one stack frame per active session, risking stack growth under burst disconnects. Using an accumulator-based helper loop in **tail position** allows the BEAM VM to reuse a single stack frame ($O(1)$ stack space) via \`call_last\` regardless of active table size.

### 3. Deduplicating Roster & Self-Resource Fan-Out
When presence changes, updates go both to subscribed contacts in the user's roster map **and** to the sender's own alternate connected resources (excluding the originating connection). Deduplicating target PIDs with \`lists:usort/1\` prevents a user who appears in a self-subscribed or duplicated roster list from receiving duplicate XML presence frames.

---

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / binary & lists)
binary:split(Subject, Pattern) -> Parts
  Types: Subject = binary(), Pattern = binary(), Parts = [binary()]

binary:copy(Subject) -> binary()
  Types: Subject = binary()

lists:max(List) -> Max
  Types: List = [T, ...], Max = T

lists:usort(List1) -> List2
  Types: List1 = [T], List2 = [T]
\`\`\`

Read the OTP signatures alongside the attached reference cards *(below)*: \`binary:split/2\` returns sub-binary slices (unpinned with \`binary:copy/1\`), \`lists:max/1\` expects a non-empty list, and \`lists:usort/1\` sorts and deduplicates candidate target PIDs in $O(N \\log N)$ time.

---

## Parallel Worked Example (Disjoint Domain: Batch Worker Pool Dispatcher)

This standalone module demonstrates the four core BEAM mechanics—**sub-binary unpinning** (\`binary:split/2\` + \`binary:copy/1\`), **tail-recursive PID pruning**, **non-negative max-weight routing with tie fan-out**, and **deduplicated watcher notification** (\`lists:usort/1\`)—on a compute worker pool:

\`\`\`erlang
-module(worker_pool_dispatcher).
-export([register_worker/4, evict_pid/2, dispatch_group/2, notify_group/3, demo/0]).

%% Unpins split group/slot binaries and replaces any matching tag entry.
register_worker(Workers, NodeTag, Weight, Pid) ->
    Group = case binary:split(NodeTag, <<":">>) of
        [G, _Slot] -> binary:copy(G);
        [G]         -> binary:copy(G)
    end,
    Bounded = max(-50, min(50, Weight)),
    Clean = [W || {worker, T, _, _, _} = W <- Workers, T =/= NodeTag],
    [{worker, NodeTag, Group, Bounded, Pid} | Clean].

%% Accumulator tail recursion prunes a crashed worker PID in O(1) stack space.
evict_pid(Workers, DeadPid) ->
    evict_loop(Workers, DeadPid, []).

evict_loop([], _DeadPid, Acc) ->
    lists:reverse(Acc);
evict_loop([{worker, _, _, _, Pid} | Rest], DeadPid, Acc) when Pid =:= DeadPid ->
    evict_loop(Rest, DeadPid, Acc);
evict_loop([W | Rest], DeadPid, Acc) ->
    evict_loop(Rest, DeadPid, [W | Acc]).

%% Selects all non-negative workers tied for highest weight, or returns {queued, Group}.
dispatch_group(Workers, Group) ->
    Eligible = [{W, Pid} || {worker, _, G, W, Pid} <- Workers, G =:= Group, W >= 0],
    case Eligible of
        [] -> {queued, Group};
        _ ->
            BestW = lists:max([W || {W, _} <- Eligible]),
            {dispatch, [Pid || {W, Pid} <- Eligible, W =:= BestW]}
    end.

%% Deduplicates recipient PIDs with lists:usort/1 and excludes the origin PID.
notify_group(Workers, OriginPid, AlertBin) ->
    PeerPids = lists:usort([Pid || {worker, _, _, _, Pid} <- Workers, Pid =/= OriginPid]),
    lists:foreach(fun(Pid) -> Pid ! {pool_alert, OriginPid, AlertBin} end, PeerPids),
    length(PeerPids).

demo() ->
    P1 = self(),
    P2 = spawn(fun() -> receive _ -> ok end end),
    P3 = spawn(fun() -> receive _ -> ok end end),
    W1 = register_worker([], <<"eu-west:a">>, -10, P1),
    W2 = register_worker(W1, <<"eu-west:b">>, 20, P2),
    W3 = register_worker(W2, <<"eu-west:c">>, 20, P3),
    Picked = dispatch_group(W3, <<"eu-west">>),
    Sent = notify_group(W3, P1, <<"scale_up">>),
    W4 = evict_pid(W3, P2),
    {Picked, Sent, dispatch_group(W4, <<"eu-west">>)}.
\`\`\`

---

## Assignment Specification

Implement \`src/xmpp_presence_router.erl\` exporting \`upsert_session/5\`, \`remove_session_by_pid/2\`, \`resolve_message_targets/2\`, and \`broadcast_presence/4\`. Every session entry uses the 6-tuple \`{session, FullJidBin, BareJidBin, ResourceBin, PriorityInt, WorkerPid}\`, and \`RosterMap\` maps \`BareJidBin => [ContactBareJidBin, ...]\`.

### 1. \`upsert_session(SessionsList, FullJid, Priority, Pid, RosterMap)\`
- **Input**: List of existing session tuples, Full JID binary, integer priority, worker PID, and roster map.
- **Behavior**: Split \`FullJid\` on \`"/"\` into unpinned \`BareJid\` and \`Resource\` binaries (\`binary:split/2\` + \`binary:copy/1\`), clamp \`Priority\` to the signed RFC 6121 byte range \`-128..127\` (defaulting non-integers to \`0\`), remove any existing session matching \`FullJid\`, and prepend the new 6-tuple session entry.
- **Examples**:
  - \`upsert_session([], <<"alice@host/phone">>, 200, Pid, #{})\` -> \`[{session, <<"alice@host/phone">>, <<"alice@host">>, <<"phone">>, 127, Pid}]\`
  - Updating an existing \`<<"alice@host/phone">>\` replaces the prior tuple for that Full JID without duplicating it.

### 2. \`remove_session_by_pid(SessionsList, DeadPid)\`
- **Input**: List of session tuples and the PID of a terminated connection worker.
- **Behavior**: Remove every session tuple whose worker PID equals \`DeadPid\` using a strictly **tail-recursive** accumulator loop preserving relative order of surviving sessions.
- **Examples**:
  - \`remove_session_by_pid([S_P1, S_P2], P1)\` -> \`[S_P2]\`

### 3. \`resolve_message_targets(SessionsList, TargetJid)\`
- **Input**: Active session list and destination Full JID (\`user@host/res\`) or Bare JID (\`user@host\`).
- **Behavior**:
  - If \`TargetJid\` is a Full JID and an online session matches that exact Full JID, return \`{route_online, [ExactPid]}\`.
  - If \`TargetJid\` is a Bare JID—or is a Full JID whose resource is offline—extract the Bare JID, keep only sessions with \`Priority >= 0\`, find the maximum priority with \`lists:max/1\`, and return \`{route_online, HighestPids}\` containing all tied highest-priority PIDs.
  - If no session for that Bare JID has \`Priority >= 0\`, return \`{store_offline, BareJid}\`.
- **Examples**:
  - Watch (\`-5\`), Phone (\`5\`), Desktop (\`10\`): \`resolve_message_targets(S, <<"alice@host">>)\` -> \`{route_online, [DesktopPid]}\`, while \`resolve_message_targets(S, <<"alice@host/phone">>)\` -> \`{route_online, [PhonePid]}\`.
  - When all remaining sessions for \`<<"alice@host">>\` have negative priority (\`-10\`), returns \`{store_offline, <<"alice@host">>}\`.

### 4. \`broadcast_presence(SessionsList, RosterMap, SenderFullJid, PresenceStanzaBin)\`
- **Input**: Session list, \`RosterMap\`, originating \`SenderFullJid\`, and XML presence stanza binary.
- **Behavior**: Extract \`SenderBare\`, look up subscribed contacts in \`RosterMap\`, collect all PIDs belonging to those contacts plus \`SenderBare\`'s other connected resources (excluding \`SenderFullJid\` itself), deduplicate recipients via \`lists:usort/1\`, send \`{xmpp_presence, SenderFullJid, PresenceStanzaBin}\` to each PID, and return the integer count of distinct notified PIDs.
- **Examples**:
  - Alice sends \`<<"<presence/>">>\` from \`<<"alice@host/phone">>\` with Alice's laptop, Bob's office, and Carol's home online -> delivers to all 3 other PIDs and returns \`3\`.

---

## Rules & Verification Constraints
- Compile cleanly with \`erlc -Wall\` (zero warnings).
- \`remove_session_by_pid/2\` must be strictly **tail-recursive** (verified at BEAM bytecode level).
- Must invoke \`binary:split/2\`, \`binary:copy/1\`, and \`lists:usort/1\` (verified via AST analysis).
- Must enforce priority clamping (\`-128..127\`), negative priority exclusion (\`Priority < 0\`), tied highest-priority fan-out, and offline fallback.`,
    otpDocCards: [
      {
        functionName: 'split',
        module: 'binary',
        signature: 'binary:split(Subject, Pattern) -> Parts',
        typesSpec: ['Subject = binary()', 'Pattern = binary()', 'Parts = [binary()]'],
        description: 'Splits a JID binary on "/" into bare JID and resource slices without allocating character lists.',
        complexityNote: 'O(N) fast C-BIF substring search producing zero-copy SubBinary slices.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#split/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl',
      },
      {
        functionName: 'copy',
        module: 'binary',
        signature: 'binary:copy(Subject) -> binary()',
        typesSpec: ['Subject = binary()'],
        description: 'Creates an independent binary copy of a SubBinary slice so long-lived session tuples do not pin large TCP ProcBins.',
        complexityNote: 'O(M) copy of the short JID slice; frees parent off-heap buffer.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#copy/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl',
      },
      {
        functionName: 'max',
        module: 'lists',
        signature: 'lists:max(List) -> Max',
        typesSpec: [
          'List = [T, ...]',
          'Max = T',
        ],
        description: 'Finds the maximum priority integer among connected non-negative client sessions.',
        complexityNote: 'Linear O(N) traversal across session candidates.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#max/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl',
      },
      {
        functionName: 'usort',
        module: 'lists',
        signature: 'lists:usort(List1) -> List2',
        typesSpec: [
          'List1 = [T]',
          'List2 = [T]',
        ],
        description: 'Sorts and removes duplicate PIDs from presence broadcast targets before message fan-out.',
        complexityNote: 'O(N log N) merge sort guaranteeing at-most-once delivery per session PID.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#usort/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl',
      },
    ],
        files: [
      {
        path: 'src/xmpp_presence_router.erl',
        name: 'xmpp_presence_router.erl',
        content: `-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).

-type session() :: {session, FullJid :: binary(), BareJid :: binary(), Resource :: binary(), Priority :: integer(), Pid :: pid()}.
-type roster_map() :: #{binary() => [binary()]}.

%% @doc Inserts a new session entry or replaces the existing entry for FullJid,
%% clamping caller-supplied Priority to -128..127 and detaching split JID slices.
-spec upsert_session([session()], binary(), integer(), pid(), roster_map()) -> [session()].
upsert_session(_Sessions, _FullJid, _Priority, _Pid, _RosterMap) ->
    [].

%% @doc Returns the session list with all entries owned by DeadPid pruned using tail recursion.
-spec remove_session_by_pid([session()], pid()) -> [session()].
remove_session_by_pid(_Sessions, _DeadPid) ->
    [].

%% @doc Resolves recipient PIDs for TargetJid by exact Full JID match first, then
%% highest non-negative priority resources, or returns offline storage fallback.
-spec resolve_message_targets([session()], binary()) ->
    {route_online, [pid()]} | {store_offline, binary()}.
resolve_message_targets(_Sessions, TargetJid) ->
    {store_offline, TargetJid}.

%% @doc Delivers PresenceStanza to unique PIDs of roster contacts and own alternate
%% resources excluding SenderFullJid, returning the count of notified processes.
-spec broadcast_presence([session()], roster_map(), binary(), binary()) -> non_neg_integer().
broadcast_presence(_Sessions, _RosterMap, _SenderFullJid, _PresenceStanza) ->
    0.
`,
      },
    ],
    solutionFiles: {
      'src/xmpp_presence_router.erl': `-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).

-type session() :: {session, FullJid :: binary(), BareJid :: binary(), Resource :: binary(), Priority :: integer(), Pid :: pid()}.
-type roster_map() :: #{binary() => [binary()]}.

%% @doc Inserts a new session entry or replaces the existing entry for FullJid,
%% clamping caller-supplied Priority to -128..127 and detaching split JID slices.
-spec upsert_session([session()], binary(), integer(), pid(), roster_map()) -> [session()].
upsert_session(Sessions, FullJid, Priority, Pid, _RosterMap) ->
    {BareJid, Resource} = split_jid(FullJid),
    ClampedPriority = clamp_priority(Priority),
    NewSession = {session, FullJid, BareJid, Resource, ClampedPriority, Pid},
    Filtered = [S || S = {session, F, _, _, _, _} <- Sessions, F =/= FullJid],
    [NewSession | Filtered].

%% @doc Returns the session list with all entries owned by DeadPid pruned using tail recursion.
-spec remove_session_by_pid([session()], pid()) -> [session()].
remove_session_by_pid(Sessions, DeadPid) ->
    remove_pid_loop(Sessions, DeadPid, []).

remove_pid_loop([], _DeadPid, Acc) ->
    lists:reverse(Acc);
remove_pid_loop([{session, _, _, _, _, Pid} | Rest], DeadPid, Acc) when Pid =:= DeadPid ->
    remove_pid_loop(Rest, DeadPid, Acc);
remove_pid_loop([Session | Rest], DeadPid, Acc) ->
    remove_pid_loop(Rest, DeadPid, [Session | Acc]).

%% @doc Resolves recipient PIDs for TargetJid by exact Full JID match first, then
%% highest non-negative priority resources, or returns offline storage fallback.
-spec resolve_message_targets([session()], binary()) ->
    {route_online, [pid()]} | {store_offline, binary()}.
resolve_message_targets(Sessions, TargetJid) ->
    case binary:match(TargetJid, <<"/">>) of
        {_, _} ->
            case [Pid || {session, F, _, _, _, Pid} <- Sessions, F =:= TargetJid] of
                [ExactPid | _] ->
                    {route_online, [ExactPid]};
                [] ->
                    {Bare, _} = split_jid(TargetJid),
                    route_bare(Sessions, Bare)
            end;
        nomatch ->
            route_bare(Sessions, TargetJid)
    end.

route_bare(Sessions, BareJid) ->
    Matching = [{P, Pid} || {session, _, B, _, P, Pid} <- Sessions, B =:= BareJid, P >= 0],
    case Matching of
        [] ->
            {store_offline, BareJid};
        _ ->
            MaxPriority = lists:max([P || {P, _} <- Matching]),
            BestPids = [Pid || {P, Pid} <- Matching, P =:= MaxPriority],
            {route_online, BestPids}
    end.

%% @doc Delivers PresenceStanza to unique PIDs of roster contacts and own alternate
%% resources excluding SenderFullJid, returning the count of notified processes.
-spec broadcast_presence([session()], roster_map(), binary(), binary()) -> non_neg_integer().
broadcast_presence(Sessions, RosterMap, SenderFullJid, PresenceStanza) ->
    {SenderBare, _} = split_jid(SenderFullJid),
    Subscribers = maps:get(SenderBare, RosterMap, []),
    TargetBares = [SenderBare | Subscribers],
    TargetSessions = [
        Pid || {session, Full, Bare, _, _, Pid} <- Sessions,
        Full =/= SenderFullJid,
        lists:member(Bare, TargetBares)
    ],
    UniquePids = lists:usort(TargetSessions),
    lists:foreach(fun(Pid) ->
        Pid ! {xmpp_presence, SenderFullJid, PresenceStanza}
    end, UniquePids),
    length(UniquePids).

split_jid(FullJid) ->
    case binary:split(FullJid, <<"/">>) of
        [Bare, Res] -> {binary:copy(Bare), binary:copy(Res)};
        [Bare]      -> {binary:copy(Bare), <<>>}
    end.

clamp_priority(P) when is_integer(P), P < -128 -> -128;
clamp_priority(P) when is_integer(P), P > 127  -> 127;
clamp_priority(P) when is_integer(P)           -> P;
clamp_priority(_)                              -> 0.
`,
    },
    starterCode: `-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).

-type session() :: {session, FullJid :: binary(), BareJid :: binary(), Resource :: binary(), Priority :: integer(), Pid :: pid()}.
-type roster_map() :: #{binary() => [binary()]}.

%% @doc Inserts a new session entry or replaces the existing entry for FullJid,
%% clamping caller-supplied Priority to -128..127 and detaching split JID slices.
-spec upsert_session([session()], binary(), integer(), pid(), roster_map()) -> [session()].
upsert_session(_Sessions, _FullJid, _Priority, _Pid, _RosterMap) ->
    [].

%% @doc Returns the session list with all entries owned by DeadPid pruned using tail recursion.
-spec remove_session_by_pid([session()], pid()) -> [session()].
remove_session_by_pid(_Sessions, _DeadPid) ->
    [].

%% @doc Resolves recipient PIDs for TargetJid by exact Full JID match first, then
%% highest non-negative priority resources, or returns offline storage fallback.
-spec resolve_message_targets([session()], binary()) ->
    {route_online, [pid()]} | {store_offline, binary()}.
resolve_message_targets(_Sessions, TargetJid) ->
    {store_offline, TargetJid}.

%% @doc Delivers PresenceStanza to unique PIDs of roster contacts and own alternate
%% resources excluding SenderFullJid, returning the count of notified processes.
-spec broadcast_presence([session()], roster_map(), binary(), binary()) -> non_neg_integer().
broadcast_presence(_Sessions, _RosterMap, _SenderFullJid, _PresenceStanza) ->
    0.
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l08-1',
        title: 'Priority-Based Message Routing (Desktop vs Phone vs Watch)',
        erlangCall: 'begin P1 = spawn(fun() -> ok end), P2 = spawn(fun() -> ok end), P3 = spawn(fun() -> ok end), S0 = [], S1 = xmpp_presence_router:upsert_session(S0, <<"alice@host/watch">>, -5, P1, #{}), S2 = xmpp_presence_router:upsert_session(S1, <<"alice@host/phone">>, 5, P2, #{}), S3 = xmpp_presence_router:upsert_session(S2, <<"alice@host/desktop">>, 10, P3, #{}), T1 = xmpp_presence_router:resolve_message_targets(S3, <<"alice@host">>), T2 = xmpp_presence_router:resolve_message_targets(S3, <<"alice@host/phone">>), {T1 =:= {route_online, [P3]}, T2 =:= {route_online, [P2]}} end',
        expectedOutput: '{true, true}',
        explanation: 'Bare JID routes to highest priority (P3 with priority 10); Full JID routes directly to specific resource (P2).',
      },
      {
        id: 'tc-ch11-l08-2',
        title: 'Pruning Dead Sessions on Process Down',
        erlangCall: 'begin P1 = spawn(fun() -> ok end), P2 = spawn(fun() -> ok end), S0 = xmpp_presence_router:upsert_session([], <<"bob@host/web">>, 1, P1, #{}), S1 = xmpp_presence_router:upsert_session(S0, <<"bob@host/cli">>, 2, P2, #{}), S2 = xmpp_presence_router:remove_session_by_pid(S1, P1), T = xmpp_presence_router:resolve_message_targets(S2, <<"bob@host/web">>), T =:= {route_online, [P2]} end',
        expectedOutput: 'true',
        explanation: 'After removing P1, routing to offline web resource falls back to online cli resource.',
      },
      {
        id: 'tc-ch11-l08-3',
        title: 'Broadcast Presence to Subscribed Contacts',
        erlangCall: 'begin PAlice = self(), PBob = spawn(fun() -> receive _ -> ok end end), Roster = #{<<"alice@host">> => [<<"bob@host">>]}, S0 = xmpp_presence_router:upsert_session([], <<"alice@host/phone">>, 5, PAlice, Roster), S1 = xmpp_presence_router:upsert_session(S0, <<"bob@host/laptop">>, 5, PBob, Roster), xmpp_presence_router:broadcast_presence(S1, Roster, <<"alice@host/phone">>, <<"<presence/>">>) end',
        expectedOutput: '1',
        explanation: 'Delivers presence stanza to Bob (subscribed contact) while skipping sender Alice.',
      },
    ],
    astRules: {
      requireTailRecursion: ['remove_session_by_pid/2'],
      requiredCalls: ['binary:split/2', 'binary:copy/1', 'lists:usort/1'],
    },
    solutionCode: `-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).

-type session() :: {session, FullJid :: binary(), BareJid :: binary(), Resource :: binary(), Priority :: integer(), Pid :: pid()}.
-type roster_map() :: #{binary() => [binary()]}.

%% @doc Inserts a new session entry or replaces the existing entry for FullJid,
%% clamping caller-supplied Priority to -128..127 and detaching split JID slices.
-spec upsert_session([session()], binary(), integer(), pid(), roster_map()) -> [session()].
upsert_session(Sessions, FullJid, Priority, Pid, _RosterMap) ->
    {BareJid, Resource} = split_jid(FullJid),
    ClampedPriority = clamp_priority(Priority),
    NewSession = {session, FullJid, BareJid, Resource, ClampedPriority, Pid},
    Filtered = [S || S = {session, F, _, _, _, _} <- Sessions, F =/= FullJid],
    [NewSession | Filtered].

%% @doc Returns the session list with all entries owned by DeadPid pruned using tail recursion.
-spec remove_session_by_pid([session()], pid()) -> [session()].
remove_session_by_pid(Sessions, DeadPid) ->
    remove_pid_loop(Sessions, DeadPid, []).

remove_pid_loop([], _DeadPid, Acc) ->
    lists:reverse(Acc);
remove_pid_loop([{session, _, _, _, _, Pid} | Rest], DeadPid, Acc) when Pid =:= DeadPid ->
    remove_pid_loop(Rest, DeadPid, Acc);
remove_pid_loop([Session | Rest], DeadPid, Acc) ->
    remove_pid_loop(Rest, DeadPid, [Session | Acc]).

%% @doc Resolves recipient PIDs for TargetJid by exact Full JID match first, then
%% highest non-negative priority resources, or returns offline storage fallback.
-spec resolve_message_targets([session()], binary()) ->
    {route_online, [pid()]} | {store_offline, binary()}.
resolve_message_targets(Sessions, TargetJid) ->
    case binary:match(TargetJid, <<"/">>) of
        {_, _} ->
            case [Pid || {session, F, _, _, _, Pid} <- Sessions, F =:= TargetJid] of
                [ExactPid | _] ->
                    {route_online, [ExactPid]};
                [] ->
                    {Bare, _} = split_jid(TargetJid),
                    route_bare(Sessions, Bare)
            end;
        nomatch ->
            route_bare(Sessions, TargetJid)
    end.

route_bare(Sessions, BareJid) ->
    Matching = [{P, Pid} || {session, _, B, _, P, Pid} <- Sessions, B =:= BareJid, P >= 0],
    case Matching of
        [] ->
            {store_offline, BareJid};
        _ ->
            MaxPriority = lists:max([P || {P, _} <- Matching]),
            BestPids = [Pid || {P, Pid} <- Matching, P =:= MaxPriority],
            {route_online, BestPids}
    end.

%% @doc Delivers PresenceStanza to unique PIDs of roster contacts and own alternate
%% resources excluding SenderFullJid, returning the count of notified processes.
-spec broadcast_presence([session()], roster_map(), binary(), binary()) -> non_neg_integer().
broadcast_presence(Sessions, RosterMap, SenderFullJid, PresenceStanza) ->
    {SenderBare, _} = split_jid(SenderFullJid),
    Subscribers = maps:get(SenderBare, RosterMap, []),
    TargetBares = [SenderBare | Subscribers],
    TargetSessions = [
        Pid || {session, Full, Bare, _, _, Pid} <- Sessions,
        Full =/= SenderFullJid,
        lists:member(Bare, TargetBares)
    ],
    UniquePids = lists:usort(TargetSessions),
    lists:foreach(fun(Pid) ->
        Pid ! {xmpp_presence, SenderFullJid, PresenceStanza}
    end, UniquePids),
    length(UniquePids).

split_jid(FullJid) ->
    case binary:split(FullJid, <<"/">>) of
        [Bare, Res] -> {binary:copy(Bare), binary:copy(Res)};
        [Bare]      -> {binary:copy(Bare), <<>>}
    end.

clamp_priority(P) when is_integer(P), P < -128 -> -128;
clamp_priority(P) when is_integer(P), P > 127  -> 127;
clamp_priority(P) when is_integer(P)           -> P;
clamp_priority(_)                              -> 0.
`,
    solutionExplanation: `The presence router implements RFC 6121 priority routing:
1. upsert_session splits and unpins Bare and Resource components via binary:split/2 and binary:copy/1, clamps Priority to -128..127, and replaces any matching Full JID.
2. remove_session_by_pid implements an accumulator-based tail-recursive loop, pruning disconnected PIDs in O(1) stack space.
3. resolve_message_targets checks exact Full JID matches first, then filters Bare JID sessions with Priority >= 0, selects all PIDs tied for lists:max/1 priority, or falls back to {store_offline, BareJid}.
4. broadcast_presence resolves roster subscribers plus the sender's other connected resources, deduplicates PIDs using lists:usort/1, sends {xmpp_presence, SenderFullJid, PresenceStanza}, and returns the distinct recipient count.`,
    references: [
      {
        title: 'IETF RFC 6121: XMPP Instant Messaging and Presence (Section 8 Message Routing)',
        url: 'https://datatracker.ietf.org/doc/html/rfc6121',
        category: 'book_rfc',
        description: 'RFC routing specification for priority-based multi-device delivery and roster broadcasts.',
      },
      {
        title: 'GitHub esl/MongooseIM: src/ejabberd_router.erl',
        url: 'https://github.com/esl/MongooseIM/blob/master/src/ejabberd_router.erl',
        category: 'github_ecosystem',
        description: 'Core stanza routing pipeline handling local, remote, and offline messages.',
      },
    ],
  }
];
