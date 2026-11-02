## Why This Matters in Production

In high-concurrency systems (such as high-frequency trading engines, e-commerce checkout backends, and logistics order dispatchers), multiple mutations must happen against complex nested datasets with **zero side effects**, **zero memory leaks**, and **guaranteed determinism**.

In Chapter 2, you have systematically built every piece needed for this capstone:
- **Lesson 2.1**: Deep pattern matching in function heads.
- **Lesson 2.2**: Guard clauses ensuring integers and stock availability.
- **Lesson 2.4**: Recursive lookup helpers (`find_product/2`).
- **Lesson 2.5**: Tail-call optimization with integer accumulators (`sum/2`).
- **Lesson 2.6**: The list accumulator pattern with `lists:reverse/1`.
- **Lesson 2.7**: Updating records in lists while preserving order.

Now, you will synthesize all of these concepts into a production-grade **Inventory Order Processor**.

## Deep Concept Breakdown & Under the Hood

### System Architecture
You will implement the `inventory` module managing an e-commerce catalog represented as a list of 5-tuples:
```erlang
[{product, Id, Name, Price, Stock}, ...]
```

Incoming orders arrive as a list of 2-tuples:
```erlang
[{order, ProductId, Quantity}, ...]
```

You will implement three core business operations:

### 1. Processing Orders (`process_order/2`)
An outer tail-recursive loop iterates through each incoming order `{order, ProdId, Qty}`.
For each order:
- It checks if the product exists in the current inventory AND has `Stock >= Qty`.
- If so, it deducts `Qty` from that product's stock using the list update pattern from Lesson 2.7.
- If the product does not exist, or if stock is insufficient (`Stock < Qty`), that order is **skipped/rejected**, and the inventory remains unchanged.
- When all orders have been processed, the final updated inventory is returned in its exact original order.

### 2. Calculating Order Total (`calculate_order_total/2`)
Calculates the total monetary value of fulfillable orders:
- For each order `{order, ProdId, Qty}`:
- If the product exists in inventory and has `Stock >= Qty`, it contributes `Price * Qty` to the total.
- If the product is missing or stock is insufficient, it contributes `0`.
- Computed in a tail-recursive accumulator loop running in $O(1)$ stack space.

### 3. Restocking Inventory (`restock/2`)
Restocks items from a supplier delivery list: `[{ProductId, RestockQty}, ...]`.
- For each item, increments `Stock` by `RestockQty`.
- Products not in the restock list remain unchanged.
- Preserves the exact original inventory order.

## Official Erlang Docs & Function Reference

```erlang
%% Pure Tail-Recursive Composition:
%% An outer loop over Orders calls an inner helper over Inventory:
process_orders_loop(Inventory, []) ->
    Inventory;
process_orders_loop(Inventory, [{order, ProdId, Qty} | RestOrders]) ->
    NewInv = deduct_stock_if_available(Inventory, ProdId, Qty),
    process_orders_loop(NewInv, RestOrders).
```

## Assignment Specification

Module: `inventory.erl`
Exports: `process_order/2`, `calculate_order_total/2`, `restock/2`

Data Definitions:
- `Product`: `{product, Id :: integer(), Name :: string(), Price :: integer(), Stock :: integer()}`
- `Order`: `{order, ProductId :: integer(), Quantity :: integer()}`
- `RestockItem`: `{ProductId :: integer(), Quantity :: integer()}`

Functions to Implement:
1. `process_order(Inventory, Orders)`:
   - Returns updated `Inventory` with quantities deducted for fulfilled orders.
2. `calculate_order_total(Inventory, Orders)`:
   - Returns integer total cost of all fulfilled orders.
3. `restock(Inventory, Restocks)`:
   - Returns updated `Inventory` with quantities added.

## Rules & Verification Constraints

- **Strict Tail Recursion Required**: `process_order/2`, `calculate_order_total/2`, and `restock/2` and all recursive helpers must run in $O(1)$ stack space (enforced by `bf_ast_verifier` and `beam_disasm`).
- **Forbidden Built-Ins**: Do NOT use `lists:sum/1`, `lists:map/2`, `lists:foldl/3`, `lists:filter/2`, or `lists:foldr/3`. (Higher-order functions are taught in Chapter 3).
- **Forbidden Constructs**: List comprehensions (`[X || ...]`) are forbidden.
- Order of products in `Inventory` must be strictly preserved across all operations.