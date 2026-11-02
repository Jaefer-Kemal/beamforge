## Why This Matters in Production

In 1986, Ericsson computer scientists Joe Armstrong, Robert Virding, and Mike Williams designed Erlang to power telephone switches that could never go down. Their benchmark was **nine nines (99.9999999%) availability**—less than one second of downtime every 31 years.

Today, that exact runtime—the **BEAM Virtual Machine**—powers the core infrastructure of WhatsApp (handling billions of daily messages with fewer than 100 engineers), Discord's global guild clustering, Bet365's real-time betting engines, and RabbitMQ messaging brokers.

Erlang achieved this not through complex defensive programming, but by rethinking computing from first principles: **isolated lightweight processes**, **immutable data**, and **shared-nothing message passing**.

## Deep Concept Breakdown & Under the Hood

Unlike operating system threads that allocate 1 MB to 8 MB of stack memory upfront, a BEAM process begins with only **309 words of memory** (approximately 2.5 KB on a 64-bit operating system). A standard developer laptop can comfortably run hundreds of thousands of concurrent BEAM processes simultaneously.

Every BEAM node runs an asynchronous preemptive scheduler per available CPU core. Schedulers count **reductions**—roughly one function call or Built-In Function (BIF) invocation. After **4,000 reductions**, the active process is preempted and yields CPU time to the next runnable process in the queue. This reduction-counting mechanism guarantees that no single calculation can monopolize the CPU or cause latency spikes in network I/O.

```erlang
%% Inspecting the live virtual machine
Schedulers = erlang:system_info(schedulers_online),
MaxProcs   = erlang:system_info(process_limit),
OtpRel     = erlang:system_info(otp_release).
```

> [!warning] Common Beginner Syntax Trap: The Period Terminator
> In Erlang, standalone expressions and function definitions **must terminate with a period (`.`)**.
> Forgetting the final period or placing it in the middle of a function will result in a compiler error such as `syntax error before: ...`.
> Comments in Erlang start with a single percent symbol (`%`) and run to the end of the line.

## Parallel Worked Example

Consider a module designed to probe basic operating system environment metrics without using complex data structures:

```erlang
-module(os_probe).
-export([check_env/0]).

check_env() ->
    NumSchedulers = erlang:system_info(schedulers_online),
    io:format("Operating with ~p online schedulers.~n", [NumSchedulers]),
    {env_info, NumSchedulers}.
```

Notice the anatomy of an Erlang module:
1. `-module(os_probe).` declares the module name, which must match the filename `os_probe.erl`.
2. `-export([check_env/0]).` exports the function `check_env` with arity 0 (taking 0 arguments).
3. The function body separates statements with commas (`,`) and ends with a period (`.`).
4. The return value is the final evaluated expression: a 2-tuple `{env_info, NumSchedulers}`.

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (erts / erlang)
erlang:system_info(Item) -> Info
  Types:
    Item = schedulers_online | process_limit | atom_limit | otp_release | term()
    Info = term()
```
> `erlang:system_info/1` is a C-implemented Built-In Function (BIF) providing zero-overhead introspection into the host emulator.

## Assignment Specification

This is a **Guided Runnable Demo**. The code in the editor is pre-written and functional.
1. Inspect the module `beam_intro.erl`.
2. Observe how `-module(beam_intro).` and `-export([inspect_vm/0]).` declare the module interface.
3. Observe how `erlang:system_info/1` queries live emulator telemetry.
4. Notice how the return value is structured as a clean 5-element tagged tuple: `{vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}`.
5. Click **Run** to execute the live probe against the BEAM OTP 29 engine.

## Rules & Verification Constraints

- No code edits are required for this guided introductory demo.
- Verification passes when `beam_intro:inspect_vm/0` returns a 5-tuple starting with the atom `vm_info`.