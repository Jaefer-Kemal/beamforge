## Why This Matters in Production

In distributed systems, streams of incoming network packets, database query rows, and log records are processed as **dynamically sized linked lists**.

Unlike tuples (which have a fixed size allocated upfront), Erlang **Lists** can grow and shrink dynamically. Understanding how the BEAM lays out lists in memory is the single most critical performance concept in sequential Erlang: it is the difference between an $O(1)$ instant operation and an $O(N)$ CPU freeze.

## Deep Concept Breakdown & Under the Hood

### Cons Cells: The Anatomy of a List
An Erlang list is a **singly-linked chain of 2-word Cons Cells**.
Each cons cell contains:
1. **Head**: A pointer to the current element.
2. **Tail**: A pointer to the rest of the list (or the empty list `[]`).

The syntax `[Head | Tail]` represents a cons cell:
```erlang
[1, 2, 3]  %% Sugar for: [1 | [2 | [3 | []]]]
```

### The Golden Performance Rule: Prepend, Never Append!
- **Prepending (`[NewItem | ExistingList]`) is $O(1)$ Zero-Copy**:
  Erlang simply allocates a single new 2-word cons cell whose tail points to the existing list. The existing list is untouched and shared in memory.
- **Appending (`List ++ [NewItem]`) is $O(N)$ Memory Copy**:
  To add to the end of a singly-linked list, the BEAM must walk every single node in `List` from left to right, re-allocating new cons cells for the entire list!

### Destructuring Multiple Front Elements
You can extract multiple elements from the head of a list using pattern matching:
```erlang
[First, Second | Rest] = [10, 20, 30, 40].
%% First is 10, Second is 20, Rest is [30, 40]
```

> [!warning] The Character List Mystery: Why [97, 98, 99] Prints as "abc"
> Every beginner in Erlang encounters this baffling phenomenon in the shell:
> ```erlang
> 1> [97, 98, 99].
> "abc"
> ```
> **Why?** In classical Erlang, **strings are literally linked lists of integer ASCII/Unicode codepoints**!
> When the shell prints a list, if every number in the list happens to be a printable ASCII character, the shell renders it as a double-quoted string (`"abc"`).
> To get the integer codepoint of any character, use the `$Char` syntax:
> `$a` evaluates to `97`, `$A` evaluates to `65`, and `$\s` evaluates to `32` (space).

## Parallel Worked Example

Here is a queue buffer module prepending items, inspecting the front elements, and checking character codes:

```erlang
-module(queue_buffer).
-export([push_front/2, take_first_two/1, first_char_code/1]).

push_front(Item, Queue) ->
    [Item | Queue].

take_first_two(Queue) ->
    [A, B | Remaining] = Queue,
    [B, A | Remaining].

first_char_code(String) ->
    [CharCode | _Rest] = String,
    {char_code, CharCode}.
```

Notice:
- `push_front/2` prepends in $O(1)$ time with `[Item | Queue]`.
- `take_first_two/2` destructures `[A, B | Remaining]` and swaps them.
- `first_char_code/1` treats `"Erlang"` as a list of integers and extracts the head.

## Official Erlang Docs & Function Reference

```erlang
%% Erlang Reference Manual (Lists)
[Element1, Element2, ..., ElementN]
  Cons cell chain terminated by [].
  Prepend: [New | List] -> O(1) time and memory.
  Concat:  List1 ++ List2 -> O(length(List1)) time and memory.
```

## Assignment Specification

Implement three list operations in `list_ops.erl`:

1. `prepend_item(Item, List)`:
   - Prepend `Item` to the front of `List` using the cons operator `[Item | List]` and return the new list.

2. `swap_first_two(List)`:
   - Given a list containing at least 2 elements.
   - Use pattern matching `[First, Second | Rest] = List` to extract the first two elements.
   - Return a new list where the first two elements are swapped: `[Second, First | Rest]`.

3. `ascii_initial(NameString)`:
   - Given a non-empty string such as `"Erlang"` or `"Beam"`.
   - Pattern match the head of the string list: `[FirstCharCode | _Rest] = NameString`.
   - Return a tagged tuple: `{char_code, FirstCharCode}` (e.g., `{char_code, 69}` for `"Erlang"`).

## Rules & Verification Constraints

- Do not use functions from the `lists` standard library—use pure pattern matching and the cons operator `[H | T]`.
- Ensure all functions handle input lists without using mutable operations.