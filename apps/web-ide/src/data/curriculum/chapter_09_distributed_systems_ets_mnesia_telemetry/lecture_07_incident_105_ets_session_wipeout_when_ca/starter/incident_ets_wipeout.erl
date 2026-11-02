-module(incident_ets_wipeout).
-export([create_session_table/1, store_session/3, put_session/3, fetch_session/2, get_session/2]).
-export([transfer_to_restarted_worker/2, transfer_to_restarted_worker/3]).
-export([audit_table_heir/0, test_heir_handover/0]).

create_session_table(_HeirPid) ->
    ets:new(incident_sessions_tab, [set, public, {read_concurrency, true}]).

store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

transfer_to_restarted_worker(_Tab, _NewWorkerPid, _GiftData) ->
    ok.

audit_table_heir() ->
    HeirPid = spawn(fun() -> receive stop -> ok end end),
    Tab = create_session_table(HeirPid),
    HeirInfo = ets:info(Tab, heir),
    HeirPid ! stop,
    ets:delete(Tab),
    case HeirInfo of
        HeirPid -> {ok, heir_configured};
        _ -> {error, {bad_heir, HeirInfo}}
    end.

test_heir_handover() ->
    Parent = self(),
    Heir = spawn(fun() ->
        receive
            {'ETS-TRANSFER', Tab, _OldOwner, keep_alive} ->
                Parent ! {heir_got_table, Tab},
                receive
                    {give_to, NewWorker} ->
                        transfer_to_restarted_worker(Tab, NewWorker, restored),
                        Parent ! giveaway_done
                end
        after 1000 ->
            Parent ! {error, heir_timeout}
        end
    end),
    Worker = spawn(fun() ->
        Tab = create_session_table(Heir),
        store_session(Tab, <<"sess_1">>, 101),
        store_session(Tab, <<"sess_2">>, 102),
        store_session(Tab, <<"sess_3">>, 103),
        Parent ! {worker_ready, Tab},
        receive die -> exit(simulated_crash) end
    end),
    Tab = receive {worker_ready, RecvTab} -> RecvTab end,
    Worker ! die,
    receive {heir_got_table, Tab} -> ok end,
    NewWorker = spawn(fun() ->
        receive
            {'ETS-TRANSFER', NTab, _Heir, restored} ->
                {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                Parent ! {new_worker_verified, [U1, U2, U3]},
                ets:delete(NTab)
        end
    end),
    Heir ! {give_to, NewWorker},
    receive giveaway_done -> ok end,
    receive
        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
    after 1000 ->
        {error, survival_test_failed}
    end.
