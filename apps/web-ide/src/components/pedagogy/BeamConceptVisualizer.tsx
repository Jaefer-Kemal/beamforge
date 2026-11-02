'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Shield,
  Activity,
  Radio,
  FileCode,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Database,
  Server,
  Share2,
} from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import type { VisualSceneId } from '../../types/workspace';

interface BeamConceptVisualizerProps {
  scene: VisualSceneId;
  activeMilestone?: number; // 1..5 for Capstone XMPP scene
}

interface SceneStep {
  title: string;
  vmAction: string;
  bifOpcode: string;
}

interface SceneConfig {
  id: VisualSceneId;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  steps: SceneStep[];
}

const SCENE_CONFIGS: Record<VisualSceneId, SceneConfig> = {
  xmpp_5_module_capstone_arch: {
    id: 'xmpp_5_module_capstone_arch',
    title: 'XMPP Server 5-Module Architecture',
    subtitle: 'OTP Supervisor, ETS & Stanza Pipeline',
    icon: Server,
    accentColor: '#8B5CF6',
    steps: [
      {
        title: 'Step 1: Supervision Tree Boot (M1)',
        vmAction: 'xmpp_sup boots xmpp_session_registry (Child 1) followed by xmpp_router (Child 2) under rest_for_one.',
        bifOpcode: 'supervisor:start_link({local, ?MODULE}, ?MODULE, [])',
      },
      {
        title: 'Step 2: Stream Framing & C2S Handshake (M2 & M4)',
        vmAction: 'Raw TCP packets enter xmpp_stream_parser:feed_chunk/2, advancing xmpp_c2s_statem through SASL PLAIN auth.',
        bifOpcode: 'gen_statem:call(C2sPid, {feed_xml, Chunk})',
      },
      {
        title: 'Step 3: Resource Binding & ETS Registration (M3)',
        vmAction: 'C2S FSM binds user@domain/res, registers PID into public ETS table, and attaches unidirectional erlang:monitor/2.',
        bifOpcode: 'erlang:monitor(process, C2sPid) + ets:insert(tab, ...)',
      },
      {
        title: 'Step 4: Stanza Routing & Offline Fallback (M5)',
        vmAction: 'xmpp_router queries ETS for target JID. Direct PID dispatch if online, or spools into in-memory offline queue if disconnected.',
        bifOpcode: 'TargetPid ! {deliver_stanza, Xml} | maps:put(BareJid, [Xml|...])',
      },
    ],
  },
  tco_vs_body_stack: {
    id: 'tco_vs_body_stack',
    title: 'Tail Recursion (TCO) vs Body Recursion',
    subtitle: 'BEAM call_last Opcode vs Stack Exhaustion',
    icon: Cpu,
    accentColor: '#10B981',
    steps: [
      {
        title: 'Step 1: Initial Function Invocation',
        vmAction: 'BEAM allocates Stack Frame 1 for calculate_total([Item1, Item2, Item3]). Frame holds local args and return address.',
        bifOpcode: 'allocate 2, 1',
      },
      {
        title: 'Step 2: Unwinding vs Accumulating',
        vmAction: 'Body recursion allocates Frame 2 waiting for Price + calc(Rest). Tail recursion updates Accumulator (Acc=25) in-place.',
        bifOpcode: 'call_last vs call_ext (Tail call reuses Frame 1)',
      },
      {
        title: 'Step 3: Deep Stack vs Constant O(1) Memory',
        vmAction: 'Body recursion piles up Frames 3 & 4 (risking OOM on 1M items). Tail recursion keeps exactly 1 stack frame alive throughout.',
        bifOpcode: 'deallocate 0, 0 + return (Tail call: 0 frame growth)',
      },
      {
        title: 'Step 4: Final Return & Unwinding Cost',
        vmAction: 'Body recursion must pop 4 frames backwards and add deferred operations. Tail recursion returns final Acc directly with zero pops.',
        bifOpcode: 'return (Instant O(1) return to original caller)',
      },
    ],
  },
  sub_binary_procbin_refc: {
    id: 'sub_binary_procbin_refc',
    title: 'Sub-Binary Heap Leaks vs binary:copy/1',
    subtitle: 'Off-Heap Refc Binaries & Memory Unpinning',
    icon: Layers,
    accentColor: '#F59E0B',
    steps: [
      {
        title: 'Step 1: 64 KB Off-Heap ProcBin Arrives',
        vmAction: 'Large network payload (>64 bytes) allocated in off-heap binary allocator with refc = 1.',
        bifOpcode: 'erts_alloc: 64 KB off-heap buffer created',
      },
      {
        title: 'Step 2: Sub-Binary Slice Created',
        vmAction: 'Matching <<Username:16/binary, _/binary>> creates a 16-byte SubBinary pointing into the 64 KB buffer.',
        bifOpcode: 'sub_binary: {orig_ptr, offset=0, len=16}',
      },
      {
        title: 'Step 3: The Sub-Binary Leak Trap',
        vmAction: 'Retaining the 16-byte slice in session state pins the ENTIRE 64 KB off-heap buffer from GC (refc remains 1).',
        bifOpcode: 'refc = 1 (Entire 64 KB cannot be freed!)',
      },
      {
        title: 'Step 4: binary:copy/1 Unpinning',
        vmAction: 'binary:copy/1 clones the 16 bytes directly onto the process private heap. ProcBin refc drops to 0 and is immediately freed.',
        bifOpcode: 'binary:copy/1 -> ProcBin refc = 0 (Freed!)',
      },
    ],
  },
  mailbox_selective_receive: {
    id: 'mailbox_selective_receive',
    title: 'Selective Receive & The BEAM Save Queue',
    subtitle: 'O(N) Mailbox Scanning vs Message Order',
    icon: Radio,
    accentColor: '#3B82F6',
    steps: [
      {
        title: 'Step 1: Unprocessed Mailbox Queue',
        vmAction: 'Mailbox has 3 pending messages: [{log, 1}, {metric, 2}, {urgent, 99}]. Receive block seeks {urgent, Msg}.',
        bifOpcode: 'receive {urgent, Msg} -> ... end',
      },
      {
        title: 'Step 2: Non-matching Head -> Save Queue',
        vmAction: 'Head message {log, 1} does not match clause. BEAM moves {log, 1} out of mailbox into internal Save Queue.',
        bifOpcode: 'beam_op: save_queue <- {log, 1}',
      },
      {
        title: 'Step 3: Second Non-matching Head -> Save Queue',
        vmAction: '{metric, 2} also does not match. It is moved to Save Queue. Third message {urgent, 99} matches and executes!',
        bifOpcode: 'beam_op: save_queue <- {metric, 2} ; match {urgent, 99}',
      },
      {
        title: 'Step 4: Save Queue Spliced Back to Front',
        vmAction: 'After clause executes, BEAM splices Save Queue back to the front of Mailbox in original arrival order.',
        bifOpcode: 'beam_op: splice save_queue -> mailbox head',
      },
    ],
  },
  links_monitors_signals: {
    id: 'links_monitors_signals',
    title: 'Links, trap_exit & Process Monitors',
    subtitle: 'Bidirectional Crash Cascade vs Monitored Signals',
    icon: Shield,
    accentColor: '#EF4444',
    steps: [
      {
        title: 'Step 1: Unhandled Crash Cascade (link/1)',
        vmAction: 'Worker crashes with badarith. Bidirectional link propagates untrapped exit signal, killing Caller process.',
        bifOpcode: 'link/1: exit signal propagation',
      },
      {
        title: 'Step 2: Trapping Exits (process_flag)',
        vmAction: 'Caller sets process_flag(trap_exit, true). Exit signal is converted into a standard {\'EXIT\', Pid, Reason} mailbox message.',
        bifOpcode: 'process_flag(trap_exit, true)',
      },
      {
        title: 'Step 3: Unidirectional erlang:monitor/2',
        vmAction: 'Caller monitors Worker with erlang:monitor(process, WorkerPid). Worker crash delivers {\'DOWN\', Ref, process, ...} message.',
        bifOpcode: 'erlang:monitor(process, Pid) -> MonitorRef',
      },
      {
        title: 'Step 4: Untrappable Kill Signal (exit(Pid, kill))',
        vmAction: 'exit(Pid, kill) cannot be trapped under any circumstance. Process is unconditionally terminated by the BEAM scheduler.',
        bifOpcode: 'exit(Pid, kill) -> untrappable termination',
      },
    ],
  },
  supervision_rest_for_one_ets_heir: {
    id: 'supervision_rest_for_one_ets_heir',
    title: 'Supervision rest_for_one & ETS Heir Handover',
    subtitle: 'Zero-Downtime State Preservation Across Restarts',
    icon: Activity,
    accentColor: '#6366F1',
    steps: [
      {
        title: 'Step 1: Normal Operation (Worker 2 Owns ETS)',
        vmAction: 'Supervisor child order: [1. table_heir, 2. pricing_cache (owns ETS), 3. order_gateway]. Pricing cache holds active ETS table.',
        bifOpcode: 'ets:new(pricing_tab, [named_table, {heir, HeirPid, <<>>}])',
      },
      {
        title: 'Step 2: Pricing Cache Crashes -> Heir Transfer',
        vmAction: 'Pricing cache crashes. BEAM immediately transfers ETS table ownership to table_heir via {\'ETS-TRANSFER\', Tab, From, Data}.',
        bifOpcode: 'beam_vm: automatic heir ownership transfer',
      },
      {
        title: 'Step 3: rest_for_one Restarts Children 2 & 3',
        vmAction: 'rest_for_one leaves Child 1 (table_heir) alive! Only Worker 2 (pricing_cache) and Worker 3 (order_gateway) are restarted.',
        bifOpcode: 'supervisor: restart children defined after crashed child',
      },
      {
        title: 'Step 4: table_heir Gives Table Back to Worker 2',
        vmAction: 'New pricing_cache boots and sends handshake to table_heir. Heir executes ets:give_away/3 to return the populated ETS table.',
        bifOpcode: 'ets:give_away(Tab, NewPricingPid, HandshakeGift)',
      },
    ],
  },
  tcp_xmpp_stream_framing: {
    id: 'tcp_xmpp_stream_framing',
    title: 'TCP Stream Fragmentation & {active, once}',
    subtitle: 'Sliding Buffer Parsing & Flow Control',
    icon: Zap,
    accentColor: '#06B6D4',
    steps: [
      {
        title: 'Step 1: Partial Chunk 1 Arrives',
        vmAction: 'TCP packet carries partial XML: "<stream:str". Parser buffers chunk into State#buffer. No frame emitted.',
        bifOpcode: 'inet:setopts(Sock, [{active, once}])',
      },
      {
        title: 'Step 2: Chunk 2 Completes Stream Header',
        vmAction: 'Chunk 2 arrives: "eam to=\'localhost\'><message>Hi</mes". Stream header is extracted; remaining bytes stay in buffer.',
        bifOpcode: 'xmpp_stream_parser:feed_chunk(Chunk2, State)',
      },
      {
        title: 'Step 3: Chunk 3 Completes Stanzas',
        vmAction: 'Chunk 3 arrives: "sage><ping id=\'p1\'/>". Parser extracts complete <message> and <ping/> stanzas and updates buffer.',
        bifOpcode: 'lists:foldl with regex/binary delimiter match',
      },
      {
        title: 'Step 4: Flow Control & Re-arming {active, once}',
        vmAction: 'Worker finishes processing stanzas and re-arms socket via inet:setopts/2, preventing slow client mailbox flooding.',
        bifOpcode: 'inet:setopts(Socket, [{active, once}])',
      },
    ],
  },
};

