-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

%% Drains ExpectedCount messages, extracting {urgent, X} before {normal, Y}
receive_urgent_first(ExpectedCount) ->
    %% Architectural Requirement:
    %% Drain up to ExpectedCount messages. For each, check {urgent, Payload} via after 0,
    %% then fall back to {normal, Payload}. Return list of extracted payloads.
    ok.

%% Client API: sends {request, self(), RequestMsg} and waits up to TimeoutMs for {reply, RequestMsg, Result}
request_with_timeout(TargetPid, RequestMsg, TimeoutMs) ->
    %% Architectural Requirement:
    %% Send request tuple, wait for reply matching RequestMsg within TimeoutMs,
    %% return {ok, Result} or {error, timeout}.
    ok.

%% Drains all messages currently in the mailbox without blocking (after 0)
flush_mailbox() ->
    %% Architectural Requirement:
    %% Tail-recursively drain all pending mailbox messages and return them in FIFO order.
    ok.
