package bridge_test

import (
	"context"
	"testing"
	"time"
)

const (
	ch12SupSol = `-module(xmpp_sup).
-behaviour(supervisor).

-export([start_link/0, stop/0, init/1]).

%% @doc Starts and locally registers the root XMPP OTP supervisor process,
%% returning {ok, Pid} on success or an error tuple if startup fails.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Synchronously stops the locally registered root supervisor if running,
%% or returns ok immediately when already stopped.
stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> supervisor:stop(Pid)
    end.

%% @doc Returns the root supervisor flags and ordered child specifications
%% governing the session registry and message router workers.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => xmpp_session_registry,
            start => {xmpp_session_registry, start_link, []},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [xmpp_session_registry]
        },
        #{
            id => xmpp_router,
            start => {xmpp_router, start_link, []},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [xmpp_router]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.
`

	ch12ParserSol = `-module(xmpp_stream_parser).
-export([new_buffer/0, feed_chunk/2, extract_attr/2, extract_tag_body/2]).

%% @doc Returns an empty initial framing buffer binary.
new_buffer() ->
    <<>>.

%% @doc Appends IncomingBin onto BufferBin, decodes all complete XMPP stream
%% frames into event tuples with unpinned binaries, and returns leftover bytes.
feed_chunk(BufferBin, IncomingBin) when is_binary(BufferBin), is_binary(IncomingBin) ->
    Combined = <<BufferBin/binary, IncomingBin/binary>>,
    extract_events(Combined, []).

extract_events(Bin, Acc) ->
    CleanBin = trim_leading_ws(Bin),
    case CleanBin of
        <<>> ->
            {lists:reverse(Acc), <<>>};
        <<"</stream:stream>", Rest/binary>> ->
            extract_events(Rest, [stream_close | Acc]);
        <<"<stream:stream", _/binary>> ->
            case binary:match(CleanBin, <<">">>) of
                {Pos, 1} ->
                    HeaderLen = Pos + 1,
                    <<HeaderBin:HeaderLen/binary, Rest/binary>> = CleanBin,
                    Domain = binary:copy(extract_attr(HeaderBin, <<"to">>, <<"localhost">>)),
                    extract_events(Rest, [{stream_open, Domain} | Acc]);
                nomatch ->
                    {lists:reverse(Acc), binary:copy(CleanBin)}
            end;
        <<"<ping", _/binary>> ->
            case binary:match(CleanBin, <<"/>">>) of
                {Pos, 2} ->
                    FrameLen = Pos + 2,
                    <<FrameBin:FrameLen/binary, Rest/binary>> = CleanBin,
                    Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"ping_1">>)),
                    extract_events(Rest, [{ping, Id} | Acc]);
                nomatch ->
                    {lists:reverse(Acc), binary:copy(CleanBin)}
            end;
        <<"<auth", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</auth>">>, fun(FrameBin) ->
                Mech = binary:copy(extract_attr(FrameBin, <<"mechanism">>, <<"PLAIN">>)),
                Payload = binary:copy(extract_tag_body(FrameBin, <<"auth">>)),
                {sasl_auth, Mech, Payload}
            end, Acc);
        <<"<iq", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</iq>">>, fun(FrameBin) ->
                Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"bind_1">>)),
                Res = binary:copy(extract_tag_body(FrameBin, <<"resource">>)),
                {iq_bind, Id, Res}
            end, Acc);
        <<"<message", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</message>">>, fun(FrameBin) ->
                Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"msg_1">>)),
                To = binary:copy(extract_attr(FrameBin, <<"to">>, <<>>)),
                Body = binary:copy(extract_tag_body(FrameBin, <<"body">>)),
                {chat_message, Id, To, Body}
            end, Acc);
        Other ->
            {lists:reverse(Acc), binary:copy(Other)}
    end.

extract_closed_tag(Bin, CloseTag, Fun, Acc) ->
    CloseTagLen = byte_size(CloseTag),
    case binary:match(Bin, CloseTag) of
        {Pos, CloseTagLen} ->
            TotalLen = Pos + CloseTagLen,
            <<FrameBin:TotalLen/binary, Rest/binary>> = Bin,
            Event = Fun(FrameBin),
            extract_events(Rest, [Event | Acc]);
        nomatch ->
            {lists:reverse(Acc), binary:copy(Bin)}
    end.

%% @doc Extracts the unquoted value of AttrName from an XML element binary,
%% returning empty binary if the attribute is absent.
extract_attr(Bin, AttrName) ->
    extract_attr(Bin, AttrName, <<>>).

extract_attr(Bin, AttrName, Default) ->
    Key1 = <<AttrName/binary, 61, 34>>,
    Key2 = <<AttrName/binary, 61, 39>>,
    case find_attr_val(Bin, Key1, <<34>>) of
        {ok, Val} -> Val;
        nomatch ->
            case find_attr_val(Bin, Key2, <<39>>) of
                {ok, Val} -> Val;
                nomatch -> Default
            end
    end.

find_attr_val(Bin, Key, QuoteChar) ->
    case binary:match(Bin, Key) of
        {Pos, Len} ->
            Start = Pos + Len,
            <<_:Start/binary, Rem/binary>> = Bin,
            case binary:match(Rem, QuoteChar) of
                {ValLen, _} ->
                    <<Val:ValLen/binary, _/binary>> = Rem,
                    {ok, Val};
                nomatch ->
                    nomatch
            end;
        nomatch ->
            nomatch
    end.

%% @doc Extracts the inner text bytes delimited by <TagName ...> and </TagName>,
%% returning empty binary if the element is absent or unclosed.
extract_tag_body(Bin, TagName) ->
    OpenTag = <<"<", TagName/binary>>,
    CloseTag = <<"</", TagName/binary, ">">>,
    case binary:match(Bin, OpenTag) of
        {PosOpen, _} ->
            <<_:PosOpen/binary, Rem1/binary>> = Bin,
            case binary:match(Rem1, <<">">>) of
                {PosCloseOpen, 1} ->
                    ContentStart = PosCloseOpen + 1,
                    <<_:ContentStart/binary, Rem2/binary>> = Rem1,
                    case binary:match(Rem2, CloseTag) of
                        {BodyLen, _} ->
                            <<Body:BodyLen/binary, _/binary>> = Rem2,
                            Body;
                        nomatch ->
                            <<>>
                    end;
                nomatch ->
                    <<>>
            end;
        nomatch ->
            <<>>
    end.

trim_leading_ws(<<C, Rest/binary>>) when C =:= 32; C =:= 9; C =:= 10; C =:= 13 ->
    trim_leading_ws(Rest);
trim_leading_ws(Bin) ->
    Bin.
`

	ch12RegistrySol = `-module(xmpp_session_registry).
-behaviour(gen_server).

-export([
    start_link/0,
    stop/0,
    register_session/3,
    unregister_session/1,
    lookup_by_jid/1,
    list_all_sessions/0,
    parse_jid/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, xmpp_sessions_tab).

%% @doc Starts and locally registers the ETS session registry gen_server.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Synchronously stops the locally registered session registry if running.
stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

%% @doc Registers FullJid with integer Priority and monitors C2sPid in ETS.
register_session(FullJid, Priority, C2sPid)
  when is_binary(FullJid), is_integer(Priority), is_pid(C2sPid) ->
    gen_server:call(?MODULE, {register_session, FullJid, Priority, C2sPid}).

%% @doc Unregisters FullJid, flushes its process monitor, and removes its ETS row.
unregister_session(FullJid) when is_binary(FullJid) ->
    gen_server:call(?MODULE, {unregister_session, FullJid}).

%% @doc Looks up recipient PIDs concurrently in ETS by exact Full JID or highest
%% numerical priority matching a Bare JID.
lookup_by_jid(TargetJid) when is_binary(TargetJid) ->
    ensure_table(),
    case binary:match(TargetJid, <<"/">>) of
        {_, _} ->
            case ets:lookup(?TAB, TargetJid) of
                [{TargetJid, _Bare, _Res, _Prio, Pid, _MRef}] -> [Pid];
                [] -> []
            end;
        nomatch ->
            All = ets:tab2list(?TAB),
            Matching = [Item || Item = {_Full, Bare, _Res, _Prio, _Pid, _MRef} <- All, Bare =:= TargetJid],
            Sorted = lists:sort(fun({_, _, _, P1, _, _}, {_, _, _, P2, _, _}) -> P1 >= P2 end, Matching),
            case Sorted of
                [{_F, _B, _R, _P, TopPid, _Ref} | _] -> [TopPid];
                [] -> []
            end
    end.

%% @doc Returns all active 6-tuple session records stored in xmpp_sessions_tab.
list_all_sessions() ->
    ensure_table(),
    ets:tab2list(?TAB).

%% @doc Splits a JID binary into {BareJid, Resource} (empty resource when absent).
parse_jid(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"/">>) of
        [Bare, Res] -> {Bare, Res};
        [Bare] -> {Bare, <<>>}
    end.

init([]) ->
    ensure_table(),
    {ok, #{monitors => #{}}}.

handle_call({register_session, FullJidBin, Priority, C2sPid}, _From, State) ->
    ensure_table(),
    {BareJid, Resource} = parse_jid(FullJidBin),
    MRef = erlang:monitor(process, C2sPid),
    ets:insert(?TAB, {FullJidBin, BareJid, Resource, Priority, C2sPid, MRef}),
    Monitors = maps:get(monitors, State, #{}),
    NewMonitors = Monitors#{MRef => FullJidBin},
    {reply, ok, State#{monitors => NewMonitors}};

handle_call({unregister_session, FullJidBin}, _From, State) ->
    ensure_table(),
    case ets:lookup(?TAB, FullJidBin) of
        [{FullJidBin, _Bare, _Res, _Prio, _Pid, MRef}] ->
            erlang:demonitor(MRef, [flush]),
            ets:delete(?TAB, FullJidBin);
        [] ->
            ok
    end,
    {reply, ok, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'DOWN', MRef, process, DeadPid, _Reason}, State) ->
    ensure_table(),
    Monitors = maps:get(monitors, State, #{}),
    case maps:get(MRef, Monitors, undefined) of
        undefined ->
            lists:foreach(fun({FullJid, _B, _R, _P, Pid, _Ref}) ->
                if Pid =:= DeadPid -> ets:delete(?TAB, FullJid); true -> ok end
            end, ets:tab2list(?TAB)),
            {noreply, State};
        FullJidBin ->
            ets:delete(?TAB, FullJidBin),
            {noreply, State#{monitors => maps:remove(MRef, Monitors)}}
    end;

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

ensure_table() ->
    case ets:whereis(?TAB) of
        undefined ->
            ets:new(?TAB, [set, named_table, public, {read_concurrency, true}]);
        _Tid ->
            ?TAB
    end.
`

	ch12StatemSol = `-module(xmpp_c2s_statem).
-behaviour(gen_statem).

-export([
    start_link/1,
    feed_xml/2,
    get_session_info/1,
    stop/1
]).
-export([
    callback_mode/0,
    init/1,
    wait_for_stream/3,
    wait_for_sasl/3,
    authenticated/3,
    session_established/3,
    terminate/3
]).

%% @doc Starts a linked C2S connection state machine configured with Opts map.
start_link(Opts) when is_map(Opts) ->
    gen_statem:start_link(?MODULE, Opts, []).

%% @doc Feeds an incoming XML chunk binary synchronously into the C2S FSM,
%% returning {ok, NextState, OutXmlList}.
feed_xml(Pid, XmlChunkBin) when is_pid(Pid), is_binary(XmlChunkBin) ->
    gen_statem:call(Pid, {xml_chunk, XmlChunkBin}).

%% @doc Returns the current protocol phase atom and connection state map.
get_session_info(Pid) when is_pid(Pid) ->
    gen_statem:call(Pid, get_session_info).

%% @doc Synchronously stops the C2S connection process and triggers cleanup.
stop(Pid) when is_pid(Pid) ->
    gen_statem:stop(Pid).

callback_mode() ->
    state_functions.

init(Opts) ->
    Socket = maps:get(socket, Opts, undefined),
    if Socket =/= undefined ->
        _ = inet:setopts(Socket, [{active, once}]);
       true ->
        ok
    end,
    Data = #{
        socket => Socket,
        buffer => xmpp_stream_parser:new_buffer(),
        domain => maps:get(domain, Opts, <<"localhost">>),
        username => maps:get(username, Opts, <<"alice">>),
        resource => <<>>,
        full_jid => <<>>,
        priority => 10,
        delivered_inbox => []
    },
    {ok, wait_for_stream, Data}.

wait_for_stream({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, wait_for_stream, Data, From);
wait_for_stream(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, wait_for_stream, Data, undefined);
wait_for_stream({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, wait_for_stream, Data}}]};
wait_for_stream(_EventType, _Event, _Data) ->
    keep_state_and_data.

wait_for_sasl({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, wait_for_sasl, Data, From);
wait_for_sasl(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, wait_for_sasl, Data, undefined);
wait_for_sasl({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, wait_for_sasl, Data}}]};
wait_for_sasl(_EventType, _Event, _Data) ->
    keep_state_and_data.

authenticated({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, authenticated, Data, From);
authenticated(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, authenticated, Data, undefined);
authenticated({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, authenticated, Data}}]};
authenticated(_EventType, _Event, _Data) ->
    keep_state_and_data.

session_established({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, session_established, Data, From);
session_established(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, session_established, Data, undefined);
session_established(info, {deliver_stanza, XmlBin}, Data) ->
    send_to_socket(maps:get(socket, Data, undefined), XmlBin),
    Inbox = maps:get(delivered_inbox, Data, []),
    {keep_state, Data#{delivered_inbox => Inbox ++ [XmlBin]}};
session_established({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, session_established, Data}}]};
session_established(_EventType, _Event, _Data) ->
    keep_state_and_data.

terminate(_Reason, _State, Data) ->
    case maps:get(full_jid, Data, <<>>) of
        <<>> -> ok;
        FullJid ->
            try xmpp_session_registry:unregister_session(FullJid) catch _:_ -> ok end,
            ok
    end.

handle_incoming_chunk(Chunk, CurrentState, Data, ReplyFrom) ->
    OldBuf = maps:get(buffer, Data, <<>>),
    {Events, NewBuf} = xmpp_stream_parser:feed_chunk(OldBuf, Chunk),
    {NextState, UpdatedData, OutXmlList} =
        process_events(Events, CurrentState, Data#{buffer => NewBuf}, []),
    lists:foreach(fun(Xml) ->
        send_to_socket(maps:get(socket, UpdatedData, undefined), Xml)
    end, OutXmlList),
    case ReplyFrom of
        undefined ->
            {next_state, NextState, UpdatedData};
        From ->
            {next_state, NextState, UpdatedData, [{reply, From, {ok, NextState, OutXmlList}}]}
    end.

process_events([], State, Data, OutAcc) ->
    {State, Data, lists:reverse(OutAcc)};

process_events([{stream_open, Domain} | Rest], wait_for_stream, Data, OutAcc) ->
    Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
    process_events(Rest, wait_for_sasl, Data#{domain => Domain}, [Reply | OutAcc]);

process_events([{sasl_auth, _Mech, Payload} | Rest], wait_for_sasl, Data, OutAcc) ->
    User = extract_user_from_sasl(Payload, maps:get(username, Data, <<"alice">>)),
    Reply = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
    process_events(Rest, authenticated, Data#{username => User}, [Reply | OutAcc]);

process_events([_PreAuthStanza | Rest], wait_for_sasl, Data, OutAcc) ->
    Err = <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>,
    process_events(Rest, wait_for_sasl, Data, [Err | OutAcc]);

process_events([{stream_open, Domain} | Rest], authenticated, Data, OutAcc) ->
    Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>">>,
    process_events(Rest, authenticated, Data#{domain => Domain}, [Reply | OutAcc]);

process_events([{iq_bind, Id, ResourceBin} | Rest], authenticated, Data, OutAcc) ->
    Res = case ResourceBin of <<>> -> <<"obsidian">>; R -> R end,
    User = maps:get(username, Data, <<"alice">>),
    Domain = maps:get(domain, Data, <<"localhost">>),
    FullJid = <<User/binary, "@", Domain/binary, "/", Res/binary>>,
    try xmpp_session_registry:register_session(FullJid, maps:get(priority, Data, 10), self()) catch _:_ -> ok end,
    Reply = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>,
    process_events(Rest, session_established, Data#{resource => Res, full_jid => FullJid}, [Reply | OutAcc]);

process_events([{chat_message, Id, ToJid, Body} | Rest], session_established, Data, OutAcc) ->
    FromJid = maps:get(full_jid, Data, <<"alice@localhost/obsidian">>),
    TargetJid = case ToJid of <<>> -> FromJid; T -> T end,
    StanzaXml = <<"<message from='", FromJid/binary, "' to='", TargetJid/binary, "' id='", Id/binary, "' type='chat'><body>", Body/binary, "</body></message>">>,
    _ = try xmpp_router:route_stanza(FromJid, TargetJid, StanzaXml) catch _:_ -> ok end,
    process_events(Rest, session_established, Data, OutAcc);

process_events([{ping, Id} | Rest], State, Data, OutAcc) ->
    Reply = <<"<iq type='result' id='", Id/binary, "'/>">>,
    process_events(Rest, State, Data, [Reply | OutAcc]);

process_events([stream_close | Rest], _State, Data, OutAcc) ->
    Reply = <<"</stream:stream>">>,
    process_events(Rest, wait_for_stream, Data, [Reply | OutAcc]);

process_events([_Other | Rest], State, Data, OutAcc) ->
    process_events(Rest, State, Data, OutAcc).

extract_user_from_sasl(<<>>, Default) -> Default;
extract_user_from_sasl(Payload, Default) ->
    case binary:split(Payload, <<0>>, [global]) of
        [_Authzid, Authcid, _Pass | _] when Authcid =/= <<>> -> Authcid;
        [Single | _] when Single =/= <<>> -> Single;
        _ -> Default
    end.

send_to_socket(undefined, _Data) -> ok;
send_to_socket(Socket, Data) ->
    try gen_tcp:send(Socket, Data) catch _:_ -> ok end,
    ok.
`

	ch12RouterSol = `-module(xmpp_router).
-behaviour(gen_server).

-export([
    start_link/0,
    stop/0,
    route_stanza/3,
    pop_offline_messages/1,
    get_offline_count/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

%% @doc Starts and locally registers the stanza router gen_server process.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Synchronously stops the locally registered stanza router if running.
stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

%% @doc Dispatches XmlBin to online target PIDs or spools it offline by Bare JID.
route_stanza(FromFullJid, ToJid, XmlBin)
  when is_binary(FromFullJid), is_binary(ToJid), is_binary(XmlBin) ->
    gen_server:call(?MODULE, {route_stanza, FromFullJid, ToJid, XmlBin}).

%% @doc Retrieves and clears FIFO offline messages queued for TargetJid's Bare JID.
pop_offline_messages(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {pop_offline, TargetJid}).

%% @doc Returns the integer count of offline messages spooled for TargetJid's Bare JID.
get_offline_count(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {get_offline_count, TargetJid}).

init([]) ->
    {ok, #{offline_store => #{}, total_routed => 0}}.

handle_call({route_stanza, _FromFullJid, ToJid, XmlBin}, _From, State) ->
    TargetPids = xmpp_session_registry:lookup_by_jid(ToJid),
    case TargetPids of
        [_ | _] ->
            lists:foreach(fun(Pid) ->
                Pid ! {deliver_stanza, binary:copy(XmlBin)}
            end, TargetPids),
            Count = length(TargetPids),
            Total = maps:get(total_routed, State, 0) + Count,
            {reply, {routed, Count}, State#{total_routed => Total}};
        [] ->
            {BareJid, _Res} = xmpp_session_registry:parse_jid(ToJid),
            OfflineStore = maps:get(offline_store, State, #{}),
            Existing = maps:get(BareJid, OfflineStore, []),
            UpdatedStore = OfflineStore#{BareJid => Existing ++ [binary:copy(XmlBin)]},
            {reply, {queued_offline, BareJid}, State#{offline_store => UpdatedStore}}
    end;

handle_call({pop_offline, TargetJid}, _From, State) ->
    {BareJid, _Res} = xmpp_session_registry:parse_jid(TargetJid),
    OfflineStore = maps:get(offline_store, State, #{}),
    Msgs = maps:get(BareJid, OfflineStore, []),
    UpdatedStore = maps:remove(BareJid, OfflineStore),
    {reply, {ok, Msgs}, State#{offline_store => UpdatedStore}};

handle_call({get_offline_count, TargetJid}, _From, State) ->
    {BareJid, _Res} = xmpp_session_registry:parse_jid(TargetJid),
    OfflineStore = maps:get(offline_store, State, #{}),
    Msgs = maps:get(BareJid, OfflineStore, []),
    {reply, length(Msgs), State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`
)

