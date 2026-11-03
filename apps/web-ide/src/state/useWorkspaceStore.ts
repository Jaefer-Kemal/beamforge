'use client';

import { create } from 'zustand';
import { 
  BeamNode, 
  BeamEdge, 
  BeamPulse, 
  WorkspaceFile, 
  VerificationStage, 
  XmppC2SState, 
  XmppStanza,
  ExerciseManifest,
  AppTheme,
  RunResult,
  BeamFootprint,
} from '../types/workspace';
import { EXERCISES } from './exercisesData';
import { 
  CURRICULUM_WORLDS, 
  getLevelById, 
  getNextLevelId, 
  getLessonById, 
  getLessonByChapterAndNum,
  ALL_CURRICULUM_CHAPTERS,
} from '../data/curriculumCatalog';
import { wsMux, WSConnectionStatus, WSResponseFrame } from '../lib/ws-multiplexer';
import { ORCHESTRATOR_HTTP_URL } from '../lib/orchestratorConfig';
import { UserProfile, DEFAULT_USERS } from '../types/user';
import { triggerCelebrationConfetti } from '../lib/confetti';

export const ALL_EXERCISES: Record<string, ExerciseManifest> = { ...EXERCISES };
for (const world of CURRICULUM_WORLDS) {
  for (const level of world.levels) {
    ALL_EXERCISES[level.id] = {
      id: level.id,
      title: level.title,
      track: level.worldId,
      description: level.subtitle,
      lessonMarkdown: level.conceptMarkdown,
      files: level.files,
      initialNodes: level.initialNodes || (level.id === 'otp-04-ets-heir-resilience' ? EXERCISES['otp-04-ets-heir-resilience']?.initialNodes : []),
      initialEdges: level.initialEdges || (level.id === 'otp-04-ets-heir-resilience' ? EXERCISES['otp-04-ets-heir-resilience']?.initialEdges : []),
      initialXmppState: level.initialXmppState,
    };
  }
}

export interface TerminalEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'otp_report';
  text: string;
  timestamp: string;
}

interface WorkspaceState {
  // Navigation & View Mode
  activeView: 'curriculum_map' | 'workspace' | 'references' | 'inspector';
  setActiveView: (view: 'curriculum_map' | 'workspace' | 'references' | 'inspector') => void;

  // ── Phase 2: Boot.dev Glassmorphic UI State ──────────────────────────────

  /** Dual-theme: 'light' (Daylight Frosted Glass) or 'dark' (Midnight Glass) */
  theme: AppTheme;
  toggleTheme: () => void;

  /** Boot.dev top-bar view switcher: lesson workspace / syllabus */
  bootDevView: 'lesson' | 'syllabus';
  setBootDevView: (view: 'lesson' | 'syllabus') => void;

  /** Currently selected chapter number (1-12) */
  activeChapter: number;
  setActiveChapter: (ch: number) => void;

  /** Currently selected lesson number within activeChapter */
  activeLesson: number;
  setActiveLesson: (lesson: number) => void;

  /** Navigate to previous lesson */
  goToPrevLesson: () => void;

  /** Navigate to next lesson */
  goToNextLesson: () => void;

  /** Bottom lesson output drawer tab */
  lessonOutputTab: 'test_results' | 'console' | 'verification' | 'solution';
  setLessonOutputTab: (tab: 'test_results' | 'console' | 'verification' | 'solution') => void;

  /** Whether the lesson output drawer is open */
  isLessonOutputOpen: boolean;
  setLessonOutputOpen: (open: boolean) => void;

  /** Whether the solution pane is visible */
  isSolutionVisible: boolean;
  setSolutionVisible: (visible: boolean) => void;

  /** Run result — stdout + visible test case outcomes */
  runResult: RunResult | null;
  beamFootprint: BeamFootprint | null;
  setBeamFootprint: (footprint: BeamFootprint | null) => void;
  isRunning: boolean;
  runCode: (keepTab?: boolean) => Promise<void>;
  clearRunResult: () => void;

  // ─────────────────────────────────────────────────────────────────────────

  // Mastery & Progression State
  currentUser: UserProfile;
  switchUser: (userId: string) => Promise<void>;
  completedLevelIds: string[];
  totalXp: number;
  unlockedWorldIds: string[];
  devModeUnlockedAll: boolean;
  unlockedSolutionLessonIds: string[];
  toggleDevModeUnlockedAll: () => void;
  unlockSolutionForLesson: (lessonId: string) => void;
  loadSolutionForActiveExercise: () => void;
  advanceToNextLevel: () => void;
  onLevelCompleted: (levelId: string) => void;

  // Connection & Backend Mode
  wsStatus: WSConnectionStatus;
  setWsStatus: (status: WSConnectionStatus) => void;
  isBackendOnline: boolean;
  checkBackendHealth: () => Promise<boolean>;

  // Exercises
  activeExerciseId: string;
  exercises: typeof ALL_EXERCISES;
  switchExercise: (id: string) => void;

  // VFS & Editor
  files: WorkspaceFile[];
  activeFilePath: string;
  openTabPaths: string[];
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  resetWorkspace: () => void;

  // Workspace UI Layout
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Live BEAM Process Graph
  nodes: BeamNode[];
  edges: BeamEdge[];
  pulses: BeamPulse[];
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;

  // Terminal
  terminalEntries: TerminalEntry[];
  addTerminalEntry: (entry: Omit<TerminalEntry, 'id' | 'timestamp'>) => void;
  executeTerminalCommand: (cmd: string) => void;
  clearTerminal: () => void;

  // Chaos Grader Pipeline
  isVerifying: boolean;
  verificationStages: VerificationStage[];
  runVerificationSuite: () => Promise<void>;

  // XMPP Inspector
  xmppState: XmppC2SState;
  socketMode: '{active, once}' | '{active, true}';
  xmppStanzas: XmppStanza[];
  setSocketMode: (mode: '{active, once}' | '{active, true}') => void;
  sendFragmentedXmlPacket: () => void;

  // Interactive Chaos Actions
  killProcess: (pid: string) => void;
  sendTestMessage: (targetPid: string, payload: string) => void;
  injectMailboxFlood: (targetPid: string) => void;
}

