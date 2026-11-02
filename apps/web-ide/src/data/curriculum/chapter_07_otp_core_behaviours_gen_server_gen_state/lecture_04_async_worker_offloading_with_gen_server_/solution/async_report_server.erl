-module(async_report_server).
-behaviour(gen_server).

-export([
    start_link/0,
    generate_report/3,
    get_completed_count/1,
    hibernate_idle/1,
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
start_link() ->
    gen_server:start_link(?MODULE, [], []).

generate_report(Pid, JobId, ComputeFun) ->
    gen_server:call(Pid, {generate_report, JobId, ComputeFun}, 3000).

get_completed_count(Pid) ->
    gen_server:call(Pid, get_completed_count).

hibernate_idle(Pid) ->
    gen_server:call(Pid, hibernate_now).

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init([]) ->
    {ok, #{in_flight => 0, completed => 0}}.

handle_call({generate_report, JobId, ComputeFun}, From, State = #{in_flight := InFlight}) ->
    ServerSelf = self(),
    spawn(fun() ->
        Result = ComputeFun(),
        gen_server:reply(From, {ok, JobId, Result}),
        ServerSelf ! {job_finished, JobId}
    end),
    {noreply, State#{in_flight := InFlight + 1}};

handle_call(get_completed_count, _From, State = #{in_flight := InFlight, completed := Completed}) ->
    {reply, {ok, #{in_flight => InFlight, completed => Completed}}, State};

handle_call(hibernate_now, _From, State) ->
    {reply, hibernated, State, hibernate};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({job_finished, _JobId}, State = #{in_flight := InFlight, completed := Completed}) ->
    {noreply, State#{in_flight := InFlight - 1, completed := Completed + 1}};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
