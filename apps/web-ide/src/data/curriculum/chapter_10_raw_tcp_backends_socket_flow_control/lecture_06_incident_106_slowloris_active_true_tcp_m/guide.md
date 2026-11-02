## Production Incident Post-Mortem: Incident #106

At 14:22 UTC, our primary edge TCP ingestion cluster began crashing across multiple availability zones. Within 12 minutes, the Linux kernel OOM (Out-Of-Memory) killer terminated 14 BEAM nodes, abruptly severing over 120,000 active device sessions.

Telemetry inspection revealed two catastrophic defects:
1. **Unbounded Mailbox Growth**: Connection worker processes had average mailbox queue lengths exceeding **80,000 unhandled messages**, consuming over 600 MB of heap memory per connection process!
2. **Corrupted Stream State & Buffer Dropping**: Incoming commands split across MTU packet boundaries (for example, `<<"SET session_token ">>` arriving in Packet 1, followed 15ms later by `<<"secret123\r\n">>` in Packet 2) suffered silent data corruption because the buffer dropped the prefix!

> [!warning] Production Networking Trap: The Silent Poison of `{active, true}`
> In small local tests or during interactive development, `{active, true}` feels effortless: you never have to call `inet:setopts(Socket, [{active, once}])` or remember to re-arm socket reception. Every packet lands in your mailbox instantly.
> 
> But in production under adversarial conditions (Slowloris attacks, network bursts, or slow downstream databases), `{active, true}` completely disables the operating system's TCP receive window. Even if your worker process is stuck doing an expensive database insert or garbage-collecting its heap, the Linux kernel blindly pumps thousands of incoming TCP segments into the BEAM mailbox. 
> 
> Because Erlang mailboxes are unbounded FIFO queues residing on the process heap, the mailbox balloons exponentially until the operating system invokes the OOM killer!

## Deep Concept Breakdown & Under the Hood

### 1. How TCP Receive Windows Provide Hardware Backpressure
When you configure a socket with `{active, once}`:
1. The BEAM C driver reads **one** segment from the OS socket buffer and delivers `{tcp, Socket, Data}` to your Erlang process.
2. The driver **immediately flips the socket to passive mode** (`{active, false}`).
3. While your process executes `handle_info` and formats a reply, subsequent packets from the client remain queued inside the OS kernel's TCP receive buffer (`SO_RCVBUF`).
4. Once the kernel's receive buffer fills up, the OS TCP stack advertises a **Window Size of 0** (`TCP Zero Window`) back across the wire.
5. The client's operating system halts packet transmission at the network card layer! This is true, zero-CPU backpressure.
6. When your Erlang worker finishes processing and calls `inet:setopts(Socket, [{active, once}])`, the BEAM drains the next chunk and the OS opens its TCP window again.

### 2. The Custom Stream Framing & Memory Pinning Defect
In addition to the mailbox flood, the incident post-mortem uncovered a memory leak in the framing parser:
```erlang
%% Defective implementation:
buffer_and_extract_lines(_OldBuffer, Chunk) ->
    Combined = Chunk, %% BUG: Discarded OldBuffer! Incomplete prefixes are lost!
    extract_lines(Combined, []).
```
When a TCP stream fragments across packets, discarding `OldBuffer` destroys any partial command tokens that arrived in previous chunks.

Furthermore, failing to call `binary:copy/1` on the extracted line tokens and trailing partial remainder leaves them pointing into temporary 64 KB off-heap socket buffers (`ProcBin` reference-counted binaries). A 10-byte slice can keep a 64 KB buffer pinned indefinitely in memory!

## Parallel Worked Example: The Correct Triage Pattern

```erlang
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
    case binary:split(Buffer, <<"\r\n">>) of
        [Line, Rest] ->
            %% Unpin each complete line from socket ProcBin
            slice_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            %% Unpin trailing partial remainder for next cycle
            {ok, lists:reverse(Acc), binary:copy(Incomplete)}
    end.
```

## Assignment Specification

Fix module `src/incident_tcp_active_true.erl`:
1. **`recommended_socket_opts/0`**: Change `{active, true}` to `{active, once}` to restore kernel backpressure.
2. **`buffer_and_extract_lines(OldBuffer, Chunk)`**:
   - Concatenate `OldBuffer` and `Chunk`: `Combined = <<OldBuffer/binary, Chunk/binary>>`.
   - Recursively split on `<<"\r\n">>`.
   - Call `binary:copy/1` on each complete line and on the trailing incomplete remainder.
   - Return `{ok, ExtractedLinesList, UnpinnedRemainderBin}`.

## Rules & Verification Constraints
- Verified by the Go Orchestrator against simulated high-rate packet floods and fragmented chunk pipelines.
- AST verifier mandates `binary:split/2` and `binary:copy/1`.
    