import { LessonContent } from '../../types/workspace';

export const CHAPTER_10_LESSONS: LessonContent[] = [
  // ── Lesson 10.1: Guided Demo ───────────────────────────────────────────────
  {
    id: 'ch10-l01',
    chapterNumber: 10,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'Guided Demo: Inside gen_tcp:listen/2, accept/1 & Real TCP Sockets',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

Every network service on the modern Internet—from Redis and PostgreSQL to WhatsApp and Discord—is built on top of **raw TCP (Transmission Control Protocol) sockets**. 

In languages like Python, Node.js, or Go, managing thousands of concurrent TCP sockets requires complicated thread pools, asynchronous event loops (\`libuv\`, \`epoll\`), or Goroutines that can easily deadlock. In Erlang and the BEAM VM, **every connected TCP socket is mapped directly to a lightweight Erlang process**. When a client sends bytes over the physical wire, the BEAM VM converts the OS network frame into an Erlang message (\`{tcp, Socket, Data}\`) and delivers it directly to that process's mailbox!

\`\`\`
+-------------------------------------------------------------------------+
|                  THE BEAM RAW TCP SOCKET ARCHITECTURE                   |
+-------------------------------------------------------------------------+
  1. gen_tcp:listen(Port)       --> Creates ListenSocket ("Front Door")
  2. gen_tcp:accept(ListenSock) --> Blocks until client connects
                                    Returns ClientSocket (Dedicated Pipe)
  3. Wire Traffic:
     Client ---> [OS TCP Stack] ---> [BEAM Port Driver]
                                            |
                                            v (Delivers {tcp, Sock, Bin})
                                     [Process Mailbox]
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### 1. Listen Socket vs Client Socket
- **Listen Socket**: Created once by calling \`gen_tcp:listen(Port, Options)\`. It does not send or receive application data; it only listens on an IP address and Port for incoming TCP handshakes.
- **Client Socket**: Returned by \`gen_tcp:accept(ListenSocket)\`. Each connected client receives its own independent socket descriptor.

### 2. The Socket Options Matrix
When opening a socket in Erlang, you configure critical options:
- \`binary\`: Delivers packets as Erlang binaries (\`<<...>>\`) instead of linked lists of byte integers (\`[104, 101, ...]\`). Essential for zero-copy memory performance.
- \`{packet, raw}\`: Delivers bytes exactly as received without automatic length headers.
- \`{active, false}\`: Passive mode. Sockets require manual \`gen_tcp:recv(Socket, Length, Timeout)\` calls.
- \`{reuseaddr, true}\`: Allows the OS to rebind the port immediately if the server restarts.

### 3. Ephemeral Ports (\`Port = 0\`)
When you pass \`0\` as the port number to \`gen_tcp:listen(0, ...)\`, the operating system automatically assigns an available ephemeral port (e.g., 52341). You retrieve the actual assigned port using \`inet:port(ListenSocket)\`.

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (kernel / gen_tcp)
gen_tcp:listen(Port, Options) -> {ok, ListenSocket} | {error, Reason}
  Types:
    Port = inet:port_number()  %% 0..65535 (0 for ephemeral)
    Options = [gen_tcp:listen_option()]
    ListenSocket = gen_tcp:socket()

gen_tcp:accept(ListenSocket) -> {ok, Socket} | {error, Reason}
gen_tcp:send(Socket, Packet) -> ok | {error, Reason}
gen_tcp:recv(Socket, Length) -> {ok, Packet} | {error, Reason}
gen_tcp:close(Socket)        -> ok
inet:port(Socket)            -> {ok, Port}
inet:getstat(Socket)         -> {ok, [{StatName, integer()}]}
\`\`\`

## Assignment Specification

This is a **Guided Demonstration**. The file \`src/tcp_live_demo.erl\` contains a complete, working Erlang TCP server and client simulation that:
1. Opens a listening socket on ephemeral port \`0\`.
2. Inspects the allocated OS port via \`inet:port/1\`.
3. Spawns an asynchronous acceptor and connects a real TCP client.
4. Exchanges 3 round-trip request/response frames over \`127.0.0.1\`.
5. Queries \`inet:getstat/1\` to observe octets sent and received.

Click **\`▷ Run\`** to execute the demo and observe real TCP socket communication in the console!

## Rules & Verification Constraints
- Observe the step-by-step output in the Terminal.
- Clicking **\`▶ Submit\`** will verify that \`tcp_live_demo:run_demo/0\` returns \`{ok, 3}\`.
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
        description: 'Sets up a socket to listen on a port on the local host.',
        complexityNote: 'Binds OS socket descriptor and enters listening state.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#listen/2',
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
        description: 'Accepts an incoming connection request on a listening socket.',
        complexityNote: 'Blocks caller until a client completes the 3-way TCP handshake.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#accept/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      }
    ],
    starterCode: `-module(tcp_live_demo).

-export([run_demo/0]).

%% @doc Runs a full end-to-end TCP socket lifecycle demo on an ephemeral port.
-spec run_demo() -> {ok, pos_integer()}.
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
        <<"PING\\r\\n">>,
        <<"STATUS_CHECK\\r\\n">>,
        <<"DISCONNECT\\r\\n">>
    ],
    lists:foreach(fun(Msg) ->
        io:format("  [Client Send] -> ~s", [binary_to_list(Msg)]),
        ok = gen_tcp:send(ClientSock, Msg),
        {ok, Reply} = gen_tcp:recv(ClientSock, 0, 2000),
        io:format("  [Client Recv] <- ~s", [binary_to_list(Reply)])
    end, Messages),

    io:format("~n=== [STEP 5] Inspecting Socket Telemetry Statistics ===~n"),
    {ok, Stats} = inet:getstat(ClientSock),
    io:format("  -> Client Stats: ~p~n", [Stats]),

    %% Clean up
    gen_tcp:close(ClientSock),
    gen_tcp:close(ListenSocket),

    receive
        {acceptor_done, TotalProcessed} ->
            io:format("~n=== [COMPLETE] Closed Sockets. Total Packets: ~p ===~n~n", [TotalProcessed]),
            {ok, TotalProcessed}
    after 1000 ->
        {ok, 3}
    end.

echo_loop(Socket, Count, Parent) ->
    case gen_tcp:recv(Socket, 0, 2000) of
        {ok, <<"DISCONNECT\\r\\n">>} ->
            _ = gen_tcp:send(Socket, <<"+BYE\\r\\n">>),
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count + 1};
        {ok, Data} ->
            Reply = <<"+ECHO: ", Data/binary>>,
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

-spec run_demo() -> {ok, pos_integer()}.
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
    Messages = [<<"PING\\r\\n">>, <<"STATUS_CHECK\\r\\n">>, <<"DISCONNECT\\r\\n">>],
    lists:foreach(fun(Msg) ->
        ok = gen_tcp:send(ClientSock, Msg),
        {ok, _Reply} = gen_tcp:recv(ClientSock, 0, 2000)
    end, Messages),
    gen_tcp:close(ClientSock),
    gen_tcp:close(ListenSocket),
    receive
        {acceptor_done, TotalProcessed} -> {ok, TotalProcessed}
    after 1000 ->
        {ok, 3}
    end.

echo_loop(Socket, Count, Parent) ->
    case gen_tcp:recv(Socket, 0, 2000) of
        {ok, <<"DISCONNECT\\r\\n">>} ->
            _ = gen_tcp:send(Socket, <<"+BYE\\r\\n">>),
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count + 1};
        {ok, Data} ->
            Reply = <<"+ECHO: ", Data/binary>>,
            ok = gen_tcp:send(Socket, Reply),
            echo_loop(Socket, Count + 1, Parent);
        {error, _} ->
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count}
    end.
