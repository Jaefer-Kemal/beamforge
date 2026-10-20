# Specification 03: The 12-Chapter Master Curriculum Blueprint

Every chapter progresses incrementally: **Concept Micro-Lessons** -> **Guided Runnable Demo** -> **Real-World Problem Sets** -> **Chapter Mini-Capstone**.

## Chapter 1: Getting Started & Functional Foundations
- `ch01-l01`: **Introduction to Erlang, The BEAM VM & "Let It Crash"** (Guided Demo: Inspecting BEAM schedulers, process limits & reductions in the live runner)
- `ch01-l02`: **The Erlang Shell (`erl`), Expressions & Basic Data Types** (Integers, Floats, Booleans, and the Period `.` Terminator)
- `ch01-l03`: **Atoms & Tuples: Representing Structured Telecom Events** (`{user, Id, Status}` tuple construction and extraction)
- `ch01-l04`: **Lists, Head/Tail `[H | T]` & Strings as Character Lists vs Binaries**
- `ch01-l05`: **Variables, Single Assignment & The `=` Pattern Matching Operator** (Why `X = X + 1` fails in Erlang and how bound vs unbound variables match)
- `ch01-l06`: **Modules (`-module`), Exporting (`-export`), and Understanding Arity (`fun/arity`)**
- `ch01-l07`: **Problem Set: Telecom Call Rate & Packet Header Classifier (`telecom_Foundations.erl`)** (Multi-arity functions, tuple pattern matching, and list head/tail extraction)

## Chapter 2: Control Flow, Guards & Tail Recursion
- `ch02-l01`: **Advanced Pattern Matching in Function Heads** (Destructuring nested tuples and lists directly in function clauses)
- `ch02-l02`: **Guard Clauses (`when`) & Guard BIFs** (`is_integer/1`, `is_binary/1`, `,` AND vs `;` OR guards, and why user functions cannot run in guards)
- `ch02-l03`: **Control Expressions: `case...of` and `if...end`** (Branching inside function bodies and catching unmatched clauses)
- `ch02-l04`: **Body Recursion vs. Tail-Call Optimization (TCO) on the BEAM Stack** (How `call_last` reuses stack frames vs `allocate`/`deallocate` stack growth)
- `ch02-l05`: **The Accumulator Pattern & `lists:reverse/1`** (Building result lists in tail-recursive loops without reversing order)
- `ch02-l06`: **Assignment: Real-World Inventory Order Processor (`inventory.erl`)**
  - **Exact Spec:**
    - Product representation: `{product, Id, Name, Price, Stock}`
    - Order representation: `{order, ProductId, Quantity}`
    - Restock representation: `{ProductId, Quantity}`
    - Implement `process_order/2`, `calculate_order_total/2`, and `restock/2`.
    - **Strict AST & Bytecode Rules:** Must use manual tail recursion (`bf_ast_verifier` enforces TCO and blocks `lists:map`, `lists:foldl`, `lists:sum`, and list comprehensions `[...]`).

## Chapter 3: Higher-Order Functions & List Processing
- `ch03-l01`: **Anonymous Functions (`fun(...) -> ... end`) & Function References (`fun mod:f/a`)**
- `ch03-l02`: **Transforming & Filtering Collections (`lists:map/2`, `lists:filter/2`, `lists:filtermap/2`)**
- `ch03-l03`: **Folding & Aggregating State (`lists:foldl/3` vs `lists:foldr/3`)** (Why `foldl` is tail-recursive in OTP `stdlib/src/lists.erl`)
- `ch03-l04`: **List Comprehensions (`[Expr || Generator, Filter]`)**
- `ch03-l05`: **Problem Set: Refactoring Inventory Analytics & SLA Log Aggregator (`inventory_hof.erl`)** (Enforces `required_remote_calls => [{lists, foldl, 3}, {lists, filter, 2}]` via `bf_ast_verifier`)