export function BeamConceptVisualizer({ scene, activeMilestone = 1 }: BeamConceptVisualizerProps) {
  const isDark = useWorkspaceStore((s) => s.theme) === 'dark';
  const [currentStep, setCurrentStep] = useState(0); // 0..3
  const [isCollapsed, setIsCollapsed] = useState(false);

  const config = SCENE_CONFIGS[scene] || SCENE_CONFIGS.xmpp_5_module_capstone_arch;
  const step = config.steps[currentStep] || config.steps[0];
  const IconComponent = config.icon;

  const handlePrev = () => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleNext = () => {
    setCurrentStep((prev) => (prev < config.steps.length - 1 ? prev + 1 : prev));
  };

  const handleReset = () => {
    setCurrentStep(0);
  };

  return (
    <div
      className="rounded-2xl border transition-all duration-300 overflow-hidden mb-4 select-none"
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.70)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
        boxShadow: isDark
          ? '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
          : '0 10px 25px -10px rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* ── Top Header Strip ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: isDark ? 'rgba(11, 15, 23, 0.65)' : 'rgba(248, 250, 252, 0.90)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        }}
      >
        {/* Left: Icon + Title + Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{
              background: isDark ? `${config.accentColor}25` : `${config.accentColor}18`,
              border: `1.5px solid ${config.accentColor}50`,
              color: config.accentColor,
            }}
          >
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-xs sm:text-sm font-black tracking-tight truncate"
                style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
              >
                {config.title}
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:inline"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
                  color: isDark ? '#CBD5E1' : '#334155',
                }}
              >
                Interactive Scene
              </span>
            </div>
          </div>
        </div>

        {/* Right: Step Controls & Collapse */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Step Pill */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono mr-0.5 shadow-sm"
            style={{
              background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)',
              color: isDark ? '#F1F5F9' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)'}`,
            }}
          >
            <span>Step {currentStep + 1}/4</span>
          </div>

          {/* Stepper Buttons */}
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            title="Previous Step"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            style={{
              background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)',
              color: isDark ? '#F1F5F9' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)'}`,
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentStep === config.steps.length - 1}
            title="Next Step"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            style={{
              background: config.accentColor,
              color: '#FFFFFF',
              boxShadow: `0 2px 8px ${config.accentColor}50`,
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            title="Reset to Step 1"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer opacity-80 hover:opacity-100 active:scale-95"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
              color: isDark ? '#CBD5E1' : '#475569',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)'}`,
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Diagram' : 'Collapse Diagram'}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all ml-0.5 cursor-pointer opacity-80 hover:opacity-100 active:scale-95"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
              color: isDark ? '#CBD5E1' : '#475569',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)'}`,
            }}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Collapsible Body ───────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="flex flex-col">
          {/* Visual Scene Viewport */}
          <div
            className="p-4 flex items-center justify-center relative overflow-hidden"
            style={{
              minHeight: '210px',
              background: isDark ? 'rgba(2, 6, 23, 0.50)' : 'rgba(241, 245, 249, 0.50)',
            }}
          >
            {scene === 'xmpp_5_module_capstone_arch' && (
              <XmppArchScene
                stepIndex={currentStep}
                activeMilestone={activeMilestone}
                isDark={isDark}
              />
            )}
            {scene === 'tco_vs_body_stack' && (
              <TcoVsBodyScene stepIndex={currentStep} isDark={isDark} />
            )}
            {scene === 'sub_binary_procbin_refc' && (
              <SubBinaryProcBinScene stepIndex={currentStep} isDark={isDark} />
            )}
            {scene === 'mailbox_selective_receive' && (
              <MailboxSelectiveReceiveScene stepIndex={currentStep} isDark={isDark} />
            )}
            {scene === 'links_monitors_signals' && (
              <LinksMonitorsSignalsScene stepIndex={currentStep} isDark={isDark} />
            )}
            {scene === 'supervision_rest_for_one_ets_heir' && (
              <SupervisionEtsHeirScene stepIndex={currentStep} isDark={isDark} />
            )}
            {scene === 'tcp_xmpp_stream_framing' && (
              <TcpStreamFramingScene stepIndex={currentStep} isDark={isDark} />
            )}
          </div>

          {/* Step Explanation Footer */}
          <div
            className="px-4 py-3 border-t space-y-2"
            style={{
              background: isDark ? 'rgba(11, 15, 23, 0.75)' : 'rgba(248, 250, 252, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs sm:text-sm font-bold flex items-center gap-2"
                style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                  style={{ background: config.accentColor }}
                />
                {step.title}
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className="w-5 h-2 rounded-full transition-all cursor-pointer"
                    style={{
                      background:
                        idx === currentStep
                          ? config.accentColor
                          : isDark
                          ? 'rgba(255,255,255,0.20)'
                          : 'rgba(15,23,42,0.20)',
                    }}
                  />
                ))}
              </div>
            </div>

            <p
              className="text-xs sm:text-sm leading-relaxed font-normal"
              style={{ color: isDark ? '#CBD5E1' : '#1E293B' }}
            >
              {step.vmAction}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span
                className="text-[11px] sm:text-xs font-mono px-2.5 py-1 rounded-lg font-bold truncate flex items-center gap-1.5 shadow-xs"
                style={{
                  background: isDark ? 'rgba(139,92,246,0.22)' : 'rgba(124,58,237,0.12)',
                  color: isDark ? '#DDD6FE' : '#4C1D95',
                  border: isDark ? '1px solid rgba(139,92,246,0.35)' : '1.5px solid rgba(124,58,237,0.28)',
                }}
              >
                <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300 fill-purple-600 dark:fill-purple-300 shrink-0" />
                <span>{step.bifOpcode}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCENE 1: 'xmpp_5_module_capstone_arch' (Chapter 12 Capstone & Overview)
