-module(sample_session_cache).
-behaviour(gen_server).

-export([start_link/0, put/2, get/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

put(Key, Val) ->
    gen_server:call(?MODULE, {put, Key, Val}).

get(Key) ->
    gen_server:call(?MODULE, {get, Key}).

init([]) ->
    TableMgrPid = whereis(sample_table_mgr),
    Tab = case ets:whereis(sample_session_tab) of
        undefined ->
            ets:new(sample_session_tab, [
                set,
                public,
                named_table,
                {heir, TableMgrPid, {heir_data, self()}}
            ]);
        ExistingTab ->
            ExistingTab
    end,
    {ok, #{tab => Tab}}.

handle_call({put, Key, Val}, _From, #{tab := Tab} = State) ->
    ets:insert(Tab, {Key, Val}),
    {reply, ok, State};
handle_call({get, Key}, _From, #{tab := Tab} = State) ->
    Reply = case ets:lookup(Tab, Key) of
        [{Key, Val}] -> {ok, Val};
        [] -> {error, not_found}
    end,
    {reply, Reply, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
