## Why This Matters in Production

Telecommunication switches and payment gateways process millions of discrete events per second: call connection attempts, packet handoffs, credit reservations, and circuit heartbeats.

To achieve maximum throughput with zero garbage collection overhead, Erlang models domain events using two fundamental building blocks:
1. **Atoms**: Ultra-lightweight constants that represent states and identifiers.
2. **Tuples**: Fixed-size contiguous memory blocks used to bundle related values together.

Together, they form the **Tagged Tuple Idiom**—the universal convention used across every Erlang library and OTP behaviour.

## Deep Concept Breakdown & Under the Hood

### Atoms
An **Atom** is a literal constant whose name is its value.
- Lowercase names are automatically atoms: `ok`, `error`, `call_event`, `alice`, `bob`.
- Atoms are stored once in a global runtime **Atom Table**. An atom reference inside a message or process heap is simply a 1-word integer pointer. Comparing two atoms (`State =:= ready`) is an ultra-fast $O(1)$ single-cycle integer pointer comparison.
- **Single-Quoted Atoms**: If an atom must begin with a capital letter, contain spaces, or include punctuation, enclose it in single quotes: `'Monday'`, `'EXIT'`, `'user@domain.com'`.

> [!warning] The Atom Table is Never Garbage-Collected
> The BEAM VM Atom Table has a fixed limit (default 1,048,576 atoms) and is **never garbage-collected**.
> Never dynamically generate atoms from untrusted user input using `list_to_atom/1`, or malicious requests can overflow the atom table and crash the entire node!

### Tuples
A **Tuple** is an ordered, fixed-size container written with curly braces:
```erlang
{call_event, 101, alice, bob, 120}
```
Tuples are stored as contiguous words on the process heap: a header word followed by each element's value. Element access is instant ($O(1)$ indexed offset).

### The Tagged Tuple Idiom
Erlang does not have classes or structs. Instead, by convention, the **first element of a tuple is an atom that declares its type or status**:
- Success result: `{ok, Payload}`
- Error condition: `{error, invalid_port}`
- Telecom domain event: `{call_event, CallId, Caller, Callee, DurationSeconds}`

You destructure a tagged tuple using the `=` operator:
```erlang
Event = {call_event, 9021, alice, bob, 0},
{call_event, Id, From, To, Secs} = Event.
%% Id is now 9021, From is alice, To is bob, Secs is 0
```

## Parallel Worked Example

Consider a banking transaction event system:

```erlang
-module(bank_events).
-export([make_deposit/3, extract_account/1, reverse_transfer/1]).

make_deposit(TxId, Account, Amount) ->
    {deposit_event, TxId, Account, Amount, pending}.

extract_account(Event) ->
    {deposit_event, _TxId, Account, _Amount, _Status} = Event,
    Account.

reverse_transfer(TransferEvent) ->
    {transfer, Id, FromAcc, ToAcc, Amount} = TransferEvent,
    {transfer, Id, ToAcc, FromAcc, Amount}.
```

Notice:
- `make_deposit/3` tags the tuple with `deposit_event` and sets the initial state to atom `pending`.
- `extract_account/1` matches the tag and extracts `Account`.
- `reverse_transfer/1` swaps `FromAcc` and `ToAcc`.

## Official Erlang Docs & Function Reference

```erlang
%% Erlang Reference Manual (Data Types - Tuples)
{Element1, Element2, ..., ElementN}
  Compound data type with fixed number of terms.
  Element access via pattern matching or element(N, Tuple) is O(1).
```

## Assignment Specification

Implement three functions in `telecom_events.erl`:

1. `make_event(Id, Caller, Callee)`:
   - Construct and return a 5-element tagged tuple:
     `{call_event, Id, Caller, Callee, 0}`.
   - The initial duration must be the integer `0`.

2. `extract_caller(Event)`:
   - Given a `call_event` tuple passed as `Event`.
   - Use pattern matching with `=` to extract and return the `Caller` value.

3. `swap_endpoints(Event)`:
   - Given a `call_event` tuple: `{call_event, Id, Caller, Callee, Duration}`.
   - Destructure the tuple and return a new `call_event` where `Caller` and `Callee` are swapped:
     `{call_event, Id, Callee, Caller, Duration}`.

## Rules & Verification Constraints

- Test cases will use atoms like `alice` and `bob` as caller/callee names.
- Do not use binaries or maps—stick strictly to atoms, integers, and tuples.