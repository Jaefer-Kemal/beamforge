-module(child_spec_factory).

-export([
    worker_spec/4,
    supervisor_spec/2,
    classify_restart/2
]).

worker_spec(Id, Module, Args, RestartType)
  when is_atom(Module), is_list(Args),
       (RestartType =:= permanent orelse RestartType =:= transient orelse RestartType =:= temporary) ->
    #{
        id => Id,
        start => {Module, start_link, Args},
        restart => RestartType,
        shutdown => 5000,
        type => worker,
        modules => [Module]
    }.

supervisor_spec(Id, SupModule) when is_atom(SupModule) ->
    #{
        id => Id,
        start => {SupModule, start_link, []},
        restart => permanent,
        shutdown => infinity,
        type => supervisor,
        modules => [SupModule]
    }.

classify_restart(permanent, _Reason) ->
    restart;
classify_restart(temporary, _Reason) ->
    do_not_restart;
classify_restart(transient, normal) ->
    do_not_restart;
classify_restart(transient, shutdown) ->
    do_not_restart;
classify_restart(transient, {shutdown, _}) ->
    do_not_restart;
classify_restart(transient, _AbnormalReason) ->
    restart.
