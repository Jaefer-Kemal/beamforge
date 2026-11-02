## Incident Briefing: INC-107 Pre-Auth Stanza Injection & XML Entity Attacks

### Production Outage Summary
At 03:14 UTC, security telemetry detected unauthorized messages injected into VIP chat streams without credentials. Attackers exploited an edge case in the C2S connection handling where client sockets in `wait_for_stream` and `wait_for_sasl` were permitted to dispatch stanzas before authentication succeeded.

Furthermore, attackers injected unescaped XML markup (e.g. `<b>Tom & Jerry > 1</b>`), corrupting downstream client XML parsers and causing cascade disconnections.

### Root Cause Analysis
1. **Missing Pre-Auth Guard**: Stanza dispatch did not check connection state, allowing unauthenticated sockets to send chat stanzas.
2. **Missing XML Character Escaping**: User messages containing `&`, `<`, or `>` were concatenated directly into XML binaries without escaping.

### Required Architecture Fix
1. Reject any stanzas received during `wait_for_stream` and `wait_for_sasl` by returning:
   `{reject, <<"<stream:error><not-authorized/></stream:error>">>, State}`
2. Implement recursive binary character escaping for chat bodies:
   - `&` -> `&amp;`
   - `<` -> `&lt;`
   - `>` -> `&gt;`
