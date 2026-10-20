'use client';

import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { 
  BookOpen, 
  CheckCircle2, 
  ExternalLink, 
  FileCode, 
  Lightbulb, 
  Sparkles, 
  ShieldCheck, 
  HelpCircle,
  ArrowUpRight,
  ChevronRight,
  RotateCcw,
  Code2
} from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { getLevelById, ExternalReference } from '../../data/curriculumCatalog';

export function LessonGuidePane() {
  const { 
    activeExerciseId, 
    verificationStages, 
    loadSolutionForActiveExercise, 
    resetWorkspace 
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<string>('concept');
  const level = getLevelById(activeExerciseId);

  if (!level) {
    return (
      <div className="h-full flex items-center justify-center text-ios-muted text-xs">
        No active curriculum level loaded.
      </div>
    );
  }

  // Helper to render markdown content with daylight typography
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeLanguage = '';

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.replace('```', '').trim();
          codeBlockLines = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <div key={`code-${index}`} className="my-3 rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900 text-slate-100 shadow-sm">
              <div className="bg-slate-800/80 px-3.5 py-1 text-[10px] font-mono text-slate-400 flex items-center justify-between border-b border-slate-700/60">
                <span>{codeLanguage || 'erlang'}</span>
              </div>
              <pre className="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed text-emerald-400">
                <code>{codeBlockLines.join('\n')}</code>
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-base font-bold text-ios-slate mt-5 mb-2 tracking-tight">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${index}`} className="text-xs font-bold text-ios-slate uppercase tracking-wider text-ios-blue mt-4 mb-1.5 font-mono">
            {line.replace('#### ', '')}
          </h4>
        );
      } else if (line.startsWith('> [!NOTE]') || line.startsWith('> **Note:**')) {
        elements.push(
          <div key={`note-${index}`} className="my-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs flex gap-2.5 shadow-sm">
            <Lightbulb className="w-4 h-4 text-ios-blue shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">
              {line.replace('> [!NOTE]', '').replace('> **Note:**', '').trim()}
            </div>
          </div>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={`li-${index}`} className="flex items-start gap-2 my-1 text-xs text-ios-slate leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-ios-blue shrink-0 mt-1.5" />
            <span>{line.substring(2)}</span>
          </div>
        );
      } else if (line.trim().length > 0) {
        elements.push(
          <p key={`p-${index}`} className="text-xs text-ios-slate/90 leading-relaxed my-2">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="h-full flex flex-col glass-panel overflow-hidden border border-white/80 shadow-glass-panel">
      {/* Pane Header with Title & Level Badge */}
      <div className="p-4 border-b border-slate-200/60 flex items-center justify-between shrink-0 bg-white/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-ios-blue/10 text-ios-blue font-mono font-bold text-[10px]">
              Level {level.levelNumber}
            </span>
            <span className="text-[11px] font-semibold text-ios-muted">
              {level.worldId.replace('world-', 'World ')}
            </span>
          </div>
          <h2 className="text-sm font-bold text-ios-slate tracking-tight line-clamp-1">
            {level.title}
          </h2>
        </div>

        {/* Load Reference Solution Button */}
        <button
          onClick={() => {
            if (confirm('Load verified solution for this level? This will overwrite the current editor code.')) {
              loadSolutionForActiveExercise();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold shadow-sm transition-all hover:border-slate-300"
          title="Inspect the verified OTP 29 reference implementation"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
          <span>Solution</span>
        </button>
      </div>

      {/* Segmented Navigation Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <Tabs.List className="flex items-center gap-1 p-2 bg-slate-100/60 border-b border-slate-200/60 shrink-0">
          <Tabs.Trigger
            value="concept"
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all select-none ${
              activeTab === 'concept'
                ? 'bg-white text-ios-blue shadow-sm'
                : 'text-ios-muted hover:text-ios-slate hover:bg-white/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Concept & Task</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="references"
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all select-none ${
              activeTab === 'references'
                ? 'bg-white text-ios-blue shadow-sm'
                : 'text-ios-muted hover:text-ios-slate hover:bg-white/50'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>References ({level.references.length})</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="checklist"
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all select-none ${
              activeTab === 'checklist'
                ? 'bg-white text-ios-blue shadow-sm'
                : 'text-ios-muted hover:text-ios-slate hover:bg-white/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Checklist ({verificationStages.length})</span>
          </Tabs.Trigger>
        </Tabs.List>

        {/* Tab 1: Concept & Task Markdown Briefing */}
        <Tabs.Content value="concept" className="flex-1 overflow-y-auto p-5 focus:outline-none">
          <div className="prose prose-slate max-w-none">
            {renderMarkdown(level.conceptMarkdown)}
          </div>
        </Tabs.Content>

        {/* Tab 2: Curated References Vault Cards */}
        <Tabs.Content value="references" className="flex-1 overflow-y-auto p-5 space-y-3.5 focus:outline-none">
          <div className="mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ios-muted font-mono">
              Curated Level References
            </h3>
            <p className="text-xs text-ios-muted mt-0.5">
              Official Erlang docs, OTP runtime source files, and engineering manuals for Level {level.levelNumber}.
            </p>
          </div>

          {level.references.map((ref, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/70 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:bg-white transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-ios-blue uppercase tracking-wider">
                    {ref.category.replace('_', ' ')}
                  </span>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold text-ios-blue hover:text-ios-blue-hover"
                  >
                    <span>View</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <h4 className="text-xs font-bold text-ios-slate group-hover:text-ios-blue transition-colors mb-1">
                  {ref.title}
                </h4>
                <p className="text-[11px] text-ios-muted leading-relaxed">
                  {ref.description}
                </p>
              </div>
            </div>
          ))}
        </Tabs.Content>

        {/* Tab 3: Verification Criteria & Checklist */}
        <Tabs.Content value="checklist" className="flex-1 overflow-y-auto p-5 space-y-3 focus:outline-none">
          <div className="mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ios-muted font-mono">
              Automated BEAM Invariant Checklist
            </h3>
            <p className="text-xs text-ios-muted mt-0.5">
              The Go orchestrator and OTP 29 runtime verify each of these requirements.
            </p>
          </div>

          {verificationStages.map((stage) => {
            const isPassed = stage.status === 'passed';
            const isFailed = stage.status === 'failed';

            return (
              <div
                key={stage.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isPassed
                    ? 'bg-emerald-50/70 border-emerald-200/80'
                    : isFailed
                    ? 'bg-rose-50/70 border-rose-200/80'
                    : 'bg-white/60 border-slate-200/80'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isFailed ? (
                      <div className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✕
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-ios-slate">
                        {stage.title}
                      </h4>
                      {stage.timeMs !== undefined && (
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                          {stage.timeMs}ms
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-ios-muted mt-1 leading-relaxed">
                      {stage.assertionDetails}
                    </p>

                    {isFailed && stage.hintOnFail && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-100/60 text-rose-800 text-[11px] font-medium leading-relaxed">
                        <strong>Hint:</strong> {stage.hintOnFail}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
