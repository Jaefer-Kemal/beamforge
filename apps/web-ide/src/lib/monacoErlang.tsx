import React from 'react';

/**
 * BeamForge Erlang Syntax Highlighting System
 * Configures Monaco Editor Monarch tokenizer & themes, and provides
 * static syntax highlighting for markdown code blocks in textbook lessons.
 */

export function configureMonacoErlang(monaco: any) {
  if (!monaco) return;

  // 1. Register Erlang language if not present
  if (!monaco.languages.getLanguages().some((l: { id: string }) => l.id === 'erlang')) {
    monaco.languages.register({ id: 'erlang' });
  }

  // 2. Erlang Monarch Lexical Specification
  monaco.languages.setMonarchTokensProvider('erlang', {
    defaultToken: '',
    tokenPostfix: '.erl',
    ignoreCase: false,

    keywords: [
      'after', 'begin', 'catch', 'case', 'cond', 'end', 'fun', 'if',
      'let', 'of', 'query', 'receive', 'try', 'when',
      'andalso', 'orelse', 'div', 'rem', 'band', 'bor', 'bxor', 'bnot',
      'bsl', 'bsr', 'and', 'or', 'xor', 'not'
    ],

    typeKeywords: [
      '-module', '-behaviour', '-behavior', '-export', '-import',
      '-record', '-define', '-include', '-include_lib', '-spec', '-type',
      '-callback', '-opaque', '-export_type'
    ],

    operators: [
      '=', '+', '-', '*', '/', '==', '/=', '=<', '<', '>=', '>',
      '=:=', '=/=', '!', '++', '--', '<-', '->', '||', '=>', ':=', '#'
    ],

    symbols: /[=><!~?:&|+\-*\/\^%#]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        // Comments (% to end of line)
        [/%.*$/, 'comment'],

        // Directives & Module Attributes
        [/^-[a-z_]+/, {
          cases: {
            '@typeKeywords': 'attribute',
            '@default': 'attribute'
          }
        }],

        // Bit Syntax brackets
        [/<<|>>/, 'delimiter.bracket'],

        // PIDs and Ports
        [/<[0-9]+\.[0-9]+\.[0-9]+>/, 'number.hex'],

        // Variables (starts with uppercase or underscore)
        [/[A-Z_][a-zA-Z0-9_]*/, 'variable'],

        // Module calls (e.g. lists:reverse)
        [/[a-z][a-zA-Z0-9_]*(?=:)/, 'identifier.module'],

        // Atoms & Keywords
        [/[a-z][a-zA-Z0-9_]*/, {
          cases: {
            '@keywords': 'keyword',
            '@typeKeywords': 'attribute',
            '@default': 'atom'
          }
        }],

        // Delimiters
        [/[{}()\[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],

        // Operators
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],

        // Numbers (Float, Based integers e.g. 16#FF, Decimals)
        [/\d+\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+#[0-9a-zA-Z]+/, 'number.hex'],
        [/\d+/, 'number'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

        // Single-quoted atoms
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, { token: 'atom.quote', bracket: '@open', next: '@atomString' }],
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
      ],

      atomString: [
        [/[^\\']+/, 'atom'],
        [/@escapes/, 'atom.escape'],
        [/\\./, 'atom.escape.invalid'],
        [/'/, { token: 'atom.quote', bracket: '@close', next: '@pop' }],
      ],
    },
  });

  // 3. Daylight Frosted Glass Theme ('beamforge-light')
  monaco.editor.defineTheme('beamforge-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '', background: 'ffffff', foreground: '020617' },
      { token: 'keyword', foreground: '0948b3', fontStyle: 'bold' },
      { token: 'attribute', foreground: '6b21a8', fontStyle: 'bold' },
      { token: 'identifier.module', foreground: '0284c7', fontStyle: 'bold' },
      { token: 'atom', foreground: '0d5e56', fontStyle: 'bold' },
      { token: 'variable', foreground: '9a3412', fontStyle: 'bold' },
      { token: 'string', foreground: '047857', fontStyle: 'bold' },
      { token: 'string.quote', foreground: '047857', fontStyle: 'bold' },
      { token: 'number', foreground: 'c2410c', fontStyle: 'bold' },
      { token: 'number.float', foreground: 'c2410c', fontStyle: 'bold' },
      { token: 'number.hex', foreground: 'c2410c', fontStyle: 'bold' },
      { token: 'comment', foreground: '334155', fontStyle: 'italic' },
      { token: 'operator', foreground: '3730a3', fontStyle: 'bold' },
      { token: 'delimiter.bracket', foreground: '1e40af', fontStyle: 'bold' },
      { token: 'delimiter', foreground: '0f172a', fontStyle: 'bold' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#020617',
      'editor.lineHighlightBackground': '#f1f5f9',
      'editorGutter.background': '#f8fafc',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#0948b3',
      'editorCursor.foreground': '#0948b3',
      'editor.selectionBackground': '#bfdbfe99',
      'editor.inactiveSelectionBackground': '#bfdbfe44',
    },
  });

  // 4. Midnight Dark Glass Theme ('beamforge-dark')
  monaco.editor.defineTheme('beamforge-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', background: '0b0f17', foreground: 'f8fafc' },
      { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
      { token: 'attribute', foreground: 'c084fc', fontStyle: 'bold' },
      { token: 'identifier.module', foreground: '38bdf8', fontStyle: 'bold' },
      { token: 'atom', foreground: '2dd4bf' },
      { token: 'variable', foreground: 'fbbf24', fontStyle: 'bold' },
      { token: 'string', foreground: '34d399' },
      { token: 'string.quote', foreground: '34d399' },
      { token: 'number', foreground: 'fb923c' },
      { token: 'number.float', foreground: 'fb923c' },
      { token: 'number.hex', foreground: 'fb923c' },
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'operator', foreground: '818cf8', fontStyle: 'bold' },
      { token: 'delimiter.bracket', foreground: '38bdf8', fontStyle: 'bold' },
      { token: 'delimiter', foreground: '94a3b8' },
    ],
    colors: {
      'editor.background': '#0b0f17',
      'editor.foreground': '#f8fafc',
      'editor.lineHighlightBackground': '#1e293b55',
      'editorGutter.background': '#0b0f17',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#38bdf8',
      'editorCursor.foreground': '#38bdf8',
      'editor.selectionBackground': '#38bdf826',
      'editor.inactiveSelectionBackground': '#38bdf813',
    },
  });
}

