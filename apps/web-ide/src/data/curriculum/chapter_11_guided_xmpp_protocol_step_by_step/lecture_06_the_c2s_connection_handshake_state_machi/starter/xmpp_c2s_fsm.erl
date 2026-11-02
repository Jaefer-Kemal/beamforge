-module(xmpp_c2s_fsm).
-export([
    init/1,
    handle_event/2,
    get_state/1
]).

-type fsm_state() :: #{
    state := atom(),
    domain := binary(),
    user := binary(),
    full_jid := binary()
}.

%% @doc Initializes the connection FSM in wait_for_stream state.
-spec init(binary()) -> fsm_state().
init(Domain) ->
    #{state => wait_for_stream, domain => Domain, user => <<>>, full_jid => <<>>}.

%% @doc Handles protocol events and enforces strict authentication transitions.
-spec handle_event(term(), fsm_state()) ->
    {reply, binary() | [binary()], fsm_state()} |
    {ok, term(), fsm_state()} |
    {error, atom(), fsm_state()}.
handle_event(Event, State) ->
    %% % TODO: Implement state transitions:
    %% 1. wait_for_stream -> wait_for_sasl
    %% 2. wait_for_sasl -> authenticated
    %% 3. authenticated -> session_established
    {error, not_implemented, State}.

%% @doc Returns the current state name atom.
-spec get_state(fsm_state()) -> atom().
get_state(#{state := StateName}) -> StateName.
