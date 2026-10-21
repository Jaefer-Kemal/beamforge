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
    title: 'Off-Heap ProcBin vs Sub-Binary Pinning',
    subtitle: 'Reference Counting & binary:copy/1 Memory Reclamation',
    icon: Database,
    accentColor: '#F59E0B',
    steps: [
      {
        title: 'Step 1: Raw TCP Buffer Allocated Off-Heap',
        vmAction: 'BEAM allocates 64 KB TCP buffer in off-heap binary memory. Global refc = 1. Process holds a ProcBin descriptor.',
        bifOpcode: 'erts_alloc(ERTS_ALC_T_PROC_BINS, 65536)',
      },
      {
        title: 'Step 2: Pattern Matching Creates SubBinary Pointer',
        vmAction: '<<Header:16/binary, _/binary>> = Buffer creates a 16-byte SubBinary pointer with offset 0 and length 16 pointing into the 64 KB block.',
        bifOpcode: 'bs_get_binary2 (O(1) pointer creation)',
      },
      {
        title: 'Step 3: The Pitfall: Dead Buffer Pinned in RAM',
        vmAction: 'Process stores 16-byte Header in session state. Because SubBinary references parent ProcBin, the ENTIRE 64 KB is locked in RAM!',
        bifOpcode: 'refc remains > 0 (Garbage collector cannot free 64 KB)',
      },
      {
        title: 'Step 4: The Remedy: binary:copy/1 Forces Heap Copy',
        vmAction: 'binary:copy(Header) copies 16 bytes to process local heap. SubBinary pointer is destroyed. ProcBin refc drops to 0 and is immediately freed.',
        bifOpcode: 'binary:copy/1 (ProcBin refc=0 -> erts_free 64 KB)',
      },
    ],
  },
  mailbox_selective_receive: {
    id: 'mailbox_selective_receive',
    title: 'Actor Mailbox & The Internal Save Queue',
    subtitle: 'Selective Receive Pointer Traversal',
    icon: Radio,
    accentColor: '#007AFF',
    steps: [
      {
        title: 'Step 1: Messages Arrive in Process Mailbox',
        vmAction: 'External actors post [{log, 1}, {metric, 2}, {urgent, 99}] into process mailbox. Current scan pointer points to head ({log, 1}).',
        bifOpcode: 'loop_rec (Fetch first message at mailbox head)',
      },
      {
        title: 'Step 2: Unmatched Message Moved to Save Queue',
        vmAction: 'receive {urgent, Msg} -> ... pattern fails to match {log, 1}. BEAM moves {log, 1} into internal Save Queue and advances scan pointer.',
        bifOpcode: 'remove_message -> save_queue (Unmatched buffer)',
      },
      {
        title: 'Step 3: Scan Pointer Traverses to {urgent, 99}',
        vmAction: '{metric, 2} also fails match and moves to Save Queue. Scan pointer reaches {urgent, 99}. MATCH SUCCESS! Payload extracted.',
        bifOpcode: 'loop_rec_end (Execute clause body with Msg=99)',
      },
      {
        title: 'Step 4: Save Queue Spliced Back to Front',
        vmAction: 'BEAM automatically splices Save Queue [{log, 1}, {metric, 2}] back to the head of the mailbox. Message ordering is strictly preserved!',
        bifOpcode: 'restore_save_queue (Zero message loss)',
      },
    ],
  },
  links_monitors_signals: {
    id: 'links_monitors_signals',
    title: 'Links, Monitors & Process Exit Signals',
    subtitle: 'Bidirectional Cascades vs Unidirectional Down Messages',
    icon: Zap,
    accentColor: '#EF4444',
    steps: [
      {
        title: 'Step 1: Bidirectional Link (link/1)',
        vmAction: 'Worker <0.210.0> crashes with badarith. Exit signal travels across link to Caller <0.105.0>. Caller crashes too unless trapping exits!',
        bifOpcode: 'link(Pid) -> erts_send_exit_signal(Worker, Caller, badarith)',
      },
      {
        title: 'Step 2: Trapping Exits (process_flag)',
        vmAction: 'Caller enabled process_flag(trap_exit, true). Exit signal is converted into a regular message {\'EXIT\', <0.210.0>, badarith}. Caller survives.',
        bifOpcode: 'process_flag(trap_exit, true)',
      },
      {
        title: 'Step 3: Unidirectional Monitor (monitor/2)',
        vmAction: 'Caller monitors Worker. No bidirectional link exists. On crash, BEAM posts {\'DOWN\', #Ref, process, <0.210.0>, badarith} to Caller.',
        bifOpcode: 'erlang:monitor(process, WorkerPid)',
      },
      {
        title: 'Step 4: Untrappable Kill Signal (exit(Pid, kill))',
        vmAction: 'exit(WorkerPid, kill) sends untrappable SIGKILL. Worker terminates immediately regardless of trap_exit flag.',
        bifOpcode: 'exit(WorkerPid, kill) (Kernel-level termination)',
      },
    ],
  },
  supervision_rest_for_one_ets_heir: {
    id: 'supervision_rest_for_one_ets_heir',
    title: 'Supervision rest_for_one & ETS Heir Handover',
    subtitle: 'Zero-Downtime Table Inheritance During Crash Recovery',
    icon: Shield,
    accentColor: '#6366F1',
    steps: [
      {
        title: 'Step 1: Normal State with Designated Heir',
        vmAction: 'pricing_cache owns ETS table with {heir, table_heir_pid, heir_data}. order_gateway queries pricing_cache for active quotes.',
        bifOpcode: 'ets:new(pricing_tab, [{heir, HeirPid, data}])',
      },
      {
        title: 'Step 2: Owner Crash & Immediate Heir Transfer',
        vmAction: 'pricing_cache crashes! BEAM atomically reassigns ETS table ownership to table_heir. Message {\'ETS-TRANSFER\', Tab, OldOwner, data} sent.',
        bifOpcode: 'erts_transfer_ets_ownership (Zero table loss)',
      },
      {
        title: 'Step 3: rest_for_one Terminates Dependent Siblings',
        vmAction: 'Supervisor terminates order_gateway (child started after pricing_cache). table_heir remains alive. Supervisor restarts pricing_cache.',
        bifOpcode: 'rest_for_one: restart children 2 & 3 in order',
      },
      {
        title: 'Step 4: Heir Returns Table via ets:give_away/3',
        vmAction: 'table_heir calls ets:give_away(Tab, NewPricingPid, []). New worker resumes cache operations. order_gateway restarts. Zero data lost!',
        bifOpcode: 'ets:give_away(Tab, NewOwnerPid, GiftData)',
      },
    ],
  },
  tcp_xmpp_stream_framing: {
    id: 'tcp_xmpp_stream_framing',
    title: 'TCP Stream Packet Fragmentation & Framing',
    subtitle: 'Chunk Accumulation & {active, once} Flow Control',
    icon: Activity,
    accentColor: '#06B6D4',
    steps: [
      {
        title: 'Step 1: Fragmented Packet 1 Arrives',
        vmAction: 'TCP delivers Chunk 1: <<"<stream:str">>. Incomplete XML; parser stores partial chunk in BufferBin and re-arms socket.',
        bifOpcode: 'Buffer = <<BufferBin/binary, Chunk1/binary>>',
      },
      {
        title: 'Step 2: Packet 2 Arrives & Completes Stream Header',
        vmAction: 'Chunk 2: <<"eam to=\'localhost\'><message>Hi</mes">>. Parser slices completed <stream:stream> and emits {stream_open, <<"localhost">>}.',
        bifOpcode: 'binary:match(Bin, <<">">>) -> extract_attr',
      },
      {
        title: 'Step 3: Packet 3 Completes Stanza & Ping',
        vmAction: 'Chunk 3: <<"sage><ping id=\'p1\'/>">>. Parser emits {chat_message, ...} and {ping, <<"p1">>}. BufferBin is left empty (<<>>).',
        bifOpcode: 'extract_closed_tag(Bin, <<"</message>">>, ...)',
      },
      {
        title: 'Step 4: Active-Once Socket Re-arming Backpressure',
        vmAction: 'Worker finishes processing stanzas and executes inet:setopts(Socket, [{active, once}]). Socket safely delivers next single packet.',
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
        background: isDark ? 'rgba(15, 23, 42, 0.70)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.10)',
        boxShadow: isDark
          ? '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
          : '0 10px 25px -10px rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* ── Top Header Strip ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{
          background: isDark ? 'rgba(11, 15, 23, 0.55)' : 'rgba(248, 250, 252, 0.75)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        }}
      >
        {/* Left: Icon + Title + Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{
              background: isDark ? `${config.accentColor}25` : `${config.accentColor}15`,
              border: `1px solid ${config.accentColor}40`,
              color: config.accentColor,
            }}
          >
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-black tracking-tight truncate"
                style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
              >
                {config.title}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider hidden sm:inline"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                  color: isDark ? '#94A3B8' : '#64748B',
                }}
              >
                Interactive
              </span>
            </div>
          </div>
        </div>

        {/* Right: Step Controls & Collapse */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Step Pill */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono mr-1"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
              color: isDark ? '#E2E8F0' : '#1E293B',
            }}
          >
            <span>Step {currentStep + 1}/4</span>
          </div>

          {/* Stepper Buttons */}
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            title="Previous Step"
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
              color: isDark ? '#F1F5F9' : '#0F172A',
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentStep === config.steps.length - 1}
            title="Next Step"
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: config.accentColor,
              color: '#FFFFFF',
              boxShadow: `0 2px 8px ${config.accentColor}50`,
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReset}
            title="Reset to Step 1"
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all opacity-70 hover:opacity-100 cursor-pointer"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
              color: isDark ? '#94A3B8' : '#64748B',
            }}
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Diagram' : 'Collapse Diagram'}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all ml-1 cursor-pointer opacity-70 hover:opacity-100"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
              color: isDark ? '#94A3B8' : '#64748B',
            }}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Collapsible Body ───────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="flex flex-col">
          {/* Visual Scene Viewport */}
          <div
            className="p-3.5 flex items-center justify-center relative overflow-hidden"
            style={{
              minHeight: '190px',
              background: isDark ? 'rgba(2, 6, 23, 0.40)' : 'rgba(241, 245, 249, 0.40)',
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
            className="px-4 py-2.5 border-t space-y-1.5"
            style={{
              background: isDark ? 'rgba(11, 15, 23, 0.65)' : 'rgba(248, 250, 252, 0.85)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold flex items-center gap-1.5"
                style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: config.accentColor }}
                />
                {step.title}
              </span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className="w-4 h-1.5 rounded-full transition-all cursor-pointer"
                    style={{
                      background:
                        idx === currentStep
                          ? config.accentColor
                          : isDark
                          ? 'rgba(255,255,255,0.15)'
                          : 'rgba(15,23,42,0.15)',
                    }}
                  />
                ))}
              </div>
            </div>

            <p
              className="text-[11px] leading-relaxed font-normal"
              style={{ color: isDark ? '#CBD5E1' : '#334155' }}
            >
              {step.vmAction}
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold truncate flex items-center gap-1"
                style={{
                  background: isDark ? 'rgba(139,92,246,0.18)' : 'rgba(124,58,237,0.08)',
                  color: isDark ? '#DDD6FE' : '#4C1D95',
                  border: isDark ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(124,58,237,0.18)',
                }}
              >
                <Zap className="w-3 h-3 text-purple-400 fill-purple-400 shrink-0" />
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
  // Nodes highlighted by step:
  // Step 0: M1 (sup), M3 (registry), M5 (router)
  // Step 1: TCP, M2 (parser), M4 (c2s_statem)
  // Step 2: M4 (c2s_statem) -> M3 (registry)
  // Step 3: M5 (router) -> M4 (c2s_statem) / Offline store
  const isM1Active = activeMilestone === 1 || stepIndex === 0;
  const isM2Active = activeMilestone === 2 || stepIndex === 1;
  const isM3Active = activeMilestone === 3 || stepIndex === 0 || stepIndex === 2;
  const isM4Active = activeMilestone === 4 || stepIndex === 1 || stepIndex === 2;
  const isM5Active = activeMilestone === 5 || stepIndex === 0 || stepIndex === 3;

  return (
    <div className="w-full flex flex-col items-center justify-center gap-2 py-1">
      {/* Top Node: Supervisor (M1) */}
      <div
        className={`px-3 py-1.5 rounded-xl border text-center transition-all duration-300 ${
          isM1Active
            ? 'ring-2 ring-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.45)] scale-105'
            : 'opacity-85'
        }`}
        style={{
          background: isDark ? 'rgba(88, 28, 135, 0.45)' : 'rgba(237, 233, 254, 0.90)',
          borderColor: isDark ? '#A855F7' : '#7C3AED',
        }}
      >
        <div className="text-[10px] font-mono font-bold" style={{ color: isDark ? '#E9D5FF' : '#581C87' }}>
          M1: xmpp_sup
        </div>
        <div className="text-[9px] font-semibold" style={{ color: isDark ? '#C084FC' : '#6D28D9' }}>
          rest_for_one · intensity: 5/10s
        </div>
      </div>

      {/* Downward Connector to Core Layer */}
      <div className="flex items-center justify-center w-full max-w-[280px]">
        <div
          className="h-3 w-0.5 transition-all"
          style={{ background: isM1Active ? '#A855F7' : isDark ? '#334155' : '#CBD5E1' }}
        />
      </div>

      {/* Middle Row: M3 (Registry) <-> M5 (Router) */}
      <div className="flex items-center justify-between w-full max-w-[340px] gap-3">
        {/* M3: Registry */}
        <div
          className={`flex-1 p-2 rounded-xl border transition-all duration-300 ${
            isM3Active
              ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-102'
              : 'opacity-80'
          }`}
          style={{
            background: isDark ? 'rgba(120, 53, 15, 0.35)' : 'rgba(254, 243, 199, 0.85)',
            borderColor: isDark ? '#F59E0B' : '#D97706',
          }}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Database className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-mono font-bold" style={{ color: isDark ? '#FDE68A' : '#78350F' }}>
              M3: xmpp_session_registry
            </span>
          </div>
          <div className="text-[8.5px] font-medium" style={{ color: isDark ? '#FCD34D' : '#92400E' }}>
            ETS · monitor/2 cleanup
          </div>
        </div>

        {/* Bi-directional Link Badge */}
        <div className="flex flex-col items-center">
          <Share2 className="w-3 h-3 text-slate-400" />
          <span className="text-[8px] font-mono text-slate-400">ETS query</span>
        </div>

        {/* M5: Router */}
        <div
          className={`flex-1 p-2 rounded-xl border transition-all duration-300 ${
            isM5Active
              ? 'ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-102'
              : 'opacity-80'
          }`}
          style={{
            background: isDark ? 'rgba(6, 78, 59, 0.35)' : 'rgba(209, 250, 229, 0.85)',
            borderColor: isDark ? '#10B981' : '#059669',
          }}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Radio className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-mono font-bold" style={{ color: isDark ? '#A7F3D0' : '#064E3B' }}>
              M5: xmpp_router
            </span>
          </div>
          <div className="text-[8.5px] font-medium" style={{ color: isDark ? '#6EE7B7' : '#047857' }}>
            Direct PID ! Xml · Offline Queue
          </div>
        </div>
      </div>

      {/* Downward Connector to Protocol Pipeline */}
      <div className="flex items-center justify-center w-full max-w-[280px]">
        <div
          className="h-2.5 w-0.5"
          style={{ background: isDark ? '#334155' : '#CBD5E1' }}
        />
      </div>

      {/* Bottom Pipeline: TCP -> M2 (Framer) -> M4 (C2S FSM) */}
      <div className="flex items-center justify-center w-full max-w-[360px] gap-1.5">
        <div
          className="px-2 py-1 rounded-lg border text-[9px] font-mono font-semibold text-center"
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.9)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
            color: isDark ? '#94A3B8' : '#64748B',
          }}
        >
          TCP Socket
        </div>

        <ArrowRight className="w-3 h-3 text-slate-400" />

        <div
          className={`px-2.5 py-1.5 rounded-xl border text-center transition-all ${
            isM2Active
              ? 'ring-2 ring-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)] scale-102'
              : 'opacity-80'
          }`}
          style={{
            background: isDark ? 'rgba(30, 58, 138, 0.35)' : 'rgba(219, 234, 254, 0.85)',
            borderColor: isDark ? '#3B82F6' : '#2563EB',
          }}
        >
          <div className="text-[9.5px] font-mono font-bold" style={{ color: isDark ? '#BFDBFE' : '#1E3A8A' }}>
            M2: xmpp_stream_parser
          </div>
          <div className="text-[8px] font-medium" style={{ color: isDark ? '#93C5FD' : '#1D4ED8' }}>
            binary:copy/1 unpinning
          </div>
        </div>

        <ArrowRight className="w-3 h-3 text-slate-400" />

        <div
          className={`px-2.5 py-1.5 rounded-xl border text-center transition-all ${
            isM4Active
              ? 'ring-2 ring-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)] scale-102'
              : 'opacity-80'
          }`}
          style={{
            background: isDark ? 'rgba(49, 46, 129, 0.35)' : 'rgba(224, 231, 255, 0.85)',
            borderColor: isDark ? '#6366F1' : '#4F46E5',
          }}
        >
          <div className="text-[9.5px] font-mono font-bold" style={{ color: isDark ? '#C7D2FE' : '#312E81' }}>
            M4: xmpp_c2s_statem
          </div>
          <div className="text-[8px] font-medium" style={{ color: isDark ? '#A5B4FC' : '#4338CA' }}>
            4-State FSM · SASL PLAIN
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
  // Steps:
  // 0: Initial call
  // 1: 2 frames vs 1 frame
  // 2: 4 frames vs 1 frame (Acc=100)
  // 3: Unwinding backwards vs instant return
  const bodyFrames = stepIndex === 0 ? 1 : stepIndex === 1 ? 2 : stepIndex === 2 ? 4 : 2;
  const tcoAcc = stepIndex === 0 ? 0 : stepIndex === 1 ? 25 : stepIndex === 2 ? 100 : 175;

  return (
    <div className="w-full flex items-center justify-around gap-4 px-2 py-1 max-w-[420px]">
      {/* Left: Body Recursion (Stack accumulator) */}
      <div
        className="flex-1 p-2.5 rounded-xl border flex flex-col items-center"
        style={{
          background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(254, 242, 242, 0.85)',
          borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
        }}
      >
        <div className="text-[10px] font-bold mb-1.5 flex items-center gap-1 text-red-500">
          <AlertCircle className="w-3 h-3" />
          Body Recursion (O(N) RAM)
        </div>
        <div className="w-full space-y-1 flex flex-col items-center">
          {Array.from({ length: bodyFrames }).map((_, idx) => (
            <div
              key={idx}
              className="w-full py-1 px-1.5 rounded text-[8.5px] font-mono text-center font-semibold transition-all duration-300"
              style={{
                background: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)',
                color: isDark ? '#FCA5A5' : '#B91C1C',
                border: '1px dashed rgba(239,68,68,0.3)',
              }}
            >
              Frame {idx + 1}: Price + calc(...)
            </div>
          ))}
          {bodyFrames >= 4 && (
            <div className="text-[8px] font-mono text-red-400 font-bold animate-pulse">
              Stack Depth: 4 Pending Ops
            </div>
          )}
        </div>
      </div>

      {/* Center Divider */}
      <div className="h-28 w-px" style={{ background: isDark ? '#334155' : '#CBD5E1' }} />

      {/* Right: Tail Recursion (TCO in-place) */}
      <div
        className="flex-1 p-2.5 rounded-xl border flex flex-col items-center"
        style={{
          background: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(236, 253, 245, 0.85)',
          borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#86EFAC',
        }}
      >
        <div className="text-[10px] font-bold mb-1.5 flex items-center gap-1 text-emerald-500">
          <CheckCircle2 className="w-3 h-3" />
          Tail Recursion (O(1) RAM)
        </div>
        <div className="w-full flex flex-col items-center gap-1.5">
          <div
            className="w-full py-2 px-1.5 rounded-lg text-[9px] font-mono text-center font-bold transition-all duration-300 ring-1 ring-emerald-400"
            style={{
              background: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.15)',
              color: isDark ? '#6EE7B7' : '#047857',
            }}
          >
            Frame 1 (Reused in-place)
            <div className="text-[8px] font-mono text-emerald-400 mt-0.5">
              Acc = {tcoAcc} · call_last
            </div>
          </div>
          <div className="text-[8px] font-mono text-emerald-500 font-bold text-center">
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
    <div className="w-full flex flex-col items-center gap-2 max-w-[380px] py-1">
      {/* 64 KB Off-heap ProcBin */}
      <div
        className={`w-full p-2 rounded-xl border transition-all duration-300 ${
          isCopied ? 'opacity-40 line-through' : 'opacity-100 shadow-md'
        }`}
        style={{
          background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(254, 243, 199, 0.85)',
          borderColor: isDark ? '#F59E0B' : '#D97706',
        }}
      >
        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
          <span style={{ color: isDark ? '#FDE68A' : '#78350F' }}>
            64 KB Off-Heap ProcBin Buffer
          </span>
          <span
            className="px-1.5 py-0.2 rounded text-[9px]"
            style={{
              background: refCount > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
              color: refCount > 0 ? '#EF4444' : '#10B981',
            }}
          >
            refc = {refCount} {isCopied && '(GC Freed!)'}
          </span>
        </div>
      </div>

      {/* Pointer connection arrow */}
      <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-slate-400">
        {!isCopied ? (
          <>
            <span className="text-amber-500 font-bold">SubBinary slice pointer (16 bytes)</span>
            <ArrowRight className="w-3 h-3 text-amber-500" />
          </>
        ) : (
          <>
            <span className="text-emerald-500 font-bold">binary:copy/1 local heap allocation</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          </>
        )}
      </div>

      {/* Resulting 16-byte Slice */}
      <div
        className="w-full max-w-[260px] p-2 rounded-xl border text-center transition-all duration-300"
        style={{
          background: isCopied
            ? isDark
              ? 'rgba(16, 185, 129, 0.25)'
              : 'rgba(209, 250, 229, 0.9)'
            : isDark
            ? 'rgba(239, 68, 68, 0.20)'
            : 'rgba(254, 226, 226, 0.9)',
          borderColor: isCopied ? '#10B981' : '#EF4444',
        }}
      >
        <div className="text-[10px] font-mono font-bold" style={{ color: isCopied ? '#10B981' : '#EF4444' }}>
          {isCopied ? '<<\"alex\">> on Process Heap' : 'SubBinary Pointer in Session State'}
        </div>
        <div className="text-[8.5px] mt-0.5" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
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
  // Steps:
  // 0: [log, metric, urgent] in Mailbox
  // 1: log moved to Save Queue
  // 2: metric moved to Save Queue, urgent matched!
  // 3: Save Queue spliced back: [log, metric]
  const saveQueue = stepIndex === 1 ? ['{log, 1}'] : stepIndex === 2 ? ['{log, 1}', '{metric, 2}'] : [];
  const currentScan = stepIndex === 0 ? '{log, 1}' : stepIndex === 1 ? '{metric, 2}' : stepIndex === 2 ? '{urgent, 99}' : null;

  return (
    <div className="w-full flex flex-col items-center gap-2 max-w-[400px] py-1">
      {/* Mailbox Row */}
      <div className="w-full">
        <div className="text-[9px] font-mono font-bold text-slate-400 mb-1 flex items-center justify-between">
          <span>Process Mailbox (Scan Pointer: {currentScan || 'Idle'})</span>
          <span className="text-blue-400">FIFO Order</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded-xl border" style={{ borderColor: isDark ? '#334155' : '#CBD5E1' }}>
          {stepIndex < 3 ? (
            <>
              {stepIndex === 0 && (
                <div className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold">
                  {'{log, 1}'}
                </div>
              )}
              {stepIndex <= 1 && (
                <div className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold">
                  {'{metric, 2}'}
                </div>
              )}
              {stepIndex <= 2 && (
                <div className="px-2 py-1 rounded bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold animate-pulse">
                  {'{urgent, 99}'} (Target)
                </div>
              )}
            </>
          ) : (
            <div className="px-2 py-1 rounded bg-slate-500/20 text-slate-300 text-[9px] font-mono">
              [ {'{log, 1}'}, {'{metric, 2}'} ] (Spliced back to front!)
            </div>
          )}
        </div>
      </div>

      {/* Save Queue Buffer */}
      <div className="w-full">
        <div className="text-[9px] font-mono font-bold text-amber-500 mb-1 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Internal Save Queue (Unmatched Buffer)
        </div>
        <div
          className="flex items-center gap-1.5 p-2 rounded-xl border min-h-[34px]"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(254, 243, 199, 0.6)',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FCD34D',
          }}
        >
          {saveQueue.length > 0 ? (
            saveQueue.map((item, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-[8.5px] font-mono font-semibold"
                style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.15)',
                  color: isDark ? '#FDE68A' : '#78350F',
                }}
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-[8.5px] font-mono text-slate-400 italic">
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
  // Steps:
  // 0: Bidirectional link crash cascade
  // 1: trap_exit = true converts to {'EXIT', ...}
  // 2: erlang:monitor/2 receives {'DOWN', ...}
  // 3: exit(Pid, kill) cannot be trapped
  const isCallerAlive = stepIndex > 0;

  return (
    <div className="w-full flex items-center justify-around gap-2 max-w-[400px] py-1">
      {/* Caller Process */}
      <div
        className={`flex-1 p-2.5 rounded-xl border text-center transition-all duration-300 ${
          isCallerAlive ? 'border-emerald-500 shadow-sm' : 'border-red-500 opacity-60'
        }`}
        style={{
          background: isCallerAlive
            ? isDark
              ? 'rgba(16, 185, 129, 0.12)'
              : 'rgba(236, 253, 245, 0.85)'
            : isDark
            ? 'rgba(239, 68, 68, 0.15)'
            : 'rgba(254, 242, 242, 0.85)',
        }}
      >
        <div className="text-[10px] font-mono font-bold" style={{ color: isCallerAlive ? '#10B981' : '#EF4444' }}>
          Caller &lt;0.105.0&gt;
        </div>
        <div className="text-[8px] font-mono mt-1">
          {stepIndex === 0 && 'Crashed by Exit Cascade!'}
          {stepIndex === 1 && 'trap_exit=true (Survives)'}
          {stepIndex === 2 && 'Monitored Worker (Survives)'}
          {stepIndex === 3 && 'Sent exit(Pid, kill)'}
        </div>
      </div>

      {/* Signal Channel */}
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{
            background: stepIndex === 0 ? '#EF444425' : '#8B5CF625',
            color: stepIndex === 0 ? '#EF4444' : '#8B5CF6',
          }}
        >
          {stepIndex === 0 && 'Exit Cascade'}
          {stepIndex === 1 && '{\'EXIT\', badarith}'}
          {stepIndex === 2 && '{\'DOWN\', #Ref}'}
          {stepIndex === 3 && 'SIGKILL'}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-180" />
      </div>

      {/* Worker Process */}
      <div
        className="flex-1 p-2.5 rounded-xl border text-center border-red-500"
        style={{
          background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 242, 242, 0.85)',
        }}
      >
        <div className="text-[10px] font-mono font-bold text-red-500">
          Worker &lt;0.210.0&gt;
        </div>
        <div className="text-[8px] font-mono text-red-400 mt-1">
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
  // Steps:
  // 0: [1. table_heir] -> [2. pricing_cache (owns ETS)] -> [3. order_gateway]
  // 1: pricing_cache crashes, ETS transfers to table_heir!
  // 2: rest_for_one restarts pricing_cache & order_gateway, table_heir preserved
  // 3: table_heir gives ETS table back via ets:give_away/3
  const etsOwner = stepIndex === 1 || stepIndex === 2 ? 'table_heir' : 'pricing_cache';

  return (
    <div className="w-full flex flex-col items-center gap-2 max-w-[420px] py-1">
      {/* Supervisor Header */}
      <div className="text-[9px] font-mono font-bold text-purple-400 flex items-center gap-1">
        <Shield className="w-3 h-3" />
        Root Supervisor: rest_for_one
      </div>

      {/* 3 Workers in Order */}
      <div className="flex items-center justify-between w-full gap-2">
        {/* Worker 1: table_heir */}
        <div
          className={`flex-1 p-2 rounded-xl border text-center transition-all ${
            etsOwner === 'table_heir' ? 'ring-2 ring-amber-400 shadow-md' : 'opacity-85'
          }`}
          style={{
            background: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(238, 242, 255, 0.9)',
            borderColor: '#6366F1',
          }}
        >
          <div className="text-[9px] font-mono font-bold text-indigo-400">
            1. table_heir
          </div>
          <div className="text-[8px] font-semibold text-slate-400">
            {etsOwner === 'table_heir' ? 'Holds ETS Table!' : 'Designated Heir'}
          </div>
        </div>

        {/* Worker 2: pricing_cache */}
        <div
          className={`flex-1 p-2 rounded-xl border text-center transition-all ${
            stepIndex === 1
              ? 'border-red-500 bg-red-500/20 opacity-50'
              : etsOwner === 'pricing_cache'
              ? 'ring-2 ring-emerald-400 shadow-md'
              : 'opacity-85'
          }`}
          style={{
            background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(236, 253, 245, 0.9)',
            borderColor: stepIndex === 1 ? '#EF4444' : '#10B981',
          }}
        >
          <div className="text-[9px] font-mono font-bold" style={{ color: stepIndex === 1 ? '#EF4444' : '#10B981' }}>
            2. pricing_cache
          </div>
          <div className="text-[8px] font-semibold text-slate-400">
            {stepIndex === 1 ? 'Crashed!' : 'ETS Cache Owner'}
          </div>
        </div>

        {/* Worker 3: order_gateway */}
        <div
          className={`flex-1 p-2 rounded-xl border text-center transition-all ${
            stepIndex === 1 || stepIndex === 2 ? 'opacity-40' : 'opacity-85'
          }`}
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.9)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
          }}
        >
          <div className="text-[9px] font-mono font-bold text-slate-300">
            3. order_gateway
          </div>
          <div className="text-[8px] font-semibold text-slate-400">
            {stepIndex === 2 ? 'Restarting...' : 'Queries Cache'}
          </div>
        </div>
      </div>

      {/* ETS Table Capsule */}
      <div
        className="px-3 py-1 rounded-full border text-[9px] font-mono font-bold flex items-center gap-1.5"
        style={{
          background: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(254, 243, 199, 0.9)',
          borderColor: '#F59E0B',
          color: isDark ? '#FDE68A' : '#78350F',
        }}
      >
        <Database className="w-3 h-3 text-amber-500" />
        ETS Table: owned by &lt;{etsOwner}&gt;
      </div>
    </div>
  );
}

