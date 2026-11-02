## Why This Matters in Production

In the XMPP architecture, the fundamental unit of addressing is the **Jabber Identifier (JID — RFC 7622)**. 

A single user account has a **Bare JID** (`alice@chat.beamforge.io`), representing their account identity across all devices. But when Alice logs in from her phone and her laptop simultaneously, the server establishes **two distinct C2S connections**, each assigned a distinct **Full JID**:
- `alice@chat.beamforge.io/mobile_ios`
- `alice@chat.beamforge.io/macbook_desktop`

> **RFC 7622 JID Addressing Structure:**
> - **Localpart:** `alice` (Account identity)
> - **Domainpart:** `chat.beamforge.io` (Server host)
> - **Resourcepart:** `mobile_ios` (Unique client session)
> - **Bare JID:** `alice@chat.beamforge.io` (Account & Roster Identity)
> - **Full JID:** `alice@chat.beamforge.io/mobile_ios` (Unique TCP C2S Session)

If your parser fails to validate empty resources, handles sub-binaries incorrectly, or allows malformed JIDs into your routing table, messages get lost or sent to dead processes.

## Deep Concept Breakdown & Under the Hood

### 1. Memory Safety: Avoiding Sub-Binary Memory Leaks
When an Erlang process receives a 64KB network packet from a socket and extracts small fields using binary pattern matching:
```erlang
<<User:5/binary, "@", Rest/binary>> = PacketBin
```
Erlang creates a **sub-binary reference** that points directly into the original 64KB heap allocation! If you store `User` inside an ETS table or process state, the **entire 64KB parent binary is pinned in memory** and cannot be garbage collected.

To prevent this critical production memory leak, whenever you extract string fields from network packets, you MUST invoke:
```erlang
CleanUser = binary:copy(User)
```
`binary:copy/1` forces the BEAM VM to allocate a fresh, minimal byte slice on the heap, allowing the large socket buffer to be freed immediately!

### 2. Validation Rules (RFC 7622)
1. A valid JID MUST contain an `@` symbol separating the `user` (localpart) and `domain` (domainpart).
2. Neither `user` nor `domain` may be empty binary (`<<>>`).
3. If a forward slash `/` is present, the `resource` (resourcepart) MUST NOT be empty. (e.g. `alice@localhost/` is invalid).
4. If no `/` is present, it is a valid **Bare JID**, and `resource` is normalized to `<<>>`.

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (stdlib / binary)
binary:split(Binary, PatternList) -> [binary()]
  Types:
    Binary = binary()
    PatternList = binary() | [binary()]

%% Forces deep copy of sub-binary to prevent memory pinning:
binary:copy(Subject) -> binary()
  Types:
    Subject = binary()
```

## Assignment Specification

Implement the module `xmpp_jid` in `src/xmpp_jid.erl` with the following exports:

```erlang
-module(xmpp_jid).
-export([
    parse/1,
    to_bare/1,
    format_jid/1,
    is_same_bare_jid/2
]).
```

### Functions to Implement:
1. **`parse(JidBin) -> {ok, JidMap} | {error, invalid_jid}`**:
   - Parses a binary JID into a map:
     `#{user => User, domain => Domain, resource => Resource, bare => Bare}`
   - Uses `binary:copy/1` on all extracted components.
   - Returns `{error, invalid_jid}` for malformed inputs (empty user, empty domain, trailing slash without resource, or missing `@`).
2. **`to_bare(JidInput) -> binary() | {error, invalid_jid}`**:
   - Accepts either a parsed JID map (`#{bare := Bare}`) or a raw binary. Returns the Bare JID binary.
3. **`format_jid(JidMap) -> binary()`**:
   - Given `#{user := U, domain := D, resource := R}`, formats:
     - `<<U/binary, "@", D/binary>>` if `R == <<>>`
     - `<<U/binary, "@", D/binary, "/", R/binary>>` if `R =/= <<>>`
4. **`is_same_bare_jid(Jid1, Jid2) -> boolean()`**:
   - Returns `true` if both JIDs share the same Bare JID (comparing either binaries or maps); `false` otherwise.

## Rules & Verification Constraints

- Must invoke `binary:copy/1` to prevent sub-binary reference pinning.
- Must reject all malformed JIDs with `{error, invalid_jid}`.