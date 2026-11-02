-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

%% @doc Inspects HTTP response tuples using case...of branching.
%% See lesson guide for expected response codes and normalized return tuples.
handle_http_response(_Response) ->
    %% % TODO: Branch on the incoming HTTP response tuple using case...of.
    %% % Handle success (200), client errors (401/403), server error ranges (500-599),
    %% % unexpected status codes, and malformed responses.
    ok.

%% @doc Classifies network latency using an if...end expression.
%% See lesson guide for latency thresholds and return atoms.
grade_latency(_LatencyMs) ->
    %% % TODO: Evaluate latency thresholds using if...end guard expressions
    %% % with a mandatory true catch-all fallback.
    ok.