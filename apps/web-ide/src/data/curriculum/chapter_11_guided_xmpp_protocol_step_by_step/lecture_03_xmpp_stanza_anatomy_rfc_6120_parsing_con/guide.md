## Why This Matters in Production

In XMPP, after the stream header has been negotiated, all communication consists of discrete XML packets called **Stanzas**. 

Production Erlang servers like MongooseIM and ejabberd handle millions of stanzas per second. Constructing XML efficiently using **IO Lists** and matching incoming stanzas using high-performance binary pattern matching is the foundation of high-throughput messaging.

> **The 3 Fundamental XMPP Stanza Patterns:**
> 1. `<iq>` (Info/Query) — Request/Response correlated by unique `id` attribute.
> 2. `<presence>` (Availability) — Broadcasts presence status and routing priority.
> 3. `<message>` (Direct Chat) — Real-time user-to-user and group chat delivery.

## Deep Concept Breakdown & Under the Hood

### 1. Packet Classification
Before dispatching a packet to its handler, the connection state machine must classify the incoming raw XML packet into one of the core types:
- `stream_open`: Opening tag `<stream:stream ... to='domain' ...>`
- `auth_plain`: SASL auth tag `<auth ... mechanism='PLAIN'>Base64</auth>`
- `iq`: `<iq ... type='get|set|result|error' id='ID' ...>`
- `presence`: `<presence ... type='unavailable|available' ...>`
- `message`: `<message ... id='ID' to='TO' type='chat' ...>`

### 2. High-Performance Wire Binary Construction
In Erlang, concatenating binaries using `<<Chunk1/binary, Chunk2/binary>>` is extremely fast and zero-copy when building known XML payloads.

## Official Erlang Docs & Function Reference

```erlang
%% RFC 6120 Section 8: XML Stanzas
%% Common Stanza Attributes:
%% 'from': sender JID
%% 'to': recipient JID
%% 'id': unique identifier for tracking and correlation
%% 'type': stanza semantic type
```

## Assignment Specification

Implement the module `xmpp_stanza` in `src/xmpp_stanza.erl` with the following exports:

```erlang
-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).
```

### Functions to Implement:
1. **`classify_xml_packet(XmlBin) -> Classification`**:
   - Returns:
     - `{stream_open, ToDomainBin}` if opening `<stream:stream` tag
     - `{auth_plain, Base64DataBin}` if `<auth mechanism='PLAIN'>Data</auth>`
     - `{iq, IdBin, TypeBin}` for `<iq` tags (extracts `id` and `type`)
     - `{presence, TypeBin}` for `<presence` tags (extracts `type`, defaulting to `<<"available">>` if absent)
     - `{message, IdBin, TypeBin, ToBin}` for `<message` tags
     - `unknown` for any other packet.
2. **`build_stream_features(MechanismsList) -> binary()`**:
   - Takes a list of mechanism binaries (e.g. `[<<"PLAIN">>]` or `[<<"PLAIN">>, <<"SCRAM-SHA-256">>]`) and produces valid XML:
     `<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>`
3. **`build_bind_result(IdBin, FullJidBin) -> binary()`**:
   - Returns:
     `<iq type='result' id='ID'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>FullJid</jid></bind></iq>`
4. **`build_chat_message(FromJidBin, ToJidBin, IdBin, BodyTextBin) -> binary()`**:
   - Returns:
     `<message from='From' to='To' id='Id' type='chat'><body>Body</body></message>`

## Rules & Verification Constraints

- Must produce exact XML wire format as specified.
- Attribute quotes in generated XML should be single quotes `'`.