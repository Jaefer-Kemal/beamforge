-module(ets_heir_handshake).
-export([create_resilient_table/2, reclaim_table/2, verify_heir_survival_demo/0]).
-export([start_guardian/0, guardian_loop/1]).

create_resilient_table(TableNameAtom, HeirPid) ->
    TableNameAtom.

start_guardian() ->
    {ok, self()}.

reclaim_table(GuardianPid, Tab) when is_pid(GuardianPid) ->
    ok;
reclaim_table(Tab, NewOwnerPid) when is_pid(NewOwnerPid) ->
    ok.

guardian_loop(State) ->
    ok.

verify_heir_survival_demo() ->
    [].
