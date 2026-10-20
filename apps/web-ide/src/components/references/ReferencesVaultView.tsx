'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  ExternalLink, 
  Search, 
  FileCode2, 
  Terminal, 
  ShieldCheck, 
  Compass,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { CURRICULUM_WORLDS, ExternalReference, ReferenceCategory } from '../../data/curriculumCatalog';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';

const CATEGORY_LABELS: Record<ReferenceCategory, { label: string; icon: React.ElementType; color: string }> = {
  erlang_docs: { label: 'Official Erlang/OTP Docs', icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  github_otp: { label: 'GitHub erlang/otp Source', icon: FileCode2, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  github_ecosystem: { label: 'GitHub Production Ecosystem', icon: Terminal, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  book_rfc: { label: 'Standards, RFCs & Books', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
};

export function ReferencesVaultView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { setActiveView, switchExercise } = useWorkspaceStore();

  // Aggregate all references from all 10 levels with their parent level context
  const allReferences: (ExternalReference & { levelTitle: string; levelNumber: string; levelId: string; worldTitle: string })[] = [];
  CURRICULUM_WORLDS.forEach((world) => {
    world.levels.forEach((level) => {
      level.references.forEach((ref) => {
        allReferences.push({
          ...ref,
          levelTitle: level.title,
          levelNumber: level.levelNumber,
          levelId: level.id,
          worldTitle: world.title,
        });
      });
    });
  });

  const filteredReferences = allReferences.filter((ref) => {
    const matchesCategory = selectedCategory === 'all' || ref.category === selectedCategory;
    const matchesSearch = 
      ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.levelTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full h-full overflow-y-auto pt-24 pb-16 px-6 lg:px-16 max-w-7xl mx-auto">
      {/* Vault Header */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-panel p-8 mb-8 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-100/60 px-2.5 py-0.5 rounded-full font-mono">
                  Official BEAM Reference Vault
                </span>
                <span className="text-xs font-semibold text-ios-muted">{allReferences.length} Verified Sources</span>
              </div>
              <h1 className="text-2xl font-black text-ios-slate tracking-tight">
                Authoritative Erlang/OTP & XMPP Documentation
              </h1>
              <p className="text-sm text-ios-muted font-medium mt-0.5">
                Every BeamForge level is grounded in official OTP source code, RFC protocol standards, and production implementations.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('workspace')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-xs font-semibold text-ios-slate shadow-sm transition-all"
          >
            <Compass className="w-4 h-4 text-ios-blue" />
            <span>Return to Workspace</span>
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference by title, RFC, OTP module, or concept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/80 border border-slate-200 text-xs text-ios-slate placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ios-blue shadow-inner"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-ios-slate text-white shadow-sm'
                  : 'bg-white/60 text-ios-muted hover:bg-white hover:text-ios-slate'
              }`}
            >
              All ({allReferences.length})
            </button>
            {(Object.keys(CATEGORY_LABELS) as ReferenceCategory[]).map((cat) => {
              const label = CATEGORY_LABELS[cat];
              const count = allReferences.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-ios-slate text-white shadow-sm'
                      : 'bg-white/60 text-ios-muted hover:bg-white hover:text-ios-slate'
                  }`}
                >
                  {label.label.split(' ')[0]} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* References Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredReferences.map((ref, idx) => {
          const catInfo = CATEGORY_LABELS[ref.category] || CATEGORY_LABELS.erlang_docs;
          const CategoryIcon = catInfo.icon;

          return (
            <motion.div
              key={`${ref.url}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              className="glass-card p-5 rounded-2xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catInfo.color}`}>
                    <CategoryIcon className="w-3 h-3" />
                    <span>{catInfo.label}</span>
                  </span>

                  <button
                    onClick={() => {
                      switchExercise(ref.levelId);
                      setActiveView('workspace');
                    }}
                    className="text-[10px] font-mono font-semibold text-slate-500 hover:text-ios-blue transition-colors bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
                  >
                    Level {ref.levelNumber}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-ios-slate group-hover:text-ios-blue transition-colors mb-1.5">
                  {ref.title}
                </h3>
                <p className="text-xs text-ios-muted leading-relaxed line-clamp-2">
                  {ref.description}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  {ref.worldTitle}
                </span>

                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-ios-blue hover:text-ios-blue-hover transition-colors"
                >
                  <span>Open Resource</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
