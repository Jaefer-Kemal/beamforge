package pool

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Session struct {
	ID           string
	WorkspaceDir string
	CreatedAt    time.Time
	Active       bool
	mu           sync.Mutex
}

func (s *Session) Lock()   { s.mu.Lock() }
func (s *Session) Unlock() { s.mu.Unlock() }

type Manager struct {
	mu          sync.RWMutex
	sessions    map[string]*Session
	warmPool    []*Session
	erlPath     string
	erlcPath    string
	otpRelease  string
	harnessDir  string
	maxPoolSize int
	workerSem   chan struct{}
}

func NewManager(projectRoot string) (*Manager, error) {
	erlPath, erlcPath := locateErlang()
	if erlPath == "" {
		return nil, fmt.Errorf("erl executable not found on host")
	}

	otpRelease := detectOTPRelease(erlPath)
	harnessEbin := os.Getenv("BF_HARNESS_DIR")
	if harnessEbin == "" {
		harnessEbin = filepath.Join(projectRoot, "runtimes", "erl-harness", "ebin")
	}

	// Verify that harnessEbin actually exists and contains compiled beam files
	if _, err := os.Stat(filepath.Join(harnessEbin, "bf_json.beam")); err != nil {
		cwd, _ := os.Getwd()
		altPaths := []string{
			filepath.Join(cwd, "runtimes", "erl-harness", "ebin"),
			filepath.Join(cwd, "..", "..", "runtimes", "erl-harness", "ebin"),
			filepath.Join(cwd, "..", "runtimes", "erl-harness", "ebin"),
		}
		for _, alt := range altPaths {
			if _, altErr := os.Stat(filepath.Join(alt, "bf_json.beam")); altErr == nil {
				harnessEbin = filepath.Clean(alt)
				break
			}
		}
	}
	log.Printf("[BeamForge Pool] Erlang harness ebin: %s", harnessEbin)

	maxWorkers := 2
	if envMax := os.Getenv("MAX_CONCURRENT_WORKERS"); envMax != "" {
		if val, err := strconv.Atoi(envMax); err == nil && val > 0 {
			maxWorkers = val
		}
	}

	m := &Manager{
		sessions:    make(map[string]*Session),
		warmPool:    make([]*Session, 0),
		erlPath:     erlPath,
		erlcPath:    erlcPath,
		otpRelease:  otpRelease,
		harnessDir:  harnessEbin,
		maxPoolSize: 4,
		workerSem:   make(chan struct{}, maxWorkers),
	}

	// Pre-warm initial sandbox sessions
	for i := 0; i < m.maxPoolSize; i++ {
		sess, err := m.createSession(fmt.Sprintf("warm-idle-%d", i+1))
		if err == nil {
			m.warmPool = append(m.warmPool, sess)
		}
	}

	log.Printf("[PoolManager] Initialized with OTP %s (erl: %s), maxWorkers: %d", otpRelease, erlPath, maxWorkers)
	return m, nil
}

func (m *Manager) ErlPath() string       { return m.erlPath }
func (m *Manager) ErlcPath() string      { return m.erlcPath }
func (m *Manager) OTPRelease() string    { return m.otpRelease }
func (m *Manager) HarnessDir() string    { return m.harnessDir }
func (m *Manager) WarmCount() int        { m.mu.RLock(); defer m.mu.RUnlock(); return len(m.warmPool) }
func (m *Manager) MaxWorkers() int       { return cap(m.workerSem) }
func (m *Manager) ActiveWorkers() int    { return len(m.workerSem) }

// AcquireWorker reserves a compilation/execution slot from the worker pool.
// If the pool is saturated, it queues the caller up to timeout duration.
func (m *Manager) AcquireWorker(ctx context.Context, timeout time.Duration) (func(), error) {
	timer := time.NewTimer(timeout)
	defer timer.Stop()

	select {
	case m.workerSem <- struct{}{}:
		var once sync.Once
		return func() {
			once.Do(func() {
				<-m.workerSem
			})
		}, nil
	case <-timer.C:
		return nil, fmt.Errorf("grader is currently busy with concurrent requests; queue timed out after %v, please retry in a moment", timeout)
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (m *Manager) ClaimSession(sessionID string) (*Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if sess, exists := m.sessions[sessionID]; exists {
		sess.Active = true
		return sess, nil
	}

	if len(m.warmPool) > 0 {
		sess := m.warmPool[0]
		m.warmPool = m.warmPool[1:]
		sess.ID = sessionID
		sess.Active = true
		m.sessions[sessionID] = sess
		return sess, nil
	}

	sess, err := m.createSession(sessionID)
	if err != nil {
		return nil, err
	}
	sess.Active = true
	m.sessions[sessionID] = sess
	return sess, nil
}

func (m *Manager) ReleaseSession(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if sess, exists := m.sessions[sessionID]; exists {
		sess.Active = false
		delete(m.sessions, sessionID)
		_ = os.RemoveAll(sess.WorkspaceDir)
	}
}

func (m *Manager) createSession(id string) (*Session, error) {
	tmpBase := filepath.Join(os.TempDir(), "beamforge_sandboxes")
	_ = os.MkdirAll(tmpBase, 0755)

	sessDir, err := os.MkdirTemp(tmpBase, "bf_sess_"+id+"_*")
	if err != nil {
		return nil, err
	}

	_ = os.MkdirAll(filepath.Join(sessDir, "src"), 0755)
	_ = os.MkdirAll(filepath.Join(sessDir, "include"), 0755)
	_ = os.MkdirAll(filepath.Join(sessDir, "ebin"), 0755)

	return &Session{
		ID:           id,
		WorkspaceDir: sessDir,
		CreatedAt:    time.Now(),
		Active:       false,
	}, nil
}

func locateErlang() (string, string) {
	candidates := []string{
		`D:\Program Files\Erlang OTP\bin\erl.exe`,
		`C:\Program Files\Erlang OTP\bin\erl.exe`,
	}
	var erl, erlc string
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			erl = c
			erlc = filepath.Join(filepath.Dir(c), "erlc.exe")
			return erl, erlc
		}
	}

	if p, err := exec.LookPath("erl"); err == nil {
		erl = p
	}
	if p, err := exec.LookPath("erlc"); err == nil {
		erlc = p
	}
	return erl, erlc
}

func detectOTPRelease(erlPath string) string {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, erlPath, "-noshell", "-eval", "io:format('~s', [erlang:system_info(otp_release)]), init:stop().")
	out, err := cmd.Output()
	if err != nil {
		return "29"
	}
	return strings.TrimSpace(string(out))
}