/**
 * Fast, zero-dependency token highlighter for Erlang code snippets in markdown lessons.
 * Matches keywords, attributes, variables, strings, comments, numbers, atoms, and operators.
 */
export function highlightErlangLine(line: string, isDark: boolean): React.ReactNode[] {
  if (!line) {
    return ['\u00A0'];
  }

  // Regex breakdown:
  // 1. Comment: %.*
  // 2. String: "..."
  // 3. Quoted atom: '...'
  // 4. Directive/Attribute: ^\s*-[a-z_]+
  // 5. Keywords
  // 6. Variable: [A-Z_][a-zA-Z0-9_]*
  // 7. Numbers: \d+(\.\d+)?
  // 8. Module:Function call prefix: [a-z][a-zA-Z0-9_]*(?=:)
  // 9. Atoms: [a-z][a-zA-Z0-9_]*
  // 10. Operators & Arrows: <<|>>|->|<-|=>|:=|=:=|=\/=|==|\/=|=<|>=|\+\+|--|\|\||#
  // 11. Delimiters: [{}()\[\].,;]
  const pattern = /(%.*$)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(^\s*-[a-z_]+)|\b(case|of|when|end|fun|if|receive|after|try|catch|begin|query|cond|let|andalso|orelse|div|rem|band|bor|bxor|bnot|bsl|bsr|and|or|xor|not)\b|(\b[A-Z_][a-zA-Z0-9_]*\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-z][a-zA-Z0-9_]*(?=:))|(\b[a-z][a-zA-Z0-9_]*\b)|(<<|>>|->|<-|=>|:=|=:=|=\/=|==|\/=|=<|>=|\+\+|--|\|\||#)|([{}()\[\].,;])/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    const start = match.index;
    const matchedText = match[0];

    // Push any unhighlighted plain text before the match
    if (start > lastIndex) {
      elements.push(
        <span key={`txt-${lastIndex}`} style={{ color: isDark ? '#E2E8F0' : '#020617' }}>
          {line.slice(lastIndex, start)}
        </span>
      );
    }

    const key = `tok-${start}`;

    if (match[1]) {
      // 1. Comment
      elements.push(
        <span key={key} className="italic" style={{ color: isDark ? '#94A3B8' : '#334155' }}>
          {matchedText}
        </span>
      );
    } else if (match[2]) {
      // 2. String
      elements.push(
        <span key={key} className="font-semibold" style={{ color: isDark ? '#34D399' : '#047857' }}>
          {matchedText}
        </span>
      );
    } else if (match[3]) {
      // 3. Quoted Atom
      elements.push(
        <span key={key} className="font-semibold" style={{ color: isDark ? '#2DD4BF' : '#0D5E56' }}>
          {matchedText}
        </span>
      );
    } else if (match[4]) {
      // 4. Module Attribute (-module, -export, -record, etc)
      elements.push(
        <span key={key} className="font-bold" style={{ color: isDark ? '#C084FC' : '#6B21A8' }}>
          {matchedText}
        </span>
      );
    } else if (match[5]) {
      // 5. Keyword (case, of, when, fun, end, etc)
      elements.push(
        <span key={key} className="font-bold" style={{ color: isDark ? '#38BDF8' : '#0948B3' }}>
          {matchedText}
        </span>
      );
    } else if (match[6]) {
      // 6. Variable (capitalized or _)
      elements.push(
        <span key={key} className="font-bold" style={{ color: isDark ? '#FBBF24' : '#9A3412' }}>
          {matchedText}
        </span>
      );
    } else if (match[7]) {
      // 7. Number
      elements.push(
        <span key={key} className="font-semibold" style={{ color: isDark ? '#FB923C' : '#C2410C' }}>
          {matchedText}
        </span>
      );
    } else if (match[8]) {
      // 8. Module call prefix (e.g. lists:)
      elements.push(
        <span key={key} className="font-bold" style={{ color: isDark ? '#38BDF8' : '#0284C7' }}>
          {matchedText}
        </span>
      );
    } else if (match[9]) {
      // 9. Atom
      elements.push(
        <span key={key} className="font-semibold" style={{ color: isDark ? '#2DD4BF' : '#0D5E56' }}>
          {matchedText}
        </span>
      );
    } else if (match[10]) {
      // 10. Operators, arrows, bit syntax
      elements.push(
        <span key={key} className="font-bold" style={{ color: isDark ? '#818CF8' : '#3730A3' }}>
          {matchedText}
        </span>
      );
    } else if (match[11]) {
      // 11. Delimiters
      elements.push(
        <span key={key} className="font-semibold" style={{ color: isDark ? '#94A3B8' : '#0F172A' }}>
          {matchedText}
        </span>
      );
    }

    lastIndex = start + matchedText.length;
  }

  // Push remaining trailing text
  if (lastIndex < line.length) {
    elements.push(
      <span key={`txt-${lastIndex}`} style={{ color: isDark ? '#E2E8F0' : '#020617' }}>
        {line.slice(lastIndex)}
      </span>
    );
  }

  return elements;
}

/**
 * Component for rendering full syntax-highlighted Erlang code blocks
 */
export function ErlangCodeBlock({ code, isDark }: { code: string; isDark: boolean }) {
  const lines = code.split('\n');

  return (
    <pre
      className="p-4 my-3 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed rounded-xl transition-all duration-200"
      style={{
        background: isDark ? 'rgba(11, 15, 23, 0.85)' : '#F8FAFC',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #CBD5E1',
        borderLeft: isDark ? '3px solid #818CF8' : '3px solid #3730A3',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.30)' : '0 2px 8px rgba(15,23,42,0.06)',
      }}
    >
      <code>
        {lines.map((line, idx) => (
          <div key={idx} className="table-row">
            <span
              className="table-cell pr-4 select-none text-right font-mono text-xs font-semibold"
              style={{ width: '2.2rem', color: isDark ? '#64748B' : '#475569', opacity: isDark ? 0.6 : 1.0 }}
            >
              {idx + 1}
            </span>
            <span className="table-cell font-mono">
              {highlightErlangLine(line, isDark)}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}
