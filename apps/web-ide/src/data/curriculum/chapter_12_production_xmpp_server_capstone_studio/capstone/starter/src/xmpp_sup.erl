-module(xmpp_sup).
-behaviour(supervisor).

-export([start_link/0, stop/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> supervisor:stop(Pid)
    end.

init([]) ->
    %% % TODO [Milestone 1 - Step 1]: Configure the Root Supervisor Flags
    %% Set:
    %%   strategy  => rest_for_one  (router depends on registry, so if registry restarts, router must too)
    %%   intensity => 5             (allow up to 5 restarts)
    %%   period    => 10            (within a 10-second window)
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },

    %% % TODO [Milestone 1 - Step 2]: Declare the Ordered Child Specifications
    %% Under rest_for_one, child startup order is critical!
    %% Child 1 (xmpp_session_registry):
    %%   - id: xmpp_session_registry
    %%   - start: {xmpp_session_registry, start_link, []}
    %%   - restart: permanent
    %%   - shutdown: 2000
    %%   - type: worker
    %%   - modules: [xmpp_session_registry]
    %%
    %% Child 2 (xmpp_router):
    %%   - id: xmpp_router
    %%   - start: {xmpp_router, start_link, []}
    %%   - restart: permanent
    %%   - shutdown: 2000
    %%   - type: worker
    %%   - modules: [xmpp_router]
    ChildSpecs = [
        %% Add child specification map for xmpp_session_registry here:

        %% Add child specification map for xmpp_router here:

    ],
    {ok, {SupFlags, ChildSpecs}}.
