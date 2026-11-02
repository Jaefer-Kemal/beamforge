## Why This Matters in Production

In production messaging backends, errors cannot be communicated via generic HTTP status codes. **RFC 6120 Section 8** defines a formal, structured error hierarchy containing specific error types and standardized XML condition elements.

When a client transmits a stanza to a non-existent JID, attempts an unauthenticated request, or exceeds server rate limits, the server must formulate a standardized stanza-level or stream-level error response:
1. **Error Types (RFC 6120 Section 8.3)**:
   - `auth`: Authentication or authorization prerequisite failed.
   - `cancel`: Irrecoverable error; client must not retry without altering the request.
   - `modify`: Request was malformed; retry after updating payload parameters.
   - `wait`: Transient load or lock condition; retry after a backoff interval.

2. **Standardized Condition Elements**:
   - `not-authorized` (`auth`)
   - `forbidden` (`auth`)
   - `item-not-found` (`cancel`)
   - `bad-request` (`modify`)
   - `resource-constraint` (`wait`)

In addition, **RFC 6121 Section 3** defines the mutual presence subscription state machine:
- `none`: Neither party sees presence.
- `to`: User sees contact's presence.
- `from`: Contact sees user's presence.
- `both`: Mutual presence subscription.

## Assignment Specification

Implement module `xmpp_error_and_roster.erl`:
1. `classify_error_condition(ConditionAtom)`: Returns `{TypeBin, ConditionBin}`.
2. `build_stanza_error(StanzaTagBin, IdBin, ToJidBin, ConditionAtom)`: Synthesizes structured XML error stanza.
3. `build_stream_not_authorized()`: Returns `<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>`.
4. `transition_subscription(Current, InboundAction)`: Computes new subscription state (`none`, `to`, `from`, `both`).
