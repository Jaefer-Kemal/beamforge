-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    gen_server:call(Pid, {check_request, ClientId, Cost}).

refill_all(Pid) ->
    gen_server:call(Pid, refill_all).

reset_client(Pid, ClientId) ->
    gen_server:cast(Pid, {reset_client, ClientId}).

get_stats(Pid) ->
    gen_server:call(Pid, get_stats).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

handle_call({check_request, ClientId, Cost}, _From, State = #{max_tokens := Max, clients := Clients, total_allowed := Allowed, total_rejected := Rejected}) ->
    CurrentTokens = maps:get(ClientId, Clients, Max),
    if
        CurrentTokens >= Cost ->
            Remaining = CurrentTokens - Cost,
            NewClients = maps:put(ClientId, Remaining, Clients),
            {reply, {allow, Remaining}, State#{clients := NewClients, total_allowed := Allowed + 1}};
        true ->
            {reply, {deny, CurrentTokens}, State#{total_rejected := Rejected + 1}}
    end;

handle_call(refill_all, _From, State = #{max_tokens := Max, refill_amount := Refill, clients := Clients}) ->
    RefilledClients = maps:map(fun(_Id, Tokens) ->
        min(Tokens + Refill, Max)
    end, Clients),
    {reply, ok, State#{clients := RefilledClients}};

handle_call(get_stats, _From, State = #{clients := Clients, total_allowed := Allowed, total_rejected := Rejected}) ->
    Stats = #{
        total_allowed => Allowed,
        total_rejected => Rejected,
        active_clients => maps:size(Clients)
    },
    {reply, Stats, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({reset_client, ClientId}, State = #{max_tokens := Max, clients := Clients}) ->
    NewClients = maps:put(ClientId, Max, Clients),
    {noreply, State#{clients := NewClients}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
