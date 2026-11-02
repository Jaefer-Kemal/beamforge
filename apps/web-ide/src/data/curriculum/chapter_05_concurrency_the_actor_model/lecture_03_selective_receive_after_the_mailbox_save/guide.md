## Why This Matters in Production

In message-driven distributed architectures, messages do not always arrive in the exact order a worker needs to process them. For instance, a background telemetry actor might receive thousands of low-priority log lines followed by a critical system shutdown signal (`{urgent, shutdown}`). If the worker was forced to process messages strictly in first-in-first-out (FIFO) order, it would take seconds or minutes of CPU work before ever reaching the urgent shutdown signal.

Erlang solves this through **Selective Receive**. An Erlang process does not blindly dequeue whatever message is sitting at the front of its mailbox. Instead, it scans its mailbox for messages matching its `receive` patterns. Unmatched messages are automatically preserved in order without being discarded.

## Deep Concept Breakdown & Under the Hood

### 1. The BEAM Mailbox & Internal Save Queue
Under the hood, every BEAM process maintains a **Mailbox** and an internal **Save Queue**:
1. When external actors send messages to `Pid`, the messages are appended to the tail of `Pid`'s mailbox queue.
2. When the process enters a `receive` block, the runtime points an internal **Scan Pointer** at the message at the head of the mailbox.
3. If the head message matches any clause in the `receive` expression, the message is extracted from the mailbox, the clause body executes, and the scan pointer resets.
4. If the head message **fails to match**, the runtime moves that message aside into the process's internal **Save Queue** and advances the scan pointer to the next message.
5. Steps 3 and 4 repeat until a match is found or the mailbox is exhausted.
6. The instant a match succeeds, **all messages in the Save Queue are spliced back to the head of the mailbox** in their exact original arrival order!

### 2. Timeouts with `after TimeoutMs ->`
If no message matches, the process suspends. To prevent client processes from hanging indefinitely if a remote peer crashes or drops a request, Erlang supports timeouts:
```erlang
receive
    {reply, Result} -> {ok, Result}
after 1000 ->
    {error, timeout}
end.
```
The timer begins counting the moment the process begins waiting. If 1,000 milliseconds elapse without a matching message arriving, the `after` block executes.

### 3. The `after 0 ->` Non-Blocking Idiom
A timeout of **`after 0`** instructs the BEAM runtime: *"Check the mailbox right now. If a matching message is already present, process it immediately. If not, do NOT suspend; evaluate the after block in 0ms!"*

This zero-wait idiom has two critical production applications:
1. **Priority Draining:** Checking for urgent messages before falling back to normal messages:
   ```erlang
   drain_urgent_then_normal() ->
       receive
           {urgent, Msg} -> {urgent, Msg}
       after 0 ->
           receive
               {normal, Msg} -> {normal, Msg}
           after 0 ->
               empty
           end
       end.
   ```
2. **Mailbox Flushing (`flush_mailbox/0`):** Draining all pending messages currently sitting in the mailbox into a list for inspection or purging before starting a new stateful session:
   ```erlang
   flush_mailbox() ->
       flush_mailbox_acc([]).

   flush_mailbox_acc(Acc) ->
       receive
           Msg -> flush_mailbox_acc([Msg | Acc])
       after 0 ->
           lists:reverse(Acc)
       end.
   ```

> [!warning] Production Concurrency Trap: Quadratic Mailbox Scanning
> Selective receive is powerful, but scanning a mailbox containing 50,000 unmatched messages searching for a specific pattern requires traversing 50,000 linked pointers for every single receive operation ($O(N)$ scan overhead). Always ensure your mailboxes are drained or use correlation references (`make_ref()`), as covered in Lesson 5.5!

## Parallel Worked Example

Consider a high-priority financial quote processor:

```erlang
-module(quote_arbiter).
-export([consume_quote/0, flush_pending_quotes/0]).

%% Consumes urgent margin calls ahead of standard pricing ticks
consume_quote() ->
    receive
        {margin_call, Account, Amount} ->
            {urgent, Account, Amount}
    after 0 ->
        receive
            {price_tick, Symbol, Price} ->
                {normal, Symbol, Price}
        after 500 ->
            {error, no_quotes_available}
        end
    end.

%% Drains all pending quotes without suspending
flush_pending_quotes() ->
    drain_quotes([]).

drain_quotes(Acc) ->
    receive
        Quote -> drain_quotes([Quote | Acc])
    after 0 ->
        lists:reverse(Acc)
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Syntax (system / expressions)
receive
    Pattern1 [when Guard1] -> Body1;
    Pattern2 [when Guard2] -> Body2
after TimeoutExpr ->
    TimeoutBody
end
```

## Assignment Specification

Implement `src/priority_mailbox.erl` exporting `receive_urgent_first/1`, `request_with_timeout/3`, and `flush_mailbox/0`:

1. `receive_urgent_first(ExpectedCount) -> [Payload]`:
   - Drains exactly `ExpectedCount` messages from `self()`'s mailbox.
   - For each extracted message, it attempts to match `{urgent, Payload}` using `after 0`. If no urgent message is present, it falls back to matching `{normal, Payload}`.
   - Returns the payloads in priority order: all urgent messages appear before normal messages.
2. `request_with_timeout(TargetPid, RequestMsg, TimeoutMs) -> {ok, Result} | {error, timeout}`:
   - Sends `{request, self(), RequestMsg}` to `TargetPid`.
   - Waits up to `TimeoutMs` milliseconds in a `receive ... after TimeoutMs` block for `{reply, RequestMsg, Result}`.
   - Returns `{ok, Result}` on match, or `{error, timeout}` upon expiration.
3. `flush_mailbox() -> [term()]`:
   - Drains all pending messages currently in `self()`'s mailbox using a tail-recursive `receive Msg -> ... after 0 -> ... end` loop.
   - Returns all flushed messages in FIFO arrival order.

## Rules & Verification Constraints

- Must use the `receive ... after` construct (enforced by AST rule `requiredConstructs: ["receive_after"]`).
- `receive_urgent_first/1` must never block if fewer than `ExpectedCount` messages exist (fall back to whatever is available or use `after 0`).
- Must preserve FIFO order within the same priority level.