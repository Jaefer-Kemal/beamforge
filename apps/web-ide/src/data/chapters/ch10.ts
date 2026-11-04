import { LessonContent } from '../../types/workspace';

export const CHAPTER_10_LESSONS: LessonContent[] = [
  // ── Lesson 10.1: Guided Demo ───────────────────────────────────────────────
  {
    id: 'ch10-l01',
    chapterNumber: 10,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'Guided Demo: Inside gen_tcp:listen/2, accept/1, connect/3 & Live TCP Socket Telemetry',
    difficulty: 'Intermediate',
    xpReward: 50,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'What is the critical architectural difference between a ListenSocket and an accepted ClientSocket in Erlang?',
      codeSnippet: `{ok, ListenSocket} = gen_tcp:listen(0, [binary, {active, false}]),
{ok, ClientSocket} = gen_tcp:accept(ListenSocket).`,
      options: [
        {
          id: 'A',
          label: 'ListenSocket only listens for incoming 3-way handshakes and cannot transfer payload data; ClientSocket is a dedicated two-way communication pipe for one connected client.',
          isCorrect: true,
          explanation: 'Exactly. Think of ListenSocket as the front desk of a hotel welcoming visitors, while ClientSocket is the private telephone line inside a guest room.',
        },
        {
          id: 'B',
          label: 'ListenSocket uses UDP under the hood, while ClientSocket automatically upgrades to TCP.',
          isCorrect: false,
          explanation: 'Both sockets are strictly TCP; gen_udp is a completely separate Erlang module.',
        },
        {
          id: 'C',
          label: 'ListenSocket handles all incoming message payloads, while ClientSocket only handles disconnects.',
          isCorrect: false,
          explanation: 'ListenSocket never receives data packets. All data exchanges occur exclusively through ClientSocket.',
        },
      ],
    },
    conceptMarkdown: `## Why This Matters in Production

Every high-throughput network backend in production—from Redis, PostgreSQL, and RabbitMQ to WhatsApp, Discord, and telecom switches—is built on top of **raw TCP (Transmission Control Protocol) sockets**.

In traditional multithreaded runtimes (Java, C++, Go, Python), handling 50,000 concurrent client connections requires complex thread pools, non-blocking epoll event loops (\`libuv\`, \`Netty\`), or mutexes that risk catastrophic deadlocks.

In the **BEAM VM**, raw networking is treated as a first-class concurrency primitive. **Every connected TCP socket is mapped directly to a lightweight Erlang process**. When bytes arrive on the physical network card, the BEAM port driver translates the operating system's TCP segment into an Erlang message (\`{tcp, Socket, Data}\`) and delivers it straight to that process's private mailbox without shared locks!

> [!abstract] The BEAM Raw TCP Socket Lifecycle
> 1. **\`gen_tcp:listen(0, Opts)\`**: Asks the OS kernel to bind an available port and creates a \`ListenSocket\` (the server's front door).
> 2. **\`gen_tcp:accept(ListenSocket)\`**: Blocks the acceptor process until a client completes the 3-way TCP handshake (\`SYN\` $\\rightarrow$ \`SYN-ACK\` $\\rightarrow$ \`ACK\`), returning a dedicated \`ClientSocket\`.
> 3. **Wire Traffic**: Incoming bytes bypass userland mutexes and arrive directly as binary messages in the controlling process's mailbox.

## Deep Concept Breakdown & Under the Hood

### 1. What is a TCP Socket?
A TCP connection is not a physical cable; it is a stateful contract maintained between two operating system kernels over an IP network:
- **Sequence Numbers & ACKs**: Every byte transmitted is numbered. The receiving kernel acknowledges received ranges and automatically retransmits lost packets.
- **The 3-Way Handshake**: Connection setup requires three wire segments:
  1. Client sends \`SYN\` (Synchronize sequence numbers).
  2. Server responds with \`SYN-ACK\` (Acknowledge client SYN and send server SYN).
  3. Client responds with \`ACK\` (Acknowledge server SYN).

### 2. \`ListenSocket\` vs. \`ClientSocket\`
In Erlang socket programming, the two socket descriptors have completely different responsibilities:
- **\`ListenSocket\` (\`gen_tcp:listen/2\`)**: The listening socket is the welcoming front door of your server. It is bound to an IP address and port. Its sole job is to queue incoming connection requests. You **cannot** send or receive payload data over a \`ListenSocket\`!
- **\`ClientSocket\` (\`gen_tcp:accept/1\`)**: Calling \`gen_tcp:accept/1\` suspends the acceptor process until a client completes the 3-way handshake. The operating system allocates a dedicated, full-duplex communication pipe (\`ClientSocket\`) specifically for that client, while \`ListenSocket\` remains free to welcome further connections.

### 3. Ephemeral Port Binding: Why Port \`0\`?
When calling \`gen_tcp:listen(Port, Options)\`, specifying port \`0\` asks the operating system kernel to allocate an unused **ephemeral port** (typically in the range 49152–65535). You then retrieve the actual bound port using:

\`\`\`erlang
{ok, Port} = inet:port(ListenSocket).
\`\`\`

Passing port \`0\` is essential for parallel automated testing and dynamic microservices, preventing \`{error, eaddrinuse}\` port collision errors when multiple test suites run concurrently!

### 4. Controlling Process of a Socket
On the BEAM, every open socket is owned by an Erlang process known as the **controlling process**:
- The process that calls \`gen_tcp:listen/2\` or \`gen_tcp:accept/1\` becomes the initial controlling process.
- All incoming socket messages (\`{tcp, Socket, Data}\`, \`{tcp_closed, Socket}\`) are delivered **exclusively** to the controlling process's mailbox.
- If the controlling process terminates, the BEAM VM automatically closes the underlying socket file descriptor!

### 5. Inspecting Live Socket Telemetry: \`inet:getstat/2\`
In production Erlang, you do not need external kernel probes to measure network throughput. You can query the OS kernel's socket counters directly from Erlang:

\`\`\`erlang
{ok, Stats} = inet:getstat(Socket, [recv_oct, send_oct, recv_cnt, send_cnt]).
%% Returns: [{recv_oct, 1024}, {send_oct, 512}, {recv_cnt, 4}, {send_cnt, 2}]
\`\`\`
- \`recv_oct\` / \`send_oct\`: Total octets (bytes) received and sent over the wire.
- \`recv_cnt\` / \`send_cnt\`: Total number of packets transferred through the socket driver.

> [!warning] Production Networking Trap: Port Starvation & Lingering Sockets
> Every open socket consumes an OS file descriptor. If your connection worker crashes or finishes without calling \`gen_tcp:close(Socket)\` in its cleanup path, the socket descriptor remains open in the OS kernel until garbage collection occurs. Under 10,000 connections/sec, your server will hit \`EMFILE (Too many open files)\` and crash! Always wrap socket workers in supervised OTP processes.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (kernel / gen_tcp & inet)
gen_tcp:listen(Port, Options) -> {ok, ListenSocket} | {error, Reason}
gen_tcp:accept(ListenSocket) -> {ok, ClientSocket} | {error, Reason}
gen_tcp:accept(ListenSocket, Timeout) -> {ok, ClientSocket} | {error, Reason}
gen_tcp:connect(Address, Port, Options) -> {ok, Socket} | {error, Reason}
gen_tcp:send(Socket, Packet) -> ok | {error, Reason}
gen_tcp:close(Socket) -> ok
inet:port(Socket) -> {ok, Port}
inet:getstat(Socket, [StatOption]) -> {ok, [{StatOption, integer()}]}
\`\`\`

## Assignment Specification

This is a **Guided Demonstration**. The module \`src/tcp_live_demo.erl\` executes a complete end-to-end TCP socket lifecycle simulation on loopback interface \`127.0.0.1\`:
1. Binds a \`ListenSocket\` on ephemeral port \`0\`.
2. Inspects the allocated OS port using \`inet:port/1\`.
3. Spawns an acceptor process that accepts a real client connection via \`gen_tcp:accept/2\`.
4. Connects a TCP client via \`gen_tcp:connect/4\` and exchanges 3 binary request/response frames:
   - \`<<"SYN_FRAME\\r\\n">>\`
   - \`<<"DATA_FRAME\\r\\n">>\`
   - \`<<"FIN_FRAME\\r\\n">>\`
5. Queries \`inet:getstat/2\` to inspect live byte and packet telemetry counters.
6. Cleanly closes both sockets with \`gen_tcp:close/1\` and returns:
   \`#{port => Port, frames_exchanged => 3, bytes_received => RecvBytes}\`.

Click **\`▷ Run\`** or **\`▶ Submit\`** to boot the live TCP server and observe real wire transmission in the terminal!

## Rules & Verification Constraints
- Verified by executing \`tcp_live_demo:run_demo/0\`.
- AST verifier checks required calls: \`gen_tcp:listen/2\`, \`gen_tcp:accept/2\`, \`gen_tcp:send/2\`, and \`gen_tcp:recv/3\`.
    `,
    otpDocCards: [
      {
        functionName: 'listen',
        module: 'gen_tcp',
        signature: 'gen_tcp:listen(Port, Options) -> {ok, ListenSocket} | {error, Reason}',
        typesSpec: [
          'Port = inet:port_number()',
          'Options = [gen_tcp:listen_option()]',
          'ListenSocket = gen_tcp:socket()'
        ],
        description: 'Binds an OS port and sets up a listening socket descriptor ready to accept client connections.',
        complexityNote: 'Binds kernel socket and enters listen state in O(1) time.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#listen/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      },
      {
        functionName: 'accept',
        module: 'gen_tcp',
        signature: 'gen_tcp:accept(ListenSocket, Timeout) -> {ok, Socket} | {error, Reason}',
        typesSpec: [
          'ListenSocket = gen_tcp:socket()',
          'Timeout = timeout()',
          'Socket = gen_tcp:socket()'
        ],
        description: 'Blocks the calling process until a client completes the 3-way TCP handshake, returning a dedicated ClientSocket.',
        complexityNote: 'Suspends the Erlang process until an incoming SYN handshake arrives.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#accept/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      }
    ],
    starterCode: `-module(tcp_live_demo).

-export([run_demo/0]).

%% @doc Runs a full end-to-end TCP socket lifecycle demo on an ephemeral port.
-spec run_demo() -> map().
run_demo() ->
    io:format("~n=== [STEP 1] Opening Listen Socket on Ephemeral Port 0 ===~n"),
    ListenOpts = [
        binary,
        {packet, raw},
        {active, false},
        {reuseaddr, true}
    ],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    io:format("  -> Successfully bound ListenSocket to Port ~p~n", [Port]),

    io:format("~n=== [STEP 2] Spawning Background Acceptor Process ===~n"),
    Parent = self(),
    AcceptorPid = spawn(fun() ->
        io:format("  [Acceptor] Waiting for incoming client handshake...~n"),
        case gen_tcp:accept(ListenSocket, 3000) of
            {ok, ClientSocket} ->
                io:format("  [Acceptor] Client connected! Starting echo loop.~n"),
                Parent ! {acceptor_ready, self()},
                echo_loop(ClientSocket, 0, Parent);
            {error, Reason} ->
                Parent ! {acceptor_error, Reason}
        end
    end),

    io:format("~n=== [STEP 3] Connecting Client to 127.0.0.1:~p ===~n", [Port]),
    ClientOpts = [binary, {packet, raw}, {active, false}],
    {ok, ClientSock} = gen_tcp:connect("127.0.0.1", Port, ClientOpts, 2000),
    io:format("  -> Client connection established!~n"),

    receive
        {acceptor_ready, AcceptorPid} -> ok
    after 2000 ->
        error(acceptor_timeout)
    end,

    io:format("~n=== [STEP 4] Exchanging 3 Request/Response Frames ===~n"),
    Messages = [
        <<"SYN_FRAME\\r\\n">>,
        <<"DATA_FRAME\\r\\n">>,
        <<"FIN_FRAME\\r\\n">>
    ],
    lists:foreach(fun(Msg) ->
        io:format("  [Client Send] -> ~s", [binary_to_list(Msg)]),
        ok = gen_tcp:send(ClientSock, Msg),
        {ok, Reply} = gen_tcp:recv(ClientSock, 0, 2000),
        io:format("  [Client Recv] <- ~s", [binary_to_list(Reply)])
    end, Messages),

    io:format("~n=== [STEP 5] Inspecting Socket Telemetry Statistics ===~n"),
    {ok, Stats} = inet:getstat(ClientSock, [recv_oct, send_oct, recv_cnt, send_cnt]),
    io:format("  -> Client Telemetry Stats: ~p~n", [Stats]),
    RecvBytes = proplists:get_value(recv_oct, Stats, 0),

    %% Clean up resources cleanly
    gen_tcp:close(ClientSock),
    gen_tcp:close(ListenSocket),

    receive
        {acceptor_done, TotalProcessed} ->
            io:format("~n=== [COMPLETE] Closed Sockets. Total Packets: ~p ===~n~n", [TotalProcessed]),
            #{port => Port, frames_exchanged => TotalProcessed, bytes_received => RecvBytes}
    after 1000 ->
        #{port => Port, frames_exchanged => 3, bytes_received => RecvBytes}
    end.

echo_loop(Socket, Count, Parent) ->
    case gen_tcp:recv(Socket, 0, 2000) of
        {ok, <<"FIN_FRAME\\r\\n">>} ->
            _ = gen_tcp:send(Socket, <<"+ACK: FIN_FRAME\\r\\n">>),
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count + 1};
        {ok, Data} ->
            Reply = <<"+ACK: ", Data/binary>>,
            ok = gen_tcp:send(Socket, Reply),
            echo_loop(Socket, Count + 1, Parent);
        {error, closed} ->
            Parent ! {acceptor_done, Count};
        {error, _Reason} ->
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count}
    end.
    `,
    solutionCode: `-module(tcp_live_demo).

-export([run_demo/0]).

-spec run_demo() -> map().
run_demo() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    spawn(fun() ->
        case gen_tcp:accept(ListenSocket, 3000) of
            {ok, ClientSocket} ->
                Parent ! {acceptor_ready, self()},
                echo_loop(ClientSocket, 0, Parent);
            {error, Reason} ->
                Parent ! {acceptor_error, Reason}
        end
    end),
    ClientOpts = [binary, {packet, raw}, {active, false}],
    {ok, ClientSock} = gen_tcp:connect("127.0.0.1", Port, ClientOpts, 2000),
    receive {acceptor_ready, _} -> ok after 2000 -> error(acceptor_timeout) end,
    Messages = [<<"SYN_FRAME\\r\\n">>, <<"DATA_FRAME\\r\\n">>, <<"FIN_FRAME\\r\\n">>],
    lists:foreach(fun(Msg) ->
        ok = gen_tcp:send(ClientSock, Msg),
        {ok, _Reply} = gen_tcp:recv(ClientSock, 0, 2000)
    end, Messages),
    {ok, Stats} = inet:getstat(ClientSock, [recv_oct, send_oct]),
    RecvBytes = proplists:get_value(recv_oct, Stats, 0),
    gen_tcp:close(ClientSock),
    gen_tcp:close(ListenSocket),
    receive
        {acceptor_done, TotalProcessed} ->
            #{port => Port, frames_exchanged => TotalProcessed, bytes_received => RecvBytes}
    after 1000 ->
        #{port => Port, frames_exchanged => 3, bytes_received => RecvBytes}
    end.

echo_loop(Socket, Count, Parent) ->
    case gen_tcp:recv(Socket, 0, 2000) of
        {ok, <<"FIN_FRAME\\r\\n">>} ->
            _ = gen_tcp:send(Socket, <<"+ACK: FIN_FRAME\\r\\n">>),
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count + 1};
        {ok, Data} ->
            Reply = <<"+ACK: ", Data/binary>>,
            ok = gen_tcp:send(Socket, Reply),
            echo_loop(Socket, Count + 1, Parent);
        {error, _} ->
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count}
    end.
    `,
        files: [
      {
        name: 'tcp_live_demo.erl',
        path: 'src/tcp_live_demo.erl',
        content: `-module(tcp_live_demo).

-export([run_demo/0]).

%% @doc Runs a full end-to-end TCP socket lifecycle demo on an ephemeral port.
-spec run_demo() -> map().
run_demo() ->
    io:format("~n=== [STEP 1] Opening Listen Socket on Ephemeral Port 0 ===~n"),
    ListenOpts = [
        binary,
        {packet, raw},
        {active, false},
        {reuseaddr, true}
    ],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    io:format("  -> Successfully bound ListenSocket to Port ~p~n", [Port]),

    io:format("~n=== [STEP 2] Spawning Background Acceptor Process ===~n"),
    Parent = self(),
    AcceptorPid = spawn(fun() ->
        io:format("  [Acceptor] Waiting for incoming client handshake...~n"),
        case gen_tcp:accept(ListenSocket, 3000) of
            {ok, ClientSocket} ->
                io:format("  [Acceptor] Client connected! Starting echo loop.~n"),
                Parent ! {acceptor_ready, self()},
                echo_loop(ClientSocket, 0, Parent);
            {error, Reason} ->
                Parent ! {acceptor_error, Reason}
        end
    end),

    io:format("~n=== [STEP 3] Connecting Client to 127.0.0.1:~p ===~n", [Port]),
    ClientOpts = [binary, {packet, raw}, {active, false}],
    {ok, ClientSock} = gen_tcp:connect("127.0.0.1", Port, ClientOpts, 2000),
    io:format("  -> Client connection established!~n"),

    receive
        {acceptor_ready, AcceptorPid} -> ok
    after 2000 ->
        error(acceptor_timeout)
    end,

    io:format("~n=== [STEP 4] Exchanging 3 Request/Response Frames ===~n"),
    Messages = [
        <<"SYN_FRAME\\r\\n">>,
        <<"DATA_FRAME\\r\\n">>,
        <<"FIN_FRAME\\r\\n">>
    ],
    lists:foreach(fun(Msg) ->
        io:format("  [Client Send] -> ~s", [binary_to_list(Msg)]),
        ok = gen_tcp:send(ClientSock, Msg),
        {ok, Reply} = gen_tcp:recv(ClientSock, 0, 2000),
        io:format("  [Client Recv] <- ~s", [binary_to_list(Reply)])
    end, Messages),

    io:format("~n=== [STEP 5] Inspecting Socket Telemetry Statistics ===~n"),
    {ok, Stats} = inet:getstat(ClientSock, [recv_oct, send_oct, recv_cnt, send_cnt]),
    io:format("  -> Client Telemetry Stats: ~p~n", [Stats]),
    RecvBytes = proplists:get_value(recv_oct, Stats, 0),

    %% Clean up resources cleanly
    gen_tcp:close(ClientSock),
    gen_tcp:close(ListenSocket),

    receive
        {acceptor_done, TotalProcessed} ->
            io:format("~n=== [COMPLETE] Closed Sockets. Total Packets: ~p ===~n~n", [TotalProcessed]),
            #{port => Port, frames_exchanged => TotalProcessed, bytes_received => RecvBytes}
    after 1000 ->
        #{port => Port, frames_exchanged => 3, bytes_received => RecvBytes}
    end.

echo_loop(Socket, Count, Parent) ->
    case gen_tcp:recv(Socket, 0, 2000) of
        {ok, <<"FIN_FRAME\\r\\n">>} ->
            _ = gen_tcp:send(Socket, <<"+ACK: FIN_FRAME\\r\\n">>),
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count + 1};
        {ok, Data} ->
            Reply = <<"+ACK: ", Data/binary>>,
            ok = gen_tcp:send(Socket, Reply),
            echo_loop(Socket, Count + 1, Parent);
        {error, closed} ->
            Parent ! {acceptor_done, Count};
        {error, _Reason} ->
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count}
    end.
    `,
      },
    ],
    solutionFiles: {
      'src/tcp_live_demo.erl': `-module(tcp_live_demo).

-export([run_demo/0]).

-spec run_demo() -> map().
run_demo() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    spawn(fun() ->
        case gen_tcp:accept(ListenSocket, 3000) of
            {ok, ClientSocket} ->
                Parent ! {acceptor_ready, self()},
                echo_loop(ClientSocket, 0, Parent);
            {error, Reason} ->
                Parent ! {acceptor_error, Reason}
        end
    end),
    ClientOpts = [binary, {packet, raw}, {active, false}],
    {ok, ClientSock} = gen_tcp:connect("127.0.0.1", Port, ClientOpts, 2000),
    receive {acceptor_ready, _} -> ok after 2000 -> error(acceptor_timeout) end,
    Messages = [<<"SYN_FRAME\\r\\n">>, <<"DATA_FRAME\\r\\n">>, <<"FIN_FRAME\\r\\n">>],
    lists:foreach(fun(Msg) ->
        ok = gen_tcp:send(ClientSock, Msg),
        {ok, _Reply} = gen_tcp:recv(ClientSock, 0, 2000)
    end, Messages),
    {ok, Stats} = inet:getstat(ClientSock, [recv_oct, send_oct]),
    RecvBytes = proplists:get_value(recv_oct, Stats, 0),
    gen_tcp:close(ClientSock),
    gen_tcp:close(ListenSocket),
    receive
        {acceptor_done, TotalProcessed} ->
            #{port => Port, frames_exchanged => TotalProcessed, bytes_received => RecvBytes}
    after 1000 ->
        #{port => Port, frames_exchanged => 3, bytes_received => RecvBytes}
    end.

echo_loop(Socket, Count, Parent) ->
    case gen_tcp:recv(Socket, 0, 2000) of
        {ok, <<"FIN_FRAME\\r\\n">>} ->
            _ = gen_tcp:send(Socket, <<"+ACK: FIN_FRAME\\r\\n">>),
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count + 1};
        {ok, Data} ->
            Reply = <<"+ACK: ", Data/binary>>,
            ok = gen_tcp:send(Socket, Reply),
            echo_loop(Socket, Count + 1, Parent);
        {error, _} ->
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count}
    end.
    `,
    },
solutionExplanation: `### How the TCP Socket Lifecycle Operates
1. **Ephemeral Port Allocation**: Calling \`gen_tcp:listen(0, ...)\` delegates port selection to the host kernel, preventing port binding clashes.
2. **Asynchronous Handshake Isolation**: By running \`gen_tcp:accept/2\` in a separate acceptor process, the main application process remains completely non-blocking.
3. **Synchronous Passive Transfer**: The client transmits binary messages and synchronously awaits matching replies via \`gen_tcp:recv/3\`.
4. **Clean Resource Deallocation**: Both socket descriptors are closed explicitly with \`gen_tcp:close/1\`, immediately relinquishing kernel network memory.`,
    visibleTestCases: [
      {
        id: 'tc-ch10-l01-1',
        title: 'Execute End-to-End Live TCP Socket Demo',
        erlangCall: 'maps:get(frames_exchanged, tcp_live_demo:run_demo())',
        expectedOutput: '3',
        explanation: 'Opens ephemeral loopback port, connects real client, exchanges 3 frames, and closes cleanly.',
      },
    ],
    astRules: {
      requireTailRecursion: ['echo_loop/3'],
      forbiddenCalls: [],
      requiredCalls: ['gen_tcp:listen/2', 'gen_tcp:accept/1', 'gen_tcp:send/2', 'gen_tcp:recv/3'],
      requiredConstructs: ['receive_after'],
    },
    references: [
      {
        title: 'Official Erlang kernel: gen_tcp Module Reference',
        url: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html',
        category: 'erlang_docs',
        description: 'Complete API documentation for Erlang TCP socket operations.',
      },
      {
        title: 'Official Erlang kernel: inet Module Reference',
        url: 'https://www.erlang.org/doc/apps/kernel/inet.html',
        category: 'erlang_docs',
        description: 'Functions for inspecting socket ports, IP addresses, and kernel telemetry statistics.',
      },
    ],
  },

  // ── Lesson 10.2: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch10-l02',
    chapterNumber: 10,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Socket Options (nodelay, reuseaddr), Built-In C Framing ({packet, 4 | line}) & Clean Disconnects',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'Why is {nodelay, true} (disabling Nagle\'s algorithm) critical for real-time protocols like XMPP and multiplayer games?',
      codeSnippet: `gen_tcp:listen(Port, [binary, {nodelay, true}, {reuseaddr, true}])`,
      options: [
        {
          id: 'A',
          label: 'By default, Nagle\'s algorithm buffers small outgoing packets in the OS kernel for up to 40-200ms waiting to accumulate a larger TCP segment, introducing unacceptable interactive lag.',
          isCorrect: true,
          explanation: 'Correct! For real-time chat, RPC, and gaming, small packets must leave the network interface immediately. {nodelay, true} bypasses this buffering delay.',
        },
        {
          id: 'B',
          label: 'Nagle\'s algorithm encrypts packets, and disabling it reduces CPU overhead.',
          isCorrect: false,
          explanation: 'Nagle\'s algorithm is purely a congestion-control packet buffering mechanism; it has nothing to do with encryption.',
        },
        {
          id: 'C',
          label: '{nodelay, true} switches the transport layer from TCP to UDP.',
          isCorrect: false,
          explanation: 'The connection remains 100% reliable TCP with standard sequence numbers and acknowledgements.',
        },
      ],
    },
    conceptMarkdown: `## Why This Matters in Production

Before writing custom stream framing loops or byte parsers, you must master the **built-in C-level socket options** provided by the BEAM runtime and OS kernel.

Misconfiguring socket options is the hidden cause behind the two most frustrating bugs in backend engineering:
1. **The 200ms Latency Mystery**: An API endpoint that should take 2ms randomly takes 202ms because the operating system is buffering packets under **Nagle's Algorithm**.
2. **Supervisor Restart Crash Loops**: A supervised TCP worker crashes and tries to restart, but crashes immediately with \`{error, eaddrinuse}\` because the operating system keeps the port locked in **\`TIME_WAIT\`**!

By passing the correct socket options, you delegate framing and low-latency packet flushing directly to the BEAM's optimized C port driver!

> [!abstract] Essential Socket Options Matrix
> - **\`binary\`**: Delivers packets as compact, contiguous binaries (\`<<"...">>\`) instead of 16-byte-per-char linked lists (\`[104, 101, ...]\`).
> - **\`{nodelay, true}\` (\`TCP_NODELAY\`)**: Disables Nagle's algorithm. Flushes small writes to the network interface immediately without a 40–200ms delay.
> - **\`{reuseaddr, true}\` (\`SO_REUSEADDR\`)**: Allows the server to rebind the port immediately upon supervisor restart without waiting for OS \`TIME_WAIT\` sockets to expire.
> - **\`{packet, 4}\`**: Instructs the C driver to automatically prepend a 4-byte big-endian length prefix on send, and buffer incoming chunks in C until the full payload arrives before delivering \`{tcp, Sock, Payload}\`!

## Deep Concept Breakdown & Under the Hood

### 1. Built-in C-Level Packet Framing
TCP is fundamentally an **unframed stream of bytes**, not a stream of messages. If a client sends \`<<"HELLO">>\`, the server might receive \`<<"HEL">>\` followed by \`<<"LO">>\`.

Instead of writing custom Erlang buffers for length-prefixed protocols, the BEAM C driver provides built-in packet framing:
- **\`{packet, raw}\` (or \`0\`)**: No automatic framing. Delivers raw TCP chunks as they arrive.
- **\`{packet, 1 | 2 | 4}\`**: Length-prefixed framing. The driver assumes every packet begins with a 1-, 2-, or 4-byte unsigned big-endian integer specifying the payload length.
  - On \`gen_tcp:send(Socket, Payload)\`: The C driver automatically prepends the 4-byte length header.
  - On reception: The C driver buffers bytes in OS C memory until the entire \`Length\` bytes have arrived. Only then does it deliver a single, complete \`{tcp, Socket, Payload}\` message into your Erlang mailbox!
- **\`{packet, line}\`**: Buffers incoming bytes in C and delivers one line at a time up to the newline character (\`\\n\`).

### 2. Socket Lifecycle Event Handling
In active socket modes, the BEAM driver delivers three standardized message tuples to your process mailbox:
1. **Data Arrived**: \`{tcp, Socket, DataBin}\` when bytes are ready.
2. **Clean Disconnect**: \`{tcp_closed, Socket}\` when the remote peer gracefully closes the connection (\`FIN\` handshake).
3. **Network Error**: \`{tcp_error, Socket, Reason}\` on abrupt connection resets (\`econnreset\`) or timeouts.

> [!warning] Production Networking Trap: Nagle's Algorithm & Delayed ACK Deadlock
> In HTTP/1.1 or custom RPC, when a client sends a small command (e.g. \`PING\`), Nagle's algorithm may hold the packet waiting for more data. Meanwhile, the server's OS uses **Delayed ACK**, waiting up to 200ms to acknowledge the previous packet. Both operating systems wait on each other, causing an artificial **200ms latency spike**! In real-time servers, **always set \`{nodelay, true}\`**.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (kernel / inet)
inet:setopts(Socket, Options) -> ok | {error, Reason}
  Types:
    Options = [gen_tcp:listen_option()]
    %% Options can include:
    %%   binary,
    %%   {packet, raw | line | 1 | 2 | 4},
    %%   {active, once | true | false},
    %%   {nodelay, boolean()},
    %%   {reuseaddr, boolean()}
\`\`\`

## Parallel Worked Example

Here is a module creating low-latency socket options, classifying events, and manually encoding length-prefixed frames:

\`\`\`erlang
-module(socket_configurator).
-export([get_chat_options/0, parse_event/1, wrap_frame/1]).

get_chat_options() ->
    [binary, {packet, 4}, {active, once}, {nodelay, true}, {reuseaddr, true}].

parse_event({tcp, _Sock, Data}) when is_binary(Data) ->
    {ok, data, byte_size(Data), Data};
parse_event({tcp_closed, _Sock}) ->
    {ok, disconnected, normal};
parse_event({tcp_error, _Sock, Reason}) ->
    {ok, disconnected, {error, Reason}};
parse_event(_Other) ->
    {error, invalid_event}.

wrap_frame(PayloadBin) when is_binary(PayloadBin) ->
    Len = byte_size(PayloadBin),
    <<Len:32/big-unsigned-integer, PayloadBin/binary>>.
\`\`\`

## Assignment Specification

Implement module \`src/tcp_socket_opts.erl\` exporting three essential socket configuration and event classification functions:

1. **\`build_low_latency_opts(PacketMode)\`**:
   - Validates that \`PacketMode\` is one of: \`raw\`, \`line\`, \`1\`, \`2\`, or \`4\`.
   - Returns the canonical low-latency options list:
     \`\`\`erlang
     [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}]
     \`\`\`
   - If \`PacketMode\` is invalid (e.g. \`udp\`, \`8\`, or \`invalid\`), returns \`{error, invalid_packet_mode}\`.
2. **\`classify_socket_event(EventTuple)\`**:
   - Matches \`{tcp, _Socket, DataBin}\` when \`is_binary(DataBin)\` $\\rightarrow$ returns \`{data, byte_size(DataBin), DataBin}\`.
   - Matches \`{tcp_closed, _Socket}\` $\\rightarrow$ returns \`{disconnected, normal_eof}\`.
   - Matches \`{tcp_error, _Socket, Reason}\` $\\rightarrow$ returns \`{disconnected, {socket_error, Reason}}\`.
   - Any other term $\\rightarrow$ returns \`{error, unknown_event}\`.
3. **\`encode_length_prefixed(PayloadBin)\`**:
   - Manually constructs a \`{packet, 4}\` wire frame:
     \`\`\`erlang
     <<(byte_size(PayloadBin)):32/big-unsigned-integer, PayloadBin/binary>>
     \`\`\`

## Rules & Verification Constraints
- Use binary syntax (\`<<...>>\`) and guard clauses (\`is_binary/1\`).
- AST verifier checks required constructs: \`bit_syntax\` and \`guards\`.
    `,
    otpDocCards: [
      {
        functionName: 'setopts',
        module: 'inet',
        signature: 'inet:setopts(Socket, Options) -> ok | {error, Reason}',
        typesSpec: [
          'Socket = inet:socket()',
          'Options = [inet:socket_setopt()]'
        ],
        description: 'Sets options for a socket including active reception modes, nodelay, and packet framing.',
        complexityNote: 'Modifies kernel socket state via OS ioctl/setsockopt syscalls.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/inet.html#setopts/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/inet.erl'
      },
      {
        functionName: 'send',
        module: 'gen_tcp',
        signature: 'gen_tcp:send(Socket, Packet) -> ok | {error, Reason}',
        typesSpec: [
          'Socket = gen_tcp:socket()',
          'Packet = iodata()'
        ],
        description: 'Sends binary packet or iolist over connected socket descriptor.',
        complexityNote: 'Direct synchronous write to OS socket send buffer.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#send/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      }
    ],
    starterCode: `-module(tcp_socket_opts).

-export([
    build_low_latency_opts/1,
    classify_socket_event/1,
    encode_length_prefixed/1
]).

%% @doc Constructs a low-latency socket options list with verified packet mode.
%% Valid PacketModes: raw, line, 1, 2, 4.
%% Returns [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}]
%% or {error, invalid_packet_mode}.
-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(_PacketMode) ->
    %% % TODO: Validate PacketMode (raw, line, 1, 2, or 4).
    %% % Return the canonical low-latency options list specified in the lesson guide,
    %% % or {error, invalid_packet_mode} if unsupported.
    ignore.

%% @doc Classifies incoming socket events into standardized internal tuples.
-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event(_EventTuple) ->
    %% % TODO: Pattern match on the active socket lifecycle events
    %% % ({tcp, ...}, {tcp_closed, ...}, {tcp_error, ...}) and normalize them
    %% % into the tagged result tuples defined in the lesson guide.
    ignore.

%% @doc Manually encodes a 4-byte big-endian length prefix onto PayloadBin.
-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(_PayloadBin) ->
    %% % TODO: Using bit syntax, construct a frame containing PayloadBin
    %% % preceded by its byte size encoded as a 4-byte big-endian integer.
    ignore.
    `,
    solutionCode: `-module(tcp_socket_opts).

-export([
    build_low_latency_opts/1,
    classify_socket_event/1,
    encode_length_prefixed/1
]).

-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(PacketMode) when PacketMode =:= raw;
                                        PacketMode =:= line;
                                        PacketMode =:= 1;
                                        PacketMode =:= 2;
                                        PacketMode =:= 4 ->
    [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}];
build_low_latency_opts(_Other) ->
    {error, invalid_packet_mode}.

-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event({tcp, _Socket, DataBin}) when is_binary(DataBin) ->
    {data, byte_size(DataBin), DataBin};
classify_socket_event({tcp_closed, _Socket}) ->
    {disconnected, normal_eof};
classify_socket_event({tcp_error, _Socket, Reason}) ->
    {disconnected, {socket_error, Reason}};
classify_socket_event(_Other) ->
    {error, unknown_event}.

-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(PayloadBin) when is_binary(PayloadBin) ->
    <<(byte_size(PayloadBin)):32/big-unsigned-integer, PayloadBin/binary>>.
    `,
        files: [
      {
        name: 'tcp_socket_opts.erl',
        path: 'src/tcp_socket_opts.erl',
        content: `-module(tcp_socket_opts).

-export([
    build_low_latency_opts/1,
    classify_socket_event/1,
    encode_length_prefixed/1
]).

%% @doc Constructs a low-latency socket options list with verified packet mode.
%% Valid PacketModes: raw, line, 1, 2, 4.
%% Returns [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}]
%% or {error, invalid_packet_mode}.
-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(_PacketMode) ->
    %% % TODO: Validate PacketMode (raw, line, 1, 2, or 4).
    %% % Return the canonical low-latency options list specified in the lesson guide,
    %% % or {error, invalid_packet_mode} if unsupported.
    ignore.

%% @doc Classifies incoming socket events into standardized internal tuples.
-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event(_EventTuple) ->
    %% % TODO: Pattern match on the active socket lifecycle events
    %% % ({tcp, ...}, {tcp_closed, ...}, {tcp_error, ...}) and normalize them
    %% % into the tagged result tuples defined in the lesson guide.
    ignore.

%% @doc Manually encodes a 4-byte big-endian length prefix onto PayloadBin.
-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(_PayloadBin) ->
    %% % TODO: Using bit syntax, construct a frame containing PayloadBin
    %% % preceded by its byte size encoded as a 4-byte big-endian integer.
    ignore.
    `,
      },
    ],
    solutionFiles: {
      'src/tcp_socket_opts.erl': `-module(tcp_socket_opts).

-export([
    build_low_latency_opts/1,
    classify_socket_event/1,
    encode_length_prefixed/1
]).

-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(PacketMode) when PacketMode =:= raw;
                                        PacketMode =:= line;
                                        PacketMode =:= 1;
                                        PacketMode =:= 2;
                                        PacketMode =:= 4 ->
    [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}];
build_low_latency_opts(_Other) ->
    {error, invalid_packet_mode}.

-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event({tcp, _Socket, DataBin}) when is_binary(DataBin) ->
    {data, byte_size(DataBin), DataBin};
classify_socket_event({tcp_closed, _Socket}) ->
    {disconnected, normal_eof};
classify_socket_event({tcp_error, _Socket, Reason}) ->
    {disconnected, {socket_error, Reason}};
classify_socket_event(_Other) ->
    {error, unknown_event}.

-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(PayloadBin) when is_binary(PayloadBin) ->
    <<(byte_size(PayloadBin)):32/big-unsigned-integer, PayloadBin/binary>>.
    `,
    },
solutionExplanation: `### Solution Breakdown: Low-Latency Socket Configuration
1. **Guard-Based Validation**: \`build_low_latency_opts/1\` uses guard disjunctions (\`PacketMode =:= raw; PacketMode =:= 4; ...\`) to guarantee only valid packet modes are passed to the BEAM driver.
2. **Event Classification**: \`classify_socket_event/1\` pattern matches the exact tuples generated by the BEAM port driver in active mode (\`{tcp, ...}\`, \`{tcp_closed, ...}\`, \`{tcp_error, ...}\`).
3. **Binary Bit Syntax**: \`encode_length_prefixed/1\` uses \`<<(byte_size(PayloadBin)):32/big-unsigned-integer, PayloadBin/binary>>\` to generate the exact binary wire format that the BEAM C driver produces when configured with \`{packet, 4}\`.`,
    visibleTestCases: [
      {
        id: 'tc-ch10-l02-1',
        title: 'Build Low-Latency Options for {packet, 4}',
        erlangCall: 'tcp_socket_opts:build_low_latency_opts(4)',
        expectedOutput: '[binary,{packet,4},{active,once},{nodelay,true},{reuseaddr,true}]',
        explanation: 'Validates packet mode 4 and generates complete low-latency socket configuration.',
      },
      {
        id: 'tc-ch10-l02-2',
        title: 'Reject Invalid Packet Mode',
        erlangCall: 'tcp_socket_opts:build_low_latency_opts(udp_invalid)',
        expectedOutput: '{error,invalid_packet_mode}',
        explanation: 'Rejects invalid packet modes with {error, invalid_packet_mode}.',
      },
      {
        id: 'tc-ch10-l02-3',
        title: 'Classify Incoming TCP Data Event',
        erlangCall: 'tcp_socket_opts:classify_socket_event({tcp, make_ref(), <<"XMPP_STANZA">>})',
        expectedOutput: '{data,11,<<"XMPP_STANZA">>}',
        explanation: 'Extracts data length and payload binary from active TCP message.',
      },
      {
        id: 'tc-ch10-l02-4',
        title: 'Manually Encode {packet, 4} Wire Frame',
        erlangCall: 'tcp_socket_opts:encode_length_prefixed(<<"PING">>)',
        expectedOutput: '<<0,0,0,4,80,73,78,71>>',
        explanation: 'Prepends 4-byte big-endian integer length (4) onto "PING" (80, 73, 78, 71).',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['erlang:byte_size/1'],
      requiredConstructs: ['bit_syntax', 'guards'],
    },
    references: [
      {
        title: 'Erlang Efficiency Guide: Binary Handling & Socket Options',
        url: 'https://www.erlang.org/doc/efficiency_guide/binaryhandling.html',
        category: 'erlang_docs',
        description: 'Official guide on zero-copy binaries and socket buffer tuning.',
      },
    ],
  },

  // ── Lesson 10.3: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch10-l03',
    chapterNumber: 10,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'TCP Flow Control: {active, false} vs. {active, true} vs. {active, once} Backpressure',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'When an incoming packet arrives under {active, once}, what does the BEAM socket driver do before delivering {tcp, Socket, Data} to the process?',
      codeSnippet: `receive
    {tcp, Socket, Data} ->
        process_data(Data),
        ok = inet:setopts(Socket, [{active, once}]),
        loop(Socket)
end`,
      options: [
        {
          id: 'A',
          label: 'It automatically flips the socket mode to passive ({active, false}), buffering subsequent network packets in the OS kernel until inet:setopts re-arms it.',
          isCorrect: true,
          explanation: 'Correct! Under {active, once}, the VM delivers exactly one packet and reverts to passive mode. Packets accumulate in kernel TCP buffers; if full, TCP flow control shrinks the receive window and pauses the sender.',
        },
        {
          id: 'B',
          label: 'It drops any packets that arrive during process_data(Data).',
          isCorrect: false,
          explanation: 'TCP guarantees zero packet loss on reliable links; packets wait safely in OS kernel socket buffers.',
        },
        {
          id: 'C',
          label: 'It spawns a new Erlang process for each subsequent byte.',
          isCorrect: false,
          explanation: 'The same controlling process receives the next packet once inet:setopts re-arms active mode.',
        },
      ],
    },
    conceptMarkdown: `## Why This Matters in Production

The **#1 cause of production outages** in network services is the unconstrained use of **\`{active, true}\`** on TCP sockets.

When a socket is opened in \`{active, true}\` mode, the operating system kernel delivers incoming network packets directly into the Erlang process's mailbox as fast as the physical network card can receive them. If a rogue client or malicious attacker blasts 200,000 packets per second, your Erlang process's mailbox queue length balloons from 0 to 1,000,000 messages in seconds. The BEAM VM consumes all available RAM and triggers the Linux Out-Of-Memory (OOM) Killer, destroying the entire node!

> [!abstract] Flow Control: \`{active, true}\` vs \`{active, once}\`
> - **Dangerous \`{active, true}\`:** Unbounded mailbox flood. Fast clients push 100k msgs/sec directly into actor mailbox, exhausting RAM and triggering OOM.
> - **Production Safe \`{active, once}\`:** Hardware backpressure. OS delivers exactly 1 packet, switches socket to passive mode, and waits until the actor calls \`inet:setopts(Sock, [{active, once}])\` before accepting the next packet.

## Deep Concept Breakdown & Under the Hood

### The Four Socket Active Modes
1. **\`{active, false}\` (Passive Mode)**:
   - The process must manually call \`gen_tcp:recv(Socket, Length, Timeout)\`.
   - Highest control, but completely blocks the calling process while waiting for network input, preventing it from handling supervisor messages or timers.
2. **\`{active, true}\` (Full Active Mode — DANGEROUS)**:
   - Every packet is converted into \`{tcp, Socket, Binary}\` and sent to the controlling process.
   - Zero flow control. The process has no way to say "stop sending, I am busy".
3. **\`{active, once}\` (Flow-Controlled Active Mode — Production Standard)**:
   - Delivers **exactly one** \`{tcp, Socket, Binary}\` message to your process mailbox.
   - The socket **automatically reverts to \`{active, false}\`** immediately after delivering that single message.
   - Any further packets sent by the client stay queued in the operating system's kernel TCP buffer. When the kernel buffer fills up, TCP window scaling kicks in and **physically slows down the client's network card**!
   - Once your process finishes handling the current frame, it re-arms the socket:
     \`\`\`erlang
     ok = inet:setopts(Socket, [{active, once}])
     \`\`\`
4. **\`{active, N}\` (Burst Active Mode)**:
   - Delivers \`N\` messages before flipping to passive and sending a \`{tcp_passive, Socket}\` notification.

> [!warning] Production Networking Trap: The Mailbox OOM Tsunami
> Under network jitter or traffic spikes, an active socket actor that takes 10ms to insert into a database will fall behind a client sending a packet every 0.1ms. The 100x discrepancy accumulates in the process mailbox. In production, **never use \`{active, true}\` on untrusted external network sockets**.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (kernel / inet)
inet:setopts(Socket, Options) -> ok | {error, Reason}
  Types:
    Socket = inet:socket()
    Options = [inet:socket_setopt()]
    %% Options can include: [{active, once}], [{active, true}], [{active, false}], [{active, N}]

%% Incoming Socket Messages Delivered to Mailbox
{tcp, Socket, Data}          %% Arrives when socket is active and bytes are read
{tcp_closed, Socket}        %% Arrives when remote peer disconnects
{tcp_error, Socket, Reason} %% Arrives on network fault
\`\`\`

## Parallel Worked Example

Here is a supervised connection worker applying bounded \`{active, once}\` backpressure:

\`\`\`erlang
-module(echo_backpressure_worker).
-behaviour(gen_server).
-export([init/1, handle_info/2, terminate/2]).

init([Socket]) ->
    ok = inet:setopts(Socket, [binary, {active, once}]),
    {ok, #{socket => Socket, count => 0}}.

handle_info({tcp, Socket, Data}, #{socket := Socket, count := Count} = State) ->
    ok = gen_tcp:send(Socket, <<"+ECHO: ", Data/binary>>),
    %% CRITICAL: Re-arm active once AFTER processing
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#{count => Count + 1}};
handle_info({tcp_closed, _Socket}, State) ->
    {stop, normal, State}.

terminate(_Reason, #{socket := Socket}) ->
    catch gen_tcp:close(Socket),
    ok.
\`\`\`

## Assignment Specification

Implement module \`src/tcp_flow_worker.erl\` as a supervised \`gen_server\` that accepts a raw client socket, manages it in \`{active, once}\` mode, and applies strict backpressure:

1. **\`start_link(Socket)\`**:
   - Starts and links the \`gen_server\`.
   - In \`init/1\`, stores \`Socket\` and arms the socket with \`inet:setopts(Socket, [binary, {active, once}])\`.
2. **\`handle_info({tcp, Socket, Data}, State)\`**:
   - Sends back an echo response: \`gen_tcp:send(Socket, <<"+ACK: ", Data/binary>>)\`.
   - Increments packets and bytes processed counters.
   - **Crucial**: Calls \`ok = inet:setopts(Socket, [{active, once}])\` before returning \`{noreply, NewState}\`.
3. **\`handle_info({tcp_closed, Socket}, State)\`**:
   - Marks \`closed => true\` in state.
4. **\`handle_call(get_stats, _From, State)\`**:
   - Returns \`#{packets_processed => Packets, bytes_processed => Bytes, closed => Closed}\`.
5. **\`get_stats(Server)\` & \`get_processed_count(Server)\`**:
   - Synchronous helpers to inspect worker state.
6. **\`start_server/0\` & \`stop_server/1\`**:
   - Helper functions to start a listening server on port \`0\`, accept one client, register \`tcp_flow_worker\`, and tear down cleanly.

## Rules & Verification Constraints
- Verified by **\`bf_backpressure_tester:verify_active_once_backpressure/5\`**, which blasts 50 frames into your socket and asserts that your process mailbox queue length **never exceeds 5**!
- AST verifier enforces required calls: \`inet:setopts/2\` and \`gen_tcp:send/2\`.
    `,
    otpDocCards: [
      {
        functionName: 'setopts',
        module: 'inet',
        signature: 'inet:setopts(Socket, Options) -> ok | {error, Reason}',
        typesSpec: [
          'Socket = inet:socket()',
          'Options = [inet:socket_setopt()]'
        ],
        description: 'Sets socket options such as active modes, nodelay, or buffer sizes.',
        complexityNote: 'Modifies OS kernel socket options via ioctl/setsockopt syscalls.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/inet.html#setopts/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/inet.erl'
      },
      {
        functionName: 'send',
        module: 'gen_tcp',
        signature: 'gen_tcp:send(Socket, Packet) -> ok | {error, Reason}',
        typesSpec: [
          'Socket = gen_tcp:socket()',
          'Packet = iodata()'
        ],
        description: 'Sends packet over connected socket descriptor.',
        complexityNote: 'Direct synchronous write to OS socket send buffer.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#send/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      }
    ],
    starterCode: `-module(tcp_flow_worker).
-behaviour(gen_server).

-export([start_link/1, get_stats/1, get_processed_count/1, stop/1, start_server/0, stop_server/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-record(state, {
    socket :: gen_tcp:socket() | undefined,
    packets_processed = 0 :: non_neg_integer(),
    bytes_processed = 0 :: non_neg_integer(),
    closed = false :: boolean()
}).

-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

start_server() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    ListenPid = spawn_link(fun() ->
        case gen_tcp:accept(ListenSocket) of
            {ok, ClientSocket} ->
                {ok, WorkerPid} = start_link(ClientSocket),
                try register(tcp_flow_worker, WorkerPid) catch _:_ -> ok end,
                ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
                WorkerPid ! {socket_assigned, ClientSocket},
                Parent ! {worker_ready, WorkerPid};
            _ -> ok
        end
    end),
    {ok, ListenPid, Port}.

stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

init([Socket]) ->
    %% % TODO: Arm the socket for its initial packet using inet:setopts/2 with binary and {active, once}.
    %% % Initialize the state record with the socket, 0 packets_processed, 0 bytes_processed, and closed = false.
    {ok, #state{socket = Socket}};
init(Socket) ->
    init([Socket]).

handle_call(get_stats, _From, State) ->
    Reply = #{
        packets_processed => State#state.packets_processed,
        bytes_processed => State#state.bytes_processed,
        closed => State#state.closed
    },
    {reply, Reply, State};
handle_call(get_processed_count, _From, State) ->
    {reply, State#state.packets_processed, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({socket_assigned, Socket}, State) ->
    %% % TODO: Arm the socket with {active, once} now that this process is the controlling process.
    {noreply, State#state{socket = Socket}};
handle_info({tcp, _Socket, _DataBin}, State) ->
    %% % TODO:
    %% % 1. Echo the received binary back to the client prefixed with "+ACK: " via gen_tcp:send/2.
    %% % 2. Crucial: Re-arm the socket with {active, once} via inet:setopts/2 so the next packet can be delivered.
    %% % 3. Increment packets_processed by 1 and bytes_processed by byte_size(DataBin).
    %% % 4. Return {noreply, UpdatedState}.
    {noreply, State};
handle_info({tcp_closed, _Socket}, State) ->
    %% % TODO: Handle client disconnect by updating state with closed = true.
    {noreply, State#state{closed = true}};
handle_info({tcp_error, _Socket, _Reason}, State) ->
    {noreply, State#state{closed = true}};
handle_info(_Other, State) ->
    {noreply, State}.

terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
    `,
    solutionCode: `-module(tcp_flow_worker).
-behaviour(gen_server).

-export([start_link/1, get_stats/1, get_processed_count/1, stop/1, start_server/0, stop_server/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-record(state, {
    socket :: gen_tcp:socket() | undefined,
    packets_processed = 0 :: non_neg_integer(),
    bytes_processed = 0 :: non_neg_integer(),
    closed = false :: boolean()
}).

-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

start_server() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    ListenPid = spawn_link(fun() ->
        case gen_tcp:accept(ListenSocket) of
            {ok, ClientSocket} ->
                {ok, WorkerPid} = start_link(ClientSocket),
                try register(tcp_flow_worker, WorkerPid) catch _:_ -> ok end,
                ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
                WorkerPid ! {socket_assigned, ClientSocket},
                Parent ! {worker_ready, WorkerPid};
            _ -> ok
        end
    end),
    {ok, ListenPid, Port}.

stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

init([Socket]) ->
    ok = inet:setopts(Socket, [binary, {active, once}]),
    {ok, #state{socket = Socket, packets_processed = 0, bytes_processed = 0, closed = false}};
init(Socket) ->
    init([Socket]).

handle_call(get_stats, _From, State) ->
    Reply = #{
        packets_processed => State#state.packets_processed,
        bytes_processed => State#state.bytes_processed,
        closed => State#state.closed
    },
    {reply, Reply, State};
handle_call(get_processed_count, _From, State) ->
    {reply, State#state.packets_processed, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({socket_assigned, Socket}, State) ->
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#state{socket = Socket}};
handle_info({tcp, Socket, DataBin}, State) ->
    ok = gen_tcp:send(Socket, <<"+ACK: ", DataBin/binary>>),
    ok = inet:setopts(Socket, [{active, once}]),
    NewPackets = State#state.packets_processed + 1,
    NewBytes = State#state.bytes_processed + byte_size(DataBin),
    {noreply, State#state{packets_processed = NewPackets, bytes_processed = NewBytes}};
handle_info({tcp_closed, _Socket}, State) ->
    {noreply, State#state{closed = true}};
handle_info({tcp_error, _Socket, _Reason}, State) ->
    {noreply, State#state{closed = true}};
handle_info(_Other, State) ->
    {noreply, State}.

terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
    `,
        files: [
      {
        name: 'tcp_flow_worker.erl',
        path: 'src/tcp_flow_worker.erl',
        content: `-module(tcp_flow_worker).
-behaviour(gen_server).

-export([start_link/1, get_stats/1, get_processed_count/1, stop/1, start_server/0, stop_server/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-record(state, {
    socket :: gen_tcp:socket() | undefined,
    packets_processed = 0 :: non_neg_integer(),
    bytes_processed = 0 :: non_neg_integer(),
    closed = false :: boolean()
}).

-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

start_server() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    ListenPid = spawn_link(fun() ->
        case gen_tcp:accept(ListenSocket) of
            {ok, ClientSocket} ->
                {ok, WorkerPid} = start_link(ClientSocket),
                try register(tcp_flow_worker, WorkerPid) catch _:_ -> ok end,
                ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
                WorkerPid ! {socket_assigned, ClientSocket},
                Parent ! {worker_ready, WorkerPid};
            _ -> ok
        end
    end),
    {ok, ListenPid, Port}.

stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

init([Socket]) ->
    %% % TODO: Arm the socket for its initial packet using inet:setopts/2 with binary and {active, once}.
    %% % Initialize the state record with the socket, 0 packets_processed, 0 bytes_processed, and closed = false.
    {ok, #state{socket = Socket}};
init(Socket) ->
    init([Socket]).

handle_call(get_stats, _From, State) ->
    Reply = #{
        packets_processed => State#state.packets_processed,
        bytes_processed => State#state.bytes_processed,
        closed => State#state.closed
    },
    {reply, Reply, State};
handle_call(get_processed_count, _From, State) ->
    {reply, State#state.packets_processed, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({socket_assigned, Socket}, State) ->
    %% % TODO: Arm the socket with {active, once} now that this process is the controlling process.
    {noreply, State#state{socket = Socket}};
handle_info({tcp, _Socket, _DataBin}, State) ->
    %% % TODO:
    %% % 1. Echo the received binary back to the client prefixed with "+ACK: " via gen_tcp:send/2.
    %% % 2. Crucial: Re-arm the socket with {active, once} via inet:setopts/2 so the next packet can be delivered.
    %% % 3. Increment packets_processed by 1 and bytes_processed by byte_size(DataBin).
    %% % 4. Return {noreply, UpdatedState}.
    {noreply, State};
handle_info({tcp_closed, _Socket}, State) ->
    %% % TODO: Handle client disconnect by updating state with closed = true.
    {noreply, State#state{closed = true}};
handle_info({tcp_error, _Socket, _Reason}, State) ->
    {noreply, State#state{closed = true}};
handle_info(_Other, State) ->
    {noreply, State}.

terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
    `,
      },
    ],
    solutionFiles: {
      'src/tcp_flow_worker.erl': `-module(tcp_flow_worker).
-behaviour(gen_server).

-export([start_link/1, get_stats/1, get_processed_count/1, stop/1, start_server/0, stop_server/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-record(state, {
    socket :: gen_tcp:socket() | undefined,
    packets_processed = 0 :: non_neg_integer(),
    bytes_processed = 0 :: non_neg_integer(),
    closed = false :: boolean()
}).

-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

start_server() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    ListenPid = spawn_link(fun() ->
        case gen_tcp:accept(ListenSocket) of
            {ok, ClientSocket} ->
                {ok, WorkerPid} = start_link(ClientSocket),
                try register(tcp_flow_worker, WorkerPid) catch _:_ -> ok end,
                ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
                WorkerPid ! {socket_assigned, ClientSocket},
                Parent ! {worker_ready, WorkerPid};
            _ -> ok
        end
    end),
    {ok, ListenPid, Port}.

stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

init([Socket]) ->
    ok = inet:setopts(Socket, [binary, {active, once}]),
    {ok, #state{socket = Socket, packets_processed = 0, bytes_processed = 0, closed = false}};
init(Socket) ->
    init([Socket]).

handle_call(get_stats, _From, State) ->
    Reply = #{
        packets_processed => State#state.packets_processed,
        bytes_processed => State#state.bytes_processed,
        closed => State#state.closed
    },
    {reply, Reply, State};
handle_call(get_processed_count, _From, State) ->
    {reply, State#state.packets_processed, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({socket_assigned, Socket}, State) ->
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#state{socket = Socket}};
handle_info({tcp, Socket, DataBin}, State) ->
    ok = gen_tcp:send(Socket, <<"+ACK: ", DataBin/binary>>),
    ok = inet:setopts(Socket, [{active, once}]),
    NewPackets = State#state.packets_processed + 1,
    NewBytes = State#state.bytes_processed + byte_size(DataBin),
    {noreply, State#state{packets_processed = NewPackets, bytes_processed = NewBytes}};
handle_info({tcp_closed, _Socket}, State) ->
    {noreply, State#state{closed = true}};
handle_info({tcp_error, _Socket, _Reason}, State) ->
    {noreply, State#state{closed = true}};
handle_info(_Other, State) ->
    {noreply, State}.

terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
    `,
    },
solutionExplanation: `### Solution Breakdown: Bounded Flow Control Worker
1. **Initial Arming**: In \\\`init/1\\\`, \\\`inet:setopts(Socket, [binary, {active, once}])\\\` tells the kernel to deliver exactly one incoming frame before pausing.
2. **Backpressure Re-arming**: In \\\`handle_info({tcp, ...})\\\`, after transmitting the echo response, we explicitly re-arm active reception with \\\`inet:setopts(Socket, [{active, once}])\\\`. If the worker is delayed, packets stay safely in the OS kernel receive buffer, triggering TCP window scaling to throttle the sender.
3. **State Telemetry**: We maintain running tallies of packets and bytes processed, updating them monotonically with zero race conditions.`,
    visibleTestCases: [
      {
        id: 'tc-ch10-l03-1',
        title: 'Start Server and Exchange Flow-Controlled Packet',
        erlangCall: 'begin {ok, ListenPid, Port} = tcp_flow_worker:start_server(), {ok, S} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000), ok = gen_tcp:send(S, <<"TEST_PING\\r\\n">>), {ok, Rep} = gen_tcp:recv(S, 0, 2000), gen_tcp:close(S), tcp_flow_worker:stop_server(ListenPid), Rep end',
        expectedOutput: '<<"+ACK: TEST_PING\\r\\n">>',
        explanation: 'Verifies server startup, client connection, and bounded echo reply.',
      },
    ],
    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['inet:setopts/2', 'gen_tcp:send/2'],
      requiredConstructs: ['record_def'],
    },
    references: [
      {
        title: 'Learn You Some Erlang: Buckets of Sockets',
        url: 'https://learnyousomeerlang.com/buckets-of-sockets',
        category: 'book_rfc',
        description: 'Comprehensive pedagogical guide to socket programming in Erlang.',
      },
      {
        title: 'Erlang in Anger: Chapter 5 - Overload & Backpressure',
        url: 'https://www.erlanginanger.com/',
        category: 'book_rfc',
        description: 'Real-world guide to diagnosing mailbox floods and configuring active-once sockets.',
      },
    ],
  },

  // ── Lesson 10.4: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch10-l04',
    chapterNumber: 10,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Custom Stream Framing: Reconstructing Fragmented & Coalesced Raw TCP Byte Streams',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'When splitting an accumulated binary stream on "\\r\\n", why is calling binary:copy/1 on the remaining buffer essential for long-lived processes?',
      codeSnippet: `case binary:split(Buffer, <<"\\r\\n">>) of
    [Line, Rest] -> extract_lines(Rest, [binary:copy(Line) | Acc]);
    [Incomplete] -> {lists:reverse(Acc), binary:copy(Incomplete)}
end`,
      options: [
        {
          id: 'A',
          label: 'In Erlang, binary:split/2 creates sub-binaries that retain a reference to the entire original buffer. If that buffer was a 64KB ProcBin, omitting binary:copy/1 prevents the 64KB off-heap chunk from being garbage collected.',
          isCorrect: true,
          explanation: 'Precisely! A sub-binary is only a 24-byte pointer to an off-heap ProcBin. Without binary:copy/1, keeping even 3 bytes of remainder pins the entire 64KB socket chunk in memory, causing massive memory leaks across thousands of connections.',
        },
        {
          id: 'B',
          label: 'binary:copy/1 reverses the endianness of the bytes to big-endian.',
          isCorrect: false,
          explanation: 'binary:copy/1 performs a deep byte copy; it has nothing to do with byte order.',
        },
        {
          id: 'C',
          label: 'The BEAM VM will crash if a binary is passed between processes without being copied.',
          isCorrect: false,
          explanation: 'The BEAM seamlessly passes binaries across processes; binary:copy/1 is purely a memory-retention optimization.',
        },
      ],
    },
    conceptMarkdown: `## Why This Matters in Production

TCP is an **unframed stream of bytes**. The operating system makes zero guarantees that each \`gen_tcp:send/2\` call on the client will correspond to exactly one \`{tcp, Socket, Data}\` message on the server!

In production backends (HTTP/1.1, Redis RESP, and XMPP XML stream parsers), your server must handle two inevitable physical networking realities:
1. **Packet Fragmentation**: A client sends \`"SET user alice\\r\\n"\`, but the network splits it across MTU boundaries. The server receives Chunk 1 \`<<"SET us">>\` followed 10ms later by Chunk 2 \`<<"er alice\\r\\n">>\`.
2. **Packet Coalescing (Nagle's Algorithm)**: Two separate commands sent back-to-back by a client arrive glued together in a single TCP read: \`<<"PING\\r\\nPING\\r\\nPING\\r\\n">>\`.

To build a reliable network server, you cannot assume incoming packets contain complete lines. You must maintain a **stateful binary accumulation buffer** that stitches chunks together and slices complete frames.

> [!abstract] Stream Framing Algorithm:
> 1. **Concatenation**: \`<<OldBuffer/binary, IncomingChunk/binary>>\` stitches chunks together at binary speed.
> 2. **Delimiter Slicing**: \`binary:split(Combined, <<"\\r\\n">>)\` extracts complete lines.
> 3. **Memory Unpinning**: Call **\`binary:copy/1\`** on all extracted lines and trailing partial buffers to prevent 64 KB \`ProcBin\` memory retention leaks!

## Deep Concept Breakdown & Under the Hood

### The 64 KB \`ProcBin\` Memory Pinning Trap
Recall from Chapter 4 how the BEAM manages binaries:
- Binaries $=< 64$ bytes are stored on the local process heap.
- Binaries $> 64$ bytes are allocated in a shared off-heap reference-counted memory pool called a **\`ProcBin\`** (often 64 KB socket read buffers).

When you call \`binary:split/2\`, the BEAM creates a **sub-binary**—a tiny 24-byte struct containing an offset pointer into the original 64 KB off-heap buffer.
If a client sends \`<<"PING\\r\\nHE">>\`, you slice out \`<<"PING">>\`, leaving \`<<"HE">>\` in your process state.
Even though \`<<"HE">>\` is only 2 bytes, it retains a reference count on the **entire 64 KB socket buffer**!
If 100,000 idle client connections each retain a 2-byte remainder without unpinning, your server wastes **6.4 Gigabytes of RAM** on empty socket buffers!

Calling **\`binary:copy/1\`** creates a fresh, independent heap binary, releasing the 64 KB \`ProcBin\` for immediate garbage collection!

> [!warning] Production Networking Trap: Sub-Binary Memory Pinning in Long-Lived Sockets
> Long-lived connection actors (XMPP, WebSockets, gRPC) that buffer partial frames without calling \`binary:copy/1\` suffer from slow, fatal memory creep. The memory leak does not show up in garbage collection telemetry because the off-heap refc buffer is legitimately referenced by the 2-byte sub-binary! Always call \`binary:copy/1\` on partial stream buffers.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / binary)
binary:split(Subject, Pattern) -> [binary()]
  Types:
    Subject = binary()
    Pattern = binary() | [binary()]

binary:copy(Subject) -> binary()
  Types:
    Subject = binary()
  %% Allocates a fresh unpinned binary copy
\`\`\`

## Parallel Worked Example

Here is a framing engine extracting colon-delimited telemetry metrics:

\`\`\`erlang
-module(metric_stream_framer).
-export([extract_metrics/2]).

extract_metrics(OldBuffer, NewChunk) ->
    Combined = <<OldBuffer/binary, NewChunk/binary>>,
    extract_loop(Combined, []).

extract_loop(Buffer, Acc) ->
    case binary:split(Buffer, <<":">>) of
        [Metric, Rest] ->
            %% Unpin each metric token
            extract_loop(Rest, [binary:copy(Metric) | Acc]);
        [Incomplete] ->
            %% Unpin the trailing remainder buffer!
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
\`\`\`

## Assignment Specification

Implement module \`src/tcp_frame_buffer.erl\` exporting two framing functions:

1. **\`new_buffer() -> binary()\`**:
   - Returns an empty binary accumulator \`<<>>\`.
2. **\`append_and_extract_lines(OldBufferBin, IncomingChunkBin) -> {[binary()], binary()}\`**:
   - Concatenates \`<<OldBufferBin/binary, IncomingChunkBin/binary>>\`.
   - Recursively splits on \`<<"\\r\\n">>\`.
   - Returns a tuple \`{CompleteLinesList, RemainingBufferBin}\`.
   - **Crucial Rule**: Every binary in \`CompleteLinesList\` and \`RemainingBufferBin\` MUST be unpinned using \`binary:copy/1\`.

## Rules & Verification Constraints
- Handles empty chunks, partial fragments without newlines, and coalesced multi-line bursts.
- AST verifier checks required calls: \`binary:split/2\` and \`binary:copy/1\`.
    `,
    otpDocCards: [
      {
        functionName: 'split',
        module: 'binary',
        signature: 'binary:split(Subject, Pattern) -> [binary()]',
        typesSpec: [
          'Subject = binary()',
          'Pattern = binary() | [binary()]'
        ],
        description: 'Splits Subject into sub-binaries based on the first occurrence of Pattern.',
        complexityNote: 'O(N) search with sub-binary slice allocation.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#split/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl'
      },
      {
        functionName: 'copy',
        module: 'binary',
        signature: 'binary:copy(Subject) -> binary()',
        typesSpec: [
          'Subject = binary()'
        ],
        description: 'Creates a deep copy of Subject, unpinning it from underlying ProcBin memory.',
        complexityNote: 'Allocates independent memory chunk in O(N) time.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#copy/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl'
      }
    ],
    starterCode: `-module(tcp_frame_buffer).

-export([
    new_buffer/0,
    append_and_extract_lines/2
]).

%% @doc Returns an empty binary buffer.
-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

%% @doc Concatenates OldBuffer with IncomingChunk, extracts all complete \\r\\n lines,
%% and returns {CompleteLinesList, RemainingBufferBin} with binary:copy/1 unpinning.
-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(_OldBufferBin, _IncomingChunkBin) ->
    %% % TODO:
    %% % 1. Stitch OldBufferBin and IncomingChunkBin together using binary concatenation (<<...>>).
    %% % 2. Recursively split the combined buffer on delimiter <<"\\r\\n">> using binary:split/2.
    %% % 3. Call binary:copy/1 on each extracted complete line to unpin it from the socket ProcBin buffer.
    %% % 4. Call binary:copy/1 on the remaining trailing partial buffer.
    %% % 5. Return {CompleteLinesList, RemainingBufferBin}.
    ignore.
    `,
    solutionCode: `-module(tcp_frame_buffer).

-export([
    new_buffer/0,
    append_and_extract_lines/2
]).

-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(OldBufferBin, IncomingChunkBin) ->
    Combined = <<OldBufferBin/binary, IncomingChunkBin/binary>>,
    extract_lines(Combined, []).

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
    `,
        files: [
      {
        name: 'tcp_frame_buffer.erl',
        path: 'src/tcp_frame_buffer.erl',
        content: `-module(tcp_frame_buffer).

-export([
    new_buffer/0,
    append_and_extract_lines/2
]).

%% @doc Returns an empty binary buffer.
-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

%% @doc Concatenates OldBuffer with IncomingChunk, extracts all complete \\r\\n lines,
%% and returns {CompleteLinesList, RemainingBufferBin} with binary:copy/1 unpinning.
-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(_OldBufferBin, _IncomingChunkBin) ->
    %% % TODO:
    %% % 1. Stitch OldBufferBin and IncomingChunkBin together using binary concatenation (<<...>>).
    %% % 2. Recursively split the combined buffer on delimiter <<"\\r\\n">> using binary:split/2.
    %% % 3. Call binary:copy/1 on each extracted complete line to unpin it from the socket ProcBin buffer.
    %% % 4. Call binary:copy/1 on the remaining trailing partial buffer.
    %% % 5. Return {CompleteLinesList, RemainingBufferBin}.
    ignore.
    `,
      },
    ],
    solutionFiles: {
      'src/tcp_frame_buffer.erl': `-module(tcp_frame_buffer).

-export([
    new_buffer/0,
    append_and_extract_lines/2
]).

-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(OldBufferBin, IncomingChunkBin) ->
    Combined = <<OldBufferBin/binary, IncomingChunkBin/binary>>,
    extract_lines(Combined, []).

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
    `,
    },
