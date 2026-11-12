package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/beamforge/orchestrator/internal/bridge"
	"github.com/beamforge/orchestrator/internal/gateway"
	"github.com/beamforge/orchestrator/internal/pool"
)

func loadCh12SolutionsFromRepo(t *testing.T, root string) map[string]string {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(root, "apps", "web-ide", "src", "data", "chapters", "ch12.ts"))
	if err != nil {
		t.Fatalf("read ch12.ts: %v", err)
	}
	src := string(raw)
	startTok := "export const CH12_SOLUTION_FILES: Record<string, string> = {"
	sIdx := strings.Index(src, startTok)
	if sIdx < 0 {
		t.Fatal("CH12_SOLUTION_FILES missing in ch12.ts")
	}
	section := src[sIdx+len(startTok):]
	eIdx := strings.Index(section, "\n};")
	if eIdx < 0 {
		t.Fatal("CH12_SOLUTION_FILES end missing in ch12.ts")
	}
	section = section[:eIdx]

	files := make(map[string]string)
	for _, fname := range []string{
		"src/xmpp_sup.erl",
		"src/xmpp_stream_parser.erl",
		"src/xmpp_session_registry.erl",
		"src/xmpp_c2s_statem.erl",
		"src/xmpp_router.erl",
	} {
		keyTok := "'" + fname + "': `"
		kIdx := strings.Index(section, keyTok)
		if kIdx < 0 {
			t.Fatalf("missing %s in CH12_SOLUTION_FILES", fname)
		}
		rest := section[kIdx+len(keyTok):]
		var buf strings.Builder
		for i := 0; i < len(rest); i++ {
			if rest[i] == '\\' && i+1 < len(rest) {
				buf.WriteByte(rest[i+1])
				i++
				continue
			}
			if rest[i] == '`' {
				break
			}
			buf.WriteByte(rest[i])
		}
		files[fname] = buf.String()
	}
	return files
}

func TestXmppChatHTTPEndpoint(t *testing.T) {
	root := findProjectRoot()
	poolMgr, err := pool.NewManager(root)
	if err != nil {
		t.Fatalf("pool.NewManager: %v", err)
	}
	runner := bridge.NewRunner(poolMgr)
	wsHandler := gateway.NewHandler(poolMgr, runner)
	handler := buildRouter(poolMgr, runner, wsHandler)

	// 1. CORS Preflight OPTIONS -> 200 OK
	reqOpt := httptest.NewRequest(http.MethodOptions, "/api/v1/xmpp/chat", nil)
	recOpt := httptest.NewRecorder()
	handler.ServeHTTP(recOpt, reqOpt)
	if recOpt.Code != http.StatusOK || recOpt.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("expected CORS preflight 200 OK, got status=%d origin=%q", recOpt.Code, recOpt.Header().Get("Access-Control-Allow-Origin"))
	}

	// 2. Method Not Allowed GET -> 405
	reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/xmpp/chat", nil)
	recGet := httptest.NewRecorder()
	handler.ServeHTTP(recGet, reqGet)
	if recGet.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 on GET, got %d", recGet.Code)
	}

	// 3. Invalid JSON -> 400
	reqBad := httptest.NewRequest(http.MethodPost, "/api/v1/xmpp/chat", strings.NewReader("{bad json"))
	recBad := httptest.NewRecorder()
	handler.ServeHTTP(recBad, reqBad)
	if recBad.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 on bad JSON, got %d", recBad.Code)
	}

	// 4. Live POST /api/v1/xmpp/chat with CH12_SOLUTION_FILES from ch12.ts (send + chaos_kill)
	solFiles := loadCh12SolutionsFromRepo(t, root)
	for _, action := range []struct {
		name    string
		payload map[string]interface{}
	}{
		{
			name: "live_send_online",
			payload: map[string]interface{}{
				"session_id": "http-test-xmpp",
				"action":     "send",
				"message":    "HTTP Live Test Message",
				"bob_online": true,
				"files":      solFiles,
			},
		},
		{
			name: "live_chaos_kill",
			payload: map[string]interface{}{
				"session_id": "http-test-xmpp",
				"action":     "chaos_kill",
				"bob_online": true,
				"files":      solFiles,
			},
		},
	} {
		t.Run(action.name, func(t *testing.T) {
			bodyBytes, _ := json.Marshal(action.payload)
			req := httptest.NewRequest(http.MethodPost, "/api/v1/xmpp/chat", bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != http.StatusOK {
				t.Fatalf("expected 200 OK, got %d body=%s", rec.Code, rec.Body.String())
			}
			var parsed bridge.XmppChatResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &parsed); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if !parsed.OK || !parsed.Delivered {
				t.Fatalf("expected ok=true delivered=true, got %+v", parsed)
			}
		})
	}
}
