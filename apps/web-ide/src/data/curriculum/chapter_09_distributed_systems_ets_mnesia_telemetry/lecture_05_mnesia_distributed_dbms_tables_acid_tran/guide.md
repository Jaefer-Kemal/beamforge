## Why This Matters in Production

ETS gives you nanosecond-speed single-operation in-memory lookups. **However, ETS has no multi-row ACID transactions.**

Consider transferring $50 from Alice's wallet to Bob's wallet:
1. In ETS, you call `ets:update_counter` to subtract $50 from Alice.
2. The server crashes due to power outage, OOM, or hardware failure before step 2 executes.
3. Bob never receives the $50, and Alice's money has permanently vanished!

For financial ledgers, inventory balances, and replicated state machines, you need **multi-operation ACID transactions**. Erlang includes **Mnesia**, an ACID-compliant distributed DBMS embedded directly in the BEAM VM.

> [!NOTE]
> **Key Capabilities of Mnesia:**
> - **Embedded in BEAM**: Zero network socket roundtrip; queries execute directly in VM memory.
> - **Multi-Row ACID Transactions**: All operations inside `mnesia:transaction(Fun)` commit together or roll back completely on failure.
> - **Hybrid Storage Modes**: Tables can be stored in RAM (`ram_copies`), on disk using DETS (`disc_copies`), or logged to disk (`disc_only_copies`).
> - **Cluster Replication**: Tables replicate seamlessly across connected BEAM nodes.

## Deep Concept Breakdown & Under the Hood

### Record-Based Table Definitions

Mnesia tables are defined from Erlang records:

```erlang
-record(wallet, {owner, balance}).

setup_tables() ->
    mnesia:start(),
    mnesia:create_table(wallet, [
        {attributes, record_info(fields, wallet)},
        {ram_copies, [node()]}
    ]),
    mnesia:wait_for_tables([wallet], 2000).
```

### Atomic Transactions (`mnesia:transaction/1`)

All reads and writes inside a transactional fun acquire row-level locks and buffer modifications in an in-memory transaction store:

```erlang
TransferFun = fun() ->
    case mnesia:read(wallet, FromOwner) of
        [] -> mnesia:abort(account_not_found);
        [#wallet{balance = FromBal}] when FromBal < Amount ->
            mnesia:abort(insufficient_funds);
        [#wallet{balance = FromBal}] ->
            case mnesia:read(wallet, ToOwner) of
                [] -> mnesia:abort(account_not_found);
                [#wallet{balance = ToBal}] ->
                    mnesia:write(#wallet{owner = FromOwner, balance = FromBal - Amount}),
                    mnesia:write(#wallet{owner = ToOwner, balance = ToBal + Amount}),
                    {FromBal - Amount, ToBal + Amount}
            end
    end
end,
case mnesia:transaction(TransferFun) of
    {atomic, Result} -> {ok, Result};
    {aborted, Reason} -> {error, Reason}
end.
```

### The Guarantee of `mnesia:abort/1`

When `mnesia:abort(Reason)` is called (or if the transaction fun crashes with an exception):
- **100% of writes performed in that transaction are discarded.**
- No partial writes ever touch the underlying table!
- All acquired locks are released immediately.

### Parallel Worked Example: Inventory Reservation Store

```erlang
-module(inventory_txn_store).
-record(item, {sku, quantity}).
-export([init_store/0, reserve_item/2]).

init_store() ->
    mnesia:start(),
    mnesia:create_table(item, [{attributes, record_info(fields, item)}]),
    mnesia:wait_for_tables([item], 2000).

reserve_item(Sku, Qty) ->
    Txn = fun() ->
        case mnesia:read(item, Sku) of
            [] -> mnesia:abort(item_not_found);
            [#item{quantity = Stock}] when Stock < Qty ->
                mnesia:abort(out_of_stock);
            [#item{quantity = Stock}] ->
                mnesia:write(#item{sku = Sku, quantity = Stock - Qty}),
                Stock - Qty
        end
    end,
    case mnesia:transaction(Txn) of
        {atomic, Remaining} -> {ok, Remaining};
        {aborted, Reason} -> {error, Reason}
    end.
```

## 📖 Official Erlang Docs & Function Reference

```erlang
%% Official Mnesia Calls (mnesia)
mnesia:start() -> ok | {error, Reason}
mnesia:create_table(Name, TabDef) -> {atomic, ok} | {aborted, Reason}
mnesia:transaction(Fun) -> {atomic, Result} | {aborted, Reason}
mnesia:read(Tab, Key) -> [record()]
mnesia:write(Record) -> ok
mnesia:abort(Reason) -> no_return()
```

## Assignment Specification

Implement module `mnesia_ledger` exporting:
- Define record: `-record(wallet, {owner, balance}).`
1. `setup_mnesia_table/0 -> ok`:
   - Calls `mnesia:start()`.
   - Creates table `wallet` with `[{attributes, record_info(fields, wallet)}, {ram_copies, [node()]}]` (handling `{already_exists, wallet}`).
   - Waits for the table via `mnesia:wait_for_tables([wallet], 2000)` and returns `ok`.
2. `upsert_wallet(Owner, Balance) -> ok`:
   - Runs a transaction that calls `mnesia:write(#wallet{owner = Owner, balance = Balance})`.
   - Returns `ok`.
3. `atomic_transfer(FromOwner, ToOwner, Amount) -> {ok, NewFrom, NewTo} | {error, Reason}`:
   - Enforces `Amount > 0`.
   - Reads `FromOwner` and `ToOwner`. If either is missing, calls `mnesia:abort(account_not_found)`.
   - If `FromBal < Amount`, calls `mnesia:abort(insufficient_funds)`.
   - Writes updated balances for both accounts and returns `{FromBal - Amount, ToBal + Amount}`.
   - Returns `{ok, NewFrom, NewTo}` on commit, or `{error, Reason}` on abort.
4. `get_wallet_balance(Owner) -> {ok, integer()} | {error, not_found}`:
   - Reads the record in a transaction and returns `{ok, Balance}` or `{error, not_found}`.

## Rules & Verification Constraints
- Must define `-record(wallet, {owner, balance}).`
- Must use `mnesia:transaction/1`, `mnesia:read/2`, `mnesia:write/1`, and `mnesia:abort/1`.
- Overdraft attempts must abort and leave both account balances completely unchanged.
