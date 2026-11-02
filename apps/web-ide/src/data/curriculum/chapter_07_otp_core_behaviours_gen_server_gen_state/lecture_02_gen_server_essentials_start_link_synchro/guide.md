## Why This Matters in Production

In distributed systems, choosing between synchronous and asynchronous communication dictates system reliability, throughput, and memory stability:
- **Synchronous Calls (`gen_server:call/2,3`)** provide **natural backpressure**. When a client invokes `call`, the client process suspends execution until the server replies (or a 5,000ms timeout occurs). This physical pause acts as an automatic throttle: clients cannot submit requests faster than the server can process them!
- **Asynchronous Casts (`gen_server:cast/2`)** are **fire-and-forget**. The client sends the message and immediately continues executing without waiting for confirmation. While casts achieve ultra-low caller latency, they lack backpressure: if producers emit 100,000 casts/second to a server that can only handle 10,000/second, the server's mailbox swells until the BEAM node crashes with Out-Of-Memory (OOM)!

In financial backends (such as multi-currency wallets), balance queries and debit operations must be strictly synchronous to guarantee funds availability, while non-blocking credits can be cast asynchronously.

## Deep Concept Breakdown & Under the Hood

### The Callback Return Contract

In an Erlang `gen_server`, callback return tuples follow a strict, standardized contract:

| Callback Function | Permitted Return Tuples | Architectural Effect |
| :--- | :--- | :--- |
| **`init(Args)`** | `{ok, State}`<br>`{ok, State, {continue, Term}}`<br>`{stop, Reason}` | Spawns and links the process. Returns `{ok, Pid}` to the `start_link` caller. |
| **`handle_call(Req, From, State)`** | `{reply, Reply, NewState}`<br>`{noreply, NewState}`<br>`{stop, Reason, Reply, NewState}` | Synchronous request. `{reply, ...}` immediately sends the reply to `From`. |
| **`handle_cast(Msg, State)`** | `{noreply, NewState}`<br>`{stop, Reason, NewState}` | Asynchronous message. No reply is sent to the sender. |
| **`handle_info(Info, State)`** | `{noreply, NewState}`<br>`{stop, Reason, NewState}` | Raw messages, exit signals, and timer ticks. |

### How `gen_server:call` Works Under the Hood

When client code invokes `gen_server:call(ServerPid, {debit, <<"USD">>, 50})`:
1. The client process creates a unique monitor reference (`MRef = erlang:monitor(process, ServerPid)`).
2. The client sends a tagged tuple `ServerPid ! {'$gen_call', {self(), MRef}, {debit, <<"USD">>, 50}}`.
3. The client waits in a selective `receive` for either `{MRef, Reply}` or `{'DOWN', MRef, process, ServerPid, Reason}`.
4. The `gen_server` engine receives the message, unpacks `From = {ClientPid, MRef}`, invokes your `handle_call/3`, and automatically sends `ClientPid ! {MRef, Reply}` when your callback returns `{reply, Reply, NewState}`!

> [!warning] Production OTP Trap: The Cast Mailbox Explosion
> Never use `gen_server:cast/2` for requests that require backpressure or acknowledgement. If upstream traffic spikes, a `cast` pipeline can queue millions of messages in the server's mailbox in seconds. When in doubt, prefer `call`—the 5ms roundtrip latency is far cheaper than an unrecoverable production OOM restart!

## Parallel Worked Example

The following module implements a simple inventory stock counter demonstrating `call` and `cast`:

```erlang
-module(stock_server).
-behaviour(gen_server).
-export([start_link/1, restock/2, reserve/2, get_stock/1, stop/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link(Initial) -> gen_server:start_link(?MODULE, Initial, []).
restock(Pid, Qty)   -> gen_server:cast(Pid, {restock, Qty}).
reserve(Pid, Qty)   -> gen_server:call(Pid, {reserve, Qty}).
get_stock(Pid)      -> gen_server:call(Pid, get_stock).
stop(Pid)           -> gen_server:stop(Pid).

init(InitialQty) -> {ok, #{stock => InitialQty}}.

handle_call({reserve, Qty}, _From, State = #{stock := Stock}) when Qty =< 0 ->
    {reply, {error, invalid_quantity}, State};
handle_call({reserve, Qty}, _From, State = #{stock := Stock}) when Stock >= Qty ->
    NewStock = Stock - Qty,
    {reply, {ok, NewStock}, State#{stock := NewStock}};
handle_call({reserve, _Qty}, _From, State) ->
    {reply, {error, out_of_stock}, State};
handle_call(get_stock, _From, State = #{stock := Stock}) ->
    {reply, Stock, State}.

handle_cast({restock, Qty}, State = #{stock := Stock}) when Qty > 0 ->
    {noreply, State#{stock := Stock + Qty}}.

handle_info(_Info, State) -> {noreply, State}.
terminate(_Reason, _State) -> ok.
code_change(_Old, State, _Extra) -> {ok, State}.
```

## Assignment Specification

Implement `src/wallet_server.erl` representing a multi-currency banking ledger:
1. `start_link(InitialBalancesMap) -> {ok, Pid}`:
   - Starts a linked `gen_server`. Initial state must be `#{balances => InitialBalancesMap}`.
2. `credit(Pid, Currency, Amount)`:
   - Asynchronously casts `{credit, Currency, Amount}` to the server.
   - If `Currency` is already present, adds `Amount` to existing balance; if absent, initializes at `Amount`.
3. `debit(Pid, Currency, Amount)`:
   - Synchronously calls the server with `{debit, Currency, Amount}`.
   - If `Amount =< 0`, replies `{error, invalid_amount}`.
   - If balance of `Currency` is absent or `< Amount`, replies `{error, insufficient_funds}`.
   - If balance `>= Amount`, deducts `Amount` and replies `{ok, NewBalance}`.
4. `get_balances(Pid) -> BalancesMap`:
   - Synchronously queries the server and returns the current `BalancesMap`.
5. `stop(Pid) -> ok`:
   - Stops the server gracefully via `gen_server:stop(Pid)`.

## Rules & Verification Constraints

- Must export `start_link/1`, `credit/3`, `debit/3`, `get_balances/1`, and `stop/1`.
- `credit/3` must use `gen_server:cast/2`.
- `debit/3` and `get_balances/1` must use `gen_server:call/2`.
- Internal state map must follow `#{balances => #{Currency => Balance}}`.
