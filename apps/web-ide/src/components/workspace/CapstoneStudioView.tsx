'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import type { CapstoneMilestone } from '../../types/workspace';
import { configureMonacoErlang } from '../../lib/monacoErlang';

// ── Monaco lazy import ────────────────────────────────────────────────────────
let MonacoEditor: React.ComponentType<any> | null = null;
if (typeof window !== 'undefined') {
  import('@monaco-editor/react').then((m) => { MonacoEditor = m.default; });
}

// ── Capstone milestones for the Chapter 12 XMPP Production Server ──────────
const CAPSTONE_MILESTONES: CapstoneMilestone[] = [
  {
    id: 'ms-1',
    number: 1,
    title: 'XML Stream Parser',
    targetFile: 'src/xmpp_stream_parser.erl',
    targetFunctions: ['init/1', 'parse_chunk/2', 'reset/1'],
    description:
      'Build an incremental XML stream parser using `erl_scan`/`xmerl` that handles TCP packet fragmentation. The parser must buffer partial XML tags across multiple TCP reads and emit complete stanzas.',
    verificationHint:
      'Call xmpp_stream_parser:parse_chunk(State, <<"<stream:st">>) followed by parse_chunk(S2, <<"ream ...>>"). Both fragments should coalesce into one complete stream open stanza.',
  },
  {
    id: 'ms-2',
    number: 2,
    title: 'C2S gen_statem State Machine',
    targetFile: 'src/xmpp_c2s_statem.erl',
    targetFunctions: ['init/1', 'wait_for_stream/3', 'wait_for_sasl/3', 'session_established/3'],
    description:
      'Implement the C2S (client-to-server) connection as a `gen_statem` with 5 states: `wait_for_stream`, `wait_for_features`, `wait_for_sasl`, `authenticated`, `session_established`. Each state handles specific XML stanzas and drives TCP socket events with `{active, once}` backpressure.',
    verificationHint:
      'Start the state machine, send a stream opening stanza, verify the state transitions from wait_for_stream to wait_for_features and that a <stream:features> response is sent back.',
  },
  {
    id: 'ms-3',
    number: 3,
    title: 'Session ETS Registry',
    targetFile: 'src/xmpp_session_ets.erl',
    targetFunctions: ['start_link/0', 'register_session/2', 'lookup_session/1', 'unregister_session/1'],
    description:
      'Create a session registry using ETS with `{heir, TableManagerPid, #{}}` so that if the session cache gen_server crashes, the ETS table survives and is transferred to a designated table manager heir process, preventing session data loss.',
    verificationHint:
      'Register a session, kill the owner gen_server with exit(Pid, kill), verify the ETS table is still accessible and transferred to the heir. No session data should be lost.',
  },
  {
    id: 'ms-4',
    number: 4,
    title: 'Presence & Message Router',
    targetFile: 'src/xmpp_router.erl',
    targetFunctions: ['start_link/0', 'route_stanza/1', 'broadcast_presence/2'],
    description:
      'Build the stanza router as a `gen_server` that dispatches `<message>` stanzas to the recipient\'s C2S pid via `gen_statem:cast/2`, and broadcasts `<presence>` stanzas to all connected users in the local domain.',
    verificationHint:
      'Spawn two C2S connections (alice, bob), route a message from alice to bob, assert that bob receives the gen_statem cast. Broadcast a presence from alice and verify both C2S pids receive the broadcast.',
  },
  {
    id: 'ms-5',
    number: 5,
    title: 'Top-Level OTP Supervisor',
    targetFile: 'src/xmpp_sup.erl',
    targetFunctions: ['start_link/0', 'init/1', 'add_c2s_child/1'],
    description:
      'Wire everything together under a `one_for_one` supervisor tree: `xmpp_session_ets` (worker), `xmpp_router` (worker), `xmpp_c2s_sup` (supervisor for dynamically spawned C2S connections). The root supervisor must use restart intensity of `{10, 60}` to handle transient crashes.',
    verificationHint:
      'Call xmpp_sup:start_link(), kill xmpp_router with exit(pid, kill), verify it restarts within 200ms with a new pid. Kill xmpp_session_ets, verify the ETS heir handover and restart.',
  },
];

