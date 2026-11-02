## Why This Matters in Production

In imperative programming languages (Python, Go, Java, TypeScript), searching an inventory list is done with a `for` or `while` loop that mutates an index variable.

In pure functional programming, **there are no for loops or while loops**.
Instead, all iteration over data collections is expressed through **Recursion**: decomposing a list into its **Head (the current item)** and its **Tail (the rest of the list)**, processing the head, and recursively calling the function on the tail.

Before you can build complex systems like the Inventory Order Processor (`inventory.erl` in Lesson 2.8), you must master the fundamental building block: **Searching a list of domain tuples for a matching identifier**.

## Deep Concept Breakdown & Under the Hood

### The 3 Rules of Recursive Search
Every recursive search over an Erlang list consists of three distinct cases:

1. **The Base Case (List Exhausted):**
   If the list is empty (`[]`), we traversed all items and did not find the target. Return `not_found`.
   ```erlang
   find_item([], _TargetId) ->
       not_found;
   ```

2. **The Match Case (Target Located):**
   If the head of the list contains the identifier we are searching for, stop immediately and return the item.
   ```erlang
   find_item([{product, TargetId, _, _, _} = Item | _Rest], TargetId) ->
       {ok, Item};
   ```

3. **The Recursive Step (Search Deeper):**
   If the head of the list does NOT match the target, discard the head and search the remaining tail!
   ```erlang
   find_item([_OtherItem | Rest], TargetId) ->
       find_item(Rest, TargetId).
   ```

### Natural Tail Recursion
Notice what happens in step 3: the recursive call `find_item(Rest, TargetId)` is the **very last operation** executed in that clause.
Because nothing remains to be calculated after `find_item` returns, the BEAM VM reuses the current stack frame. Searching a list of 100,000 items in Erlang does not allocate 100,000 stack frames—it runs in constant $O(1)$ stack space!

> [!warning] Common Beginner Syntax Trap: The Missing Base Case
> The most frequent beginner bug in recursive Erlang is forgetting the empty list clause (`find_item([], _) -> not_found.`).
> If this clause is omitted and an item is not in the list, the function will attempt to match `[]` against `[Head | Tail]`, immediately crashing with a `function_clause` runtime error!

## Parallel Worked Example

Searching an employee directory for a badge record:

```erlang
-module(badge_registry).
-export([lookup_badge/2, has_permission/2]).

%% Base case: Empty directory
lookup_badge([], _TargetId) ->
    not_found;
%% Match case: Found target employee ID at head of list
lookup_badge([{badge, TargetId, Name, Clearance} | _Rest], TargetId) ->
    {ok, {badge, TargetId, Name, Clearance}};
%% Recursive step: Discard head and search remainder of list
lookup_badge([_OtherBadge | Rest], TargetId) ->
    lookup_badge(Rest, TargetId).

%% Searching for a simple element in a flat list:
has_permission([], _TargetPerm) ->
    false;
has_permission([TargetPerm | _Rest], TargetPerm) ->
    true;
has_permission([_Other | Rest], TargetPerm) ->
    has_permission(Rest, TargetPerm).
```

## Official Erlang Docs & Function Reference

```erlang
%% Recursive List Traversal Pattern:
traverse([]) -> BaseResult;
traverse([MatchItem | _Rest]) when Condition -> MatchResult;
traverse([_Other | Rest]) -> traverse(Rest).
```

## Assignment Specification

Implement two recursive search functions in `recursive_search.erl`:

1. `find_product(Inventory, TargetId)`:
   - `Inventory` is a list of 5-tuples: `[{product, Id, Name, Price, Stock}, ...]`.
   - If a product with matching `Id =:= TargetId` is found, return `{ok, {product, TargetId, Name, Price, Stock}}`.
   - If the list is empty or the product does not exist, return atom `not_found`.

2. `contains_item(List, Target)`:
   - Returns boolean `true` if `Target` is an element of `List` (matched using `=:==`).
   - Returns boolean `false` if `List` is exhausted (`[]`).

## Rules & Verification Constraints

- Implement using pure recursive pattern matching.
- Do not use functions from the `lists` module (such as `lists:keyfind/3` or `lists:member/2`).
- Must handle the empty list base case cleanly without crashing.