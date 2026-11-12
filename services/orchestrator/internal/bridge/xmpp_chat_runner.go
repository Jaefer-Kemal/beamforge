package bridge

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/beamforge/orchestrator/internal/pool"
)

// XmppChatRequest configures a live OTP XMPP cluster interaction from the Capstone Studio.
type XmppChatRequest struct {
	Action          string            `json:"action"` // "handshake" | "send" | "toggle_bob" | "inject_preauth" | "chaos_kill"
	Message         string            `json:"message"`
	MsgID           string            `json:"msg_id"`
	BobOnline       bool              `json:"bob_online"`
	OfflineMessages []string          `json:"offline_messages"`
	Files           map[string]string `json:"files"`
}

// XmppChatStanza describes a single wire stanza emitted by the live OTP XMPP cluster.
type XmppChatStanza struct {
	Direction       string `json:"direction"` // "in" | "out" | "router"
	Source          string `json:"source"`
	Target          string `json:"target,omitempty"`
	XML             string `json:"xml"`
	Detail          string `json:"detail"`
	HandledByModule string `json:"handled_by_module"`
}

// XmppChatResponse returns live OTP execution telemetry and XMPP stanzas to the Studio UI.
type XmppChatResponse struct {
	OK             bool             `json:"ok"`
	CompileOK      bool             `json:"compile_ok"`
	Diagnostics    []Diagnostic     `json:"diagnostics,omitempty"`
	Action         string           `json:"action"`
	Delivered      bool             `json:"delivered"`
	SpooledOffline bool             `json:"spooled_offline"`
	OfflineCount   int              `json:"offline_count"`
	RawXML         string           `json:"raw_xml,omitempty"`
	DrainedXMLs    []string         `json:"drained_xmls,omitempty"`
	Stanzas        []XmppChatStanza `json:"stanzas,omitempty"`
	RegBefore      string           `json:"reg_before,omitempty"`
	RegAfter       string           `json:"reg_after,omitempty"`
	RouterBefore   string           `json:"router_before,omitempty"`
	RouterAfter    string           `json:"router_after,omitempty"`
	Notice         string           `json:"notice,omitempty"`
	RoutedVia      string           `json:"routed_via,omitempty"`
	Error          string           `json:"error,omitempty"`
	TimeMs         int              `json:"time_ms"`
}

