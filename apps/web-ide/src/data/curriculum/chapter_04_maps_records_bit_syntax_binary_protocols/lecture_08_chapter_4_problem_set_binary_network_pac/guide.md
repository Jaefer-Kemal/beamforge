## Why This Matters in Production

Type-Length-Value (TLV) encoding is the foundational binary serialization protocol for telecommunications (Diameter, SMPP, GTP), financial protocols (ISO 8583, FIX binary), and IoT sensors.

In production Erlang services, network data arrives in chunks over TCP sockets. A single TCP packet may contain multiple concatenated frames, or a frame may be truncated across packet boundaries.
To build a resilient parser, you must combine:
1. **Bit Syntax (`<<...>>`)** for precise wire deserialization.
2. **Records (`-record`)** for high-speed tuple framing.
3. **Tail Recursion with Accumulators** to process streams in $O(1)$ stack space.
4. **`binary:copy/1`** to prevent sub-binary memory leaks across long-lived message queues!

## Deep Concept Breakdown & Under the Hood

### Wire Format Specification
Every frame on the wire begins with a 3-byte header followed by a variable-length payload:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Type  |         Length (16 bits, big-endian)          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Payload (Length bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **Version (4 bits, unsigned integer):** Protocol version (e.g. 1).
- **Type (4 bits, unsigned integer):** Message type code (e.g. 2 for PING, 3 for PONG).
- **Length (16 bits, big-endian unsigned integer):** Byte length of the following payload.
- **Payload (`Length` bytes, binary):** Raw data bytes.

### Multi-Frame Stream Processing
When multiple frames arrive in a single binary stream:
```
<<Frame1, Frame2, Frame3, PartialTrailingFragment>>
```
The stream processor must iteratively call `parse_frame/1` in a tail-recursive accumulator loop:
- If all bytes are cleanly consumed (`<<>>`), return `{ok, [Frame1, Frame2, ...]}` in their original order.
- If a trailing fragment remains that is too small to complete a header or payload, return `{partial, ParsedFrames, binary:copy(TrailingBytes)}` so the socket handler can buffer it until more bytes arrive!

## Parallel Worked Example

Consider a binary sensor telemetry parser:

```erlang
-module(sensor_tlv).
-export([parse_sensor_frame/1, parse_sensor_stream/1]).

-record(sensor_event, {device_id, metric_code, val_len, data}).

parse_sensor_frame(<<DevId:8, Code:8, Len:16/big, Data:Len/binary, Rest/binary>>) ->
    Event = #sensor_event{
        device_id = DevId,
        metric_code = Code,
        val_len = Len,
        data = binary:copy(Data)
    },
    {ok, Event, Rest};
parse_sensor_frame(_) ->
    {error, incomplete}.

parse_sensor_stream(Stream) ->
    sensor_stream_loop(Stream, []).

sensor_stream_loop(<<>>, Acc) ->
    {ok, lists:reverse(Acc)};
sensor_stream_loop(Bytes, Acc) ->
    case parse_sensor_frame(Bytes) of
        {ok, Event, Rest} ->
            sensor_stream_loop(Rest, [Event | Acc]);
        {error, incomplete} ->
            {partial, lists:reverse(Acc), binary:copy(Bytes)}
    end.
```

## Official Erlang Docs & Function Reference

```erlang
-record(tlv_frame, {version, type, length, payload}).
<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>
binary:copy(Payload)
```

## Assignment Specification

Implement the complete TLV protocol engine in `src/packet_parser.erl`:

1. Define record:
   `-record(tlv_frame, {version, type, length, payload}).`
2. `parse_frame(Binary)`:
   - Matches `<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>`.
   - Returns `{ok, #tlv_frame{version = Version, type = Type, length = Length, payload = binary:copy(Payload)}, Rest}`.
   - If `Binary` has fewer than 3 bytes or payload is truncated, returns `{error, incomplete_frame}`.
3. `parse_tlv_stream(StreamBinary)`:
   - Processes `StreamBinary` using a tail-recursive accumulator loop calling `parse_frame/1`.
   - If all bytes are consumed cleanly (`<<>>`), returns `{ok, ParsedFramesList}` in original sequence order.
   - If incomplete trailing bytes remain, returns `{partial, ParsedFramesList, binary:copy(TrailingBytes)}`.
4. `encode_frame(#tlv_frame{version = V, type = T, payload = P})`:
   - Computes payload size `byte_size(P)`.
   - Packs and returns the wire binary: `<<V:4, T:4, (byte_size(P)):16/big-unsigned-integer, P/binary>>`.

## Rules & Verification Constraints

- Must define `-record(tlv_frame, {...})`.
- Must use Bit Syntax `<<...>>`.
- Must call `binary:copy/1` on extracted payloads and partial stream remnants.
- `parse_tlv_stream/1` must be strictly tail-recursive.