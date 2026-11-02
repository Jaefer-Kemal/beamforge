## Why This Matters in Production

In Chapters 5 and 6, we designed custom actor loops using `spawn`, `receive`, `make_ref()`, and `monitor`. In Lesson 6.8, we even built our own `my_gen_server.erl` from scratch, demonstrating that synchronous calls under the hood are simply a monitor, a tagged message, and a selective receive.

While writing raw actor loops teaches the foundational mechanics of the BEAM, **writing raw process loops in production is a severe anti-pattern**.

Why? Because a production backend process in WhatsApp, Klarna, or Ericsson must handle dozens of complex system concerns beyond its core domain logic:
1. **Supervisor Integration**: Responding to parent shutdown signals (`{'EXIT', Sup, shutdown}`) and graceful termination timeouts.
2. **Hot Code Upgrades**: Migrating internal process state across version upgrades without restarting the VM via `code_change/3`.
3. **Live System Introspection**: Allowing operators to inspect live state using `sys:get_state/1` and `sys:get_status/1` without halting the process or creating concurrency races.
4. **Debug Tracing & Event Logging**: Dynamically enabling execution tracing via `sys:trace(Pid, true)`.

Erlang solves this with **OTP Behaviours**. An OTP Behaviour uses the **Inversion of Control (IoC)** pattern: the OTP runtime provides the battle-hardened generic engine that handles concurrency, timeouts, and system messages, while you supply a clean, pure callback module.

## Deep Concept Breakdown & Under the Hood

### Inversion of Control: The Engine vs. Callback Model

In a raw process loop, your code is in control:
```erlang
%% Raw Loop: You control everything (and must handle every edge case!)
loop(State) ->
    receive
        {call, From, Msg} ->
            NewState = handle_msg(Msg, State),
            From ! {reply, ok},
            loop(NewState)
    end.
```

In an OTP Behaviour, **OTP is in control**. The standard library module `gen_server.erl` owns the `receive` loop. When a message arrives, the `gen_server` engine invokes your exported callback functions:

| Generic Engine (`gen_server.erl`) | Your Callback Module (`Mod.erl`) | Architectural Responsibility |
| :--- | :--- | :--- |
| `gen_server:start_link(Mod, Args, Opts)` | `Mod:init(Args)` | Process spawning, linking, and initial state creation. |
| `gen_server:call(Pid, Request)` | `Mod:handle_call(Req, From, State)` | Synchronous request-reply with monitor crash detection. |
| `gen_server:cast(Pid, Message)` | `Mod:handle_cast(Msg, State)` | Asynchronous fire-and-forget message handling. |
| Raw incoming messages (`!`, timers, sockets) | `Mod:handle_info(Info, State)` | Handling out-of-band signals and system timers. |
| Supervisor shutdown or `gen_server:stop/1` | `Mod:terminate(Reason, State)` | Cleaning up file handles, sockets, and ports. |
| Live code loading | `Mod:code_change(OldVsn, State, Extra)` | Transforming state maps between software releases. |

### The `-behaviour(gen_server).` Compiler Contract

Adding `-behaviour(gen_server).` tells the Erlang compiler to verify that your module exports all required callbacks. If you forget to export `handle_call/3` or `handle_info/2`, `erlc` emits compilation warnings alerting you before deployment:

```erlang
-module(my_server).
-behaviour(gen_server).

%% Client API
-export([start_link/0, get_value/1, stop/1]).

%% Required gen_server Callbacks
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).
```

### Inspecting Live State with `sys:get_state/1`

One of the greatest operational superpowers of the BEAM VM is zero-downtime introspection. In languages like C++, Java, or Go, inspecting the private memory of a running thread requires attaching a heavy debugger (like GDB or Delve) that pauses thread execution.

In Erlang, because every `gen_server` process understands system protocol messages, an operator in the production Erlang shell can run:

```erlang
State = sys:get_state(ServerPid).
```

The `gen_server` engine intercepts the system message, extracts its current internal `State` term, and replies to the operator **without dropping client requests or mutating state**!

> [!warning] Production OTP Trap: Never Block Inside gen_server Callbacks
> Because a `gen_server` processes its mailbox sequentially, calling a slow external API (e.g. `httpc:request`) or sleeping with `timer:sleep/1` inside `handle_call/3` freezes the entire server. All subsequent client calls get stuck in the mailbox and will eventually crash with `{timeout, {gen_server, call, ...}}` after 5,000ms!

## Parallel Worked Example

The following runnable demo implements a simple operational counter that demonstrates `init/1`, `handle_call/3`, `handle_cast/2`, and live introspection with `sys:get_state/1`:

```erlang
-module(counter_demo).
-behaviour(gen_server).
-export([start_link/0, inc/2, get/1, stop/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link() -> gen_server:start_link(?MODULE, [], []).
inc(Pid, N) -> gen_server:cast(Pid, {inc, N}).
get(Pid)    -> gen_server:call(Pid, get_value).
stop(Pid)   -> gen_server:stop(Pid).

init([]) -> {ok, #{count => 0}}.
handle_call(get_value, _From, State = #{count := C}) -> {reply, C, State}.
handle_cast({inc, N}, State = #{count := C}) -> {noreply, State#{count := C + N}}.
handle_info(_Info, State) -> {noreply, State}.
terminate(_Reason, _State) -> ok.
code_change(_Old, State, _Extra) -> {ok, State}.
```

## Assignment Specification

This is a **Guided Runnable Demo**. No code changes are required!
1. Inspect the pre-written `otp_intro_demo` module in the editor.
2. Click **`Run`** below to execute the demo.
3. Observe how the server initializes with state `#{counter => 0, ops => 0}`, executes synchronous calls and asynchronous casts, and uses `sys:get_state/1` to query the live internal map!

## Rules & Verification Constraints

- Must export `start_link/0`, `increment/2`, `get_count/1`, `stop/1`, and `run_demo/0`.
- Must export all 6 mandatory `gen_server` callbacks.
- Must verify live state using `sys:get_state/1`.
