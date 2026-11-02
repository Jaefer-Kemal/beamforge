## Why This Matters in Production

Large software systems fail when interfaces are ambiguous. In Erlang, every unit of code belongs to a **Module**, and every function is strictly identified by both its name and its **Arity** (the number of arguments it accepts), written as `Function/Arity`.

Furthermore, production systems rely on **Compile-Time Macros (`-define`)** to configure system-wide timeouts, buffer sizes, and default ports without magic numbers scattered throughout the code.

## Deep Concept Breakdown & Under the Hood

### Modules and Exports
- `-module(arity_calc).`: Declares the module name. The file must be named `arity_calc.erl`.
- `-export([connect/1, connect/2, connect/3]).`: Declares which functions are public. Any function not in the export list is private to the module and cannot be called from outside.

### Arity: Functions with the Same Name are Completely Distinct
In languages like Python or JavaScript, defining `def connect(host)` followed by `def connect(host, port)` overwrites the first definition.
**In Erlang, `connect/1`, `connect/2`, and `connect/3` are three completely distinct functions!**
They can have different logic, different return types, and different implementations.

In idiomatic Erlang, functions with lower arity are used to provide **Default Arguments** by calling higher-arity versions:
```erlang
connect(Host) ->
    connect(Host, ?DEFAULT_PORT).

connect(Host, Port) ->
    connect(Host, Port, ?DEFAULT_TIMEOUT).

connect(Host, Port, Timeout) ->
    {connection, Host, Port, Timeout}.
```

### Compile-Time Macros (`-define`)
Macros allow defining compile-time constants:
```erlang
-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).
```
To invoke a macro in code, prepend a question mark (`?`):
```erlang
?DEFAULT_PORT     %% Expands to 80 at compile time
?MODULE           %% Built-in macro: expands to the current module atom (arity_calc)
```

> [!warning] Common Beginner Syntax Trap: The ? Symbol on Macros
> Forgetting the `?` symbol when using a macro is a frequent beginner mistake.
> Writing `connect(Host, DEFAULT_PORT)` treats `DEFAULT_PORT` as an unbound variable, throwing an `unbound variable` error!
> Always prefix macro names with `?`: `?DEFAULT_PORT`.

## Parallel Worked Example

Here is a database connection client providing cascading default parameters:

```erlang
-module(db_client).
-export([open/1, open/2, open/3]).

-define(DB_PORT, 5432).
-define(DB_POOL, 10).

open(Host) ->
    open(Host, ?DB_PORT).

open(Host, Port) ->
    open(Host, Port, ?DB_POOL).

open(Host, Port, PoolSize) ->
    {db_conn, ?MODULE, Host, Port, PoolSize}.
```

Notice:
- `open/1` delegates to `open/2`, which delegates to `open/3`.
- The built-in macro `?MODULE` embeds the module atom `db_client` into the returned tuple.

## Official Erlang Docs & Function Reference

```erlang
%% Erlang Reference Manual (Preprocessor Macros)
-define(Const, Replacement).
?Const
  Expands Const to Replacement before compiler syntax analysis.
  ?MODULE expands to the atom name of the enclosing module.
```

## Assignment Specification

Implement the network connection module `arity_calc.erl`:

1. Define two compile-time macros:
   - `-define(DEFAULT_PORT, 80).`
   - `-define(DEFAULT_TIMEOUT, 5000).`

2. Implement the three cascading arity functions:
   - `connect(Host)`:
     - Delegates to `connect(Host, ?DEFAULT_PORT)`.
   - `connect(Host, Port)`:
     - Delegates to `connect(Host, Port, ?DEFAULT_TIMEOUT)`.
   - `connect(Host, Port, Timeout)`:
     - Returns a 5-element tagged tuple:
       `{connection, ?MODULE, Host, Port, Timeout}`.

## Rules & Verification Constraints

- Use the `?DEFAULT_PORT` and `?DEFAULT_TIMEOUT` macros rather than hardcoding `80` and `5000` inside the function bodies.
- Use the built-in `?MODULE` macro for the second element of the returned tuple.
- Do not use Maps or Binaries—pass host names as atoms or strings (e.g., `localhost` or `"api.erlang.org"`).