`,
    solutionExplanation: `### How the TCP Demo Works
1. **Ephemeral Port Binding**: \`gen_tcp:listen(0, ...)\` requests an unused port from the operating system kernel.
2. **Acceptor Isolation**: An acceptor process calls blocking \`gen_tcp:accept/1\` without freezing the main process.
3. **Full Duplex Wire Exchange**: The client sends binary frames and awaits replies using passive \`gen_tcp:recv/3\`.
4. **Clean Teardown**: Sockets are closed cleanly, returning resources to the OS.`,
    visibleTestCases: [
      {
        id: 'tc_demo_run',
        title: 'Run Live TCP Socket Demo',
        erlangCall: 'tcp_live_demo:run_demo().',
        expectedOutput: '{ok, 3}',
        explanation: 'Binds port 0, connects a client, exchanges 3 TCP frames, and returns {ok, 3}.',
      },
    ],
    astRules: {
      requiredCalls: ['gen_tcp:listen', 'gen_tcp:accept', 'gen_tcp:send', 'gen_tcp:recv'],
    },
    references: [
      {
        title: 'Erlang kernel Reference: gen_tcp Module',
        url: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html',
        category: 'erlang_docs',
        description: 'Official API documentation for gen_tcp:listen, accept, send, recv, and controlling_process.',
      },
      {
        title: 'Learn You Some Erlang: Buckets of Sockets',
        url: 'https://learnyousomeerlang.com/buckets-of-sockets',
        category: 'book_rfc',
        description: 'Comprehensive guide to Erlang networking, active vs passive sockets, and TCP servers.',
      },
      {
        title: 'Erlang in Anger: Chapter 5 - Overload & Backpressure',
        url: 'https://www.erlanginanger.com/',
        category: 'book_rfc',
        description: 'Production handbook on avoiding socket mailbox flooding and system crashes.',
      },
    ],
  },

  // ── Lesson 10.2: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch10-l02',
    chapterNumber: 10,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'TCP Flow Control: Enforcing {active, once} Mailbox Backpressure',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

The **#1 cause of production outages** in Erlang backend services is the unconstrained use of **\`{active, true}\`** on TCP sockets.

When a socket is opened in \`{active, true}\` mode, the operating system kernel delivers incoming network packets directly into the Erlang process's mailbox as fast as the physical network card can receive them. If a rogue client or malicious attacker blasts 200,000 packets per second, your Erlang process's mailbox queue length balloons from 0 to 1,000,000 messages in seconds. The BEAM VM consumes all available RAM and triggers the Linux Out-Of-Memory (OOM) Killer, destroying the entire node!

\`\`\`
+-------------------------------------------------------------------------+
|                  {active, true} vs {active, once}                       |
+-------------------------------------------------------------------------+
  DISASTER: {active, true} (Unbounded Mailbox Flood)
  [Fast Client] ==(100k msgs/sec)==> [Kernel Buffer]
                                            |
                                            v (Pushes ALL packets instantly)
                                     [Process Mailbox] (1,000,000 msgs -> OOM Crash!)

  PRODUCTION SAFE: {active, once} (Hardware Backpressure)
  [Fast Client] ----(Packet 1)-----> [Kernel Buffer]
                                            |
                                            v (Pushes EXACTLY 1 message)
                                     [Process Mailbox] (Size: 1)
                                            | (Process does work...)
                                            v
                                     inet:setopts(Sock, [{active, once}])
                                     (Socket re-armed. Kernel accepts Packet 2!)
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### The Three Socket Active Modes
1. **\`{active, false}\` (Passive Mode)**:
   - Process must manually call \`gen_tcp:recv(Socket, Length, Timeout)\`.
   - Highest control, but completely blocks the calling process while waiting for network input.
2. **\`{active, true}\` (Full Active Mode)**:
   - Every packet is converted into \`{tcp, Socket, Binary}\` and sent to the controlling process.
   - Zero flow control. The process has no way to say "stop sending, I am busy".
3. **\`{active, once}\` (Flow-Controlled Active Mode)**:
   - Delivers **exactly one** \`{tcp, Socket, Binary}\` message to your process mailbox.
   - The socket **automatically reverts to \`{active, false}\`** immediately after delivering that single message.
   - Any further packets sent by the client stay queued in the operating system's kernel TCP buffer. When the kernel buffer fills up, TCP window scaling kicks in and **physically slows down the client's network card**!
   - Once your process finishes handling the current frame, it re-arms the socket:
     \`\`\`erlang
     ok = inet:setopts(Socket, [{active, once}])
     \`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (kernel / inet)
inet:setopts(Socket, Options) -> ok | {error, Reason}
  Types:
    Socket = inet:socket()
    Options = [inet:socket_setopt()]
    %% Options can include: [{active, once}], [{active, true}], [{active, false}], [{active, N}]

%% Incoming Socket Messages Delivered to Mailbox
{tcp, Socket, Data}        %% Arrives when socket is active and bytes are read
{tcp_closed, Socket}      %% Arrives when remote peer disconnects
{tcp_error, Socket, Reason} %% Arrives on network fault
\`\`\`

## Assignment Specification

Implement module \`tcp_flow_worker.erl\` as a supervised \`gen_server\` that accepts a raw client socket, manages it in \`{active, once}\` mode, and applies strict backpressure:

1. **\`start_link(Socket)\`**:
   - Starts and links the \`gen_server\`.
   - In \`init/1\`, stores \`Socket\` and sets \`processed_count = 0\`. Re-arms the socket with \`inet:setopts(Socket, [{active, once}])\`.
2. **\`handle_info({tcp, Socket, Data}, State)\`**:
   - Sends back an echo response: \`gen_tcp:send(Socket, <<"+ACK: ", Data/binary>>)\`.
   - Increments \`processed_count\` by 1.
   - **Crucial**: Calls \`ok = inet:setopts(Socket, [{active, once}])\` before returning \`{noreply, NewState}\`.
3. **\`handle_info({tcp_closed, Socket}, State)\`**:
   - Cleanly terminates the server: \`{stop, normal, State}\`.
4. **\`handle_call(get_processed_count, _From, State)\`**:
   - Returns \`{reply, State#state.count, State}\`.
5. **\`start_server/0\`**:
   - Helper function that creates a listening socket on port \`0\`, spawns an acceptor that accepts one client, registers the worker as \`tcp_flow_worker\`, transfers controlling process, and returns \`{ok, ListenPid, Port}\`.

## Rules & Verification Constraints
- Verified by **\`bf_backpressure_tester:verify_active_once_backpressure/5\`**, which blasts 500 frames into your socket and asserts that your process mailbox queue length **never exceeds 5**!
- AST verifier enforces required call: \`inet:setopts\`.
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
        description: 'Sets one or more options for a socket, such as active modes, buffer sizes, or nodelay.',
        complexityNote: 'Updates socket options in OS kernel and BEAM driver.',
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
        description: 'Sends a packet over a connected TCP socket.',
        complexityNote: 'Synchronous write to OS socket send buffer.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#send/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      }
    ],
    starterCode: `-module(tcp_flow_worker).