// ── Capstone files structure ──────────────────────────────────────────────────
const CAPSTONE_FILES = [
  { path: 'src/xmpp_sup.erl', label: 'xmpp_sup.erl', icon: '🌳', behaviour: 'supervisor' as const },
  { path: 'src/xmpp_stream_parser.erl', label: 'xmpp_stream_parser.erl', icon: '📡', behaviour: undefined },
  { path: 'src/xmpp_c2s_statem.erl', label: 'xmpp_c2s_statem.erl', icon: '🔄', behaviour: 'gen_statem' as const },
  { path: 'src/xmpp_session_ets.erl', label: 'xmpp_session_ets.erl', icon: '🗄', behaviour: 'gen_server' as const },
  { path: 'src/xmpp_router.erl', label: 'xmpp_router.erl', icon: '📨', behaviour: 'gen_server' as const },
];

// ── Supervision tree visualizer node ─────────────────────────────────────────
interface TreeNode {
  id: string;
  label: string;
  kind: 'supervisor' | 'worker' | 'dynamic';
  children?: TreeNode[];
  status?: 'running' | 'crashed' | 'pending';
}

const SUPERVISION_TREE: TreeNode = {
  id: 'xmpp_sup',
  label: 'xmpp_sup',
  kind: 'supervisor',
  status: 'running',
  children: [
    {
      id: 'xmpp_session_ets',
      label: 'xmpp_session_ets',
      kind: 'worker',
      status: 'running',
    },
    {
      id: 'xmpp_router',
      label: 'xmpp_router',
      kind: 'worker',
      status: 'running',
    },
    {
      id: 'xmpp_c2s_sup',
      label: 'xmpp_c2s_sup',
      kind: 'supervisor',
      status: 'running',
      children: [
        { id: 'c2s-alice', label: '<alice>', kind: 'dynamic', status: 'running' },
        { id: 'c2s-bob', label: '<bob>', kind: 'dynamic', status: 'running' },
      ],
    },
  ],
};

function SupervisionTreeNode({ node, isDark, depth = 0 }: { node: TreeNode; isDark: boolean; depth?: number }) {
  const kindColor = node.kind === 'supervisor' ? '#8B5CF6' : node.kind === 'dynamic' ? '#38BDF8' : '#10B981';
  const statusColor = node.status === 'crashed' ? '#EF4444' : node.status === 'running' ? '#10B981' : '#64748B';

  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1 transition-colors duration-200"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'}`,
        }}
      >
        {/* Connector lines */}
        {depth > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-0.5 h-full mr-1" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)' }} />
            <div className="w-3 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)' }} />
          </div>
        )}
        {/* Status dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}66` }} />
        {/* Kind badge */}
        <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold flex-shrink-0"
          style={{ background: `${kindColor}22`, color: kindColor, fontSize: '0.625rem' }}>
          {node.kind === 'supervisor' ? 'SUP' : node.kind === 'dynamic' ? 'C2S' : 'WKR'}
        </span>
        {/* Label */}
        <span className="text-xs font-mono font-semibold"
          style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
          {node.label}
        </span>
      </div>
      {node.children?.map((child) => (
        <SupervisionTreeNode key={child.id} node={child} isDark={isDark} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── XMPP Stanza Entry ─────────────────────────────────────────────────────────
function XmppStanzaEntry({ stanza, isDark }: { stanza: { direction: 'in' | 'out'; rawXml: string; description: string; timestamp: string }; isDark: boolean }) {
  const isIn = stanza.direction === 'in';
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold flex-shrink-0"
          style={{ color: isIn ? '#007AFF' : '#10B981' }}>
          {isIn ? '← C→S' : '→ S→C'}
        </span>
        <span className="text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>{stanza.timestamp}</span>
        <span className="text-xs" style={{ color: isDark ? '#94A3B8' : '#475569' }}>{stanza.description}</span>
      </div>
      <pre className="text-xs font-mono p-2 rounded-lg overflow-x-auto"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
          color: isIn ? '#93C5FD' : '#6EE7B7',
          border: `1px solid ${isIn ? 'rgba(0,122,255,0.20)' : 'rgba(16,185,129,0.20)'}`,
        }}>
        {stanza.rawXml}
      </pre>
    </div>
  );
}