solutionExplanation: `### Solution Breakdown: Zero-Leak Stream Framing
1. **Binary Concatenation**: \`<<OldBufferBin/binary, IncomingChunkBin/binary>>\` stitches incoming network slices without intermediary string conversion.
2. **Recursive Splitting**: \`binary:split(Buffer, <<"\\r\\n">>)\` strips the CRLF delimiter and isolates the first complete line.
3. **Memory Unpinning via \`binary:copy/1\`**: Both the extracted line tokens and the remaining partial slice are copied into independent binaries, guaranteeing that long-lived process heaps never retain references to temporary 64 KB socket buffers.`,
    visibleTestCases: [
      {
        id: 'tc-ch10-l04-1',
        title: 'Buffer Incomplete TCP Fragment',
        erlangCall: 'tcp_frame_buffer:append_and_extract_lines(<<>>, <<"HELLO\\r\\nWOR">>)',
        expectedOutput: '{[<<"HELLO">>],<<"WOR">>}',
        explanation: 'Extracts single complete line "HELLO" and leaves partial fragment "WOR" in remainder.',
      },
      {
        id: 'tc-ch10-l04-2',
        title: 'Complete Fragment and Extract Coalesced Burst',
        erlangCall: 'tcp_frame_buffer:append_and_extract_lines(<<"WOR">>, <<"LD\\r\\nFOO\\r\\nBAR\\r\\n">>)',
        expectedOutput: '{[<<"WORLD">>,<<"FOO">>,<<"BAR">>],<<>>}',
        explanation: 'Completes "WORLD" and extracts coalesced "FOO" and "BAR" lines with zero remainder.',
      },
    ],
    astRules: {
      requireTailRecursion: ['extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['binary:split/2', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax'],
    },
    references: [
      {
        title: 'Official Erlang stdlib: binary Module Reference',
        url: 'https://www.erlang.org/doc/apps/stdlib/binary.html',
        category: 'erlang_docs',
        description: 'Functions for bit-level pattern matching and zero-copy binary transformations.',
      },
    ],
  },

  // ── Lesson 10.5: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch10-l05',
    chapterNumber: 10,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Building a Ranch-Style Concurrent Acceptor Pool & gen_tcp:controlling_process/2 Handoff',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'Why must the ListenSocket be opened in passive mode ({active, false}) when using an acceptor pool with connection workers?',
      codeSnippet: `ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
{ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts).`,
      options: [
        {
          id: 'A',
          label: 'If the socket were active, incoming client data would arrive in the acceptor process\'s mailbox before gen_tcp:controlling_process/2 finishes transferring ownership to the newly spawned worker.',
          isCorrect: true,
          explanation: 'Precisely! By keeping the socket in passive mode during handshake and handoff, incoming data waits safely in OS kernel buffers until the worker is spawned, takes ownership, and explicitly arms {active, once}.',
        },
        {
          id: 'B',
          label: 'Passive mode is required by the Linux kernel to support multiple CPU cores.',
          isCorrect: false,
          explanation: 'Linux supports active sockets across all cores; the passive requirement is an Erlang concurrency handoff invariant.',
        },
        {
          id: 'C',
          label: 'Active mode sockets cannot be closed by a supervisor.',
          isCorrect: false,
          explanation: 'Supervisors can close any socket descriptor regardless of active mode.',
        },
      ],
    },
    conceptMarkdown: `## Why This Matters in Production

In high-concurrency systems (like WhatsApp, Discord, or financial order matching engines), thousands of clients connect simultaneously.

If your server runs a **single acceptor process** executing:
\`\`\`erlang
accept_loop(ListenSocket) ->
    {ok, ClientSocket} = gen_tcp:accept(ListenSocket),
    handle_client(ClientSocket),  %% BOTTLENECK!
    accept_loop(ListenSocket).
\`\`\`
every incoming connection is blocked behind every other client's request!

Production-grade servers (such as Nine Nines' **Ranch**, used by the Cowboy HTTP server and MongooseIM XMPP server) solve this using the **Acceptor Pool Pattern**:
1. A master listener opens a single shared \`ListenSocket\`.
2. A pool of $N$ acceptor processes **concurrently call \`gen_tcp:accept(ListenSocket)\`** on that identical socket descriptor.
3. The BEAM VM and Linux kernel dispatch incoming TCP SYN handshakes across the pool without lock contention.
4. The instant an acceptor receives \`{ok, ClientSocket}\`, it spawns a dedicated connection worker and transfers ownership via **\`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`**, then immediately loops back to accept the next client!

