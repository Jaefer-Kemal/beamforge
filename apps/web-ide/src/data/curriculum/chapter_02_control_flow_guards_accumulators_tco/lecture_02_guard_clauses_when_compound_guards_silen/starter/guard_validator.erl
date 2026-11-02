-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_ratio/2]).

%% @doc Check whether a port is privileged (1..1023) or unprivileged (1024..65535).
validate_port(_Port) ->
    %% Enforce integer bounds using when is_integer(Port), Port >= ..., Port =< ...
    ok.

%% @doc Classify temperature into freezing (<= 0), temperate (0..25), or hot (> 25).
classify_temperature(_TempC) ->
    %% Enforce numeric bounds using when is_number(TempC), TempC =< ...
    ok.

%% @doc Safely evaluate ratio without division-by-zero crashes.
safe_ratio(_A, _B) ->
    %% Guard against B =/= 0 and test (A / B) >= 2.0, or fall back to {error, invalid_ratio}.
    ok.