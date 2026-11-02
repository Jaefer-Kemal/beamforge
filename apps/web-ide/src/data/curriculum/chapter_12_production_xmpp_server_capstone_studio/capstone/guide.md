## Building a Production Real-Time XMPP Server in Erlang/OTP

Welcome to the **BeamForge Final Capstone**. In this capstone project, you unify all concepts mastered across the curriculum—immutable functional terms, tail-call recursion, binary packet framing, lightweight BEAM actors, OTP `gen_server` and `gen_statem` behaviours, crash-resilient shared ETS tables, and ordered `rest_for_one` supervision trees—into a **fully functional, production-grade XMPP chat server**.

### The 5 Interconnected Modules
1. **Module 1 (`src/xmpp_sup.erl`):** The root OTP supervisor using `rest_for_one` restart strategy.
2. **Module 2 (`src/xmpp_stream_parser.erl`):** High-speed binary XML framer that handles TCP chunk fragmentation.
3. **Module 3 (`src/xmpp_session_registry.erl`):** Shared concurrent ETS table storing active user sessions with Erlang process monitors (`erlang:monitor/2`).
4. **Module 4 (`src/xmpp_c2s_statem.erl`):** Client-to-server connection state machine implementing the 4-phase XMPP lifecycle.
5. **Module 5 (`src/xmpp_router.erl`):** Message routing engine with online delivery and fallback offline queue.