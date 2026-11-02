-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

%% @doc Match status codes 200, 404, 500, or return {error, unknown_code}.
%% Remember: Separate clauses with semicolons (;) and end the last clause with a period (.).
describe_status(_Code) ->
    %% Implement multi-clause status code routing for 200, 404, 500, and catch-all.
    ok.

%% @doc Return head of list if non-empty, otherwise return Default.
head_or_default(_List, Default) ->
    %% Match non-empty list [H | _] or empty list [] across clauses.
    Default.

%% @doc Match a 2-tuple where both elements are identical: {X, X}.
%% Return {matched, X} if both elements match, otherwise return atom mismatch.
verify_identical_pair(_Pair) ->
    %% Match identical pair {X, X} or fallback to mismatch.
    ok.