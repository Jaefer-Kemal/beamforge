'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  Lock, 
  ChevronRight, 
  ChevronDown, 
  CheckSquare, 
  Square,
  Sparkles,
  BookOpen,
  Layers,
  ArrowRight
} from 'lucide-react';

export const LessonVaultDrawer: React.FC = () => {
  const {
    isLeftDrawerOpen,
    activeRibbonTab,
    files,
    activeFilePath,
    openFile,
    exercises,
    activeExerciseId,
    switchExercise,
  } = useWorkspaceStore();

  const currentExercise = exercises[activeExerciseId];
  const [srcFolderOpen, setSrcFolderOpen] = useState(true);
  const [includeFolderOpen, setIncludeFolderOpen] = useState(true);
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({
    step1: true,
    step2: true,
    step3: false,
    step4: false,
  });

  if (!isLeftDrawerOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedCriteria((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-72 h-full bg-obsidian-sidebar border-r border-obsidian-border flex flex-col select-none overflow-hidden text-xs font-mono">
      {/* Exercise Manifest Header */}
      <div className="p-3 border-b border-obsidian-border bg-obsidian-surface/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-obsidian-accent font-semibold tracking-wider uppercase">
            {currentExercise.track}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-obsidian-editor text-obsidian-text-dim border border-obsidian-border">
            OTP 29
          </span>
        </div>
        <h2 className="text-xs font-bold text-obsidian-text-primary leading-tight">
          {currentExercise.title}
        </h2>
      </div>

      {/* Main Drawer Scroll Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Section 1: Virtual rebar3 Filesystem Tree */}
        <div className="p-2 border-b border-obsidian-border/60">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-obsidian-text-muted">
            <span>REBAR3 PROJECT FILES</span>
            <span className="text-[10px] text-obsidian-text-dim">{files.length} files</span>
          </div>

          <div className="mt-1 space-y-0.5">
            {/* src/ folder */}
            <div>
              <div
                onClick={() => setSrcFolderOpen(!srcFolderOpen)}
                className="flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-obsidian-surface cursor-pointer text-obsidian-text-muted hover:text-obsidian-text-primary"
              >
                {srcFolderOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                {srcFolderOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-obsidian-accent" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-obsidian-accent" />
                )}
                <span className="font-semibold text-obsidian-text-primary">src</span>
              </div>

              {srcFolderOpen && (
                <div className="ml-4 pl-1 border-l border-obsidian-border/50 space-y-0.5">
                  {files
                    .filter((f) => f.path.startsWith('src/'))
                    .map((file) => {
                      const isActive = file.path === activeFilePath;
                      return (
                        <div
                          key={file.path}
                          onClick={() => openFile(file.path)}
                          className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-obsidian-surface text-obsidian-accent font-semibold border-l-2 border-obsidian-accent'
                              : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface/60'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            <FileCode className="w-3.5 h-3.5 text-obsidian-accent flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          {file.isModified && (
                            <span className="w-1.5 h-1.5 rounded-full bg-beam-amber flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* include/ folder if any */}
            {files.some((f) => f.path.startsWith('include/')) && (
              <div>
                <div
                  onClick={() => setIncludeFolderOpen(!includeFolderOpen)}
                  className="flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-obsidian-surface cursor-pointer text-obsidian-text-muted hover:text-obsidian-text-primary"
                >
                  {includeFolderOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {includeFolderOpen ? (
                    <FolderOpen className="w-3.5 h-3.5 text-beam-cyan" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-beam-cyan" />
                  )}
                  <span className="font-semibold text-obsidian-text-primary">include</span>
                </div>

                {includeFolderOpen && (
                  <div className="ml-4 pl-1 border-l border-obsidian-border/50 space-y-0.5">
                    {files
                      .filter((f) => f.path.startsWith('include/'))
                      .map((file) => {
                        const isActive = file.path === activeFilePath;
                        return (
                          <div
                            key={file.path}
                            onClick={() => openFile(file.path)}
                            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-obsidian-surface text-beam-cyan font-semibold border-l-2 border-beam-cyan'
                                : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface/60'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              <FileText className="w-3.5 h-3.5 text-beam-cyan flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* rebar.config at root */}
            {files
              .filter((f) => !f.path.includes('/'))
              .map((file) => {
                const isActive = file.path === activeFilePath;
                return (
                  <div
                    key={file.path}
                    onClick={() => openFile(file.path)}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-obsidian-surface text-obsidian-text-primary font-semibold'
                        : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface/60'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-beam-amber flex-shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    {file.isReadOnly && <Lock className="w-3 h-3 text-obsidian-text-dim" />}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Section 2: Obsidian Markdown Lesson Vault */}
        <div className="p-3 font-sans">
          <div className="flex items-center space-x-1.5 text-[11px] font-mono font-semibold text-obsidian-accent mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>EXERCISE SPECIFICATION</span>
          </div>

          {/* Under the Hood Callout */}
          <div className="obsidian-callout text-[11px] leading-relaxed">
            <span className="font-bold text-obsidian-accent block mb-1">
              [!abstract] Under the Hood
            </span>
            <p className="text-obsidian-text-muted">
              ETS tables are bound to their creating process. If that worker dies, memory is freed unless an 
              <span className="text-beam-amber font-mono font-semibold"> {'{heir, HeirPid, HeirData}'} </span> 
              is registered to catch the table during supervisor restart.
            </p>
          </div>

          {/* Warning Callout */}
          <div className="obsidian-callout obsidian-callout-warning text-[11px] leading-relaxed">
            <span className="font-bold text-beam-amber block mb-1">
              [!warning] BEAM Memory Trap
            </span>
            <p className="text-obsidian-text-muted">
              Do NOT call <code className="text-beam-amber font-mono">ets:new/2</code> blindly on worker restart if the table is named, or you will trigger a fatal <code className="text-beam-crimson font-mono">badarg</code> crash!
            </p>
          </div>

          {/* Verification Criteria Checklist */}
          <div className="mt-3 pt-2 border-t border-obsidian-border/60">
            <span className="text-[11px] font-mono font-semibold text-obsidian-text-muted block mb-2">
              VERIFICATION CRITERIA
            </span>
            <div className="space-y-2 font-mono text-[11px]">
              <div
                onClick={() => toggleCheck('step1')}
                className="flex items-start space-x-2 cursor-pointer group"
              >
                {checkedCriteria.step1 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-beam-emerald mt-0.5" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-obsidian-text-dim mt-0.5" />
                )}
                <span className={checkedCriteria.step1 ? 'text-obsidian-text-primary line-through opacity-70' : 'text-obsidian-text-muted'}>
                  1. Designated heir in table opts
                </span>
              </div>

              <div
                onClick={() => toggleCheck('step2')}
                className="flex items-start space-x-2 cursor-pointer group"
              >
                {checkedCriteria.step2 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-beam-emerald mt-0.5" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-obsidian-text-dim mt-0.5" />
                )}
                <span className={checkedCriteria.step2 ? 'text-obsidian-text-primary line-through opacity-70' : 'text-obsidian-text-muted'}>
                  2. Table manager traps exit
                </span>
              </div>

              <div
                onClick={() => toggleCheck('step3')}
                className="flex items-start space-x-2 cursor-pointer group"
              >
                {checkedCriteria.step3 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-beam-emerald mt-0.5" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-obsidian-text-dim mt-0.5" />
                )}
                <span className={checkedCriteria.step3 ? 'text-obsidian-text-primary line-through opacity-70' : 'text-obsidian-text-muted'}>
                  3. Worker restart reclaims table
                </span>
              </div>

              <div
                onClick={() => toggleCheck('step4')}
                className="flex items-start space-x-2 cursor-pointer group"
              >
                {checkedCriteria.step4 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-beam-emerald mt-0.5" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-obsidian-text-dim mt-0.5" />
                )}
                <span className={checkedCriteria.step4 ? 'text-obsidian-text-primary line-through opacity-70' : 'text-obsidian-text-muted'}>
                  4. Zero session rows lost on crash
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
