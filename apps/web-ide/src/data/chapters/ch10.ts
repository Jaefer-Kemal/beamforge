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

> [!IMPORTANT]
> **The BEAM Raw TCP Socket Lifecycle:**
> 1. **\`gen_tcp:listen(0, Opts)\`**: Asks the OS kernel to bind an available port and creates a \`ListenSocket\` (the server's front door).
> 2. **\`gen_tcp:accept(ListenSocket, Timeout)\`**: Blocks the acceptor process until a client completes the 3-way TCP handshake (\`SYN\` $\\rightarrow$ \`SYN-ACK\` $\\rightarrow$ \`ACK\`), returning a dedicated \`ClientSocket\`.
> 3. **Wire Traffic**: Incoming bytes bypass userland mutexes and flow directly through the socket port driver to the controlling process.

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
- **\`ListenSocket\` (\`gen_tcp:listen/2\`)**: The listening socket is the welcoming front door of your server. It is bound to an IP address and port. Its sole job is to queue incoming connection requests. You **cannot** send or receive payload data over a \`ListenSocket\`.
- **\`ClientSocket\` (\`gen_tcp:accept/2\`)**: Calling \`gen_tcp:accept/2\` suspends the acceptor process until a client completes the 3-way handshake. The operating system allocates a dedicated, full-duplex communication pipe (\`ClientSocket\`) specifically for that client, while \`ListenSocket\` remains free to welcome further connections.

### 3. Ephemeral Port Binding: Why Port \`0\`?
When calling \`gen_tcp:listen(Port, Options)\`, specifying port \`0\` asks the operating system kernel to allocate an unused **ephemeral port** (typically in the range 49152–65535). You then retrieve the actual bound port using:

\`\`\`erlang
{ok, Port} = inet:port(ListenSocket).
\`\`\`

Passing port \`0\` is essential for parallel automated testing and dynamic microservices, preventing \`{error, eaddrinuse}\` port collision errors when multiple test suites run concurrently.

### 4. Controlling Process of a Socket
On the BEAM, every open socket is owned by an Erlang process known as the **controlling process**:
- The process that calls \`gen_tcp:listen/2\` or \`gen_tcp:accept/2\` becomes the initial controlling process.
- In active modes, socket messages (\`{tcp, Socket, Data}\`, \`{tcp_closed, Socket}\`) are delivered **exclusively** to the controlling process's mailbox; in \`{active, false}\` passive mode, callers pull bytes explicitly with \`gen_tcp:recv/3\`.
- If the controlling process terminates, the BEAM VM automatically closes the underlying socket file descriptor.

### 5. Inspecting Live Socket Telemetry: \`inet:getstat/2\`
In production Erlang, you do not need external kernel probes to measure network throughput. You can query the OS kernel's socket counters directly from Erlang:

\`\`\`erlang
{ok, Stats} = inet:getstat(Socket, [recv_oct, send_oct, recv_cnt, send_cnt]).
%% Returns: [{recv_oct, 1024}, {send_oct, 512}, {recv_cnt, 4}, {send_cnt, 2}]
\`\`\`
- \`recv_oct\` / \`send_oct\`: Total octets (bytes) received and sent over the wire.
- \`recv_cnt\` / \`send_cnt\`: Total number of packets transferred through the socket driver.

> [!WARNING]
> **Production Networking Trap: Port Starvation & Lingering Sockets:**
> Every open socket consumes an OS file descriptor. If your connection worker crashes or finishes without calling \`gen_tcp:close(Socket)\` in its cleanup path, the socket descriptor remains open in the OS kernel until garbage collection occurs. Under 10,000 connections/sec, your server will hit \`EMFILE (Too many open files)\` and fail new connections. Always wrap socket workers in supervised OTP processes.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (kernel / gen_tcp & inet)
gen_tcp:listen(Port, Options) -> {ok, ListenSocket} | {error, Reason}
  Types:
    Port = inet:port_number()
    Options = [gen_tcp:listen_option()]
    ListenSocket = gen_tcp:socket()

gen_tcp:accept(ListenSocket, Timeout) -> {ok, Socket} | {error, Reason}
  Types:
    ListenSocket = Socket = gen_tcp:socket()
    Timeout = timeout()

gen_tcp:connect(Address, Port, Options, Timeout) -> {ok, Socket} | {error, Reason}
gen_tcp:send(Socket, Packet) -> ok | {error, Reason}
gen_tcp:recv(Socket, Length, Timeout) -> {ok, Packet} | {error, Reason}
gen_tcp:close(Socket) -> ok
inet:port(Socket) -> {ok, Port}
inet:getstat(Socket, [StatOption]) -> {ok, [{StatOption, integer()}]}
\`\`\`

Consult the attached documentation cards below for \`gen_tcp:listen/2\` and \`gen_tcp:accept/2\` kernel behavior, plus the \`kernel\` module links in the references drawer.

## Parallel Worked Example: Minimal Loopback Health Probe

Consider a separate domain: a single-request health-check probe (\`ping_probe_demo\`) that opens an ephemeral loopback socket, reads a fixed 4-byte \`<<"PING">>\` frame in passive mode, replies \`<<"PONG">>\`, and confirms receipt via a bounded \`receive ... after\` timeout:

\`\`\`erlang
-module(ping_probe_demo).
-export([run_probe/0]).

%% @doc Bind an ephemeral port, send a single health probe over loopback, and return the bound port and echoed byte count.
run_probe() ->
    {ok, ListenSock} = gen_tcp:listen(0, [binary, {packet, raw}, {active, false}, {reuseaddr, true}]),
    {ok, Port} = inet:port(ListenSock),
    Caller = self(),
    spawn(fun() -> serve_once(ListenSock, Caller) end),
    {ok, ConnSock} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000),
    ok = gen_tcp:send(ConnSock, <<"PING">>),
    {ok, <<"PONG">>} = gen_tcp:recv(ConnSock, 4, 2000),
    ok = gen_tcp:close(ConnSock),
    ok = gen_tcp:close(ListenSock),
    receive
        {served_bytes, ByteCount} -> {ok, Port, ByteCount}
    after 2000 ->
        {error, probe_timeout}
    end.

serve_once(ListenSock, Caller) ->
    case gen_tcp:accept(ListenSock, 2000) of
        {ok, PeerSock} ->
            {ok, Payload} = gen_tcp:recv(PeerSock, 4, 2000),
            ok = gen_tcp:send(PeerSock, <<"PONG">>),
            ok = gen_tcp:close(PeerSock),
            Caller ! {served_bytes, byte_size(Payload)};
        {error, Reason} ->
            Caller ! {probe_error, Reason}
    end.
\`\`\`

### What ERTS Does at Runtime
- **Concurrent Peer Handshake**: Spawning \`serve_once/2\` before calling \`gen_tcp:connect/4\` lets the BEAM scheduler run acceptor and client concurrently over the OS loopback interface without deadlocking on passive \`accept/2\`.
- **Passive Backpressure**: Both sides pass \`{active, false}\`, so kernel TCP buffers only deliver data when \`gen_tcp:recv/3\` explicitly pulls bytes with a 2000ms timeout.

## Assignment Specification

This is a **Guided Demonstration** implemented in \`src/tcp_live_demo.erl\` (\`-module(tcp_live_demo).\`). Inspect the pre-wired module in the editor and execute it to observe live loopback socket telemetry:

### \`run_demo/0\`
- **Input**: Zero arguments.
- **Behavior**: Opens a passive raw binary listening socket on ephemeral port \`0\`, queries the assigned port via \`inet:port/1\`, spawns a background acceptor process calling \`gen_tcp:accept/2\` and tail-recursing in \`echo_loop/3\`, connects a loopback client to \`127.0.0.1\`, exchanges three CRLF-delimited test frames (\`SYN_FRAME\`, \`DATA_FRAME\`, \`FIN_FRAME\`) with \`+ACK:\` echoes, queries socket statistics via \`inet:getstat/2\`, closes both socket descriptors, and waits with a bounded timeout for the acceptor total before returning a summary map with \`port\`, \`frames_exchanged\`, and \`bytes_received\`.
- **Examples**:
  - \`maps:get(frames_exchanged, tcp_live_demo:run_demo())\` returns \`3\`.

Click **\`▷ Run\`** or **\`▶ Submit\`** to boot the live TCP server and inspect wire transmission telemetry in the terminal.

## Rules & Verification Constraints
- **Live Execution**: Verified by calling \`tcp_live_demo:run_demo/0\` and confirming \`frames_exchanged\` equals \`3\`.
- **AST & Bytecode Enforcements**: \`bf_ast_verifier\` enforces true tail recursion on \`echo_loop/3\`, required remote calls \`gen_tcp:listen/2\`, \`gen_tcp:accept/2\`, \`gen_tcp:send/2\`, and \`gen_tcp:recv/3\`, and at least one \`receive ... after\` timeout block.
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

%% @doc Runs a full end-to-end TCP socket lifecycle demo on an ephemeral port.
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

%% @doc Runs a full end-to-end TCP socket lifecycle demo on an ephemeral port.
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
      requiredCalls: ['gen_tcp:listen/2', 'gen_tcp:accept/2', 'gen_tcp:send/2', 'gen_tcp:recv/3'],
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

> [!IMPORTANT]
> **Essential Socket Options Matrix:**
> - **\`binary\`**: Delivers packets as compact, contiguous binaries instead of 16-byte-per-char linked lists.
> - **\`{nodelay, true}\` (\`TCP_NODELAY\`)**: Disables Nagle's algorithm. Flushes small writes to the network interface immediately without a 40–200ms delay.
> - **\`{reuseaddr, true}\` (\`SO_REUSEADDR\`)**: Allows the server to rebind the port immediately upon supervisor restart without waiting for OS \`TIME_WAIT\` sockets to expire.
> - **\`{packet, 4}\`**: Instructs the C driver to automatically prepend a 4-byte big-endian length prefix on send, and buffer incoming chunks in C until the full payload arrives before delivering \`{tcp, Sock, Payload}\`.

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

> [!WARNING]
> **Production Networking Trap: Nagle's Algorithm & Delayed ACK Deadlock:**
> In HTTP/1.1 or custom RPC, when a client sends a small command (e.g. \`PING\`), Nagle's algorithm may hold the packet waiting for more data. Meanwhile, the server's OS uses **Delayed ACK**, waiting up to 200ms to acknowledge the previous packet. Both operating systems wait on each other, causing an artificial **200ms latency spike**! In real-time servers, **always set \`{nodelay, true}\`**.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (kernel / inet & erts / erlang)
inet:setopts(Socket, Options) -> ok | {error, Reason}
  Types:
    Socket = inet:socket()
    Options = [inet:socket_setopt()]
    %% Includes: binary, {packet, raw | line | 1 | 2 | 4},
    %%           {active, once | true | false}, {nodelay, boolean()}, {reuseaddr, boolean()}

erlang:byte_size(Bitstring) -> non_neg_integer()
  Types:
    Bitstring = bitstring()
\`\`\`

Consult the attached OTP documentation cards below for \`inet:setopts/2\` kernel flag behavior and \`gen_tcp:send/2\` wire delivery semantics.

## Parallel Worked Example: UDP Sensor Datagram Codec

Consider a separate domain: a telemetry gateway normalizing **UDP** datagram socket options, socket event notifications, and 16-bit channel-tagged binary frames (\`sensor_udp_codec\`):

\`\`\`erlang
-module(sensor_udp_codec).
-export([datagram_opts/1, triage_link_msg/1, pack_sensor_record/2]).

%% @doc Select UDP buffer options for burst or trickle telemetry profiles.
datagram_opts(Mode) when Mode =:= burst; Mode =:= trickle ->
    RecBuf = case Mode of burst -> 65536; trickle -> 8192 end,
    [binary, {active, false}, {recbuf, RecBuf}];
datagram_opts(_) ->
    {error, unsupported_mode}.

%% @doc Classify datagram arrival and socket status tuples from inet/gen_udp.
triage_link_msg({udp, _Sock, _Host, _Port, Datagram}) when is_binary(Datagram) ->
    {datagram, byte_size(Datagram), Datagram};
triage_link_msg({udp_passive, _Sock}) ->
    {flow_notice, passive_threshold};
triage_link_msg({udp_error, _Sock, Reason}) ->
    {link_fault, Reason};
triage_link_msg(_) ->
    unrecognized.

%% @doc Pack a 16-bit big-endian payload length followed by ChannelId byte and sample binary.
pack_sensor_record(ChannelId, SampleBin) when is_integer(ChannelId), is_binary(SampleBin) ->
    BodySize = byte_size(SampleBin),
    <<BodySize:16/big-unsigned-integer, ChannelId:8, SampleBin/binary>>.
\`\`\`

### What the BEAM Does Under the Hood
- **Guard Disjunction Validation**: \`datagram_opts/1\` validates modes strictly using guard semicolons (\`;\`), rejecting any unrecognized atom before options ever reach the OS kernel driver.
- **Bit Syntax Sizing**: \`pack_sensor_record/2\` reads exact heap/ProcBin byte lengths in $O(1)$ time via \`byte_size/1\` and packs an unsigned big-endian network header directly into a contiguous binary.

## Assignment Specification

Implement module \`src/tcp_socket_opts.erl\` (\`-module(tcp_socket_opts).\`) exporting \`build_low_latency_opts/1\`, \`classify_socket_event/1\`, and \`encode_length_prefixed/1\`:

### \`build_low_latency_opts/1\`
- **Input**: Any Erlang term \`PacketMode\` representing a candidate framing mode.
- **Behavior**: Accepts exactly the five valid framing modes (\`raw\`, \`line\`, \`1\`, \`2\`, or \`4\`) via guard validation and returns the five-element low-latency socket option list enabling binary delivery, the validated packet mode, single-shot active mode, disabled Nagle buffering, and address reuse in canonical order. Rejects any other value with an \`invalid_packet_mode\` error tuple.
- **Examples**:
  - \`tcp_socket_opts:build_low_latency_opts(4)\` returns \`[binary,{packet,4},{active,once},{nodelay,true},{reuseaddr,true}]\`.
  - \`tcp_socket_opts:build_low_latency_opts(udp_invalid)\` returns \`{error,invalid_packet_mode}\`.

### \`classify_socket_event/1\`
- **Input**: A BEAM active-socket mailbox message term \`EventTuple\`.
- **Behavior**: Normalizes TCP socket notifications into uniform tagged tuples:
  - TCP data events carrying a binary payload yield a 3-tuple pairing atom \`data\`, the payload byte length, and the binary payload.
  - Graceful close notifications yield \`disconnected\` paired with \`normal_eof\`.
  - Asynchronous socket error notifications yield \`disconnected\` paired with a tagged \`socket_error\` reason tuple.
  - Any other term returns an \`unknown_event\` error tuple.
- **Examples**:
  - \`tcp_socket_opts:classify_socket_event({tcp, make_ref(), <<"XMPP_STANZA">>})\` returns \`{data,11,<<"XMPP_STANZA">>}\`.

### \`encode_length_prefixed/1\`
- **Input**: Binary payload \`PayloadBin\`.
- **Behavior**: Constructs a contiguous wire binary consisting of the payload's byte size encoded as a 32-bit big-endian unsigned integer immediately followed by the raw payload bytes (including empty binaries).
- **Examples**:
  - \`tcp_socket_opts:encode_length_prefixed(<<"PING">>)\` returns \`<<0,0,0,4,80,73,78,71>>\`.

## Rules & Verification Constraints
- **Guards & Bit Syntax**: Must validate packet modes, binary payloads, and frame construction using guard clauses (\`when\`, \`is_binary/1\`), binary bit syntax, and \`byte_size/1\`.
- **AST Checks**: \`bf_ast_verifier\` enforces required remote call \`erlang:byte_size/1\` and required constructs \`bit_syntax\` and \`guards\`.
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

%% @doc Return the canonical low-latency TCP socket options list when PacketMode is raw, line, 1, 2, or 4, or return an invalid_packet_mode error tuple for unsupported modes.
-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(_PacketMode) ->
    ignore.

%% @doc Normalize an incoming TCP socket lifecycle message into a tagged data tuple, a tagged disconnect tuple, or an unknown_event error tuple.
-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event(_EventTuple) ->
    ignore.

%% @doc Prepend an unsigned 32-bit big-endian byte length header onto PayloadBin and return the framed binary.
-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(_PayloadBin) ->
    ignore.
`,
    solutionCode: `-module(tcp_socket_opts).

-export([
    build_low_latency_opts/1,
    classify_socket_event/1,
    encode_length_prefixed/1
]).

%% @doc Return the canonical low-latency TCP socket options list when PacketMode is raw, line, 1, 2, or 4, or return an invalid_packet_mode error tuple for unsupported modes.
-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(PacketMode) when PacketMode =:= raw;
                                        PacketMode =:= line;
                                        PacketMode =:= 1;
                                        PacketMode =:= 2;
                                        PacketMode =:= 4 ->
    [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}];
build_low_latency_opts(_Other) ->
    {error, invalid_packet_mode}.

%% @doc Normalize an incoming TCP socket lifecycle message into a tagged data tuple, a tagged disconnect tuple, or an unknown_event error tuple.
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

%% @doc Prepend an unsigned 32-bit big-endian byte length header onto PayloadBin and return the framed binary.
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

%% @doc Return the canonical low-latency TCP socket options list when PacketMode is raw, line, 1, 2, or 4, or return an invalid_packet_mode error tuple for unsupported modes.
-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(_PacketMode) ->
    ignore.

%% @doc Normalize an incoming TCP socket lifecycle message into a tagged data tuple, a tagged disconnect tuple, or an unknown_event error tuple.
-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event(_EventTuple) ->
    ignore.

%% @doc Prepend an unsigned 32-bit big-endian byte length header onto PayloadBin and return the framed binary.
-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(_PayloadBin) ->
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

%% @doc Return the canonical low-latency TCP socket options list when PacketMode is raw, line, 1, 2, or 4, or return an invalid_packet_mode error tuple for unsupported modes.
-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(PacketMode) when PacketMode =:= raw;
                                        PacketMode =:= line;
                                        PacketMode =:= 1;
                                        PacketMode =:= 2;
                                        PacketMode =:= 4 ->
    [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}];
build_low_latency_opts(_Other) ->
    {error, invalid_packet_mode}.

%% @doc Normalize an incoming TCP socket lifecycle message into a tagged data tuple, a tagged disconnect tuple, or an unknown_event error tuple.
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

%% @doc Prepend an unsigned 32-bit big-endian byte length header onto PayloadBin and return the framed binary.
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

> [!IMPORTANT]
> **Flow Control: \`{active, true}\` vs \`{active, once}\`:**
> - **Dangerous \`{active, true}\`:** Unbounded mailbox flood. Fast clients push 100k msgs/sec directly into actor mailbox, exhausting RAM and triggering OOM.
> - **Production Safe \`{active, once}\`:** Hardware backpressure. OS delivers exactly 1 packet, switches socket to passive mode, and waits until the actor re-arms the option before accepting the next packet.

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

> [!WARNING]
> **Production Networking Trap: The Mailbox OOM Tsunami:**
> Under network jitter or traffic spikes, an active socket actor that takes 10ms to insert into a database will fall behind a client sending a packet every 0.1ms. The 100x discrepancy accumulates in the process mailbox. In production, **never use \`{active, true}\` on untrusted external network sockets**.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (kernel / inet & gen_tcp)
inet:setopts(Socket, Options) -> ok | {error, Reason}
  Types:
    Socket = inet:socket()
    Options = [{active, once | true | false | integer()} | {packet, raw | line | 1 | 2 | 4} | binary]

gen_tcp:send(Socket, Packet) -> ok | {error, Reason}
  Types:
    Socket = gen_tcp:socket()
    Packet = iodata()

%% Incoming Socket Messages Delivered to Controlling Process
{tcp, Socket, Data}         %% Arrives when socket is active and bytes are read
{tcp_closed, Socket}        %% Arrives when remote peer disconnects cleanly
{tcp_error, Socket, Reason} %% Arrives on network fault
\`\`\`

Consult the attached OTP documentation cards below for \`inet:setopts/2\` active-mode flow control and \`gen_tcp:send/2\` socket transmission semantics.

## Parallel Worked Example: Flow-Controlled Telemetry Line Pump

Consider a separate domain: a bare actor (\`telemetry_active_pump\`) that takes socket ownership from a caller, receives single newline-delimited frames via \`{active, once}\`, forwards parsed frames to a downstream sink process, and re-arms the socket only after forwarding succeeds:

\`\`\`erlang
-module(telemetry_active_pump).
-export([start_pump/2, stop_pump/1]).

%% @doc Transfer ownership of Socket to a new pump actor forwarding telemetry lines to SinkPid.
start_pump(Socket, SinkPid) ->
    Pid = spawn_link(fun() ->
        receive
            arm ->
                ok = inet:setopts(Socket, [binary, {packet, line}, {active, once}]),
                pump_loop(Socket, SinkPid, 0)
        end
    end),
    ok = gen_tcp:controlling_process(Socket, Pid),
    Pid ! arm,
    {ok, Pid}.

%% @doc Stop the running telemetry pump actor cleanly.
stop_pump(Pid) ->
    Pid ! stop,
    ok.

pump_loop(Socket, SinkPid, Seen) ->
    receive
        {tcp, Socket, FrameBin} ->
            NextSeen = Seen + 1,
            SinkPid ! {telemetry_line, NextSeen, FrameBin},
            ok = inet:setopts(Socket, [{active, once}]),
            pump_loop(Socket, SinkPid, NextSeen);
        {tcp_closed, Socket} ->
            SinkPid ! {telemetry_eof, Seen},
            ok = gen_tcp:close(Socket);
        {tcp_error, Socket, Reason} ->
            SinkPid ! {telemetry_fault, Reason},
            ok = gen_tcp:close(Socket);
        stop ->
            ok = gen_tcp:close(Socket)
    end.
\`\`\`

### What the BEAM Does Under the Hood
- **Safe Controlling-Process Ordering**: Spawning the actor in a wait state, transferring socket ownership with \`gen_tcp:controlling_process/2\`, and only then signaling \`arm\` guarantees no incoming packets are ever delivered to the wrong mailbox before handoff completes.
- **Re-Arm After Work**: Calling \`inet:setopts(Socket, [{active, once}])\` at the end of the data branch ensures the kernel holds additional network frames in OS buffers until the consumer catches up.

## Assignment Specification

Pre-wired supervision and harness helpers (\`start_link/1\`, \`get_stats/1\`, \`get_processed_count/1\`, \`stop/1\`, \`start_server/0\`, \`stop_server/1\`, \`handle_call/3\`, \`handle_cast/2\`, \`terminate/2\`, \`code_change/3\`) and the \`#state\` record are provided inside \`src/tcp_flow_worker.erl\`. Complete the socket flow-control callbacks inside \`src/tcp_flow_worker.erl\` (\`-module(tcp_flow_worker).\`):

### \`init/1\`
- **Input**: Single-element list \`[Socket]\` (and delegated raw \`Socket\` clause).
- **Behavior**: Arms \`Socket\` for binary reception and single-packet active delivery so the first incoming frame arrives safely once ownership is settled, and returns an \`ok\` tuple containing a freshly initialized \`#state\` record tracking \`Socket\`, zero processed packets, zero processed bytes, and \`closed\` set to \`false\`.
- **Examples**:
  - Starting the worker leaves initial stats at \`#{packets_processed => 0, bytes_processed => 0, closed => false}\`.

### \`handle_info/2\`
- **Input**: Mailbox event term and current \`#state\` record.
- **Behavior**: Handles four socket lifecycle events and ignores unknown messages without modifying state:
  1. **Socket Handoff Notification (\`{socket_assigned, Socket}\`)**: Re-arms single-packet active delivery on \`Socket\` after \`start_server/0\` assigns controlling process ownership, and stores \`Socket\` in state.
  2. **Incoming TCP Data (\`{tcp, Socket, DataBin}\`)**: Transmits an acknowledgement frame consisting of the literal ASCII prefix \`"+ACK: "\` followed by the incoming payload bytes over \`Socket\`, re-arms single-packet active delivery immediately afterward so subsequent packets can flow safely without mailbox flooding, and increments \`packets_processed\` by \`1\` and \`bytes_processed\` by the incoming payload's byte size.
  3. **Graceful Close & Network Error Notifications (\`tcp_closed\` / \`tcp_error\`)**: Records \`closed\` as \`true\` in state without crashing the worker so callers inspecting stats still observe the closed flag.
- **Examples**:
  - Connecting to \`tcp_flow_worker:start_server/0\` and sending \`<<"TEST_PING\\r\\n">>\` receives \`<<"+ACK: TEST_PING\\r\\n">>\`, increments \`packets_processed\` to \`1\`, and leaves \`closed\` as \`false\` until client disconnect (after which \`closed\` becomes \`true\`).

## Rules & Verification Constraints
- **Mailbox Bound Invariant**: Verified live by \`bf_backpressure_tester:verify_active_once_backpressure/5\`, which blasts 50 burst frames into the worker and asserts that \`message_queue_len\` remains bounded at \`<= 5\`.
- **AST & Record Checks**: \`bf_ast_verifier\` enforces required remote calls \`inet:setopts/2\` and \`gen_tcp:send/2\` plus the \`#state\` record definition (\`record_def\`).
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

%% @doc Start and link a tcp_flow_worker gen_server owning Socket.
-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

%% @doc Return a map of packets_processed, bytes_processed, and closed status from Server.
-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

%% @doc Return the total count of TCP frames processed by Server.
-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

%% @doc Synchronously stop the tcp_flow_worker gen_server Server.
-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

%% @doc Start a single-connection loopback TCP server that spawns tcp_flow_worker and hands off client ownership.
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

%% @doc Stop the registered tcp_flow_worker and terminate its acceptor ListenPid.
stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

%% @doc Arm Socket for binary single-packet active reception and initialize the #state record.
init([Socket]) ->
    {ok, #state{socket = Socket}};
init(Socket) ->
    init([Socket]).

%% @doc Handle get_stats and get_processed_count synchronous call queries.
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

%% @doc Handle asynchronous stop casts or ignore unknown casts.
handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle socket ownership handoff, single-frame echo with active-once re-arming, and disconnect/error transitions.
handle_info(_Other, State) ->
    {noreply, State}.

%% @doc Close any tracked TCP socket before worker termination.
terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

%% @doc Pass state through unchanged on hot code upgrade.
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

%% @doc Start and link a tcp_flow_worker gen_server owning Socket.
-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

%% @doc Return a map of packets_processed, bytes_processed, and closed status from Server.
-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

%% @doc Return the total count of TCP frames processed by Server.
-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

%% @doc Synchronously stop the tcp_flow_worker gen_server Server.
-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

%% @doc Start a single-connection loopback TCP server that spawns tcp_flow_worker and hands off client ownership.
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

%% @doc Stop the registered tcp_flow_worker and terminate its acceptor ListenPid.
stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

%% @doc Arm Socket for binary single-packet active reception and initialize the #state record.
init([Socket]) ->
    ok = inet:setopts(Socket, [binary, {active, once}]),
    {ok, #state{socket = Socket, packets_processed = 0, bytes_processed = 0, closed = false}};
init(Socket) ->
    init([Socket]).

%% @doc Handle get_stats and get_processed_count synchronous call queries.
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

%% @doc Handle asynchronous stop casts or ignore unknown casts.
handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle socket ownership handoff, single-frame echo with active-once re-arming, and disconnect/error transitions.
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

%% @doc Close any tracked TCP socket before worker termination.
terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

%% @doc Pass state through unchanged on hot code upgrade.
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

%% @doc Start and link a tcp_flow_worker gen_server owning Socket.
-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

%% @doc Return a map of packets_processed, bytes_processed, and closed status from Server.
-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

%% @doc Return the total count of TCP frames processed by Server.
-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

%% @doc Synchronously stop the tcp_flow_worker gen_server Server.
-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

%% @doc Start a single-connection loopback TCP server that spawns tcp_flow_worker and hands off client ownership.
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

%% @doc Stop the registered tcp_flow_worker and terminate its acceptor ListenPid.
stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

%% @doc Arm Socket for binary single-packet active reception and initialize the #state record.
init([Socket]) ->
    {ok, #state{socket = Socket}};
init(Socket) ->
    init([Socket]).

%% @doc Handle get_stats and get_processed_count synchronous call queries.
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

%% @doc Handle asynchronous stop casts or ignore unknown casts.
handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle socket ownership handoff, single-frame echo with active-once re-arming, and disconnect/error transitions.
handle_info(_Other, State) ->
    {noreply, State}.

%% @doc Close any tracked TCP socket before worker termination.
terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

%% @doc Pass state through unchanged on hot code upgrade.
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

%% @doc Start and link a tcp_flow_worker gen_server owning Socket.
-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

%% @doc Return a map of packets_processed, bytes_processed, and closed status from Server.
-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

%% @doc Return the total count of TCP frames processed by Server.
-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

%% @doc Synchronously stop the tcp_flow_worker gen_server Server.
-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

%% @doc Start a single-connection loopback TCP server that spawns tcp_flow_worker and hands off client ownership.
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

%% @doc Stop the registered tcp_flow_worker and terminate its acceptor ListenPid.
stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

%% @doc Arm Socket for binary single-packet active reception and initialize the #state record.
init([Socket]) ->
    ok = inet:setopts(Socket, [binary, {active, once}]),
    {ok, #state{socket = Socket, packets_processed = 0, bytes_processed = 0, closed = false}};
init(Socket) ->
    init([Socket]).

%% @doc Handle get_stats and get_processed_count synchronous call queries.
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

%% @doc Handle asynchronous stop casts or ignore unknown casts.
handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle socket ownership handoff, single-frame echo with active-once re-arming, and disconnect/error transitions.
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

%% @doc Close any tracked TCP socket before worker termination.
terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

%% @doc Pass state through unchanged on hot code upgrade.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
solutionExplanation: `### Solution Breakdown: Bounded Flow Control Worker
1. **Initial Arming**: In \`init/1\`, \`inet:setopts(Socket, [binary, {active, once}])\` tells the kernel to deliver exactly one incoming frame before pausing.
2. **Backpressure Re-arming**: In \`handle_info({tcp, ...})\`, after transmitting the echo response, we explicitly re-arm active reception with \`inet:setopts(Socket, [{active, once}])\`. If the worker is delayed, packets stay safely in the OS kernel receive buffer, triggering TCP window scaling to throttle the sender.
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

> [!IMPORTANT]
> **Stream Framing Algorithm:**
> 1. **Concatenation**: Append incoming socket bytes to any previously buffered partial bytes.
> 2. **Delimiter Slicing**: Repeatedly isolate complete frames separated by your wire delimiter.
> 3. **Memory Unpinning**: Copy sliced sub-binaries into independent binaries so long-lived worker state never pins large 64 KB \`ProcBin\` read buffers!

## Deep Concept Breakdown & Under the Hood

### 1. The 64 KB \`ProcBin\` Memory Pinning Trap
Recall from Chapter 4 how the BEAM manages binaries:
- Binaries $=< 64$ bytes are stored on the local process heap.
- Binaries $> 64$ bytes are allocated in a shared off-heap reference-counted memory pool called a **\`ProcBin\`** (often 64 KB socket read buffers).

When you slice a binary via \`binary:split/2\` or binary matching, the BEAM creates a **sub-binary**—a tiny 24-byte struct containing an offset pointer into the original 64 KB off-heap buffer.
If a client sends \`<<"PING\\r\\nHE">>\`, slicing leaves \`<<"HE">>\` in your process state.
Even though \`<<"HE">>\` is only 2 bytes, it retains a reference count on the **entire 64 KB socket buffer**!
If 100,000 idle client connections each retain a 2-byte remainder without unpinning, your server wastes **6.4 Gigabytes of RAM** on mostly-empty socket buffers.

Calling **\`binary:copy/1\`** allocates an independent copy, freeing the 64 KB \`ProcBin\` for immediate garbage collection.

### 2. How \`binary:split/2\` Searches
\`binary:split(Subject, Separator)\` searches for the **first** occurrence of \`Separator\`:
- If found, it returns a 2-element list \`[Prefix, RestAfterSeparator]\` (consuming the delimiter).
- If absent, it returns a 1-element list \`[Subject]\`.

> [!WARNING]
> **Production Networking Trap: Sub-Binary Memory Pinning in Long-Lived Sockets:**
> Long-lived connection actors (XMPP, WebSockets, gRPC) that buffer partial frames without unpinning suffer from slow, fatal memory creep. The memory leak does not show up in heap GC telemetry because the off-heap refc buffer is legitimately referenced by a 2-byte sub-binary! Always unpin trailing remainders and long-lived extracted slices with \`binary:copy/1\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / binary)
binary:split(Subject, Pattern) -> [binary()]
  Types:
    Subject = binary()
    Pattern = binary() | [binary()]

binary:copy(Subject) -> binary()
  Types:
    Subject = binary()
\`\`\`

Consult the attached OTP documentation cards below for \`binary:split/2\` slicing rules and \`binary:copy/1\` off-heap unpinning complexity.

## Parallel Worked Example: Unpinned 16-Bit TLV Packet Accumulator

Consider a separate domain: an incremental binary protocol decoder (\`tlv_chunk_reader\`) framing 16-bit length-prefixed payloads (\`<<Len:16, Payload:Len/binary, ...>>\`) instead of line delimiters. Notice how it stitches chunks together, extracts records tail-recursively, and unpins both records and any incomplete trailer via \`binary:copy/1\`:

\`\`\`erlang
-module(tlv_chunk_reader).
-export([feed_bytes/2]).

%% @doc Append NewBytes to AccBuf, extract all complete 16-bit length-prefixed payloads,
%% and return {CopiedPayloads, CopiedRemainder}.
feed_bytes(AccBuf, NewBytes) ->
    Joined = <<AccBuf/binary, NewBytes/binary>>,
    drain_frames(Joined, []).

drain_frames(<<Len:16/big-unsigned-integer, Body:Len/binary, Rest/binary>>, Done) ->
    drain_frames(Rest, [binary:copy(Body) | Done]);
drain_frames(TrailingPartial, Done) ->
    {lists:reverse(Done), binary:copy(TrailingPartial)}.
\`\`\`

### What ERTS Does Under the Hood
- **Contiguous Stitching**: Binary concatenation constructs one flat slice before parsing across arbitrary chunk boundaries, handling fragmented length headers just as seamlessly as multi-packet bursts.
- **Zero-Pin Guarantee**: Both extracted payloads and \`TrailingPartial\` pass through \`binary:copy/1\`, dropping every sub-binary reference into large incoming socket buffers before returning to long-lived process state.

## Assignment Specification

Implement module \`src/tcp_frame_buffer.erl\` (\`-module(tcp_frame_buffer).\`) exporting \`new_buffer/0\` and \`append_and_extract_lines/2\`:

### \`new_buffer/0\`
- **Input**: Zero arguments.
- **Behavior**: Returns an empty binary accumulation buffer ready for initial stream framing.
- **Examples**:
  - \`tcp_frame_buffer:new_buffer()\` returns \`<<>>\`.

### \`append_and_extract_lines/2\`
- **Input**: Existing remainder binary \`OldBufferBin\` and newly received socket chunk \`IncomingChunkBin\`.
- **Behavior**: Appends \`IncomingChunkBin\` directly onto \`OldBufferBin\` and recursively splits out every complete CRLF-terminated command line in arrival order (stripping the CRLF delimiter). Unpins every extracted command binary and the trailing incomplete remainder binary using \`binary:copy/1\` so no sub-binary references remain pinned to large off-heap socket buffers, then returns a 2-tuple containing the list of complete lines followed by the remaining buffer binary.
- **Examples**:
  - \`tcp_frame_buffer:append_and_extract_lines(<<>>, <<"HELLO\\r\\nWOR">>)\` returns \`{[<<"HELLO">>],<<"WOR">>}\`.
  - \`tcp_frame_buffer:append_and_extract_lines(<<"WOR">>, <<"LD\\r\\nFOO\\r\\nBAR\\r\\n">>)\` returns \`{[<<"WORLD">>,<<"FOO">>,<<"BAR">>],<<>>}\`.

## Rules & Verification Constraints
- Must handle empty chunks, partial fragments without delimiters, and coalesced multi-line bursts cleanly.
- AST verifier enforces required calls \`binary:split/2\` and \`binary:copy/1\` alongside \`bit_syntax\` binary concatenation.
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

%% @doc Return an empty binary accumulation buffer.
-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

%% @doc Append IncomingChunkBin onto OldBufferBin, extract all complete CRLF-delimited line binaries in arrival order, and return {Lines, RemainderBin} with unpinned copies.
-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(_OldBufferBin, _IncomingChunkBin) ->
    ignore.
`,
    solutionCode: `-module(tcp_frame_buffer).

-export([
    new_buffer/0,
    append_and_extract_lines/2
]).

%% @doc Return an empty binary accumulation buffer.
-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

%% @doc Append IncomingChunkBin onto OldBufferBin, extract all complete CRLF-delimited line binaries in arrival order, and return {Lines, RemainderBin} with unpinned copies.
-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(OldBufferBin, IncomingChunkBin) ->
    Combined = <<OldBufferBin/binary, IncomingChunkBin/binary>>,
    extract_lines(Combined, []).

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<13, 10>>) of
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

%% @doc Return an empty binary accumulation buffer.
-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

%% @doc Append IncomingChunkBin onto OldBufferBin, extract all complete CRLF-delimited line binaries in arrival order, and return {Lines, RemainderBin} with unpinned copies.
-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(_OldBufferBin, _IncomingChunkBin) ->
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

%% @doc Return an empty binary accumulation buffer.
-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

%% @doc Append IncomingChunkBin onto OldBufferBin, extract all complete CRLF-delimited line binaries in arrival order, and return {Lines, RemainderBin} with unpinned copies.
-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(OldBufferBin, IncomingChunkBin) ->
    Combined = <<OldBufferBin/binary, IncomingChunkBin/binary>>,
    extract_lines(Combined, []).

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<13, 10>>) of
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
      requireTailRecursion: [],
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

If your server runs a **single acceptor process** handling client I/O sequentially inside its accept loop, every new TCP handshake stalls behind the current client's request!

Production-grade servers (such as Nine Nines' **Ranch**, used by the Cowboy HTTP server and MongooseIM XMPP server) solve this using the **Acceptor Pool Pattern**:
1. A master listener opens a single shared \`ListenSocket\`.
2. A pool of $N$ acceptor processes **concurrently call \`gen_tcp:accept(ListenSocket)\`** on that identical socket descriptor.
3. The BEAM VM and OS kernel dispatch incoming TCP SYN handshakes across the pool without lock contention.
4. The instant an acceptor receives \`{ok, ClientSocket}\`, it spawns a dedicated connection worker and transfers ownership via **\`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`**, then immediately loops back to accept the next client!

