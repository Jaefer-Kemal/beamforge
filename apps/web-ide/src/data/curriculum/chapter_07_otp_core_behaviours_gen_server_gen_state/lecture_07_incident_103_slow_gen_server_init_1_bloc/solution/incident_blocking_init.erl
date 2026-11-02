-module(incident_blocking_init).
-behaviour(gen_server).

-export([
    start_link/1,
    lookup_rule/2,
    get_item/2,
    get_status/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

get_status(Pid) ->
    gen_server:call(Pid, get_status).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(SeedRules) ->
    {ok, #{status => booting, raw => SeedRules, rules => #{}, items => #{}}, {continue, {hydrate, SeedRules}}}.

handle_continue({hydrate, SeedRules}, State) ->
    Compiled = maps:from_list(SeedRules),
    {noreply, State#{status := ready, rules := Compiled, items := Compiled}}.

handle_call({lookup_rule, _Port}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({lookup_rule, Port}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Port, Rules) of
        {ok, Action} -> {reply, {ok, Action}, State};
        error        -> {reply, {error, not_found}, State}
    end;
handle_call({get_item, _Key}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({get_item, Key}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Key, Rules) of
        {ok, Val} -> {reply, {ok, Val}, State};
        error     -> {reply, {error, not_found}, State}
    end;
handle_call(get_status, _From, #{status := Status} = State) ->
    {reply, Status, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
