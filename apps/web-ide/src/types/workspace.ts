export type BeamNodeKind = 'supervisor' | 'gen_server' | 'gen_statem' | 'ets_table';
export type BeamNodeStatus = 'running' | 'warning' | 'crashed' | 'restarting';

export interface BeamNode {
  id: string; // e.g. "<0.142.0>" or "#Ref<0.1.2>"
  name: string; // e.g. "session_sup", "session_cache", "ets:session_tab"
  kind: BeamNodeKind;
  status: BeamNodeStatus;
  mailboxLen: number;
  heapBytes: number;
  reductions: number;
  stateTerm: string;
  x: number;
  y: number;
  details?: {
    restartIntensity?: string;
    tableType?: string;
    heirPid?: string;
    behaviour?: string;
    socketMode?: string;
  };
}

export type EdgeRelation = 'link' | 'monitor' | 'ets_owner' | 'ets_heir';

export interface BeamEdge {
  id: string;
  source: string;
  target: string;
  relation: EdgeRelation;
}

export type PulseKind = 'call' | 'cast' | 'exit_signal' | 'ets_transfer' | 'xmpp_stanza';

export interface BeamPulse {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: PulseKind;
  progress: number; // 0 to 1
}

export interface WorkspaceFile {
  path: string;
  name: string;
  content: string;
  isReadOnly?: boolean;
  isModified?: boolean;
  behaviour?: 'supervisor' | 'gen_server' | 'gen_statem' | 'header' | 'config';
}

export interface VerificationStage {
  id: 'compile_and_typecheck' | 'functional_unit' | 'under_the_hood_beam' | 'chaos_resilience';
  title: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  timeMs?: number;
  assertionDetails?: string;
  hintOnFail?: string;
}

export type XmppC2SState = 
  | 'wait_for_stream'
  | 'wait_for_features'
  | 'wait_for_sasl'
  | 'authenticated'
  | 'session_established';

export interface XmppStanza {
  id: string;
  direction: 'in' | 'out';
  timestamp: string;
  rawXml: string;
  description: string;
}

export interface ExerciseManifest {
  id: string;
  title: string;
  track: string;
  description: string;
  lessonMarkdown: string;
  files: WorkspaceFile[];
  initialNodes: BeamNode[];
  initialEdges: BeamEdge[];
  initialXmppState?: XmppC2SState;
}

// ============================================================
// Phase 2: Boot.dev Pedagogy & Glassmorphic UI Data Models
// ============================================================

/** Lesson type classifying the pedagogical mode of each lesson */
export type LessonType =
  | 'concept_exercise'  // Concept reading + coding exercise
  | 'guided_demo'       // Pre-built runnable demo with interactive annotation
  | 'problem_set'       // Pure problem set / assignment
  | 'capstone_studio';  // Multi-file capstone workspace (Ch. 12 only)

/** Official Erlang documentation function signature card displayed in the Left Pane */
export interface OtpDocSignatureCard {
  /** Function name e.g. "foldl" */
  functionName: string;
  /** Module name e.g. "lists" */
  module: string;
  /** Full OTP type signature e.g. "lists:foldl(Fun, Acc0, List1) -> Acc1" */
  signature: string;
  /** Array of formal type parameter lines shown in the card */
  typesSpec: string[];
  /** Brief prose description of what the function does */
  description: string;
  /** Time/space complexity note on the BEAM VM */
  complexityNote: string;
  /** Direct URL to https://www.erlang.org/doc/... */
  officialUrl: string;
  /** Optional direct link to https://github.com/erlang/otp/... source */
  githubSourceUrl?: string;
}

/** A visible test case shown in the 🧪 Test Cases drawer, executed on ▷ Run */
export interface VisibleTestCase {
  /** Unique identifier for this test case */
  id: string;
  /** Short label shown as the test case heading */
  title: string;
  /** Exact Erlang call expression string, e.g. "inventory:calculate_order_total(Inv, Orders)" */
  erlangCall: string;
  /** Expected return value as formatted Erlang term string */
  expectedOutput: string;
  /** Explanation of what this test case is verifying */
  explanation: string;
}

/** AST/Bytecode rule specification passed to bf_ast_verifier:verify_rules/3 on ▶ Submit */
export interface AstRuleSpec {
  /** Functions that must be implemented using tail recursion, e.g. ["process_order/2"] */
  requireTailRecursion?: string[];
  /** Remote function calls forbidden in learner code, e.g. ["lists:sum", "lists:map"] */
  forbiddenCalls?: string[];
  /** Syntax constructs forbidden, e.g. ["list_comprehension"] */
  forbiddenConstructs?: string[];
  /** Remote calls that must be present, e.g. ["lists:reverse/1"] */
  requiredCalls?: string[];
  /** Erlang syntax constructs that must be present, e.g. ["guards", "bit_syntax"] */
  requiredConstructs?: string[];
}

/** A single milestone in the Chapter 12 XMPP Capstone Studio */
export interface CapstoneMilestone {
  /** Unique milestone identifier */
  id: string;
  /** Sequential milestone number (1-5) */
  number: number;
  /** Milestone title displayed in the blueprint */
  title: string;
  /** Which source file this milestone targets */
  targetFile: string;
  /** Functions to implement for this milestone */
  targetFunctions: string[];
  /** Prose description of what to build */
  description: string;
  /** Hint shown in the Milestone Verifier panel */
  verificationHint: string;
}

/** Result of a single visible test case from POST /api/v1/run */
export interface RunTestCaseResult {
  callStr: string;
  expected: string;
  actual: string;
  passed: boolean;
  timeMs: number;
}

/** Full result payload from POST /api/v1/run */
export interface RunResult {
  mode: 'run';
  exerciseId: string;
  compileOk: boolean;
  stdout: string;
  visibleTests: RunTestCaseResult[];
  totalDurationMs: number;
  diagnostics?: Array<{ file: string; line: number; col: number; severity: string; message: string }>;
}

/** Application theme mode */
export type AppTheme = 'light' | 'dark';

/** Full lesson content matching the Boot.dev pedagogy and Glassmorphic specification */
export interface LessonContent {
  id: string; // e.g. "ch01-l01"
  chapterNumber: number;
  lessonNumber: number;
  lessonType: LessonType;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Production';
  conceptMarkdown: string;
  otpDocCards: OtpDocSignatureCard[];
  visibleTestCases: VisibleTestCase[];
  astRules?: AstRuleSpec;
  solutionExplanation: string;
  starterCode: string;
  solutionCode: string;
  files?: WorkspaceFile[];
  solutionFiles?: Record<string, string>;
  references?: Array<{
    title: string;
    url: string;
    category: 'erlang_docs' | 'github_otp' | 'github_ecosystem' | 'book_rfc';
    description: string;
  }>;
}