## Chapter 4: Advanced Data Structures & Binary Protocol Craft
- `ch04-l01`: **Maps (`#{}`): Creation (`=>`), Exact Matching (`:=`), and Dynamic Key Updates**
- `ch04-l02`: **Records (`-record`): Compile-Time Tuple Sugar, Type Specs & Header Caveats**
- `ch04-l03`: **Binaries & Bitstrings (`<<...>>`): Bit-Level Packing, Endianness & UTF-8**
- `ch04-l04`: **Under the Hood: ProcBin Reference-Counted Binaries & Avoiding Sub-Binary Leaks (`binary:copy/1`)**
- `ch04-l05`: **Problem Set: Binary Network Packet & TLV Frame Parser (`packet_parser.erl`)** (Parsing binary stream chunks `<<Type:8, Len:16/big-unsigned-integer, Payload:Len/binary, Rest/binary>>` into `#frame{}` records and maps while passing `assert_no_sub_binary_leak/2`)

## Chapter 5: Concurrency & The Actor Model
- `ch05-l01`: **Guided Demo: Spawning 10,000 Lightweight BEAM Processes vs OS Threads** (Runnable terminal demonstration inspecting process memory and reductions)
- `ch05-l02`: **Process Creation (`spawn/1`, `spawn/3`), PIDs (`self/0`), and Asynchronous Message Passing (`!`)**
- `ch05-l03`: **Selective `receive...after`: Pattern Matching the Mailbox & Timeouts**
- `ch05-l04`: **Maintaining Process State with Tail-Recursive Actor Loops**
- `ch05-l05`: **Process Registry (`register/2`, `unregister/1`, `whereis/1`) & Named Actors**
- `ch05-l06`: **Problem Set: Concurrent Stateful Inventory Server Actor (`inventory_actor.erl`)** (Turns `inventory.erl` into a registered concurrent process handling `{order, From, Ref, Orders}`, `{restock, Restocks}`, and `{get_stock, From, Ref}` with `receive...after` client timeouts)

## Chapter 6: Fault Tolerance, Links, Monitors & "Let It Crash"
- `ch06-l01`: **Errors in Sequential Erlang (`throw`, `error`, `exit`) and `try...catch...after`**
- `ch06-l02`: **Bidirectional Process Links (`link/1`, `spawn_link/1`) & Cascading Exit Signals**
- `ch06-l03`: **Trapping Exits (`process_flag(trap_exit, true)`) & Supervisor Primitives**
- `ch06-l04`: **Unidirectional Process Monitors (`erlang:monitor/2`) & `'DOWN'` Messages**
- `ch06-l05`: **Under the Hood: Building `my_gen_server:call/2` with `make_ref()` + `monitor/2`** (Why raw `!` and `receive` fail when the server crashes mid-call)
- `ch06-l06`: **Problem Set: Self-Healing Worker Pool & Fault Monitor (`task_coordinator.erl`)** (Spawns monitored workers, traps exits, re-queues crashed tasks automatically, and isolates bad inputs following "Let It Crash")

## Chapter 7: Open Telecom Platform (OTP) Core Behaviours
- `ch07-l01`: **Why Raw Processes Aren't Enough: Introduction to OTP Behaviours**
- `ch07-l02`: **`gen_server` Deep Dive: `init/1`, Synchronous `handle_call/3` & Async `handle_cast/2`**
- `ch07-l03`: **`gen_server` Lifecycle: `{continue, Term}`, `handle_info/2`, Timeouts & `terminate/2`**
- `ch07-l04`: **`gen_statem`: State Callbacks, Event Transitions, Postponing Events & State Timeouts**
- `ch07-l05`: **`gen_event`: Event Managers, Dynamic Handler Attachment & Notification Pipelines**
- `ch07-l06`: **Problem Set: Production Token-Bucket Rate Limiter (`gen_server`) & Circuit Breaker (`gen_statem`)**

## Chapter 8: OTP Supervision Trees & Application Releases
- `ch08-l01`: **Supervisor Restart Strategies: `one_for_one`, `one_for_all`, and `rest_for_one`**
- `ch08-l02`: **Child Specifications (`child_spec()`), Restart Types (`permanent`, `transient`, `temporary`) & Max Restart Intensity**
- `ch08-l03`: **Dynamic Worker Trees (`simple_one_for_one` & Dynamic Child Spawning)**
- `ch08-l04`: **OTP Applications: `.app.src`, Application Master, Callbacks & Packaging with `rebar3 release`**
- `ch08-l05`: **Problem Set: Multi-Tier Fault-Isolated Payment & Order Supervision Tree (`payment_sup.erl`)** (Tested with `bf_chaos_engine` killing workers and verifying `rest_for_one` recovery)

