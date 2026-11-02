## Milestone 4: Client-to-Server State Machine (`gen_statem`)

### Why This Matters in Production
Network protocol connections are fundamentally stateful. A client socket connected to port 5222 cannot simply begin sending chat stanzas immediately. The connection must strictly progress through authentication and resource binding gates:

1. It must initiate an XML stream and negotiate encryption/features.
2. It must authenticate identity via SASL PLAIN.
3. It must bind an authorized resource identifier (e.g. `/obsidian` or `/desktop`).
4. Only upon entering the **session_established** state is it permitted to route stanzas and receive incoming messages.

In Erlang/OTP, the premier abstraction for modeling complex connection lifecycles is the `gen_statem` behaviour using **`callback_mode() -> state_functions`**.

> **4-Phase Connection Lifecycle:** `wait_for_stream` (`<stream:stream>`) -> `wait_for_sasl` (`<auth mechanism='PLAIN'>`) -> `authenticated` (`<iq bind>`) -> `session_established` (real-time stanza routing).

### Deep Concept Breakdown: `state_functions` & `process_events/4`
In our industrial architecture, incoming chunks from either unit-test calls (`{xml_chunk, Chunk}`) or live TCP sockets (`{tcp, Socket, Chunk}`) are fed into `xmpp_stream_parser:feed_chunk/2`. The resulting list of structured XML events is then processed sequentially by `process_events(Events, CurrentState, Data, OutXmlAcc)`:

```erlang
process_events([], State, Data, OutAcc) ->
    {State, Data, lists:reverse(OutAcc)};
```

Each clause of `process_events/4` inspects the current protocol state:
- **`wait_for_stream`**: When `{stream_open, Domain}` arrives, respond with the opening stream header advertising SASL PLAIN, and advance state to `wait_for_sasl`.
- **`wait_for_sasl`**: When `{sasl_auth, Mech, Payload}` arrives, extract the username, reply with `<success .../>`, and advance state to `authenticated`.
- **Pre-Auth Security Rejection**: In `wait_for_sasl`, any unauthenticated message stanza (`_PreAuthStanza`) received before SASL authentication is completed MUST be rejected with:
  ```xml
  <stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>
  ```
  The state machine remains in `wait_for_sasl`.
- **`authenticated`**: When `{iq_bind, Id, ResourceBin}` arrives, default resource to `<<"obsidian">`, register in `xmpp_session_registry`, reply with the bound JID result IQ, and advance state to `session_established`.
- **`session_established`**: Normal chat stanzas are passed to `xmpp_router:route_stanza/3`.

### Active-Once TCP Flow Control & Mailbox Protection
In Erlang socket programming, we set the socket to `{active, once}` during `init/1` and after every received packet. The OS kernel delivers exactly one packet to the actor as an Erlang message `{tcp, Socket, Data}`, switching the socket to passive mode until we process it and re-enable active-once. This provides built-in TCP backpressure!

### Step-by-Step Assignment Task
1. Open `src/xmpp_c2s_statem.erl`.
2. In `process_events([{stream_open, Domain} | Rest], wait_for_stream, Data, OutAcc)`:
   - Construct `Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>`.
   - Recurse with `wait_for_sasl`, `Data#{domain => Domain}`, and `[Reply | OutAcc]`.
3. In `process_events([{sasl_auth, _Mech, Payload} | Rest], wait_for_sasl, Data, OutAcc)`:
   - Extract user: `User = extract_user_from_sasl(Payload, maps:get(username, Data, <<"alice">>))`.
   - Construct `Reply = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>`.
   - Recurse with `authenticated`, `Data#{username => User}`, and `[Reply | OutAcc]`.
4. In `process_events([_PreAuthStanza | Rest], wait_for_sasl, Data, OutAcc)`:
   - Construct `Err = <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>`.
   - Recurse with `wait_for_sasl`, `Data`, and `[Err | OutAcc]`.
5. In `process_events([{stream_open, Domain} | Rest], authenticated, Data, OutAcc)`:
   - Construct `Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>">>`.
   - Recurse with `authenticated`, `Data#{domain => Domain}`, and `[Reply | OutAcc]`.
6. In `process_events([{iq_bind, Id, ResourceBin} | Rest], authenticated, Data, OutAcc)`:
   - Format resource and `FullJid = <<User/binary, "@", Domain/binary, "/", Res/binary>>`.
   - Register: `xmpp_session_registry:register_session(FullJid, maps:get(priority, Data, 10), self())`.
   - Construct `Reply = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>`.
   - Recurse with `session_established`, `Data#{resource => Res, full_jid => FullJid}`, and `[Reply | OutAcc]`.