-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

describe_status(200) ->
    {ok, success};
describe_status(404) ->
    {error, not_found};
describe_status(500) ->
    {error, server_crash};
describe_status(_) ->
    {error, unknown_code}.

head_or_default([H | _], _Default) ->
    H;
head_or_default([], Default) ->
    Default.

verify_identical_pair({X, X}) ->
    {matched, X};
verify_identical_pair(_) ->
    mismatch.