## Milestone 2: Binary TCP Stream Framing & Memory Unpinning

### Why This Matters in Production
TCP is a streaming byte protocol, not a message-oriented protocol. When an XMPP client on an iPhone or Android device sends a packet over cellular LTE or Wi-Fi, the network stack does **not** preserve application message boundaries.

An XML stanza like `<message to='alice@localhost'><body>Hello</body></message>` can be fragmented across two separate TCP packets by OS buffer flushing, IP MTU segmentation, or Nagle's algorithm:

```
TCP Packet 1: <<"<message to='alice@localhost'><body>Hel">>
TCP Packet 2: <<"lo</body></message><ping id='p1'/>">>
```

If your server attempts to parse each TCP packet in isolation with a standard XML parser, it will crash with a syntax error on Packet 1! A production network server must implement an **incremental accumulator pattern** that buffers incomplete trailing bytes and extracts complete protocol frames across packet arrivals.

### Deep Concept Breakdown: Sub-Binary Heap Retention Leaks
Erlang's binary pattern matching is the fastest in the industry because binary slicing (`<<Slice:Len/binary, Rest/binary>> = Bin`) is an **O(1)** operation. It does not copy memory; it creates a lightweight `sub_binary` reference pointing directly into the original parent binary allocation.

However, this creates a notorious BEAM memory leak known as **Sub-Binary Retention**:
- In Erlang, binaries larger than 64 bytes are allocated in a global off-heap memory area called **ProcBins** (reference-counted binaries).
- Suppose your server reads a 64KB TCP buffer from a socket.
- Your parser slices out a 4-byte username `<<"alex">>` and stores it inside the user's persistent session state.
- **THE PITFALL:** The BEAM garbage collector *cannot* free the 64KB parent binary as long as that 4-byte slice exists! If your server handles 100,000 users, you have just pinned 6.4 GB of dead TCP buffer memory in RAM!

> **Memory Pinning Rule:** Without `binary:copy/1`, a 4-byte username slice pins the entire 64 KB TCP buffer in RAM. With `binary:copy/1`, the slice is copied to the local process heap, allowing the 64 KB off-heap ProcBin buffer to be reclaimed immediately.

> **MANDATORY PRODUCTION RULE:** Whenever you extract an attribute string or XML body payload that will outlive the current function call, always pass it through `binary:copy/1`. This forces a fresh, unpinned heap allocation and allows the underlying TCP buffer to be immediately reclaimed by garbage collection.

### Protocol Stanzas to Recognize
Your framer must recognize and emit:
- `<stream:stream to='...'>` -> `{stream_open, Domain}`
- `</stream:stream>` -> `stream_close`
- `<ping id='...'/>` -> `{ping, Id}`
- `<auth mechanism='...'>user</auth>` -> `{sasl_auth, Mechanism, Payload}`
- `<iq id='...'><resource>res</resource></iq>` -> `{iq_bind, Id, Resource}`
- `<message id='...' to='...'><body>text</body></message>` -> `{chat_message, Id, To, Body}`

### Step-by-Step Assignment Task
1. Open `src/xmpp_stream_parser.erl`.
2. In `feed_chunk(BufferBin, IncomingBin)`, concatenate `<<BufferBin/binary, IncomingBin/binary>>` and invoke `extract_events(Combined, [])`.
3. In `extract_events/2`, handle whitespace trimming and pattern match each stanza:
   - For `<ping`: match `<<"/>">>`, extract `"id"` attribute with `binary:copy/1`, and emit `{ping, Id}`.
   - For `<auth`: match closing `<<"</auth>">>`, extract `"mechanism"` attribute and body, copy with `binary:copy/1`, and emit `{sasl_auth, Mech, Payload}`.
   - For `<iq`: match closing `<<"</iq>">>`, extract `"id"` and `<resource>` body, copy with `binary:copy/1`, and emit `{iq_bind, Id, Res}`.
   - For `<message`: match closing `<<"</message>">>`, extract `"id"`, `"to"`, and `<body>` body, copy with `binary:copy/1`, and emit `{chat_message, Id, To, Body}`.
4. If the trailing bytes contain an incomplete XML element, return `{lists:reverse(Acc), binary:copy(CleanBin)}` so the leftover bytes are preserved for the next chunk!