-module(child_spec_factory).

-export([
    worker_spec/4,
    supervisor_spec/2,
    classify_restart/2
]).

worker_spec(Id, Module, Args, RestartType) ->
    ok.

supervisor_spec(Id, SupModule) ->
    ok.

classify_restart(RestartType, ExitReason) ->
    ok.