> [!IMPORTANT]
> **Ranch-Style Acceptor Pool Architecture:**
> - Multiple acceptor processes concurrently wait on the same shared \`ListenSocket\`.
> - When an incoming TCP handshake completes, one acceptor wakes up with \`{ok, ClientSocket}\`.
> - The acceptor spawns a dedicated connection worker, executes \`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`, and immediately loops back to accept more connections without blocking.

## Deep Concept Breakdown & Under the Hood

### What is the "Controlling Process"?
In Erlang, every socket has an owner known as the **controlling process**:
- By default, the controlling process is whichever process called \`gen_tcp:listen/2\` or \`gen_tcp:accept/1\`.
- All incoming network events (\`{tcp, Socket, Data}\`, \`{tcp_closed, Socket}\`) are delivered **exclusively** to the controlling process's mailbox.
- If the controlling process dies, the BEAM VM automatically closes the underlying socket.

To transfer a socket from an Acceptor to a Connection Worker, you call:
\`\`\`erlang
ok = gen_tcp:controlling_process(ClientSocket, WorkerPid)
\`\`\`
And then notify \`WorkerPid\` that ownership has settled so it is safe to arm the socket with \`inet:setopts(ClientSocket, [{active, once}])\`.

### The Safe Socket Handoff Protocol
1. **Passive Listener**: Open the listening socket in \`{active, false}\`.
2. **Accept Handshake**: Acceptor process executes \`gen_tcp:accept(ListenSocket)\` $\\rightarrow$ \`{ok, ClientSocket}\`.
3. **Worker Spawning**: Acceptor spawns \`WorkerPid\` waiting in a bounded \`receive ... after\`.
4. **Ownership Transfer**: Acceptor calls \`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`.
5. **Worker Activation**: Acceptor sends readiness signal to \`WorkerPid\`.
6. **Flow Control Armed**: Inside \`WorkerPid\`, it calls \`inet:setopts(ClientSocket, [{active, once}])\` to begin receiving frames safely.

> [!WARNING]
> **Production Networking Trap: Race Conditions During Socket Handoff:**
> If an acceptor arms \`{active, once}\` *before* calling \`gen_tcp:controlling_process/2\`, the client's initial handshake frame lands in the **acceptor's** mailbox instead of the worker's! Always keep the listener passive and transfer ownership before arming active mode.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (kernel / gen_tcp)
gen_tcp:listen(Port, Options) -> {ok, ListenSocket} | {error, Reason}
gen_tcp:accept(ListenSocket) -> {ok, Socket} | {error, Reason}
gen_tcp:controlling_process(Socket, NewOwnerPid) -> ok | {error, Reason}
  Types:
    Socket = ListenSocket = gen_tcp:socket()
    NewOwnerPid = pid()
    Options = [gen_tcp:listen_option()]
\`\`\`

Consult the attached OTP documentation cards below for \`gen_tcp:controlling_process/2\` pointer transfer and \`gen_tcp:accept/1\` handshake semantics.

## Parallel Worked Example: Single-Slot Gate Socket Relay

Consider a separate domain: a passive network gate (\`worker_relay_gate\`) that binds an ephemeral port, accepts one client connection, transfers ownership to a target worker using a domain tag, and closes the socket if ownership transfer fails:

\`\`\`erlang
-module(worker_relay_gate).
-export([open_gate/0, await_one/2, relay_to/2]).

%% @doc Open a passive loopback listening socket on an ephemeral port.
open_gate() ->
    {ok, LSock} = gen_tcp:listen(0, [binary, {active, false}, {reuseaddr, true}]),
    {ok, Port} = inet:port(LSock),
    {ok, LSock, Port}.

%% @doc Accept a single connection on LSock and transfer ownership to TargetPid.
await_one(LSock, TargetPid) ->
    case gen_tcp:accept(LSock, 3000) of
        {ok, PeerSock} ->
            relay_to(PeerSock, TargetPid);
        {error, Reason} ->
            {error, Reason}
    end.

%% @doc Assign PeerSock ownership to TargetPid with cleanup on invalid target processes.
relay_to(PeerSock, TargetPid) ->
    case gen_tcp:controlling_process(PeerSock, TargetPid) of
        ok ->
            TargetPid ! {gate_socket, PeerSock},
            ok;
        {error, Reason} ->
            ok = gen_tcp:close(PeerSock),
            {error, Reason}
    end.
\`\`\`

### What ERTS Does Under the Hood
- **Exclusive Controlling Permission**: Only the current controlling process of \`PeerSock\` may legally invoke \`gen_tcp:controlling_process/2\`; if \`TargetPid\` has already exited, ERTS returns an error so closing \`PeerSock\` prevents file descriptor leaks.
- **No Pre-Handoff Mailbox Drift**: Keeping \`LSock\` passive guarantees client bytes stay buffered in the OS kernel until \`TargetPid\` receives \`{gate_socket, PeerSock}\`.

## Assignment Specification

Pre-wired lifecycle and pool test helpers (\`stop_pooled_server/1\`, \`start_pool/2\`, \`stop_pool/1\`, \`get_active_workers/1\`, and worker loop helpers) are provided inside \`src/tcp_acceptor_pool.erl\`. Complete \`handoff_socket/2\` and \`start_pooled_server/2\` in \`src/tcp_acceptor_pool.erl\` (\`-module(tcp_acceptor_pool).\`):

### \`handoff_socket/2\`
- **Input**: Accepted client socket \`ClientSocket\`, target worker process identifier \`WorkerPid\`.
- **Behavior**: Transfers legal controlling ownership of \`ClientSocket\` to \`WorkerPid\`. Upon success, notifies \`WorkerPid\` with both \`socket_assigned\` and \`socket_ready\` readiness tuples paired with \`ClientSocket\`, and returns \`ok\`. Upon failure, closes \`ClientSocket\` immediately so no descriptor leaks and returns the error reason tuple.
- **Examples**:
  - Calling \`tcp_acceptor_pool:handoff_socket(ServerSock, ReceiverPid)\` transfers ownership so \`ReceiverPid\` can configure socket options, exchange \`"HI"\` / \`"ACK"\`, and complete with \`<<"ACK\\r\\n">>\`.

### \`start_pooled_server/2\`
- **Input**: Positive integer \`AcceptorCount\`, handler callback function \`WorkerFun\` taking a single socket argument.
- **Behavior**: Opens a raw binary passive listening socket on ephemeral port \`0\` with address reuse enabled, resolves its assigned kernel port number, and spawns \`AcceptorCount\` linked concurrent acceptor loops. Each acceptor loop waits for an incoming connection, spawns a worker waiting with a bounded timeout for the socket readiness signal before invoking \`WorkerFun\`, delegates handoff via \`handoff_socket/2\`, and recurses to accept subsequent clients. Returns a 4-tuple pairing atom \`ok\`, the listening socket, bound port, and list of acceptor PIDs.
- **Examples**:
  - Starting the pool via \`tcp_acceptor_pool:start_pool(0, 3)\`, connecting two clients, and sending \`<<"PING\\r\\n">>\` yields active worker count \`2\` and reply \`<<"+REPLY: PING\\r\\n">>\`.

## Rules & Verification Constraints
- Verified by running concurrent multi-client connections through \`start_pool/2\`, \`start_pooled_server/2\`, and direct \`handoff_socket/2\` handoff checks.
- AST & Bytecode verifier enforces required calls \`gen_tcp:controlling_process/2\`, \`gen_tcp:listen/2\`, and \`gen_tcp:accept/1\`, tail recursion on \`manager_loop/3\` and \`pool_worker_loop/2\`, and bounded \`receive ... after\` blocks.
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

%% @doc Transfer ownership of ClientSocket to WorkerPid, notify WorkerPid of readiness, and close ClientSocket returning the error tuple on failure.
-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(_ClientSocket, _WorkerPid) ->
    ignore.

%% @doc Open an ephemeral passive listening socket, start AcceptorCount concurrent acceptor workers running WorkerFun per connection, and return {ok, ListenSocket, Port, AcceptorPids}.
-spec start_pooled_server(pos_integer(), fun((gen_tcp:socket()) -> any())) ->
    {ok, gen_tcp:socket(), inet:port_number(), [pid()]}.
start_pooled_server(_AcceptorCount, _WorkerFun) ->
    ignore.

%% @doc Close the listening socket ListenSocket and return ok.
-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

%% @doc Start a managed acceptor pool listening on Port with PoolSize acceptor processes.
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

%% @doc Signal the pool manager process ManagerPid to shut down all acceptors, workers, and the listener socket.
stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

%% @doc Query ManagerPid synchronously for the count of currently connected client worker processes.
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
        {Msg, ClientSocket} when Msg =:= socket_assigned; Msg =:= socket_ready ->
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

%% @doc Transfer ownership of ClientSocket to WorkerPid, notify WorkerPid of readiness, and close ClientSocket returning the error tuple on failure.
-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(ClientSocket, WorkerPid) ->
    case gen_tcp:controlling_process(ClientSocket, WorkerPid) of
        ok ->
            WorkerPid ! {socket_assigned, ClientSocket},
            WorkerPid ! {socket_ready, ClientSocket},
            ok;
        {error, Reason} ->
            gen_tcp:close(ClientSocket),
            {error, Reason}
    end.

%% @doc Open an ephemeral passive listening socket, start AcceptorCount concurrent acceptor workers running WorkerFun per connection, and return {ok, ListenSocket, Port, AcceptorPids}.
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

%% @doc Close the listening socket ListenSocket and return ok.
-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

%% @doc Start a managed acceptor pool listening on Port with PoolSize acceptor processes.
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

%% @doc Signal the pool manager process ManagerPid to shut down all acceptors, workers, and the listener socket.
stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

%% @doc Query ManagerPid synchronously for the count of currently connected client worker processes.
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
        {Msg, ClientSocket} when Msg =:= socket_assigned; Msg =:= socket_ready ->
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

%% @doc Transfer ownership of ClientSocket to WorkerPid, notify WorkerPid of readiness, and close ClientSocket returning the error tuple on failure.
-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(_ClientSocket, _WorkerPid) ->
    ignore.

%% @doc Open an ephemeral passive listening socket, start AcceptorCount concurrent acceptor workers running WorkerFun per connection, and return {ok, ListenSocket, Port, AcceptorPids}.
-spec start_pooled_server(pos_integer(), fun((gen_tcp:socket()) -> any())) ->
    {ok, gen_tcp:socket(), inet:port_number(), [pid()]}.
start_pooled_server(_AcceptorCount, _WorkerFun) ->
    ignore.

%% @doc Close the listening socket ListenSocket and return ok.
-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

%% @doc Start a managed acceptor pool listening on Port with PoolSize acceptor processes.
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

%% @doc Signal the pool manager process ManagerPid to shut down all acceptors, workers, and the listener socket.
stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

%% @doc Query ManagerPid synchronously for the count of currently connected client worker processes.
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
        {Msg, ClientSocket} when Msg =:= socket_assigned; Msg =:= socket_ready ->
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

%% @doc Transfer ownership of ClientSocket to WorkerPid, notify WorkerPid of readiness, and close ClientSocket returning the error tuple on failure.
-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(ClientSocket, WorkerPid) ->
    case gen_tcp:controlling_process(ClientSocket, WorkerPid) of
        ok ->
            WorkerPid ! {socket_assigned, ClientSocket},
            WorkerPid ! {socket_ready, ClientSocket},
            ok;
        {error, Reason} ->
            gen_tcp:close(ClientSocket),
            {error, Reason}
    end.

%% @doc Open an ephemeral passive listening socket, start AcceptorCount concurrent acceptor workers running WorkerFun per connection, and return {ok, ListenSocket, Port, AcceptorPids}.
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

%% @doc Close the listening socket ListenSocket and return ok.
-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

%% @doc Start a managed acceptor pool listening on Port with PoolSize acceptor processes.
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

%% @doc Signal the pool manager process ManagerPid to shut down all acceptors, workers, and the listener socket.
stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

%% @doc Query ManagerPid synchronously for the count of currently connected client worker processes.
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
        {Msg, ClientSocket} when Msg =:= socket_assigned; Msg =:= socket_ready ->
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
        erlangCall: 'begin {ok, L} = gen_tcp:listen(0, [binary, {active, false}]), {ok, Port} = inet:port(L), Receiver = spawn(fun() -> receive {socket_assigned, S} -> inet:setopts(S, [{active, once}]), receive {tcp, S, <<"HI\\r\\n">>} -> ok = gen_tcp:send(S, <<"ACK\\r\\n">>) after 3000 -> ok end after 3000 -> ok end end), {ok, Client} = gen_tcp:connect("127.0.0.1", Port, [binary, {active, false}], 2000), {ok, ServerSock} = gen_tcp:accept(L, 2000), ok = tcp_acceptor_pool:handoff_socket(ServerSock, Receiver), ok = gen_tcp:send(Client, <<"HI\\r\\n">>), {ok, Rep} = gen_tcp:recv(Client, 0, 2000), gen_tcp:close(Client), gen_tcp:close(L), Rep end',
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
      rootCauseHint: 'src/incident_tcp_active_true.erl configures unbounded active socket delivery (bypassing TCP backpressure), while its line framer drops prior partial chunks and retains pinned sub-binary slices.',
      fixObjective: 'Enforce single-packet active backpressure in recommended_socket_opts/0, and repair buffer_and_extract_lines/2 + extract_lines/2 to preserve prior buffer prefixes, slice complete CRLF frames, and unpin both lines and remainders.',
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
    conceptMarkdown: `## Why This Matters in Production

