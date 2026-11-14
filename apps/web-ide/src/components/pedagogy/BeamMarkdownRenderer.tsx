'use client';

import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Zap,
  ShieldAlert,
  Info,
  Lightbulb,
} from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { ErlangCodeBlock } from '../../lib/monacoErlang';

// ── Superscript & Subscript Character Maps ──────────────────────────────────
const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'N': 'ᴺ', 'i': 'ⁱ', 'k': 'ᵏ', 'm': 'ᵐ',
};

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'n': 'ₙ', 'N': 'ₙ',
};

export function toSuperscript(str: string): string {
  return str.split('').map((c) => SUPERSCRIPTS[c] || c).join('');
}

export function toSubscript(str: string): string {
  return str.split('').map((c) => SUBSCRIPTS[c] || c).join('');
}

// ── Math & LaTeX Clean Formatting Engine ──────────────────────────────────────
export function cleanMathText(content: string): string {
  if (!content) return '';
  let s = content;

  // Unescape double backslashes that originate from encoded string literals
  s = s.replace(/\\\\/g, '\\');

  // Text / style wrappers unwrap: \text{foo} -> foo, \mathbf{foo} -> foo
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathit\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathcal\{([^}]+)\}/g, '$1');
  // Escaped underscore: \_ -> _
  s = s.replace(/\\_/g, '_');

  // Arrows (Long & standard, with CR escape healing)
  s = s.replace(/\\longrightarrow|\r?ongrightarrow/g, '⟶');
  s = s.replace(/\\longleftarrow|\r?ongleftarrow/g, '⟵');
  s = s.replace(/\\rightarrow|\r?ightarrow|\\to\b/g, '→');
  s = s.replace(/\\leftarrow|\r?eftarrow/g, '←');
  s = s.replace(/\\leftrightarrow/g, '↔');
  s = s.replace(/\\Longleftrightarrow/g, '⟺');
  s = s.replace(/\\Longrightarrow/g, '⟹');
  s = s.replace(/\\Longleftarrow/g, '⟸');
  s = s.replace(/\\Rightarrow/g, '⇒');
  s = s.replace(/\\Leftarrow/g, '⇐');
  s = s.replace(/\\Leftrightarrow/g, '⇔');

  // Inequalities & comparisons
  s = s.replace(/\\le\b|\\leq\b/g, '≤');
  s = s.replace(/\\ge\b|\\geq\b/g, '≥');
  s = s.replace(/\\neq\b|\\ne\b/g, '≠');
  s = s.replace(/\\approx\b/g, '≈');
  s = s.replace(/\\equiv\b/g, '≡');
  s = s.replace(/\\ll\b/g, '≪');
  s = s.replace(/\\gg\b/g, '≫');

  // Arithmetic & operators
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\pm/g, '±');
  s = s.replace(/\\mp/g, '∓');
  s = s.replace(/\\div/g, '÷');

  // Logarithms & functions
  s = s.replace(/\\log_\{?32\}?/g, 'log₃₂');
  s = s.replace(/\\log_\{?2\}?/g, 'log₂');
  s = s.replace(/\\log_\{?10\}?/g, 'log₁₀');
  s = s.replace(/\\log_\{?(\d+)\}?/g, (_, n) => 'log' + toSubscript(n));
  s = s.replace(/\\log\b/g, 'log');
  s = s.replace(/\\ln\b/g, 'ln');

  // Powers / Superscripts
  s = s.replace(/\^\{?2\}?\b/g, '²');
  s = s.replace(/\^\{?3\}?\b/g, '³');
  s = s.replace(/\^\{?N\}?\b/g, 'ᴺ');
  s = s.replace(/\^\{?k\}?\b/g, 'ᵏ');
  s = s.replace(/\^\{?(\d+)\}?/g, (_, n) => toSuperscript(n));

  // Ellipsis & Set symbols
  s = s.replace(/\\dots|\\ldots/g, '…');
  s = s.replace(/\\in\b/g, '∈');
  s = s.replace(/\\notin\b/g, '∉');
  s = s.replace(/\\forall\b/g, '∀');
  s = s.replace(/\\exists\b/g, '∃');

  // Clean any remaining backslashes preceding command names
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  return s.trim();
}

