import { LessonContent } from '../../types/workspace';

export const CHAPTER_4_LESSONS: LessonContent[] = [
  // ── Lesson 4.1: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch04-l01',
    chapterNumber: 4,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'Maps (#{}): Creation (=>), Exact Matching (:=), and Dynamic Updates',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

Before OTP 17, state in Erlang was represented exclusively via tuples or records. Today, **maps (\`#{}\`)** are the standard associative container across all production OTP systems. They power JSON serialization in REST APIs, user session states in XMPP servers, and dynamic routing tables in distributed clusters.

## Deep Concept Breakdown & Under the Hood

Under the hood, the BEAM VM uses two different internal representations for maps:
1. **Flat Map (<= 32 keys):** Two arrays stored contiguously on the process heap: a tuple of sorted keys and a tuple of values. Key lookups are binary searches in \`O(log N)\` or linear scans in CPU cache.
2. **HAMT Map (> 32 keys):** Hash Array Mapped Trie offering \`O(log32 N)\` near-constant time lookups and updates with structural sharing.

### Map Operator Semantics: \`=>\` vs \`:=\`
- **\`Key => Value\` (Association):** Used when creating a map or inserting/updating a key regardless of whether it previously existed.
- **\`Key := Value\` (Exact Match / Update):**
  - In pattern matching: **must** use \`:=\` to match an existing key. \`=>\` is illegal in pattern matching.
  - In map updates: \`Map#{existing_key := NewVal}\` asserts that \`existing_key\` already exists. If it does not, a \`badkey\` exception is raised.

\`\`\`erlang
%% Construction:
Session = #{user_id => <<"alice">>, status => online}.

%% Pattern matching on existing key:
#{user_id := UId, status := Status} = Session.

%% Exact key update:
UpdatedSession = Session#{status := away}.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / maps)
maps:get(Key, Map) -> Value
maps:put(Key, Value, Map1) -> Map2
maps:find(Key, Map) -> {ok, Value} | error
\`\`\`
> Always prefer map pattern matching \`#{key := Val}\` in function heads over calling \`maps:get/2\`.

## Assignment Specification

Module: \`map_registry\` · Export: \`create_session/2\`, \`update_presence/3\`, \`get_session_field/2\`
1. \`create_session(UserId, Role)\`:
   - Returns a map \`#{user_id => UserId, role => Role, presence => offline, login_count => 0}\`.
2. \`update_presence(Session, ExpectedUserId, NewPresence)\`:
   - Uses map pattern matching \`#{user_id := ExpectedUserId}\` to verify that the session belongs to \`ExpectedUserId\`.
   - Returns the updated session with \`presence\` set to \`NewPresence\` and \`login_count\` incremented by 1 using \`:=\`.
   - If \`user_id\` does not match, return \`{error, session_mismatch}\`.
3. \`get_session_field(Session, FieldName)\`:
   - Returns \`{ok, Value}\` if \`FieldName\` exists in \`Session\`, or \`error\` if it does not.

## Rules & Verification Constraints

- Must use pattern matching with exact key matching \`:=\`.
- Enforced by AST rule: \`requiredConstructs: ["map_exact_match"]\`.`,
    otpDocCards: [
      {
        functionName: 'maps_syntax',
        module: 'erlang',
        signature: '#{Key => Val} / #{Key := Val}',
        typesSpec: ['Key = term()', 'Val = term()'],
        description: 'Creation and pattern matching syntax for associative maps.',
        complexityNote: 'Flat map for <=32 keys, HAMT for >32 keys.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#map-expressions',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch04-01-1',
        title: 'Create User Session Map',
        erlangCall: 'map_registry:create_session(<<"alice">>, admin)',
        expectedOutput: '#{login_count => 0, presence => offline, role => admin, user_id => <<"alice">>}',
        explanation: 'Generates session map with initial offline presence.',
      },
      {
        id: 'tc-ch04-01-2',
        title: 'Update Presence with Exact Match Validation',
        erlangCall: 'begin S = map_registry:create_session(<<"alice">>, admin), map_registry:update_presence(S, <<"alice">>, online) end',
        expectedOutput: '#{login_count => 1, presence => online, role => admin, user_id => <<"alice">>}',
        explanation: 'Matches user_id and increments login_count.',
      },
    ],
    astRules: {
      requiredConstructs: ['map_exact_match'],
    },
    solutionExplanation: 'Demonstrates #{user_id := Expected} pattern matching and Map#{key := Val} exact updates.',
    starterCode: `-module(map_registry).
-export([create_session/2, update_presence/3, get_session_field/2]).

create_session(UserId, Role) ->
    %% % TODO: return #{user_id => UserId, role => Role, presence => offline, login_count => 0}
    #{}.

update_presence(Session, ExpectedUserId, NewPresence) ->
    %% % TODO: pattern match #{user_id := ExpectedUserId} and update presence / login_count
    {error, not_implemented}.

get_session_field(Session, FieldName) ->
    %% % TODO: return maps:find(FieldName, Session)
    error.`,
    solutionCode: `-module(map_registry).
-export([create_session/2, update_presence/3, get_session_field/2]).

create_session(UserId, Role) ->
    #{
        user_id => UserId,
        role => Role,
        presence => offline,
        login_count => 0
    }.

update_presence(#{user_id := ExpectedUserId, login_count := Count} = Session, ExpectedUserId, NewPresence) ->
    Session#{
        presence := NewPresence,
        login_count := Count + 1
    };
update_presence(_OtherSession, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

get_session_field(Session, FieldName) ->
    maps:find(FieldName, Session).`,
    files: [
      {
        path: 'src/map_registry.erl',
        name: 'map_registry.erl',
        content: `-module(map_registry).
-export([create_session/2, update_presence/3, get_session_field/2]).

create_session(UserId, Role) ->
    %% % TODO: return #{user_id => UserId, role => Role, presence => offline, login_count => 0}
    #{}.

update_presence(Session, ExpectedUserId, NewPresence) ->
    %% % TODO: pattern match #{user_id := ExpectedUserId} and update presence / login_count
    {error, not_implemented}.

get_session_field(Session, FieldName) ->
    %% % TODO: return maps:find(FieldName, Session)
    error.`,
      },
    ],
    solutionFiles: {
      'src/map_registry.erl': `-module(map_registry).
-export([create_session/2, update_presence/3, get_session_field/2]).

create_session(UserId, Role) ->
    #{
        user_id => UserId,
        role => Role,
        presence => offline,
        login_count => 0
    }.

update_presence(#{user_id := ExpectedUserId, login_count := Count} = Session, ExpectedUserId, NewPresence) ->
    Session#{
        presence := NewPresence,
        login_count := Count + 1
    };
update_presence(_OtherSession, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

get_session_field(Session, FieldName) ->
    maps:find(FieldName, Session).`,
    },
    references: [
      {
        title: 'Erlang Maps Reference Manual',
        url: 'https://www.erlang.org/doc/reference_manual/expressions.html#map-expressions',
        category: 'erlang_docs',
        description: 'Complete specification of flat maps and HAMT maps on the BEAM VM.',
      },
    ],
  },

  // ── Lesson 4.2: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch04-l02',
    chapterNumber: 4,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Records (-record): Compile-Time Tuple Sugar & Header Files',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

While maps provide dynamic key access, **records** provide named field access with **zero runtime overhead**. In Erlang, records are compile-time syntactic sugar: the compiler translates record expressions into standard tagged tuples (\`{RecordName, Field1, Field2, ...}\`). In high-frequency protocol engines (such as XMPP stanza framing or telecommunication packet routing), records allow writing descriptive field names while maintaining maximum execution speed.

## Deep Concept Breakdown & Under the Hood

### Record Definition
\`\`\`erlang
-record(network_frame, {
    seq = 0       :: non_neg_integer(),
    payload = <<>> :: binary(),
    checksum = 0  :: integer()
}).
\`\`\`

Under the hood:
- \`#network_frame{seq = 1, payload = <<"DATA">>}\` is compiled directly into \`{network_frame, 1, <<"DATA">>, 0}\`.
- Field access \`Frame#network_frame.seq\` compiles to a direct \`element(2, Frame)\` BIF call.
- Field updates \`Frame#network_frame{seq = 2}\` compile to \`setelement(2, Frame, 2)\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Record Syntax
-record(RecordName, {Field1 = Default1, Field2, ...}).
#RecordName{Field1 = Value1}
RecordVar#RecordName.FieldName
RecordVar#RecordName{Field1 = NewValue}
\`\`\`

## Assignment Specification

Module: \`record_frames\` · Export: \`new_frame/3\`, \`update_seq/2\`, \`extract_payload/1\`
Define record \`-record(frame, {seq = 0, type, payload = <<>>}).\` in the module:
1. \`new_frame(Seq, Type, Payload)\`:
   - Returns a \`#frame{seq = Seq, type = Type, payload = Payload}\`.
2. \`update_seq(Frame, NewSeq)\`:
   - Updates the \`seq\` field of \`Frame\` to \`NewSeq\` using record update syntax.
3. \`extract_payload(Frame)\`:
   - Pattern matches on \`#frame{payload = P}\` and returns \`P\`.

## Rules & Verification Constraints

- Must define and use \`-record(frame, {...})\`.
- Enforced by AST rule: \`requiredConstructs: ["record_def"]\`.`,
    otpDocCards: [
      {
        functionName: 'record_syntax',
        module: 'erlang',
        signature: '#record_name{field = Val}',
        typesSpec: ['Compile-time tuple abstraction', 'Zero runtime key dictionary'],
        description: 'Tagged tuple wrapper providing named field access with O(1) tuple speed.',
        complexityNote: 'Exact same speed and memory as tagged tuples.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/records.html',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch04-02-1',
        title: 'Instantiate Frame Record',
        erlangCall: 'record_frames:new_frame(1, ack, <<"PONG">>)',
        expectedOutput: '{frame, 1, ack, <<"PONG">>}',
        explanation: 'Record compiles into tagged 4-tuple {frame, seq, type, payload}.',
      },
      {
        id: 'tc-ch04-02-2',
        title: 'Extract Payload via Record Match',
        erlangCall: 'begin F = record_frames:new_frame(1, data, <<"SECRET">>), record_frames:extract_payload(F) end',
        expectedOutput: '<<"SECRET">>',
        explanation: 'Matches #frame{payload = P} and returns binary payload.',
      },
    ],
    astRules: {
      requiredConstructs: ['record_def'],
    },
    solutionExplanation: 'Defines -record(frame, {...}) and demonstrates record construction, updating, and extraction.',
    starterCode: `-module(record_frames).
-export([new_frame/3, update_seq/2, extract_payload/1]).

%% % TODO: Define -record(frame, {seq = 0, type, payload = <<>>}).

new_frame(Seq, Type, Payload) ->
    %% % TODO: return #frame{...}
    {error, not_implemented}.

update_seq(Frame, NewSeq) ->
    %% % TODO: Frame#frame{seq = NewSeq}
    Frame.

extract_payload(Frame) ->
    %% % TODO: match #frame{payload = P}
    <<>>.`,
    solutionCode: `-module(record_frames).
-export([new_frame/3, update_seq/2, extract_payload/1]).

-record(frame, {
    seq = 0 :: non_neg_integer(),
    type :: atom(),
    payload = <<>> :: binary()
}).

new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

update_seq(#frame{} = Frame, NewSeq) ->
    Frame#frame{seq = NewSeq}.

extract_payload(#frame{payload = Payload}) ->
    Payload.`,
    files: [
      {
        path: 'src/record_frames.erl',
        name: 'record_frames.erl',
        content: `-module(record_frames).
-export([new_frame/3, update_seq/2, extract_payload/1]).

%% % TODO: Define -record(frame, {seq = 0, type, payload = <<>>}).

new_frame(Seq, Type, Payload) ->
    %% % TODO: return #frame{...}
    {error, not_implemented}.

update_seq(Frame, NewSeq) ->
    %% % TODO: Frame#frame{seq = NewSeq}
    Frame.

extract_payload(Frame) ->
    %% % TODO: match #frame{payload = P}
    <<>>.`,
      },
    ],
    solutionFiles: {
      'src/record_frames.erl': `-module(record_frames).
-export([new_frame/3, update_seq/2, extract_payload/1]).

-record(frame, {
    seq = 0 :: non_neg_integer(),
    type :: atom(),
    payload = <<>> :: binary()
}).

new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

update_seq(#frame{} = Frame, NewSeq) ->
    Frame#frame{seq = NewSeq}.

extract_payload(#frame{payload = Payload}) ->
    Payload.`,
    },
    references: [
      {
        title: 'Erlang Records Reference',
        url: 'https://www.erlang.org/doc/reference_manual/records.html',
        category: 'erlang_docs',
        description: 'How records are expanded at compile time.',
      },
    ],
  },

  // ── Lesson 4.3: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch04-l03',
    chapterNumber: 4,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Binaries & Bitstrings (<<...>>): Bit-Level Protocol Packing',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

Erlang's **Bit Syntax (\`<<...>>\`)** is widely regarded as one of the greatest features in programming language design. When building network protocols (TCP/IP, TLS, DNS, WebSocket framing, or XMPP SASL), developers in C, Go, or Rust must write tedious bitwise masking and shifting operations (\`& 0x0F\`, \`>> 4\`). In Erlang, you describe binary wire formats declaratively with exact bit widths and endianness.

## Deep Concept Breakdown & Under the Hood

A binary is a sequence of 8-bit bytes; a bitstring is an arbitrary sequence of bits.
\`\`\`erlang
%% Packing:
Packet = <<Version:4, IHL:4, TypeOfService:8, TotalLength:16/big-unsigned-integer>>.

%% Unpacking:
<<Ver:4, Length:12, Rest/binary>> = Packet.
\`\`\`

### Type Specifiers:
- **Unit / Size:** \`Val:Size\` or \`Val:Size/Unit:UnitSize\`.
- **Endianness:** \`big\` (network order — default), \`little\`.
- **Type:** \`integer\`, \`float\`, \`binary\`, \`bitstring\`, \`utf8\`.

\`\`\`erlang
%% Packing UTF-8 text with 16-bit length prefix:
NameBin = <<"Alice">>,
Len = byte_size(NameBin),
Framed = <<Len:16/big, NameBin/binary>>.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Bit syntax construction and matching
<<Segment1, Segment2, ...>>
Segment = Value[:Size][/TypeSpecifierList]
\`\`\`
> The BEAM VM features dedicated bit-level assembly instructions (\`bs_get_integer2\`, \`bs_put_binary\`) optimized for memory throughput.

## Assignment Specification

Module: \`bit_packer\` · Export: \`pack_header/3\`, \`unpack_header/1\`, \`encode_utf8_tagged/1\`
1. \`pack_header(Version, Flags, Length)\`:
   - \`Version\` (4 bits, integer)
   - \`Flags\` (4 bits, integer)
   - \`Length\` (16 bits, big-endian unsigned integer)
   - Returns a 3-byte binary: \`<<Version:4, Flags:4, Length:16/big>>\`.
2. \`unpack_header(Binary)\`:
   - Matches \`<<Version:4, Flags:4, Length:16/big, Payload/binary>>\`.
   - Returns \`{ok, Version, Flags, Length, Payload}\`.
   - If \`Binary\` is smaller than 3 bytes, return \`{error, insufficient_bytes}\`.
3. \`encode_utf8_tagged(TextBinary)\`:
   - Prefixes \`TextBinary\` with a single byte \`16#01\` and a 16-bit big-endian length:
     \`<<16#01:8, (byte_size(TextBinary)):16/big, TextBinary/binary>>\`.

## Rules & Verification Constraints

- Must use Bit Syntax \`<<...>>\`.
- Enforced by AST rule: \`requiredConstructs: ["bit_syntax"]\`.`,
    otpDocCards: [
      {
        functionName: 'bit_syntax',
        module: 'erlang',
        signature: '<<Val:Size/TypeSpecifiers>>',
        typesSpec: ['Size = integer()', 'TypeSpecifiers = integer | binary | big | little | utf8'],
        description: 'Declarative bit-level data packing and destructuring.',
        complexityNote: 'Executed using hardware vector instructions in ERTS.',
        officialUrl: 'https://www.erlang.org/doc/programming_examples/bit_syntax.html',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch04-03-1',
        title: 'Pack 3-Byte Network Header',
        erlangCall: 'bit_packer:pack_header(4, 2, 1024)',
        expectedOutput: '<<66, 4, 0>>',
        explanation: 'Version 4 (0100) + Flags 2 (0010) = 0x42 (66); 1024 = 0x0400 (4, 0).',
      },
      {
        id: 'tc-ch04-03-2',
        title: 'Unpack Header and Extract Payload',
        erlangCall: 'bit_packer:unpack_header(<<66, 4, 0, "DATA">>)',
        expectedOutput: '{ok, 4, 2, 1024, <<"DATA">>}',
        explanation: 'Deconstructs 24-bit header and retains <<"DATA">> payload.',
      },
    ],
    astRules: {
      requiredConstructs: ['bit_syntax'],
    },
    solutionExplanation: 'Demonstrates <<V:4, F:4, L:16/big>> bit-level packing and matching.',
    starterCode: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

pack_header(Version, Flags, Length) ->
    %% % TODO: <<Version:4, Flags:4, Length:16/big>>
    <<>>.

unpack_header(Binary) ->
    %% % TODO: match <<Version:4, Flags:4, Length:16/big, Payload/binary>>
    {error, not_implemented}.

encode_utf8_tagged(TextBinary) ->
    %% % TODO: <<16#01:8, (byte_size(TextBinary)):16/big, TextBinary/binary>>
    <<>>.`,
    solutionCode: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/big>>.

unpack_header(<<Version:4, Flags:4, Length:16/big, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/big, TextBinary/binary>>.`,
    files: [
      {
        path: 'src/bit_packer.erl',
        name: 'bit_packer.erl',
        content: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

pack_header(Version, Flags, Length) ->
    %% % TODO: <<Version:4, Flags:4, Length:16/big>>
    <<>>.

unpack_header(Binary) ->
    %% % TODO: match <<Version:4, Flags:4, Length:16/big, Payload/binary>>
    {error, not_implemented}.

encode_utf8_tagged(TextBinary) ->
    %% % TODO: <<16#01:8, (byte_size(TextBinary)):16/big, TextBinary/binary>>
    <<>>.`,
      },
    ],
    solutionFiles: {
      'src/bit_packer.erl': `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/big>>.

unpack_header(<<Version:4, Flags:4, Length:16/big, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/big, TextBinary/binary>>.`,
    },
    references: [
      {
        title: 'Erlang Bit Syntax Programming Examples',
        url: 'https://www.erlang.org/doc/programming_examples/bit_syntax.html',
        category: 'erlang_docs',
        description: 'Official tutorial on packet headers and bitfield parsing.',
      },
    ],
  },

  // ── Lesson 4.4: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch04-l04',
    chapterNumber: 4,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Under the Hood: ProcBin Binaries & Avoiding Sub-Binary Leaks',
    visualScene: 'sub_binary_procbin_refc',
    mentalModelCheck: {
      question: 'When pattern matching <<Header:16/binary, _Rest/binary>> from a 64 MB video packet, why does calling binary:copy(Header) resolve the memory leak?',
      codeSnippet: `extract_header(LargePayload) ->\n    <<Header:16/binary, _/binary>> = LargePayload,\n    binary:copy(Header).`,
      options: [
        {
          id: 'A',
          label: 'binary:copy/1 forces the 16 bytes into a fresh Heap Binary (< 64 bytes), allowing the 64 MB ProcBin reference count to drop to 0 and get freed.',
          isCorrect: true,
          explanation: 'Correct! By copying the 16-byte slice, you allocate a private heap binary. The original 64 MB off-heap ProcBin no longer has any references pinning it, allowing immediate GC reclamation.',
        },
        {
          id: 'B',
          label: 'binary:copy/1 compresses the binary using gzip.',
          isCorrect: false,
          explanation: 'binary:copy/1 performs term cloning to unpin off-heap buffers, not data compression.',
        },
        {
          id: 'C',
          label: 'binary:copy/1 writes the 16 bytes into an ETS table.',
          isCorrect: false,
          explanation: 'binary:copy/1 produces a normal Erlang binary on the calling process heap, not an ETS table.',
        },
      ],
    },
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

This is one of the most critical under-the-hood lessons in Erlang backend engineering. Many production Erlang and Elixir servers suffer mysterious memory bloat where a process consuming only a few megabytes of logical data pins gigabytes of RAM. This occurs due to **Sub-Binary Memory Leaks** caused by the BEAM's binary allocation architecture.

## Deep Concept Breakdown & Under the Hood

The BEAM manages two types of binaries based on size threshold (default **64 bytes**):
1. **Heap Binaries (<= 64 bytes):** Stored directly on the process heap. They are garbage-collected along with the process terms.
2. **Refc Binaries / ProcBin (> 64 bytes):** Stored in a global, reference-counted off-heap memory pool. Each process holds a small 24-byte pointer (\`ProcBin\`) referencing the shared memory.

\`\`\`mermaid
graph TD
    Proc1["Process Heap (ProcBin)"] -->|Pointer + Offset| BigBuf["Global 64MB Off-Heap Buffer"]
    Proc2["Process Heap (Sub-Binary: 16 bytes)"] -->|Pinned Pointer| BigBuf
\`\`\`

### The Sub-Binary Leak Pitfall
When you slice a binary:
\`\`\`erlang
<<Token:16/binary, _Rest/binary>> = Large64MBPacket.
\`\`\`
The BEAM **does not copy the 16 bytes**. It creates a lightweight **sub-binary** containing a pointer to \`Large64MBPacket\` with an offset and length.
As long as \`Token\` is kept in memory (e.g. stored in an ETS table or process state), the reference count on the entire **64MB buffer** remains greater than 0! The garbage collector cannot free the 64MB buffer, even though you only need 16 bytes!

### The Production Fix: \`binary:copy/1\`
\`\`\`erlang
SafeToken = binary:copy(Token).
\`\`\`
\`binary:copy/1\` allocates a fresh standalone binary on the process heap, unpinning the massive 64MB off-heap buffer and allowing the BEAM to immediately free it.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / binary)
binary:copy(Subject) -> binary()
\`\`\`
> Whenever you extract small tokens, IDs, or keys from large network packets, always call \`binary:copy/1\` before storing them in long-lived state.

## Assignment Specification

Module: \`binary_unpinner\` · Export: \`extract_token_safe/1\`, \`slice_packet_safe/2\`
1. \`extract_token_safe(LargePacket)\`:
   - Matches the first 16 bytes of \`LargePacket\`: \`<<Token:16/binary, _Rest/binary>>\`.
   - Calls \`binary:copy/1\` on \`Token\` and returns \`{ok, SafeToken}\`.
   - If \`LargePacket\` is less than 16 bytes, return \`{error, insufficient_data}\`.
2. \`slice_packet_safe(Packet, Length)\`:
   - Extracts \`Length\` bytes from the start of \`Packet\`: \`<<Slice:Length/binary, _/binary>>\`.
   - Returns \`binary:copy(Slice)\`.

## Rules & Verification Constraints

- Must call \`binary:copy/1\` to unpin sub-binaries.
- Enforced by AST rule: \`requiredCalls: ["binary:copy/1"]\`.`,
    otpDocCards: [
      {
        functionName: 'copy',
        module: 'binary',
        signature: 'binary:copy(Subject) -> binary()',
        typesSpec: ['Subject = binary()', 'Returns unpinned, independent copy of Subject'],
        description: 'Creates a standalone copy of a binary or sub-binary.',
        complexityNote: 'O(N) copy, frees large pinned refc binary buffers.',
        officialUrl: 'https://www.erlang.org/doc/man/binary.html#copy-1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch04-04-1',
        title: 'Extract Safe 16-Byte Token Unpinned',
        erlangCall: 'binary_unpinner:extract_token_safe(<<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16, "REMAINDER OF PACKET">>)',
        expectedOutput: '{ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>}',
        explanation: 'Copies the 16-byte slice to unpin the off-heap ProcBin buffer.',
      },
    ],
    astRules: {
      requiredCalls: ['binary:copy/1'],
    },
    solutionExplanation: 'Extracts sub-binary slices and invokes binary:copy/1 to eliminate memory leak vectors.',
    starterCode: `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2]).

extract_token_safe(LargePacket) ->
    %% % TODO: match <<Token:16/binary, _/binary>>, unpin with binary:copy/1
    {error, not_implemented}.

slice_packet_safe(Packet, Length) ->
    %% % TODO: match <<Slice:Length/binary, _/binary>>, return binary:copy(Slice)
    <<>>.`,
    solutionCode: `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2]).

extract_token_safe(<<Token:16/binary, _Rest/binary>>) ->
    {ok, binary:copy(Token)};
extract_token_safe(_) ->
    {error, insufficient_data}.

slice_packet_safe(Packet, Length) when is_binary(Packet), is_integer(Length), byte_size(Packet) >= Length ->
    <<Slice:Length/binary, _Rest/binary>> = Packet,
    binary:copy(Slice).`,
    files: [
      {
        path: 'src/binary_unpinner.erl',
        name: 'binary_unpinner.erl',
        content: `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2]).

extract_token_safe(LargePacket) ->
    %% % TODO: match <<Token:16/binary, _/binary>>, unpin with binary:copy/1
    {error, not_implemented}.

slice_packet_safe(Packet, Length) ->
    %% % TODO: match <<Slice:Length/binary, _/binary>>, return binary:copy(Slice)
    <<>>.`,
      },
    ],
    solutionFiles: {
      'src/binary_unpinner.erl': `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2]).

extract_token_safe(<<Token:16/binary, _Rest/binary>>) ->
    {ok, binary:copy(Token)};
extract_token_safe(_) ->
    {error, insufficient_data}.

slice_packet_safe(Packet, Length) when is_binary(Packet), is_integer(Length), byte_size(Packet) >= Length ->
    <<Slice:Length/binary, _Rest/binary>> = Packet,
    binary:copy(Slice).`,
    },
    references: [
      {
        title: 'Erlang Efficiency Guide: Binary Handling & Memory',
        url: 'https://www.erlang.org/doc/efficiency_guide/binaryhandling.html',
        category: 'erlang_docs',
        description: 'Comprehensive analysis of ProcBin, refc binaries, and sub-binary memory traps.',
      },
    ],
  },

  // ── Lesson 4.5: Problem Set ──────────────────────────────────────────────
  {
    id: 'ch04-l05',
    chapterNumber: 4,
    lessonNumber: 5,
    lessonType: 'problem_set',
    title: 'Problem Set: Binary Network Packet & TLV Frame Parser',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

Type-Length-Value (TLV) framing is the standard binary encoding used in telecommunications (Diameter, SMPP), financial transactions (ISO 8583, FIX), and low-level networking. In this capstone problem set for Chapter 4, you will build a production-grade binary frame parser that unpacks serialized TLV streams into structured records while preventing sub-binary memory retention.

## Deep Concept Breakdown & Under the Hood

The wire format for each frame is:
\`\`\`
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Type  |         Length (16 bits, big-endian)          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Payload (Length bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Record Definition
-record(tlv_frame, {version, type, length, payload}).

%% Unpinning sub-binaries
binary:copy(Payload)
\`\`\`

## Assignment Specification

Module: \`packet_parser\`
Exports: \`parse_frame/1\`, \`parse_tlv_stream/1\`

1. Define record:
   \`-record(tlv_frame, {version, type, length, payload}).\`
2. \`parse_frame(Binary)\`:
   - Matches \`<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>\`.
   - Returns \`{ok, #tlv_frame{version = Version, type = Type, length = Length, payload = binary:copy(Payload)}, Rest}\`.
   - If \`byte_size(Binary) < 3\` or the payload length is truncated, return \`{error, incomplete_frame}\`.
3. \`parse_tlv_stream(StreamBinary)\`:
   - Iterates through a binary stream containing multiple consecutive TLV frames using a tail-recursive accumulator loop.
   - Returns \`{ok, [Frame1, Frame2, ...]}\` in original order.
   - If a trailing fragment exists that cannot form a complete frame, returns \`{partial, ParsedFrames, TrailingBytes}\`.

## Rules & Verification Constraints

- Must define and use \`-record(tlv_frame, {...})\`.
- Must call \`binary:copy/1\` on each extracted payload.
- Must be tail-recursive in \`parse_tlv_stream/1\`.
- Enforced by AST rule: \`requiredConstructs: ["record_def", "bit_syntax"]\`, \`requiredCalls: ["binary:copy/1"]\`.`,
    otpDocCards: [
      {
        functionName: 'bit_syntax',
        module: 'erlang',
        signature: '<<Version:4, Type:4, Length:16/big, Payload:Length/binary, Rest/binary>>',
        typesSpec: ['Arbitrary bit segment destructuring', 'Variable-length binary segment matching'],
        description: 'Single-instruction matching of network protocol frame headers and payloads.',
        complexityNote: 'Executed directly in BEAM parser loop with zero buffer copies.',
        officialUrl: 'https://www.erlang.org/doc/programming_examples/bit_syntax.html',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch04-05-1',
        title: 'Parse Single TLV Frame with Rest',
        erlangCall: 'packet_parser:parse_frame(<<1:4, 2:4, 4:16/big, "PING", "REST">>)',
        expectedOutput: '{ok, {tlv_frame, 1, 2, 4, <<"PING">>}, <<"REST">>}',
        explanation: 'Parses Version 1, Type 2, Length 4, unpins <<"PING">>, leaves <<"REST">>.',
      },
      {
        id: 'tc-ch04-05-2',
        title: 'Parse Full Stream of Consecutive TLV Frames',
        erlangCall: 'packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, "PING", 1:4, 3:4, 4:16/big, "PONG">>)',
        expectedOutput: '{ok, [{tlv_frame, 1, 2, 4, <<"PING">>}, {tlv_frame, 1, 3, 4, <<"PONG">>}]}',
        explanation: 'Extracts both frames in order using tail-recursive stream processor.',
      },
    ],
    astRules: {
      requiredConstructs: ['record_def', 'bit_syntax'],
      requiredCalls: ['binary:copy/1'],
      requireTailRecursion: ['parse_tlv_stream/1'],
    },
    solutionExplanation: 'Complete TLV binary parser implementing bit syntax, records, and binary:copy memory safety.',
    starterCode: `-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1]).

%% % TODO: Define -record(tlv_frame, {version, type, length, payload}).

parse_frame(Binary) ->
    %% % TODO: match <<Version:4, Type:4, Length:16/big, Payload:Length/binary, Rest/binary>>
    {error, not_implemented}.

parse_tlv_stream(StreamBinary) ->
    %% % TODO: tail-recursive loop calling parse_frame/1 and accumulating frames
    {ok, []}.`,
    solutionCode: `-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1]).

-record(tlv_frame, {
    version :: non_neg_integer(),
    type :: non_neg_integer(),
    length :: non_neg_integer(),
    payload :: binary()
}).

parse_frame(<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>) ->
    Frame = #tlv_frame{
        version = Version,
        type = Type,
        length = Length,
        payload = binary:copy(Payload)
    },
    {ok, Frame, Rest};
parse_frame(_) ->
    {error, incomplete_frame}.

parse_tlv_stream(StreamBinary) ->
    parse_tlv_loop(StreamBinary, []).

parse_tlv_loop(<<>>, Acc) ->
    {ok, lists:reverse(Acc)};
parse_tlv_loop(Binary, Acc) ->
    case parse_frame(Binary) of
        {ok, Frame, Rest} ->
            parse_tlv_loop(Rest, [Frame | Acc]);
        {error, incomplete_frame} ->
            {partial, lists:reverse(Acc), Binary}
    end.`,
    files: [
      {
        path: 'src/packet_parser.erl',
        name: 'packet_parser.erl',
        content: `-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1]).

%% % TODO: Define -record(tlv_frame, {version, type, length, payload}).

parse_frame(Binary) ->
    %% % TODO: match <<Version:4, Type:4, Length:16/big, Payload:Length/binary, Rest/binary>>
    {error, not_implemented}.

parse_tlv_stream(StreamBinary) ->
    %% % TODO: tail-recursive loop calling parse_frame/1 and accumulating frames
    {ok, []}.`,
      },
    ],
    solutionFiles: {
      'src/packet_parser.erl': `-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1]).

-record(tlv_frame, {
    version :: non_neg_integer(),
    type :: non_neg_integer(),
    length :: non_neg_integer(),
    payload :: binary()
}).

parse_frame(<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>) ->
    Frame = #tlv_frame{
        version = Version,
        type = Type,
        length = Length,
        payload = binary:copy(Payload)
    },
    {ok, Frame, Rest};
parse_frame(_) ->
    {error, incomplete_frame}.

parse_tlv_stream(StreamBinary) ->
    parse_tlv_loop(StreamBinary, []).

parse_tlv_loop(<<>>, Acc) ->
    {ok, lists:reverse(Acc)};
parse_tlv_loop(Binary, Acc) ->
    case parse_frame(Binary) of
        {ok, Frame, Rest} ->
            parse_tlv_loop(Rest, [Frame | Acc]);
        {error, incomplete_frame} ->
            {partial, lists:reverse(Acc), Binary}
    end.`,
    },
    references: [
      {
        title: 'Binary Pattern Matching in Network Protocols',
        url: 'https://www.erlang.org/doc/programming_examples/bit_syntax.html',
        category: 'erlang_docs',
        description: 'How to build high-throughput protocol decoders on the BEAM.',
      },
    ],
  },
];
