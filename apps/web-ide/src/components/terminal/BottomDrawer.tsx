'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { 
  Terminal as TerminalIcon, 
  ShieldAlert, 
  Network, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Send,
  Zap,
  Cpu
} from 'lucide-react';

export const BottomDrawer: React.FC = () => {
  const {
    bottomDrawerTab,
    setBottomDrawerTab,
    isBottomDrawerExpanded,
    toggleBottomDrawer,
    terminalEntries,
    executeTerminalCommand,
    clearTerminal,
    isVerifying,
    verificationStages,
    runVerificationSuite,
    xmppState,
    socketMode,
    setSocketMode,
    xmppStanzas,
    sendFragmentedXmlPacket,
  } = useWorkspaceStore();

  const [inputCmd, setInputCmd] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (bottomDrawerTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalEntries, bottomDrawerTab]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    executeTerminalCommand(inputCmd);
    setInputCmd('');
  };

  const xmppStates = [
    { key: 'wait_for_stream', label: '1. Wait For Stream' },
    { key: 'wait_for_features', label: '2. Features Advertised' },
    { key: 'wait_for_sasl', label: '3. SASL Auth' },
    { key: 'authenticated', label: '4. Authenticated' },
    { key: 'session_established', label: '5. Session Established' },
  ];

  return (
    <div
      className={`flex flex-col bg-obsidian-editor border-t border-obsidian-border transition-all duration-200 select-none ${
        isBottomDrawerExpanded ? 'h-96' : 'h-64'
      }`}
    >
      {/* Drawer Tab Headers */}
      <div className="flex items-center justify-between h-9 bg-obsidian-sidebar border-b border-obsidian-border px-3 text-xs font-mono">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setBottomDrawerTab('terminal')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-colors ${
              bottomDrawerTab === 'terminal'
                ? 'bg-obsidian-editor text-obsidian-text-primary border border-obsidian-border font-semibold shadow-sm'
                : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5 text-beam-emerald" />
            <span>rebar3 shell (learner@127.0.0.1)</span>
          </button>

          <button
            onClick={() => setBottomDrawerTab('chaos')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-colors ${
              bottomDrawerTab === 'chaos'
                ? 'bg-obsidian-editor text-obsidian-text-primary border border-obsidian-border font-semibold shadow-sm'
                : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-obsidian-accent" />
            <span>Chaos Verification Pipeline</span>
            {isVerifying && (
              <span className="w-2 h-2 rounded-full bg-obsidian-accent animate-ping" />
            )}
          </button>

          <button
            onClick={() => setBottomDrawerTab('xmpp')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-colors ${
              bottomDrawerTab === 'xmpp'
                ? 'bg-obsidian-editor text-obsidian-text-primary border border-obsidian-border font-semibold shadow-sm'
                : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-beam-cyan" />
            <span>XMPP Stream & C2S Inspector</span>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2">
          {bottomDrawerTab === 'terminal' && (
            <button
              onClick={clearTerminal}
              className="p-1 rounded text-obsidian-text-muted hover:text-beam-crimson transition-colors"
              title="Clear Terminal Output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {bottomDrawerTab === 'chaos' && (
            <button
              onClick={() => runVerificationSuite()}
              disabled={isVerifying}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-obsidian-accent/20 hover:bg-obsidian-accent/30 text-obsidian-accent border border-obsidian-accent/40 font-semibold transition-all disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isVerifying ? 'Verifying...' : 'Run Verification (Cmd+Enter)'}</span>
            </button>
          )}

          <button
            onClick={toggleBottomDrawer}
            className="p-1 rounded text-obsidian-text-muted hover:text-obsidian-text-primary transition-colors"
            title={isBottomDrawerExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
          >
            {isBottomDrawerExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Drawer Body Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Tab 1: Terminal Shell */}
        {bottomDrawerTab === 'terminal' && (
          <div className="flex flex-col h-full font-mono text-xs p-3 overflow-y-auto">
            <div className="flex-1 space-y-1">
              {terminalEntries.map((entry) => {
                if (entry.type === 'input') {
                  return (
                    <div key={entry.id} className="flex items-center space-x-2 text-obsidian-accent">
                      <span className="font-bold text-obsidian-text-muted">&gt;</span>
                      <span className="text-obsidian-text-primary font-semibold">{entry.text}</span>
                    </div>
                  );
                }
                if (entry.type === 'otp_report') {
                  return (
                    <div
                      key={entry.id}
                      className="p-2.5 my-1 rounded bg-beam-crimson/10 border-l-2 border-beam-crimson text-beam-crimson font-mono text-[11px] whitespace-pre-wrap leading-relaxed shadow-sm"
                    >
                      {entry.text}
                    </div>
                  );
                }
                if (entry.type === 'error') {
                  return (
                    <div key={entry.id} className="text-beam-amber my-0.5 font-medium">
                      {entry.text}
                    </div>
                  );
                }
                return (
                  <div key={entry.id} className="text-obsidian-text-muted leading-relaxed">
                    {entry.text}
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>

            {/* Input Line */}
            <form onSubmit={handleCommandSubmit} className="flex items-center space-x-2 pt-2 border-t border-obsidian-border/50">
              <span className="text-obsidian-accent font-bold">&gt;</span>
              <input
                type="text"
                value={inputCmd}
                onChange={(e) => setInputCmd(e.target.value)}
                placeholder={'Type Erlang expression (e.g. session_cache:get_session(<<"user_42">>). or help().)'}
                className="flex-1 bg-transparent text-obsidian-text-primary focus:outline-none font-mono text-xs"
              />
              <button
                type="submit"
                className="p-1 rounded text-obsidian-text-muted hover:text-obsidian-accent"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Chaos Verification Pipeline */}
        {bottomDrawerTab === 'chaos' && (
          <div className="h-full p-4 font-mono text-xs overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {verificationStages.map((stage, idx) => {
                const isPassed = stage.status === 'passed';
                const isRunning = stage.status === 'running';
                const isPending = stage.status === 'pending';

                return (
                  <div
                    key={stage.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isPassed
                        ? 'bg-beam-emerald/5 border-beam-emerald/30 text-obsidian-text-primary'
                        : isRunning
                        ? 'bg-obsidian-accent/10 border-obsidian-accent text-obsidian-text-primary animate-pulse'
                        : 'bg-obsidian-surface border-obsidian-border text-obsidian-text-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs">{stage.title}</span>
                      {isPassed && (
                        <div className="flex items-center space-x-1 text-beam-emerald font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PASSED ({stage.timeMs}ms)</span>
                        </div>
                      )}
                      {isRunning && (
                        <span className="text-obsidian-accent font-semibold text-[11px]">
                          RUNNING...
                        </span>
                      )}
                      {isPending && (
                        <span className="text-obsidian-text-dim text-[11px]">QUEUED</span>
                      )}
                    </div>
                    <p className="text-[11px] text-obsidian-text-muted leading-relaxed">
                      {stage.assertionDetails}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Verification Summary Banner */}
            {verificationStages.every((s) => s.status === 'passed') && (
              <div className="p-3 bg-beam-emerald/10 border border-beam-emerald/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2 text-beam-emerald">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <span className="font-bold text-sm block">
                      All 4 Verification & Chaos Checks Passed (100 / 100)
                    </span>
                    <span className="text-[11px] text-obsidian-text-muted">
                      Cryptographic Result Signature: ed25519:7f8a91c2b4d5e8f901ab34cd56ef...
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => runVerificationSuite()}
                  className="px-3 py-1.5 rounded bg-beam-emerald/20 hover:bg-beam-emerald/30 text-beam-emerald font-semibold text-xs transition-colors"
                >
                  Re-run Suite
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: XMPP Stream & C2S Inspector */}
        {bottomDrawerTab === 'xmpp' && (
          <div className="flex flex-col h-full font-mono text-xs p-3 overflow-hidden">
            {/* Top State Flow & Controls Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-obsidian-border/70 mb-3">
              {/* C2S State Flow Machine */}
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {xmppStates.map((st, i) => {
                  const isActive = st.key === xmppState;
                  return (
                    <React.Fragment key={st.key}>
                      <div
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          isActive
                            ? 'bg-obsidian-accent text-white shadow-obsidian-glow'
                            : 'bg-obsidian-surface text-obsidian-text-muted border border-obsidian-border'
                        }`}
                      >
                        {st.label}
                      </div>
                      {i < xmppStates.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-obsidian-border" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Socket Mode Indicator & Packet Injector */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-obsidian-surface border border-obsidian-border text-[11px]">
                  <span className="text-obsidian-text-muted">Flow Control:</span>
                  <span className="text-beam-emerald font-bold">{socketMode}</span>
                </div>

                <button
                  onClick={sendFragmentedXmlPacket}
                  className="px-2.5 py-1 rounded bg-beam-cyan/20 hover:bg-beam-cyan/30 text-beam-cyan border border-beam-cyan/40 font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Send Fragmented TCP XML</span>
                </button>
              </div>
            </div>

            {/* XML Stanzas Stream Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {xmppStanzas.map((stanza) => {
                const isIncoming = stanza.direction === 'in';
                return (
                  <div
                    key={stanza.id}
                    className="p-2.5 rounded bg-obsidian-surface border border-obsidian-border flex flex-col space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            isIncoming
                              ? 'bg-beam-cyan/20 text-beam-cyan border border-beam-cyan/40'
                              : 'bg-obsidian-accent/20 text-obsidian-accent border border-obsidian-accent/40'
                          }`}
                        >
                          {isIncoming ? 'INCOMING (TCP)' : 'OUTGOING (STN)'}
                        </span>
                        <span className="text-obsidian-text-dim">{stanza.timestamp}</span>
                        <span className="text-obsidian-text-muted font-medium">
                          {stanza.description}
                        </span>
                      </div>
                    </div>
                    <pre className="text-[11px] text-beam-cyan overflow-x-auto whitespace-pre-wrap font-mono p-1.5 bg-obsidian-editor rounded border border-obsidian-border/50">
                      {stanza.rawXml}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