> [!abstract] Ranch-Style Acceptor Pool Architecture
> - Multiple acceptor processes concurrently wait on the same shared \`ListenSocket\`.
> - When an incoming TCP handshake completes, one acceptor wakes up with \`{ok, ClientSocket}\`.
> - The acceptor spawns a dedicated connection worker, executes \`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`, and immediately loops back to accept more connections without blocking.

## Deep Concept Breakdown & Under the Hood

### What is the "Controlling Process"?
In Erlang, every socket has an owner known as the **controlling process**.
- By default, the controlling process is whichever process called \`gen_tcp:listen/2\` or \`gen_tcp:accept/1\`.
- All incoming network events (\`{tcp, Socket, Data}\`, \`{tcp_closed, Socket}\`) are delivered **exclusively** to the controlling process's mailbox.
- If the controlling process dies, the BEAM VM automatically closes the underlying socket!

To transfer a socket from an Acceptor to a Connection Worker, you MUST call:
\`\`\`erlang
ok = gen_tcp:controlling_process(ClientSocket, WorkerPid)
\`\`\`
And then notify \`WorkerPid\` that it is now safe to arm the socket with \`inet:setopts(ClientSocket, [{active, once}])\`!

### The Safe Socket Handoff Protocol
1. **Passive Listener**: The listener opens in \`{active, false}\`.
2. **Accept Handshake**: Acceptor process executes \`gen_tcp:accept(ListenSocket)\` $\\rightarrow$ \`{ok, ClientSocket}\`.
3. **Worker Spawning**: Acceptor spawns \`WorkerPid\`.
4. **Ownership Transfer**: Acceptor calls \`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`.
5. **Worker Activation**: Acceptor sends \`WorkerPid ! {socket_ready, ClientSocket}\`.
6. **Flow Control Armed**: Inside \`WorkerPid\`, it calls \`inet:setopts(ClientSocket, [{active, once}])\` to begin receiving data!

> [!warning] Production Networking Trap: Race Conditions During Socket Handoff
> If an acceptor arms \`{active, once}\` *before* calling \`gen_tcp:controlling_process/2\`, the client's initial handshake frame lands in the **acceptor's** mailbox! When ownership transfers to the worker, the initial message is lost in the acceptor, causing a protocol deadlock. Always transfer ownership before arming active mode!

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (kernel / gen_tcp)
gen_tcp:controlling_process(Socket, NewOwnerPid) -> ok | {error, Reason}
  Types:
    Socket = gen_tcp:socket()
    NewOwnerPid = pid()
\`\`\`

## Parallel Worked Example

Here is a worker handoff function transferring ownership and notifying the worker:

\`\`\`erlang
-module(connection_dispatcher).
-export([dispatch_socket/2]).

dispatch_socket(ClientSocket, WorkerPid) ->
    case gen_tcp:controlling_process(ClientSocket, WorkerPid) of
        ok ->
            WorkerPid ! {socket_ready, ClientSocket},
            ok;
        {error, Reason} ->
            gen_tcp:close(ClientSocket),
            {error, Reason}
    end.
\`\`\`

## Assignment Specification

Implement module \`src/tcp_acceptor_pool.erl\` exporting connection handoff and acceptor pool management functions:

1. **\`handoff_socket(ClientSocket, WorkerPid)\`**:
   - Calls \`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`.
   - If successful (\`ok\`), sends \`WorkerPid ! {socket_ready, ClientSocket}\` and returns \`ok\`.
   - If error (\`{error, Reason}\`), closes \`ClientSocket\` and returns \`{error, Reason}\`.
2. **\`start_pooled_server(AcceptorCount, WorkerFun)\`**:
   - Opens a listening socket on port \`0\` with \`[binary, {packet, raw}, {active, false}, {reuseaddr, true}]\`.
   - Retrieves actual port via \`inet:port/1\`.
   - Spawns \`AcceptorCount\` concurrent acceptor processes that:
     - Loop on \`gen_tcp:accept(ListenSocket)\`.
     - Spawn a worker running \`WorkerFun(Socket)\` upon receiving \`{socket_ready, Socket}\`.
     - Execute \`handoff_socket(ClientSocket, WorkerPid)\`.
   - Returns \`{ok, ListenSocket, Port, AcceptorPidsList}\`.
3. **\`stop_pooled_server(ListenSocket)\`**:
   - Closes \`ListenSocket\` with \`gen_tcp:close/1\` and returns \`ok\`.
4. (Also export \`start_pool/2\`, \`get_active_workers/1\`, and \`stop_pool/1\` for backward compatibility with automated test suites).

## Rules & Verification Constraints
- Verified by connecting 5 clients concurrently and verifying active workers and echo replies.
- AST verifier checks required calls: \`gen_tcp:controlling_process/2\`, \`gen_tcp:listen/2\`, and \`gen_tcp:accept/1\`.
    `,
    otpDocCards: [
      {
        functionName: 'controlling_process',
        module: 'gen_tcp',
        signature: 'gen_tcp:controlling_process(Socket, Pid) -> ok | {error, Reason}',
        typesSpec: [
          'Socket = gen_tcp:socket()',
          'Pid = pid()'
        ],
        description: 'Assigns a new controlling process to the socket. All subsequent events are delivered to Pid.',
        complexityNote: 'Transfers port ownership in O(1) time.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#controlling_process/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      },
      {
        functionName: 'accept',
        module: 'gen_tcp',
        signature: 'gen_tcp:accept(ListenSocket) -> {ok, Socket} | {error, Reason}',
        typesSpec: [
          'ListenSocket = gen_tcp:socket()',
          'Socket = gen_tcp:socket()'
        ],
        description: 'Accepts an incoming TCP connection request on a listening socket descriptor.',
        complexityNote: 'Blocks caller until a client completes the 3-way handshake.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#accept/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      }
    ],
    starterCode: `-module(tcp_acceptor_pool).

-export([
    handoff_socket/2,
    start_pooled_server/2,
    stop_pooled_server/1,
    start_pool/2,
    get_active_workers/1,
    stop_pool/1
]).

%% @doc Transfers socket ownership to WorkerPid and sends {socket_ready, ClientSocket}.
%% If controlling_process fails, closes ClientSocket and returns {error, Reason}.
-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(_ClientSocket, _WorkerPid) ->
    %% % TODO: Transfer socket ownership to WorkerPid via gen_tcp:controlling_process/2.
    %% % On success, signal the worker process that the socket is ready and return ok.
    %% % On failure, safely close the socket and return {error, Reason}.
    ignore.

%% @doc Boots a pooled TCP server with AcceptorCount concurrent acceptors.
-spec start_pooled_server(pos_integer(), fun((gen_tcp:socket()) -> any())) ->
    {ok, gen_tcp:socket(), inet:port_number(), [pid()]}.
start_pooled_server(_AcceptorCount, _WorkerFun) ->
    %% % TODO:
    %% % 1. Bind an ephemeral listening socket on port 0 in passive raw binary mode.
    %% % 2. Query the assigned kernel port number.
    %% % 3. Spawn AcceptorCount concurrent acceptor loops that accept connections,
    %% %    spawn handlers for WorkerFun, and transfer socket ownership via handoff_socket/2.
    %% % 4. Return {ok, ListenSocket, Port, AcceptorPidsList}.
    ignore.

%% @doc Stops the pooled server by closing ListenSocket.
-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

%% Backward compatibility helpers for pool testing:
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

get_active_workers(ManagerPid) ->
    Ref = make_ref(),
    ManagerPid ! {get_worker_count, self(), Ref},
    receive {worker_count, Ref, Count} -> Count after 2000 -> 0 end.

manager_init(ListenSocket, PoolSize) ->
    ManagerPid = self(),
    Acceptors = [spawn_link(fun() -> pool_acceptor(ListenSocket, ManagerPid) end) || _ <- lists:seq(1, PoolSize)],
    manager_loop(ListenSocket, Acceptors, []).

manager_loop(ListenSocket, Acceptors, Workers) ->
    receive
        {worker_spawned, WorkerPid} -> manager_loop(ListenSocket, Acceptors, [WorkerPid | Workers]);
        {client_disconnected, WorkerPid} -> manager_loop(ListenSocket, Acceptors, lists:delete(WorkerPid, Workers));
        {get_worker_count, From, Ref} -> From ! {worker_count, Ref, length(Workers)}, manager_loop(ListenSocket, Acceptors, Workers);
        stop -> gen_tcp:close(ListenSocket), [exit(A, kill) || A <- Acceptors], [exit(W, kill) || W <- Workers], ok
    end.

pool_acceptor(ListenSocket, ManagerPid) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> pool_worker_init(ClientSocket, ManagerPid) end),
            ok = handoff_socket(ClientSocket, WorkerPid),
            ManagerPid ! {worker_spawned, WorkerPid},
            pool_acceptor(ListenSocket, ManagerPid);
        {error, _} -> ok
    end.

pool_worker_init(ClientSocket, ManagerPid) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            pool_worker_loop(ClientSocket, ManagerPid)
    after 2000 -> gen_tcp:close(ClientSocket)
    end.

pool_worker_loop(Socket, ManagerPid) ->
    receive
        {tcp, Socket, Data} ->
            ok = gen_tcp:send(Socket, <<"+REPLY: ", Data/binary>>),
            ok = inet:setopts(Socket, [{active, once}]),
            pool_worker_loop(Socket, ManagerPid);
        {tcp_closed, Socket} -> ManagerPid ! {client_disconnected, self()}, ok;
        {tcp_error, Socket, _Reason} -> ManagerPid ! {client_disconnected, self()}, ok
    end.
    `,
    solutionCode: `-module(tcp_acceptor_pool).

-export([
    handoff_socket/2,
    start_pooled_server/2,
    stop_pooled_server/1,
    start_pool/2,
    get_active_workers/1,
    stop_pool/1
]).

-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(ClientSocket, WorkerPid) ->
    case gen_tcp:controlling_process(ClientSocket, WorkerPid) of
        ok ->
            WorkerPid ! {socket_ready, ClientSocket},
            ok;
        {error, Reason} ->
            gen_tcp:close(ClientSocket),
            {error, Reason}
    end.

-spec start_pooled_server(pos_integer(), fun((gen_tcp:socket()) -> any())) ->
    {ok, gen_tcp:socket(), inet:port_number(), [pid()]}.
start_pooled_server(AcceptorCount, WorkerFun) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    AcceptorPids = [
        spawn_link(fun() -> acceptor_worker_loop(ListenSocket, WorkerFun) end)
        || _ <- lists:seq(1, AcceptorCount)
    ],
    {ok, ListenSocket, Port, AcceptorPids}.

acceptor_worker_loop(ListenSocket, WorkerFun) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() ->
                receive
                    {socket_ready, S} ->
                        WorkerFun(S)
                after 3000 ->
                    gen_tcp:close(ClientSocket)
                end
            end),
            _ = handoff_socket(ClientSocket, WorkerPid),
            acceptor_worker_loop(ListenSocket, WorkerFun);
        {error, _} ->
            ok
    end.

-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

get_active_workers(ManagerPid) ->
    Ref = make_ref(),
    ManagerPid ! {get_worker_count, self(), Ref},
    receive {worker_count, Ref, Count} -> Count after 2000 -> 0 end.

manager_init(ListenSocket, PoolSize) ->
    ManagerPid = self(),
    Acceptors = [spawn_link(fun() -> pool_acceptor(ListenSocket, ManagerPid) end) || _ <- lists:seq(1, PoolSize)],
    manager_loop(ListenSocket, Acceptors, []).

manager_loop(ListenSocket, Acceptors, Workers) ->
    receive
        {worker_spawned, WorkerPid} -> manager_loop(ListenSocket, Acceptors, [WorkerPid | Workers]);
        {client_disconnected, WorkerPid} -> manager_loop(ListenSocket, Acceptors, lists:delete(WorkerPid, Workers));
        {get_worker_count, From, Ref} -> From ! {worker_count, Ref, length(Workers)}, manager_loop(ListenSocket, Acceptors, Workers);
        stop -> gen_tcp:close(ListenSocket), [exit(A, kill) || A <- Acceptors], [exit(W, kill) || W <- Workers], ok
    end.

pool_acceptor(ListenSocket, ManagerPid) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> pool_worker_init(ClientSocket, ManagerPid) end),
            ok = handoff_socket(ClientSocket, WorkerPid),
            ManagerPid ! {worker_spawned, WorkerPid},
            pool_acceptor(ListenSocket, ManagerPid);
        {error, _} -> ok
    end.

pool_worker_init(ClientSocket, ManagerPid) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            pool_worker_loop(ClientSocket, ManagerPid)
    after 2000 -> gen_tcp:close(ClientSocket)
    end.

pool_worker_loop(Socket, ManagerPid) ->
    receive
        {tcp, Socket, Data} ->
            ok = gen_tcp:send(Socket, <<"+REPLY: ", Data/binary>>),
            ok = inet:setopts(Socket, [{active, once}]),
            pool_worker_loop(Socket, ManagerPid);
        {tcp_closed, Socket} -> ManagerPid ! {client_disconnected, self()}, ok;
        {tcp_error, Socket, _Reason} -> ManagerPid ! {client_disconnected, self()}, ok
    end.
    `,
        files: [
      {
        name: 'tcp_acceptor_pool.erl',
        path: 'src/tcp_acceptor_pool.erl',
        content: `-module(tcp_acceptor_pool).

-export([
    handoff_socket/2,
    start_pooled_server/2,
    stop_pooled_server/1,
    start_pool/2,
    get_active_workers/1,
    stop_pool/1
]).

%% @doc Transfers socket ownership to WorkerPid and sends {socket_ready, ClientSocket}.
%% If controlling_process fails, closes ClientSocket and returns {error, Reason}.
-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(_ClientSocket, _WorkerPid) ->
    %% % TODO: Transfer socket ownership to WorkerPid via gen_tcp:controlling_process/2.
    %% % On success, signal the worker process that the socket is ready and return ok.
    %% % On failure, safely close the socket and return {error, Reason}.
    ignore.

%% @doc Boots a pooled TCP server with AcceptorCount concurrent acceptors.
-spec start_pooled_server(pos_integer(), fun((gen_tcp:socket()) -> any())) ->
    {ok, gen_tcp:socket(), inet:port_number(), [pid()]}.
start_pooled_server(_AcceptorCount, _WorkerFun) ->
    %% % TODO:
    %% % 1. Bind an ephemeral listening socket on port 0 in passive raw binary mode.
    %% % 2. Query the assigned kernel port number.
    %% % 3. Spawn AcceptorCount concurrent acceptor loops that accept connections,
    %% %    spawn handlers for WorkerFun, and transfer socket ownership via handoff_socket/2.
    %% % 4. Return {ok, ListenSocket, Port, AcceptorPidsList}.
    ignore.

%% @doc Stops the pooled server by closing ListenSocket.
-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

%% Backward compatibility helpers for pool testing:
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

get_active_workers(ManagerPid) ->
    Ref = make_ref(),
    ManagerPid ! {get_worker_count, self(), Ref},
    receive {worker_count, Ref, Count} -> Count after 2000 -> 0 end.

manager_init(ListenSocket, PoolSize) ->
    ManagerPid = self(),
    Acceptors = [spawn_link(fun() -> pool_acceptor(ListenSocket, ManagerPid) end) || _ <- lists:seq(1, PoolSize)],
    manager_loop(ListenSocket, Acceptors, []).

manager_loop(ListenSocket, Acceptors, Workers) ->
    receive
        {worker_spawned, WorkerPid} -> manager_loop(ListenSocket, Acceptors, [WorkerPid | Workers]);
        {client_disconnected, WorkerPid} -> manager_loop(ListenSocket, Acceptors, lists:delete(WorkerPid, Workers));
        {get_worker_count, From, Ref} -> From ! {worker_count, Ref, length(Workers)}, manager_loop(ListenSocket, Acceptors, Workers);
        stop -> gen_tcp:close(ListenSocket), [exit(A, kill) || A <- Acceptors], [exit(W, kill) || W <- Workers], ok
    end.

pool_acceptor(ListenSocket, ManagerPid) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> pool_worker_init(ClientSocket, ManagerPid) end),
            ok = handoff_socket(ClientSocket, WorkerPid),
            ManagerPid ! {worker_spawned, WorkerPid},
            pool_acceptor(ListenSocket, ManagerPid);
        {error, _} -> ok
    end.

pool_worker_init(ClientSocket, ManagerPid) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            pool_worker_loop(ClientSocket, ManagerPid)
    after 2000 -> gen_tcp:close(ClientSocket)
    end.

pool_worker_loop(Socket, ManagerPid) ->
    receive
        {tcp, Socket, Data} ->
            ok = gen_tcp:send(Socket, <<"+REPLY: ", Data/binary>>),
            ok = inet:setopts(Socket, [{active, once}]),
            pool_worker_loop(Socket, ManagerPid);
        {tcp_closed, Socket} -> ManagerPid ! {client_disconnected, self()}, ok;
        {tcp_error, Socket, _Reason} -> ManagerPid ! {client_disconnected, self()}, ok
    end.
    `,
      },
    ],
    solutionFiles: {
      'src/tcp_acceptor_pool.erl': `-module(tcp_acceptor_pool).

-export([
    handoff_socket/2,
    start_pooled_server/2,
    stop_pooled_server/1,
    start_pool/2,
    get_active_workers/1,
    stop_pool/1
]).

-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(ClientSocket, WorkerPid) ->
    case gen_tcp:controlling_process(ClientSocket, WorkerPid) of
        ok ->
            WorkerPid ! {socket_ready, ClientSocket},
            ok;
        {error, Reason} ->
            gen_tcp:close(ClientSocket),
            {error, Reason}
    end.

-spec start_pooled_server(pos_integer(), fun((gen_tcp:socket()) -> any())) ->
    {ok, gen_tcp:socket(), inet:port_number(), [pid()]}.
start_pooled_server(AcceptorCount, WorkerFun) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    AcceptorPids = [
        spawn_link(fun() -> acceptor_worker_loop(ListenSocket, WorkerFun) end)
        || _ <- lists:seq(1, AcceptorCount)
    ],
    {ok, ListenSocket, Port, AcceptorPids}.

acceptor_worker_loop(ListenSocket, WorkerFun) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() ->
                receive
                    {socket_ready, S} ->
                        WorkerFun(S)
                after 3000 ->
                    gen_tcp:close(ClientSocket)
                end
            end),
            _ = handoff_socket(ClientSocket, WorkerPid),
            acceptor_worker_loop(ListenSocket, WorkerFun);
        {error, _} ->
            ok
    end.

-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

get_active_workers(ManagerPid) ->
    Ref = make_ref(),
    ManagerPid ! {get_worker_count, self(), Ref},
    receive {worker_count, Ref, Count} -> Count after 2000 -> 0 end.

manager_init(ListenSocket, PoolSize) ->
    ManagerPid = self(),
    Acceptors = [spawn_link(fun() -> pool_acceptor(ListenSocket, ManagerPid) end) || _ <- lists:seq(1, PoolSize)],
    manager_loop(ListenSocket, Acceptors, []).

manager_loop(ListenSocket, Acceptors, Workers) ->
    receive
        {worker_spawned, WorkerPid} -> manager_loop(ListenSocket, Acceptors, [WorkerPid | Workers]);
        {client_disconnected, WorkerPid} -> manager_loop(ListenSocket, Acceptors, lists:delete(WorkerPid, Workers));
        {get_worker_count, From, Ref} -> From ! {worker_count, Ref, length(Workers)}, manager_loop(ListenSocket, Acceptors, Workers);
        stop -> gen_tcp:close(ListenSocket), [exit(A, kill) || A <- Acceptors], [exit(W, kill) || W <- Workers], ok
    end.

pool_acceptor(ListenSocket, ManagerPid) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> pool_worker_init(ClientSocket, ManagerPid) end),
            ok = handoff_socket(ClientSocket, WorkerPid),
            ManagerPid ! {worker_spawned, WorkerPid},
            pool_acceptor(ListenSocket, ManagerPid);
        {error, _} -> ok
    end.

pool_worker_init(ClientSocket, ManagerPid) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            pool_worker_loop(ClientSocket, ManagerPid)
    after 2000 -> gen_tcp:close(ClientSocket)
    end.

pool_worker_loop(Socket, ManagerPid) ->
    receive
        {tcp, Socket, Data} ->
            ok = gen_tcp:send(Socket, <<"+REPLY: ", Data/binary>>),
            ok = inet:setopts(Socket, [{active, once}]),
            pool_worker_loop(Socket, ManagerPid);
        {tcp_closed, Socket} -> ManagerPid ! {client_disconnected, self()}, ok;
        {tcp_error, Socket, _Reason} -> ManagerPid ! {client_disconnected, self()}, ok
    end.
    `,
    },
solutionExplanation: `### Solution Breakdown: High-Concurrency Socket Handoff
1. **Controlling Process Transfer**: \`gen_tcp:controlling_process(ClientSocket, WorkerPid)\` assigns the worker as the designated port owner before any data packets are read.
2. **Readiness Signal**: After handoff succeeds, the acceptor transmits \`{socket_ready, ClientSocket}\` to awaken the worker thread.
3. **Concurrent Acceptor Loops**: Spawning multiple processes that call \`gen_tcp:accept(ListenSocket)\` concurrently allows the operating system kernel to distribute incoming connections across CPU cores with zero synchronization locks.`,
    visibleTestCases: [
      {
        id: 'tc-ch10-l05-1',
        title: 'Start Acceptor Pool & Connect 2 Clients',
        erlangCall: 'begin {ok, Mgr, Port} = tcp_acceptor_pool:start_pool(0, 3), {ok, S1} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000), {ok, S2} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000), timer:sleep(50), Cnt = tcp_acceptor_pool:get_active_workers(Mgr), ok = gen_tcp:send(S1, <<"PING\\r\\n">>), {ok, Rep} = gen_tcp:recv(S1, 0, 2000), gen_tcp:close(S1), gen_tcp:close(S2), tcp_acceptor_pool:stop_pool(Mgr), {Cnt, Rep} end',
        expectedOutput: '{2,<<"+REPLY: PING\\r\\n">>}',
        explanation: 'Verifies 2 concurrent connections accepted and request/reply executed.',
      },
      {
        id: 'tc-ch10-l05-2',
        title: 'Direct Socket Handoff to Worker',
        erlangCall: 'begin {ok, L} = gen_tcp:listen(0, [binary, {active, false}]), {ok, Port} = inet:port(L), Receiver = spawn(fun() -> receive {socket_assigned, S} -> inet:setopts(S, [{active, once}]), receive {tcp, S, <<"HI\\r\\n">>} -> ok = gen_tcp:send(S, <<"ACK\\r\\n">>) end end end), {ok, Client} = gen_tcp:connect("127.0.0.1", Port, [binary, {active, false}], 2000), {ok, ServerSock} = gen_tcp:accept(L, 2000), ok = tcp_acceptor_pool:handoff_socket(ServerSock, Receiver), ok = gen_tcp:send(Client, <<"HI\\r\\n">>), {ok, Rep} = gen_tcp:recv(Client, 0, 2000), gen_tcp:close(Client), gen_tcp:close(L), Rep end',
        expectedOutput: '<<"ACK\\r\\n">>',
        explanation: 'Directly validates handoff_socket/2 transfers controlling process and signals receiver.',
      },
    ],
    astRules: {
      requireTailRecursion: ['manager_loop/3', 'pool_worker_loop/2'],
      forbiddenCalls: [],
      requiredCalls: ['gen_tcp:controlling_process/2', 'gen_tcp:listen/2', 'gen_tcp:accept/1'],
      requiredConstructs: ['receive_after'],
    },
    references: [
      {
        title: 'Nine Nines: Ranch User Guide',
        url: 'https://ninenines.eu/docs/en/ranch/2.1/guide/',
        category: 'github_ecosystem',
        description: 'Architectural documentation for the Ranch socket acceptor pool library.',
      },
    ],
  },

  // ── Lesson 10.6: Incident Triage ──────────────────────────────────────────
  {
    id: 'ch10-l06',
    chapterNumber: 10,
    lessonNumber: 6,
    lessonType: 'incident_triage',
    title: 'Incident #106: Slowloris & {active, true} TCP Mailbox OOM Crash',
    difficulty: 'Production',
    xpReward: 175,
    visualScene: 'tcp_xmpp_stream_framing',
    incidentAlert: {
      incidentId: 'INC-106',
      severity: 'CRITICAL',
      serviceName: 'edge-tcp-ingestion-gateway',
      symptom: 'Under a 5,000 packet/sec client burst, connection worker mailboxes spike to 80,000 queued messages, memory balloons to 8 GB, and partial commands split across two TCP packets are silently corrupted!',
      rootCauseHint: 'recommended_socket_opts/0 configures {active, true} (disabling TCP backpressure), and buffer_and_extract_lines(OldBuffer, Chunk) ignores OldBuffer when splitting on \r\n and omits binary:copy/1!',
      fixObjective: 'Change {active, true} to {active, once} in recommended_socket_opts/0, and fix buffer_and_extract_lines/2 to concatenate <<OldBuffer/binary, Chunk/binary>>, extract complete \r\n lines, and unpin both lines and the trailing remainder with binary:copy/1.',
    },
    mentalModelCheck: {
      question: 'What is the immediate consequence at the OS TCP stack when an Erlang process receives a packet on an {active, once} socket and takes 50ms to call inet:setopts(Socket, [{active, once}])?',
      codeSnippet: `%% Worker receives packet and takes 50ms to process:
handle_info({tcp, Socket, Data}, State) ->
    expensive_computation(Data),
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State}.`,
      options: [
        {
          id: 'A',
          label: 'The socket flips to passive mode; incoming packets accumulate in the OS kernel receive buffer, eventually triggering TCP Zero Window backpressure to throttle the sender.',
          isCorrect: true,
          explanation: 'Exactly! While your process is busy, incoming bytes remain in the OS kernel buffer. If that buffer fills, the OS advertises Window Size 0, forcing the client hardware to pause transmission with zero BEAM memory allocation.',
        },
        {
          id: 'B',
          label: 'The BEAM drops all incoming packets immediately to prevent memory growth.',
          isCorrect: false,
          explanation: 'TCP is a reliable protocol; packets are never dropped silently. The OS buffers them and signals window backpressure to the peer.',
        },
        {
          id: 'C',
          label: 'The BEAM automatically closes the connection after 10ms.',
          isCorrect: false,
          explanation: 'The connection remains open and healthy. Only the active reception mode is paused until inet:setopts/2 re-arms it.',
        },
      ],
    },
    conceptMarkdown: `## Production Incident Post-Mortem: Incident #106

At 14:22 UTC, our primary edge TCP ingestion cluster began crashing across multiple availability zones. Within 12 minutes, the Linux kernel OOM (Out-Of-Memory) killer terminated 14 BEAM nodes, abruptly severing over 120,000 active device sessions.

Telemetry inspection revealed two catastrophic defects:
1. **Unbounded Mailbox Growth**: Connection worker processes had average mailbox queue lengths exceeding **80,000 unhandled messages**, consuming over 600 MB of heap memory per connection process!
2. **Corrupted Stream State & Buffer Dropping**: Incoming commands split across MTU packet boundaries (for example, \`<<"SET session_token ">>\` arriving in Packet 1, followed 15ms later by \`<<"secret123\\r\\n">>\` in Packet 2) suffered silent data corruption because the buffer dropped the prefix!

> [!warning] Production Networking Trap: The Silent Poison of \`{active, true}\`
> In small local tests or during interactive development, \`{active, true}\` feels effortless: you never have to call \`inet:setopts(Socket, [{active, once}])\` or remember to re-arm socket reception. Every packet lands in your mailbox instantly.
> 
> But in production under adversarial conditions (Slowloris attacks, network bursts, or slow downstream databases), \`{active, true}\` completely disables the operating system's TCP receive window. Even if your worker process is stuck doing an expensive database insert or garbage-collecting its heap, the Linux kernel blindly pumps thousands of incoming TCP segments into the BEAM mailbox. 
> 
> Because Erlang mailboxes are unbounded FIFO queues residing on the process heap, the mailbox balloons exponentially until the operating system invokes the OOM killer!

## Deep Concept Breakdown & Under the Hood

### 1. How TCP Receive Windows Provide Hardware Backpressure
When you configure a socket with \`{active, once}\`:
1. The BEAM C driver reads **one** segment from the OS socket buffer and delivers \`{tcp, Socket, Data}\` to your Erlang process.
2. The driver **immediately flips the socket to passive mode** (\`{active, false}\`).
3. While your process executes \`handle_info\` and formats a reply, subsequent packets from the client remain queued inside the OS kernel's TCP receive buffer (\`SO_RCVBUF\`).
4. Once the kernel's receive buffer fills up, the OS TCP stack advertises a **Window Size of 0** (\`TCP Zero Window\`) back across the wire.
5. The client's operating system halts packet transmission at the network card layer! This is true, zero-CPU backpressure.
6. When your Erlang worker finishes processing and calls \`inet:setopts(Socket, [{active, once}])\`, the BEAM drains the next chunk and the OS opens its TCP window again.

### 2. The Custom Stream Framing & Memory Pinning Defect
In addition to the mailbox flood, the incident post-mortem uncovered a memory leak in the framing parser:
\`\`\`erlang
%% Defective implementation:
buffer_and_extract_lines(_OldBuffer, Chunk) ->
    Combined = Chunk, %% BUG: Discarded OldBuffer! Incomplete prefixes are lost!
    extract_lines(Combined, []).
\`\`\`
When a TCP stream fragments across packets, discarding \`OldBuffer\` destroys any partial command tokens that arrived in previous chunks.

Furthermore, failing to call \`binary:copy/1\` on the extracted line tokens and trailing partial remainder leaves them pointing into temporary 64 KB off-heap socket buffers (\`ProcBin\` reference-counted binaries). A 10-byte slice can keep a 64 KB buffer pinned indefinitely in memory!

## Parallel Worked Example: The Correct Triage Pattern

\`\`\`erlang
-module(safe_ingestion_worker).
-export([recommended_opts/0, feed_stream/2]).

%% Enforce backpressure: {active, once} guarantees one packet per cycle
recommended_opts() ->
    [binary, {packet, raw}, {active, once}, {reuseaddr, true}].

%% Stitches prior leftover with newly received chunk, splits on CRLF,
%% and unpins all extracted binaries
feed_stream(PriorBuffer, IncomingChunk) ->
    Combined = <<PriorBuffer/binary, IncomingChunk/binary>>,
    slice_lines(Combined, []).

slice_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"\\r\\n">>) of
        [Line, Rest] ->
            %% Unpin each complete line from socket ProcBin
            slice_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            %% Unpin trailing partial remainder for next cycle
            {ok, lists:reverse(Acc), binary:copy(Incomplete)}
    end.
\`\`\`

## Assignment Specification

Fix module \`src/incident_tcp_active_true.erl\`:
1. **\`recommended_socket_opts/0\`**: Change \`{active, true}\` to \`{active, once}\` to restore kernel backpressure.
2. **\`buffer_and_extract_lines(OldBuffer, Chunk)\`**:
   - Concatenate \`OldBuffer\` and \`Chunk\`: \`Combined = <<OldBuffer/binary, Chunk/binary>>\`.
   - Recursively split on \`<<"\\r\\n">>\`.
   - Call \`binary:copy/1\` on each complete line and on the trailing incomplete remainder.
   - Return \`{ok, ExtractedLinesList, UnpinnedRemainderBin}\`.

## Rules & Verification Constraints
- Verified by the Go Orchestrator against simulated high-rate packet floods and fragmented chunk pipelines.
- AST verifier mandates \`binary:split/2\` and \`binary:copy/1\`.
    `,
    otpDocCards: [
      {
        functionName: 'setopts',
        module: 'inet',
        signature: 'inet:setopts(Socket, Options) -> ok | {error, posix()}',
        typesSpec: ['Socket = gen_tcp:socket()', 'Options = [{active, once | true | false}]'],
        description: 'Sets options for a socket. {active, once} re-arms the socket for a single incoming message, providing robust backpressure flow control.',
        complexityNote: 'O(1) socket option modification.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/inet.html#setopts/2',
      },
      {
        functionName: 'copy',
        module: 'binary',
        signature: 'binary:copy(Subject) -> binary()',
        typesSpec: ['Subject = binary()'],
        description: 'Creates a deep copy of a binary or sub-binary, unpinning it from the underlying ProcBin refc buffer and freeing memory.',
        complexityNote: 'O(N) where N is the length of Subject.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#copy/1',
      },
    ],
    starterCode: `-module(incident_tcp_active_true).
-export([recommended_socket_opts/0, buffer_and_extract_lines/2]).
-export([audit_socket_opts/0, test_framing/0]).

%% Returns socket options for high-throughput TCP ingestion
recommended_socket_opts() ->
    %% % TODO [INC-106 Triage]:
    %% % Sockets configured with unbounded active mode flood worker mailboxes under burst traffic.
    %% % Switch to bounded active mode so the OS kernel regulates incoming packet flow.
    [binary, {packet, raw}, {active, true}, {reuseaddr, true}].

%% Buffers incoming chunks, extracts complete CRLF-delimited lines,
%% and returns {ok, [Lines], UnpinnedRemainder}.
buffer_and_extract_lines(OldBuffer, Chunk) ->
    %% % TODO [INC-106 Triage]:
    %% % Defect 1: Incoming fragments lose their prefix because OldBuffer is ignored!
    %% % Stitch the previous accumulator with the new chunk before extracting lines.
    %% % Defect 2: Sub-binary slices pin 64 KB socket buffers in memory.
    %% % Ensure every extracted line and trailing remainder is unpinned via binary:copy/1.
    Combined = Chunk,
    _ = OldBuffer,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<"\\r\\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [Line | Acc]);
        [Incomplete] ->
            %% % TODO: Call binary:copy/1 on Incomplete!
            {ok, lists:reverse(Acc), Incomplete}
    end.

%% Diagnostic helpers
audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G\\r\\nPONG\\r\\nPAR">>,
    {ok, Lines2, Rem2} = buffer_and_extract_lines(Rem1, Chunk2),
    Chunk3 = <<"TIAL">>,
    {ok, Lines3, Rem3} = buffer_and_extract_lines(Rem2, Chunk3),
    AllLines = Lines1 ++ Lines2 ++ Lines3,
    {ok, AllLines, Rem3}.
    `,
    solutionCode: `-module(incident_tcp_active_true).
-export([recommended_socket_opts/0, buffer_and_extract_lines/2]).
-export([audit_socket_opts/0, test_framing/0]).

recommended_socket_opts() ->
    [binary, {packet, raw}, {active, once}, {reuseaddr, true}].

buffer_and_extract_lines(OldBuffer, Chunk) ->
    Combined = <<OldBuffer/binary, Chunk/binary>>,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<"\\r\\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {ok, lists:reverse(Acc), binary:copy(Incomplete)}
    end.

audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G\\r\\nPONG\\r\\nPAR">>,
    {ok, Lines2, Rem2} = buffer_and_extract_lines(Rem1, Chunk2),
    Chunk3 = <<"TIAL">>,
    {ok, Lines3, Rem3} = buffer_and_extract_lines(Rem2, Chunk3),
    AllLines = Lines1 ++ Lines2 ++ Lines3,
    {ok, AllLines, Rem3}.
    `,
        files: [
      {
        name: 'incident_tcp_active_true.erl',
        path: 'src/incident_tcp_active_true.erl',
        content: `-module(incident_tcp_active_true).
-export([recommended_socket_opts/0, buffer_and_extract_lines/2]).
-export([audit_socket_opts/0, test_framing/0]).

%% Returns socket options for high-throughput TCP ingestion
recommended_socket_opts() ->
    %% % TODO [INC-106 Triage]:
    %% % Sockets configured with unbounded active mode flood worker mailboxes under burst traffic.
    %% % Switch to bounded active mode so the OS kernel regulates incoming packet flow.
    [binary, {packet, raw}, {active, true}, {reuseaddr, true}].

%% Buffers incoming chunks, extracts complete CRLF-delimited lines,
%% and returns {ok, [Lines], UnpinnedRemainder}.
buffer_and_extract_lines(OldBuffer, Chunk) ->
    %% % TODO [INC-106 Triage]:
    %% % Defect 1: Incoming fragments lose their prefix because OldBuffer is ignored!
    %% % Stitch the previous accumulator with the new chunk before extracting lines.
    %% % Defect 2: Sub-binary slices pin 64 KB socket buffers in memory.
    %% % Ensure every extracted line and trailing remainder is unpinned via binary:copy/1.
    Combined = Chunk,
    _ = OldBuffer,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<"\\r\\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [Line | Acc]);
        [Incomplete] ->
            %% % TODO: Call binary:copy/1 on Incomplete!
            {ok, lists:reverse(Acc), Incomplete}
    end.

%% Diagnostic helpers
audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G\\r\\nPONG\\r\\nPAR">>,
    {ok, Lines2, Rem2} = buffer_and_extract_lines(Rem1, Chunk2),
    Chunk3 = <<"TIAL">>,
    {ok, Lines3, Rem3} = buffer_and_extract_lines(Rem2, Chunk3),
    AllLines = Lines1 ++ Lines2 ++ Lines3,
    {ok, AllLines, Rem3}.
    `,
      },
    ],
    solutionFiles: {
      'src/incident_tcp_active_true.erl': `-module(incident_tcp_active_true).
-export([recommended_socket_opts/0, buffer_and_extract_lines/2]).
-export([audit_socket_opts/0, test_framing/0]).

recommended_socket_opts() ->
    [binary, {packet, raw}, {active, once}, {reuseaddr, true}].

buffer_and_extract_lines(OldBuffer, Chunk) ->
    Combined = <<OldBuffer/binary, Chunk/binary>>,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<"\\r\\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {ok, lists:reverse(Acc), binary:copy(Incomplete)}
    end.

audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G\\r\\nPONG\\r\\nPAR">>,
    {ok, Lines2, Rem2} = buffer_and_extract_lines(Rem1, Chunk2),
    Chunk3 = <<"TIAL">>,
    {ok, Lines3, Rem3} = buffer_and_extract_lines(Rem2, Chunk3),
    AllLines = Lines1 ++ Lines2 ++ Lines3,
    {ok, AllLines, Rem3}.
    `,
    },
solutionExplanation: `### Incident #106 Triage Verification
1. **Flow Control Enforced**: Switching from \`{active, true}\` to \`{active, once}\` ensures the OS kernel buffers packets when the worker process is busy, triggering TCP window backpressure to throttle senders.
2. **Buffer Concatenation**: Prepending \`OldBuffer\` preserves partial command tokens across network chunk boundaries.
3. **Memory Unpinning**: Executing \`binary:copy/1\` decouples the retained sub-binary remainder from the underlying 64 KB socket buffer, eliminating memory leaks.`,
    visibleTestCases: [
      {
        id: 'tc-ch10-l06-1',
        title: 'Audit Socket Options ({active, once})',
        erlangCall: 'incident_tcp_active_true:audit_socket_opts()',
        expectedOutput: '{ok, active_once_enforced}',
        explanation: 'Confirms recommended_socket_opts/0 specifies {active, once} and rejects {active, true}.',
      },
      {
        id: 'tc-ch10-l06-2',
        title: 'Buffer Fragmented TCP Packets with Unpinning',
        erlangCall: 'incident_tcp_active_true:test_framing()',
        expectedOutput: '{ok, [<<"PING">>, <<"PONG">>], <<"PARTIAL">>}',
        explanation: 'Feeds fragmented TCP chunks, confirming complete lines are extracted and partial remainder is unpinned.',
      },
    ],
    astRules: {
      requireTailRecursion: ['extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['binary:split/2', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax'],
    },
    references: [
      {
        title: 'Erlang in Anger: Chapter 5 - Overload & Backpressure',
        url: 'https://www.erlanginanger.com/',
        category: 'book_rfc',
        description: 'Production handbook on handling socket overload and preventing node crashes.',
      },
    ],
  },
  // ── Lesson 10.7: Problem Set (Mini-Capstone) ────────────────────────────────
  {
    id: 'ch10-l07',
    chapterNumber: 10,
    lessonNumber: 7,
    lessonType: 'problem_set',
    title: 'Chapter 10 Mini-Capstone: High-Throughput TCP Key-Value Backend Server',
    difficulty: 'Advanced',
    xpReward: 250,
    visualScene: 'tcp_xmpp_stream_framing',
    mentalModelCheck: {
      question: 'Why does pairing an ETS table ({read_concurrency, true}, {write_concurrency, true}) with an acceptor pool achieve linear scalability across multi-core CPUs?',
      codeSnippet: `ets:new(tcp_kv_table, [set, public, named_table, {read_concurrency, true}, {write_concurrency, true}])`,
      options: [
        {
          id: 'A',
          label: 'ETS tables live outside individual process heaps in C memory with fine-grained lock striping; multiple connection workers can read and write concurrently without blocking each other or triggering garbage collection pauses.',
          isCorrect: true,
          explanation: 'Precisely! ETS tables are stored in global C memory. Multiple worker processes across CPU cores access the table concurrently with minimal lock contention, providing database-grade throughput.',
        },
        {
          id: 'B',
          label: 'ETS tables automatically serialize all operations through a single master process.',
          isCorrect: false,
          explanation: 'Public ETS tables allow direct concurrent access from any process without routing through a single owner process.',
        },
        {
          id: 'C',
          label: 'ETS tables compress all keys using zlib before storing them.',
          isCorrect: false,
          explanation: 'ETS stores terms in raw native BEAM representation without compression.',
        },
      ],
    },
    conceptMarkdown: `## Why This Matters in Production

You have mastered raw sockets, socket options, \`{active, once}\` backpressure, custom stream framing, and concurrent acceptor pools. Now you will assemble these core building blocks into a production-grade, Redis-compatible **TCP Key-Value Backend Server** built entirely from scratch!

This mini-capstone mirrors the core network engine of production databases (Redis, Memcached) and real-time messaging servers (including the XMPP server you will build in Chapters 11 and 12).

> [!warning] Production Networking Trap: Lingering Sockets, Port Collisions & ETS Leaks
> In a production TCP server, three common traps cause cascading outages:
> 1. **Socket Descriptor Leaks**: If a client abruptly disconnects and your worker process does not handle \`{tcp_closed, Socket}\` or crashes before calling \`gen_tcp:close/1\`, the file descriptor remains allocated in the OS table. Under sustained traffic, the node quickly exhausts file descriptors (\`EMFILE: Too many open files\`)!
> 2. **Port Collisions**: Hardcoding port \`8080\` in tests causes immediate crashes when parallel test runners run concurrently. Always pass port \`0\` to let the OS assign an ephemeral port (\`inet:port(ListenSocket) -> {ok, Port}\`).
> 3. **ETS Table Orphan Leaks**: When spawning named ETS tables in tests, if the owner process terminates without passing ownership via \`{heir, Pid, Data}\`, attempting to recreate the table with the same name crashes with \`badarg\`. In tests, always clean up existing tables cleanly.

> [!abstract] TCP Key-Value Server Architecture
> 1. **Client Socket**: Raw fragmented byte stream arrives under \`{active, once}\` flow control.
> 2. **Framing Buffer**: Accumulates incoming chunks and slices clean \`\\r\\n\` command lines.
> 3. **Command Parser**: Tokenizes verbs (\`SET\`, \`GET\`, \`DEL\`, \`PING\`).
> 4. **ETS Store**: Executes atomic reads and writes against an off-heap concurrent ETS table.
> 5. **Wire Formatter**: Encodes responses (\`+OK\\r\\n\`, \`$Value\\r\\n\`, \`:1\\r\\n\`, \`-ERR...\\r\\n\`) and transmits via \`gen_tcp:send/2\`.
> 6. **Flow Control Armed**: Re-arms socket via \`inet:setopts(Socket, [{active, once}])\` after every frame!

## Deep Concept Breakdown & Wire Protocol

Your server speaks a newline-terminated (\`\\r\\n\`) ASCII wire protocol:

### The 5 Wire Commands
1. **\`PING\\r\\n\`**:
   - Reply: \`<<"+PONG\\r\\n">>\`
2. **\`SET <Key> <Value>\\r\\n\`**:
   - Stores \`{Key, Value}\` in ETS.
   - Reply: \`<<"+OK\\r\\n">>\`
3. **\`GET <Key>\\r\\n\`**:
   - If key exists: \`<<"$", Value/binary, "\\r\\n">>\`
   - If key does not exist: \`<<"$-1\\r\\n">>\`
4. **\`DEL <Key>\\r\\n\`**:
   - If key existed and was deleted: \`<<":1\\r\\n">>\`
   - If key did not exist: \`<<":0\\r\\n">>\`
5. **Unknown Command**:
   - Reply: \`<<"-ERR unknown command\\r\\n">>\`

## Parallel Worked Example

Here is a command parser and executor skeleton:

\`\`\`erlang
-module(protocol_handler).
-export([parse/1, execute/2]).

parse(<<"PING">>) -> {ok, ping};
parse(<<"SET ", Rest/binary>>) ->
    case binary:split(Rest, <<" ">>) of
        [K, V] -> {ok, {set, K, V}};
        _ -> {error, unknown_command}
    end;
parse(_) -> {error, unknown_command}.

execute({ok, ping}, _Tab) -> <<"+PONG\\r\\n">>;
execute({ok, {set, K, V}}, Tab) ->
    ets:insert(Tab, {K, V}),
    <<"+OK\\r\\n">>;
execute({error, unknown_command}, _Tab) ->
    <<"-ERR unknown command\\r\\n">>.
\`\`\`

## Assignment Specification

Implement module \`src/tcp_kv_backend.erl\` exporting:
\`\`\`erlang
-module(tcp_kv_backend).
-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).
\`\`\`

### Function Requirements:
1. **\`parse_command(RawLineBin)\`**:
   - \`<<"PING">>\` $\\rightarrow$ \`{ok, ping}\`
   - \`<<"SET ", Rest/binary>>\` $\\rightarrow$ splits on first space into Key and Value: \`{ok, {set, Key, Value}}\`
   - \`<<"GET ", Key/binary>>\` $\\rightarrow$ \`{ok, {get, Key}}\`
   - \`<<"DEL ", Key/binary>>\` $\\rightarrow$ \`{ok, {del, Key}}\`
   - Other $\\rightarrow$ \`{error, unknown_command}\`
2. **\`execute_command(Command, EtsTable)\`**:
   - Executes the command against \`EtsTable\` and returns the wire protocol binary:
     - \`ping\` or \`{ok, ping}\` $\\rightarrow$ \`<<"+PONG\\r\\n">>\`
     - \`{set, Key, Value}\` or \`{ok, {set, Key, Value}}\` $\\rightarrow$ \`<<"+OK\\r\\n">>\`
     - \`{get, Key}\` or \`{ok, {get, Key}}\` $\\rightarrow$ \`<<"$", Value/binary, "\\r\\n">>\` or \`<<"$-1\\r\\n">>\`
     - \`{del, Key}\` or \`{ok, {del, Key}}\` $\\rightarrow$ \`<<":1\\r\\n">>\` (if deleted) or \`<<":0\\r\\n">>\` (if absent)
     - \`{error, unknown_command}\` or unrecognized term $\\rightarrow$ \`<<"-ERR unknown command\\r\\n">>\`
3. **\`start_server/0\`**:
   - Initializes named public table \`tcp_kv_table\` with \`[set, public, named_table, {read_concurrency, true}, {write_concurrency, true}]\`.
   - Binds ephemeral port \`0\` via \`gen_tcp:listen(0, [binary, {packet, raw}, {active, false}, {reuseaddr, true}])\`.
   - Obtains assigned OS port via \`inet:port/1\`.
   - Spawns an acceptor process that accepts connections, spawns connection workers, calls \`gen_tcp:controlling_process/2\`, and arms \`{active, once}\`.
   - Connection workers maintain a stream buffer, execute commands, reply via \`gen_tcp:send/2\`, and re-arm \`{active, once}\`!
   - Returns \`{ok, ServerPid, Port}\`.
4. **\`stop_server(ServerPid)\`**:
   - Closes the server and deletes \`tcp_kv_table\`. Returns \`ok\`.

## Rules & Verification Constraints
- Tested against live TCP client sockets with fragmented and coalesced packet bursts!
- AST verifier checks: \`inet:setopts/2\`, \`gen_tcp:send/2\`, \`ets:insert/2\`, and \`ets:lookup/2\`.
    `,
    otpDocCards: [
      {
        functionName: 'insert',
        module: 'ets',
        signature: 'ets:insert(Tab, TupleOrTuples) -> true',
        typesSpec: ['Tab = tab()', 'TupleOrTuples = tuple() | [tuple()]'],
        description: 'Inserts one or more objects into an ETS table.',
        complexityNote: 'O(1) in shared off-heap C memory.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#insert/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/ets.erl'
      },
      {
        functionName: 'lookup',
        module: 'ets',
        signature: 'ets:lookup(Tab, Key) -> [tuple()]',
        typesSpec: ['Tab = tab()', 'Key = term()'],
        description: 'Retrieves objects matching Key from ETS table.',
        complexityNote: 'Lock-free O(1) read with read_concurrency enabled.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#lookup/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/ets.erl'
      }
    ],
    starterCode: `-module(tcp_kv_backend).

-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).

%% @doc Parses a raw newline-stripped binary command into an internal tuple.
%% Supported: PING, SET <Key> <Val>, GET <Key>, DEL <Key>.
-spec parse_command(binary()) -> {ok, term()} | {error, unknown_command}.
parse_command(_RawLineBin) ->
    %% % TODO: Tokenize the incoming binary command line.
    %% % Match supported protocol verbs (PING, SET, GET, DEL) as specified
    %% % in the lesson guide, returning tagged tuples or {error, unknown_command}.
    ignore.

%% @doc Executes parsed command against EtsTable and returns wire protocol binary.
-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command(_Command, _EtsTable) ->
    %% % TODO: Execute against ETS table and return wire protocol response:
    %% %   - {ok, Cmd} or unwrapped Cmd:
    %% %     - ping -> <<"+PONG\\r\\n">>
    %% %     - {set, Key, Value} -> insert into EtsTable, return <<"+OK\\r\\n">>
    %% %     - {get, Key} -> lookup in EtsTable: if found <<"$", Value/binary, "\\r\\n">>, if missing <<"$-1\\r\\n">>
    %% %     - {del, Key} -> if existed and deleted <<":1\\r\\n">>, if was absent <<":0\\r\\n">>
    %% %   - {error, unknown_command} or other -> <<"-ERR unknown command\\r\\n">>
    ignore.

%% @doc Boots the TCP Key-Value server on ephemeral port 0 and returns {ok, ServerPid, Port}.
-spec start_server() -> {ok, pid(), inet:port_number()}.
start_server() ->
    %% % TODO:
    %% % 1. Initialize the concurrent named ETS storage table.
    %% % 2. Open an ephemeral passive listen socket on port 0.
    %% % 3. Spawn the acceptor loop to accept clients and hand off sockets to workers.
    %% % 4. In connection workers, enforce active-once backpressure, frame CRLF lines,
    %% %    execute commands against ETS, and stream replies back to clients.
    %% % 5. Return {ok, ServerPid, Port}.
    ignore.

%% @doc Stops the server and cleans up ETS storage.
-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    exit(ServerPid, kill),
    try ets:delete(tcp_kv_table) catch _:_ -> ok end,
    ok.
    `,
    solutionCode: `-module(tcp_kv_backend).

-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).

-spec parse_command(binary()) -> {ok, term()} | {error, unknown_command}.
parse_command(<<"PING">>) ->
    {ok, ping};
parse_command(<<"SET ", Rest/binary>>) ->
    case binary:split(Rest, <<" ">>) of
        [Key, Value] -> {ok, {set, Key, Value}};
        _ -> {error, unknown_command}
    end;
parse_command(<<"GET ", Key/binary>>) ->
    {ok, {get, Key}};
parse_command(<<"DEL ", Key/binary>>) ->
    {ok, {del, Key}};
parse_command(_Other) ->
    {error, unknown_command}.

-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command({ok, Cmd}, Tab) ->
    execute_command(Cmd, Tab);
execute_command(ping, _Tab) ->
    <<"+PONG\r\n">>;
execute_command({set, Key, Value}, Tab) ->
    ets:insert(Tab, {Key, Value}),
    <<"+OK\r\n">>;
execute_command({get, Key}, Tab) ->
    case ets:lookup(Tab, Key) of
        [{Key, Value}] ->
            <<"$", Value/binary, "\r\n">>;
        [] ->
            <<"$-1\r\n">>
    end;
execute_command({del, Key}, Tab) ->
    case ets:member(Tab, Key) of
        true ->
            ets:delete(Tab, Key),
            <<":1\r\n">>;
        false ->
            <<":0\r\n">>
    end;
execute_command({error, unknown_command}, _Tab) ->
    <<"-ERR unknown command\r\n">>;
execute_command(_Other, _Tab) ->
    <<"-ERR unknown command\r\n">>.

-spec start_server() -> {ok, pid(), inet:port_number()}.
start_server() ->
    Tab = case ets:info(tcp_kv_table) of
        undefined ->
            ets:new(tcp_kv_table, [set, public, named_table, {read_concurrency, true}, {write_concurrency, true}]);
        _ ->
            tcp_kv_table
    end,
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    ServerPid = spawn_link(fun() ->
        accept_loop(ListenSocket, Tab)
    end),
    {ok, ServerPid, Port}.

-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    exit(ServerPid, kill),
    try ets:delete(tcp_kv_table) catch _:_ -> ok end,
    ok.

accept_loop(ListenSocket, Tab) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() ->
                try register(tcp_kv_worker, self()) catch _:_ -> ok end,
                worker_init(ClientSocket, Tab)
            end),
            ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
            WorkerPid ! {socket_assigned, ClientSocket},
            accept_loop(ListenSocket, Tab);
        {error, _} ->
            ok
    end.

worker_init(ClientSocket, Tab) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            worker_loop(ClientSocket, Tab, <<>>)
    after 3000 ->
        gen_tcp:close(ClientSocket)
    end.

worker_loop(Socket, Tab, Buffer) ->
    receive
        {tcp, Socket, IncomingData} ->
            Combined = <<Buffer/binary, IncomingData/binary>>,
            {Lines, Remaining} = extract_lines(Combined, []),
            lists:foreach(fun(Line) ->
                Cmd = parse_command(Line),
                Reply = execute_command(Cmd, Tab),
                _ = gen_tcp:send(Socket, Reply)
            end, Lines),
            ok = inet:setopts(Socket, [{active, once}]),
            worker_loop(Socket, Tab, Remaining);
        {tcp_closed, _Socket} ->
            ok;
        {tcp_error, _Socket, _Reason} ->
            ok
    end.

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
    `,
        files: [
      {
        name: 'tcp_kv_backend.erl',
        path: 'src/tcp_kv_backend.erl',
        content: `-module(tcp_kv_backend).

-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).

%% @doc Parses a raw newline-stripped binary command into an internal tuple.
%% Supported: PING, SET <Key> <Val>, GET <Key>, DEL <Key>.
-spec parse_command(binary()) -> {ok, term()} | {error, unknown_command}.
parse_command(_RawLineBin) ->
    %% % TODO: Tokenize the incoming binary command line.
    %% % Match supported protocol verbs (PING, SET, GET, DEL) as specified
    %% % in the lesson guide, returning tagged tuples or {error, unknown_command}.
    ignore.

%% @doc Executes parsed command against EtsTable and returns wire protocol binary.
-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command(_Command, _EtsTable) ->
    %% % TODO: Execute against ETS table and return wire protocol response:
    %% %   - {ok, Cmd} or unwrapped Cmd:
    %% %     - ping -> <<"+PONG\\r\\n">>
    %% %     - {set, Key, Value} -> insert into EtsTable, return <<"+OK\\r\\n">>
    %% %     - {get, Key} -> lookup in EtsTable: if found <<"$", Value/binary, "\\r\\n">>, if missing <<"$-1\\r\\n">>
    %% %     - {del, Key} -> if existed and deleted <<":1\\r\\n">>, if was absent <<":0\\r\\n">>
    %% %   - {error, unknown_command} or other -> <<"-ERR unknown command\\r\\n">>
    ignore.

%% @doc Boots the TCP Key-Value server on ephemeral port 0 and returns {ok, ServerPid, Port}.
-spec start_server() -> {ok, pid(), inet:port_number()}.
start_server() ->
    %% % TODO:
    %% % 1. Initialize the concurrent named ETS storage table.
    %% % 2. Open an ephemeral passive listen socket on port 0.
    %% % 3. Spawn the acceptor loop to accept clients and hand off sockets to workers.
    %% % 4. In connection workers, enforce active-once backpressure, frame CRLF lines,
    %% %    execute commands against ETS, and stream replies back to clients.
    %% % 5. Return {ok, ServerPid, Port}.
    ignore.

%% @doc Stops the server and cleans up ETS storage.
-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    exit(ServerPid, kill),
    try ets:delete(tcp_kv_table) catch _:_ -> ok end,
    ok.
    `,
      },
    ],
    solutionFiles: {
      'src/tcp_kv_backend.erl': `-module(tcp_kv_backend).

-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).

-spec parse_command(binary()) -> {ok, term()} | {error, unknown_command}.
parse_command(<<"PING">>) ->
    {ok, ping};
parse_command(<<"SET ", Rest/binary>>) ->
    case binary:split(Rest, <<" ">>) of
        [Key, Value] -> {ok, {set, Key, Value}};
        _ -> {error, unknown_command}
    end;
parse_command(<<"GET ", Key/binary>>) ->
    {ok, {get, Key}};
parse_command(<<"DEL ", Key/binary>>) ->
    {ok, {del, Key}};
parse_command(_Other) ->
    {error, unknown_command}.

-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command({ok, Cmd}, Tab) ->
    execute_command(Cmd, Tab);
execute_command(ping, _Tab) ->
    <<"+PONG\r\n">>;
execute_command({set, Key, Value}, Tab) ->
    ets:insert(Tab, {Key, Value}),
    <<"+OK\r\n">>;
execute_command({get, Key}, Tab) ->
    case ets:lookup(Tab, Key) of
        [{Key, Value}] ->
            <<"$", Value/binary, "\r\n">>;
        [] ->
            <<"$-1\r\n">>
    end;
execute_command({del, Key}, Tab) ->
    case ets:member(Tab, Key) of
        true ->
            ets:delete(Tab, Key),
            <<":1\r\n">>;
        false ->
            <<":0\r\n">>
    end;
execute_command({error, unknown_command}, _Tab) ->
    <<"-ERR unknown command\r\n">>;
execute_command(_Other, _Tab) ->
    <<"-ERR unknown command\r\n">>.

-spec start_server() -> {ok, pid(), inet:port_number()}.
start_server() ->
    Tab = case ets:info(tcp_kv_table) of
        undefined ->
            ets:new(tcp_kv_table, [set, public, named_table, {read_concurrency, true}, {write_concurrency, true}]);
        _ ->
            tcp_kv_table
    end,
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    ServerPid = spawn_link(fun() ->
        accept_loop(ListenSocket, Tab)
    end),
    {ok, ServerPid, Port}.

-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    exit(ServerPid, kill),
    try ets:delete(tcp_kv_table) catch _:_ -> ok end,
    ok.

accept_loop(ListenSocket, Tab) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() ->
                try register(tcp_kv_worker, self()) catch _:_ -> ok end,
                worker_init(ClientSocket, Tab)
            end),
            ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
            WorkerPid ! {socket_assigned, ClientSocket},
            accept_loop(ListenSocket, Tab);
        {error, _} ->
            ok
    end.

worker_init(ClientSocket, Tab) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            worker_loop(ClientSocket, Tab, <<>>)
    after 3000 ->
        gen_tcp:close(ClientSocket)
    end.

worker_loop(Socket, Tab, Buffer) ->
    receive
        {tcp, Socket, IncomingData} ->
            Combined = <<Buffer/binary, IncomingData/binary>>,
            {Lines, Remaining} = extract_lines(Combined, []),
            lists:foreach(fun(Line) ->
                Cmd = parse_command(Line),
                Reply = execute_command(Cmd, Tab),
                _ = gen_tcp:send(Socket, Reply)
            end, Lines),
            ok = inet:setopts(Socket, [{active, once}]),
            worker_loop(Socket, Tab, Remaining);
        {tcp_closed, _Socket} ->
            ok;
        {tcp_error, _Socket, _Reason} ->
            ok
    end.

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
    `,
    },
solutionExplanation: `### Mini-Capstone Architecture
1. **Pipeline Integration**: Combines \`gen_tcp\` passive listening, asynchronous client handoff via \`controlling_process/2\`, and bounded \`{active, once}\` flow control.
2. **Stream Framing**: \`extract_lines/2\` isolates complete CRLF commands and uses \`binary:copy/1\` to prevent memory pinning.
3. **High-Performance Storage**: The shared named ETS table provides lock-free O(1) concurrent reading and writing outside process heaps, matching production Redis and Memcached architectures.`,
    visibleTestCases: [
      {
        id: 'tc-ch10-l07-1',
        title: 'Parse PING and SET Commands',
        erlangCall: 'begin {ok, P1} = tcp_kv_backend:parse_command(<<"PING">>), {ok, P2} = tcp_kv_backend:parse_command(<<"SET session_token secret123">>), {P1, P2} end',
        expectedOutput: '{ping,{set,<<"session_token">>,<<"secret123">>}}',
        explanation: 'Parses valid PING and SET command strings into internal representation.',
      },
      {
        id: 'tc-ch10-l07-2',
        title: 'Execute Wire Commands Against ETS Store',
        erlangCall: 'begin Tab = ets:new(test_tab, [set, public]), R1 = tcp_kv_backend:execute_command({set, <<"k1">>, <<"val1">>}, Tab), R2 = tcp_kv_backend:execute_command({get, <<"k1">>}, Tab), R3 = tcp_kv_backend:execute_command({del, <<"k1">>}, Tab), R4 = tcp_kv_backend:execute_command({get, <<"k1">>}, Tab), ets:delete(Tab), {R1, R2, R3, R4} end',
        expectedOutput: '{<<"+OK\\r\\n">>,<<"$val1\\r\\n">>,<<":1\\r\\n">>,<<"$-1\\r\\n">>}',
        explanation: 'Validates +OK, $Val, :1, and $-1 return values across SET, GET, and DEL lifecycle.',
      },
    ],
    astRules: {
      requireTailRecursion: ['accept_loop/2', 'worker_loop/3', 'extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['inet:setopts/2', 'gen_tcp:send/2', 'ets:insert/2', 'ets:lookup/2'],
      requiredConstructs: ['bit_syntax'],
    },
    references: [
      {
        title: 'Redis Protocol specification (RESP)',
        url: 'https://redis.io/docs/reference/protocol-spec/',
        category: 'book_rfc',
        description: 'Industry standard wire framing for in-memory key-value stores.',
      },
      {
        title: 'Erlang stdlib: ets Module Reference',
        url: 'https://www.erlang.org/doc/apps/stdlib/ets.html',
        category: 'erlang_docs',
        description: 'High performance in-memory term storage tables in C.',
      },
    ],
  },
];
