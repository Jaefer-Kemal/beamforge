-module(wallet_server).
-behaviour(gen_server).

-export([
    start_link/1,
    credit/3,
    debit/3,
    get_balances/1,
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
start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

credit(Pid, Currency, Amount) when Amount > 0 ->
    gen_server:cast(Pid, {credit, Currency, Amount}).

debit(Pid, Currency, Amount) ->
    gen_server:call(Pid, {debit, Currency, Amount}).

get_balances(Pid) ->
    gen_server:call(Pid, get_balances).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

handle_call({debit, _Currency, Amount}, _From, State) when Amount =< 0 ->
    {reply, {error, invalid_amount}, State};
handle_call({debit, Currency, Amount}, _From, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    if
        CurrentBal >= Amount ->
            NewBal = CurrentBal - Amount,
            NewBalances = maps:put(Currency, NewBal, Balances),
            {reply, {ok, NewBal}, State#{balances := NewBalances}};
        true ->
            {reply, {error, insufficient_funds}, State}
    end;
handle_call(get_balances, _From, State = #{balances := Balances}) ->
    {reply, Balances, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({credit, Currency, Amount}, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    NewBalances = maps:put(Currency, CurrentBal + Amount, Balances),
    {noreply, State#{balances := NewBalances}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