// ============================================================================
// SCENE 7: 'tcp_xmpp_stream_framing' (Chapters 10 & 11 TCP & XMPP Framing)
// ============================================================================
function TcpStreamFramingScene({ stepIndex, isDark }: { stepIndex: number; isDark: boolean }) {
  // Steps:
  // 0: Chunk 1 ("<stream:str") -> BufferBin
  // 1: Chunk 2 ("eam to='localhost'><message>Hi</mes") -> {stream_open, ...}
  // 2: Chunk 3 ("sage><ping id='p1'/>") -> {chat_message, ...}, {ping, ...}
  // 3: Active once rearmed
  const bufferContent =
    stepIndex === 0
      ? '<<"<stream:str">>'
      : stepIndex === 1
      ? '<<"<message>Hi</mes">>'
      : '<<>> (Empty)';

  return (
    <div className="w-full flex flex-col items-center gap-2 max-w-[420px] py-1">
      {/* Sliding Incoming Packet Stream */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[9px] font-mono text-slate-400 font-bold whitespace-nowrap">
          TCP Wire:
        </span>
        <div
          className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold whitespace-nowrap transition-all ${
            stepIndex === 0 ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-400' : 'bg-slate-500/20 text-slate-400'
          }`}
        >
          Chunk 1: "&lt;stream:str"
        </div>
        <div
          className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold whitespace-nowrap transition-all ${
            stepIndex === 1 ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-400' : 'bg-slate-500/20 text-slate-400'
          }`}
        >
          Chunk 2: "eam to='localhost'&gt;&lt;message&gt;Hi&lt;/mes"
        </div>
        <div
          className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold whitespace-nowrap transition-all ${
            stepIndex >= 2 ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-400' : 'bg-slate-500/20 text-slate-400'
          }`}
        >
          Chunk 3: "sage&gt;&lt;ping id='p1'/&gt;"
        </div>
      </div>

      {/* Incremental Framer State */}
      <div className="flex items-center justify-between w-full gap-2">
        {/* Left: Leftover BufferBin */}
        <div
          className="flex-1 p-2 rounded-xl border text-center"
          style={{
            background: isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(207, 250, 254, 0.85)',
            borderColor: '#06B6D4',
          }}
        >
          <div className="text-[9px] font-mono font-bold text-cyan-500">
            BufferBin Leftover
          </div>
          <div className="text-[8.5px] font-mono font-bold mt-0.5 truncate" style={{ color: isDark ? '#A5F3FC' : '#083344' }}>
            {bufferContent}
          </div>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

        {/* Right: Emitted Protocol Events */}
        <div
          className="flex-1 p-2 rounded-xl border text-center"
          style={{
            background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(209, 250, 229, 0.85)',
            borderColor: '#10B981',
          }}
        >
          <div className="text-[9px] font-mono font-bold text-emerald-500">
            Emitted Frames
          </div>
          <div className="text-[8.5px] font-mono font-bold mt-0.5 truncate" style={{ color: isDark ? '#6EE7B7' : '#064E3B' }}>
            {stepIndex === 0 && '[] (Waiting for more)'}
            {stepIndex === 1 && '[{stream_open, <<"localhost">>}]'}
            {stepIndex >= 2 && '[{chat_message, ...}, {ping, "p1"}]'}
          </div>
        </div>
      </div>
    </div>
  );
}
