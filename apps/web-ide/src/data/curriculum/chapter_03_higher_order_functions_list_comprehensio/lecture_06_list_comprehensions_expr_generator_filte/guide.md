## Why This Matters in Production

In database systems (like SQL) and query languages, you routinely express transformations as declarative queries:
`SELECT name FROM users WHERE status = 'active'`.

In Erlang, writing such transformations using `lists:map` and `lists:filter` requires chaining multiple higher-order functions.

To provide clean, mathematical, declarative data query ergonomics, Erlang incorporates **List Comprehensions** (derived directly from mathematical set-builder notation: ${ f(x) mid x in S land p(x) }$).

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of a List Comprehension
A list comprehension is bounded by square brackets `[` and `]`, with an output expression separated from qualifiers by the double vertical pipe `||`:

```erlang
[ OutputExpression || Qualifier1, Qualifier2, ... ]
```

Qualifiers can be either:
- **Generators (`Pattern <- List`)**: Extracts elements from a list.
- **Filters (Boolean Predicates)**: Conditions that must evaluate to `true`.

```erlang
Numbers = [1, 2, 3, 4, 5, 6],
EvenSquares = [X * X || X <- Numbers, X rem 2 =:= 0].
%% => [4, 16, 36]
```

### 2. Generator Pattern Matching (The Silent Skip Rule)
Here is a profound operational difference between `lists:map/2` and a List Comprehension generator:

If you use `lists:map` with a pattern:
```erlang
Users = [{user, 1, "Alice", active}, {user, 2, "Bob", suspended}],
%% CRASH! Bob does not match the active pattern -> function_clause exception!
lists:map(fun({user, Id, Name, active}) -> Name end, Users).
```

In a List Comprehension, **non-matching elements are silently skipped**:
```erlang
ActiveNames = [Name || {user, _Id, Name, active} <- Users].
%% => ["Alice"]  -- Bob is silently filtered out with ZERO exceptions!
```

The generator `Pattern <- List` combines pattern matching and filtering into a single, bulletproof construct.

### 3. Multiple Generators & Relational Joins
You can include multiple generators in a single comprehension. The rightmost generator loops fastest (like nested `for` loops):

```erlang
Xs = [1, 2],
Ys = [a, b],
Pairs = [{X, Y} || X <- Xs, Y <- Ys].
%% => [{1, a}, {1, b}, {2, a}, {2, b}]
```

You can combine multiple generators with filter predicates to execute relational **inner joins**:

```erlang
Inv = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}],
Orders = [{order, 1, 2}, {order, 2, 3}, {order, 999, 1}],

Receipts = [
    {receipt, Id, Name, Qty * Price}
 || {order, OrderId, Qty} <- Orders,
    {product, Id, Name, Price, Stock} <- Inv,
    OrderId =:= Id,
    Stock >= Qty
].
%% => [{receipt, 1, "Keyboard", 100}, {receipt, 2, "Mouse", 75}]
%% Order 999 is skipped automatically because no matching product exists!
```

## Parallel Worked Example

Consider building an event-ticketing engine:

```erlang
-module(ticket_queries).
-export([confirmed_buyer_names/1, seat_grid/2, issue_valid_tickets/2]).

%% 1. Extract buyer names for confirmed tickets:
confirmed_buyer_names(Reservations) ->
    [Name || {res, _Id, Name, confirmed} <- Reservations].

%% 2. Generate Cartesian seat matrix:
seat_grid(Rows, Seats) ->
    [{Row, Seat} || Row <- Rows, Seat <- Seats].

%% 3. Relational join between concert passes and customer accounts:
issue_valid_tickets(Passes, Customers) ->
    [
        {ticket, CustId, CustName, Event, Price}
     || {pass, PassId, Event, Price} <- Passes,
        {customer, CustId, CustName, PassId} <- Customers,
        Price > 0
    ].
```

## Official Erlang Docs & Function Reference

```erlang
[ Expr || Pattern <- List, GuardOrFilter ]
```

## Assignment Specification

Implement three query functions using list comprehensions in `src/comprehension_queries.erl`:

1. `active_user_names(Users)`:
   - Input: `[{user, Id, Name, Status}, ...]`.
   - Uses a list comprehension with generator pattern matching to return a list of `Name` strings for users whose `Status =:= active`.
2. `matrix_cartesian(Xs, Ys)`:
   - Uses two generators in a list comprehension to return all pairs `[{X, Y} || X <- Xs, Y <- Ys]`.
3. `fulfilled_order_receipts(Inventory, Orders)`:
   - `Inventory = [{product, Id, Name, Price, Stock}, ...]`.
   - `Orders = [{order, ProdId, Qty}, ...]`.
   - Uses a list comprehension with two generators and filter conditions (`ProdId =:= Id`, `Stock >= Qty`, `Qty > 0`) to return:
     `[{receipt, Id, Name, Qty * Price} || ...]`.

## Rules & Verification Constraints

- Must use list comprehensions (`[... || ...]`).
- Strictly no Maps (`#{}`) or Bit-Syntax Binaries (`<<...>>`). Use tuples, strings, and integers only.