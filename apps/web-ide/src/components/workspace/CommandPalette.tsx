'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { 
  Command, 
  Search, 
  Play, 
  Skull, 
  Flame, 
  Layers, 
  FileCode, 
  Network, 
  Trash2,
  ArrowRight
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    runVerificationSuite,
    killProcess,
    selectedNodeId,
    injectMailboxFlood,
    switchExercise,
    files,
    openFile,
    clearTerminal,
    sendFragmentedXmlPacket,
  } = useWorkspaceStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcuts (Cmd+K / Ctrl+P / Cmd+Enter / Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runVerificationSuite();
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen, runVerificationSuite]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const actions = [
    {
      id: 'verify',
      title: 'Run Chaos Verification Suite',
      description: 'Execute in-memory compiler, EUnit, TCO check & fault injection',
      icon: Play,
      category: 'Grading',
      run: () => runVerificationSuite(),
    },
    {
      id: 'kill',
      title: 'Kill Active Process (exit(Pid, kill))',
      description: `Inject fatal exit signal into PID ${selectedNodeId || '<0.142.0>'}`,
      icon: Skull,
      category: 'Chaos',
      run: () => killProcess(selectedNodeId || '<0.142.0>'),
    },
    {
      id: 'flood',
      title: 'Simulate Mailbox Backpressure Flood',
      description: 'Send 4,200 stanzas to trigger {active, true} warning',
      icon: Flame,
      category: 'Chaos',
      run: () => injectMailboxFlood(selectedNodeId || '<0.142.0>'),
    },
    {
      id: 'xmpp_frag',
      title: 'Send Fragmented TCP XML Stream',
      description: 'Split stream headers across arbitrary TCP packet boundaries',
      icon: Network,
      category: 'XMPP',
      run: () => sendFragmentedXmlPacket(),
    },
    {
      id: 'ex_otp4',
      title: 'Switch Exercise: Fault-Tolerant Session Cache with ETS Heir',
      description: 'Track 3: Production OTP & ETS Heir Resilience',
      icon: Layers,
      category: 'Curriculum',
      run: () => switchExercise('otp-04-ets-heir-resilience'),
    },
    {
      id: 'ex_xmpp3',
      title: 'Switch Exercise: XMPP C2S Stream Handshake',
      description: 'Track 5: XMPP Distributed Real-Time Architecture',
      icon: Layers,
      category: 'Curriculum',
      run: () => switchExercise('xmpp-03-c2s-statem-handshake'),
    },
    ...files.map((file) => ({
      id: `file_${file.path}`,
      title: `Open File: ${file.name}`,
      description: file.path,
      icon: FileCode,
      category: 'Files',
      run: () => openFile(file.path),
    })),
    {
      id: 'clear_term',
      title: 'Clear Terminal Output',
      description: 'Reset rebar3 interactive shell buffer',
      icon: Trash2,
      category: 'Terminal',
      run: () => clearTerminal(),
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.description.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  const executeAction = (action: (typeof actions)[0]) => {
    action.run();
    setCommandPaletteOpen(false);
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md flex items-start justify-center pt-24 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl glass-panel border border-white/90 rounded-2xl shadow-glass-float overflow-hidden font-sans text-xs"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200/80 bg-white/90">
          <Search className="w-4 h-4 text-ios-blue mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % Math.max(1, filtered.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
              } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                e.preventDefault();
                executeAction(filtered[selectedIndex]);
              }
            }}
            placeholder="Type a command or search files... (Esc to exit)"
            className="w-full bg-transparent text-ios-slate placeholder:text-slate-400 focus:outline-none text-xs"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 border border-slate-200 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-ios-muted text-xs">
              No matching commands or files found
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => executeAction(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-ios-blue/10 border border-ios-blue/20 text-ios-blue font-semibold'
                      : 'hover:bg-slate-100/60 text-ios-slate'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-ios-blue' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <span className="font-semibold block truncate text-xs">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-ios-muted block truncate font-normal">
                        {item.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 ml-2 flex-shrink-0 font-mono font-medium">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-ios-muted">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>BeamForge Daylight IDE</span>
        </div>
      </div>
    </div>
  );
};
