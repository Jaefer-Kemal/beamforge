-module(xmpp_jid).
-export([
    parse/1,
    to_bare/1,
    format_jid/1,
    is_same_bare_jid/2
]).

-type jid_map() :: #{
    user => binary(),
    domain => binary(),
    resource => binary(),
    bare => binary()
}.

%% @doc Parses a raw binary JID into validated components.
%% Ensures sub-binaries are unpinned using binary:copy/1.
-spec parse(binary()) -> {ok, jid_map()} | {error, invalid_jid}.
parse(JidBin) when is_binary(JidBin) ->
    %% % TODO: Implement RFC 7622 JID parser
    %% 1. Split on "/" to separate Resource (if present)
    %% 2. Split Bare part on "@" to extract User and Domain
    %% 3. Validate neither User nor Domain is empty
    %% 4. Use binary:copy/1 on all slices
    {error, not_implemented}.

%% @doc Extracts the Bare JID binary from either a map or binary JID.
-spec to_bare(jid_map() | binary()) -> binary() | {error, invalid_jid}.
to_bare(#{bare := Bare}) -> Bare;
to_bare(JidBin) when is_binary(JidBin) ->
    case parse(JidBin) of
        {ok, #{bare := Bare}} -> Bare;
        Error -> Error
    end.

%% @doc Formats a JID map back into standard wire format.
-spec format_jid(jid_map()) -> binary().
format_jid(#{user := User, domain := Domain, resource := Resource}) ->
    %% % TODO: Return User@Domain if Resource is <<>>, else User@Domain/Resource
    <<>>.

%% @doc Returns true if two JIDs represent the same user account.
-spec is_same_bare_jid(jid_map() | binary(), jid_map() | binary()) -> boolean().
is_same_bare_jid(Jid1, Jid2) ->
    %% % TODO: Compare bare JID representations
    false.
