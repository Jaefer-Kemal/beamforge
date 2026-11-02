## Why This Matters in Production

When parsing HTTP headers, MIME multipart streams, or raw TCP line protocols, developers in other languages often convert raw bytes into character strings before splitting on `\r\n`.
In Erlang, converting a 10 MB binary into a character list allocates **160 MB of RAM** just to perform string splits!

The Erlang standard library includes the **`binary`** module, which executes compiled **Boyer-Moore and Aho-Corasick algorithms in optimized C** directly on binary memory buffers.

Furthermore, Erlang includes **Binary Comprehensions** for lightning-fast byte transformation (e.g. WebSocket masking, XOR ciphering, and pixel manipulation).

## Deep Concept Breakdown & Under the Hood

### 1. High-Speed Splitting: `binary:split/2` vs `binary:split/3`
- **`binary:split(Subject, Pattern) -> [Part1, Remainder]`:**
  Splits `Subject` on the **first occurrence** of `Pattern`. This is ideal for parsing HTTP headers (`Key: Value`), where the value itself might contain colons:
  ```erlang
  binary:split(<<"Authorization: Bearer abc:123">>, <<": ">>)
  %% => [<<"Authorization">>, <<"Bearer abc:123">>]
  ```
- **`binary:split(Subject, Pattern, [global, trim_all]) -> [binary()]`:**
  - `global`: Splits on **all occurrences** across the entire buffer.
  - `trim_all`: Automatically discards empty binaries resulting from consecutive delimiters or trailing newlines.

### 2. Searching: `binary:match/2`
Searches `Subject` for `Pattern` and returns `{ByteOffset, PatternLength}` or `nomatch`:
```erlang
binary:match(<<"GET /api/v1/health HTTP/1.1">>, <<"HTTP">>)
%% => {18, 4}  -- Found at zero-indexed byte offset 18 with length 4
```

### 3. Binary Comprehensions and the `<=` Generator
In Chapter 1 Lesson 1.2, you learned that the less-than-or-equal comparison operator in Erlang is `=<` (not `<=`).
Here is what **`<=`** actually is in Erlang: the **Binary Comprehension Generator Arrow**!

A binary comprehension creates a new binary by streaming bytes or bit-groups out of an input binary:
```erlang
<< <<OutExpression>> || <<Pattern>> <= InputBinary, FilterPredicate >>
```

#### Example: WebSocket XOR Masking
The RFC 6455 WebSocket protocol specifies that all client-to-server frames must have their payload masked by XOR-ing every byte with a mask byte:
```erlang
Masked = << <<(Byte bxor 16#FF):8>> || <<Byte:8>> <= OriginalPayload >>.
```
The BEAM VM compiles this comprehension into an ultra-tight, non-allocating C loop that executes in hardware registers!

## Parallel Worked Example

Consider a line-oriented protocol parser for an SMTP/IMAP mail gateway:

```erlang
-module(mail_stream).
-export([parse_command/1, split_mail_lines/1, rot13_cipher/1]).

%% 1. Split first command word
parse_command(InputBin) ->
    case binary:split(InputBin, <<" ">>) of
        [Cmd, Arg] -> {ok, Cmd, Arg};
        [Cmd] -> {ok, Cmd, <<>>}
    end.

%% 2. Split all non-empty lines on CRLF
split_mail_lines(RawMessageBin) ->
    binary:split(RawMessageBin, <<"
">>, [global, trim_all]).

%% 3. Byte transformation using binary comprehension
rot13_cipher(Bin) ->
    << <<(case B of
        Char when Char >= $A andalso Char =< $Z -> ((Char - $A + 13) rem 26) + $A;
        Char when Char >= $a andalso Char =< $z -> ((Char - $a + 13) rem 26) + $a;
        Other -> Other
    end):8>> || <<B:8>> <= Bin >>.
```

## Official Erlang Docs & Function Reference

```erlang
binary:split(Subject, Pattern) -> [binary()]
binary:split(Subject, Pattern, Options) -> [binary()]
binary:match(Subject, Pattern) -> {byte_offset(), length()} | nomatch
<< <<Out:8>> || <<In:8>> <= InBinary >>
```

## Assignment Specification

Implement binary scanning and masking in `src/binary_scanner.erl`:

1. `split_key_value(HeaderBin)`:
   - Uses `binary:split(HeaderBin, <<": ">>)`.
   - If `<<": ">>` is found, returns `{ok, KeyBin, ValueBin}`.
   - If absent, returns `{error, malformed_header}`.
2. `extract_lines(MultiLineBin)`:
   - Uses `binary:split(MultiLineBin, <<"
">>, [global, trim_all])`.
   - Returns a list of all non-empty line binaries.
3. `xor_mask_payload(PayloadBin, MaskByte)`:
   - Uses a binary comprehension `<< <<(B bxor MaskByte):8>> || <<B:8>> <= PayloadBin >>`.
   - Returns the masked binary.

## Rules & Verification Constraints

- Must use `binary:split/2` and `binary:split/3`.
- Must use binary comprehension with `<=`.