## Chapter 9: Distributed Erlang, ETS, Mnesia & Property Testing
- `ch09-l01`: **ETS (Erlang Term Storage): Table Types (`set`, `ordered_set`, `bag`), Read/Write Concurrency & Match Specs**
- `ch09-l02`: **Resilient In-Memory State: ETS `{heir, Pid, Data}` Ownership Transfer Across Crashes**
- `ch09-l03`: **Mnesia Distributed Database: Schemas, Atomic Transactions, Dirty Reads & Replication**
- `ch09-l04`: **Distributed Erlang: Nodes, Magic Cookies, `rpc:call/4`, `pg` Process Groups & Netsplits**
- `ch09-l05`: **Testing & QA in Production: EUnit Assertions, PropEr Property-Based Testing & Dialyzer Type Specs**
- `ch09-l06`: **Problem Set: Fault-Tolerant ETS Session Cache with Heir Failover & EUnit Suite (`session_store.erl`)**

## Chapter 10: Backend Engineering: Raw TCP Sockets, Backpressure & Acceptor Pools
- `ch10-l01`: **Guided Runnable Demo: Inside `gen_tcp:listen/2`, `accept/1`, and Packet Inspection** (Pre-built runnable TCP echo & frame inspector in the terminal)
- `ch10-l02`: **TCP Socket Control Modes: `{active, false}` vs `{active, true}` vs `{active, once}` Backpressure**
- `ch10-l03`: **Handling TCP Stream Fragmentation & Coalesced Frames in a Stateful Buffer**
- `ch10-l04`: **Building a Ranch-Style Concurrent TCP Acceptor Pool & Connection Supervisor**
- `ch10-l05`: **Chapter Mini-Capstone: High-Throughput TCP Key-Value Backend Server (`tcp_kv_server.erl`)** (Parses framed commands `SET key val\r\n`, `GET key\r\n` over real TCP sockets using `{active, once}` and an ETS backend, verified by `bf_backpressure_tester`)

## Chapter 11: XMPP Protocol Architecture (Guided & Step-by-Step)
- `ch11-l01`: **Guided Runnable Demo: Observing a Live XMPP Client-to-Server XML Stream** (No code edits required—run the pre-built demo to watch `<stream:stream>`, `<stream:features>`, SASL auth, resource binding, and `<message>` stanzas in the terminal)
- `ch11-l02`: **XMPP Addressing (RFC 7622): Parsing & Normalizing Full and Bare JIDs (`user@domain/resource`)** (`xmpp_jid.erl`)
- `ch11-l03`: **XMPP Stanza Anatomy (RFC 6120): Constructing & Matching `<iq>`, `<presence>`, and `<message>` Records** (`xmpp_stanza.erl`)
- `ch11-l04`: **Incremental XML Stream Framing: Extracting Complete Stanzas from Fragmented TCP Chunks** (`xmpp_xml_framer.erl`)
- `ch11-l05`: **C2S Handshake State Machine: Stream Open -> SASL PLAIN Auth -> Resource Bind** (`xmpp_c2s_fsm.erl`)
- `ch11-l06`: **Presence Subscriptions, Priority Rules & Roster Broadcast Fan-Out** (`xmpp_presence_router.erl`)

## Chapter 12: Final Capstone Studio — Build a Production XMPP Server
- `ch12-capstone`: **Dedicated Multi-File Capstone Studio: The Complete OTP XMPP Server**
  - **5 Interconnected Modules Provided in Workspace:**
    1. `src/xmpp_sup.erl` — Root `rest_for_one` supervisor managing the ETS Session Registry, Stanza Router, and Dynamic C2S Connection Supervisor.
    2. `src/xmpp_stream_parser.erl` — Stateful XML stream & stanza parser resilient to arbitrary TCP byte fragmentation and coalesced packets.
    3. `src/xmpp_c2s_statem.erl` — `gen_statem` managing `{active, once}` socket lifecycle across `wait_for_stream`, `wait_for_sasl`, `authenticated`, and `session_established`.
    4. `src/xmpp_session_registry.erl` — ETS-backed JID routing table (`{BareJid, Resource} -> C2SPid`) with process monitoring and `{heir, ...}` resilience.
    5. `src/xmpp_router.erl` — Routes `<iq type="get|set">`, `<presence>`, and `<message>` stanzas between local connected JIDs and offline fallback storage.