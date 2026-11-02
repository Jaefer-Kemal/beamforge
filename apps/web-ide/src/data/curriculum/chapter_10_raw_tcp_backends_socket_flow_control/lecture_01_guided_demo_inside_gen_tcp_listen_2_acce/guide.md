## Why This Matters in Production

Every high-throughput network backend in production—from Redis, PostgreSQL, and RabbitMQ to WhatsApp, Discord, and telecom switches—is built on top of **raw TCP (Transmission Control Protocol) sockets**.

In traditional multithreaded runtimes (Java, C++, Go, Python), handling 50,000 concurrent client connections requires complex thread pools, non-blocking epoll event loops (`libuv`, `Netty`), or mutexes that risk catastrophic deadlocks.

In the **BEAM VM**, raw networking is treated as a first-class concurrency primitive. **Every connected TCP socket is mapped directly to a lightweight Erlang process**. When bytes arrive on the physical network card, the BEAM port driver translates the operating system's TCP segment into an Erlang message (`{tcp, Socket, Data}`) and delivers it straight to that process's private mailbox without shared locks!

> [!abstract] The BEAM Raw TCP Socket Lifecycle
> 1. **`gen_tcp:listen(0, Opts)`**: Asks the OS kernel to bind an available port and creates a `ListenSocket` (the server's front door).
> 2. **`gen_tcp:accept(ListenSocket)`**: Blocks the acceptor process until a client completes the 3-way TCP handshake (`SYN` $\rightarrow$ `SYN-ACK` $\rightarrow$ `ACK`), returning a dedicated `ClientSocket`.
> 3. **Wire Traffic**: Incoming bytes bypass userland mutexes and arrive directly as binary messages in the controlling process's mailbox.

## Deep Concept Breakdown & Under the Hood

### 1. What is a TCP Socket?
A TCP connection is not a physical cable; it is a stateful contract maintained between two operating system kernels over an IP network:
- **Sequence Numbers & ACKs**: Every byte transmitted is numbered. The receiving kernel acknowledges received ranges and automatically retransmits lost packets.
- **The 3-Way Handshake**: Connection setup requires three wire segments:
  1. Client sends `SYN` (Synchronize sequence numbers).
  2. Server responds with `SYN-ACK` (Acknowledge client SYN and send server SYN).
  3. Client responds with `ACK` (Acknowledge server SYN).

### 2. `ListenSocket` vs. `ClientSocket`
In Erlang socket programming, the two socket descriptors have completely different responsibilities:
- **`ListenSocket` (`gen_tcp:listen/2`)**: The listening socket is the welcoming front door of your server. It is bound to an IP address and port. Its sole job is to queue incoming connection requests. You **cannot** send or receive payload data over a `ListenSocket`!
- **`ClientSocket` (`gen_tcp:accept/1`)**: Calling `gen_tcp:accept/1` suspends the acceptor process until a client completes the 3-way handshake. The operating system allocates a dedicated, full-duplex communication pipe (`ClientSocket`) specifically for that client, while `ListenSocket` remains free to welcome further connections.

### 3. Ephemeral Port Binding: Why Port `0`?
When calling `gen_tcp:listen(Port, Options)`, specifying port `0` asks the operating system kernel to allocate an unused **ephemeral port** (typically in the range 49152–65535). You then retrieve the actual bound port using:

```erlang
{ok, Port} = inet:port(ListenSocket).
```

Passing port `0` is essential for parallel automated testing and dynamic microservices, preventing `{error, eaddrinuse}` port collision errors when multiple test suites run concurrently!

### 4. Controlling Process of a Socket
On the BEAM, every open socket is owned by an Erlang process known as the **controlling process**:
- The process that calls `gen_tcp:listen/2` or `gen_tcp:accept/1` becomes the initial controlling process.
- All incoming socket messages (`{tcp, Socket, Data}`, `{tcp_closed, Socket}`) are delivered **exclusively** to the controlling process's mailbox.
- If the controlling process terminates, the BEAM VM automatically closes the underlying socket file descriptor!

### 5. Inspecting Live Socket Telemetry: `inet:getstat/2`
In production Erlang, you do not need external kernel probes to measure network throughput. You can query the OS kernel's socket counters directly from Erlang:

```erlang
{ok, Stats} = inet:getstat(Socket, [recv_oct, send_oct, recv_cnt, send_cnt]).
%% Returns: [{recv_oct, 1024}, {send_oct, 512}, {recv_cnt, 4}, {send_cnt, 2}]
```
- `recv_oct` / `send_oct`: Total octets (bytes) received and sent over the wire.
- `recv_cnt` / `send_cnt`: Total number of packets transferred through the socket driver.

> [!warning] Production Networking Trap: Port Starvation & Lingering Sockets
> Every open socket consumes an OS file descriptor. If your connection worker crashes or finishes without calling `gen_tcp:close(Socket)` in its cleanup path, the socket descriptor remains open in the OS kernel until garbage collection occurs. Under 10,000 connections/sec, your server will hit `EMFILE (Too many open files)` and crash! Always wrap socket workers in supervised OTP processes.

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (kernel / gen_tcp & inet)
gen_tcp:listen(Port, Options) -> {ok, ListenSocket} | {error, Reason}
gen_tcp:accept(ListenSocket) -> {ok, ClientSocket} | {error, Reason}
gen_tcp:accept(ListenSocket, Timeout) -> {ok, ClientSocket} | {error, Reason}
gen_tcp:connect(Address, Port, Options) -> {ok, Socket} | {error, Reason}
gen_tcp:send(Socket, Packet) -> ok | {error, Reason}
gen_tcp:close(Socket) -> ok
inet:port(Socket) -> {ok, Port}
inet:getstat(Socket, [StatOption]) -> {ok, [{StatOption, integer()}]}
```

## Assignment Specification

This is a **Guided Demonstration**. The module `src/tcp_live_demo.erl` executes a complete end-to-end TCP socket lifecycle simulation on loopback interface `127.0.0.1`:
1. Binds a `ListenSocket` on ephemeral port `0`.
2. Inspects the allocated OS port using `inet:port/1`.
3. Spawns an acceptor process that accepts a real client connection via `gen_tcp:accept/2`.
4. Connects a TCP client via `gen_tcp:connect/4` and exchanges 3 binary request/response frames:
   - `<<"SYN_FRAME\r\n">>`
   - `<<"DATA_FRAME\r\n">>`
   - `<<"FIN_FRAME\r\n">>`
5. Queries `inet:getstat/2` to inspect live byte and packet telemetry counters.
6. Cleanly closes both sockets with `gen_tcp:close/1` and returns:
   `#{port => Port, frames_exchanged => 3, bytes_received => RecvBytes}`.

Click **`▷ Run`** or **`▶ Submit`** to boot the live TCP server and observe real wire transmission in the terminal!

## Rules & Verification Constraints
- Verified by executing `tcp_live_demo:run_demo/0`.
- AST verifier checks required calls: `gen_tcp:listen/2`, `gen_tcp:accept/2`, `gen_tcp:send/2`, and `gen_tcp:recv/3`.
    