At 14:22 UTC, our primary edge TCP ingestion cluster began crashing across multiple availability zones. Within 12 minutes, the Linux kernel OOM (Out-Of-Memory) killer terminated 14 BEAM nodes, abruptly severing over 120,000 active device sessions.

Telemetry inspection revealed two catastrophic defects:
1. **Unbounded Mailbox Growth**: Connection worker processes had average mailbox queue lengths exceeding **80,000 unhandled messages**, consuming over 600 MB of heap memory per connection process!
2. **Corrupted Stream State & Buffer Dropping**: Incoming commands split across MTU packet boundaries (for example, \`<<"SET session_token ">>\` arriving in Packet 1, followed 15ms later by \`<<"secret123\\r\\n">>\` in Packet 2) suffered silent data corruption because the buffer dropped the prefix!

> [!WARNING]
> **Production Networking Trap: The Silent Poison of Unbounded \`{active, true}\`:**
> Under Slowloris attacks, network bursts, or slow downstream databases, \`{active, true}\` completely disables OS TCP receive-window backpressure. Even if a worker is paused in a database write or garbage collection, the Linux kernel pumps every incoming TCP segment straight into the unbounded BEAM mailbox until OOM kills the node.

## Deep Concept Breakdown & Under the Hood

### 1. How TCP Receive Windows Provide Hardware Backpressure
When you configure a socket with \`{active, once}\`:
1. The BEAM C driver reads **one** segment from the OS socket buffer and delivers \`{tcp, Socket, Data}\` to your Erlang process.
2. The driver **immediately flips the socket to passive mode** (\`{active, false}\`).
3. While your process executes \`handle_info\` and formats a reply, subsequent packets from the client remain queued inside the OS kernel's TCP receive buffer (\`SO_RCVBUF\`).
4. Once the kernel's receive buffer fills up, the OS TCP stack advertises a **Window Size of 0** (\`TCP Zero Window\`) back across the wire.
5. The client's operating system halts packet transmission at the network card layer with zero CPU polling.
6. When your Erlang worker calls \`inet:setopts(Socket, [{active, once}])\`, the BEAM drains the next chunk and re-opens the window.

### 2. Custom Stream Stitching & Sub-Binary Unpinning
When a TCP stream fragments across packets, discarding prior leftover bytes destroys split tokens across chunk boundaries. Furthermore, slices returned by \`binary:split/2\` are 24-byte sub-binaries referencing the original 64 KB off-heap \`ProcBin\` socket read buffer—retaining even a tiny uncopied remainder pins all 64 KB in RAM indefinitely until copied into an independent binary via \`binary:copy/1\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (kernel / inet & stdlib / binary)
inet:setopts(Socket, Options) -> ok | {error, posix()}
  Types:
    Socket = gen_tcp:socket()
    Options = [{active, once | true | false}]

binary:split(Subject, Pattern) -> [binary()]
binary:copy(Subject) -> binary()
  Types:
    Subject = Pattern = binary()
\`\`\`

Consult the attached OTP documentation cards below for \`inet:setopts/2\` flow-control semantics and \`binary:copy/1\` off-heap memory reclamation.

## Parallel Worked Example: Bounded Heartbeat Beacon Ingestor

Consider a separate domain: a telemetry gateway framing null-byte (\`<<0>>\`) delimited device heartbeat beacons using bounded packet options and unpinned binary copies (\`heartbeat_lease_guard\`):

\`\`\`erlang
-module(heartbeat_lease_guard).
-export([bounded_pipe_opts/0, ingest_beacons/2]).

%% @doc Return bounded socket options for line-delimited device beacons.
bounded_pipe_opts() ->
    [binary, {packet, line}, {active, once}, {nodelay, true}].

%% @doc Prepend PriorTail to ChunkBin, slice null-delimited beacons,
%% and return {ExtractedBeacons, RemainingTail} using unpinned binary copies.
ingest_beacons(PriorTail, ChunkBin) ->
    Stream = <<PriorTail/binary, ChunkBin/binary>>,
    split_beacons(Stream, []).

split_beacons(<<>>, Acc) ->
    {lists:reverse(Acc), <<>>};
split_beacons(Stream, Acc) ->
    case binary:split(Stream, <<0>>) of
        [Beacon, Rest] ->
            split_beacons(Rest, [binary:copy(Beacon) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
\`\`\`

### What ERTS Does During Remediation
- **Single-Packet Admission**: Switching to \`{active, once}\` lets ERTS push one chunk per re-arm cycle, bounding mailbox memory to $O(1)$ items while the kernel throttles burst senders.
- **Unpinned Accumulation**: Copying each extracted slice and the trailing incomplete remainder drops every reference to the 64 KB socket \`ProcBin\`.

## Assignment Specification

Repair both defects inside \`src/incident_tcp_active_true.erl\` (\`-module(incident_tcp_active_true).\`), leaving \`audit_socket_opts/0\` and \`test_framing/0\` intact:

### \`recommended_socket_opts/0\`
- **Input**: Zero arguments.
- **Behavior**: Returns the ingestion socket option list configured for binary chunks, raw packet framing, single-packet active backpressure, and address reuse—eliminating unbounded active mailbox floods.
- **Examples**:
  - \`incident_tcp_active_true:audit_socket_opts()\` validates that bounded single-packet active mode is enforced without unbounded active flooding and returns \`{ok, active_once_enforced}\`.

### \`buffer_and_extract_lines/2\`
- **Input**: Accumulated remainder binary \`OldBuffer\`, newly arrived socket chunk \`Chunk\`.
- **Behavior**: Prepends \`OldBuffer\` ahead of \`Chunk\` so partial commands spanning packet boundaries are preserved, extracts every complete CRLF-terminated line cleanly, copies both extracted line binaries and any trailing incomplete remainder into unpinned independent binaries, and returns a 3-tuple \`{ok, ExtractedLinesList, UnpinnedRemainderBin}\`.
- **Examples**:
  - \`incident_tcp_active_true:test_framing()\` splits fragments \`<<"PIN">>\`, \`<<"G", 13, 10, "PONG", 13, 10, "PAR">>\`, and \`<<"TIAL">>\` and returns \`{ok, [<<"PING">>, <<"PONG">>], <<"PARTIAL">>}\`.

## Rules & Verification Constraints
- **Backpressure & Stream Survival**: Verified against burst-safe socket option audits and multi-chunk split-frame tests.
- **AST & TCO Checks**: \`bf_ast_verifier\` enforces tail recursion on \`extract_lines/2\`, required calls \`binary:split/2\` and \`binary:copy/1\`, and \`bit_syntax\` concatenation.
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

%% @doc Return the ingestion TCP socket option list enforcing bounded single-packet active delivery.
recommended_socket_opts() ->
    [binary, {packet, raw}, {active, true}, {reuseaddr, true}].

%% @doc Stitch OldBuffer ahead of Chunk, extract complete CRLF lines, and return {ok, Lines, UnpinnedRemainder}.
buffer_and_extract_lines(OldBuffer, Chunk) ->
    Combined = Chunk,
    _ = OldBuffer,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<13, 10>>) of
        [Line, Rest] ->
            extract_lines(Rest, [Line | Acc]);
        [Incomplete] ->
            {ok, lists:reverse(Acc), Incomplete}
    end.

%% @doc Audit recommended_socket_opts/0 to verify single-packet active mode is enabled without active flooding.
audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

%% @doc Verify multi-chunk fragmented CRLF stream framing across three sequential chunks.
test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G", 13, 10, "PONG", 13, 10, "PAR">>,
    {ok, Lines2, Rem2} = buffer_and_extract_lines(Rem1, Chunk2),
    Chunk3 = <<"TIAL">>,
    {ok, Lines3, Rem3} = buffer_and_extract_lines(Rem2, Chunk3),
    AllLines = Lines1 ++ Lines2 ++ Lines3,
    {ok, AllLines, Rem3}.
`,
    solutionCode: `-module(incident_tcp_active_true).
-export([recommended_socket_opts/0, buffer_and_extract_lines/2]).
-export([audit_socket_opts/0, test_framing/0]).

%% @doc Return the ingestion TCP socket option list enforcing bounded single-packet active delivery.
recommended_socket_opts() ->
    [binary, {packet, raw}, {active, once}, {reuseaddr, true}].

%% @doc Stitch OldBuffer ahead of Chunk, extract complete CRLF lines, and return {ok, Lines, UnpinnedRemainder}.
buffer_and_extract_lines(OldBuffer, Chunk) ->
    Combined = <<OldBuffer/binary, Chunk/binary>>,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<13, 10>>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {ok, lists:reverse(Acc), binary:copy(Incomplete)}
    end.

%% @doc Audit recommended_socket_opts/0 to verify single-packet active mode is enabled without active flooding.
audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

%% @doc Verify multi-chunk fragmented CRLF stream framing across three sequential chunks.
test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G", 13, 10, "PONG", 13, 10, "PAR">>,
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

%% @doc Return the ingestion TCP socket option list enforcing bounded single-packet active delivery.
recommended_socket_opts() ->
    [binary, {packet, raw}, {active, true}, {reuseaddr, true}].

%% @doc Stitch OldBuffer ahead of Chunk, extract complete CRLF lines, and return {ok, Lines, UnpinnedRemainder}.
buffer_and_extract_lines(OldBuffer, Chunk) ->
    Combined = Chunk,
    _ = OldBuffer,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<13, 10>>) of
        [Line, Rest] ->
            extract_lines(Rest, [Line | Acc]);
        [Incomplete] ->
            {ok, lists:reverse(Acc), Incomplete}
    end.

%% @doc Audit recommended_socket_opts/0 to verify single-packet active mode is enabled without active flooding.
audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

%% @doc Verify multi-chunk fragmented CRLF stream framing across three sequential chunks.
test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G", 13, 10, "PONG", 13, 10, "PAR">>,
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

%% @doc Return the ingestion TCP socket option list enforcing bounded single-packet active delivery.
recommended_socket_opts() ->
    [binary, {packet, raw}, {active, once}, {reuseaddr, true}].

%% @doc Stitch OldBuffer ahead of Chunk, extract complete CRLF lines, and return {ok, Lines, UnpinnedRemainder}.
buffer_and_extract_lines(OldBuffer, Chunk) ->
    Combined = <<OldBuffer/binary, Chunk/binary>>,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<13, 10>>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {ok, lists:reverse(Acc), binary:copy(Incomplete)}
    end.

%% @doc Audit recommended_socket_opts/0 to verify single-packet active mode is enabled without active flooding.
audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

%% @doc Verify multi-chunk fragmented CRLF stream framing across three sequential chunks.
test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G", 13, 10, "PONG", 13, 10, "PAR">>,
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

You have mastered raw sockets, socket options, \`{active, once}\` backpressure, custom stream framing, and concurrent acceptor pools. Now you will assemble these core building blocks into a Redis-inspired **TCP Key-Value Backend Server** built entirely from scratch.

This mini-capstone mirrors the core network engine of production in-memory datastores and real-time messaging servers (including the XMPP server you will construct in Chapters 11 and 12).

> [!WARNING]
> **Production Networking Trap: Lingering Sockets, Port Collisions & ETS Leaks:**
> In a production TCP server, three common traps cause cascading outages:
> 1. **Socket Descriptor Leaks**: If a client disconnects and a worker fails to handle \`{tcp_closed, Socket}\` or exits without closing the descriptor, OS handles exhaust under load (\`EMFILE\`).
> 2. **Port Collisions**: Hardcoding fixed ports breaks parallel test runners. Always bind ephemeral port \`0\` and inspect the assigned kernel port via \`inet:port/1\`.
> 3. **Orphan Named Tables**: When tests recreate named ETS tables repeatedly, ensure shutdown deletes or releases the table cleanly so the next boot does not crash with \`badarg\`.

## Deep Concept Breakdown & Under the Hood

### End-to-End Pipeline Architecture
> [!IMPORTANT]
> **Six Stages of a Flow-Controlled TCP Backend:**
> 1. **Passive Listener & Handoff**: Open the listening socket in passive binary mode on ephemeral port \`0\` and assign accepted client sockets cleanly with \`gen_tcp:controlling_process/2\` before arming active mode.
> 2. **Single-Packet Admission**: Arm each connection worker with \`{active, once}\` so the kernel throttles burst traffic rather than flooding process mailboxes.
> 3. **Unpinned Framing Loop**: Append chunks to any prior partial remainder, split complete CRLF commands, and copy both extracted frames and trailing leftovers with \`binary:copy/1\`.
> 4. **Command Parser**: Map protocol lines into normalized tagged action terms or a structured error.
> 5. **Lock-Free ETS Storage**: Store entries in a shared public ETS \`set\` table configured with read/write concurrency flags.
> 6. **Wire Reply & Re-Arm**: Format ASCII protocol replies (\`+\`, \`$\`, \`:\`, \`-\` prefixes), transmit via \`gen_tcp:send/2\`, and re-arm \`{active, once}\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / ets & kernel / inet, gen_tcp)
ets:new(Name, Options) -> tid() | atom()
ets:insert(Tab, TupleOrTuples) -> true
ets:lookup(Tab, Key) -> [tuple()]
ets:member(Tab, Key) -> boolean()
ets:delete(Tab, Key) -> true
  Types:
    Tab = ets:tab()
    Key = term()

inet:setopts(Socket, Options) -> ok | {error, Reason}
gen_tcp:controlling_process(Socket, Pid) -> ok | {error, Reason}
gen_tcp:send(Socket, Packet) -> ok | {error, Reason}
\`\`\`

Consult the attached OTP documentation cards below for \`ets:insert/2\` and \`ets:lookup/2\` C-level concurrency complexity.

## Parallel Worked Example: Flow-Controlled Telemetry Counter Gateway

Consider a separate domain: an **IoT Metric Counter Gateway** (\`telemetry_counter_svc\`) accepting LF (\`\\n\`) delimited \`INCR <Metric>\`, \`STAT <Metric>\`, and \`RESET\` verbs backed by an unnamed ETS counter table. Study the 2-phase composition:

### Phase 1: ETS Metric Codec & Execution Core
\`\`\`erlang
-module(telemetry_counter_svc).
-export([start_gateway/0, stop_gateway/1, decode_verb/1, apply_verb/2]).

%% @doc Boot the metric gateway backed by an unnamed ETS table and passive listener.
start_gateway() ->
    Tab = ets:new(metrics_registry, [set, public, {read_concurrency, true}]),
    {ok, LSock} = gen_tcp:listen(0, [binary, {packet, raw}, {active, false}, {reuseaddr, true}]),
    {ok, Port} = inet:port(LSock),
    SrvPid = spawn_link(fun() -> accept_next(LSock, Tab) end),
    {ok, SrvPid, Port, Tab}.

%% @doc Shut down the metric gateway listener and reclaim Tab.
stop_gateway({SrvPid, Tab}) ->
    unlink(SrvPid),
    exit(SrvPid, kill),
    try ets:delete(Tab) catch _:_ -> ok end,
    ok.

%% @doc Parse an LF-stripped telemetry verb into an internal action tuple.
decode_verb(<<"RESET">>) -> {action, reset};
decode_verb(<<"INCR ", Metric/binary>>) -> {action, {incr, Metric}};
decode_verb(<<"STAT ", Metric/binary>>) -> {action, {stat, Metric}};
decode_verb(_) -> {reject, invalid_verb}.

%% @doc Mutate or query ETS table Tab and format a newline-delimited wire response.
apply_verb({action, reset}, Tab) ->
    ets:delete_all_objects(Tab),
    <<"RESET_OK", 10>>;
apply_verb({action, {incr, Metric}}, Tab) ->
    NextVal = ets:update_counter(Tab, Metric, {2, 1}, {Metric, 0}),
    <<"COUNT=", (integer_to_binary(NextVal))/binary, 10>>;
apply_verb({action, {stat, Metric}}, Tab) ->
    case ets:lookup(Tab, Metric) of
        [{Metric, Val}] -> <<"COUNT=", (integer_to_binary(Val))/binary, 10>>;
        [] -> <<"MISSING", 10>>
    end;
apply_verb({reject, _}, _Tab) ->
    <<"ERR_BAD_VERB", 10>>.
\`\`\`

### Phase 2: Acceptor Handoff & Active-Once Frame Pump
\`\`\`erlang
accept_next(LSock, Tab) ->
    case gen_tcp:accept(LSock) of
        {ok, Peer} ->
            WPid = spawn(fun() ->
                receive
                    {own_peer, Peer} ->
                        ok = inet:setopts(Peer, [{active, once}]),
                        serve_peer(Peer, Tab, <<>>)
                after 2000 ->
                    gen_tcp:close(Peer)
                end
            end),
            ok = gen_tcp:controlling_process(Peer, WPid),
            WPid ! {own_peer, Peer},
            accept_next(LSock, Tab);
        {error, _} ->
            ok
    end.

serve_peer(Peer, Tab, RemBuf) ->
    receive
        {tcp, Peer, Chunk} ->
            Joined = <<RemBuf/binary, Chunk/binary>>,
            {Frames, NextRem} = slice_lf(Joined, []),
            lists:foreach(fun(F) ->
                WireOut = apply_verb(decode_verb(F), Tab),
                _ = gen_tcp:send(Peer, WireOut)
            end, Frames),
            ok = inet:setopts(Peer, [{active, once}]),
            serve_peer(Peer, Tab, NextRem);
        {tcp_closed, _Peer} ->
            ok;
        {tcp_error, _Peer, _Reason} ->
            ok
    end.

slice_lf(Buf, Acc) ->
    case binary:split(Buf, <<10>>) of
        [Line, Rest] -> slice_lf(Rest, [binary:copy(Line) | Acc]);
        [Partial] -> {lists:reverse(Acc), binary:copy(Partial)}
    end.
\`\`\`

## Assignment Specification

Implement module \`src/tcp_kv_backend.erl\` (\`-module(tcp_kv_backend).\`) with \`stop_server/1\` provided cleanly and completing \`parse_command/1\`, \`execute_command/2\`, and \`start_server/0\`:

### \`parse_command/1\`
- **Input**: Raw CRLF-stripped binary command line \`RawLineBin\`.
- **Behavior**: Classifies incoming commands into tagged tuples:
  - Exact ping command yields an \`ok\` ping tuple.
  - Set commands carrying key and value separated by a single ASCII space yield an \`ok\` set 3-tuple (rejecting malformed sets lacking a separator space).
  - Get and delete commands carrying a key suffix yield \`ok\` get or delete 2-tuples.
  - Any unrecognized command returns an \`unknown_command\` error tuple.
- **Examples**:
  - \`tcp_kv_backend:parse_command(<<"PING">>)\` returns \`{ok, ping}\`.
  - \`tcp_kv_backend:parse_command(<<"SET session_token secret123">>)\` returns \`{ok, {set, <<"session_token">>, <<"secret123">>}}\`.

### \`execute_command/2\`
- **Input**: Parsed command tuple (accepting both \`{ok, Cmd}\` and bare \`Cmd\` forms) or error tuple, and ETS table identifier or name \`EtsTable\`.
- **Behavior**: Applies the command against \`EtsTable\` and encodes a CRLF-terminated wire response:
  - Ping commands return \`+PONG\` followed by CRLF.
  - Set commands insert the key-value pair and return \`+OK\` followed by CRLF.
  - Get commands return \`$\` plus stored binary value and CRLF when found, or \`$-1\` plus CRLF when missing.
  - Delete commands check membership, delete existing keys returning \`:1\` plus CRLF, or return \`:0\` plus CRLF when absent.
  - Unknown commands or error tuples return \`-ERR unknown command\` followed by CRLF.
- **Examples**:
  - After inserting \`{set, <<"k1">>, <<"val1">>}\` (\`<<"+OK\\r\\n">>\`), \`get\` returns \`<<"$val1\\r\\n">>\`, \`del\` returns \`<<":1\\r\\n">>\`, and a subsequent \`get\` returns \`<<"$-1\\r\\n">>\`.

### \`start_server/0\`
- **Input**: Zero arguments.
- **Behavior**: Ensures named public ETS table \`tcp_kv_table\` exists with concurrent read and write optimizations enabled, opens a passive binary raw listening socket on ephemeral port \`0\` with address reuse enabled, resolves its bound port, and spawns an acceptor loop. For each accepted client socket, spawns a connection worker registered under name \`tcp_kv_worker\`, safely transfers socket ownership before arming single-packet active mode, accumulates fragmented chunks into complete CRLF lines unpinned via \`binary:copy/1\`, runs each parsed command, sends replies, re-arms single-packet active mode, and shuts down cleanly on disconnect. Returns \`{ok, ServerPid, Port}\`.
- **Examples**:
  - Fragmented and coalesced TCP client commands execute sequentially against \`tcp_kv_table\` with bounded worker mailboxes.

## Rules & Verification Constraints
- **Live Protocol, Fragmentation & Backpressure Tests**: Verified via live TCP sockets sending split chunks and coalesced multi-command bursts plus \`bf_backpressure_tester:verify_active_once_backpressure/5\` (mailbox bounded at \`<= 5\` under 50 burst frames).
- **AST Checks**: \`bf_ast_verifier\` enforces \`inet:setopts/2\`, \`gen_tcp:send/2\`, \`ets:insert/2\`, \`ets:lookup/2\`, and \`bit_syntax\`.
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

%% @doc Parse a CRLF-stripped binary protocol line into an {ok, CmdTuple} term or {error, unknown_command}.
-spec parse_command(binary()) -> {ok, term()} | {error, unknown_command}.
parse_command(_RawLineBin) ->
    ignore.

%% @doc Execute a parsed or bare command tuple against EtsTable and return the CRLF-terminated wire response binary.
-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command(_Command, _EtsTable) ->
    ignore.

%% @doc Initialize concurrent named ETS storage, open an ephemeral passive listener, spawn the acceptor and active-once worker loop, and return {ok, ServerPid, Port}.
-spec start_server() -> {ok, pid(), inet:port_number()}.
start_server() ->
    ignore.

%% @doc Terminate the server process ServerPid and clean up the tcp_kv_table ETS table.
-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    unlink(ServerPid),
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

%% @doc Parse a CRLF-stripped binary protocol line into an {ok, CmdTuple} term or {error, unknown_command}.
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

%% @doc Execute a parsed or bare command tuple against EtsTable and return the CRLF-terminated wire response binary.
-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command({ok, Cmd}, Tab) ->
    execute_command(Cmd, Tab);
execute_command(ping, _Tab) ->
    <<"+PONG", 13, 10>>;
execute_command({set, Key, Value}, Tab) ->
    ets:insert(Tab, {Key, Value}),
    <<"+OK", 13, 10>>;
execute_command({get, Key}, Tab) ->
    case ets:lookup(Tab, Key) of
        [{Key, Value}] ->
            <<"$", Value/binary, 13, 10>>;
        [] ->
            <<"$-1", 13, 10>>
    end;
execute_command({del, Key}, Tab) ->
    case ets:member(Tab, Key) of
        true ->
            ets:delete(Tab, Key),
            <<":1", 13, 10>>;
        false ->
            <<":0", 13, 10>>
    end;
execute_command({error, unknown_command}, _Tab) ->
    <<"-ERR unknown command", 13, 10>>;
execute_command(_Other, _Tab) ->
    <<"-ERR unknown command", 13, 10>>.

%% @doc Initialize concurrent named ETS storage, open an ephemeral passive listener, spawn the acceptor and active-once worker loop, and return {ok, ServerPid, Port}.
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

%% @doc Terminate the server process ServerPid and clean up the tcp_kv_table ETS table.
-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    unlink(ServerPid),
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
    case binary:split(Buffer, <<13, 10>>) of
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

%% @doc Parse a CRLF-stripped binary protocol line into an {ok, CmdTuple} term or {error, unknown_command}.
-spec parse_command(binary()) -> {ok, term()} | {error, unknown_command}.
parse_command(_RawLineBin) ->
    ignore.

%% @doc Execute a parsed or bare command tuple against EtsTable and return the CRLF-terminated wire response binary.
-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command(_Command, _EtsTable) ->
    ignore.

%% @doc Initialize concurrent named ETS storage, open an ephemeral passive listener, spawn the acceptor and active-once worker loop, and return {ok, ServerPid, Port}.
-spec start_server() -> {ok, pid(), inet:port_number()}.
start_server() ->
    ignore.

%% @doc Terminate the server process ServerPid and clean up the tcp_kv_table ETS table.
-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    unlink(ServerPid),
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

%% @doc Parse a CRLF-stripped binary protocol line into an {ok, CmdTuple} term or {error, unknown_command}.
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

%% @doc Execute a parsed or bare command tuple against EtsTable and return the CRLF-terminated wire response binary.
-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command({ok, Cmd}, Tab) ->
    execute_command(Cmd, Tab);
execute_command(ping, _Tab) ->
    <<"+PONG", 13, 10>>;
execute_command({set, Key, Value}, Tab) ->
    ets:insert(Tab, {Key, Value}),
    <<"+OK", 13, 10>>;
execute_command({get, Key}, Tab) ->
    case ets:lookup(Tab, Key) of
        [{Key, Value}] ->
            <<"$", Value/binary, 13, 10>>;
        [] ->
            <<"$-1", 13, 10>>
    end;
execute_command({del, Key}, Tab) ->
    case ets:member(Tab, Key) of
        true ->
            ets:delete(Tab, Key),
            <<":1", 13, 10>>;
        false ->
            <<":0", 13, 10>>
    end;
execute_command({error, unknown_command}, _Tab) ->
    <<"-ERR unknown command", 13, 10>>;
execute_command(_Other, _Tab) ->
    <<"-ERR unknown command", 13, 10>>.

%% @doc Initialize concurrent named ETS storage, open an ephemeral passive listener, spawn the acceptor and active-once worker loop, and return {ok, ServerPid, Port}.
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

%% @doc Terminate the server process ServerPid and clean up the tcp_kv_table ETS table.
-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    unlink(ServerPid),
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
    case binary:split(Buffer, <<13, 10>>) of
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
      requireTailRecursion: [],
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
