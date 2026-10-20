'use client';

import React, { useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { X, FileCode, CheckCircle2 } from 'lucide-react';

import { configureMonacoErlang } from '../../lib/monacoErlang';

export const ErlangEditor: React.FC = () => {
  const {
    files,
    activeFilePath,
    openTabPaths,
    openFile,
    closeTab,
    updateFileContent,
    theme,
  } = useWorkspaceStore();

  const activeFile = files.find((f) => f.path === activeFilePath) || files[0];
  const monacoRef = useRef<Monaco | null>(null);

  // Configure Monarch highlighter & theme when Monaco is ready
  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    configureMonacoErlang(monaco);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden select-none">
      {/* Top Tabs Bar */}
      <div className="flex items-center justify-between h-9 bg-slate-50/80 border-b border-slate-200/80 px-2 shrink-0">
        <div className="flex items-center space-x-1.5 overflow-x-auto h-full py-1">
          {openTabPaths.map((path) => {
            const f = files.find((file) => file.path === path);
            if (!f) return null;
            const isActive = path === activeFilePath;
            return (
              <div
                key={path}
                onClick={() => openFile(path)}
                className={`group flex items-center space-x-2 px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-white text-ios-slate border-slate-200 shadow-sm font-semibold'
                    : 'text-ios-muted hover:text-ios-slate border-transparent hover:bg-slate-100/70'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-ios-blue' : 'text-slate-400'}`} />
                <span className="truncate max-w-[150px]">{f.name}</span>
                {f.isModified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                )}
                {openTabPaths.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(path);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 rounded p-0.5 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Monaco Code Editor Instance */}
      <div className="flex-1 w-full relative overflow-hidden bg-white">
        {activeFile ? (
          <Editor
            height="100%"
            width="100%"
            language="erlang"
            theme={theme === 'dark' ? 'beamforge-dark' : 'beamforge-light'}
            path={activeFile.path}
            value={activeFile.content}
            beforeMount={handleEditorWillMount}
            onChange={(val) => updateFileContent(activeFile.path, val || '')}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontWeight: '500',
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'all',
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: 'on',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 12, bottom: 12 },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-ios-muted font-mono text-xs">
            Select a file to edit
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-slate-50 border-t border-slate-200/80 px-3 flex items-center justify-between text-[11px] text-ios-muted font-mono shrink-0">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-ios-slate">{activeFile?.name || 'No file open'}</span>
          <span>UTF-8</span>
          <span>Erlang/OTP 29</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>BeamForge VFS</span>
        </div>
      </div>
    </div>
  );
};
