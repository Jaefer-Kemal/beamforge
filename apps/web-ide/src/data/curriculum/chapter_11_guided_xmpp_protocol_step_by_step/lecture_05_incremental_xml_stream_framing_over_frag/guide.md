## Why This Matters in Production

The single biggest pitfall for engineers building XMPP servers is attempting to use standard XML parsers (like DOM or SAX parsers) directly on the incoming TCP socket stream.

Why does that fail catastrophically?
1. **The Stream is Never Closed**: An XML DOM parser expects `</stream:stream>` at the end of the document. If you feed it an open XMPP stream, it blocks forever waiting for EOF!
2. **TCP Packet Fragmentation & Coalescing**: TCP delivers bytes in arbitrary chunks. A client may send an IQ stanza in 3 separate 10-byte packets, or bundle two chat messages into one TCP frame.

> **Incremental XML Stream Framing Pipeline:**
> - **Chunk 1:** `<<"<stream:stream to='host' ...>  <iq type=">>` -> Emits `<stream:stream>` header, keeps incomplete `<iq type=` in buffer.
> - **Chunk 2:** `<<"'set' id='b1'><bind><resource>obs">>` -> Accumulates in buffer.
> - **Chunk 3:** `<<"idian</resource></bind></iq><presence/>">>` -> Slices and emits `<iq>` and self-closing `<presence/>`, leaves buffer empty.

## Deep Concept Breakdown & Under the Hood

### 1. Extracting the Opening Tag
The opening stream tag is a special case: it has no closing `</stream:stream>`. It is simply the opening tag up to its first closing `>`:
```xml
<stream:stream to='localhost' xmlns='jabber:client' ...>
```
Once this header is extracted and emitted as a frame, all subsequent elements inside the stream are self-contained stanzas:
- **Paired Tags**: `<iq ...>...</iq>`, `<message ...>...</message>`, `<auth ...>...</auth>`
- **Self-Closing Tags**: `<presence/>`, `<ping/>`, `<success .../>`

### 2. State Loop & Memory Safety
The framing function `extract_frames/2` takes `(OldBufferBin, NewChunkBin)`, concatenates them, iterates over all complete stanzas in the buffer, and returns:
```erlang
{FramesList, CleanRemainingBuffer}
```
Where `CleanRemainingBuffer` is copied via `binary:copy/1` so that stale 64KB socket buffers are not kept alive in the worker process heap.

## Official Erlang Docs & Function Reference

```erlang
%% Searching for tag boundaries in binaries:
binary:match(Subject, Pattern) -> {Start, Length} | nomatch
binary:part(Subject, Start, Length) -> binary()
binary:copy(Subject) -> binary()
```

## Assignment Specification

Implement the module `xmpp_xml_framer` in `src/xmpp_xml_framer.erl` with the following export:

```erlang
-module(xmpp_xml_framer).
-export([extract_frames/2]).
```

### Function Specification:
```erlang
extract_frames(BufferBin, NewChunkBin) -> {FramesList, RemainingBufferBin}
```
- Concatenates `BufferBin` and `NewChunkBin`.
- Trims leading whitespace.
- If buffer begins with `<stream:stream`:
  - Finds the closing `>` of the opening tag.
  - Extracts the header as the first frame.
  - Continues parsing the remainder for child stanzas.
- For child stanzas:
  - If buffer begins with a self-closing tag (e.g. `<tag ... />` or `<tag/>`): extracts it.
  - If buffer begins with a paired tag (e.g. `<auth ...>...</auth>`, `<iq ...>...</iq>`, `<message ...>...</message>`, `<presence ...>...</presence>`): extracts up to the closing tag `</tag>`.
  - If the closing tag has not arrived yet: stops and leaves the partial XML in `RemainingBufferBin`.
- Returns all extracted frames in arrival order and `binary:copy(RemainingBufferBin)`.

## Rules & Verification Constraints

- Must return extracted frames in sequential FIFO order.
- Must invoke `binary:copy/1` on the remaining buffer.
- Must handle arbitrary TCP fragmentation and coalesced packets.