const INITIAL_STAGES: VerificationStage[] = [
  {
    id: 'compile_and_typecheck',
    title: '1. In-Memory Compilation & Eqwalizer Typecheck',
    status: 'pending',
    assertionDetails: 'OTP 29 compiler: 0 errors • Eqwalizer: 0 type mismatches',
  },
  {
    id: 'functional_unit',
    title: '2. Functional Unit Tests (EUnit & PropEr)',
    status: 'pending',
    assertionDetails: 'session_cache_SUITE: put_and_lookup_test, concurrent_reads_test (500 runs)',
  },
  {
    id: 'under_the_hood_beam',
    title: '3. Under-the-Hood BEAM & Memory Invariants',
    status: 'pending',
    assertionDetails: 'Tail-call recursion O(1) stack check • No sub-binary heap leaks (< 16 B)',
  },
  {
    id: 'chaos_resilience',
    title: '4. Supervision Fault Injection & State Survival',
    status: 'pending',
    assertionDetails: 'exit(whereis(Worker), kill) -> Supervisor restart -> ETS Heir table preserved',
  },
];

const INITIAL_TERMINAL: TerminalEntry[] = [
  {
    id: 'init-1',
    type: 'output',
    text: 'Erlang/OTP 29 [erts-15.0] [source] [64-bit] [smp:4:4] [ds:4:4:10] [async-threads:1]',
    timestamp: '14:00:00',
  },
  {
    id: 'init-2',
    type: 'output',
    text: 'Eshell V15.0 (press Ctrl+G for job control, help(). for commands)',
    timestamp: '14:00:00',
  },
  {
    id: 'init-3',
    type: 'output',
    text: '1> session_sup:start_link().',
    timestamp: '14:00:01',
  },
  {
    id: 'init-4',
    type: 'output',
    text: '{ok,<0.140.0>}',
    timestamp: '14:00:01',
  },
];

const INITIAL_XMPP_STANZAS: XmppStanza[] = [
  {
    id: 'st-1',
    direction: 'in',
    timestamp: '14:02:10.120',
    rawXml: "<stream:stream from='alice@localhost' to='localhost' version='1.0' xml:lang='en' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>",
    description: 'Initial C2S Stream Opening Tag',
  },
  {
    id: 'st-2',
    direction: 'out',
    timestamp: '14:02:10.125',
    rawXml: "<stream:stream from='localhost' id='c2s-sess-42' version='1.0' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>",
    description: 'Server Stream Header Response',
  },
  {
    id: 'st-3',
    direction: 'out',
    timestamp: '14:02:10.128',
    rawXml: "<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>",
    description: 'Stream Features Advertisement',
  },
];

const syncUserToStorageAndDb = (user: UserProfile) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('bf_current_user_id', user.id);
    localStorage.setItem(`beamforge_user_${user.id}`, JSON.stringify(user));
    localStorage.setItem(
      'beamforge_progress',
      JSON.stringify({
        completedLevelIds: user.completedLevelIds,
        totalXp: user.totalXp,
        unlockedWorldIds: ['world-1-foundations'],
        devModeUnlockedAll: false,
        unlockedSolutionLessonIds: user.unlockedSolutionLessonIds,
      })
    );
    localStorage.setItem('bf_last_active_exercise', user.lastActiveExercise);

    fetch('/api/user-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    }).catch(() => {});
  } catch (err) {
    console.warn('[Sync] Progress save warning:', err);
  }
};

