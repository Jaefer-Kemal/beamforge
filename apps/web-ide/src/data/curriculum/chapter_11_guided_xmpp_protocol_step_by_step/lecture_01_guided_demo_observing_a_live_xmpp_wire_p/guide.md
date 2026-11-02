## Why This Matters in Production

The **Extensible Messaging and Presence Protocol (XMPP — RFC 6120 & RFC 6121)** powers the communication backends of global real-time platforms: from **WhatsApp's core messaging engine** (which originated as an optimized Erlang XMPP fork) to massive telecom carriers and gaming backends running **ejabberd** and **MongooseIM**.

Unlike HTTP (where the client opens a connection, requests a resource, receives JSON, and closes), XMPP establishes a **persistent, bidirectional XML stream** over a single long-lived TCP socket:

> **The 5-Phase XMPP C2S Protocol Lifecycle:**
> 1. **Phase 1: Stream Open** — `<stream:stream to='localhost' xmlns='jabber:client' ...>`
> 2. **Phase 2: Stream Features** — Server advertises supported auth mechanisms (`<mechanisms>`)
> 3. **Phase 3: SASL PLAIN Auth** — Client sends credentials (`<auth>`) and receives `<success/>`
> 4. **Phase 4: IQ Resource Binding** — Client binds session resource (`<iq><bind>`) and receives Full JID
> 5. **Phase 5: Discrete Stanzas** — Bidirectional peer XML exchange (`<iq>`, `<presence>`, `<message>`) over the persistent stream

Notice the most crucial property of XMPP: **The initial `<stream:stream>` tag is NEVER closed** during active communication! It remains open for hours or days. Discrete stanzas (`<iq>`, `<presence>`, `<message>`) are transmitted inside this stream as peer XML root elements.

## Deep Concept Breakdown & Under the Hood

### 1. The 3 Core XMPP Stanza Types
Once the stream is open and authenticated, all communication consists of three stanzas:
- **`<iq>` (Info/Query)**: Synchronous request/response. Every request has `type='get'` or `type='set'` and a unique `id='...'`. The server or recipient MUST reply with `type='result'` or `type='error'` carrying the identical `id`. Used for resource binding, pinging, and roster management.
- **`<presence>`**: Unidirectional broadcast of online/offline status and availability priority (`<show>away</show>`, `<priority>10</priority>`). Sent to the server, which fans it out to all mutual roster contacts.
- **`<message>`**: Asynchronous message payload (`type='chat'` or `type='groupchat'`) directed from one JID to another.

### 2. Why Erlang/OTP is the Undisputed King of XMPP
In object-oriented or thread-per-request architectures, keeping millions of continuous XML streams open exhausts thread limits or requires complex async state machines. 

In Erlang:
1. **One Process Per Connected Session**: Every connected client socket is owned by a single `gen_statem` Erlang process (e.g. `mongoose_c2s.erl`).
2. **Sub-Microsecond Stanza Routing**: Routing a message between Alice and Bob does not require an external database or message broker. The server queries an in-memory ETS table to find Bob's process ID (`BobC2SPid`) and executes an instantaneous BEAM message send:
   ```erlang
   BobC2SPid ! {route_stanza, StanzaXmlBin}
   ```
3. **Hardware Backpressure**: By using `inet:setopts(Socket, [{active, once}])`, a slow client or flooded socket never causes memory leaks or process crashes.

## Official Erlang Docs & Function Reference

```erlang
%% IETF RFC 6120 - Section 4.2: Stream Initiation
%% Opening XML stream header:
<stream:stream from='client@domain' to='server.domain'
               version='1.0' xmlns='jabber:client'
               xmlns:stream='http://etherx.jabber.org/streams'>
```

In this guided demonstration, we will boot an in-memory mock XMPP C2S acceptor and run our automated test harness `bf_xmpp_c2s_harness` against it. You will see the exact wire transcripts and microsecond latencies for each protocol phase.

## Assignment Specification

This is a **guided terminal demo**—no code changes are required!
1. Review the runnable Erlang module `xmpp_wire_demo.erl`.
2. Click **`Run`** to boot the live mock C2S listener and execute the full 5-stage handshake.
3. Observe the structured wire timeline in the console output.
4. Click **`Submit`** to verify the socket and protocol execution stages.

## Rules & Verification Constraints

- The module must export `run_demo/0` returning `{ok, TranscriptCount}`.
- Must execute all 5 protocol stages: Stream Open, Stream Features, SASL Auth, Resource Binding, and Message Routing.