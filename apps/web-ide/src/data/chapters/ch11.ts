import { LessonContent } from '../../types/workspace';

export const CHAPTER_11_LESSONS: LessonContent[] = [
  // ── Lesson 11.1: Guided Demo ───────────────────────────────────────────────
  {
    id: 'ch11-l01',
    chapterNumber: 11,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'Guided Demo: Observing a Live XMPP Wire Protocol Session Transcript',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

The **Extensible Messaging and Presence Protocol (XMPP — RFC 6120 & RFC 6121)** powers the communication backends of global real-time platforms: from **WhatsApp's core messaging engine** (which originated as an optimized Erlang XMPP fork) to massive telecom carriers and gaming backends running **ejabberd** and **MongooseIM**.

Unlike HTTP (where the client opens a connection, requests a resource, receives JSON, and closes), XMPP establishes a **persistent, bidirectional XML stream** over a single long-lived TCP socket:

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
1. **One Process Per Connected Session**: Every connected client socket is owned by a single \`gen_statem\` Erlang process (e.g. \`mongoose_c2s.erl\`).
2. **Sub-Microsecond Stanza Routing**: Routing a message between Alice and Bob does not require an external database or message broker. The server queries an in-memory ETS table to find Bob's process ID (\`BobC2SPid\`) and executes an instantaneous BEAM message send:
   \`\`\`erlang
   BobC2SPid ! {route_stanza, StanzaXmlBin}
   \`\`\`
3. **Hardware Backpressure**: By using \`inet:setopts(Socket, [{active, once}])\`, a slow client or flooded socket never causes memory leaks or process crashes.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% IETF RFC 6120 - Section 4.2: Stream Initiation
%% Opening XML stream header:
<stream:stream from='client@domain' to='server.domain'
               version='1.0' xmlns='jabber:client'
               xmlns:stream='http://etherx.jabber.org/streams'>
\`\`\`

In this guided demonstration, we will boot an in-memory mock XMPP C2S acceptor and run our automated test harness \`bf_xmpp_c2s_harness\` against it. You will see the exact wire transcripts and microsecond latencies for each protocol phase.

## Assignment Specification

This is a **guided terminal demo**—no code changes are required!
1. Review the runnable Erlang module \`xmpp_wire_demo.erl\`.
2. Click **\`Run\`** to boot the live mock C2S listener and execute the full 5-stage handshake.
3. Observe the structured wire timeline in the console output.
4. Click **\`Submit\`** to verify the socket and protocol execution stages.

## Rules & Verification Constraints

- The module must export \`run_demo/0\` returning \`{ok, TranscriptCount}\`.
- Must execute all 5 protocol stages: Stream Open, Stream Features, SASL Auth, Resource Binding, and Message Routing.`,
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
    starterCode: `-module(xmpp_wire_demo).
-export([run_demo/0, print_transcript/2]).

%% @doc Boots an ephemeral mock XMPP C2S server, runs the live protocol harness,
%% formats each transcript step with latencies, and returns {ok, EntryCount}.
-spec run_demo() -> {ok, pos_integer()}.
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

%% @private Pretty-print transcript entries with direction indicators
print_transcript([], _Idx) -> ok;
print_transcript([#{direction := Dir, xml := Xml, stage := Stage, latency_us := Lat} | Rest], Idx) ->
    Arrow = case Dir of
        <<"c2s">> -> "C ===> S (Client to Server)";
        <<"s2c">> -> "S ===> C (Server to Client)"
    end,
    io:format("[Step ~p | ~s | Latency: ~p µs]~n  Stage: ~s~n  XML:   ~s~n~n",
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
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['sample_xmpp_c2s:start_link'],
      requiredConstructs: ['case'],
    },
    solutionCode: `-module(xmpp_wire_demo).
-export([run_demo/0, print_transcript/2]).

-spec run_demo() -> {ok, pos_integer()}.
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

print_transcript([], _Idx) -> ok;
print_transcript([#{direction := Dir, xml := Xml, stage := Stage, latency_us := Lat} | Rest], Idx) ->
    Arrow = case Dir of
        <<"c2s">> -> "C ===> S (Client to Server)";
        <<"s2c">> -> "S ===> C (Server to Client)"
    end,
    io:format("[Step ~p | ~s | Latency: ~p µs]~n  Stage: ~s~n  XML:   ~s~n~n",
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

  // ── Lesson 11.2: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch11-l02',
    chapterNumber: 11,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'XMPP Addressing (RFC 7622): Parsing, Validating & Normalizing JIDs',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In the XMPP architecture, the fundamental unit of addressing is the **Jabber Identifier (JID — RFC 7622)**. 

A single user account has a **Bare JID** (\`alice@chat.beamforge.io\`), representing their account identity across all devices. But when Alice logs in from her phone and her laptop simultaneously, the server establishes **two distinct C2S connections**, each assigned a distinct **Full JID**:
- \`alice@chat.beamforge.io/mobile_ios\`
- \`alice@chat.beamforge.io/macbook_desktop\`

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
<<User:5/binary, "@", Rest/binary>> = PacketBin
\`\`\`
Erlang creates a **sub-binary reference** that points directly into the original 64KB heap allocation! If you store \`User\` inside an ETS table or process state, the **entire 64KB parent binary is pinned in memory** and cannot be garbage collected.

To prevent this critical production memory leak, whenever you extract string fields from network packets, you MUST invoke:
\`\`\`erlang
CleanUser = binary:copy(User)
\`\`\`
\`binary:copy/1\` forces the BEAM VM to allocate a fresh, minimal byte slice on the heap, allowing the large socket buffer to be freed immediately!

### 2. Validation Rules (RFC 7622)
1. A valid JID MUST contain an \`@\` symbol separating the \`user\` (localpart) and \`domain\` (domainpart).
2. Neither \`user\` nor \`domain\` may be empty binary (\`<<>>\`).
3. If a forward slash \`/\` is present, the \`resource\` (resourcepart) MUST NOT be empty. (e.g. \`alice@localhost/\` is invalid).
4. If no \`/\` is present, it is a valid **Bare JID**, and \`resource\` is normalized to \`<<>>\`.

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

## Assignment Specification

Implement the module \`xmpp_jid\` in \`src/xmpp_jid.erl\` with the following exports:

\`\`\`erlang
-module(xmpp_jid).
-export([
    parse/1,
    to_bare/1,
    format_jid/1,
    is_same_bare_jid/2
]).
\`\`\`

### Functions to Implement:
1. **\`parse(JidBin) -> {ok, JidMap} | {error, invalid_jid}\`**:
   - Parses a binary JID into a map:
     \`#{user => User, domain => Domain, resource => Resource, bare => Bare}\`
   - Uses \`binary:copy/1\` on all extracted components.
   - Returns \`{error, invalid_jid}\` for malformed inputs (empty user, empty domain, trailing slash without resource, or missing \`@\`).
2. **\`to_bare(JidInput) -> binary() | {error, invalid_jid}\`**:
   - Accepts either a parsed JID map (\`#{bare := Bare}\`) or a raw binary. Returns the Bare JID binary.
3. **\`format_jid(JidMap) -> binary()\`**:
   - Given \`#{user := U, domain := D, resource := R}\`, formats:
     - \`<<U/binary, "@", D/binary>>\` if \`R == <<>>\`
     - \`<<U/binary, "@", D/binary, "/", R/binary>>\` if \`R =/= <<>>\`
4. **\`is_same_bare_jid(Jid1, Jid2) -> boolean()\`**:
   - Returns \`true\` if both JIDs share the same Bare JID (comparing either binaries or maps); \`false\` otherwise.

## Rules & Verification Constraints

- Must invoke \`binary:copy/1\` to prevent sub-binary reference pinning.
- Must reject all malformed JIDs with \`{error, invalid_jid}\`.`,
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
    starterCode: `-module(xmpp_jid).
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

%% @doc Parses a raw binary JID into validated components.
%% Ensures sub-binaries are unpinned using binary:copy/1.
-spec parse(binary()) -> {ok, jid_map()} | {error, invalid_jid}.
parse(JidBin) when is_binary(JidBin) ->
    %% % TODO: Implement RFC 7622 JID parser
    %% 1. Split on "/" to separate Resource (if present)
    %% 2. Split Bare part on "@" to extract User and Domain
    %% 3. Validate neither User nor Domain is empty
    %% 4. Use binary:copy/1 on all slices
    {error, not_implemented}.

%% @doc Extracts the Bare JID binary from either a map or binary JID.
-spec to_bare(jid_map() | binary()) -> binary() | {error, invalid_jid}.
to_bare(#{bare := Bare}) -> Bare;
to_bare(JidBin) when is_binary(JidBin) ->
    case parse(JidBin) of
        {ok, #{bare := Bare}} -> Bare;
        Error -> Error
    end.

%% @doc Formats a JID map back into standard wire format.
-spec format_jid(jid_map()) -> binary().
format_jid(#{user := User, domain := Domain, resource := Resource}) ->
    %% % TODO: Return User@Domain if Resource is <<>>, else User@Domain/Resource
    <<>>.

%% @doc Returns true if two JIDs represent the same user account.
-spec is_same_bare_jid(jid_map() | binary(), jid_map() | binary()) -> boolean().
is_same_bare_jid(Jid1, Jid2) ->
    %% % TODO: Compare bare JID representations
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
      requiredCalls: ['binary:copy'],
      requiredConstructs: ['case'],
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
        [UserPart, DomainPart] when byte_size(UserPart) > 0 andalso byte_size(DomainPart) > 0 ->
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
    end.

-spec to_bare(jid_map() | binary()) -> binary() | {error, invalid_jid}.
to_bare(#{bare := Bare}) -> Bare;
to_bare(JidBin) when is_binary(JidBin) ->
    case parse(JidBin) of
        {ok, #{bare := Bare}} -> Bare;
        Error -> Error
    end;
to_bare(_) ->
    {error, invalid_jid}.

-spec format_jid(jid_map()) -> binary().
format_jid(#{user := User, domain := Domain, resource := Resource}) ->
    case Resource of
        <<>> -> <<User/binary, "@", Domain/binary>>;
        _    -> <<User/binary, "@", Domain/binary, "/", Resource/binary>>
    end.

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

  // ── Lesson 11.3: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch11-l03',
    chapterNumber: 11,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'XMPP Stanza Anatomy (RFC 6120): Parsing & Constructing Stanzas',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In XMPP, after the stream header has been negotiated, all communication consists of discrete XML packets called **Stanzas**. 

Production Erlang servers like MongooseIM and ejabberd handle millions of stanzas per second. Constructing XML efficiently using **IO Lists** and matching incoming stanzas using high-performance binary pattern matching is the foundation of high-throughput messaging.

> **The 3 Fundamental XMPP Stanza Patterns:**
> 1. \`<iq>\` (Info/Query) — Request/Response correlated by unique \`id\` attribute.
> 2. \`<presence>\` (Availability) — Broadcasts presence status and routing priority.
> 3. \`<message>\` (Direct Chat) — Real-time user-to-user and group chat delivery.

## Deep Concept Breakdown & Under the Hood

### 1. Packet Classification
Before dispatching a packet to its handler, the connection state machine must classify the incoming raw XML packet into one of the core types:
- \`stream_open\`: Opening tag \`<stream:stream ... to='domain' ...>\`
- \`auth_plain\`: SASL auth tag \`<auth ... mechanism='PLAIN'>Base64</auth>\`
- \`iq\`: \`<iq ... type='get|set|result|error' id='ID' ...>\`
- \`presence\`: \`<presence ... type='unavailable|available' ...>\`
- \`message\`: \`<message ... id='ID' to='TO' type='chat' ...>\`

### 2. High-Performance Wire Binary Construction
In Erlang, concatenating binaries using \`<<Chunk1/binary, Chunk2/binary>>\` is extremely fast and zero-copy when building known XML payloads.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% RFC 6120 Section 8: XML Stanzas
%% Common Stanza Attributes:
%% 'from': sender JID
%% 'to': recipient JID
%% 'id': unique identifier for tracking and correlation
%% 'type': stanza semantic type
\`\`\`

## Assignment Specification

Implement the module \`xmpp_stanza\` in \`src/xmpp_stanza.erl\` with the following exports:

\`\`\`erlang
-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).
\`\`\`

### Functions to Implement:
1. **\`classify_xml_packet(XmlBin) -> Classification\`**:
   - Returns:
     - \`{stream_open, ToDomainBin}\` if opening \`<stream:stream\` tag
     - \`{auth_plain, Base64DataBin}\` if \`<auth mechanism='PLAIN'>Data</auth>\`
     - \`{iq, IdBin, TypeBin}\` for \`<iq\` tags (extracts \`id\` and \`type\`)
     - \`{presence, TypeBin}\` for \`<presence\` tags (extracts \`type\`, defaulting to \`<<"available">>\` if absent)
     - \`{message, IdBin, TypeBin, ToBin}\` for \`<message\` tags
     - \`unknown\` for any other packet.
2. **\`build_stream_features(MechanismsList) -> binary()\`**:
   - Takes a list of mechanism binaries (e.g. \`[<<"PLAIN">>]\` or \`[<<"PLAIN">>, <<"SCRAM-SHA-256">>]\`) and produces valid XML:
     \`<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>\`
3. **\`build_bind_result(IdBin, FullJidBin) -> binary()\`**:
   - Returns:
     \`<iq type='result' id='ID'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>FullJid</jid></bind></iq>\`
4. **\`build_chat_message(FromJidBin, ToJidBin, IdBin, BodyTextBin) -> binary()\`**:
   - Returns:
     \`<message from='From' to='To' id='Id' type='chat'><body>Body</body></message>\`

## Rules & Verification Constraints

- Must produce exact XML wire format as specified.
- Attribute quotes in generated XML should be single quotes \`'\`.`,
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
    starterCode: `-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

%% @doc Classifies incoming raw XML packets into structured tuples.
-spec classify_xml_packet(binary()) ->
    {stream_open, binary()} |
    {auth_plain, binary()} |
    {iq, binary(), binary()} |
    {presence, binary()} |
    {message, binary(), binary(), binary()} |
    unknown.
classify_xml_packet(XmlBin) when is_binary(XmlBin) ->
    %% % TODO: Classify XmlBin using binary pattern matching or inspection
    unknown.

%% @doc Constructs a <stream:features> XML payload advertising SASL mechanisms.
-spec build_stream_features([binary()]) -> binary().
build_stream_features(Mechanisms) ->
    %% % TODO: Construct <stream:features><mechanisms ...> XML
    <<>>.

%% @doc Constructs an IQ result responding to resource binding.
-spec build_bind_result(binary(), binary()) -> binary().
build_bind_result(Id, FullJid) ->
    %% % TODO: Construct <iq type='result' id='...'><bind ...><jid>...</jid></bind></iq>
    <<>>.

%% @doc Constructs a chat <message> stanza.
-spec build_chat_message(binary(), binary(), binary(), binary()) -> binary().
build_chat_message(FromJid, ToJid, Id, BodyText) ->
    %% % TODO: Construct <message from='...' to='...' id='...' type='chat'><body>...</body></message>
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
      requiredCalls: [],
      requiredConstructs: ['case'],
    },
    solutionCode: `-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

-spec classify_xml_packet(binary()) ->
    {stream_open, binary()} |
    {auth_plain, binary()} |
    {iq, binary(), binary()} |
    {presence, binary()} |
    {message, binary(), binary(), binary()} |
    unknown.
classify_xml_packet(XmlBin) when is_binary(XmlBin) ->
    Trimmed = string:trim(XmlBin),
    case binary:match(Trimmed, <<"stream:stream">>) of
        {_, _} ->
            ToDomain = extract_attr(Trimmed, <<"to=">>),
            {stream_open, ToDomain};
        nomatch ->
            case binary:match(Trimmed, <<"auth">>) of
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
    end.

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

-spec build_stream_features([binary()]) -> binary().
build_stream_features(Mechanisms) ->
    Inner = [[<<"<mechanism>">>, M, <<"</mechanism>">>] || M <- Mechanisms],
    MechanismsXml = iolist_to_binary(Inner),
    iolist_to_binary([
        <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>">>,
        MechanismsXml,
        <<"</mechanisms></stream:features>">>
    ]).

-spec build_bind_result(binary(), binary()) -> binary().
build_bind_result(Id, FullJid) ->
    iolist_to_binary([
        <<"<iq type='result' id='">>, Id,
        <<"'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>">>,
        FullJid,
        <<"</jid></bind></iq>">>
    ]).

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

  // ── Lesson 11.4: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch11-l04',
    chapterNumber: 11,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Incremental XML Stream Framing Over Fragmented TCP Sockets',
    visualScene: 'tcp_xmpp_stream_framing',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

The single biggest pitfall for engineers building XMPP servers is attempting to use standard XML parsers (like DOM or SAX parsers) directly on the incoming TCP socket stream.

Why does that fail catastrophically?
1. **The Stream is Never Closed**: An XML DOM parser expects \`</stream:stream>\` at the end of the document. If you feed it an open XMPP stream, it blocks forever waiting for EOF!
2. **TCP Packet Fragmentation & Coalescing**: TCP delivers bytes in arbitrary chunks. A client may send an IQ stanza in 3 separate 10-byte packets, or bundle two chat messages into one TCP frame.

> **Incremental XML Stream Framing Pipeline:**
> - **Chunk 1:** \`<<"<stream:stream to='host' ...>  <iq type=">>\` -> Emits \`<stream:stream>\` header, keeps incomplete \`<iq type=\` in buffer.
> - **Chunk 2:** \`<<"'set' id='b1'><bind><resource>obs">>\` -> Accumulates in buffer.
> - **Chunk 3:** \`<<"idian</resource></bind></iq><presence/>">>\` -> Slices and emits \`<iq>\` and self-closing \`<presence/>\`, leaves buffer empty.

## Deep Concept Breakdown & Under the Hood

### 1. Extracting the Opening Tag
The opening stream tag is a special case: it has no closing \`</stream:stream>\`. It is simply the opening tag up to its first closing \`>\`:
\`\`\`xml
<stream:stream to='localhost' xmlns='jabber:client' ...>
\`\`\`
Once this header is extracted and emitted as a frame, all subsequent elements inside the stream are self-contained stanzas:
- **Paired Tags**: \`<iq ...>...</iq>\`, \`<message ...>...</message>\`, \`<auth ...>...</auth>\`
- **Self-Closing Tags**: \`<presence/>\`, \`<ping/>\`, \`<success .../>\`

### 2. State Loop & Memory Safety
The framing function \`extract_frames/2\` takes \`(OldBufferBin, NewChunkBin)\`, concatenates them, iterates over all complete stanzas in the buffer, and returns:
\`\`\`erlang
{FramesList, CleanRemainingBuffer}
\`\`\`
Where \`CleanRemainingBuffer\` is copied via \`binary:copy/1\` so that stale 64KB socket buffers are not kept alive in the worker process heap.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Searching for tag boundaries in binaries:
binary:match(Subject, Pattern) -> {Start, Length} | nomatch
binary:part(Subject, Start, Length) -> binary()
binary:copy(Subject) -> binary()
\`\`\`

## Assignment Specification

Implement the module \`xmpp_xml_framer\` in \`src/xmpp_xml_framer.erl\` with the following export:

\`\`\`erlang
-module(xmpp_xml_framer).
-export([extract_frames/2]).
\`\`\`

### Function Specification:
\`\`\`erlang
extract_frames(BufferBin, NewChunkBin) -> {FramesList, RemainingBufferBin}
\`\`\`
- Concatenates \`BufferBin\` and \`NewChunkBin\`.
- Trims leading whitespace.
- If buffer begins with \`<stream:stream\`:
  - Finds the closing \`>\` of the opening tag.
  - Extracts the header as the first frame.
  - Continues parsing the remainder for child stanzas.
- For child stanzas:
  - If buffer begins with a self-closing tag (e.g. \`<tag ... />\` or \`<tag/>\`): extracts it.
  - If buffer begins with a paired tag (e.g. \`<auth ...>...</auth>\`, \`<iq ...>...</iq>\`, \`<message ...>...</message>\`, \`<presence ...>...</presence>\`): extracts up to the closing tag \`</tag>\`.
  - If the closing tag has not arrived yet: stops and leaves the partial XML in \`RemainingBufferBin\`.
- Returns all extracted frames in arrival order and \`binary:copy(RemainingBufferBin)\`.

## Rules & Verification Constraints

- Must return extracted frames in sequential FIFO order.
- Must invoke \`binary:copy/1\` on the remaining buffer.
- Must handle arbitrary TCP fragmentation and coalesced packets.`,
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
    starterCode: `-module(xmpp_xml_framer).
-export([extract_frames/2]).

%% @doc Extracts complete XML stanzas from a continuous TCP byte buffer.
%% Returns {ExtractedFramesList, RemainingBufferBin}.
-spec extract_frames(binary(), binary()) -> {[binary()], binary()}.
extract_frames(BufferBin, NewChunkBin) ->
    %% % TODO: Implement incremental XML stream framer
    %% 1. Combined = <<BufferBin/binary, NewChunkBin/binary>>
    %% 2. Check for <stream:stream ...>
    %% 3. Check for complete child stanzas (<iq>...</iq>, <presence/>, etc.)
    %% 4. Use binary:copy/1 on remaining unparsed buffer
    {[], <<>>}.
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l04-1',
        title: 'Extract Stream Header and Partial IQ',
        erlangCall: 'xmpp_xml_framer:extract_frames(<<>>, <<"<stream:stream to=\'localhost\'> <iq type=\'get\'">>)',
        expectedOutput: '{[<<"<stream:stream to=\'localhost\'>">>],<<"<iq type=\'get\'">>}',
        explanation: 'Extracts stream opening tag and leaves unclosed <iq in remainder buffer.',
      },
      {
        id: 'tc-ch11-l04-2',
        title: 'Complete Fragmented IQ and Coalesced Presence',
        erlangCall: 'xmpp_xml_framer:extract_frames(<<"<iq type=\'get\'">>, <<" id=\'1\'><ping/></iq><presence/>">>)',
        expectedOutput: '{[<<"<iq type=\'get\' id=\'1\'><ping/></iq>">>,<<"<presence/>">>],<<>>}',
        explanation: 'Completes fragmented IQ and extracts subsequent coalesced presence.',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['binary:copy'],
      requiredConstructs: ['case'],
    },
    solutionCode: `-module(xmpp_xml_framer).
-export([extract_frames/2]).

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

  // ── Lesson 11.5: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch11-l05',
    chapterNumber: 11,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'The C2S Connection Handshake State Machine (RFC 6120)',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

In production servers like **MongooseIM** (\`mongoose_c2s.erl\`) and **ejabberd**, each connected TCP client runs an OTP **\`gen_statem\`** process. 

Before a client can send or receive chat messages, it MUST navigate a strict cryptographic and protocol handshake. If an unauthenticated client sends a chat \`<message>\` or an \`<iq>\` before authenticating, the server MUST reject it immediately to prevent unauthorized spoofing.

> **C2S Client Handshake Finite State Machine:**
> - \`wait_for_stream\` -> Initial state waiting for \`<stream:stream>\` header.
> - \`wait_for_sasl\` -> Negotiates SASL PLAIN credentials; rejects any \`<iq>\` or \`<message>\`.
> - \`authenticated\` -> Stream restarts; waits for \`<iq type='set'><bind>\` resource bind.
> - \`session_established\` -> Bound Full JID registered; real-time chat stanzas routed.

## Deep Concept Breakdown & Under the Hood

### 1. The SASL PLAIN Token
In RFC 6120 and RFC 4616, SASL PLAIN credentials are transmitted as a Base64-encoded binary formatted as:
\`\`\`
Base64( \0 || username || \0 || password )
\`\`\`
For example:
- \`base64:encode(<<"\\0alice\\0secret">>)\` produces \`<<"AGFsaWNlAHNlY3JldA==">>\`.
- When decoding:
  \`\`\`erlang
  Decoded = base64:decode(AuthPayload),
  <<0, Rest/binary>> = Decoded,
  [User, Password] = binary:split(Rest, <<0>>)
  \`\`\`

### 2. State Guarding
The FSM ensures protocol security:
- In \`wait_for_stream\`, any stanza other than \`{stream_open, Domain}\` returns \`{error, unexpected_stanza_before_stream, State}\`.
- In \`wait_for_sasl\`, any stanza other than \`{auth_plain, Base64}\` returns \`{error, not_authorized, State}\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Base64 Decoding
base64:decode(Base64) -> binary()
  Types:
    Base64 = binary() | string()
\`\`\`

## Assignment Specification

Implement the module \`xmpp_c2s_fsm\` in \`src/xmpp_c2s_fsm.erl\` with the following exports:

\`\`\`erlang
-module(xmpp_c2s_fsm).
-export([
    init/1,
    handle_event/2,
    get_state/1
]).
\`\`\`

### States and Transitions:
1. **\`init(Domain)\`**:
   - Returns initial state: \`#{state => wait_for_stream, domain => Domain, user => <<>>, full_jid => <<>>}\`.
2. **\`handle_event(Event, State)\`**:
   - In \`wait_for_stream\`:
     - On \`{stream_open, Domain}\`: Transitions to \`wait_for_sasl\`. Emits reply:
       \`[<<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>]’\`.
     - On any other event: Returns \`{error, unexpected_stanza_before_stream, State}\`.
   - In \`wait_for_sasl\`:
     - On \`{auth_plain, Base64Payload}\`:
       - Decodes Base64 payload (\`<<0, User/binary, 0, Password/binary>>\` or split on \`0\`).
       - If valid user: Transitions to \`authenticated\` with \`user => User\`. Emits reply:
         \`<<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>\`.
     - On any other event: Returns \`{error, not_authorized, State}\`.
   - In \`authenticated\`:
     - On \`{bind_resource, Id, Resource}\`:
       - Forms \`FullJid = <<User/binary, "@", Domain/binary, "/", Resource/binary>>\`.
       - Transitions to \`session_established\` with \`full_jid => FullJid\`. Emits reply:
         \`xmpp_stanza:build_bind_result(Id, FullJid)\` or equivalent XML.
   - In \`session_established\`:
     - On \`{chat_message, To, Id, Body}\`:
       - Returns \`{ok, {routed, To}, State}\`.
3. **\`get_state(State)\`**: Returns current state atom (\`wait_for_stream\`, \`wait_for_sasl\`, \`authenticated\`, or \`session_established\`).

## Rules & Verification Constraints

- Must enforce authentication order strictly.
- Must decode SASL PLAIN Base64 tokens.`,
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
    starterCode: `-module(xmpp_c2s_fsm).
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

%% @doc Initializes the connection FSM in wait_for_stream state.
-spec init(binary()) -> fsm_state().
init(Domain) ->
    #{state => wait_for_stream, domain => Domain, user => <<>>, full_jid => <<>>}.

%% @doc Handles protocol events and enforces strict authentication transitions.
-spec handle_event(term(), fsm_state()) ->
    {reply, binary() | [binary()], fsm_state()} |
    {ok, term(), fsm_state()} |
    {error, atom(), fsm_state()}.
handle_event(Event, State) ->
    %% % TODO: Implement state transitions:
    %% 1. wait_for_stream -> wait_for_sasl
    %% 2. wait_for_sasl -> authenticated
    %% 3. authenticated -> session_established
    {error, not_implemented, State}.

%% @doc Returns the current state name atom.
-spec get_state(fsm_state()) -> atom().
get_state(#{state := StateName}) -> StateName.
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l05-1',
        title: 'Initial Stream Open and Transition to wait_for_sasl',
        erlangCall: 'begin S0 = xmpp_c2s_fsm:init(<<"localhost">>), {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0), xmpp_c2s_fsm:get_state(S1) end',
        expectedOutput: 'wait_for_sasl',
        explanation: 'Transitions from wait_for_stream to wait_for_sasl upon receiving stream_open.',
      },
      {
        id: 'tc-ch11-l05-2',
        title: 'Reject Chat Message Before Authentication',
        erlangCall: 'begin S0 = xmpp_c2s_fsm:init(<<"localhost">>), {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0), {error, Reason, _} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob">>, <<"1">>, <<"hi">>}, S1), Reason end',
        expectedOutput: 'not_authorized',
        explanation: 'Rejects chat messages in wait_for_sasl state with not_authorized.',
      },
      {
        id: 'tc-ch11-l05-3',
        title: 'Complete SASL Auth and Resource Binding',
        erlangCall: 'begin S0 = xmpp_c2s_fsm:init(<<"localhost">>), {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0), Token = base64:encode(<<0, "alice", 0, "secret">>), {reply, _, S2} = xmpp_c2s_fsm:handle_event({auth_plain, Token}, S1), {reply, _, S3} = xmpp_c2s_fsm:handle_event({bind_resource, <<"b1">>, <<"mobile">>}, S2), {xmpp_c2s_fsm:get_state(S3), maps:get(full_jid, S3)} end',
        expectedOutput: '{session_established,<<"alice@localhost/mobile">>}',
        explanation: 'Authenticates with SASL PLAIN, binds resource, and establishes Full JID session.',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['base64:decode'],
      requiredConstructs: ['case'],
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

-spec init(binary()) -> fsm_state().
init(Domain) ->
    #{state => wait_for_stream, domain => Domain, user => <<>>, full_jid => <<>>}.

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
    end.

-spec get_state(fsm_state()) -> atom().
get_state(#{state := StateName}) -> StateName.

decode_sasl_plain(Base64Token) ->
    try
        Decoded = base64:decode(Base64Token),
        case Decoded of
            <<0, Rest/binary>> ->
                case binary:split(Rest, <<0>>) of
                    [User, Pass] -> {ok, binary:copy(User), binary:copy(Pass)};
                    _ -> error
                end;
            _ ->
                case binary:split(Decoded, <<0>>, [global]) of
                    [User, Pass] -> {ok, binary:copy(User), binary:copy(Pass)};
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

  // ── Lesson 11.6: Problem Set ───────────────────────────────────────────────
  {
    id: 'ch11-l06',
    chapterNumber: 11,
    lessonNumber: 6,
    lessonType: 'problem_set',
    title: 'Chapter 11 Mini-Capstone: Multi-Device Presence Priority & Routing Engine',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

In real-world chat networks, every active user is logged into multiple devices simultaneously: phone, smartwatch, desktop app, and web browser. 

When Bob sends a message to \`alice@chat.beamforge.io\` (a Bare JID), how does the server decide which of Alice's devices should ring? 

The answer is **RFC 6121 Section 8 (Priority-Based Message Routing & Presence Broadcast)**. This algorithm is the heartbeat of enterprise XMPP servers like ejabberd and MongooseIM.

> **RFC 6121 Multi-Device Priority Routing Rules:**
> 1. **Negative Priority Exclusion:** Sessions with negative priority (e.g. \`Priority: -5\` DND) are strictly excluded from message delivery.
> 2. **Highest Numerical Priority:** Messages delivered to a Bare JID are routed exclusively to the session with the highest positive priority.
> 3. **Tied Priority Fan-Out:** If multiple sessions share the identical highest priority, stanzas fan out to all tied sessions.
> 4. **Offline Fallback:** If all sessions are offline or negative priority, the stanza is stored in the offline message spool.

## Deep Concept Breakdown & Under the Hood

### 1. Data Representation
To represent active user sessions cleanly in Erlang memory without external database overhead:
- A session is represented as a 6-element tuple:
  \`\`\`erlang
  {session, FullJidBin, BareJidBin, ResourceBin, PriorityInt, WorkerPid}
  \`\`\`
- \`PriorityInt\` is an integer between \`-128\` and \`127\` (standard XMPP priority range).
- The user's roster subscriptions map stores mutual contacts:
  \`\`\`erlang
  RosterMap = #{BareJidBin => [ContactBareJid1, ContactBareJid2, ...]}
  \`\`\`

### 2. The 4 Core Operations
1. **\`upsert_session/5\`**: Adds or updates a session for a given Full JID. If the user reconnects from the same device (same Full JID), the old session entry is replaced with the new PID and priority.
2. **\`remove_session_by_pid/2\`**: When an Erlang C2S worker crashes or closes its TCP socket, the supervisor or monitor notifies the router. It must prune all sessions belonging to that dead PID using tail recursion.
3. **\`resolve_message_targets/2\`**:
   - If \`TargetJid\` is a **Full JID** (\`user@host/res\`) and that exact session is online: deliver to that specific PID.
   - If \`TargetJid\` is a **Bare JID** (or the target Full JID is offline): find all sessions for \`BareJid\` with \`Priority >= 0\`. Select the session(s) tied for the **highest priority** and return \`{route_online, [HighestPids]}\`.
   - If no online sessions with \`Priority >= 0\` exist: return \`{store_offline, BareJid}\`.
4. **\`broadcast_presence/4\`**:
   - When Alice's phone changes presence (e.g. goes online or sets away status), the server looks up Alice's contacts in \`RosterMap\`.
   - Sends \`Pid ! {xmpp_presence, SenderFullJid, PresenceStanzaBin}\` to all online sessions belonging to those contacts, **plus** Alice's own other connected devices!
   - Returns the count of distinct worker PIDs notified.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% IETF RFC 6121 Section 8.3: Inbound Message Routing
%% Priority Rules:
%% - Sessions with negative priority MUST NOT receive bare-JID messages.
%% - Messages sent to bare JIDs MUST be delivered to the resource with
%%   the highest non-negative priority.
\`\`\`

## Assignment Specification

Implement \`src/xmpp_presence_router.erl\` with the following exports:

\`\`\`erlang
-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).
\`\`\`

### Function Details:
1. **\`upsert_session(SessionsList, FullJid, Priority, Pid, RosterMap) -> UpdatedSessionsList\`**:
   - Extracts \`BareJid\` and \`Resource\` from \`FullJid\`.
   - Replaces any existing entry with matching \`FullJid\` or adds \`{session, FullJid, BareJid, Resource, Priority, Pid}\`.
2. **\`remove_session_by_pid(SessionsList, DeadPid) -> UpdatedSessionsList\`**:
   - Must be implemented with **tail recursion**. Removes any session whose PID equals \`DeadPid\`.
3. **\`resolve_message_targets(SessionsList, TargetJid) -> {route_online, [pid()]} | {store_offline, binary()}\`**:
   - Applies RFC 6121 routing rules as specified above.
4. **\`broadcast_presence(SessionsList, RosterMap, SenderFullJid, PresenceStanzaBin) -> integer()\`**:
   - Finds all PIDs belonging to \`SenderBareJid\`'s roster contacts plus \`SenderBareJid\`'s other resources (excluding the sender PID itself).
   - Sends \`Pid ! {xmpp_presence, SenderFullJid, PresenceStanzaBin}\` to each.
   - Returns the integer count of delivered messages.

## Rules & Verification Constraints

- \`remove_session_by_pid/2\` must be strictly tail-recursive.
- Must honor negative priority exclusion (\`Priority < 0\`).
- Must correctly resolve tied highest-priority sessions by returning all tied PIDs.`,
    otpDocCards: [
      {
        functionName: 'max',
        module: 'lists',
        signature: 'lists:max(List) -> Max',
        typesSpec: [
          'List = [T, ...]',
          'Max = T',
        ],
        description: 'Finds the maximum priority integer among connected client sessions.',
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
        description: 'Sorts and removes duplicates from recipient PID list before fan-out.',
        complexityNote: 'O(N log N) merge sort guaranteeing unique message delivery.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#usort/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl',
      },
    ],
    starterCode: `-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).

-type session() :: {session, FullJid :: binary(), BareJid :: binary(), Resource :: binary(), Priority :: integer(), Pid :: pid()}.
-type roster_map() :: #{binary() => [binary()]}.

%% @doc Adds or updates a connected user session.
-spec upsert_session([session()], binary(), integer(), pid(), roster_map()) -> [session()].
upsert_session(Sessions, FullJid, Priority, Pid, _RosterMap) ->
    %% % TODO: Extract BareJid and Resource, replace matching FullJid or insert
    [].

%% @doc Removes all sessions owned by DeadPid using tail recursion.
-spec remove_session_by_pid([session()], pid()) -> [session()].
remove_session_by_pid(Sessions, DeadPid) ->
    %% % TODO: Tail-recursive session pruning
    [].

%% @doc Resolves message targets according to RFC 6121 priority rules.
-spec resolve_message_targets([session()], binary()) ->
    {route_online, [pid()]} | {store_offline, binary()}.
resolve_message_targets(Sessions, TargetJid) ->
    %% % TODO: Check Full JID match; fallback to highest non-negative priority
    {store_offline, TargetJid}.

%% @doc Broadcasts presence updates to roster subscribers and own other resources.
-spec broadcast_presence([session()], roster_map(), binary(), binary()) -> non_neg_integer().
broadcast_presence(Sessions, RosterMap, SenderFullJid, PresenceStanza) ->
    %% % TODO: Fan out {xmpp_presence, SenderFullJid, PresenceStanza} to contacts
    0.
`,
    visibleTestCases: [
      {
        id: 'tc-ch11-l06-1',
        title: 'Priority-Based Message Routing (Desktop vs Phone vs Watch)',
        erlangCall: 'begin P1 = spawn(fun() -> ok end), P2 = spawn(fun() -> ok end), P3 = spawn(fun() -> ok end), S0 = [], S1 = xmpp_presence_router:upsert_session(S0, <<"alice@host/watch">>, -5, P1, #{}), S2 = xmpp_presence_router:upsert_session(S1, <<"alice@host/phone">>, 5, P2, #{}), S3 = xmpp_presence_router:upsert_session(S2, <<"alice@host/desktop">>, 10, P3, #{}), {xmpp_presence_router:resolve_message_targets(S3, <<"alice@host">>), xmpp_presence_router:resolve_message_targets(S3, <<"alice@host/phone">>)} end',
        expectedOutput: '{{route_online,[P3]},{route_online,[P2]}}',
        explanation: 'Bare JID routes to highest priority (P3 with priority 10); Full JID routes directly to specific resource (P2).',
      },
      {
        id: 'tc-ch11-l06-2',
        title: 'Pruning Dead Sessions on Process Down',
        erlangCall: 'begin P1 = spawn(fun() -> ok end), P2 = spawn(fun() -> ok end), S0 = xmpp_presence_router:upsert_session([], <<"bob@host/web">>, 1, P1, #{}), S1 = xmpp_presence_router:upsert_session(S0, <<"bob@host/cli">>, 2, P2, #{}), S2 = xmpp_presence_router:remove_session_by_pid(S1, P1), xmpp_presence_router:resolve_message_targets(S2, <<"bob@host/web">>) end',
        expectedOutput: '{route_online,[P2]}',
        explanation: 'After removing P1, routing to offline web resource falls back to online cli resource.',
      },
      {
        id: 'tc-ch11-l06-3',
        title: 'Broadcast Presence to Subscribed Contacts',
        erlangCall: 'begin PAlice = self(), PBob = spawn(fun() -> receive _ -> ok end end), Roster = #{<<"alice@host">> => [<<"bob@host">>]}, S0 = xmpp_presence_router:upsert_session([], <<"alice@host/phone">>, 5, PAlice, Roster), S1 = xmpp_presence_router:upsert_session(S0, <<"bob@host/laptop">>, 5, PBob, Roster), xmpp_presence_router:broadcast_presence(S1, Roster, <<"alice@host/phone">>, <<"<presence/>">>) end',
        expectedOutput: '1',
        explanation: 'Delivers presence stanza to Bob (subscribed contact) while skipping sender Alice.',
      },
    ],
    astRules: {
      requireTailRecursion: ['remove_session_by_pid/2'],
      forbiddenCalls: [],
      requiredCalls: [],
      requiredConstructs: ['case'],
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

-spec upsert_session([session()], binary(), integer(), pid(), roster_map()) -> [session()].
upsert_session(Sessions, FullJid, Priority, Pid, _RosterMap) ->
    {BareJid, Resource} = split_jid(FullJid),
    ClampedPriority = clamp_priority(Priority),
    NewSession = {session, FullJid, BareJid, Resource, ClampedPriority, Pid},
    Filtered = [S || S = {session, F, _, _, _, _} <- Sessions, F =/= FullJid],
    [NewSession | Filtered].

-spec remove_session_by_pid([session()], pid()) -> [session()].
remove_session_by_pid(Sessions, DeadPid) ->
    remove_pid_loop(Sessions, DeadPid, []).

remove_pid_loop([], _DeadPid, Acc) ->
    lists:reverse(Acc);
remove_pid_loop([{session, _, _, _, _, Pid} | Rest], DeadPid, Acc) when Pid =:= DeadPid ->
    remove_pid_loop(Rest, DeadPid, Acc);
remove_pid_loop([Session | Rest], DeadPid, Acc) ->
    remove_pid_loop(Rest, DeadPid, [Session | Acc]).

-spec resolve_message_targets([session()], binary()) ->
    {route_online, [pid()]} | {store_offline, binary()}.
resolve_message_targets(Sessions, TargetJid) ->
    case binary:match(TargetJid, <<"/">>) of
        {_, _} ->
            %% Target is Full JID: check exact resource first
            case [Pid || {session, F, _, _, _, Pid} <- Sessions, F =:= TargetJid] of
                [ExactPid | _] ->
                    {route_online, [ExactPid]};
                [] ->
                    %% Specific resource is offline; fall back to Bare JID routing rules
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

clamp_priority(P) when is_integer(P) ->
    if
        P < -128 -> -128;
        P > 127  -> 127;
        true     -> P
    end;
clamp_priority(_) ->
    0.
`,
    solutionExplanation: `The presence router implements RFC 6121 priority routing:
1. upsert_session normalizes Bare and Resource components and replaces matching Full JIDs.
2. remove_session_by_pid implements an accumulator-based tail-recursive loop, cleanly pruning disconnected PIDs.
3. resolve_message_targets checks if TargetJid is a Full JID. If the exact resource is online, it delivers to that PID. Otherwise, it filters online sessions for the Bare JID where Priority >= 0, selects the highest priority (handling ties by returning all tied PIDs), or returns {store_offline, BareJid}.
4. broadcast_presence looks up subscribed contacts in RosterMap, adds the sender's other resources, dedupes PIDs using lists:usort/1, delivers the stanza via BEAM message passing, and returns the delivered count.`,
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
  },
];