const loadInitialUser = (): UserProfile => {
  if (typeof window === 'undefined') {
    return DEFAULT_USERS['user_alpha'];
  }
  try {
    const currentUserId = localStorage.getItem('bf_current_user_id') || 'user_alpha';
    const cached = localStorage.getItem(`beamforge_user_${currentUserId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    // Backward compatibility with legacy beamforge_progress
    const legacyRaw = localStorage.getItem('beamforge_progress');
    if (legacyRaw && currentUserId === 'user_alpha') {
      const parsed = JSON.parse(legacyRaw);
      const user: UserProfile = {
        ...DEFAULT_USERS['user_alpha'],
        completedLevelIds: parsed.completedLevelIds || DEFAULT_USERS['user_alpha'].completedLevelIds,
        totalXp: parsed.totalXp ?? DEFAULT_USERS['user_alpha'].totalXp,
        unlockedSolutionLessonIds: parsed.unlockedSolutionLessonIds || [],
      };
      return user;
    }
    return DEFAULT_USERS[currentUserId] || DEFAULT_USERS['user_alpha'];
  } catch {
    return DEFAULT_USERS['user_alpha'];
  }
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  const initialUser = loadInitialUser();
  const lastActiveId = (typeof window !== 'undefined' ? localStorage.getItem('bf_last_active_exercise') : null) || initialUser.lastActiveExercise || 'ch01-l01';
  const defaultLesson = getLessonById(lastActiveId) || getLessonById('ch01-l01');
  const defaultEx = ALL_EXERCISES['erl-101-pattern-matching'] || ALL_EXERCISES['otp-04-ets-heir-resilience'];
  const initialFiles: WorkspaceFile[] = (defaultLesson && defaultLesson.files) ? defaultLesson.files : (defaultEx?.files || []);

  // Initialize WebSocket multiplexer listeners
  wsMux.onStatusChange((status) => {
    set({ wsStatus: status, isBackendOnline: status === 'connected' });
    if (status === 'connected') {
      if (typeof get === 'function' && get()?.addTerminalEntry) {
        get().addTerminalEntry({
          type: 'output',
          text: `[Gateway] Connected to live Go Orchestrator (${ORCHESTRATOR_HTTP_URL}) • Native Erlang/OTP 29`,
        });
      }
    } else {
      if (typeof get === 'function' && get()?.checkBackendHealth) {
        get().checkBackendHealth();
      }
    }
  });

  wsMux.onMessage((frame: WSResponseFrame) => {
    // Channel 1: PTY / Shell output
    if (frame.channel === 1 && frame.type === 'output') {
      if (frame.payload && frame.payload.text) {
        get().addTerminalEntry({
          type: 'output',
          text: frame.payload.text,
        });
      }
    }

    // Channel 4: Telemetry & Chaos Results
    if (frame.channel === 4) {
      if (frame.type === 'chaos_result' && frame.payload?.result) {
        const res = frame.payload.result;
        const oldPid = res.old_pid;
        const newPid = res.new_pid;

        // Update process node in graph
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === oldPid
              ? { ...n, id: newPid, status: 'running', reductions: 140, mailboxLen: 0 }
              : n
          ),
          edges: state.edges.map((e) => {
            if (e.target === oldPid) return { ...e, target: newPid };
            if (e.source === oldPid) return { ...e, source: newPid };
            return e;
          }),
        }));

        if (res.supervisor_report) {
          get().addTerminalEntry({
            type: 'otp_report',
            text: res.supervisor_report,
          });
        }
      } else if (frame.type === 'xmpp_transcript' && frame.payload?.transcript) {
        const rawEntries = frame.payload.transcript;
        const mappedStanzas: XmppStanza[] = rawEntries.map((t: any, idx: number) => ({
          id: `live-st-${idx}-${Date.now()}`,
          direction: t.direction === 'c2s' ? 'in' : 'out',
          timestamp: new Date().toISOString().substring(11, 23),
          rawXml: t.xml,
          description: `Stage: ${t.stage} (${t.latency_us} µs)`,
        }));
        set({ xmppStanzas: mappedStanzas, xmppState: 'session_established' });
        get().addTerminalEntry({
          type: 'output',
          text: `[XMPP Simulator] Received ${mappedStanzas.length} stanzas from live gen_statem session. Handshake verified.`,
        });
      }
    }

    // Channel 5: Grader Pipeline Reports
    if (frame.channel === 5 && frame.type === 'report' && frame.payload?.report) {
      const report = frame.payload.report;
      if (report.stages) {
        const mappedStages: VerificationStage[] = report.stages.map((st: any) => ({
          id: st.id,
          title: st.title,
          status: st.status === 'passed' ? 'passed' : 'failed',
          timeMs: st.time_ms,
          assertionDetails: st.details,
        }));
        set({ verificationStages: mappedStages, isVerifying: false });
      }
      if (report.visible_tests && report.visible_tests.length > 0) {
        set({
          runResult: {
            mode: 'run',
            exerciseId: get().activeExerciseId,
            compileOk: true,
            stdout: report.stdout || '',
            visibleTests: report.visible_tests.map((t: any) => ({
              callStr: t.call_str,
              expected: t.expected,
              actual: t.actual,
              passed: t.passed,
              timeMs: t.time_ms,
            })),
            totalDurationMs: report.total_time_ms || 0,
            diagnostics: [],
          },
        });
      }
      if (report.beam_footprint || report.beamFootprint) {
        set({ beamFootprint: report.beam_footprint || report.beamFootprint });
      }
      if (report.score === 100 || report.verdict === 'PASSED') {
        triggerCelebrationConfetti();
        get().onLevelCompleted(get().activeExerciseId);
      }
    }
  });

  return {
    // Navigation & View Mode
    activeView: 'workspace',
    setActiveView: (view) => set({ activeView: view }),

    // ── Phase 2: Boot.dev Glassmorphic UI ─────────────────────────────────
    theme: 'light' as AppTheme,
    toggleTheme: () => {
      const next: AppTheme = get().theme === 'light' ? 'dark' : 'light';
      set({ theme: next });
      if (typeof window !== 'undefined') {
        localStorage.setItem('bf_theme', next);
        document.documentElement.classList.toggle('theme-dark', next === 'dark');
      }
    },

    bootDevView: 'lesson',
    setBootDevView: (view) => set({ bootDevView: view }),

    activeChapter: defaultLesson ? defaultLesson.chapterNumber : 1,
    setActiveChapter: (ch) => {
      const target = getLessonByChapterAndNum(ch, 1);
      if (target) {
        set({ activeChapter: ch, activeLesson: 1 });
        get().switchExercise(target.id);
      } else {
        set({ activeChapter: ch, activeLesson: 1 });
      }
    },

    activeLesson: defaultLesson ? defaultLesson.lessonNumber : 1,
    setActiveLesson: (lesson) => {
      const ch = get().activeChapter;
      const target = getLessonByChapterAndNum(ch, lesson);
      if (target) {
        set({ activeLesson: lesson });
        get().switchExercise(target.id);
      } else {
        set({ activeLesson: lesson });
      }
    },

    goToPrevLesson: () => {
      const { activeLesson, activeChapter } = get();
      if (activeLesson > 1) {
        get().setActiveLesson(activeLesson - 1);
      } else if (activeChapter > 1) {
        const prevCh = activeChapter - 1;
        const prevChapterLessons = ALL_CURRICULUM_CHAPTERS[prevCh];
        const maxLesson = prevChapterLessons ? prevChapterLessons.length : 6;
        get().setActiveChapter(prevCh);
        get().setActiveLesson(maxLesson);
      }
    },

    goToNextLesson: () => {
      const { activeLesson, activeChapter } = get();
      const currChapterLessons = ALL_CURRICULUM_CHAPTERS[activeChapter];
      const maxLesson = currChapterLessons ? currChapterLessons.length : 6;
      if (activeLesson < maxLesson) {
        get().setActiveLesson(activeLesson + 1);
      } else if (activeChapter < 12) {
        get().setActiveChapter(activeChapter + 1);
        get().setActiveLesson(1);
      }
    },

    lessonOutputTab: 'test_results',
    setLessonOutputTab: (tab) => set({ lessonOutputTab: tab }),

    isLessonOutputOpen: false,
    setLessonOutputOpen: (open) => set({ isLessonOutputOpen: open }),

    isSolutionVisible: false,
    setSolutionVisible: (visible) => set({ isSolutionVisible: visible }),

    runResult: null,
    beamFootprint: null,
    setBeamFootprint: (footprint) => set({ beamFootprint: footprint }),
    isRunning: false,
    clearRunResult: () => set({ runResult: null }),
    runCode: async (keepTab?: boolean) => {
      set({ isRunning: true, isLessonOutputOpen: true, runResult: null });
      if (!keepTab) set({ lessonOutputTab: 'test_results' });
      get().addTerminalEntry({ type: 'output', text: '[BeamForge] Running visible test cases...' });

      const fileMap: Record<string, string> = {};
      get().files.forEach((f) => { fileMap[f.path] = f.content; });

      const activeId = get().activeExerciseId;
      const lesson = getLessonById(activeId);
      const visibleTestInputs = (lesson?.visibleTestCases || []).map((tc) => ({
        id: tc.id,
        call_str: tc.erlangCall || tc.callStr || '',
        expected: tc.expectedOutput || '',
        title: tc.title || '',
      }));

      try {
        const res = await fetch(`${ORCHESTRATOR_HTTP_URL}/api/v1/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: activeId,
            session_id: `bootdev-${activeId}`,
            files: fileMap,
            visible_tests: visibleTestInputs,
          }),
        });

        if (res.ok) {
          set({ isBackendOnline: true });
          const data = await res.json();
          const runResult: RunResult = {
            mode: 'run',
            exerciseId: data.exercise_id || get().activeExerciseId,
            compileOk: data.compile_ok ?? true,
            stdout: data.stdout || '',
            visibleTests: (data.visible_tests || []).map((t: any) => ({
              callStr: t.call_str,
              expected: t.expected,
              actual: t.actual,
              passed: t.passed,
              timeMs: t.time_ms,
            })),
            totalDurationMs: data.total_duration_ms || 0,
            diagnostics: (data.diagnostics || []).map((d: any) => ({
              file: d.file || '',
              line: Number(d.line) || 1,
              col: Number(d.col) || 1,
              severity: d.severity || 'error',
              message: d.message || '',
            })),
          };
          const footprint: BeamFootprint | null = data.beam_footprint || data.beamFootprint || null;
          set({ runResult, beamFootprint: footprint, isLessonOutputOpen: true });
          if (!keepTab) set({ lessonOutputTab: 'test_results' });
          if (!runResult.compileOk) {
            get().addTerminalEntry({
              type: 'error',
              text: `[erlc] Compilation Failed:\n${runResult.stdout || 'Check syntax errors.'}`,
            });
          } else {
            const passCount = runResult.visibleTests.filter((t) => t.passed).length;
            get().addTerminalEntry({
              type: 'output',
              text: `[Run] Complete: ${passCount}/${runResult.visibleTests.length} tests passed. stdout: ${runResult.stdout || '(none)'}`,
            });
          }
        } else {
          set({
            runResult: {
              mode: 'run',
              exerciseId: get().activeExerciseId,
              compileOk: false,
              stdout: `[Run Error] Backend responded with HTTP ${res.status}`,
              visibleTests: [],
              totalDurationMs: 0,
            },
            beamFootprint: null,
          });
          get().addTerminalEntry({ type: 'error', text: `[Run] Failed: HTTP ${res.status}` });
        }
      } catch {
        // Backend is offline — DO NOT fake-pass!
        set({
          isBackendOnline: false,
          runResult: {
            mode: 'run',
            exerciseId: get().activeExerciseId,
            compileOk: false,
            stdout: `[BeamForge Offline Error]\n\nGo Orchestrator backend (${ORCHESTRATOR_HTTP_URL}) is OFFLINE.\n\nCode execution was NOT performed because the BEAM/OTP runtime is not reachable.\nTo run and compile Erlang code, start the Go Orchestrator:\n  1. Open a terminal in services/orchestrator\n  2. Run: .\\orchestrator.exe (or go run ./cmd/server)`,
            visibleTests: [],
            totalDurationMs: 0,
            diagnostics: [
              {
                file: 'Go Orchestrator',
                line: 1,
                col: 1,
                severity: 'error',
                message: `Backend Offline: Cannot reach ${ORCHESTRATOR_HTTP_URL}`,
              },
            ],
          },
          beamFootprint: null,
          isLessonOutputOpen: true,
        });
        if (!keepTab) set({ lessonOutputTab: 'test_results' });
        get().addTerminalEntry({
          type: 'error',
          text: `[BeamForge] Error: Go Orchestrator is OFFLINE (${ORCHESTRATOR_HTTP_URL}). Start the backend to execute code.`,
        });
      } finally {
        set({ isRunning: false });
      }
    },
    // ─────────────────────────────────────────────────────────────────────

    // Mastery & Progression State
    currentUser: initialUser,
    switchUser: async (userId: string) => {
      let targetUser = DEFAULT_USERS[userId] || DEFAULT_USERS['user_alpha'];
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`beamforge_user_${userId}`);
        if (cached) {
          try {
            targetUser = JSON.parse(cached);
          } catch {}
        }
      }

      try {
        const res = await fetch(`/api/user-progress?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            targetUser = data.user;
          }
        }
      } catch {}

      syncUserToStorageAndDb(targetUser);

      set({
        currentUser: targetUser,
        completedLevelIds: targetUser.completedLevelIds,
        totalXp: targetUser.totalXp,
        unlockedSolutionLessonIds: targetUser.unlockedSolutionLessonIds,
      });

      if (targetUser.lastActiveExercise) {
        get().switchExercise(targetUser.lastActiveExercise);
      }

      get().addTerminalEntry({
        type: 'output',
        text: `[User Switched] Active profile: ${targetUser.name} (${targetUser.role}) • ${targetUser.totalXp} XP`,
      });
    },

    completedLevelIds: initialUser.completedLevelIds,
    totalXp: initialUser.totalXp,
    unlockedWorldIds: ['world-1-foundations'],
    devModeUnlockedAll: false,
    unlockedSolutionLessonIds: initialUser.unlockedSolutionLessonIds || [],

    unlockSolutionForLesson: (lessonId: string) => {
      set((state) => {
        if (state.unlockedSolutionLessonIds.includes(lessonId)) return state;
        const next = [...state.unlockedSolutionLessonIds, lessonId];
        const updatedUser: UserProfile = {
          ...state.currentUser,
          unlockedSolutionLessonIds: next,
        };
        syncUserToStorageAndDb(updatedUser);
        return {
          unlockedSolutionLessonIds: next,
          currentUser: updatedUser,
        };
      });
    },

    toggleDevModeUnlockedAll: () => {
      const next = !get().devModeUnlockedAll;
      const allWorlds = CURRICULUM_WORLDS.map((w) => w.id);
      const newUnlocked = next ? allWorlds : get().unlockedWorldIds;
      set({ devModeUnlockedAll: next, unlockedWorldIds: newUnlocked });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('beamforge_progress', JSON.stringify({
            completedLevelIds: get().completedLevelIds,
            totalXp: get().totalXp,
            unlockedWorldIds: newUnlocked,
            devModeUnlockedAll: next,
            unlockedSolutionLessonIds: get().unlockedSolutionLessonIds,
          }));
        } catch {}
      }
      get().addTerminalEntry({
        type: 'output',
        text: next 
          ? '[DEV MODE] Unlocked all 5 Worlds & 10 Levels for unrestricted testing!'
          : '[DEV MODE] Normal progressive curriculum restored.',
      });
    },

    loadSolutionForActiveExercise: () => {
      const { activeExerciseId } = get();
      const lesson = getLessonById(activeExerciseId);
      if (lesson) {
        let currentFiles = get().files;
        if (currentFiles.length === 0 && (lesson.starterCode || lesson.solutionCode)) {
          const modMatch = (lesson.starterCode || lesson.solutionCode || '').match(/-module\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\./);
          const modName = modMatch ? modMatch[1] : activeExerciseId.replace(/[^a-zA-Z0-9_]/g, '_');
          const fileName = `${modName}.erl`;
          currentFiles = [
            {
              path: `src/${fileName}`,
              name: fileName,
              content: lesson.starterCode || '',
            },
          ];
          set({
            files: currentFiles,
            activeFilePath: currentFiles[0].path,
            openTabPaths: [currentFiles[0].path],
          });
        }
        const solFiles = lesson.solutionFiles || (lesson.solutionCode ? { [currentFiles[0]?.path || 'src/solution.erl']: lesson.solutionCode } : {});
        set((state) => ({
          files: state.files.map((f) => {
            const solContent = solFiles[f.path]
              ?? solFiles[f.path.replace(/^src\//, '')]
              ?? solFiles['src/' + f.path]
              ?? (state.files.length === 1 && lesson.solutionCode ? lesson.solutionCode : undefined);
            if (solContent !== undefined) {
              return { ...f, content: solContent, isModified: true };
            }
            return f;
          }),
        }));
        get().addTerminalEntry({
          type: 'output',
          text: `[BeamForge] Loaded verified reference solution for Lesson ${lesson.id} (${lesson.title}).`,
        });
        if (wsMux.isConnected()) {
          const fileMap: Record<string, string> = {};
          get().files.forEach((f) => {
            fileMap[f.path] = solFiles[f.path] || f.content;
          });
          wsMux.syncFiles(fileMap);
        }
        return;
      }

      const level = getLevelById(activeExerciseId);
      if (level && level.solutionFiles) {
        set((state) => ({
          files: state.files.map((f) => {
            if (level.solutionFiles[f.path]) {
              return { ...f, content: level.solutionFiles[f.path], isModified: true };
            }
            return f;
          }),
        }));
        get().addTerminalEntry({
          type: 'output',
          text: `[BeamForge] Loaded verified reference solution for Level ${level.levelNumber} (${level.title}).`,
        });
        if (wsMux.isConnected()) {
          const fileMap: Record<string, string> = {};
          get().files.forEach((f) => {
            fileMap[f.path] = level.solutionFiles[f.path] || f.content;
          });
          wsMux.syncFiles(fileMap);
        }
      } else {
        get().addTerminalEntry({
          type: 'output',
          text: '[BeamForge] No solution available for this custom workspace.',
        });
      }
    },

    advanceToNextLevel: () => {
      const { activeExerciseId } = get();
      const nextId = getNextLevelId(activeExerciseId);
      if (nextId) {
        get().switchExercise(nextId);
        get().addTerminalEntry({
          type: 'output',
          text: `[BeamForge] Advancing to next level: ${nextId}`,
        });
      } else {
        get().addTerminalEntry({
          type: 'output',
          text: '[BeamForge] Congratulations! You have completed all 10 levels across all 5 Worlds!',
        });
      }
    },

    onLevelCompleted: (levelId: string) => {
      const { completedLevelIds, totalXp, unlockedWorldIds, devModeUnlockedAll, unlockedSolutionLessonIds, activeExerciseId } = get();
      const level = getLevelById(levelId);
      const isAlreadyCompleted = completedLevelIds.includes(levelId);
      const isSolutionUnlocked = (unlockedSolutionLessonIds || []).includes(levelId) || (unlockedSolutionLessonIds || []).includes(activeExerciseId);
      const xpReward = isSolutionUnlocked ? 0 : (level?.xpReward || 100);
      let finalCompleted = isAlreadyCompleted ? [...completedLevelIds] : [...completedLevelIds, levelId];
      const newXp = isAlreadyCompleted ? totalXp : totalXp + xpReward;

      // Fast-Track Assessment: If completing the final lesson of a chapter, auto-complete all earlier chapter lessons
      const lessonObj = getLessonById(levelId);
      if (lessonObj && lessonObj.chapterNumber) {
        const chLessons = ALL_CURRICULUM_CHAPTERS[lessonObj.chapterNumber] || [];
        const isChapterFinal = chLessons.length > 0 && lessonObj.lessonNumber === chLessons.length;
        if (isChapterFinal) {
          const priorMissing: string[] = [];
          for (const l of chLessons) {
            if (!finalCompleted.includes(l.id)) {
              finalCompleted.push(l.id);
              priorMissing.push(l.id);
            }
          }
          if (priorMissing.length > 0) {
            get().addTerminalEntry({
              type: 'output',
              text: `[Fast-Track] Chapter ${lessonObj.chapterNumber} Problem Set mastered! ${priorMissing.length} earlier lessons auto-completed.`,
            });
          }
        }
      }

      // Daily Streak Calculation
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const prevActivity = get().currentUser?.lastActivityDate;
      let newStreak = get().currentUser?.streakDays || 1;

      if (prevActivity === todayStr) {
        // Already active today, maintain streak
      } else if (prevActivity === yesterdayStr) {
        newStreak += 1;
        get().addTerminalEntry({
          type: 'output',
          text: `[Streak Active] Daily streak extended to ${newStreak} days!`,
        });
      } else if (prevActivity) {
        newStreak = 1;
      }

      let newUnlockedWorlds = [...unlockedWorldIds];
      if (level) {
        const currentWorld = CURRICULUM_WORLDS.find((w) => w.id === level.worldId);
        if (currentWorld) {
          const worldLevelIds = currentWorld.levels.map((l) => l.id);
          const allWorldLevelsDone = worldLevelIds.every((lid) => finalCompleted.includes(lid));
          if (allWorldLevelsDone) {
            const nextWorldIndex = CURRICULUM_WORLDS.findIndex((w) => w.id === level.worldId) + 1;
            if (nextWorldIndex < CURRICULUM_WORLDS.length) {
              const nextWorld = CURRICULUM_WORLDS[nextWorldIndex];
              if (!newUnlockedWorlds.includes(nextWorld.id)) {
                newUnlockedWorlds.push(nextWorld.id);
                get().addTerminalEntry({
                  type: 'output',
                  text: `[WORLD UNLOCKED] You unlocked World ${nextWorld.worldNumber}: ${nextWorld.title}!`,
                });
              }
            }
          }
        }
      }

      const updatedUser: UserProfile = {
        ...get().currentUser,
        completedLevelIds: finalCompleted,
        totalXp: newXp,
        level: Math.max(1, Math.floor(newXp / 300) + 1),
        lastActiveExercise: levelId,
        streakDays: newStreak,
        lastActivityDate: todayStr,
      };
      syncUserToStorageAndDb(updatedUser);

      set({
        completedLevelIds: finalCompleted,
        totalXp: newXp,
        unlockedWorldIds: newUnlockedWorlds,
        currentUser: updatedUser,
      });

      get().addTerminalEntry({
        type: 'output',
        text: isSolutionUnlocked
          ? `[Mastery] Level ${level?.levelNumber || levelId} passed! (+0 XP - Solution was viewed). Total XP: ${newXp}`
          : `[Mastery] Level ${level?.levelNumber || levelId} passed! (+${xpReward} XP). Total XP: ${newXp}`,
      });
    },

    wsStatus: wsMux.isConnected() ? 'connected' : 'disconnected',
    setWsStatus: (status) => set({ wsStatus: status, isBackendOnline: status === 'connected' }),
    isBackendOnline: false,
    checkBackendHealth: async () => {
      if (typeof window === 'undefined') return false;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${ORCHESTRATOR_HTTP_URL}/health`, { signal: controller.signal });
        clearTimeout(timer);
        const online = res.ok;
        if (get().isBackendOnline !== online) {
          set({ isBackendOnline: online });
        }
        return online;
      } catch {
        if (get().isBackendOnline) {
          set({ isBackendOnline: false });
        }
        return false;
      }
    },

    activeExerciseId: defaultLesson ? defaultLesson.id : defaultEx.id,
    exercises: ALL_EXERCISES,
    files: initialFiles,
    activeFilePath: initialFiles[0]?.path || '',
    openTabPaths: initialFiles.slice(0, 2).map((f) => f.path),

    switchExercise: (id: string) => {
      const lesson = getLessonById(id);
      if (lesson) {
        let lessonFiles: WorkspaceFile[] = lesson.files && lesson.files.length > 0 ? [...lesson.files] : [];
        if (lessonFiles.length === 0 && (lesson.starterCode || lesson.solutionCode)) {
          const modMatch = (lesson.starterCode || lesson.solutionCode || '').match(/-module\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\./);
          const modName = modMatch ? modMatch[1] : id.replace(/[^a-zA-Z0-9_]/g, '_');
          const fileName = `${modName}.erl`;
          lessonFiles = [
            {
              path: `src/${fileName}`,
              name: fileName,
              content: lesson.starterCode || '',
            },
          ];
        }
        set({
          activeExerciseId: id,
          activeChapter: lesson.chapterNumber,
          activeLesson: lesson.lessonNumber,
          files: lessonFiles,
          activeFilePath: lessonFiles[0]?.path || '',
          openTabPaths: lessonFiles.map((f) => f.path),
          isSolutionVisible: false,
          runResult: null,
          verificationStages: [],
          lessonOutputTab: 'test_results',
          isLessonOutputOpen: false,
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('bf_last_active_exercise', id);
          } catch (_) {}
        }
        if (get().currentUser) {
          const updatedUser: UserProfile = {
            ...get().currentUser,
            lastActiveExercise: id,
          };
          syncUserToStorageAndDb(updatedUser);
          set({ currentUser: updatedUser });
        }
        get().addTerminalEntry({
          type: 'output',
          text: `==> Switched workspace to Lesson [${lesson.id}] Ch ${lesson.chapterNumber}.${lesson.lessonNumber}: ${lesson.title}`,
        });
        return;
      }

      const curriculumLevel = getLevelById(id);
      if (curriculumLevel) {
        set({
          activeExerciseId: id,
          files: curriculumLevel.files,
          activeFilePath: curriculumLevel.files[0]?.path || '',
          openTabPaths: curriculumLevel.files.slice(0, 2).map((f) => f.path),
          nodes: curriculumLevel.initialNodes || (id === 'otp-04-ets-heir-resilience' ? ALL_EXERCISES['otp-04-ets-heir-resilience']?.initialNodes : []),
          edges: curriculumLevel.initialEdges || (id === 'otp-04-ets-heir-resilience' ? ALL_EXERCISES['otp-04-ets-heir-resilience']?.initialEdges : []),
          pulses: [],
          selectedNodeId: null,
          verificationStages: curriculumLevel.verificationStages.map((s) => ({
            id: s.id as any,
            title: s.title,
            status: 'pending',
            assertionDetails: s.description,
            hintOnFail: s.hintOnFail,
          })),
          xmppState: curriculumLevel.initialXmppState || 'wait_for_stream',
          lessonOutputTab: 'test_results',
          isLessonOutputOpen: false,
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('bf_last_active_exercise', id);
          } catch (_) {}
        }
        if (get().currentUser) {
          const updatedUser: UserProfile = {
            ...get().currentUser,
            lastActiveExercise: id,
          };
          syncUserToStorageAndDb(updatedUser);
          set({ currentUser: updatedUser });
        }
        get().addTerminalEntry({
          type: 'output',
          text: `==> Switched workspace to Level [${curriculumLevel.levelNumber}] ${curriculumLevel.title}`,
        });
        return;
      }

      const ex = ALL_EXERCISES[id];
      if (!ex) return;
      set({
        activeExerciseId: id,
        files: ex.files,
        activeFilePath: ex.files[0].path,
        openTabPaths: [ex.files[0].path, ex.files[1]?.path || ex.files[0].path],
        nodes: ex.initialNodes,
        edges: ex.initialEdges,
        pulses: [],
        selectedNodeId: null,
        verificationStages: INITIAL_STAGES.map((s) => ({ ...s, status: 'pending', timeMs: undefined })),
        xmppState: ex.initialXmppState || 'wait_for_stream',
        lessonOutputTab: 'test_results',
        isLessonOutputOpen: false,
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bf_last_active_exercise', id);
        } catch (_) {}
      }
      get().addTerminalEntry({
        type: 'output',
        text: `==> Switched workspace to exercise: [${ex.id}] ${ex.title}`,
      });
    },

    openFile: (path: string) => {
      const { openTabPaths } = get();
      if (!openTabPaths.includes(path)) {
        set({ openTabPaths: [...openTabPaths, path], activeFilePath: path });
      } else {
        set({ activeFilePath: path });
      }
    },

    closeTab: (path: string) => {
      const { openTabPaths, activeFilePath } = get();
      const nextTabs = openTabPaths.filter((p) => p !== path);
      let nextActive = activeFilePath;
      if (activeFilePath === path) {
        nextActive = nextTabs.length > 0 ? nextTabs[0] : '';
      }
      set({ openTabPaths: nextTabs, activeFilePath: nextActive });
    },

    updateFileContent: (path: string, content: string) => {
      set((state) => ({
        files: state.files.map((f) => (f.path === path ? { ...f, content, isModified: true } : f)),
      }));
      // Sync file change to Go orchestrator if connected
      if (wsMux.isConnected()) {
        const fileMap: Record<string, string> = {};
        get().files.forEach((f) => {
          fileMap[f.path] = f.path === path ? content : f.content;
        });
        wsMux.syncFiles(fileMap);
      }
    },

    resetWorkspace: () => {
      const { activeExerciseId } = get();
      get().switchExercise(activeExerciseId);
    },

    // UI Layout
    isCommandPaletteOpen: false,
    setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

    // Live Graph
    nodes: defaultEx.initialNodes,
    edges: defaultEx.initialEdges,
    pulses: [],
    selectedNodeId: '<0.142.0>',
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    updateNodePosition: (id, x, y) => {
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      }));
    },

    // Terminal
    terminalEntries: INITIAL_TERMINAL,
    addTerminalEntry: (entry) => {
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const newEntry: TerminalEntry = {
        ...entry,
        id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp,
      };
      set((state) => ({ terminalEntries: [...state.terminalEntries, newEntry] }));
    },

    executeTerminalCommand: (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      get().addTerminalEntry({ type: 'input', text: trimmed });

      // Route over WebSocket to live Erlang runtime if connected
      if (wsMux.isConnected()) {
        wsMux.sendTerminalCommand(trimmed);
        return;
      }

      // Offline simulation fallback
      const cleanCmd = trimmed.replace(/\.$/, '');
      if (cleanCmd === 'help') {
        get().addTerminalEntry({
          type: 'output',
          text: `Erlang Shell Helper:
  - session_cache:get_session(<<"user_42">>).
  - session_cache:put_session(<<"user_42">>, #{status => online}).
  - exit(whereis(session_cache), kill).
  - sys:get_state(session_cache).
  - observer_cli:start().
  - clear.`,
        });
      } else if (cleanCmd.includes('get_session')) {
        get().addTerminalEntry({
          type: 'output',
          text: '{ok, #{status => online, role => <<"admin">>, last_seen => 1716542100}}',
        });
      } else if (cleanCmd.includes('put_session')) {
        get().addTerminalEntry({ type: 'output', text: 'ok' });
      } else if (cleanCmd.includes('exit(') && cleanCmd.includes('kill')) {
        get().killProcess('<0.142.0>');
      } else if (cleanCmd.includes('get_state')) {
        const targetNode = get().nodes.find((n) => n.id === '<0.142.0>');
        get().addTerminalEntry({
          type: 'output',
          text: targetNode ? targetNode.stateTerm : '{error, process_not_found}',
        });
      } else if (cleanCmd === 'observer_cli:start') {
        get().addTerminalEntry({
          type: 'output',
          text: '| System: Erlang/OTP 29 | Schedulers: 4/4 | Procs: 142/32768 | Atom: 18241/262144 | Memory: 42.1MB |',
        });
      } else if (cleanCmd === 'clear') {
        set({ terminalEntries: [] });
      } else {
        get().addTerminalEntry({
          type: 'output',
          text: `ok (simulated evaluation of: ${trimmed})`,
        });
      }
    },

    clearTerminal: () => set({ terminalEntries: [] }),

    // Verification Pipeline
    isVerifying: false,
    verificationStages: [],
    runVerificationSuite: async () => {
      set({ isVerifying: true, lessonOutputTab: 'verification', isLessonOutputOpen: true });
      get().addTerminalEntry({
        type: 'output',
        text: '==> [bf_grader] Initializing verification pipeline...',
      });

      // Concurrently run visible tests in background so Test Suite & Diffs tab is updated live for this code revision
      get().runCode(true);

      // If connected to Go Orchestrator, trigger live OTP verification over WebSocket
      if (wsMux.isConnected()) {
        const fileMap: Record<string, string> = {};
        get().files.forEach((f) => {
          fileMap[f.path] = f.content;
        });
        wsMux.triggerLiveVerification(get().activeExerciseId, fileMap);
        return;
      }

      // If WebSocket is not connected, try HTTP REST verification endpoint
      try {
        const fileMap: Record<string, string> = {};
        get().files.forEach((f) => {
          fileMap[f.path] = f.content;
        });
        const res = await fetch(`${ORCHESTRATOR_HTTP_URL}/api/v1/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: get().activeExerciseId,
            session_id: `verify-${get().activeExerciseId}`,
            files: fileMap,
          }),
        });
        if (res.ok) {
          const report = await res.json();
          if (report.stages) {
            const mappedStages: VerificationStage[] = report.stages.map((st: any) => ({
              id: st.id,
              title: st.title,
              status: st.status === 'passed' ? 'passed' : 'failed',
              timeMs: st.time_ms,
              assertionDetails: st.details,
            }));
            set({ verificationStages: mappedStages, isVerifying: false });
          }
          if (report.beam_footprint || report.beamFootprint) {
            set({ beamFootprint: report.beam_footprint || report.beamFootprint });
          }
          if (report.visible_tests && report.visible_tests.length > 0) {
            set({
              runResult: {
                mode: 'run',
                exerciseId: get().activeExerciseId,
                compileOk: true,
                stdout: report.stdout || '',
                visibleTests: report.visible_tests.map((t: any) => ({
                  callStr: t.call_str,
                  expected: t.expected,
                  actual: t.actual,
                  passed: t.passed,
                  timeMs: t.time_ms,
                })),
                totalDurationMs: report.total_time_ms || 0,
                diagnostics: [],
              },
            });
          }
          if (report.score === 100 || report.verdict === 'PASSED') {
            triggerCelebrationConfetti();
            get().onLevelCompleted(get().activeExerciseId);
            get().addTerminalEntry({
              type: 'output',
              text: `==> [bf_grader] ALL VERIFICATION STAGES PASSED! (Score: 100/100, Signature: ${report.signature || 'ed25519:verified'})`,
            });
          } else {
            get().addTerminalEntry({
              type: 'error',
              text: `==> [bf_grader] Verification failed: score ${report.score}/100. Check failed stages.`,
            });
          }
          return;
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (e) {
        // Backend is offline — DO NOT fake-pass!
        set({
          isBackendOnline: false,
          isVerifying: false,
          verificationStages: [
            {
              id: 'compile_and_typecheck',
              title: '1. Backend Runtime Connection',
              status: 'failed',
              timeMs: 0,
              assertionDetails: `Cannot connect to Go Orchestrator at ${ORCHESTRATOR_HTTP_URL}. The BEAM/OTP 29 runtime is offline.`,
              hintOnFail: 'Start the Go Orchestrator with .\\orchestrator.exe or go run ./cmd/server in services/orchestrator to verify and grade code.',
            },
          ],
          beamFootprint: null,
        });
        get().addTerminalEntry({
          type: 'error',
          text: `==> [bf_grader] VERIFICATION ABORTED: Go Orchestrator is OFFLINE (${ORCHESTRATOR_HTTP_URL}). Start backend service to verify code.`,
        });
        return;
      }
    },

    // XMPP Inspector
    xmppState: 'wait_for_stream',
    socketMode: '{active, once}',
    xmppStanzas: INITIAL_XMPP_STANZAS,
    setSocketMode: (mode) => set({ socketMode: mode }),

    sendFragmentedXmlPacket: () => {
      if (wsMux.isConnected()) {
        wsMux.triggerLiveXmppHandshake();
        return;
      }

      // Offline Simulation Fallback
      const now = new Date().toISOString().substring(11, 23);
      const fragId = `frag-${Date.now()}`;
      
      const frag1: XmppStanza = {
        id: `${fragId}-1`,
        direction: 'in',
        timestamp: now,
        rawXml: "<stream:st",
        description: 'TCP Packet #1: Fragmented opening tag',
      };
      set((state) => ({
        xmppStanzas: [frag1, ...state.xmppStanzas],
        pulses: [
          ...state.pulses,
          {
            id: `p-${Date.now()}`,
            source: '<0.211.0>',
            target: '<0.212.0>',
            label: 'TCP: <stream:st (10 B)',
            kind: 'xmpp_stanza',
            progress: 0,
          },
        ],
      }));

      setTimeout(() => {
        const now2 = new Date().toISOString().substring(11, 23);
        const frag2: XmppStanza = {
          id: `${fragId}-2`,
          direction: 'in',
          timestamp: now2,
          rawXml: "ream to='localhost' xmlns='jabber:client'>",
          description: 'TCP Packet #2: Coalesced remainder',
        };
        const responseStanza: XmppStanza = {
          id: `${fragId}-3`,
          direction: 'out',
          timestamp: now2,
          rawXml: "<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>",
          description: 'C2S gen_statem buffer resolved stream and advertised SASL features',
        };

        set((state) => ({
          xmppState: 'wait_for_features',
          xmppStanzas: [responseStanza, frag2, ...state.xmppStanzas],
          pulses: [
            ...state.pulses,
            {
              id: `p-${Date.now()}-2`,
              source: '<0.212.0>',
              target: '<0.211.0>',
              label: '<stream:features> (SASL)',
              kind: 'xmpp_stanza',
              progress: 0,
            },
          ],
        }));

        get().addTerminalEntry({
          type: 'output',
          text: `[xmpp_c2s_statem] State transition: wait_for_stream -> wait_for_features. Socket {active, once} re-armed.`,
        });
      }, 400);
    },

    // Interactive Chaos Actions
    killProcess: (pid: string) => {
      if (wsMux.isConnected()) {
        wsMux.triggerLiveKillProcess(pid);
      }

      const node = get().nodes.find((n) => n.id === pid);
      if (!node) return;

      const crashPulse: BeamPulse = {
        id: `kill-${Date.now()}`,
        source: '<0.140.0>',
        target: pid,
        label: 'exit(Pid, kill)',
        kind: 'exit_signal',
        progress: 0,
      };

      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === pid ? { ...n, status: 'crashed' } : n)),
        pulses: [...state.pulses, crashPulse],
      }));

      get().addTerminalEntry({
        type: 'otp_report',
        text: `=SUPERVISOR REPORT====
    supervisor: {local,session_sup}
    errorContext: child_terminated
    reason: killed
    offender: [{pid,${pid}},{id,${node.name}},{mfargs,{${node.name},start_link,[]}},{restart_type,permanent}]`,
      });

      const etsNode = get().nodes.find((n) => n.kind === 'ets_table');
      const tableMgr = get().nodes.find((n) => n.name === 'table_manager');

      if (etsNode && tableMgr) {
        setTimeout(() => {
          set((state) => ({
            edges: state.edges.map((e) =>
              e.relation === 'ets_owner' ? { ...e, source: tableMgr.id } : e
            ),
            pulses: [
              ...state.pulses,
              {
                id: `heir-${Date.now()}`,
                source: pid,
                target: tableMgr.id,
                label: "'ETS-TRANSFER' (124 items)",
                kind: 'ets_transfer',
                progress: 0,
              },
            ],
          }));

          get().addTerminalEntry({
            type: 'output',
            text: `==> [table_manager] Received {'ETS-TRANSFER', session_tab, ${pid}, {reclaimed_from, ${pid}}}. Protecting cache entries.`,
          });
        }, 200);
      }

      setTimeout(() => {
        const newPid = `<0.${Math.floor(180 + Math.random() * 40)}.0>`;
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === pid
              ? {
                  ...n,
                  id: newPid,
                  status: 'running',
                  reductions: 120,
                  mailboxLen: 0,
                  stateTerm: `{state, session_tab, <0.141.0>}`,
                }
              : n
          ),
          edges: state.edges.map((e) => {
            if (e.target === pid) return { ...e, target: newPid };
            if (e.source === pid) return { ...e, source: newPid };
            if (e.relation === 'ets_owner') return { ...e, source: newPid };
            return e;
          }),
          pulses: [
            ...state.pulses,
            {
              id: `restart-${Date.now()}`,
              source: '<0.140.0>',
              target: newPid,
              label: `spawn: ${node.name}`,
              kind: 'cast',
              progress: 0,
            },
          ],
        }));

        get().addTerminalEntry({
          type: 'output',
          text: `==> [session_sup] Child ${node.name} restarted with new PID ${newPid}. ETS table #Ref<0.42.1> reclaimed via heir handover.`,
        });
      }, 700);
    },

    sendTestMessage: (targetPid: string, payload: string) => {
      const node = get().nodes.find((n) => n.id === targetPid);
      if (!node) return;

      const pulse: BeamPulse = {
        id: `msg-${Date.now()}`,
        source: '<0.140.0>',
        target: targetPid,
        label: payload,
        kind: 'call',
        progress: 0,
      };

      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === targetPid
            ? {
                ...n,
                reductions: n.reductions + 28,
                mailboxLen: Math.max(0, n.mailboxLen + 1),
                heapBytes: n.heapBytes + 64,
              }
            : n
        ),
        pulses: [...state.pulses, pulse],
      }));

      get().addTerminalEntry({
        type: 'output',
        text: `gen_server:call(${targetPid}, ${payload}) -> ok.`,
      });

      setTimeout(() => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === targetPid ? { ...n, mailboxLen: Math.max(0, n.mailboxLen - 1) } : n
          ),
          pulses: state.pulses.filter((p) => p.id !== pulse.id),
        }));
      }, 1500);
    },

    injectMailboxFlood: (targetPid: string) => {
      const node = get().nodes.find((n) => n.id === targetPid);
      if (!node) return;

      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === targetPid
            ? {
                ...n,
                status: 'warning',
                mailboxLen: 4200,
                heapBytes: n.heapBytes + 148000,
                reductions: n.reductions + 18500,
              }
            : n
        ),
        pulses: [
          ...state.pulses,
          {
            id: `flood-${Date.now()}`,
            source: '<0.211.0>',
            target: targetPid,
            label: 'FLOOD: 4,200 stanzas',
            kind: 'xmpp_stanza',
            progress: 0,
          },
        ],
      }));

      get().addTerminalEntry({
        type: 'error',
        text: `** [bf_tracer] ALERT: Mailbox flood backpressure detected on ${targetPid} (queue_len=4200)! Process at risk of OOM. Socket must use {active, once} flow control.`,
      });
    },
  };
});
