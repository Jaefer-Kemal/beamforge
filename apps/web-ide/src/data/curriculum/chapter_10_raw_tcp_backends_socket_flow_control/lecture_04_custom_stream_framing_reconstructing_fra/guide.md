## Why This Matters in Production

TCP is an **unframed stream of bytes**. The operating system makes zero guarantees that each `gen_tcp:send/2` call on the client will correspond to exactly one `{tcp, Socket, Data}` message on the server!

In production backends (HTTP/1.1, Redis RESP, and XMPP XML stream parsers), your server must handle two inevitable physical networking realities:
1. **Packet Fragmentation**: A client sends `"SET user alice\r\n"`, but the network splits it across MTU boundaries. The server receives Chunk 1 `<<"SET us">>` followed 10ms later by Chunk 2 `<<"er alice\r\n">>`.
2. **Packet Coalescing (Nagle's Algorithm)**: Two separate commands sent back-to-back by a client arrive glued together in a single TCP read: `<<"PING\r\nPING\r\nPING\r\n">>`.

To build a reliable network server, you cannot assume incoming packets contain complete lines. You must maintain a **stateful binary accumulation buffer** that stitches chunks together and slices complete frames.

> [!abstract] Stream Framing Algorithm:
> 1. **Concatenation**: `<<OldBuffer/binary, IncomingChunk/binary>>` stitches chunks together at binary speed.
> 2. **Delimiter Slicing**: `binary:split(Combined, <<"\r\n">>)` extracts complete lines.
> 3. **Memory Unpinning**: Call **`binary:copy/1`** on all extracted lines and trailing partial buffers to prevent 64 KB `ProcBin` memory retention leaks!

## Deep Concept Breakdown & Under the Hood

### The 64 KB `ProcBin` Memory Pinning Trap
Recall from Chapter 4 how the BEAM manages binaries:
- Binaries $=< 64$ bytes are stored on the local process heap.
- Binaries $> 64$ bytes are allocated in a shared off-heap reference-counted memory pool called a **`ProcBin`** (often 64 KB socket read buffers).

When you call `binary:split/2`, the BEAM creates a **sub-binary**—a tiny 24-byte struct containing an offset pointer into the original 64 KB off-heap buffer.
If a client sends `<<"PING\r\nHE">>`, you slice out `<<"PING">>`, leaving `<<"HE">>` in your process state.
Even though `<<"HE">>` is only 2 bytes, it retains a reference count on the **entire 64 KB socket buffer**!
If 100,000 idle client connections each retain a 2-byte remainder without unpinning, your server wastes **6.4 Gigabytes of RAM** on empty socket buffers!

Calling **`binary:copy/1`** creates a fresh, independent heap binary, releasing the 64 KB `ProcBin` for immediate garbage collection!

> [!warning] Production Networking Trap: Sub-Binary Memory Pinning in Long-Lived Sockets
> Long-lived connection actors (XMPP, WebSockets, gRPC) that buffer partial frames without calling `binary:copy/1` suffer from slow, fatal memory creep. The memory leak does not show up in garbage collection telemetry because the off-heap refc buffer is legitimately referenced by the 2-byte sub-binary! Always call `binary:copy/1` on partial stream buffers.

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (stdlib / binary)
binary:split(Subject, Pattern) -> [binary()]
  Types:
    Subject = binary()
    Pattern = binary() | [binary()]

binary:copy(Subject) -> binary()
  Types:
    Subject = binary()
  %% Allocates a fresh unpinned binary copy
```

## Parallel Worked Example

Here is a framing engine extracting colon-delimited telemetry metrics:

```erlang
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
```

## Assignment Specification

Implement module `src/tcp_frame_buffer.erl` exporting two framing functions:

1. **`new_buffer() -> binary()`**:
   - Returns an empty binary accumulator `<<>>`.
2. **`append_and_extract_lines(OldBufferBin, IncomingChunkBin) -> {[binary()], binary()}`**:
   - Concatenates `<<OldBufferBin/binary, IncomingChunkBin/binary>>`.
   - Recursively splits on `<<"\r\n">>`.
   - Returns a tuple `{CompleteLinesList, RemainingBufferBin}`.
   - **Crucial Rule**: Every binary in `CompleteLinesList` and `RemainingBufferBin` MUST be unpinned using `binary:copy/1`.

## Rules & Verification Constraints
- Handles empty chunks, partial fragments without newlines, and coalesced multi-line bursts.
- AST verifier checks required calls: `binary:split/2` and `binary:copy/1`.
    