func TestChapter12Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	all5Files := map[string]string{
		"src/xmpp_sup.erl":              ch12SupSol,
		"src/xmpp_stream_parser.erl":    ch12ParserSol,
		"src/xmpp_session_registry.erl": ch12RegistrySol,
		"src/xmpp_c2s_statem.erl":       ch12StatemSol,
		"src/xmpp_router.erl":           ch12RouterSol,
	}

	tests := []struct {
		name       string
		exerciseID string
		files      map[string]string
		wantStages int
	}{
		{
			name:       "ch12-l01 Milestone 1: Root rest_for_one Supervisor (xmpp_sup)",
			exerciseID: "ch12-l01",
			files:      all5Files,
			wantStages: 4,
		},
		{
			name:       "ch12-l02 Milestone 2: Incremental XML Stream Framer (xmpp_stream_parser)",
			exerciseID: "ch12-l02",
			files:      all5Files,
			wantStages: 4,
		},
		{
			name:       "ch12-l03 Milestone 3: Concurrent ETS Session Registry (xmpp_session_registry)",
			exerciseID: "ch12-l03",
			files:      all5Files,
			wantStages: 4,
		},
		{
			name:       "ch12-l04 Milestone 4: C2S Connection State Machine (xmpp_c2s_statem)",
			exerciseID: "ch12-l04",
			files:      all5Files,
			wantStages: 4,
		},
		{
			name:       "ch12-l05 Milestone 5: Stanza Router & Offline Store (xmpp_router)",
			exerciseID: "ch12-l05",
			files:      all5Files,
			wantStages: 4,
		},
		{
			name:       "ch12-capstone Final Capstone: 5-Module Integration & Chaos Monkey Resilience",
			exerciseID: "ch12-capstone",
			files:      all5Files,
			wantStages: 6,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sessionID := "test-" + tc.exerciseID
			session, err := poolMgr.ClaimSession(sessionID)
			if err != nil {
				t.Fatalf("ClaimSession failed: %v", err)
			}
			defer poolMgr.ReleaseSession(sessionID)

			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			report, err := runner.RunVerification(ctx, session, tc.exerciseID, tc.files)
			if err != nil {
				t.Fatalf("RunVerification failed with error: %v", err)
			}

			if report.Verdict != "PASSED" {
				t.Errorf("[%s] Expected verdict PASSED, got %s", tc.exerciseID, report.Verdict)
				for _, st := range report.Stages {
					t.Logf("  Stage %s (%s): status=%s, details=%s", st.ID, st.Title, st.Status, st.Details)
				}
			} else {
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				if len(report.Stages) != tc.wantStages {
					t.Errorf("[%s] Expected %d stages, got %d", tc.exerciseID, tc.wantStages, len(report.Stages))
				}
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}

			runRes, errRun := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
			if errRun != nil {
				t.Fatalf("RunCode failed with error: %v", errRun)
			}
			if !runRes.CompileOk {
				t.Errorf("[%s] RunCode failed compilation: %s", tc.exerciseID, runRes.Stdout)
			}
			if len(runRes.VisibleTests) == 0 {
				t.Errorf("[%s] Expected visible tests, got 0", tc.exerciseID)
			}
			for _, vt := range runRes.VisibleTests {
				if !vt.Passed {
					t.Errorf("[%s] Visible test failed: call=%s, expected=%s, actual=%s", tc.exerciseID, vt.CallStr, vt.Expected, vt.Actual)
				}
			}
		})
	}
}
