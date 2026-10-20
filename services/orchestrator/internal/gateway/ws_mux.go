package gateway

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/beamforge/orchestrator/internal/bridge"
	"github.com/beamforge/orchestrator/internal/pool"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow development connections from localhost:3000
	},
}

type Frame struct {
	Channel int             `json:"channel"` // 1: PTY, 2: VFS, 3: LSP, 4: Telemetry, 5: Grader
	Type    string          `json:"type"`
	ID      string          `json:"id,omitempty"`
	Payload json.RawMessage `json:"payload"`
}

type ResponseFrame struct {
	Channel int         `json:"channel"`
	Type    string      `json:"type"`
	ID      string      `json:"id,omitempty"`
	Payload interface{} `json:"payload"`
}

type Handler struct {
	poolMgr *pool.Manager
	runner  *bridge.Runner
}

func NewHandler(poolMgr *pool.Manager, runner *bridge.Runner) *Handler {
	return &Handler{
		poolMgr: poolMgr,
		runner:  runner,
	}
}

func (h *Handler) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS Gateway] Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		sessionID = "default-user"
	}

	session, err := h.poolMgr.ClaimSession(sessionID)
	if err != nil {
		log.Printf("[WS Gateway] Failed to claim session %s: %v", sessionID, err)
		return
	}
	defer h.poolMgr.ReleaseSession(sessionID)

	var writeMu sync.Mutex
	sendResponse := func(resp ResponseFrame) {
		writeMu.Lock()
		defer writeMu.Unlock()
		_ = conn.WriteJSON(resp)
	}

	// Send initial greeting with OTP release and session status
	sendResponse(ResponseFrame{
		Channel: 1,
		Type:    "connected",
		Payload: map[string]interface{}{
			"status":      "ok",
			"otp_release": h.poolMgr.OTPRelease(),
			"session_id":  session.ID,
			"banner":      "Connected to BeamForge Live OTP 29 Gateway (learner@127.0.0.1)",
		},
	})

	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)

		if messageType == websocket.BinaryMessage && len(data) > 0 {
			channel := int(data[0])
			payload := string(data[1:])
			h.handleBinaryChannel(ctx, channel, payload, session, sendResponse)
		} else {
			var frame Frame
			if err := json.Unmarshal(data, &frame); err == nil {
				h.handleJSONChannel(ctx, frame, session, sendResponse)
			}
		}

		cancel()
	}
}

func (h *Handler) handleBinaryChannel(
	ctx context.Context,
	channel int,
	payload string,
	session *pool.Session,
	send func(ResponseFrame),
) {
	switch channel {
	case 1: // Channel 0x01: PTY / Shell evaluation
		res, _ := h.runner.EvalShell(ctx, session, payload)
		send(ResponseFrame{Channel: 1, Type: "shell_output", Payload: res})
	}
}

func (h *Handler) handleJSONChannel(
	ctx context.Context,
	frame Frame,
	session *pool.Session,
	send func(ResponseFrame),
) {
	switch frame.Channel {
	case 1: // 0x01 PTY
		var req struct {
			Command string `json:"command"`
		}
		_ = json.Unmarshal(frame.Payload, &req)
		out, err := h.runner.EvalShell(ctx, session, req.Command)
		if err != nil && out == "" {
			out = err.Error()
		}
		send(ResponseFrame{
			Channel: 1,
			Type:    "output",
			ID:      frame.ID,
			Payload: map[string]string{"text": out},
		})

	case 2: // 0x02 VFS
		var req struct {
			Files map[string]string `json:"files"`
		}
		_ = json.Unmarshal(frame.Payload, &req)
		diags, err := h.runner.CompileFiles(ctx, session, req.Files)
		send(ResponseFrame{
			Channel: 3, // Emits to diagnostics channel
			Type:    "diagnostics",
			ID:      frame.ID,
			Payload: map[string]interface{}{
				"diagnostics": diags,
				"error":       err,
			},
		})

	case 4: // 0x04 Telemetry / Chaos Faults
		switch frame.Type {
		case "kill_process":
			var req struct {
				PID string `json:"pid"`
			}
			_ = json.Unmarshal(frame.Payload, &req)
			chaosRes, err := h.runner.RunChaosKill(ctx, session, req.PID)
			send(ResponseFrame{
				Channel: 4,
				Type:    "chaos_result",
				ID:      frame.ID,
				Payload: map[string]interface{}{
					"result": chaosRes,
					"error":  err,
				},
			})

		case "xmpp_handshake":
			transcript, err := h.runner.RunXmppHandshake(ctx, session)
			send(ResponseFrame{
				Channel: 4,
				Type:    "xmpp_transcript",
				ID:      frame.ID,
				Payload: map[string]interface{}{
					"transcript": transcript,
					"error":      err,
				},
			})
		}

	case 5: // 0x05 Grader
		if frame.Type == "run_code" {
			var req struct {
				ExerciseID      string            `json:"exercise_id"`
				Files           map[string]string `json:"files"`
				CustomTestCalls []string          `json:"custom_test_calls"`
			}
			_ = json.Unmarshal(frame.Payload, &req)

			send(ResponseFrame{
				Channel: 5,
				Type:    "run_progress",
				ID:      frame.ID,
				Payload: map[string]interface{}{"status": "running"},
			})

			res, err := h.runner.RunCode(ctx, session, req.ExerciseID, req.Files, req.CustomTestCalls)
			send(ResponseFrame{
				Channel: 5,
				Type:    "run_result",
				ID:      frame.ID,
				Payload: map[string]interface{}{
					"result": res,
					"error":  err,
				},
			})
			return
		}

		var req struct {
			ExerciseID string            `json:"exercise_id"`
			Files      map[string]string `json:"files"`
		}
		_ = json.Unmarshal(frame.Payload, &req)

		// Send "running" status for stage 1
		send(ResponseFrame{
			Channel: 5,
			Type:    "stage_progress",
			ID:      frame.ID,
			Payload: map[string]interface{}{"stage_index": 0, "status": "running"},
		})

		time.Sleep(100 * time.Millisecond)

		report, err := h.runner.RunVerification(ctx, session, req.ExerciseID, req.Files)
		send(ResponseFrame{
			Channel: 5,
			Type:    "report",
			ID:      frame.ID,
			Payload: map[string]interface{}{
				"report": report,
				"error":  err,
			},
		})
	}
}