// RunXmppChat compiles the workspace's 5 XMPP OTP modules and runs a live chat, offline drain,
// pre-auth security guard, or Chaos Monkey router-kill scenario directly on the BEAM.
func (r *Runner) RunXmppChat(ctx context.Context, session *pool.Session, req XmppChatRequest) (*XmppChatResponse, error) {
	session.Lock()
	defer session.Unlock()

	releaseWorker, err := r.poolMgr.AcquireWorker(ctx, 10*time.Second)
	if err != nil {
		return nil, err
	}
	defer releaseWorker()

	diags, rawCompileOut, _ := r.compileFilesLocked(ctx, session, req.Files)
	for _, d := range diags {
		if d.Severity == "error" {
			return &XmppChatResponse{
				OK:          false,
				CompileOK:   false,
				Diagnostics: diags,
				Action:      req.Action,
				Error:       strings.TrimSpace(rawCompileOut),
			}, nil
		}
	}

	action := strings.TrimSpace(req.Action)
	if action == "" {
		action = "handshake"
	}
	msgID := strings.TrimSpace(req.MsgID)
	if msgID == "" {
		msgID = fmt.Sprintf("m-%d", time.Now().UnixMilli()%10000)
	}
	msgHex := hex.EncodeToString([]byte(req.Message))
	msgIDHex := hex.EncodeToString([]byte(msgID))

	var offlineHexParts []string
	for _, m := range req.OfflineMessages {
		offlineHexParts = append(offlineHexParts, fmt.Sprintf("<<\"%s\">>", hex.EncodeToString([]byte(m))))
	}
	offlineHexList := "[" + strings.Join(offlineHexParts, ",") + "]"

	sessionDir := filepath.ToSlash(session.WorkspaceDir)
	sessionEbin := filepath.ToSlash(filepath.Join(session.WorkspaceDir, "ebin"))
	harnessDir := filepath.ToSlash(r.poolMgr.HarnessDir())
	incDir := filepath.ToSlash(filepath.Join(session.WorkspaceDir, "include"))

	evalCmd := fmt.Sprintf(`
file:set_cwd("%s"),
code:add_patha("%s"),
code:add_patha("%s"),
[begin
    Mod = list_to_atom(filename:rootname(filename:basename(B))),
    code:purge(Mod),
    code:load_file(Mod)
end || B <- filelib:wildcard(filename:join(["%s", "*.beam"]))],
_ = {inc, "%s"},

catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP0 -> exit(SupP0, kill) end),
catch ets:delete(xmpp_sessions_tab),

T0 = erlang:system_time(millisecond),
ActionBin = <<"%s">>,
BobOnline = %t,
MsgId = binary:decode_hex(<<"%s">>),
RawBody = binary:decode_hex(<<"%s">>),
OfflineQueueBodies = [binary:decode_hex(H) || H <- %s],

EscXml = fun(Bin) ->
    B1 = binary:replace(Bin, <<"&">>, <<"&amp;">>, [global]),
    B2 = binary:replace(B1, <<"<">>, <<"&lt;">>, [global]),
    binary:replace(B2, <<">">>, <<"&gt;">>, [global])
end,

Handshake = fun(User, Res) ->
    {ok, Pid} = xmpp_c2s_statem:start_link(#{username => User, domain => <<"beamforge.local">>}),
    {ok, wait_for_sasl, S1Out} = xmpp_c2s_statem:feed_xml(Pid, <<"<stream:stream to='beamforge.local'>">>),
    {ok, authenticated, S2Out} = xmpp_c2s_statem:feed_xml(Pid, <<"<auth mechanism='PLAIN'>", User/binary, "</auth>">>),
    {ok, authenticated, S3Out} = xmpp_c2s_statem:feed_xml(Pid, <<"<stream:stream to='beamforge.local'>">>),
    {ok, session_established, S4Out} = xmpp_c2s_statem:feed_xml(Pid, <<"<iq id='bind_1'><resource>", Res/binary, "</resource></iq>">>),
    {Pid, S1Out ++ S2Out ++ S3Out ++ S4Out}
end,

PidStr = fun(P) when is_pid(P) -> list_to_binary(pid_to_list(P)); (O) -> list_to_binary(io_lib:format("~p", [O])) end,

ResultMap = try
    {ok, _SupPid} = xmpp_sup:start_link(),
    {AlicePid, AliceHandshakeXmls} = Handshake(<<"alice">>, <<"web">>),

    %% Replay any pre-existing spooled messages while Bob is offline so xmpp_router holds them
    lists:foldl(fun(OBody, Idx) ->
        OId = list_to_binary(io_lib:format("off_~p", [Idx])),
        OBodySafe = EscXml(OBody),
        {ok, session_established, _} = xmpp_c2s_statem:feed_xml(
            AlicePid,
            <<"<message id='", OId/binary, "' to='bob@beamforge.local'><body>", OBodySafe/binary, "</body></message>">>
        ),
        Idx + 1
    end, 1, OfflineQueueBodies),

    Res = case ActionBin of
        <<"handshake">> ->
            HsStanzas = [begin
                #{direction => <<"out">>, source => <<"beamforge.local">>, target => <<"alice@beamforge.local/web">>,
                  xml => Xml, detail => <<"Real C2S gen_statem negotiation response">>,
                  handled_by_module => <<"xmpp_c2s_statem.erl (M4)">>}
            end || Xml <- AliceHandshakeXmls],
            #{ok => true, compile_ok => true, action => ActionBin, delivered => false, spooled_offline => false,
              offline_count => 0, stanzas => HsStanzas,
              notice => <<"Live 5-module XMPP cluster booted under xmpp_sup and completed Alice's 4-phase handshake.">>,
              routed_via => <<"xmpp_sup -> xmpp_c2s_statem -> xmpp_session_registry">>};

        <<"send">> ->
            BodySafe = EscXml(RawBody),
            ChatFrame = <<"<message id='", MsgId/binary, "' to='bob@beamforge.local'><body>", BodySafe/binary, "</body></message>">>,
            case BobOnline of
                true ->
                    {BobPid, _} = Handshake(<<"bob">>, <<"mobile">>),
                    {ok, session_established, _} = xmpp_c2s_statem:feed_xml(AlicePid, ChatFrame),
                    timer:sleep(25),
                    {ok, session_established, BobInfo} = xmpp_c2s_statem:get_session_info(BobPid),
                    BobInbox = maps:get(delivered_inbox, BobInfo, []),
                    xmpp_c2s_statem:stop(BobPid),
                    case BobInbox of
                        [_ | _] ->
                            DeliveredXml = lists:last(BobInbox),
                            BobPidTxt = PidStr(BobPid),
                            RouteDesc = <<"xmpp_router:route_stanza/3 -> ETS PID ", BobPidTxt/binary, " (delivered_inbox)">>,
                            #{ok => true, compile_ok => true, action => ActionBin, delivered => true, spooled_offline => false,
                              offline_count => 0, raw_xml => DeliveredXml, routed_via => RouteDesc,
                              stanzas => [
                                #{direction => <<"in">>, source => <<"alice@beamforge.local/web">>, target => <<"bob@beamforge.local">>,
                                  xml => ChatFrame, detail => <<"Framed via xmpp_stream_parser & dispatched via xmpp_c2s_statem">>,
                                  handled_by_module => <<"xmpp_c2s_statem.erl (M4)">>},
                                #{direction => <<"out">>, source => <<"xmpp_router">>, target => <<"bob@beamforge.local/mobile">>,
                                  xml => DeliveredXml, detail => <<"Delivered live into Bob's C2S delivered_inbox">>,
                                  handled_by_module => <<"xmpp_router.erl (M5)">>}
                              ]};
                        [] ->
                            #{ok => false, compile_ok => true, action => ActionBin, delivered => false, spooled_offline => false,
                              offline_count => 0, error => <<"Stanza was not delivered to Bob's C2S delivered_inbox. Verify xmpp_c2s_statem process_events/4 and xmpp_router:route_stanza/3.">>}
                    end;
                false ->
                    BeforeCnt = xmpp_router:get_offline_count(<<"bob@beamforge.local">>),
                    {ok, session_established, _} = xmpp_c2s_statem:feed_xml(AlicePid, ChatFrame),
                    AfterCnt = xmpp_router:get_offline_count(<<"bob@beamforge.local">>),
                    {ok, Popped} = xmpp_router:pop_offline_messages(<<"bob@beamforge.local">>),
                    case (AfterCnt > BeforeCnt) andalso length(Popped) > 0 of
                        true ->
                            SpooledXml = lists:last(Popped),
                            #{ok => true, compile_ok => true, action => ActionBin, delivered => false, spooled_offline => true,
                              offline_count => AfterCnt, raw_xml => SpooledXml,
                              routed_via => <<"xmpp_router:route_stanza/3 -> offline_store map (Bare JID)">>,
                              stanzas => [
                                #{direction => <<"in">>, source => <<"alice@beamforge.local/web">>, target => <<"bob@beamforge.local">>,
                                  xml => ChatFrame, detail => <<"Bob offline: spooled into xmpp_router offline_store map">>,
                                  handled_by_module => <<"xmpp_router.erl (M5)">>}
                              ]};
                        false ->
                            #{ok => false, compile_ok => true, action => ActionBin, delivered => false, spooled_offline => false,
                              offline_count => AfterCnt, error => <<"Message was not queued into xmpp_router offline_store. Check parse_jid/1 normalization and offline fallback.">>}
                    end
            end;

        <<"toggle_bob">> ->
            case BobOnline of
                true ->
                    BeforeCnt = xmpp_router:get_offline_count(<<"bob@beamforge.local">>),
                    {ok, DrainedXmls} = xmpp_router:pop_offline_messages(<<"bob@beamforge.local">>),
                    {BobPid, BobBindXmls} = Handshake(<<"bob">>, <<"mobile">>),
                    lists:foreach(fun(X) -> BobPid ! {deliver_stanza, X} end, DrainedXmls),
                    timer:sleep(20),
                    {ok, session_established, BobInfo} = xmpp_c2s_statem:get_session_info(BobPid),
                    InboxCount = length(maps:get(delivered_inbox, BobInfo, [])),
                    xmpp_c2s_statem:stop(BobPid),
                    NoticeTxt = list_to_binary(io_lib:format("Bob authenticated & registered (~p): drained ~p offline message(s) via pop_offline_messages/1 (inbox verified: ~p).", [BobPid, BeforeCnt, InboxCount])),
                    BindXml = case BobBindXmls of [] -> <<"<iq type='result' id='bind_1'/>">>; _ -> lists:last(BobBindXmls) end,
                    #{ok => true, compile_ok => true, action => ActionBin, delivered => true, spooled_offline => false,
                      offline_count => 0, drained_xmls => DrainedXmls, raw_xml => BindXml, notice => NoticeTxt,
                      routed_via => <<"xmpp_router:pop_offline_messages/1 -> delivered_inbox">>,
                      stanzas => [
                        #{direction => <<"out">>, source => <<"beamforge.local">>, target => <<"bob@beamforge.local/mobile">>,
                          xml => BindXml, detail => NoticeTxt,
                          handled_by_module => <<"xmpp_session_registry.erl (M3) + xmpp_router.erl (M5)">>}
                      ]};
                false ->
                    {BobPid, _} = Handshake(<<"bob">>, <<"mobile">>),
                    xmpp_c2s_statem:stop(BobPid),
                    timer:sleep(20),
                    Left = xmpp_session_registry:lookup_by_jid(<<"bob@beamforge.local/mobile">>),
                    case Left of
                        [] ->
                            #{ok => true, compile_ok => true, action => ActionBin, delivered => false, spooled_offline => false,
                              offline_count => 0,
                              raw_xml => <<"</stream:stream>">>,
                              notice => <<"Bob's C2S process stopped: unregister_session/1 removed bob@beamforge.local/mobile from xmpp_sessions_tab.">>,
                              stanzas => [
                                #{direction => <<"in">>, source => <<"bob@beamforge.local/mobile">>, target => <<"beamforge.local">>,
                                  xml => <<"</stream:stream>">>, detail => <<"Clean C2S teardown; ETS entry unregistered">>,
                                  handled_by_module => <<"xmpp_session_registry.erl (M3)">>}
                              ]};
                        _ ->
                            #{ok => false, compile_ok => true, action => ActionBin, delivered => false, spooled_offline => false,
                              offline_count => 0, error => <<"Bob session remained in ETS after xmpp_c2s_statem:stop/1 (check terminate/3 calling unregister_session/1).">>}
                    end
            end;

        <<"inject_preauth">> ->
            {ok, Attacker} = xmpp_c2s_statem:start_link(#{username => <<"eve">>, domain => <<"beamforge.local">>}),
            {ok, wait_for_sasl, _} = xmpp_c2s_statem:feed_xml(Attacker, <<"<stream:stream to='beamforge.local'>">>),
            InjectFrame = <<"<message id='inj_1' to='bob@beamforge.local'><body>malicious_payload()</body></message>">>,
            {ok, StateAfter, ErrList} = xmpp_c2s_statem:feed_xml(Attacker, InjectFrame),
            xmpp_c2s_statem:stop(Attacker),
            case {StateAfter, ErrList} of
                {wait_for_sasl, [ErrXml | _]} ->
                    OkAuthErr = binary:match(ErrXml, <<"not-authorized">>) =/= nomatch,
                    case OkAuthErr of
                        true ->
                            #{ok => true, compile_ok => true, action => ActionBin, delivered => false, spooled_offline => false,
                              offline_count => 0, raw_xml => ErrXml,
                              notice => <<"Pre-Auth Guard enforced live: xmpp_c2s_statem stayed in wait_for_sasl and emitted <not-authorized/>.">>,
                              stanzas => [
                                #{direction => <<"in">>, source => <<"unauthenticated_socket">>, target => <<"beamforge.local">>,
                                  xml => InjectFrame, detail => <<"Attempted chat stanza injection prior to SASL PLAIN auth">>,
                                  handled_by_module => <<"xmpp_stream_parser.erl (M2)">>},
                                #{direction => <<"out">>, source => <<"beamforge.local">>, target => <<"unauthenticated_socket">>,
                                  xml => ErrXml, detail => <<"Blocked pre-auth message in wait_for_sasl without escalating privileges">>,
                                  handled_by_module => <<"xmpp_c2s_statem.erl (M4 Security Guard)">>}
                              ]};
                        false ->
                            #{ok => false, compile_ok => true, action => ActionBin, error => <<"Pre-auth stanza did not emit <not-authorized/> stream error.">>}
                    end;
                _ ->
                    #{ok => false, compile_ok => true, action => ActionBin, error => <<"Pre-auth guard failed to hold connection in wait_for_sasl with error reply.">>}
            end;

        <<"chaos_kill">> ->
            {BobPid, _} = Handshake(<<"bob">>, <<"mobile">>),
            RegBefore = whereis(xmpp_session_registry),
            RouterBefore = whereis(xmpp_router),
            exit(RouterBefore, kill),
            timer:sleep(45),
            RegAfter = whereis(xmpp_session_registry),
            RouterAfter = whereis(xmpp_router),
            RegTxtBefore = PidStr(RegBefore),
            RegTxtAfter = PidStr(RegAfter),
            RouterTxtBefore = PidStr(RouterBefore),
            RouterTxtAfter = PidStr(RouterAfter),
            ChaosBody = <<"Post-Chaos Zero-Loss Recovery Check">>,
            ChaosFrame = <<"<message id='chaos_1' to='bob@beamforge.local'><body>", ChaosBody/binary, "</body></message>">>,
            {ok, session_established, _} = xmpp_c2s_statem:feed_xml(AlicePid, ChaosFrame),
            timer:sleep(25),
            {ok, session_established, BobInfo} = xmpp_c2s_statem:get_session_info(BobPid),
            BobInbox = maps:get(delivered_inbox, BobInfo, []),
            xmpp_c2s_statem:stop(BobPid),
            ChaosPass = (RegBefore =:= RegAfter) andalso is_pid(RouterAfter) andalso (RouterBefore =/= RouterAfter) andalso (length(BobInbox) > 0),
            case ChaosPass of
                true ->
                    DeliveredXml = lists:last(BobInbox),
                    NoticeTxt = <<"Chaos Attack Survived! Registry ", RegTxtBefore/binary, " stayed untouched while xmpp_sup respawned xmpp_router (", RouterTxtBefore/binary, " -> ", RouterTxtAfter/binary, ") with zero session loss.">>,
                    #{ok => true, compile_ok => true, action => ActionBin, delivered => true, spooled_offline => false,
                      offline_count => 0, raw_xml => DeliveredXml,
                      reg_before => RegTxtBefore, reg_after => RegTxtAfter,
                      router_before => RouterTxtBefore, router_after => RouterTxtAfter,
                      notice => NoticeTxt, routed_via => <<"xmpp_sup (rest_for_one) -> xmpp_router ", RouterTxtAfter/binary>>,
                      stanzas => [
                        #{direction => <<"router">>, source => <<"Chaos Monkey">>, target => <<"xmpp_router ", RouterTxtBefore/binary>>,
                          xml => <<"exit(whereis(xmpp_router), kill).">>,
                          detail => <<"Injected untrappable kill signal into Child #2 (xmpp_router)">>,
                          handled_by_module => <<"xmpp_sup.erl (M1 rest_for_one)">>},
                        #{direction => <<"out">>, source => <<"xmpp_sup">>, target => <<"bob@beamforge.local/mobile">>,
                          xml => DeliveredXml,
                          detail => NoticeTxt,
                          handled_by_module => <<"xmpp_router.erl (M5) + xmpp_session_registry.erl (M3)">>}
                      ]};
                false ->
                    #{ok => false, compile_ok => true, action => ActionBin,
                      reg_before => RegTxtBefore, reg_after => RegTxtAfter,
                      router_before => RouterTxtBefore, router_after => RouterTxtAfter,
                      error => <<"Chaos recovery failed: registry PID changed, router did not restart, or post-crash message was lost.">>}
            end;

        _ ->
            #{ok => false, compile_ok => true, action => ActionBin, error => <<"Unknown xmpp chat action">>}
    end,

    catch xmpp_c2s_statem:stop(AlicePid),
    Res
catch C:R ->
    ErrMsg = list_to_binary(io_lib:format("Live OTP XMPP cluster error (~p:~p) — complete M1-M5 to boot live routing.", [C, R])),
    #{ok => false, compile_ok => true, action => ActionBin, delivered => false, spooled_offline => false, offline_count => 0, error => ErrMsg}
end,

catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP1 -> exit(SupP1, kill) end),
catch ets:delete(xmpp_sessions_tab),
Elapsed = erlang:system_time(millisecond) - T0,
FinalMap = ResultMap#{time_ms => Elapsed},
io:format("~n__BF_XMPP_CHAT_RESULT__~n~s~n", [bf_json:encode(FinalMap)]),
init:stop().
`, sessionDir, harnessDir, sessionEbin, sessionEbin, incDir, action, req.BobOnline, msgIDHex, msgHex, offlineHexList)

	args := []string{
		"+S", "1:1",
		"+B",
		"-noinput",
		"-pa", harnessDir,
		"-pa", sessionEbin,
		"-noshell",
		"-eval", evalCmd,
	}

	cmd := exec.CommandContext(ctx, r.poolMgr.ErlPath(), args...)
	cmd.Dir = session.WorkspaceDir
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	runErr := cmd.Run()
	rawOut := stdout.String()

	const marker = "__BF_XMPP_CHAT_RESULT__"
	if idx := strings.Index(rawOut, marker); idx >= 0 {
		jsonPart := strings.TrimSpace(rawOut[idx+len(marker):])
		if nl := strings.IndexByte(jsonPart, '\n'); nl >= 0 {
			jsonPart = strings.TrimSpace(jsonPart[:nl])
		}
		var parsed XmppChatResponse
		if err := json.Unmarshal([]byte(jsonPart), &parsed); err == nil {
			return &parsed, nil
		}
	}

	errDetail := strings.TrimSpace(stderr.String())
	if errDetail == "" {
		errDetail = strings.TrimSpace(rawOut)
	}
	if errDetail == "" && runErr != nil {
		errDetail = runErr.Error()
	}
	return &XmppChatResponse{
		OK:        false,
		CompileOK: true,
		Action:    action,
		Error:     errDetail,
	}, nil
}

