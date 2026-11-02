-module(incident_mailbox_leak).
-export([
    start/0,
    record_metric/2,
    get_summary/1,
    inspect_queue_len/1,
    get_mailbox_len/1,
    stop/1,
    loop/1
]).

%% Starts the telemetry actor
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% Records a numeric metric value
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% Retrieves summary statistics: #{count => N, total => Sum}
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
        %% % TODO [INC-101 Triage]: Protect callers from hanging indefinitely
        %% % when the telemetry process is slow, crashing, or unreachable.
    end.

%% Returns current message queue length for diagnostic checks
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% Backward-compatible alias
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% Stops the actor cleanly
stop(Pid) ->
    Pid ! stop,
    ok.

%% Actor message loop
loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok
        %% % TODO [INC-101 Triage]: Defend against unbounded mailbox growth
        %% % caused by unhandled diagnostic and heartbeat messages.
    end.
