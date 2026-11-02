-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

-define(TAB, auth_token_table).

init_auth_table() ->
    ok.

store_token(TokenBin, UserId, Role, ExpiresAt) ->
    ok.

find_users_by_role(Role) ->
    [].

delete_expired_tokens(CurrentTimestamp) ->
    0.
