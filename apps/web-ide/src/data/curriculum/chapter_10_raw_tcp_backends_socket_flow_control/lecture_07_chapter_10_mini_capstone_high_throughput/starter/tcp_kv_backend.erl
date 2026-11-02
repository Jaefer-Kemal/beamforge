-module(tcp_kv_backend).

-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).

%% @doc Parses a raw newline-stripped binary command into an internal tuple.
%% Supported: PING, SET <Key> <Val>, GET <Key>, DEL <Key>.
-spec parse_command(binary()) -> {ok, term()} | {error, unknown_command}.
parse_command(_RawLineBin) ->
    %% % TODO: Tokenize the incoming binary command line.
    %% % Match supported protocol verbs (PING, SET, GET, DEL) as specified
    %% % in the lesson guide, returning tagged tuples or {error, unknown_command}.
    ignore.

%% @doc Executes parsed command against EtsTable and returns wire protocol binary.
-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command(_Command, _EtsTable) ->
    %% % TODO: Execute against ETS table and return wire protocol response:
    %% %   - {ok, Cmd} or unwrapped Cmd:
    %% %     - ping -> <<"+PONG\r\n">>
    %% %     - {set, Key, Value} -> insert into EtsTable, return <<"+OK\r\n">>
    %% %     - {get, Key} -> lookup in EtsTable: if found <<"$", Value/binary, "\r\n">>, if missing <<"$-1\r\n">>
    %% %     - {del, Key} -> if existed and deleted <<":1\r\n">>, if was absent <<":0\r\n">>
    %% %   - {error, unknown_command} or other -> <<"-ERR unknown command\r\n">>
    ignore.

%% @doc Boots the TCP Key-Value server on ephemeral port 0 and returns {ok, ServerPid, Port}.
-spec start_server() -> {ok, pid(), inet:port_number()}.
start_server() ->
    %% % TODO:
    %% % 1. Initialize the concurrent named ETS storage table.
    %% % 2. Open an ephemeral passive listen socket on port 0.
    %% % 3. Spawn the acceptor loop to accept clients and hand off sockets to workers.
    %% % 4. In connection workers, enforce active-once backpressure, frame CRLF lines,
    %% %    execute commands against ETS, and stream replies back to clients.
    %% % 5. Return {ok, ServerPid, Port}.
    ignore.

%% @doc Stops the server and cleans up ETS storage.
-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    exit(ServerPid, kill),
    try ets:delete(tcp_kv_table) catch _:_ -> ok end,
    ok.
    