// ── MAIN: CapstoneStudioView ──────────────────────────────────────────────────
export function CapstoneStudioView() {
  const {
    theme,
    files, activeFilePath, openTabPaths,
    updateFileContent, openFile,
    runVerificationSuite, isVerifying, verificationStages,
    xmppStanzas,
  } = useWorkspaceStore();

  const isDark = theme === 'dark';
  const [selectedMilestone, setSelectedMilestone] = useState<string>('ms-1');
  const [activeRightTab, setActiveRightTab] = useState<'supervision' | 'xmpp'>('supervision');
  const [editorMounted] = useState(true);
  const [verifyingMilestone, setVerifyingMilestone] = useState<string | null>(null);

  const activeFile = files.find((f) => f.path === activeFilePath);
  const currentMilestone = CAPSTONE_MILESTONES.find((m) => m.id === selectedMilestone)!;

  const handleVerifyMilestone = async (milestoneId: string) => {
    setVerifyingMilestone(milestoneId);
    await runVerificationSuite();
    setTimeout(() => setVerifyingMilestone(null), 2000);
  };

  return (
    <div
      className="flex w-full overflow-hidden"
      style={{ height: 'calc(100vh - 3.5rem)', marginTop: '3.5rem' }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — File Tree + Milestone Blueprint (22%)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col overflow-hidden flex-shrink-0"
        style={{
          width: '22%',
          borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
          background: isDark ? 'rgba(11,15,23,0.70)' : 'rgba(238,242,246,0.70)',
        }}
      >
        {/* Capstone Header */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="milestone-badge w-6 h-6 flex items-center justify-center text-xs">12</span>
            <span className="text-xs font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
              Capstone Studio
            </span>
          </div>
          <p className="text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            Production XMPP Server · 5 Modules
          </p>
        </div>

        {/* File Tree */}
        <div className="px-3 pb-3 flex-shrink-0">
          <div className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            OTP Application
          </div>
          {CAPSTONE_FILES.map((cf) => {
            const file = files.find((f) => f.path === cf.path);
            const isActive = activeFilePath === cf.path;
            return (
              <button
                key={cf.path}
                id={`capstone-file-${cf.label}`}
                onClick={() => openFile(cf.path)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 text-left transition-all duration-200"
                style={{
                  background: isActive
                    ? (isDark ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.10)')
                    : 'transparent',
                  color: isActive ? (isDark ? '#C4B5FD' : '#7C3AED') : (isDark ? '#94A3B8' : '#475569'),
                }}
              >
                <span className="text-base flex-shrink-0">{cf.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono truncate">{cf.label}</div>
                  {cf.behaviour && (
                    <div className="text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '0.6rem' }}>
                      -{cf.behaviour}
                    </div>
                  )}
                </div>
                {file?.isModified && (
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F59E0B' }} />
                )}
              </button>
            );
          })}
        </div>

        <div className="mx-3 border-t mb-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }} />

        {/* Milestone Blueprint */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            Milestone Blueprint
          </div>
          {CAPSTONE_MILESTONES.map((m) => {
            const isSelected = m.id === selectedMilestone;
            return (
              <button
                key={m.id}
                id={`milestone-${m.id}`}
                onClick={() => setSelectedMilestone(m.id)}
                className="w-full text-left rounded-xl p-3 mb-2 transition-all duration-200"
                style={{
                  background: isSelected
                    ? (isDark ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.10)')
                    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)'),
                  border: `1px solid ${isSelected ? 'rgba(139,92,246,0.35)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)')}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="milestone-badge w-5 h-5 text-xs flex items-center justify-center">
                    {m.number}
                  </span>
                  <span className="text-xs font-semibold"
                    style={{ color: isSelected ? (isDark ? '#C4B5FD' : '#7C3AED') : (isDark ? '#CBD5E1' : '#334155') }}>
                    {m.title}
                  </span>
                </div>
                <div className="text-xs font-mono"
                  style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '0.65rem' }}>
                  {m.targetFile}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CENTER PANE — Multi-tab Editor + Milestone Verifier (52%)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col overflow-hidden" style={{ width: '52%' }}>

        {/* Editor File Tabs */}
        <div
          className="flex items-center gap-1 px-3 flex-shrink-0 overflow-x-auto"
          style={{
            height: '44px',
            background: isDark ? 'rgba(11,15,23,0.60)' : 'rgba(238,242,246,0.60)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
          }}
        >
          {openTabPaths.map((path) => {
            const cf = CAPSTONE_FILES.find((f) => f.path === path);
            const file = files.find((f) => f.path === path);
            if (!file) return null;
            const isActive = path === activeFilePath;
            return (
              <button
                key={path}
                id={`capstone-tab-${file.name}`}
                onClick={() => openFile(path)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200"
                style={{
                  background: isActive
                    ? (isDark ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.10)')
                    : 'transparent',
                  color: isActive ? (isDark ? '#C4B5FD' : '#7C3AED') : (isDark ? '#64748B' : '#94A3B8'),
                }}
              >
                <span>{cf?.icon ?? '📄'}</span>
                <span className="font-mono">{file.name}</span>
                {file.isModified && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F59E0B' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Monaco Editor — center */}
        <div className="flex-1 overflow-hidden">
          {MonacoEditor ? (
            <MonacoEditor
              language="erlang"
              path={activeFile?.path || 'capstone.erl'}
              value={activeFile?.content ?? '% Select a file from the sidebar to start editing.\n'}
              theme={isDark ? 'beamforge-dark' : 'beamforge-light'}
              beforeMount={(monaco: any) => {
                configureMonacoErlang(monaco);
              }}
              onMount={(editor: any, monaco: any) => {
                configureMonacoErlang(monaco);
                const model = editor.getModel();
                if (model) {
                  monaco.editor.setModelLanguage(model, 'erlang');
                }
                monaco.editor.setTheme(isDark ? 'beamforge-dark' : 'beamforge-light');
              }}
              onChange={(val: string) => {
                if (activeFile) updateFileContent(activeFile.path, val ?? '');
              }}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontWeight: '500',
                fontLigatures: true,
                lineHeight: 22,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'gutter',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                readOnly: activeFile?.isReadOnly ?? false,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-sm" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>Loading editor…</div>
            </div>
          )}
        </div>

        {/* Milestone Verifier Footer */}
        <div
          className="flex-shrink-0 overflow-y-auto"
          style={{
            maxHeight: '200px',
            background: isDark ? 'rgba(11,15,23,0.85)' : 'rgba(248,250,252,0.85)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
          }}
        >
          {/* Milestone Description */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="milestone-badge w-6 h-6 text-xs flex items-center justify-center">
                  {currentMilestone.number}
                </span>
                <span className="text-sm font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  {currentMilestone.title}
                </span>
              </div>

              {/* Verify Milestone Button */}
              <button
                id={`verify-milestone-${currentMilestone.number}`}
                onClick={() => handleVerifyMilestone(currentMilestone.id)}
                disabled={isVerifying}
                className="btn-submit flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50"
              >
                {verifyingMilestone === currentMilestone.id
                  ? <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
                  : '▶'}
                Verify Milestone {currentMilestone.number}
              </button>
            </div>

            <p className="text-xs mb-2 leading-relaxed" style={{ color: isDark ? '#94A3B8' : '#475569' }}>
              {currentMilestone.description}
            </p>

            <div className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: isDark ? 'rgba(139,92,246,0.10)' : 'rgba(139,92,246,0.06)',
                border: '1px solid rgba(139,92,246,0.20)',
                color: isDark ? '#A78BFA' : '#7C3AED',
              }}>
              <strong>💡 Hint:</strong> {currentMilestone.verificationHint}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>Implement:</span>
              {currentMilestone.targetFunctions.map((fn) => (
                <code key={fn} className="text-xs px-1.5 py-0.5 rounded-md font-mono"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                  {fn}
                </code>
              ))}
            </div>
          </div>

          {/* Verification Stages */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-2 gap-1.5">
              {verificationStages.slice(0, 4).map((s) => {
                const statusColor = s.status === 'passed' ? '#10B981' : s.status === 'failed' ? '#EF4444' : s.status === 'running' ? '#007AFF' : (isDark ? '#64748B' : '#94A3B8');
                return (
                  <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}`,
                    }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                    <span className="text-xs truncate" style={{ color: statusColor }}>{s.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT INSPECTOR PANE — BEAM Supervision Tree + XMPP Stanza Terminal (26%)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col overflow-hidden flex-shrink-0"
        style={{
          width: '26%',
          borderLeft: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
          background: isDark ? 'rgba(11,15,23,0.70)' : 'rgba(238,242,246,0.70)',
        }}
      >
        {/* Right Inspector Tabs */}
        <div
          className="flex items-center gap-1 px-3 flex-shrink-0"
          style={{
            height: '44px',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
          }}
        >
          {([
            { key: 'supervision' as const, label: '🌳 Supervision Tree' },
            { key: 'xmpp' as const, label: '📡 XMPP Stream' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              id={`capstone-inspector-tab-${key}`}
              onClick={() => setActiveRightTab(key)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: activeRightTab === key
                  ? (isDark ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.10)')
                  : 'transparent',
                color: activeRightTab === key ? (isDark ? '#C4B5FD' : '#7C3AED') : (isDark ? '#64748B' : '#94A3B8'),
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Supervision Tree */}
        {activeRightTab === 'supervision' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              Live BEAM Supervision Tree
            </div>
            <SupervisionTreeNode node={SUPERVISION_TREE} isDark={isDark} />

            <div className="mt-4 pt-4 border-t"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
              <div className="text-xs mb-2 font-semibold" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                Legend
              </div>
              {[
                { color: '#8B5CF6', label: 'Supervisor' },
                { color: '#10B981', label: 'Worker gen_server' },
                { color: '#38BDF8', label: 'Dynamic C2S gen_statem' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: `${color}33`, border: `1.5px solid ${color}` }} />
                  <span className="text-xs" style={{ color: isDark ? '#94A3B8' : '#475569' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* XMPP Stanza Terminal */}
        {activeRightTab === 'xmpp' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              Live XMPP Stanza Stream
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-xs">
              <div className="flex items-center gap-1">
                <span style={{ color: '#007AFF' }}>← C→S</span>
                <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>Client inbound</span>
              </div>
              <div className="flex items-center gap-1">
                <span style={{ color: '#10B981' }}>→ S→C</span>
                <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>Server outbound</span>
              </div>
            </div>

            {xmppStanzas.length > 0
              ? xmppStanzas.slice(0, 20).map((stanza) => (
                  <XmppStanzaEntry key={stanza.id} stanza={stanza} isDark={isDark} />
                ))
              : <div className="text-center py-8 text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                  No stanzas yet. Implement the C2S gen_statem and verify to see live XML flows.
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}