// ── Plain Text Typography Formatter ──────────────────────────────────────────
export function formatPlainTextSymbols(str: string): string {
  if (!str) return '';
  return str
    .replace(/-->/g, '⟶')
    .replace(/\s+->\s+/g, ' → ')
    .replace(/<->/g, '↔')
    .replace(/==>/g, '⟹')
    .replace(/\s+=>\s+/g, ' ⇒ ')
    .replace(/<==/g, '⟸')
    .replace(/<-\s+/g, '← ');
}

// ── Math Expression Guard (Distinguishes math mode from standalone currency) ──
export function isMathExpression(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;

  // Big-O complexity (e.g., O(1), O(N), O(\log N), O(N^2))
  if (/^O\(.+\)$/i.test(trimmed)) return true;

  // LaTeX backslash macros & healed arrow escapes
  if (/(\\rightarrow|\r?ightarrow|\\longrightarrow|\r?ongrightarrow|\\leftrightarrow|\\leftarrow|\r?eftarrow|\\longleftarrow|\r?ongleftarrow|\\to|\\le|\\leq|\\ge|\\geq|\\neq|\\ne|\\approx|\\times|\\cdot|\\log|\\ln|\\mathbf|\\text|\\mathit|\\mathrm|\\mathcal|\\dots|\\in|\\notin|\\forall|\\exists|\\pm|\\mp|\\div|\\equiv)\b/.test(trimmed)) {
    return true;
  }

  // Math symbols / powers
  if (/[\^≤≥≠≈×·±÷⟶→↔⟵←]/.test(trimmed)) return true;

  // Relations & boundaries (e.g. "< MaxFailures", ">= MaxFailures", "> 64", "< 32")
  if (/^[<>≤≥]=?\s*[A-Za-z0-9_]+$/.test(trimmed)) return true;

  // Single mathematical variables (e.g. $N$, $R$, $K$)
  if (/^[A-Z]$/.test(trimmed)) return true;

  // Arithmetic formulas (e.g. "5 \times 16 = 80", "100 >= 80")
  if (/^\d+\s*[\times*+\-\/=<≤≥]\s*\d+/.test(trimmed)) return true;

  return false;
}

