'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, 
  Activity, 
  Sparkles, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Radio, 
  X,
  Send,
  Cpu
} from 'lucide-react';
import { LessonGuidePane } from './LessonGuidePane';
import { VerificationDrawer } from './VerificationDrawer';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { getLevelById } from '../../data/curriculumCatalog';

// SSR-Safe dynamic import for Monaco Erlang Editor
const ErlangEditor = dynamic(
  () => import('../editor/ErlangEditor').then((m) => m.ErlangEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full bg-white text-ios-muted font-mono text-xs">
        Loading Monaco Daylight Runtime...
      </div>
    ),
  }
);

// SSR-Safe dynamic import for BEAM Process Graph Observer
const BeamGraphObserver = dynamic(
  () => import('../observer/BeamGraphObserver').then((m) => m.BeamGraphObserver),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full bg-white/60 text-ios-muted font-mono text-xs">
        Initializing BEAM Process Canvas...
      </div>
    ),
  }
);

export function GlassWorkspace() {
  const { 
    activeExerciseId, 
    devModeUnlockedAll,
    xmppState,
    socketMode,
    setSocketMode,
    sendFragmentedXmlPacket,
    xmppStanzas
  } = useWorkspaceStore();

  const [rightViewMode, setRightViewMode] = useState<'editor' | 'graph'>('editor');
  const [showXmppDrawer, setShowXmppDrawer] = useState(false);

  const level = getLevelById(activeExerciseId);
  const capabilityMode = level?.capabilityMode || 'code_only';
  const isGraphUnlocked = capabilityMode === 'beam_graph' || capabilityMode === 'xmpp_full' || devModeUnlockedAll;
  const isXmppUnlocked = capabilityMode === 'xmpp_full' || devModeUnlockedAll;

  return (
    <div className="w-full h-full pt-16 pb-4 px-4 flex gap-4 overflow-hidden">
      {/* Left Glass Card (38% Width - Lesson Guide & Vault) */}
      <motion.section 
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="w-[38%] h-full flex flex-col min-w-[360px] max-w-[540px]"
      >
        <LessonGuidePane />
      </motion.section>

      {/* Right Glass Card (62% Width - Editor & Verification Drawer) */}
      <motion.section 
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 h-full flex flex-col glass-panel overflow-hidden border border-white/80 shadow-glass-panel relative"
      >
        {/* Conditional Header Bar (Progressive Capability Unlocking) */}
        {isGraphUnlocked && (
          <div className="h-10 px-4 bg-white/70 border-b border-slate-200/70 flex items-center justify-between shrink-0 select-none">
            {/* View Switcher: Code Editor vs BEAM Graph */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
              <button
                onClick={() => setRightViewMode('editor')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  rightViewMode === 'editor'
                    ? 'bg-white text-ios-blue shadow-sm'
                    : 'text-ios-muted hover:text-ios-slate'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code Editor</span>
              </button>

              <button
                onClick={() => setRightViewMode('graph')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  rightViewMode === 'graph'
                    ? 'bg-white text-ios-blue shadow-sm'
                    : 'text-ios-muted hover:text-ios-slate'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Activity className="w-3.5 h-3.5" />
                <span>Live BEAM Graph</span>
              </button>
            </div>

            {/* XMPP Inspector Trigger (Unlocked in World 5) */}
            {isXmppUnlocked && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowXmppDrawer(!showXmppDrawer)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    showXmppDrawer
                      ? 'bg-ios-blue text-white border-ios-blue shadow-sm'
                      : 'bg-white/80 text-ios-slate border-slate-200 hover:bg-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>XMPP Stanza Deck</span>
                  <span className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {xmppStanzas.length}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Workspace Body */}
        <div className="flex-1 w-full relative overflow-hidden bg-white">
          {rightViewMode === 'editor' ? (
            <ErlangEditor />
          ) : (
            <BeamGraphObserver />
          )}

          {/* Slide-over XMPP Stanza Deck (World 5) */}
          <AnimatePresence>
            {isXmppUnlocked && showXmppDrawer && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.2 }}
                className="absolute top-2 right-2 bottom-2 w-96 glass-panel p-4 shadow-glass-float border border-white flex flex-col z-20"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-ios-blue" />
                    <h3 className="text-xs font-bold text-ios-slate">XMPP C2S Stanza Deck</h3>
                  </div>
                  <button
                    onClick={() => setShowXmppDrawer(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Flow Control Setting */}
                <div className="py-2.5 border-b border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-ios-muted">Socket Backpressure:</span>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <button
                      onClick={() => setSocketMode('{active, once}')}
                      className={`px-2 py-0.5 rounded ${
                        socketMode === '{active, once}'
                          ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      &#123;active, once&#125;
                    </button>
                    <button
                      onClick={() => setSocketMode('{active, true}')}
                      className={`px-2 py-0.5 rounded ${
                        socketMode === '{active, true}'
                          ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      &#123;active, true&#125;
                    </button>
                  </div>
                </div>

                {/* Packet Injector */}
                <div className="py-2.5 border-b border-slate-100">
                  <button
                    onClick={() => sendFragmentedXmlPacket()}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-ios-blue hover:bg-ios-blue-hover text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Fragmented TCP Packet</span>
                  </button>
                </div>

                {/* Stanza Stream List */}
                <div className="flex-1 overflow-y-auto pt-2 space-y-2">
                  {xmppStanzas.map((st) => (
                    <div
                      key={st.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className={st.direction === 'in' ? 'text-ios-blue font-bold' : 'text-emerald-600 font-bold'}>
                          {st.direction === 'in' ? '→ CLIENT RECV' : '← SERVER EMIT'}
                        </span>
                        <span>{st.timestamp}</span>
                      </div>
                      <pre className="text-ios-slate bg-white p-1.5 rounded border border-slate-200/60 overflow-x-auto text-[11px]">
                        {st.rawXml}
                      </pre>
                      <p className="text-[10px] text-ios-muted mt-1 font-sans">
                        {st.description}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsible Verification Drawer on Bottom */}
        <VerificationDrawer />
      </motion.section>
    </div>
  );
}
