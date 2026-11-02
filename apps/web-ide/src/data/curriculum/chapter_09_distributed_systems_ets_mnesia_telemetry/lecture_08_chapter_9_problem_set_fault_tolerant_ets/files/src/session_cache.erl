-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, session_cache_tab).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

start_pipeline() ->
    session_sup:start_link().

stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

init([]) ->
    %% % TODO [Heir Failover Handshake]:
    %% % 1. Check if ?TAB already exists using ets:info(?TAB).
    %% % 2. If undefined (fresh boot):
    %% %    - Look up HeirPid via whereis(table_manager).
    %% %    - Create named table ?TAB with opts: [set, public, named_table,
    %% %      {read_concurrency, true}, {write_concurrency, true},
    %% %      {heir, HeirPid, session_backup}].
    %% % 3. If table already exists (worker restarted by supervisor after crash):
    %% %    - Reclaim table ownership from table_manager via table_manager:claim_table(?TAB).
    %% % 4. Return {ok, #{table => ?TAB}}.
    ok.

put_session(_SessionId, _UserId, _MetaMap) ->
    %% % TODO: Insert 4-tuple {SessionId, UserId, MetaMap, 0} into ?TAB and return ok.
    ok.

get_session(_SessionId) ->
    %% % TODO: Look up SessionId in ?TAB:
    %% % If found [{SessionId, UserId, MetaMap, HitCount}], return:
    %% %   {ok, #{user_id => UserId, meta => MetaMap, hit_count => HitCount}}
    %% % If not found [], return {error, not_found}.
    ok.

increment_hits(_SessionId) ->
    %% % TODO: Atomically increment 4th element (hit_count) by 1 via ets:update_counter/3:
    %% % On success, return {ok, NewCount}.
    %% % If SessionId does not exist, return {error, not_found}.
    ok.

delete_session(_SessionId) ->
    %% % TODO: Delete SessionId from ?TAB via ets:delete/2 and return ok.
    ok.

count_sessions() ->
    %% % TODO: Return number of items in ?TAB via ets:info(?TAB, size). Return 0 if undefined.
    0.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.