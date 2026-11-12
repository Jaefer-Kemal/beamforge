package bridge_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/beamforge/orchestrator/internal/bridge"
)

func TestRunXmppChatLiveCluster(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	solutions := map[string]string{
		"src/xmpp_sup.erl":              ch12SupSol,
		"src/xmpp_stream_parser.erl":    ch12ParserSol,
		"src/xmpp_session_registry.erl": ch12RegistrySol,
		"src/xmpp_c2s_statem.erl":       ch12StatemSol,
		"src/xmpp_router.erl":           ch12RouterSol,
	}

	sess, err := poolMgr.ClaimSession("xmpp-chat-live")
	if err != nil {
		t.Fatalf("ClaimSession failed: %v", err)
	}
	defer poolMgr.ReleaseSession("xmpp-chat-live")

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	// 1. Real 4-phase C2S handshake
	hsResp, err := runner.RunXmppChat(ctx, sess, bridge.XmppChatRequest{
		Action:    "handshake",
		BobOnline: true,
		Files:     solutions,
	})
	if err != nil || !hsResp.OK || len(hsResp.Stanzas) < 3 {
		t.Fatalf("Expected live handshake OK with >=3 stanzas, got err=%v resp=%+v", err, hsResp)
	}

	// 2. Real online delivery with XML escaping (<, &)
	sendOnline, err := runner.RunXmppChat(ctx, sess, bridge.XmppChatRequest{
		Action:    "send",
		Message:   "Hello Bob <OTP & BEAM>!",
		MsgID:     "chat_1",
		BobOnline: true,
		Files:     solutions,
	})
	if err != nil || !sendOnline.OK || !sendOnline.Delivered || !strings.Contains(sendOnline.RawXML, "Hello Bob &lt;OTP &amp; BEAM&gt;!") {
		t.Fatalf("Expected live online delivery, got err=%v resp=%+v", err, sendOnline)
	}

	// 3. Offline spooling + FIFO drain via pop_offline_messages/1 on reconnect
	sendOffline, err := runner.RunXmppChat(ctx, sess, bridge.XmppChatRequest{
		Action:    "send",
		Message:   "Offline Ping 1",
		MsgID:     "chat_off_1",
		BobOnline: false,
		Files:     solutions,
	})
	if err != nil || !sendOffline.OK || !sendOffline.SpooledOffline || sendOffline.OfflineCount != 1 {
		t.Fatalf("Expected offline spooling with count=1, got err=%v resp=%+v", err, sendOffline)
	}

	drainResp, err := runner.RunXmppChat(ctx, sess, bridge.XmppChatRequest{
		Action:          "toggle_bob",
		BobOnline:       true,
		OfflineMessages: []string{"Offline Ping 1", "Offline Ping 2"},
		Files:           solutions,
	})
	if err != nil || !drainResp.OK || len(drainResp.DrainedXMLs) != 2 || !strings.Contains(drainResp.DrainedXMLs[0], "Offline Ping 1") || !strings.Contains(drainResp.DrainedXMLs[1], "Offline Ping 2") {
		t.Fatalf("Expected FIFO drain of 2 queued offline XML stanzas, got err=%v resp=%+v", err, drainResp)
	}

	// 4. Pre-auth injection guard (<not-authorized/>)
	injResp, err := runner.RunXmppChat(ctx, sess, bridge.XmppChatRequest{
		Action: "inject_preauth",
		Files:  solutions,
	})
	if err != nil || !injResp.OK || !strings.Contains(injResp.RawXML, "not-authorized") {
		t.Fatalf("Expected live pre-auth <not-authorized/> rejection, got err=%v resp=%+v", err, injResp)
	}

	// 5. Chaos Monkey exit(whereis(xmpp_router), kill) -> registry preserved, router restarted, zero-loss delivery
	chaosResp, err := runner.RunXmppChat(ctx, sess, bridge.XmppChatRequest{
		Action:    "chaos_kill",
		BobOnline: true,
		Files:     solutions,
	})
	if err != nil || !chaosResp.OK || !chaosResp.Delivered || chaosResp.RegBefore == "" || chaosResp.RegBefore != chaosResp.RegAfter || chaosResp.RouterBefore == chaosResp.RouterAfter {
		t.Fatalf("Expected Chaos Monkey recovery preserving registry PID and respawning router, got err=%v resp=%+v", err, chaosResp)
	}

	// 6. Incomplete/broken files must return OK=false (never fake-pass)
	broken := make(map[string]string, len(solutions))
	for k, v := range solutions {
		broken[k] = v
	}
	broken["src/xmpp_router.erl"] = "-module(xmpp_router).\n-export([start_link/0]).\nstart_link() -> {error, not_implemented}.\n"
	failResp, err := runner.RunXmppChat(ctx, sess, bridge.XmppChatRequest{
		Action:    "send",
		Message:   "Should fail",
		BobOnline: true,
		Files:     broken,
	})
	if err != nil || failResp.OK {
		t.Fatalf("Expected incomplete/broken workspace to return OK=false, got err=%v resp=%+v", err, failResp)
	}

	// 7. Milestone ID aliases ch12-m1..ch12-m6 resolve to RunVerification cleanly
	for _, alias := range []string{"ch12-m1", "ch12-m2", "ch12-m3", "ch12-m4", "ch12-m5", "ch12-m6"} {
		rep, err := runner.RunVerification(ctx, sess, alias, solutions)
		if err != nil || rep.Verdict != "PASSED" || rep.Score != 100 {
			t.Fatalf("Expected milestone alias %s to pass verification, got err=%v rep=%+v", alias, err, rep)
		}
	}
}