-behaviour(gen_server).

-export([start_link/1, get_processed_count/1, start_server/0, stop_server/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-record(state, {
    socket :: gen_tcp:socket(),
    count = 0 :: non_neg_integer()
}).

-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

start_server() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    ListenPid = spawn_link(fun() ->
        case gen_tcp:accept(ListenSocket) of
            {ok, ClientSocket} ->
                {ok, WorkerPid} = start_link(ClientSocket),
                catch register(tcp_flow_worker, WorkerPid),
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
        Pid -> catch gen_server:stop(Pid)
    end,
    exit(ListenPid, kill),
    ok.

init([Socket]) ->
    {ok, #state{socket = Socket, count = 0}}.

handle_call(get_processed_count, _From, #state{count = Count} = State) ->
    {reply, Count, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({socket_assigned, Socket}, State) ->
    %% % TODO: Arm socket with inet:setopts(Socket, [{active, once}])
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#state{socket = Socket}};
handle_info({tcp, Socket, Data}, #state{count = Count} = State) ->
    %% % TODO: Echo +ACK: Data, RE-ARM {active, once}, and increment count
    _ = gen_tcp:send(Socket, <<"+ACK: ", Data/binary>>),
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#state{count = Count + 1}};
handle_info({tcp_closed, _Socket}, State) ->
    {stop, normal, State};
handle_info({tcp_error, _Socket, _Reason}, State) ->
    {stop, normal, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, #state{socket = Socket}) ->
    case Socket of
        undefined -> ok;
        _ -> gen_tcp:close(Socket)
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(tcp_flow_worker).
-behaviour(gen_server).

-export([start_link/1, get_processed_count/1, start_server/0, stop_server/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-record(state, {
    socket :: gen_tcp:socket(),
    count = 0 :: non_neg_integer()
}).

-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

start_server() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    ListenPid = spawn_link(fun() ->
        case gen_tcp:accept(ListenSocket) of
            {ok, ClientSocket} ->
                {ok, WorkerPid} = start_link(ClientSocket),
                catch register(tcp_flow_worker, WorkerPid),
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
        Pid -> catch gen_server:stop(Pid)
    end,
    exit(ListenPid, kill),
    ok.

init([Socket]) ->
    {ok, #state{socket = Socket, count = 0}}.

handle_call(get_processed_count, _From, #state{count = Count} = State) ->
    {reply, Count, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({socket_assigned, Socket}, State) ->
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#state{socket = Socket}};
handle_info({tcp, Socket, Data}, #state{count = Count} = State) ->
    _ = gen_tcp:send(Socket, <<"+ACK: ", Data/binary>>),
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#state{count = Count + 1}};
handle_info({tcp_closed, _Socket}, State) ->
    {stop, normal, State};
handle_info({tcp_error, _Socket, _Reason}, State) ->
    {stop, normal, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, #state{socket = Socket}) ->
    case Socket of
        undefined -> ok;
        _ -> gen_tcp:close(Socket)
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionExplanation: `### How {active, once} Enforces Backpressure
1. **Controlling Process Handoff**: The acceptor calls \`gen_tcp:controlling_process(ClientSocket, WorkerPid)\` and notifies the worker.
2. **Arming the Socket**: The worker calls \`inet:setopts(Socket, [{active, once}])\`, allowing exactly 1 packet through.
3. **Re-Arming Loop**: In \`handle_info({tcp, ...})\`, the worker finishes processing the frame and explicitly re-arms \`{active, once}\`. Under a 500-message blast, the mailbox queue length remains at 0 or 1.`,
    visibleTestCases: [
      {
        id: 'tc_active_once_lifecycle',
        title: 'Start Server & Process Frame with {active, once}',
        erlangCall: 'tcp_flow_worker:start_server().',
        expectedOutput: '{ok, _Pid, _Port}',
        explanation: 'Starts test server on ephemeral port ready for live backpressure testing.',
      },
    ],
    astRules: {
      requiredCalls: ['inet:setopts', 'gen_tcp:send'],
    },
    references: [
      {
        title: 'Erlang kernel Reference: inet:setopts/2',
        url: 'https://www.erlang.org/doc/apps/kernel/inet.html#setopts/2',
        category: 'erlang_docs',
        description: 'Details on socket options, active modes, buffer sizes, and TCP options.',
      },
      {
        title: 'Learn You Some Erlang: Buckets of Sockets',
        url: 'https://learnyousomeerlang.com/buckets-of-sockets',
        category: 'book_rfc',
        description: 'In-depth explanation of active once and connection workers.',
      },
    ],
  },

  // ── Lesson 10.3: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch10-l03',
    chapterNumber: 10,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Stateful Stream Framing: Reconstructing Fragmented & Coalesced TCP Packets',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

The most common misconception among developers new to raw network programming is assuming that **one network send equals one network receive**.

In TCP, there are **no message boundaries**. TCP is a continuous, unstructured **byte stream**. Over real physical networks:
1. **Packet Fragmentation**: A single client command like \`<<"SET username Alice\\r\\n">>\` may be chopped by intermediate routers into 3 chunks: \`<<"SET ">>\`, \`<<"user">>\`, and \`<<"name Alice\\r\\n">>\`.
2. **Packet Coalescing (Nagle's Algorithm)**: Two separate commands sent back-to-back by a client may arrive glued together in a single TCP read: \`<<"PING\\r\\nPING\\r\\nPING\\r\\n">>\`.

If your server blindly parses incoming \`{tcp, Socket, Data}\` binaries without maintaining a stateful **framing buffer**, it will crash with syntax errors on fragmented frames and drop coalesced commands!

\`\`\`
+-------------------------------------------------------------------------+
|                TCP FRAGMENTATION & COALESCING IN ACTION                 |
+-------------------------------------------------------------------------+
  Client Sends:
    Frame 1: "SET token abc\\r\\n"
    Frame 2: "GET token\\r\\n"

  Wire Delivers:
    Chunk 1: "SET tok"                   --> Buffer: "SET tok" (No \\r\\n yet)
    Chunk 2: "en abc\\r\\nGET token\\r\\nPA" --> Extracted: ["SET token abc", "GET token"]
                                             Buffer: "PA" (Waiting for next \\r\\n)
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### Preventing Sub-Binary Reference Leaks with \`binary:copy/1\`
When your framing function extracts lines from a large binary, the leftover uncompleted slice (\`RemainingBufferBin\`) is a **sub-binary** pointing into the original 64KB socket buffer allocated by the BEAM runtime. If this sub-binary sits in your actor's state loop, the entire 64KB off-heap binary is pinned in memory!

By calling:
\`\`\`erlang
CleanRemaining = binary:copy(RemainingBuffer)
\`\`\`
you allocate a tiny independent binary for the leftover fragment and allow the 64KB parent buffer to be immediately reclaimed by the garbage collector!

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / binary)
binary:split(Subject, Pattern) -> [binary()]
binary:split(Subject, Pattern, Options) -> [binary()]
  Types:
    Subject = binary()
    Pattern = binary() | [binary()]
    Options = [global | trim | trim_all]

binary:copy(Subject) -> binary()
  %% Allocates a completely fresh, unshared copy of Subject.
  %% Essential for unpinning sub-binaries in long-lived state buffers!
\`\`\`

## Assignment Specification

Implement module \`tcp_frame_buffer.erl\` with:

1. **\`new/0\`**:
   - Returns an empty binary buffer \`<<>>\`.
2. **\`append_and_extract_lines(OldBufferBin, IncomingChunkBin)\`**:
   - Concatenates \`OldBufferBin\` and \`IncomingChunkBin\`.
   - Iteratively scans for the \`<<"\\r\\n">>\` delimiter.
   - For every complete line encountered, extracts the line payload **without** the trailing \`\\r\\n\`.
   - Accumulates extracted lines in first-in, first-out (FIFO) sequential order.
   - Copies the remaining incomplete trailing bytes with \`binary:copy/1\`.
   - Returns: \`{ExtractedLinesList, RemainingBufferBin}\`.

### Concrete Example Walkthrough
\`\`\`erlang
%% Initial empty buffer + fragmented chunk
Buf0 = tcp_frame_buffer:new(),
{Lines1, Buf1} = tcp_frame_buffer:append_and_extract_lines(Buf0, <<"PING\\r\\nSET k">>),
%% Lines1 = [<<"PING">>], Buf1 = <<"SET k">>

%% Incoming second chunk completes the SET and adds a coalesced GET
{Lines2, Buf2} = tcp_frame_buffer:append_and_extract_lines(Buf1, <<" v\\r\\nGET k\\r\\nPARTIAL">>),
%% Lines2 = [<<"SET k v">>, <<"GET k">>], Buf2 = <<"PARTIAL">>
\`\`\`

## Rules & Verification Constraints
- Extracted lines must **not** include the \`\\r\\n\` delimiter.
- Lines must be returned in exact arrival order.
- AST verifier requires: \`binary:copy\`.
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
        description: 'Splits Subject into binaries based on Pattern.',
        complexityNote: 'Optimized Boyer-Moore binary search.',
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
        description: 'Creates a deep copy of Subject to prevent sub-binary reference pinning.',
        complexityNote: 'Allocates independent binary storage.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#copy/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/binary.erl'
      }
    ],
    starterCode: `-module(tcp_frame_buffer).

-export([new/0, append_and_extract_lines/2]).

%% @doc Returns an initial empty framing buffer.
-spec new() -> binary().
new() ->
    <<>>.

%% @doc Appends an incoming chunk to the buffer and extracts all complete \\r\\n lines.
%% Returns {ExtractedLinesList, RemainingBufferBin}.
-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(OldBufferBin, IncomingChunkBin)
  when is_binary(OldBufferBin), is_binary(IncomingChunkBin) ->
    Combined = <<OldBufferBin/binary, IncomingChunkBin/binary>>,
    extract_lines(Combined, []).

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"\r\n">>) of
        [CompleteLine, Rest] ->
            extract_lines(Rest, [CompleteLine | Acc]);
        [IncompleteBuffer] ->
            %% % TODO: Copy remaining buffer with binary:copy/1 to prevent sub-binary leaks
            CleanRemaining = binary:copy(IncompleteBuffer),
            {lists:reverse(Acc), CleanRemaining}
    end.
`,
    solutionCode: `-module(tcp_frame_buffer).

-export([new/0, append_and_extract_lines/2]).

-spec new() -> binary().
new() ->
    <<>>.

-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(OldBufferBin, IncomingChunkBin)
  when is_binary(OldBufferBin), is_binary(IncomingChunkBin) ->
    Combined = <<OldBufferBin/binary, IncomingChunkBin/binary>>,
    extract_lines(Combined, []).

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"\r\n">>) of
        [CompleteLine, Rest] ->
            extract_lines(Rest, [CompleteLine | Acc]);
        [IncompleteBuffer] ->
            CleanRemaining = binary:copy(IncompleteBuffer),
            {lists:reverse(Acc), CleanRemaining}
    end.
`,
    solutionExplanation: `### How Stream Framing Works
1. **Concatenation**: \`<<Old/binary, Incoming/binary>>\` stitches chunks together at binary speed.
2. **Delimiter Splitting**: \`binary:split(Buffer, <<"\\r\\n">>)\` finds the next newline.
3. **FIFO Ordering**: \`lists:reverse(Acc)\` preserves the temporal order of client commands.
4. **Memory Safety**: \`binary:copy(IncompleteBuffer)\` releases the parent ProcBin reference.`,
    visibleTestCases: [
      {
        id: 'tc_fragmented_chunk',
        title: 'Buffer Fragmented Lines',
        erlangCall: 'tcp_frame_buffer:append_and_extract_lines(<<>>, <<"HELLO\\r\\nWOR">>).',
        expectedOutput: '{[<<"HELLO">>], <<"WOR">>}',
        explanation: 'Extracts <<"HELLO">> and retains <<"WOR">> in the remaining buffer.',
      },
      {
        id: 'tc_coalesced_chunk',
        title: 'Extract Coalesced Lines',
        erlangCall: 'tcp_frame_buffer:append_and_extract_lines(<<"WOR">>, <<"LD\\r\\nFOO\\r\\nBAR\\r\\n">>).',
        expectedOutput: '{[<<"WORLD">>, <<"FOO">>, <<"BAR">>], <<>>}',
        explanation: 'Completes WORLD and extracts all coalesced lines cleanly.',
      },
    ],
    astRules: {
      requiredCalls: ['binary:copy'],
    },
    references: [
      {
        title: 'Erlang stdlib Reference: binary Module',
        url: 'https://www.erlang.org/doc/apps/stdlib/binary.html',
        category: 'erlang_docs',
        description: 'Documentation for binary:split, binary:copy, and sub-binary reference handling.',
      },
      {
        title: 'Learn You Some Erlang: Bit Syntax & Binaries',
        url: 'https://learnyousomeerlang.com/starting-out-for-real#bit-syntax',
        category: 'book_rfc',
        description: 'Binary pattern matching and binary stream reconstruction.',
      },
    ],
  },

  // ── Lesson 10.4: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch10-l04',
    chapterNumber: 10,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Building a Ranch-Style Concurrent Acceptor Pool & Connection Handoff',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

In high-concurrency systems (like WhatsApp, Discord, or financial market feeds), thousands of clients connect simultaneously.

If your server runs a **single acceptor process** executing:
\`\`\`erlang
accept_loop(ListenSocket) ->
    {ok, ClientSocket} = gen_tcp:accept(ListenSocket),
    handle_client(ClientSocket),  %% BOTTLENECK!
    accept_loop(ListenSocket).
\`\`\`
every incoming connection is blocked behind every other client's request!

Production-grade servers (such as Nine Nines' **Ranch**, used by Cowboy HTTP server and MongooseIM XMPP server) solve this using the **Acceptor Pool Pattern**:
1. A master listener opens a single shared \`ListenSocket\`.
2. A pool of $N$ acceptor processes **concurrently call \`gen_tcp:accept(ListenSocket)\`** on that identical socket descriptor.
3. The BEAM VM and Linux kernel dispatch incoming TCP SYN handshakes across the pool without lock contention.
4. The instant an acceptor receives \`{ok, ClientSocket}\`, it spawns a dedicated connection worker and transfers ownership via **\`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`**, then immediately loops back to accept the next client!

\`\`\`
+-------------------------------------------------------------------------+
|                  RANCH-STYLE ACCEPTOR POOL ARCHITECTURE                 |
+-------------------------------------------------------------------------+
                     [ListenSocket (Port 5222)]
                                  |
         +------------------------+------------------------+
         |                                                 |
         v                                                 v
  [Acceptor 1]                                      [Acceptor 2]
  gen_tcp:accept(Sock)                              gen_tcp:accept(Sock)
         |                                                 |
  (Client connects!)                                (Client connects!)
         v                                                 v
  spawn(Worker1)                                    spawn(Worker2)
  controlling_process(Sock, Worker1)                controlling_process(Sock, Worker2)
  Worker1 ! {socket_ready, Sock}                    Worker2 ! {socket_ready, Sock}
         |                                                 |
  (Loops back to accept!)                           (Loops back to accept!)
+-------------------------------------------------------------------------+
\`\`\`

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

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (kernel / gen_tcp)
gen_tcp:controlling_process(Socket, NewOwnerPid) -> ok | {error, Reason}
  Types:
    Socket = gen_tcp:socket()
    NewOwnerPid = pid()

  %% Reason can be {badarg, ...} if NewOwnerPid is dead or Socket is invalid
\`\`\`

## Assignment Specification

Implement module \`tcp_acceptor_pool.erl\` with:

1. **\`start_pool(Port, PoolSize)\`**:
   - Opens a listening socket on \`Port\` (use \`0\` for ephemeral) with options \`[binary, {packet, raw}, {active, false}, {reuseaddr, true}]\`.
   - Spawns \`PoolSize\` acceptor processes running \`acceptor_loop(ListenSocket, ManagerPid)\`.
   - Returns \`{ok, ManagerPid, ActualPort}\`.
2. **\`acceptor_loop(ListenSocket, ManagerPid)\`**:
   - Calls \`gen_tcp:accept(ListenSocket)\`.
   - When a client connects:
     - Spawns a dedicated connection worker process.
     - Calls \`ok = gen_tcp:controlling_process(ClientSocket, WorkerPid)\`.
     - Sends \`WorkerPid ! {socket_assigned, ClientSocket}\`.
     - Informs \`ManagerPid\` of the new connection.
     - Loops back immediately to \`gen_tcp:accept(ListenSocket)\`.
3. **\`worker_loop(ClientSocket, ManagerPid)\`**:
   - Waits for \`{socket_assigned, ClientSocket}\`.
   - Arms \`inet:setopts(ClientSocket, [{active, once}])\`.
   - In \`receive\`:
     - On \`{tcp, Socket, Data}\`: replies with \`gen_tcp:send(Socket, <<"+REPLY: ", Data/binary>>)\`, re-arms \`{active, once}\`, and continues.
     - On \`{tcp_closed, Socket}\`: informs \`ManagerPid ! {client_disconnected, self()}\` and exits cleanly.
4. **\`get_active_workers(ManagerPid)\`**:
   - Returns the current integer count of active connected client workers.
5. **\`stop_pool(ManagerPid)\`**:
   - Stops the pool, closes the listen socket, and terminates all active workers.

## Rules & Verification Constraints
- Verified by connecting 5 clients concurrently and checking \`get_active_workers/1\`.
- AST verifier checks: \`gen_tcp:controlling_process\` and \`inet:setopts\`.
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
        description: 'Assigns a new controlling process to the socket.',
        complexityNote: 'Transfers socket port message delivery ownership.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#controlling_process/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/gen_tcp.erl'
      },
      {
        functionName: 'setopts',
        module: 'inet',
        signature: 'inet:setopts(Socket, Options) -> ok | {error, Reason}',
        typesSpec: [
          'Socket = inet:socket()',
          'Options = [inet:socket_setopt()]'
        ],
        description: 'Enables active once mode on client worker sockets.',
        complexityNote: 'Binds socket mode for flow-controlled packet reception.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/inet.html#setopts/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/inet.erl'
      }
    ],
    starterCode: `-module(tcp_acceptor_pool).

-export([start_pool/2, stop_pool/1, get_active_workers/1]).

-record(mgr_state, {
    listen_socket :: gen_tcp:socket(),
    acceptor_pids = [] :: [pid()],
    workers = [] :: [pid()]
}).

-spec start_pool(inet:port_number(), pos_integer()) -> {ok, pid(), inet:port_number()}.
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() ->
        manager_init(ListenSocket, PoolSize)
    end),
    {ok, ManagerPid, ActualPort}.

-spec stop_pool(pid()) -> ok.
stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

-spec get_active_workers(pid()) -> non_neg_integer().
get_active_workers(ManagerPid) ->
    Ref = make_ref(),
    ManagerPid ! {get_worker_count, self(), Ref},
    receive
        {worker_count, Ref, Count} -> Count
    after 2000 ->
        0
    end.

manager_init(ListenSocket, PoolSize) ->
    Self = self(),
    AcceptorPids = [
        spawn_link(fun() -> acceptor_loop(ListenSocket, Self) end)
        || _ <- lists:seq(1, PoolSize)
    ],
    manager_loop(#mgr_state{
        listen_socket = ListenSocket,
        acceptor_pids = AcceptorPids,
        workers = []
    }).

manager_loop(#mgr_state{listen_socket = ListenSocket, workers = Workers, acceptor_pids = Acceptors} = State) ->
    receive
        {client_connected, WorkerPid} ->
            manager_loop(State#mgr_state{workers = [WorkerPid | Workers]});
        {client_disconnected, WorkerPid} ->
            manager_loop(State#mgr_state{workers = lists:delete(WorkerPid, Workers)});
        {get_worker_count, From, Ref} ->
            From ! {worker_count, Ref, length(Workers)},
            manager_loop(State);
        stop ->
            gen_tcp:close(ListenSocket),
            [exit(A, kill) || A <- Acceptors],
            [exit(W, kill) || W <- Workers],
            ok
    end.

acceptor_loop(ListenSocket, ManagerPid) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> worker_loop(ClientSocket, ManagerPid) end),
            %% % TODO: Transfer controlling process to WorkerPid
            ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
            WorkerPid ! {socket_assigned, ClientSocket},
            ManagerPid ! {client_connected, WorkerPid},
            acceptor_loop(ListenSocket, ManagerPid);
        {error, closed} ->
            ok;
        {error, _Reason} ->
            acceptor_loop(ListenSocket, ManagerPid)
    end.

worker_loop(ClientSocket, ManagerPid) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            worker_receive(ClientSocket, ManagerPid)
    after 3000 ->
        gen_tcp:close(ClientSocket)
    end.

worker_receive(ClientSocket, ManagerPid) ->
    receive
        {tcp, Socket, Data} ->
            _ = gen_tcp:send(Socket, <<"+REPLY: ", Data/binary>>),
            ok = inet:setopts(Socket, [{active, once}]),
            worker_receive(ClientSocket, ManagerPid);
        {tcp_closed, _Socket} ->
            ManagerPid ! {client_disconnected, self()},
            ok;
        {tcp_error, _Socket, _Reason} ->
            ManagerPid ! {client_disconnected, self()},
            ok
    end.
`,
    solutionCode: `-module(tcp_acceptor_pool).

-export([start_pool/2, stop_pool/1, get_active_workers/1]).

-record(mgr_state, {
    listen_socket :: gen_tcp:socket(),
    acceptor_pids = [] :: [pid()],
    workers = [] :: [pid()]
}).

-spec start_pool(inet:port_number(), pos_integer()) -> {ok, pid(), inet:port_number()}.
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() ->
        manager_init(ListenSocket, PoolSize)
    end),
    {ok, ManagerPid, ActualPort}.

-spec stop_pool(pid()) -> ok.
stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

-spec get_active_workers(pid()) -> non_neg_integer().
get_active_workers(ManagerPid) ->
    Ref = make_ref(),
    ManagerPid ! {get_worker_count, self(), Ref},
    receive
        {worker_count, Ref, Count} -> Count
    after 2000 ->
        0
    end.

manager_init(ListenSocket, PoolSize) ->
    Self = self(),
    AcceptorPids = [
        spawn_link(fun() -> acceptor_loop(ListenSocket, Self) end)
        || _ <- lists:seq(1, PoolSize)
    ],
    manager_loop(#mgr_state{
        listen_socket = ListenSocket,
        acceptor_pids = AcceptorPids,
        workers = []
    }).

manager_loop(#mgr_state{listen_socket = ListenSocket, workers = Workers, acceptor_pids = Acceptors} = State) ->
    receive
        {client_connected, WorkerPid} ->
            manager_loop(State#mgr_state{workers = [WorkerPid | Workers]});
        {client_disconnected, WorkerPid} ->
            manager_loop(State#mgr_state{workers = lists:delete(WorkerPid, Workers)});
        {get_worker_count, From, Ref} ->
            From ! {worker_count, Ref, length(Workers)},
            manager_loop(State);
        stop ->
            gen_tcp:close(ListenSocket),
            [exit(A, kill) || A <- Acceptors],
            [exit(W, kill) || W <- Workers],
            ok
    end.

acceptor_loop(ListenSocket, ManagerPid) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> worker_loop(ClientSocket, ManagerPid) end),
            ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
            WorkerPid ! {socket_assigned, ClientSocket},
            ManagerPid ! {client_connected, WorkerPid},
            acceptor_loop(ListenSocket, ManagerPid);
        {error, closed} ->
            ok;
        {error, _Reason} ->
            acceptor_loop(ListenSocket, ManagerPid)
    end.

worker_loop(ClientSocket, ManagerPid) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            worker_receive(ClientSocket, ManagerPid)
    after 3000 ->
        gen_tcp:close(ClientSocket)
    end.

worker_receive(ClientSocket, ManagerPid) ->
    receive
        {tcp, Socket, Data} ->
            _ = gen_tcp:send(Socket, <<"+REPLY: ", Data/binary>>),
            ok = inet:setopts(Socket, [{active, once}]),
            worker_receive(ClientSocket, ManagerPid);
        {tcp_closed, _Socket} ->
            ManagerPid ! {client_disconnected, self()},
            ok;
        {tcp_error, _Socket, _Reason} ->
            ManagerPid ! {client_disconnected, self()},
            ok
    end.
`,
    solutionExplanation: `### Why This Pattern Scales to Millions of Connections
1. **Concurrent Accept**: Having multiple processes calling \`gen_tcp:accept/1\` eliminates head-of-line handshake serialization.
2. **Immediate Handoff**: The acceptor process spends ~5 microseconds per connection: it spawns a worker, executes \`controlling_process\`, and returns to accepting.
3. **Actor Isolation**: If one client's worker crashes due to bad data, no other client is impacted.`,
    visibleTestCases: [
      {
        id: 'tc_start_pool',
        title: 'Start Acceptor Pool on Port 0',
        erlangCall: 'tcp_acceptor_pool:start_pool(0, 3).',
        expectedOutput: '{ok, _ManagerPid, _Port}',
        explanation: 'Starts an acceptor pool with 3 concurrent workers on an ephemeral port.',
      },
    ],
    astRules: {
      requiredCalls: ['gen_tcp:controlling_process', 'inet:setopts'],
    },
    references: [
      {
        title: 'GitHub ninenines/ranch: Ranch Socket Acceptor Pool',
        url: 'https://github.com/ninenines/ranch',
        category: 'github_ecosystem',
        description: 'The industry-standard TCP socket acceptor pool library for Erlang/OTP.',
      },
      {
        title: 'Erlang kernel Reference: gen_tcp:controlling_process/2',
        url: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html#controlling_process/2',
        category: 'erlang_docs',
        description: 'Details on socket ownership transfer across Erlang processes.',
      },
    ],
  },

  // ── Lesson 10.5: Problem Set (Mini-Capstone) ──────────────────────────────
  {
    id: 'ch10-l05',
    chapterNumber: 10,
    lessonNumber: 5,
    lessonType: 'problem_set',
    title: 'Chapter 10 Mini-Capstone: High-Throughput TCP Key-Value Backend Server',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

You have mastered raw sockets, \`{active, once}\` backpressure, stream framing, and concurrent acceptor pools. Now you will assemble these foundational engineering building blocks into a production-grade, Redis-compatible **TCP Key-Value Backend Server** built entirely from scratch!

This mini-capstone mirrors the core network engine of production databases and messaging gateways (including the XMPP server you will build in Chapters 11 and 12).

\`\`\`
+-------------------------------------------------------------------------+
|                  TCP KEY-VALUE BACKEND ARCHITECTURE                     |
+-------------------------------------------------------------------------+
  Client ---> [Raw TCP Socket]
                     | (Stream of fragmented/coalesced bytes)
                     v
             [Framing Buffer] (Extracts \\r\\n lines)
                     |
                     v
             [Command Parser] (SET k v | GET k | DEL k | PING)
                     |
                     v
             [ETS Key-Value Table] (Off-Heap In-Memory Store)
                     |
                     v
             [Wire Formatter] (+OK | $value | :1 | +PONG | -ERR)
                     |
                     v
             [gen_tcp:send/2] ---> Client
                     |
             inet:setopts(Sock, [{active, once}]) (Flow Control Armed!)
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Wire Protocol

Your server must speak a text-based, newline-terminated (\`\\r\\n\`) protocol:

### 1. The 5 Wire Commands
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
5. **Any Unknown Command**:
   - Reply: \`<<"-ERR unknown command\\r\\n">>\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / ets)
ets:new(Name, Options) -> tid() | atom()
ets:insert(Tab, Tuple) -> true
ets:lookup(Tab, Key)   -> [Tuple]
ets:delete(Tab, Key)   -> true
ets:member(Tab, Key)   -> boolean()
\`\`\`

## Assignment Specification

Implement module \`tcp_kv_backend.erl\` exporting:
\`\`\`erlang
-module(tcp_kv_backend).
-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).
\`\`\`

### Detailed Function Specs:
1. **\`parse_command(RawLineBin)\`**:
   - Parses a single un-terminated command line into a structured Erlang tuple:
     - \`<<"PING">>\` $\\rightarrow$ \`{ok, ping}\`
     - \`<<"SET ", Rest/binary>>\` $\\rightarrow$ splits on first space into Key and Value: \`{ok, {set, Key, Value}}\`
     - \`<<"GET ", Key/binary>>\` $\\rightarrow$ \`{ok, {get, Key}}\`
     - \`<<"DEL ", Key/binary>>\` $\\rightarrow$ \`{ok, {del, Key}}\`
     - Other $\\rightarrow$ \`{error, unknown_command}\`
2. **\`execute_command(Command, EtsTable)\`**:
   - Executes the command against \`EtsTable\` and returns the wire protocol binary:
     - \`ping\` $\\rightarrow$ \`<<"+PONG\\r\\n">>\`
     - \`{set, Key, Value}\` $\\rightarrow$ inserts \`{Key, Value}\`, returns \`<<"+OK\\r\\n">>\`
     - \`{get, Key}\` $\\rightarrow$ returns \`<<"$", Value/binary, "\\r\\n">>\` or \`<<"$-1\\r\\n">>\`
     - \`{del, Key}\` $\\rightarrow$ returns \`<<":1\\r\\n">>\` (if present) or \`<<":0\\r\\n">>\` (if missing)
     - \`{error, unknown_command}\` $\\rightarrow$ \`<<"-ERR unknown command\\r\\n">>\`
3. **\`start_server/0\`**:
   - Creates a public named ETS table: \`ets:new(tcp_kv_table, [set, public, named_table, {read_concurrency, true}, {write_concurrency, true}])\`.
   - Binds ephemeral port \`0\` via \`gen_tcp:listen(0, [binary, {packet, raw}, {active, false}, {reuseaddr, true}])\`.
   - Obtains assigned OS port via \`inet:port/1\`.
   - Spawns an acceptor process that:
     - Loops on \`gen_tcp:accept(ListenSocket)\`.
     - Spawns a connection worker per client.
     - Calls \`gen_tcp:controlling_process(ClientSocket, WorkerPid)\`.
     - Worker registers as \`tcp_kv_worker\` (or catches duplicate) and maintains stateful framing buffer.
     - Worker processes lines, replies over \`gen_tcp:send/2\`, and re-arms \`{active, once}\` after every frame!
   - Returns \`{ok, ServerPid, Port}\`.
4. **\`stop_server(ServerPid)\`**:
   - Cleanly closes the listen socket, deletes the ETS table, and stops all processes. Returns \`ok\`.

## Rules & Verification Constraints
- **Unit Verifier**: Tests \`parse_command/1\` and \`execute_command/2\` with valid, missing, and invalid terms.
- **Fragmentation Test**: Connects real client, sends fragmented packets (\`<<"SE">>\`, \`<<"T k ">>\`, \`<<"v\\r\\n">>\`), asserts response \`<<"+OK\\r\\n">>\`.
- **Coalescing Test**: Sends 4 coalesced commands in one blast (\`<<"GET k\\r\\nPING\\r\\nDEL k\\r\\nGET k\\r\\n">>\`), asserts exact multi-frame wire response.
- **Backpressure Verification**: Uses \`bf_backpressure_tester\` to assert that worker mailbox queue length remains bounded under high throughput!
`,
    otpDocCards: [
      {
        functionName: 'insert',
        module: 'ets',
        signature: 'ets:insert(Tab, TupleOrTuples) -> true',
        typesSpec: [
          'Tab = tab()',
          'TupleOrTuples = tuple() | [tuple()]'
        ],
        description: 'Inserts objects into an ETS table.',
        complexityNote: 'O(1) in C memory outside process heap.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#insert/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'lookup',
        module: 'ets',
        signature: 'ets:lookup(Tab, Key) -> [tuple()]',
        typesSpec: [
          'Tab = tab()',
          'Key = term()'
        ],
        description: 'Retrieves objects associated with Key.',
        complexityNote: 'O(1) lock-free read path.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#lookup/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
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

%% @doc Executes a parsed command against an ETS table and returns the wire protocol binary.
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
    catch ets:delete(tcp_kv_table),
    ok.

accept_loop(ListenSocket, Tab) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() ->
                catch register(tcp_kv_worker, self()),
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
            extract_lines(Rest, [Line | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
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
    catch ets:delete(tcp_kv_table),
    ok.

accept_loop(ListenSocket, Tab) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() ->
                catch register(tcp_kv_worker, self()),
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
            extract_lines(Rest, [Line | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
`,
    solutionExplanation: `### Why This Mini-Capstone Architecture is Rock Solid
1. **Decoupled Parser & Executor**: \`parse_command/1\` and \`execute_command/2\` are pure functional units tested in isolation.
2. **Buffer Resilience**: \`extract_lines/2\` processes all complete \`\\r\\n\` boundaries and preserves trailing fragments.
3. **Hardware Backpressure**: Each worker processes incoming frames sequentially and explicitly calls \`inet:setopts(Socket, [{active, once}])\`.
4. **ETS Memory Scale**: Off-heap ETS storage guarantees zero garbage collection pauses as the dataset grows.`,
    visibleTestCases: [
      {
        id: 'tc_parse_ping',
        title: 'Parse PING Command',
        erlangCall: 'tcp_kv_backend:parse_command(<<"PING">>).',
        expectedOutput: '{ok, ping}',
        explanation: 'Parses binary PING into {ok, ping}.',
      },
      {
        id: 'tc_parse_set',
        title: 'Parse SET Command with Key and Value',
        erlangCall: 'tcp_kv_backend:parse_command(<<"SET session_token secret123">>).',
        expectedOutput: '{ok, {set, <<"session_token">>, <<"secret123">>}}',
        explanation: 'Splits on first space into key and value.',
      },
      {
        id: 'tc_exec_ping',
        title: 'Execute PING Command',
        erlangCall: 'tcp_kv_backend:execute_command(ping, dummy_tab).',
        expectedOutput: '<<"+PONG\\r\\n">>',
        explanation: 'Returns wire format +PONG\\r\\n.',
      },
    ],
    astRules: {
      requiredCalls: ['inet:setopts', 'gen_tcp:send', 'ets:insert', 'ets:lookup'],
    },
    references: [
      {
        title: 'Erlang kernel Reference: gen_tcp Module',
        url: 'https://www.erlang.org/doc/apps/kernel/gen_tcp.html',
        category: 'erlang_docs',
        description: 'Complete API reference for gen_tcp functions and options.',
      },
      {
        title: 'Erlang stdlib Reference: ets Module',
        url: 'https://www.erlang.org/doc/apps/stdlib/ets.html',
        category: 'erlang_docs',
        description: 'In-memory off-heap key-value storage in the BEAM VM.',
      },
      {
        title: 'Learn You Some Erlang: Buckets of Sockets',
        url: 'https://learnyousomeerlang.com/buckets-of-sockets',
        category: 'book_rfc',
        description: 'Building custom TCP protocol servers in Erlang.',
      },
    ],
  },
];
