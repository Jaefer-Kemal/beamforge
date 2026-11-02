## Why This Matters in Production

This is one of the most infamous production bugs in Erlang and Elixir engineering: **The Sub-Binary Memory Retention Leak**.

In high-concurrency systems, developers often see the BEAM VM process consuming gigabytes of system RAM even though application metrics show only a few small 16-byte session tokens stored in memory. The VM crashes with an Out-Of-Memory (OOM) kernel panic, but heap profilers report nearly empty process heaps!

Understanding how the BEAM allocates binaries and how to sever sub-binary pointers with **`binary:copy/1`** is essential for any production engineer.

## Deep Concept Breakdown & Under the Hood

### 1. The 64-Byte Binary Threshold
The BEAM manages binaries under two radically different memory strategies based on size:

1. **Heap Binaries (=< 64 bytes):**
   - Stored directly on the local process heap.
   - When passed between processes, their payload bytes are copied into the recipient's heap.
   - When the process performs garbage collection, heap binaries are reclaimed immediately.
2. **Refc Binaries / `ProcBin` (> 64 bytes):**
   - Allocated once in a global **off-heap shared binary memory pool**.
   - The process heap holds only a tiny 24-byte descriptor struct called a **`ProcBin`**, containing a pointer to the global buffer and an atomic reference count.
   - Passing a `ProcBin` between processes sends only the 24-byte descriptor and increments the atomic reference counter by 1—**zero payload copying across processes!**

### 2. The Sub-Binary Leak Pitfall
When you slice a binary:

```erlang
<<Token:16/binary, _Rest/binary>> = Large64MBPacket.
```

The BEAM does NOT allocate a new 16-byte binary. Instead, it creates a **Sub-Binary descriptor** that points directly into the original **64 MB buffer** with an offset and length!

Now consider what happens if you store `Token` inside a long-lived `gen_server` state or an ETS table:
- Even though your application only needs 16 bytes, the sub-binary holds a reference to the **entire 64 MB buffer**!
- The reference count on the 64 MB buffer cannot reach zero.
- **The entire 64 MB buffer remains pinned in RAM indefinitely!**
If you slice 1,000 such tokens from consecutive network packets, your node pins **64 Gigabytes of RAM** for just 16 Kilobytes of actual data!

### 3. The Production Fix: `binary:copy/1`
```erlang
SafeToken = binary:copy(Token).
```
`binary:copy/1` forces the BEAM to allocate a fresh, independent **Heap Binary** on the process heap containing only those 16 bytes.
The pointer to the massive 64 MB off-heap buffer is completely severed! The reference count drops to 0, and the BEAM's binary garbage collector immediately frees the 64 MB buffer.

### 4. Inspecting Pinned Buffers: `binary:referenced_byte_size/1`
OTP provides a diagnostic BIF:
- `byte_size(SubBin)`: Returns the logical size of the slice (e.g. `16` bytes).
- `binary:referenced_byte_size(SubBin)`: Returns the size of the underlying off-heap buffer pinned by this reference (e.g. `65536` bytes)!

## Parallel Worked Example

Consider a packet ingestion gateway:

```erlang
-module(auth_unpinner).
-export([harvest_session_token/1]).

harvest_session_token(RawTlsPacket) ->
    case RawTlsPacket of
        <<Token:16/binary, _Rest/binary>> ->
            %% Unpin Token to release the multi-megabyte TLS buffer!
            SafeToken = binary:copy(Token),
            {ok, SafeToken};
        _ ->
            {error, truncated_packet}
    end.
```

## Official Erlang Docs & Function Reference

```erlang
binary:copy(Subject) -> binary()
binary:referenced_byte_size(Subject) -> non_neg_integer()
byte_size(Bitstring) -> non_neg_integer()
```

## Assignment Specification

Implement safe memory slicing in `src/binary_unpinner.erl`:

1. `extract_token_safe(LargePacket)`:
   - Matches `<<Token:16/binary, _Rest/binary>> = LargePacket`.
   - Calls `binary:copy/1` on `Token` and returns `{ok, SafeToken}`.
   - If `LargePacket` is less than 16 bytes, returns `{error, insufficient_data}`.
2. `slice_packet_safe(Packet, Length)`:
   - Guards `when is_binary(Packet), is_integer(Length), byte_size(Packet) >= Length`.
   - Extracts `Length` bytes: `<<Slice:Length/binary, _Rest/binary>>`.
   - Returns `binary:copy(Slice)`.
3. `inspect_refc_ratio(Bin)`:
   - Returns a 2-tuple `{byte_size(Bin), binary:referenced_byte_size(Bin)}`.

## Rules & Verification Constraints

- Must call `binary:copy/1` on extracted slices.
- Must use `binary:referenced_byte_size/1`.