// ============================================================================
function XmppArchScene({
  stepIndex,
  activeMilestone = 1,
  isDark,
}: {
  stepIndex: number;
  activeMilestone?: number;
  isDark: boolean;
}) {
  const isM1Active = activeMilestone === 1 || stepIndex === 0;
  const isM2Active = activeMilestone === 2 || stepIndex === 1;
  const isM3Active = activeMilestone === 3 || stepIndex === 0 || stepIndex === 2;
  const isM4Active = activeMilestone === 4 || stepIndex === 1 || stepIndex === 2;
  const isM5Active = activeMilestone === 5 || stepIndex === 0 || stepIndex === 3;

  return (
    <div className="w-full flex flex-col items-center justify-center gap-2.5 py-1">
      {/* Top Node: Supervisor (M1) */}
      <div
        className={`px-4 py-2 rounded-xl border text-center transition-all duration-300 ${
          isM1Active
            ? 'ring-2 ring-purple-500 shadow-[0_0_14px_rgba(168,85,247,0.50)] scale-105'
            : 'opacity-90'
        }`}
        style={{
          background: isDark ? 'rgba(88, 28, 135, 0.45)' : 'rgba(237, 233, 254, 0.95)',
          borderColor: isDark ? '#A855F7' : '#7C3AED',
        }}
      >
        <div className="text-xs sm:text-sm font-mono font-bold" style={{ color: isDark ? '#F3E8FF' : '#4C1D95' }}>
          M1: xmpp_sup
        </div>
        <div className="text-[11px] font-semibold mt-0.5" style={{ color: isDark ? '#D8B4FE' : '#581C87' }}>
          rest_for_one · intensity: 5/10s
        </div>
      </div>

      {/* Downward Connector to Core Layer */}
      <div className="flex items-center justify-center w-full max-w-[280px]">
        <div
          className="h-3.5 w-1 rounded-full transition-all"
          style={{ background: isM1Active ? '#A855F7' : isDark ? '#475569' : '#94A3B8' }}
        />
      </div>

      {/* Middle Row: M3 (Registry) <-> M5 (Router) */}
      <div className="flex items-center justify-between w-full max-w-[390px] gap-3">
        {/* M3: Registry */}
        <div
          className={`flex-1 p-2.5 rounded-xl border transition-all duration-300 ${
            isM3Active
              ? 'ring-2 ring-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.45)] scale-102'
              : 'opacity-85'
          }`}
          style={{
            background: isDark ? 'rgba(120, 53, 15, 0.40)' : 'rgba(254, 243, 199, 0.95)',
            borderColor: isDark ? '#F59E0B' : '#D97706',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] sm:text-xs font-mono font-bold" style={{ color: isDark ? '#FDE68A' : '#78350F' }}>
              M3: session_registry
            </span>
          </div>
          <div className="text-[11px] font-semibold" style={{ color: isDark ? '#FCD34D' : '#92400E' }}>
            ETS · monitor/2 cleanup
          </div>
        </div>

        {/* Bi-directional Link Badge */}
        <div className="flex flex-col items-center">
          <Share2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">ETS query</span>
        </div>

        {/* M5: Router */}
        <div
          className={`flex-1 p-2.5 rounded-xl border transition-all duration-300 ${
            isM5Active
              ? 'ring-2 ring-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.45)] scale-102'
              : 'opacity-85'
          }`}
          style={{
            background: isDark ? 'rgba(6, 78, 59, 0.40)' : 'rgba(209, 250, 229, 0.95)',
            borderColor: isDark ? '#10B981' : '#059669',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] sm:text-xs font-mono font-bold" style={{ color: isDark ? '#A7F3D0' : '#064E3B' }}>
              M5: xmpp_router
            </span>
          </div>
          <div className="text-[11px] font-semibold" style={{ color: isDark ? '#6EE7B7' : '#047857' }}>
            PID ! Xml · Offline Queue
          </div>
        </div>
      </div>

      {/* Downward Connector to Protocol Pipeline */}
      <div className="flex items-center justify-center w-full max-w-[280px]">
        <div
          className="h-3 w-1 rounded-full"
          style={{ background: isDark ? '#475569' : '#94A3B8' }}
        />
      </div>

      {/* Bottom Pipeline: TCP -> M2 (Framer) -> M4 (C2S FSM) */}
      <div className="flex items-center justify-center w-full max-w-[420px] gap-2">
        <div
          className="px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold text-center shadow-xs"
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.70)' : 'rgba(241, 245, 249, 0.95)',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.15)',
            color: isDark ? '#E2E8F0' : '#1E293B',
          }}
        >
          TCP Socket
        </div>

        <ArrowRight className="w-4 h-4 text-slate-700 dark:text-slate-300" />

        <div
          className={`px-3 py-1.5 rounded-xl border text-center transition-all ${
            isM2Active
              ? 'ring-2 ring-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.45)] scale-102'
              : 'opacity-85'
          }`}
          style={{
            background: isDark ? 'rgba(30, 58, 138, 0.40)' : 'rgba(219, 234, 254, 0.95)',
            borderColor: isDark ? '#3B82F6' : '#2563EB',
          }}
        >
          <div className="text-[11px] sm:text-xs font-mono font-bold" style={{ color: isDark ? '#BFDBFE' : '#1E3A8A' }}>
            M2: stream_parser
          </div>
          <div className="text-[10px] font-semibold mt-0.5" style={{ color: isDark ? '#93C5FD' : '#1D4ED8' }}>
            binary:copy/1 unpin
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-700 dark:text-slate-300" />

        <div
          className={`px-3 py-1.5 rounded-xl border text-center transition-all ${
            isM4Active
              ? 'ring-2 ring-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.45)] scale-102'
              : 'opacity-85'
          }`}
          style={{
            background: isDark ? 'rgba(49, 46, 129, 0.40)' : 'rgba(224, 231, 255, 0.95)',
            borderColor: isDark ? '#6366F1' : '#4F46E5',
          }}
        >
          <div className="text-[11px] sm:text-xs font-mono font-bold" style={{ color: isDark ? '#C7D2FE' : '#312E81' }}>
            M4: c2s_statem
          </div>
          <div className="text-[10px] font-semibold mt-0.5" style={{ color: isDark ? '#A5B4FC' : '#4338CA' }}>
            4-State FSM · SASL
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCENE 2: 'tco_vs_body_stack' (Chapter 2 Tail Recursion & inventory.erl)
// ============================================================================
function TcoVsBodyScene({ stepIndex, isDark }: { stepIndex: number; isDark: boolean }) {
  const bodyFrames = stepIndex === 0 ? 1 : stepIndex === 1 ? 2 : stepIndex === 2 ? 4 : 2;
  const tcoAcc = stepIndex === 0 ? 0 : stepIndex === 1 ? 25 : stepIndex === 2 ? 100 : 175;

  return (
    <div className="w-full flex items-center justify-around gap-4 px-2 py-1 max-w-[460px]">
      {/* Left: Body Recursion (Stack accumulator) */}
      <div
        className="flex-1 p-3 rounded-xl border flex flex-col items-center"
        style={{
          background: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(254, 242, 242, 0.95)',
          borderColor: isDark ? 'rgba(239, 68, 68, 0.45)' : '#F87171',
        }}
      >
        <div className="text-xs font-bold mb-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Body Recursion (O(N) RAM)
        </div>
        <div className="w-full space-y-1.5 flex flex-col items-center">
          {Array.from({ length: bodyFrames }).map((_, idx) => (
            <div
              key={idx}
              className="w-full py-1.5 px-2 rounded-lg text-[11px] font-mono text-center font-bold transition-all duration-300"
              style={{
                background: isDark ? 'rgba(239,68,68,0.28)' : 'rgba(239,68,68,0.18)',
                color: isDark ? '#FCA5A5' : '#991B1B',
                border: '1.5px dashed rgba(239,68,68,0.40)',
              }}
            >
              Frame {idx + 1}: Price + calc(...)
            </div>
          ))}
          {bodyFrames >= 4 && (
            <div className="text-[11px] font-mono text-red-600 dark:text-red-400 font-bold animate-pulse mt-1">
              Stack Depth: 4 Pending Ops
            </div>
          )}
        </div>
      </div>

      {/* Center Divider */}
      <div className="h-32 w-0.5 rounded-full" style={{ background: isDark ? '#475569' : '#CBD5E1' }} />

      {/* Right: Tail Recursion (TCO in-place) */}
      <div
        className="flex-1 p-3 rounded-xl border flex flex-col items-center"
        style={{
          background: isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(236, 253, 245, 0.95)',
          borderColor: isDark ? 'rgba(16, 185, 129, 0.45)' : '#4ADE80',
        }}
      >
        <div className="text-xs font-bold mb-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Tail Recursion (O(1) RAM)
        </div>
        <div className="w-full flex flex-col items-center gap-2">
          <div
            className="w-full py-2.5 px-2 rounded-lg text-xs font-mono text-center font-bold transition-all duration-300 ring-2 ring-emerald-500 shadow-sm"
            style={{
              background: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.18)',
              color: isDark ? '#6EE7B7' : '#065F46',
            }}
          >
            Frame 1 (Reused in-place)
            <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-bold mt-1">
              Acc = {tcoAcc} · call_last
            </div>
          </div>
          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold text-center mt-0.5">
            Zero Stack Growth · Constant Memory
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCENE 3: 'sub_binary_procbin_refc' (Chapter 4 Bit Syntax & Sub-Binary Leaks)
// ============================================================================
function SubBinaryProcBinScene({ stepIndex, isDark }: { stepIndex: number; isDark: boolean }) {
  const isCopied = stepIndex === 3;
  const refCount = isCopied ? 0 : 1;

  return (
    <div className="w-full flex flex-col items-center gap-2.5 max-w-[420px] py-1">
      {/* 64 KB Off-heap ProcBin */}
      <div
        className={`w-full p-2.5 rounded-xl border transition-all duration-300 ${
          isCopied ? 'opacity-40 line-through' : 'opacity-100 shadow-md'
        }`}
        style={{
          background: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(254, 243, 199, 0.95)',
          borderColor: isDark ? '#F59E0B' : '#D97706',
        }}
      >
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span style={{ color: isDark ? '#FDE68A' : '#78350F' }}>
            64 KB Off-Heap ProcBin Buffer
          </span>
          <span
            className="px-2 py-0.5 rounded text-[11px] font-bold"
            style={{
              background: refCount > 0 ? 'rgba(239,68,68,0.22)' : 'rgba(16,185,129,0.22)',
              color: refCount > 0 ? '#DC2626' : '#059669',
            }}
          >
            refc = {refCount} {isCopied && '(GC Freed!)'}
          </span>
        </div>
      </div>

      {/* Pointer connection arrow */}
      <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold">
        {!isCopied ? (
          <>
            <span className="text-amber-700 dark:text-amber-300">SubBinary slice pointer (16 bytes)</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </>
        ) : (
          <>
            <span className="text-emerald-700 dark:text-emerald-300">binary:copy/1 local heap allocation</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </>
        )}
      </div>

      {/* Resulting 16-byte Slice */}
      <div
        className="w-full max-w-[300px] p-2.5 rounded-xl border text-center transition-all duration-300 shadow-sm"
        style={{
          background: isCopied
            ? isDark
              ? 'rgba(16, 185, 129, 0.28)'
              : 'rgba(209, 250, 229, 0.95)'
            : isDark
            ? 'rgba(239, 68, 68, 0.22)'
            : 'rgba(254, 226, 226, 0.95)',
          borderColor: isCopied ? '#10B981' : '#EF4444',
        }}
      >
        <div className="text-xs font-mono font-bold" style={{ color: isCopied ? (isDark ? '#34D399' : '#065F46') : (isDark ? '#F87171' : '#991B1B') }}>
          {isCopied ? '<<"alex">> on Process Heap' : 'SubBinary Pointer in Session State'}
        </div>
        <div className="text-[11px] font-semibold mt-1" style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
          {isCopied
            ? '16 bytes on process heap · 64 KB ProcBin unpinned'
            : 'Pins 64 KB ProcBin in RAM indefinitely!'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCENE 4: 'mailbox_selective_receive' (Chapter 5 Concurrency & Save Queue)
// ============================================================================
function MailboxSelectiveReceiveScene({ stepIndex, isDark }: { stepIndex: number; isDark: boolean }) {
  const saveQueue = stepIndex === 1 ? ['{log, 1}'] : stepIndex === 2 ? ['{log, 1}', '{metric, 2}'] : [];
  const currentScan = stepIndex === 0 ? '{log, 1}' : stepIndex === 1 ? '{metric, 2}' : stepIndex === 2 ? '{urgent, 99}' : null;

  return (
    <div className="w-full flex flex-col items-center gap-2.5 max-w-[440px] py-1">
      {/* Mailbox Row */}
      <div className="w-full">
        <div className="text-xs font-mono font-bold mb-1.5 flex items-center justify-between" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
          <span>Process Mailbox (Scan: {currentScan || 'Idle'})</span>
          <span className="text-blue-600 dark:text-blue-400 font-bold">FIFO Order</span>
        </div>
        <div
          className="flex items-center gap-2 p-2.5 rounded-xl border shadow-xs"
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.40)' : 'rgba(255, 255, 255, 0.90)',
            borderColor: isDark ? '#475569' : '#CBD5E1',
          }}
        >
          {stepIndex < 3 ? (
            <>
              {stepIndex === 0 && (
                <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold">
                  {'{log, 1}'}
                </div>
              )}
              {stepIndex <= 1 && (
                <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold">
                  {'{metric, 2}'}
                </div>
              )}
              {stepIndex <= 2 && (
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 text-[11px] font-mono font-bold animate-pulse ring-1 ring-emerald-500">
                  {'{urgent, 99}'} (Target)
                </div>
              )}
            </>
          ) : (
            <div className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-mono font-bold">
              [ {'{log, 1}'}, {'{metric, 2}'} ] (Spliced back to front!)
            </div>
          )}
        </div>
      </div>

      {/* Save Queue Buffer */}
      <div className="w-full">
        <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Internal Save Queue (Unmatched Buffer)
        </div>
        <div
          className="flex items-center gap-2 p-2.5 rounded-xl border min-h-[40px] shadow-xs"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(254, 243, 199, 0.85)',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.40)' : '#F59E0B',
          }}
        >
          {saveQueue.length > 0 ? (
            saveQueue.map((item, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold shadow-xs"
                style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.30)' : 'rgba(245, 158, 11, 0.20)',
                  color: isDark ? '#FDE68A' : '#78350F',
                  border: '1px solid rgba(245, 158, 11, 0.40)',
                }}
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 italic">
              {stepIndex === 3 ? 'Emptied: Spliced back to front of Mailbox' : 'Empty'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCENE 5: 'links_monitors_signals' (Chapter 6 Links, Monitors & trap_exit)
// ============================================================================
function LinksMonitorsSignalsScene({ stepIndex, isDark }: { stepIndex: number; isDark: boolean }) {
  const isCallerAlive = stepIndex > 0;

  return (
    <div className="w-full flex items-center justify-around gap-2 max-w-[440px] py-1">
      {/* Caller Process */}
      <div
        className={`flex-1 p-3 rounded-xl border text-center transition-all duration-300 ${
          isCallerAlive ? 'border-emerald-500 shadow-sm' : 'border-red-500 opacity-70'
        }`}
        style={{
          background: isCallerAlive
            ? isDark
              ? 'rgba(16, 185, 129, 0.16)'
              : 'rgba(236, 253, 245, 0.95)'
            : isDark
            ? 'rgba(239, 68, 68, 0.20)'
            : 'rgba(254, 242, 242, 0.95)',
        }}
      >
        <div className="text-xs sm:text-sm font-mono font-bold" style={{ color: isCallerAlive ? (isDark ? '#34D399' : '#065F46') : (isDark ? '#F87171' : '#991B1B') }}>
          Caller &lt;0.105.0&gt;
        </div>
        <div className="text-[11px] font-mono font-bold mt-1.5" style={{ color: isDark ? '#CBD5E1' : '#1E293B' }}>
          {stepIndex === 0 && 'Crashed by Exit Cascade!'}
          {stepIndex === 1 && 'trap_exit=true (Survives)'}
          {stepIndex === 2 && 'Monitored Worker (Survives)'}
          {stepIndex === 3 && 'Sent exit(Pid, kill)'}
        </div>
      </div>

      {/* Signal Channel */}
      <div className="flex flex-col items-center gap-1.5">
        <span
          className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs"
          style={{
            background: stepIndex === 0 ? 'rgba(239,68,68,0.22)' : 'rgba(139,92,246,0.22)',
            color: stepIndex === 0 ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#C084FC' : '#7C3AED'),
            border: stepIndex === 0 ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(139,92,246,0.4)',
          }}
        >
          {stepIndex === 0 && 'Exit Cascade'}
          {stepIndex === 1 && '{\'EXIT\', badarith}'}
          {stepIndex === 2 && '{\'DOWN\', #Ref}'}
          {stepIndex === 3 && 'SIGKILL'}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-700 dark:text-slate-300 rotate-180" />
      </div>

      {/* Worker Process */}
      <div
        className="flex-1 p-3 rounded-xl border text-center border-red-500 shadow-sm"
        style={{
          background: isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(254, 242, 242, 0.95)',
        }}
      >
        <div className="text-xs sm:text-sm font-mono font-bold text-red-600 dark:text-red-400">
          Worker &lt;0.210.0&gt;
        </div>
        <div className="text-[11px] font-mono text-red-700 dark:text-red-300 font-bold mt-1.5">
          {stepIndex === 3 ? 'Untrappable Kill' : 'exit(badarith)'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCENE 6: 'supervision_rest_for_one_ets_heir' (Chapters 8 & 9 ETS Heir & Sup)
// ============================================================================
function SupervisionEtsHeirScene({ stepIndex, isDark }: { stepIndex: number; isDark: boolean }) {
  const etsOwner = stepIndex === 1 || stepIndex === 2 ? 'table_heir' : 'pricing_cache';

  return (
    <div className="w-full flex flex-col items-center gap-2.5 max-w-[460px] py-1">
      {/* Supervisor Header */}
      <div className="text-xs sm:text-sm font-mono font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
        <Shield className="w-4 h-4" />
        Root Supervisor: rest_for_one
      </div>

      {/* 3 Workers in Order */}
      <div className="flex items-center justify-between w-full gap-2.5">
        {/* Worker 1: table_heir */}
        <div
          className={`flex-1 p-2.5 rounded-xl border text-center transition-all ${
            etsOwner === 'table_heir' ? 'ring-2 ring-amber-500 shadow-md' : 'opacity-90'
          }`}
          style={{
            background: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(238, 242, 255, 0.95)',
            borderColor: '#6366F1',
          }}
        >
          <div className="text-[11px] sm:text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
            1. table_heir
          </div>
          <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
            {etsOwner === 'table_heir' ? 'Holds ETS Table!' : 'Designated Heir'}
          </div>
        </div>

        {/* Worker 2: pricing_cache */}
        <div
          className={`flex-1 p-2.5 rounded-xl border text-center transition-all ${
            stepIndex === 1
              ? 'border-red-500 bg-red-500/20 opacity-60'
              : etsOwner === 'pricing_cache'
              ? 'ring-2 ring-emerald-500 shadow-md'
              : 'opacity-90'
          }`}
          style={{
            background: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(236, 253, 245, 0.95)',
            borderColor: stepIndex === 1 ? '#EF4444' : '#10B981',
          }}
        >
          <div className="text-[11px] sm:text-xs font-mono font-bold" style={{ color: stepIndex === 1 ? '#DC2626' : (isDark ? '#34D399' : '#065F46') }}>
            2. pricing_cache
          </div>
          <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
            {stepIndex === 1 ? 'Crashed!' : 'ETS Cache Owner'}
          </div>
        </div>

        {/* Worker 3: order_gateway */}
        <div
          className={`flex-1 p-2.5 rounded-xl border text-center transition-all ${
            stepIndex === 1 || stepIndex === 2 ? 'opacity-50' : 'opacity-90'
          }`}
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.50)' : 'rgba(241, 245, 249, 0.95)',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.15)',
          }}
        >
          <div className="text-[11px] sm:text-xs font-mono font-bold" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
            3. order_gateway
          </div>
          <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
            {stepIndex === 2 ? 'Restarting...' : 'Queries Cache'}
          </div>
        </div>
      </div>

      {/* ETS Table Capsule */}
      <div
        className="px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold flex items-center gap-2 shadow-xs"
        style={{
          background: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(254, 243, 199, 0.95)',
          borderColor: '#F59E0B',
          color: isDark ? '#FDE68A' : '#78350F',
        }}
      >
        <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        ETS Table: owned by &lt;{etsOwner}&gt;
      </div>
    </div>
  );
}

// ============================================================================
// SCENE 7: 'tcp_xmpp_stream_framing' (Chapters 10 & 11 TCP & XMPP Framing)
// ============================================================================
function TcpStreamFramingScene({ stepIndex, isDark }: { stepIndex: number; isDark: boolean }) {
  const bufferContent =
    stepIndex === 0
      ? '<<"<stream:str">>'
      : stepIndex === 1
      ? '<<"<message>Hi</mes">>'
      : '<<>> (Empty)';

  return (
    <div className="w-full flex flex-col items-center gap-2.5 max-w-[460px] py-1">
      {/* Sliding Incoming Packet Stream */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-mono font-bold whitespace-nowrap" style={{ color: isDark ? '#CBD5E1' : '#1E293B' }}>
          TCP Wire:
        </span>
        <div
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-all shadow-xs ${
            stepIndex === 0
              ? 'bg-cyan-500/30 text-cyan-800 dark:text-cyan-200 ring-2 ring-cyan-500'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Chunk 1: "&lt;stream:str"
        </div>
        <div
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-all shadow-xs ${
            stepIndex === 1
              ? 'bg-cyan-500/30 text-cyan-800 dark:text-cyan-200 ring-2 ring-cyan-500'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Chunk 2: "eam to='localhost'&gt;&lt;message&gt;Hi&lt;/mes"
        </div>
        <div
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-all shadow-xs ${
            stepIndex >= 2
              ? 'bg-cyan-500/30 text-cyan-800 dark:text-cyan-200 ring-2 ring-cyan-500'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Chunk 3: "sage&gt;&lt;ping id='p1'/&gt;"
        </div>
      </div>

      {/* Incremental Framer State */}
      <div className="flex items-center justify-between w-full gap-2.5">
        {/* Left: Leftover BufferBin */}
        <div
          className="flex-1 p-2.5 rounded-xl border text-center shadow-xs"
          style={{
            background: isDark ? 'rgba(6, 182, 212, 0.16)' : 'rgba(207, 250, 254, 0.95)',
            borderColor: '#06B6D4',
          }}
        >
          <div className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
            BufferBin Leftover
          </div>
          <div className="text-[11px] font-mono font-bold mt-1 truncate" style={{ color: isDark ? '#A5F3FC' : '#083344' }}>
            {bufferContent}
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-700 dark:text-slate-300 flex-shrink-0" />

        {/* Right: Emitted Protocol Events */}
        <div
          className="flex-1 p-2.5 rounded-xl border text-center shadow-xs"
          style={{
            background: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(209, 250, 229, 0.95)',
            borderColor: '#10B981',
          }}
        >
          <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
            Emitted Frames
          </div>
          <div className="text-[11px] font-mono font-bold mt-1 truncate" style={{ color: isDark ? '#6EE7B7' : '#064E3B' }}>
            {stepIndex === 0 && '[] (Waiting for more)'}
            {stepIndex === 1 && '[{stream_open, <<"localhost">>}]'}
            {stepIndex >= 2 && '[{chat_message, ...}, {ping, "p1"}]'}
          </div>
        </div>
      </div>
    </div>
  );
}
