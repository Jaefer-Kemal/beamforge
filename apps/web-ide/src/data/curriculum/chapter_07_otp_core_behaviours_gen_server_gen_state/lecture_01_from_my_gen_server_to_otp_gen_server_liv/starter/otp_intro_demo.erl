-module(otp_intro_demo).
-behaviour(gen_server).

-export([
    start_link/0,
    increment/2,
    get_count/1,
    stop/1,
    run_demo/0
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
start_link() ->
    gen_server:start_link(?MODULE, [], []).

increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

get_count(Pid) ->
    gen_server:call(Pid, get_count).

stop(Pid) ->
    gen_server:stop(Pid).

%% Demonstrates full lifecycle and live sys:get_state/1 introspection
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(15),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{final_count => Count, live_state => LiveState}.

%% gen_server Callbacks
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
