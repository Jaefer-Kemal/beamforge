package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/beamforge/orchestrator/internal/bridge"
	"github.com/beamforge/orchestrator/internal/gateway"
	"github.com/beamforge/orchestrator/internal/pool"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Resolve monorepo root directory
	exePath, _ := os.Executable()
	projectRoot := filepath.Clean(filepath.Join(filepath.Dir(exePath), "..", "..", ".."))
	if _, err := os.Stat(filepath.Join(projectRoot, "runtimes")); err != nil {
		// Fallback to working directory parent
		cwd, _ := os.Getwd()
		projectRoot = filepath.Clean(filepath.Join(cwd, "..", ".."))
	}

	log.Printf("[BeamForge] Monorepo root detected: %s", projectRoot)

	// Initialize pool manager and runner
	poolMgr, err := pool.NewManager(projectRoot)
	if err != nil {
		log.Fatalf("[BeamForge] Failed to initialize pool manager: %v", err)
	}

	runner := bridge.NewRunner(poolMgr)
	wsHandler := gateway.NewHandler(poolMgr, runner)

	mux := http.NewServeMux()

	// 1. Healthcheck Endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		resp := map[string]interface{}{
			"status":      "ok",
			"otp_release": poolMgr.OTPRelease(),
			"mode":        "native_beam_bridge",
			"pool_warm":   poolMgr.WarmCount(),
			"erl_path":    poolMgr.ErlPath(),
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
		}
		_ = json.NewEncoder(w).Encode(resp)
	})

	// 2. 5-Channel Multiplexed WebSocket Gateway
	mux.HandleFunc("/ws", wsHandler.ServeWS)

	// 3. REST Verification Endpoint (Fallback)
	mux.HandleFunc("/api/v1/verify", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			ExerciseID string            `json:"exercise_id"`
			SessionID  string            `json:"session_id"`
			Files      map[string]string `json:"files"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if req.SessionID == "" {
			req.SessionID = "rest-session"
		}

		session, err := poolMgr.ClaimSession(req.SessionID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer poolMgr.ReleaseSession(req.SessionID)

		ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, req.ExerciseID, req.Files)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": err.Error(), "report": report})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(report)
	})

	// 4. REST Run Endpoint (Visible test cases & stdout)
	mux.HandleFunc("/api/v1/run", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			ExerciseID      string            `json:"exercise_id"`
			SessionID       string            `json:"session_id"`
			Files           map[string]string `json:"files"`
			CustomTestCalls []string          `json:"custom_test_calls"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if req.SessionID == "" {
			req.SessionID = "rest-run-session"
		}

		session, err := poolMgr.ClaimSession(req.SessionID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer poolMgr.ReleaseSession(req.SessionID)

		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		result, err := runner.RunCode(ctx, session, req.ExerciseID, req.Files, req.CustomTestCalls)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": err.Error(), "result": result})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	})

	// 4. REST Shell Eval Endpoint (Fallback)
	mux.HandleFunc("/api/v1/eval", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Command   string `json:"command"`
			SessionID string `json:"session_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if req.SessionID == "" {
			req.SessionID = "rest-eval"
		}
		session, err := poolMgr.ClaimSession(req.SessionID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer poolMgr.ReleaseSession(req.SessionID)

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		out, err := runner.EvalShell(ctx, session, req.Command)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"output": out,
			"error":  err,
		})
	})

	// CORS Wrapper
	handler := enableCORS(mux)

	serverAddr := ":" + port
	log.Printf("====================================================================")
	log.Printf("==> [BeamForge Orchestrator] Gateway running on http://localhost%s", serverAddr)
	log.Printf("    Mode        : Native BEAM Bridge (Erlang/OTP %s)", poolMgr.OTPRelease())
	log.Printf("    WebSocket   : ws://localhost%s/ws", serverAddr)
	log.Printf("    REST Health : http://localhost%s/health", serverAddr)
	log.Printf("====================================================================")

	if err := http.ListenAndServe(serverAddr, handler); err != nil {
		log.Fatalf("Server terminated: %v", err)
	}
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
