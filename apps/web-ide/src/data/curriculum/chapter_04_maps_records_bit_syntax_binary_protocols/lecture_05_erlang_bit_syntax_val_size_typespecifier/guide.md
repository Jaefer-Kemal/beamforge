## Why This Matters in Production

Erlang's **Bit Syntax (`<<...>>`)** is widely celebrated as one of the greatest inventions in programming language history.

In C, Go, or Rust, parsing binary network protocols (TCP/IP packets, TLS frames, DNS queries, or WebSocket frames) requires writing fragile, error-prone bit-shifting and masking operations (`(byte >> 4) & 0x0F`).
In Erlang, you declare the binary wire format with exact bit widths, signedness, and endianness directly in pattern matching expressions!

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of a Bit Segment
A bit syntax expression contains comma-separated segments:
```erlang
<<Value:Size/TypeSpecifiers, ...>>
```

The specifier components (`Type-Signedness-Endianness-Unit`) include:
- **Type:**
  - `integer` (default)
  - `binary` / `bytes` (byte-aligned chunk)
  - `bitstring` / `bits` (arbitrary bit count)
  - `float` (32 or 64-bit IEEE float)
  - `utf8` (Unicode UTF-8 codepoint)
- **Signedness:**
  - `unsigned` (default, `0..255` for 8 bits)
  - `signed` (two's complement, `-128..127` for 8 bits)
- **Endianness:**
  - `big` (Network Byte Order, default): Most significant byte first (`<<1024:16/big>> == <<4, 0>>`).
  - `little` (x86 architecture order): Least significant byte first (`<<1024:16/little>> == <<0, 4>>`).

### 2. Packing Bit-Level Fields
Consider an IPv4-style header with a 4-bit Version, a 4-bit Header Flags, and a 16-bit Total Length:

```erlang
%% Version: 4 (0100), Flags: 2 (0010) => 01000010 = 0x42 (decimal 66)
%% Length: 1024 => 0x0400 (decimal 4, 0)
Header = <<4:4, 2:4, 1024:16/big>>.
%% Result is a 3-byte binary: <<66, 4, 0>>!
```

The BEAM compiler emits hardware vector instructions (`bs_put_integer`, `bs_put_binary`) directly into machine code for near-zero CPU overhead.

### 3. Dynamic Length Pattern Matching
In Erlang, you can bind a variable in the first segment of a binary pattern and **immediately use that variable as the size specifier** of a subsequent segment in the very same pattern!

```erlang
%% Len is bound first, then exactly Len bytes are extracted into Payload:
<<Len:16/big, Payload:Len/binary, Rest/binary>> = Packet.
```

If `Packet` contains fewer than `Len` bytes, the pattern simply fails to match.

## Parallel Worked Example

Consider packing a DNS question header:

```erlang
-module(dns_header).
-export([encode_query_header/3, decode_query_header/1]).

%% Encodes 16-bit ID, 1-bit QR, 4-bit Opcode, and 16-bit QuestionCount:
encode_query_header(TxId, Opcode, QCount) ->
    <<TxId:16/big, 0:1, Opcode:4, 0:11, QCount:16/big>>.

%% Matches header fields:
decode_query_header(<<TxId:16/big, QR:1, Opcode:4, _Flags:11, QCount:16/big, Rest/binary>>) ->
    {ok, TxId, QR, Opcode, QCount, Rest};
decode_query_header(_) ->
    {error, malformed_dns_header}.
```

## Official Erlang Docs & Function Reference

```erlang
<<Segment1, Segment2, ...>>
Segment = Value[:Size][/TypeSpecifierList]
TypeSpecifiers = Type-Signedness-Endianness-Unit
```

## Assignment Specification

Implement binary wire packing in `src/bit_packer.erl`:

1. `pack_header(Version, Flags, Length)`:
   - `Version`: 4 bits unsigned integer.
   - `Flags`: 4 bits unsigned integer.
   - `Length`: 16 bits big-endian unsigned integer.
   - Returns a 3-byte binary: `<<Version:4, Flags:4, Length:16/big-unsigned-integer>>`.
2. `unpack_header(Binary)`:
   - Matches `<<Version:4, Flags:4, Length:16/big-unsigned-integer, Payload/binary>>`.
   - Returns `{ok, Version, Flags, Length, Payload}`.
   - If `Binary` has fewer than 3 bytes, returns `{error, insufficient_bytes}`.
3. `encode_utf8_tagged(TextBinary)`:
   - Prepends a single byte `16#01` tag followed by a 16-bit big-endian length prefix and `TextBinary`:
     `<<16#01:8, (byte_size(TextBinary)):16/big, TextBinary/binary>>`.

## Rules & Verification Constraints

- Must use Bit Syntax `<<...>>`.
- Endianness for 16-bit integers must be big-endian (`big`).