// ── Display Math Block Component ─────────────────────────────────────────────
export function DisplayMathBlock({
  mathContent,
  isDark,
}: {
  mathContent: string;
  isDark: boolean;
}) {
  const clean = cleanMathText(mathContent);

  // If the math content represents a linear pipeline with arrows (e.g. wait_for_stream ⟶ wait_for_sasl)
  if (/⟶|→|↔/.test(clean)) {
    const steps = clean.split(/\s*(?:⟶|→)\s*/);
    return (
      <div
        className="my-4 p-3.5 rounded-2xl border shadow-sm backdrop-blur-md flex flex-wrap items-center justify-center gap-2 overflow-x-auto"
        style={{
          borderColor: isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(124, 58, 237, 0.25)',
          background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(124, 58, 237, 0.04)',
        }}
      >
        {steps.map((step, sIdx) => (
          <React.Fragment key={sIdx}>
            <span
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-tight shadow-xs transition-transform hover:scale-105"
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.90)',
                color: isDark ? '#DDD6FE' : '#4C1D95',
                border: isDark ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(124, 58, 237, 0.25)',
              }}
            >
              {step}
            </span>
            {sIdx < steps.length - 1 && (
              <span
                className="text-sm font-bold mx-1 select-none"
                style={{ color: isDark ? '#A78BFA' : '#7C3AED' }}
              >
                ⟶
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Standard Display Math
  return (
    <div
      className="my-4 p-3.5 rounded-2xl border shadow-sm backdrop-blur-md text-center font-mono text-xs sm:text-sm font-bold overflow-x-auto"
      style={{
        borderColor: isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(124, 58, 237, 0.25)',
        background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(124, 58, 237, 0.04)',
        color: isDark ? '#F1F5F9' : '#0F172A',
      }}
    >
      {clean}
    </div>
  );
}

// ── Inline Markdown Renderer (Bold, Inline Code, Italics, Links, Math, Arrows) ─
export function renderInlineContent(text?: string | null, isDark: boolean = true): React.ReactNode {
  if (!text) return null;

  // Regex splits on:
  // 1. Inline code (`...`)
  // 2. Display math ($$...$$)
  // 3. Inline math ($...$)
  // 4. Bold (**...**)
  // 5. Italics (*...*)
  // 6. Markdown links ([text](url))
  const regex = /(`[^`]+`|\$\$[^\$]+?\$\$|\$[^\$\n]+?\$|\*\*[^*]+?\*\*|\*[^*]+?\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // 1. Inline code (`...`)
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeVal = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded text-xs font-mono font-semibold inline break-all [overflow-wrap:anywhere] max-w-full mx-0.5"
          style={{
            background: isDark ? 'rgba(139,92,246,0.22)' : 'rgba(124,58,237,0.12)',
            color: isDark ? '#DDD6FE' : '#4C1D95',
            border: isDark ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(124,58,237,0.28)',
            fontVariantLigatures: 'none',
            fontFeatureSettings: '"liga" 0, "calt" 0, "zero" 1',
          }}
        >
          {codeVal}
        </code>
      );
    }

    // 2. Display Math ($$...$$)
    if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
      const inner = part.slice(2, -2);
      const clean = cleanMathText(inner);
      return (
        <span
          key={idx}
          className="my-1.5 px-3 py-1 rounded-xl border inline-flex items-center gap-2 font-mono text-xs font-bold shadow-xs align-middle"
          style={{
            borderColor: isDark ? 'rgba(139, 92, 246, 0.40)' : 'rgba(124, 58, 237, 0.30)',
            background: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(124, 58, 237, 0.06)',
            color: isDark ? '#DDD6FE' : '#4C1D95',
          }}
        >
          {clean}
        </span>
      );
    }

    // 3. Inline Math ($...$)
    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      const inner = part.slice(1, -1);
      if (isMathExpression(inner)) {
        const clean = cleanMathText(inner);

        // Algorithmic Complexity Badge (e.g. O(1), O(log N), O(N))
        if (/^O\(.+\)$/i.test(clean)) {
          return (
            <span
              key={idx}
              className="px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono font-bold tracking-tight inline-flex items-center align-baseline shadow-xs"
              style={{
                background: isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.12)',
                color: isDark ? '#38BDF8' : '#0284C7',
                border: isDark ? '1px solid rgba(56, 189, 248, 0.32)' : '1px solid rgba(2, 132, 199, 0.25)',
              }}
            >
              {clean}
            </span>
          );
        }

        // Standalone Arrow (e.g. →, ⟶, ↔, ⇒)
        if (/^(?:→|⟶|↔|⟵|←|⇒|⟹|⇔|⟺)$/.test(clean)) {
          return (
            <span
              key={idx}
              className="inline-block mx-1.5 font-bold align-baseline transition-transform"
              style={{
                color: isDark ? '#A78BFA' : '#7C3AED',
                fontSize: '1.1em',
              }}
            >
              {clean}
            </span>
          );
        }

        // Inequality / Comparison (e.g. ≤ 32, ≥ MaxFailures, < 64)
        if (/[≤≥<>≠≈]/.test(clean)) {
          return (
            <span
              key={idx}
              className="px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono font-semibold inline-flex items-center align-baseline"
              style={{
                background: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.07)',
                color: isDark ? '#F1F5F9' : '#0F172A',
                border: isDark ? '1px solid rgba(148, 163, 184, 0.22)' : '1px solid rgba(15, 23, 42, 0.14)',
              }}
            >
              {clean}
            </span>
          );
        }

        // General Math Variable or Expression (e.g. N, R, 5 × 16 = 80 bytes)
        return (
          <span
            key={idx}
            className="px-1 py-0.5 mx-0.5 rounded text-xs font-mono font-semibold italic inline-flex items-center align-baseline"
            style={{
              background: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(124, 58, 237, 0.08)',
              color: isDark ? '#DDD6FE' : '#5B21B6',
            }}
          >
            {clean}
          </span>
        );
      }
    }

    // 4. Bold text (**...**)
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong
          key={idx}
          className="font-bold"
          style={{
            color: isDark ? '#FFFFFF' : '#020617',
            fontWeight: 700,
          }}
        >
          {renderInlineContent(inner, isDark)}
        </strong>
      );
    }

    // 5. Italics text (*...*)
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 3 && !part.startsWith('**')) {
      const inner = part.slice(1, -1);
      return (
        <em
          key={idx}
          className="italic"
          style={{
            color: isDark ? '#CBD5E1' : '#334155',
          }}
        >
          {renderInlineContent(inner, isDark)}
        </em>
      );
    }

    // 6. Markdown link ([text](url))
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
          style={{ color: isDark ? '#A78BFA' : '#7C3AED' }}
        >
          {renderInlineContent(linkMatch[1], isDark)}
        </a>
      );
    }

    // 7. Plain text fallback (formatted typography symbols)
    return <React.Fragment key={idx}>{formatPlainTextSymbols(part)}</React.Fragment>;
  });
}

// ── Callout Configuration & Theme Specs ──────────────────────────────────────
interface CalloutConfig {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  borderColor: string;
  accentBarColor: string;
  bgLight: string;
  bgDark: string;
  titleColorLight: string;
  titleColorDark: string;
  iconColorLight: string;
  iconColorDark: string;
}

// ── Callout Header Guard ─────────────────────────────────────────────────────
export function isCalloutHeader(lineStr?: string | null): boolean {
  if (!lineStr) return false;
  return /^>\s*\[!(warning|caution|important|danger|tip|note|abstract|info)\]/i.test(lineStr.trim());
}

function getCalloutConfig(type: string, isDark: boolean): CalloutConfig {
  switch (type.toLowerCase()) {
    case 'warning':
    case 'caution':
      return {
        icon: AlertTriangle,
        label: 'Warning',
        borderColor: isDark ? 'rgba(245, 158, 11, 0.45)' : 'rgba(217, 119, 6, 0.40)',
        accentBarColor: isDark ? '#F59E0B' : '#D97706',
        bgLight: 'rgba(254, 243, 199, 0.45)',
        bgDark: 'rgba(245, 158, 11, 0.08)',
        titleColorLight: '#B45309',
        titleColorDark: '#FBBF24',
        iconColorLight: '#D97706',
        iconColorDark: '#F59E0B',
      };
    case 'important':
    case 'danger':
      return {
        icon: ShieldAlert,
        label: 'Important',
        borderColor: isDark ? 'rgba(244, 63, 94, 0.45)' : 'rgba(225, 29, 72, 0.40)',
        accentBarColor: isDark ? '#FB7185' : '#E11D48',
        bgLight: 'rgba(255, 228, 230, 0.45)',
        bgDark: 'rgba(244, 63, 94, 0.08)',
        titleColorLight: '#BE123C',
        titleColorDark: '#FB7185',
        iconColorLight: '#E11D48',
        iconColorDark: '#FB7185',
      };
    case 'tip':
      return {
        icon: Zap,
        label: 'Pro Tip',
        borderColor: isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(5, 150, 105, 0.40)',
        accentBarColor: isDark ? '#10B981' : '#059669',
        bgLight: 'rgba(209, 250, 229, 0.45)',
        bgDark: 'rgba(16, 185, 129, 0.08)',
        titleColorLight: '#047857',
        titleColorDark: '#34D399',
        iconColorLight: '#059669',
        iconColorDark: '#34D399',
      };
    case 'abstract':
    case 'note':
    case 'info':
    default:
      return {
        icon: BookOpen,
        label: 'Note',
        borderColor: isDark ? 'rgba(139, 92, 246, 0.45)' : 'rgba(124, 58, 237, 0.35)',
        accentBarColor: isDark ? '#8B5CF6' : '#7C3AED',
        bgLight: 'rgba(237, 233, 254, 0.45)',
        bgDark: 'rgba(139, 92, 246, 0.08)',
        titleColorLight: '#6D28D9',
        titleColorDark: '#A78BFA',
        iconColorLight: '#7C3AED',
        iconColorDark: '#A78BFA',
      };
  }
}

// ── Sub-Content Renderer for Callout & Blockquote Bodies ──────────────────────
function renderSubContent(subLines: string[], isDark: boolean): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let k = 0;
  while (k < subLines.length) {
    const sLine = subLines[k];

    if (sLine.trim().startsWith('```')) {
      const codeLines: string[] = [];
      k++;
      while (k < subLines.length && !subLines[k].trim().startsWith('```')) {
        codeLines.push(subLines[k]);
        k++;
      }
      result.push(
        <div key={`sub-code-${k}`} className="my-2.5 rounded-lg overflow-hidden shadow-sm">
          <ErlangCodeBlock code={codeLines.join('\n')} isDark={isDark} />
        </div>
      );
      k++; // Skip the closing ```
      continue;
    } else if (/^\s*[-*]\s+/.test(sLine)) {
      const items: string[] = [];
      while (k < subLines.length && /^\s*[-*]\s+/.test(subLines[k])) {
        items.push(subLines[k].replace(/^\s*[-*]\s+/, ''));
        k++;
      }
      result.push(
        <ul
          key={`sub-ul-${k}`}
          className="ml-4 text-xs mb-1.5 list-disc leading-relaxed font-normal space-y-1"
          style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
        >
          {items.map((it, idx) => (
            <li key={`sub-li-${k}-${idx}`} className="break-words [overflow-wrap:anywhere]">{renderInlineContent(it, isDark)}</li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\s*\d+\.\s+/.test(sLine)) {
      const firstM = sLine.match(/^\s*(\d+)\.\s+(.*)$/);
      const startNum = firstM ? parseInt(firstM[1], 10) : 1;
      const items: { num: number; text: string }[] = [];
      while (k < subLines.length && /^\s*\d+\.\s+/.test(subLines[k])) {
        const m = subLines[k].match(/^\s*(\d+)\.\s+(.*)$/);
        if (m) items.push({ num: parseInt(m[1], 10), text: m[2] });
        k++;
      }
      result.push(
        <ol
          key={`sub-ol-${k}`}
          start={startNum}
          className="ml-4 text-xs mb-1.5 list-decimal leading-relaxed font-medium space-y-1"
          style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
        >
          {items.map((it, idx) => (
            <li key={`sub-oli-${k}-${idx}`} value={it.num} className="break-words [overflow-wrap:anywhere]">
              {renderInlineContent(it.text, isDark)}
            </li>
          ))}
        </ol>
      );
      continue;
    } else if (sLine.trim() === '') {
      result.push(<div key={`sub-sp-${k}`} className="h-1.5" />);
    } else {
      result.push(
        <p
          key={`sub-p-${k}`}
          className="text-xs leading-relaxed mb-1.5 font-normal break-words [overflow-wrap:anywhere]"
          style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
        >
          {renderInlineContent(sLine, isDark)}
        </p>
      );
    }
    k++;
  }
  return result;
}

// ── Callout Alert Component ──────────────────────────────────────────────────
export function MarkdownCallout({
  type,
  title,
  bodyLines,
  isDark,
}: {
  type: string;
  title: string;
  bodyLines: string[];
  isDark: boolean;
}) {
  const cfg = getCalloutConfig(type, isDark);
  const IconComponent = cfg.icon;

  return (
    <div
      className="my-3.5 p-3.5 rounded-2xl border border-l-4 shadow-sm backdrop-blur-md transition-all"
      style={{
        borderColor: cfg.borderColor,
        borderLeftColor: cfg.accentBarColor,
        background: isDark ? cfg.bgDark : cfg.bgLight,
      }}
    >
      <div
        className="flex items-center gap-2 mb-2 pb-1.5 border-b"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
      >
        <div
          className="p-1 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)',
            color: isDark ? cfg.iconColorDark : cfg.iconColorLight,
          }}
        >
          <IconComponent className="w-4 h-4 flex-shrink-0" />
        </div>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
              color: isDark ? cfg.titleColorDark : cfg.titleColorLight,
            }}
          >
            {cfg.label}
          </span>
          {title && (
            <span
              className="text-xs font-bold truncate"
              style={{ color: isDark ? cfg.titleColorDark : cfg.titleColorLight }}
            >
              {renderInlineContent(title, isDark)}
            </span>
          )}
        </div>
      </div>
      <div className="callout-body pl-0.5 break-words [overflow-wrap:anywhere] min-w-0">
        {renderSubContent(bodyLines, isDark)}
      </div>
    </div>
  );
}

// ── Table Cell Splitter (Preserves inline code pipes & escaped pipes) ─────────
export function splitTableCells(rowStr: string): string[] {
  let str = rowStr.trim();
  if (str.startsWith('|')) str = str.slice(1);
  if (str.endsWith('|')) str = str.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let inBacktick = false;

  for (let idx = 0; idx < str.length; idx++) {
    const char = str[idx];
    if (char === '`') {
      inBacktick = !inBacktick;
      current += char;
    } else if (char === '\\' && idx + 1 < str.length && str[idx + 1] === '|') {
      current += '|';
      idx++;
    } else if (char === '|' && !inBacktick) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

// ── Glassmorphic Table Component ─────────────────────────────────────────────
export function MarkdownTable({
  headers,
  alignments,
  rows,
  isDark,
}: {
  headers: string[];
  alignments: Array<'left' | 'center' | 'right'>;
  rows: string[][];
  isDark: boolean;
}) {
  return (
    <div
      className="my-4 overflow-x-auto rounded-2xl border shadow-sm backdrop-blur-md transition-all"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
        background: isDark ? 'rgba(15,23,42,0.50)' : 'rgba(255,255,255,0.65)',
      }}
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.90)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.12)',
          }}
        >
          <tr>
            {headers.map((h, hIdx) => (
              <th
                key={hIdx}
                className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]"
                style={{
                  textAlign: alignments[hIdx] || 'left',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              >
                {renderInlineContent(h, isDark)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="transition-colors border-b last:border-b-0 hover:bg-violet-500/5"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                background:
                  rIdx % 2 === 1
                    ? isDark
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(248,250,252,0.50)'
                    : 'transparent',
              }}
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className="px-3 sm:px-4 py-2 sm:py-3 leading-relaxed font-normal align-top text-xs break-words [overflow-wrap:anywhere]"
                  style={{
                    textAlign: alignments[cIdx] || 'left',
                    color: isDark ? '#E2E8F0' : '#1E293B',
                  }}
                >
                  {renderInlineContent(cell, isDark)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Complete BeamMarkdownRenderer Component ──────────────────────────────────
export function BeamMarkdownRenderer({ md, isDark: explicitDark }: { md: string; isDark?: boolean }) {
  const storeTheme = useWorkspaceStore((s) => s.theme);
  const isDark = explicitDark !== undefined ? explicitDark : storeTheme === 'dark';

  if (!md) return null;

  // Normalize CRLF to LF while healing any JS carriage-return escapes (\r+ightarrow -> \rightarrow)
  const cleanMd = md
    .replace(/\r(?=ightarrow)/g, '\\r')
    .replace(/\r(?=ongrightarrow)/g, '\\l')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = cleanMd.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Blocks (```erlang, ```xml, ``` or indented ```)
    const trimmedForCode = line.trim();
    if (trimmedForCode.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      // Calculate min indentation for non-empty lines to dedent cleanly
      const minIndent = codeLines
        .filter((l) => l.trim().length > 0)
        .reduce((min, l) => {
          const match = l.match(/^(\s*)/);
          const len = match ? match[1].length : 0;
          return Math.min(min, len);
        }, Infinity);

      const dedentedCode =
        minIndent < Infinity && minIndent > 0
          ? codeLines.map((l) => (l.length >= minIndent ? l.slice(minIndent) : l)).join('\n')
          : codeLines.join('\n');

      elements.push(
        <div key={`code-wrap-${i}`} className="my-3 min-w-0 max-w-full overflow-hidden">
          <ErlangCodeBlock key={`code-${i}`} code={dedentedCode} isDark={isDark} />
        </div>
      );
      i++;
      continue;
    }

    // 2. Display Math Blocks ($$ ... $$)
    const trimmedForMath = line.trim();
    if (trimmedForMath.startsWith('$$')) {
      if (trimmedForMath.endsWith('$$') && trimmedForMath.length > 4) {
        const mathContent = trimmedForMath.slice(2, -2);
        elements.push(
          <DisplayMathBlock key={`math-blk-${i}`} mathContent={mathContent} isDark={isDark} />
        );
        i++;
        continue;
      }

      // Multi-line $$ ... $$
      const mathLines: string[] = [trimmedForMath.slice(2)];
      i++;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        mathLines.push(lines[i].trim().slice(0, -2));
        i++;
      }
      elements.push(
        <DisplayMathBlock key={`math-blk-${i}`} mathContent={mathLines.join(' ')} isDark={isDark} />
      );
      continue;
    }

    // 3. Headings
    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base font-extrabold mt-6 mb-2 tracking-tight"
          style={{ color: isDark ? '#F8FAFC' : '#020617' }}
        >
          {renderInlineContent(line.slice(3), isDark)}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm font-bold mt-4 mb-1.5"
          style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
        >
          {renderInlineContent(line.slice(4), isDark)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('#### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-xs font-bold mt-3 mb-1 uppercase tracking-wider"
          style={{ color: isDark ? '#CBD5E1' : '#334155' }}
        >
          {renderInlineContent(line.slice(5), isDark)}
        </h4>
      );
      i++;
      continue;
    }

    // 3. Tables (| Col 1 | Col 2 |)
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (
        i + 1 < lines.length &&
        lines[i + 1].trim().startsWith('|') &&
        lines[i + 1].trim().endsWith('|') &&
        /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim()) &&
        lines[i + 1].includes('-')
      ) {
        const headerRow = splitTableCells(line);
        const sepRow = splitTableCells(lines[i + 1]);

        const alignments: Array<'left' | 'center' | 'right'> = sepRow.map((c) => {
          if (c.startsWith(':') && c.endsWith(':')) return 'center';
          if (c.endsWith(':')) return 'right';
          return 'left';
        });

        const rows: string[][] = [];
        i += 2;
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          const cells = splitTableCells(lines[i]);
          rows.push(cells);
          i++;
        }

        elements.push(
          <MarkdownTable
            key={`table-${i}`}
            headers={headerRow}
            alignments={alignments}
            rows={rows}
            isDark={isDark}
          />
        );
        continue;
      }
    }

    // 4. Blockquotes & Callouts (> [!warning], etc.)
    if (line.trim().startsWith('>')) {
      const bqLines: string[] = [];
      while (i < lines.length) {
        const currentTrim = lines[i].trim();

        // If a callout is already accumulating lines and we encounter a new callout header, break immediately
        if (bqLines.length > 0 && isCalloutHeader(currentTrim)) {
          break;
        }

        if (currentTrim.startsWith('>')) {
          // If this is an empty '>' line and the next line starts a new callout header, don't swallow
          if (currentTrim === '>' && i + 1 < lines.length && isCalloutHeader(lines[i + 1])) {
            i++;
            break;
          }
          bqLines.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
          continue;
        }

        if (currentTrim === '') {
          // If the next line starts a new callout header, terminate current callout
          if (i + 1 < lines.length && isCalloutHeader(lines[i + 1])) {
            break;
          }
          // If the next line continues standard blockquote text
          if (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
            bqLines.push('');
            i++;
            continue;
          } else {
            break;
          }
        }

        // Neither '>' nor empty line inside blockquote
        break;
      }

      const firstLine = (bqLines[0] || '').trim();
      const calloutMatch = firstLine.match(
        /^\[!(warning|caution|important|danger|tip|note|abstract|info)\](?:\s+(.*))?$/i
      );

      if (calloutMatch) {
        const calloutType = calloutMatch[1].toLowerCase();
        const calloutTitle = calloutMatch[2]?.trim() || '';
        const bodyLines = bqLines.slice(1);
        elements.push(
          <MarkdownCallout
            key={`callout-${i}`}
            type={calloutType}
            title={calloutTitle}
            bodyLines={bodyLines}
            isDark={isDark}
          />
        );
      } else {
        // Standard non-callout blockquote
        elements.push(
          <blockquote
            key={`bq-${i}`}
            className="border-l-4 pl-4 py-2.5 my-3 text-xs leading-relaxed rounded-r-xl"
            style={{
              borderColor: isDark ? '#A78BFA' : '#7C3AED',
              color: isDark ? '#E2E8F0' : '#0F172A',
              background: isDark ? 'rgba(139,92,246,0.10)' : 'rgba(124,58,237,0.05)',
            }}
          >
            {renderSubContent(bqLines, isDark)}
          </blockquote>
        );
      }
      continue;
    }

    // 5. Unordered Lists
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul
          key={`ul-${i}`}
          className="ml-5 text-sm mb-2 list-disc leading-relaxed font-normal space-y-1.5"
          style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}
        >
          {listItems.map((item, idx) => (
            <li key={`uli-${i}-${idx}`} className="break-words [overflow-wrap:anywhere]">
              {renderInlineContent(item, isDark)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered Lists
    if (/^\s*\d+\.\s+/.test(line)) {
      const firstMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
      const startNum = firstMatch ? parseInt(firstMatch[1], 10) : 1;
      const listItems: { num: number; text: string }[] = [];

      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const m = lines[i].match(/^\s*(\d+)\.\s+(.*)$/);
        if (m) {
          listItems.push({ num: parseInt(m[1], 10), text: m[2] });
        }
        i++;
      }

      elements.push(
        <ol
          key={`ol-${i}`}
          start={startNum}
          className="ml-5 text-sm mb-2 list-decimal leading-relaxed font-medium space-y-1.5"
          style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}
        >
          {listItems.map((item, idx) => (
            <li key={`oli-${i}-${idx}`} value={item.num} className="break-words [overflow-wrap:anywhere]">
              {renderInlineContent(item.text, isDark)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Blank Spacers
    if (line.trim() === '') {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // 8. Regular Paragraphs
    elements.push(
      <p
        key={`p-${i}`}
        className="text-sm leading-relaxed mb-2 font-normal break-words [overflow-wrap:anywhere]"
        style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}
      >
        {renderInlineContent(line, isDark)}
      </p>
    );
    i++;
  }

  return <div className="leading-relaxed break-words [overflow-wrap:anywhere] min-w-0 max-w-full">{elements}</div>;
}
