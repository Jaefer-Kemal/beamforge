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

  // 5. Language Configuration (Comments, Brackets, Auto-closing pairs)
  monaco.languages.setLanguageConfiguration('erlang', {
    comments: {
      lineComment: '%',
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['<<', '>>'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '<<', close: '>>' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '<<', close: '>>' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  // 6. Erlang IntelliSense Autocomplete & Tab-to-Expand Snippets
  if (!(monaco.languages as any).__bf_erlangCompletionRegistered) {
    (monaco.languages as any).__bf_erlangCompletionRegistered = true;
    monaco.languages.registerCompletionItemProvider('erlang', {
      triggerCharacters: [':', '-', '?'],
      provideCompletionItems: (model: any, position: any) => getErlangCompletionItems(model, position, monaco),
    });
  }
}

// ── Erlang Language Constants & BIF Catalog ──────────────────────────────
export const ERLANG_RESERVED_KEYWORDS = new Set([
  'after', 'and', 'andalso', 'band', 'begin', 'bnot', 'bor', 'bsl', 'bsr',
  'bxor', 'case', 'catch', 'cond', 'div', 'end', 'fun', 'if', 'let', 'not',
  'of', 'or', 'orelse', 'query', 'receive', 'rem', 'try', 'when', 'xor',
  'module', 'export', 'export_type', 'import', 'compile', 'record',
  'include', 'include_lib', 'define', 'undef', 'ifdef', 'ifndef',
  'else', 'endif', 'type', 'opaque', 'spec', 'callback', 'behavior', 'behaviour'
]);

export const COMMON_ERLANG_ATOMS = [
  'ok', 'error', 'true', 'false', 'undefined', 'nil',
  'matched', 'mismatch', 'success', 'not_found', 'server_crash', 'unknown_code',
  'timeout', 'normal', 'reply', 'noreply', 'stop', 'continue', 'halt',
  'badarg', 'badmatch', 'function_clause', 'case_clause'
];

export const ERLANG_BUILTIN_FUNCTIONS = [
  { label: 'length', arity: 1, snippet: 'length(${1:List})', detail: 'length/1 (BIF)', doc: 'Returns the length of List.' },
  { label: 'hd', arity: 1, snippet: 'hd(${1:List})', detail: 'hd/1 (BIF)', doc: 'Returns the head of a non-empty list.' },
  { label: 'tl', arity: 1, snippet: 'tl(${1:List})', detail: 'tl/1 (BIF)', doc: 'Returns the tail of a non-empty list.' },
  { label: 'element', arity: 2, snippet: 'element(${1:Index}, ${2:Tuple})', detail: 'element/2 (BIF)', doc: 'Returns the Nth element (1-based) of Tuple.' },
  { label: 'setelement', arity: 3, snippet: 'setelement(${1:Index}, ${2:Tuple}, ${3:Value})', detail: 'setelement/3 (BIF)', doc: 'Returns a copy of Tuple with the Nth element replaced.' },
  { label: 'tuple_size', arity: 1, snippet: 'tuple_size(${1:Tuple})', detail: 'tuple_size/1 (BIF)', doc: 'Returns the number of elements in Tuple.' },
  { label: 'byte_size', arity: 1, snippet: 'byte_size(${1:Binary})', detail: 'byte_size/1 (BIF)', doc: 'Returns the number of bytes in Binary.' },
  { label: 'bit_size', arity: 1, snippet: 'bit_size(${1:Bitstring})', detail: 'bit_size/1 (BIF)', doc: 'Returns the number of bits in Bitstring.' },
  { label: 'map_size', arity: 1, snippet: 'map_size(${1:Map})', detail: 'map_size/1 (BIF)', doc: 'Returns the number of key-value pairs in Map.' },
  { label: 'is_atom', arity: 1, snippet: 'is_atom(${1:Term})', detail: 'is_atom/1 (guard/BIF)', doc: 'Returns true if Term is an atom; otherwise false.' },
  { label: 'is_binary', arity: 1, snippet: 'is_binary(${1:Term})', detail: 'is_binary/1 (guard/BIF)', doc: 'Returns true if Term is a binary; otherwise false.' },
  { label: 'is_boolean', arity: 1, snippet: 'is_boolean(${1:Term})', detail: 'is_boolean/1 (guard/BIF)', doc: 'Returns true if Term is boolean (true or false); otherwise false.' },
  { label: 'is_float', arity: 1, snippet: 'is_float(${1:Term})', detail: 'is_float/1 (guard/BIF)', doc: 'Returns true if Term is a floating-point number.' },
  { label: 'is_function', arity: 1, snippet: 'is_function(${1:Term})', detail: 'is_function/1 (guard/BIF)', doc: 'Returns true if Term is a fun.' },
  { label: 'is_function', arity: 2, snippet: 'is_function(${1:Term}, ${2:Arity})', detail: 'is_function/2 (guard/BIF)', doc: 'Returns true if Term is a fun of arity Arity.' },
  { label: 'is_integer', arity: 1, snippet: 'is_integer(${1:Term})', detail: 'is_integer/1 (guard/BIF)', doc: 'Returns true if Term is an integer.' },
  { label: 'is_list', arity: 1, snippet: 'is_list(${1:Term})', detail: 'is_list/1 (guard/BIF)', doc: 'Returns true if Term is a list.' },
  { label: 'is_map', arity: 1, snippet: 'is_map(${1:Term})', detail: 'is_map/1 (guard/BIF)', doc: 'Returns true if Term is a map.' },
  { label: 'is_number', arity: 1, snippet: 'is_number(${1:Term})', detail: 'is_number/1 (guard/BIF)', doc: 'Returns true if Term is an integer or float.' },
  { label: 'is_pid', arity: 1, snippet: 'is_pid(${1:Term})', detail: 'is_pid/1 (guard/BIF)', doc: 'Returns true if Term is a process identifier (PID).' },
  { label: 'is_reference', arity: 1, snippet: 'is_reference(${1:Term})', detail: 'is_reference/1 (guard/BIF)', doc: 'Returns true if Term is a reference.' },
  { label: 'is_tuple', arity: 1, snippet: 'is_tuple(${1:Term})', detail: 'is_tuple/1 (guard/BIF)', doc: 'Returns true if Term is a tuple.' },
  { label: 'is_record', arity: 2, snippet: 'is_record(${1:Term}, ${2:RecordTag})', detail: 'is_record/2 (guard/BIF)', doc: 'Returns true if Term is a tuple matching RecordTag.' },
  { label: 'make_ref', arity: 0, snippet: 'make_ref()', detail: 'make_ref/0 (BIF)', doc: 'Creates and returns an almost unique reference.' },
  { label: 'self', arity: 0, snippet: 'self()', detail: 'self/0 (BIF)', doc: 'Returns the process identifier (PID) of the calling process.' },
  { label: 'node', arity: 0, snippet: 'node()', detail: 'node/0 (BIF)', doc: 'Returns the name of the local node.' },
  { label: 'atom_to_list', arity: 1, snippet: 'atom_to_list(${1:Atom})', detail: 'atom_to_list/1 (BIF)', doc: 'Converts an atom to a list/string.' },
  { label: 'list_to_atom', arity: 1, snippet: 'list_to_atom(${1:String})', detail: 'list_to_atom/1 (BIF)', doc: 'Converts a string/list to an atom.' },
  { label: 'list_to_existing_atom', arity: 1, snippet: 'list_to_existing_atom(${1:String})', detail: 'list_to_existing_atom/1 (BIF)', doc: 'Converts a string to an existing atom.' },
  { label: 'integer_to_list', arity: 1, snippet: 'integer_to_list(${1:Integer})', detail: 'integer_to_list/1 (BIF)', doc: 'Converts an integer to a string.' },
  { label: 'list_to_integer', arity: 1, snippet: 'list_to_integer(${1:String})', detail: 'list_to_integer/1 (BIF)', doc: 'Converts a string to an integer.' },
  { label: 'term_to_binary', arity: 1, snippet: 'term_to_binary(${1:Term})', detail: 'term_to_binary/1 (BIF)', doc: 'Encodes an Erlang term into external binary format.' },
  { label: 'binary_to_term', arity: 1, snippet: 'binary_to_term(${1:Binary})', detail: 'binary_to_term/1 (BIF)', doc: 'Decodes a binary into an Erlang term.' },
  { label: 'throw', arity: 1, snippet: 'throw(${1:Reason})', detail: 'throw/1 (BIF)', doc: 'Throws an exception with reason.' },
  { label: 'exit', arity: 1, snippet: 'exit(${1:Reason})', detail: 'exit/1 (BIF)', doc: 'Terminates calling process with reason.' },
  { label: 'error', arity: 1, snippet: 'error(${1:Reason})', detail: 'error/1 (BIF)', doc: 'Stops execution of calling process with runtime error reason.' },
  { label: 'error', arity: 2, snippet: 'error(${1:Reason}, ${2:Args})', detail: 'error/2 (BIF)', doc: 'Stops execution of calling process with runtime error reason and arguments.' },
];

const buildArgsSnippet = (arity: number): string => {
  if (arity === 0) return '';
  if (arity === 1) return '${1:Arg}';
  return Array.from({ length: arity }, (_, i) => `\${${i + 1}:Arg${i + 1}}`).join(', ');
};

/**
 * Erlang Completion Provider
 * Dispatches contextual completions based on cursor prefix:
 * 1. Module remote calls: e.g. "io:", "io:f", "maps:g", "lists:rev"
 * 2. Compile-time macros: e.g. "?", "?MODULE", "?DEFAULT_"
 * 3. Module directives: e.g. "-", "-module", "-export", "-define" at start of line
 * 4. General scope: Expressions, control flow, available OTP modules, and in-scope variables
 */
export function getErlangCompletionItems(model: any, position: any, monaco?: any) {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  const word = model.getWordUntilPosition(position);
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };

  const SnippetKind = monaco?.languages?.CompletionItemKind?.Snippet ?? 27;
  const FunctionKind = monaco?.languages?.CompletionItemKind?.Function ?? 1;
  const ModuleKind = monaco?.languages?.CompletionItemKind?.Module ?? 8;
  const VariableKind = monaco?.languages?.CompletionItemKind?.Variable ?? 4;
  const ConstantKind = monaco?.languages?.CompletionItemKind?.Constant ?? 14;
  const InsertAsSnippet = monaco?.languages?.CompletionItemInsertTextRule?.InsertAsSnippet ?? 4;

  // 1. Module remote calls: e.g. "io:", "io:f", "lists:rev", "maps:g"
  const colonMatch = textUntilPosition.match(/([a-z_][a-zA-Z0-9_]*):([a-z_0-9]*)$/);
  if (colonMatch) {
    const mod = colonMatch[1];
    const funcPrefix = colonMatch[2] || '';
    if (OTP_LIB_COMPLETIONS[mod]) {
      const matches = OTP_LIB_COMPLETIONS[mod].filter((c) => {
        if (!funcPrefix) return true;
        const p = funcPrefix.toLowerCase();
        return c.label.toLowerCase().startsWith(p) || c.insertText.toLowerCase().startsWith(p);
      });
      return {
        suggestions: matches.map((c) => ({
          label: c.label,
          kind: FunctionKind,
          documentation: c.doc,
          detail: c.detail,
          insertText: c.insertText,
          insertTextRules: InsertAsSnippet,
          range,
        })),
      };
    }
    // If remote call to an unknown module, return empty suggestions rather than leaking top-level keywords
    return { suggestions: [] };
  }

  // 2. Macro Trigger: e.g. "?", "?M", "?DEFAULT_"
  const macroMatch = textUntilPosition.match(/\?([a-zA-Z0-9_]*)$/);
  if (macroMatch) {
    const macroPrefix = (macroMatch[1] || '').toLowerCase();
    const builtInMacros = [
      { label: 'MODULE', detail: '?MODULE (current module atom)', insertText: 'MODULE', doc: 'Expands at compile time to the current module name atom.' },
      { label: 'LINE', detail: '?LINE (current line number)', insertText: 'LINE', doc: 'Expands at compile time to the current source line number.' },
      { label: 'FILE', detail: '?FILE (current filename string)', insertText: 'FILE', doc: 'Expands at compile time to the current source file name.' },
      { label: 'MACHINE', detail: '?MACHINE (BEAM VM name)', insertText: 'MACHINE', doc: 'Expands at compile time to the current VM target machine name.' },
    ];

    // Scan file for user-defined -define(NAME, ...) macros
    const fullContent = model.getValue();
    const defineMatches = fullContent.matchAll(/-define\s*\(\s*([a-zA-Z0-9_]+)/g);
    const userMacros = new Set<string>();
    for (const dm of defineMatches) {
      if (dm[1]) userMacros.add(dm[1]);
    }

    const allMacros = [
      ...builtInMacros,
      ...Array.from(userMacros).map((mName) => ({
        label: mName,
        detail: `?${mName} (compile-time macro)`,
        insertText: mName,
        doc: `User-defined macro -define(${mName}, ...) in current file.`,
      })),
    ];

    const filteredMacros = allMacros.filter((m) => !macroPrefix || m.label.toLowerCase().startsWith(macroPrefix));
    return {
      suggestions: filteredMacros.map((m) => ({
        label: m.label,
        kind: ConstantKind,
        documentation: m.doc,
        detail: m.detail,
        insertText: m.insertText,
        insertTextRules: InsertAsSnippet,
        range,
      })),
    };
  }

  // 3. Module Directive Trigger: e.g. at line start typing "-" or "-mod"
  const directiveMatch = textUntilPosition.match(/^\s*-([a-z_]*)$/);
  if (directiveMatch) {
    const dirPrefix = (directiveMatch[1] || '').toLowerCase();
    const hyphenCol = textUntilPosition.lastIndexOf('-') + 1;
    const dirRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: hyphenCol,
      endColumn: position.column,
    };
    const directiveSnippets = ERLANG_SNIPPETS.filter((s) => s.label.startsWith('-'));
    const filtered = directiveSnippets.filter((s) => !dirPrefix || s.label.toLowerCase().includes(dirPrefix));
    return {
      suggestions: filtered.map((s) => ({
        label: s.label,
        kind: SnippetKind,
        documentation: s.doc,
        detail: s.detail,
        insertText: s.insertText,
        insertTextRules: InsertAsSnippet,
        range: dirRange,
      })),
    };
  }

  // 4. General Scope: Expressions, Control Flow, Modules, Functions, Atoms & Variables
  const suggestions: any[] = [];
  const fullContent = model.getValue();

  // A. Control flow snippets (exclude directives like -module, -export when not at start of line with hyphen)
  for (const s of ERLANG_SNIPPETS) {
    if (!s.label.startsWith('-')) {
      suggestions.push({
        label: s.label,
        kind: SnippetKind,
        documentation: s.doc,
        detail: s.detail,
        insertText: s.insertText,
        insertTextRules: InsertAsSnippet,
        range,
        sortText: `05_${s.label}`,
      });
    }
  }

  // Track discovered function signatures and names
  const seenFunctionSignatures = new Set<string>();
  const seenFunctionNames = new Set<string>();

  // B. In-file Exported Functions from -export([fn/arity, ...])
  const exportMatches = fullContent.matchAll(/-export\s*\(\s*\[([\s\S]*?)\]\s*\)\./g);
  for (const em of exportMatches) {
    const listBody = em[1];
    const itemMatches = listBody.matchAll(/([a-z][a-zA-Z0-9_]*)\s*\/\s*(\d+)/g);
    for (const im of itemMatches) {
      const fn = im[1];
      const arity = parseInt(im[2], 10);
      const sig = `${fn}/${arity}`;
      seenFunctionNames.add(fn);
      if (!seenFunctionSignatures.has(sig)) {
        seenFunctionSignatures.add(sig);
        suggestions.push({
          label: fn,
          kind: FunctionKind,
          detail: `${fn}/${arity} (exported function)`,
          documentation: `Module function declared in -export([${sig}]).`,
          insertText: `${fn}(${buildArgsSnippet(arity)})`,
          insertTextRules: InsertAsSnippet,
          range,
          sortText: `10_${fn}`,
        });
      }
    }
  }

  // C. In-file Local Function Definitions (e.g. fn(A, B) ->)
  const funcDefRegex = /^[ \t]*([a-z][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?:when[\s\S]*?)?->/gm;
  let defMatch;
  while ((defMatch = funcDefRegex.exec(fullContent)) !== null) {
    const fn = defMatch[1];
    if (ERLANG_RESERVED_KEYWORDS.has(fn)) continue;
    seenFunctionNames.add(fn);

    const rawArgs = defMatch[2].trim();
    let arity = 0;
    if (rawArgs.length > 0) {
      let depth = 0;
      let count = 1;
      for (let i = 0; i < rawArgs.length; i++) {
        const ch = rawArgs[i];
        if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
        else if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth = Math.max(0, depth - 1);
        else if (ch === ',' && depth === 0) count++;
      }
      arity = count;
    }

    const sig = `${fn}/${arity}`;
    if (!seenFunctionSignatures.has(sig)) {
      seenFunctionSignatures.add(sig);
      suggestions.push({
        label: fn,
        kind: FunctionKind,
        detail: `${fn}/${arity} (local function)`,
        documentation: `Local function defined in current module.`,
        insertText: `${fn}(${buildArgsSnippet(arity)})`,
        insertTextRules: InsertAsSnippet,
        range,
        sortText: `12_${fn}`,
      });
    }
  }

  // D. Standard Auto-Imported Erlang BIFs
  for (const bif of ERLANG_BUILTIN_FUNCTIONS) {
    suggestions.push({
      label: bif.label,
      kind: FunctionKind,
      detail: bif.detail,
      documentation: bif.doc,
      insertText: bif.snippet,
      insertTextRules: InsertAsSnippet,
      range,
      sortText: `20_${bif.label}`,
    });
  }

  // E. In-Scope Atoms (Common Erlang atoms + module in-file atoms)
  const seenAtoms = new Set<string>();
  const bifNames = new Set(ERLANG_BUILTIN_FUNCTIONS.map((b) => b.label));
  const fileAtomMatches = fullContent.match(/\b[a-z][a-zA-Z0-9_]*\b/g);
  const candidateAtoms = [
    ...COMMON_ERLANG_ATOMS,
    ...(fileAtomMatches || []),
  ];

  for (const a of candidateAtoms) {
    if (
      typeof a === 'string' &&
      a.length >= 2 &&
      !ERLANG_RESERVED_KEYWORDS.has(a) &&
      !bifNames.has(a) &&
      !seenAtoms.has(a)
    ) {
      seenAtoms.add(a);
      suggestions.push({
        label: a,
        kind: ConstantKind,
        detail: 'Atom',
        documentation: `Erlang atom ('${a}').`,
        insertText: a,
        range,
        sortText: `30_${a}`,
      });
    }
  }

  // F. Standard OTP Modules (e.g. typing "i" suggests "io:", typing "l" suggests "lists:", etc.)
  const allModules = Object.keys(OTP_LIB_COMPLETIONS);
  for (const m of allModules) {
    suggestions.push({
      label: `${m}:`,
      kind: ModuleKind,
      detail: `OTP ${m} standard library module`,
      insertText: `${m}:`,
      range,
      sortText: `40_${m}`,
    });
  }

  // G. In-scope variables: scan words starting with uppercase or underscore
  const varMatches = fullContent.match(/\b[A-Z_][a-zA-Z0-9_]*\b/g);
  if (varMatches) {
    const uniqueVars = Array.from(new Set(varMatches));
    for (const v of uniqueVars.slice(0, 40)) {
      if (typeof v === 'string' && v.length > 1) {
        suggestions.push({
          label: v,
          kind: VariableKind,
          detail: 'In-scope variable',
          insertText: v,
          range,
          sortText: `50_${v}`,
        });
      }
    }
  }

  return { suggestions };
}

// ── Standard OTP Snippets ──────────────────────────────────────────────────
export const ERLANG_SNIPPETS = [
  {
    label: 'case',
    detail: 'case Expr of ... end',
    insertText: 'case ${1:Expr} of\n    ${2:Pattern} ->\n        ${3:Body};\n    ${4:_Other} ->\n        ${5:Default}\nend',
    doc: 'Pattern matching branch construct with guards and default fall-through.',
  },
  {
    label: 'try',
    detail: 'try Expr of ... catch ... end',
    insertText: 'try ${1:Expr} of\n    ${2:Pattern} ->\n        ${3:Body}\ncatch\n    ${4:Class}:${5:Reason}:${6:Stacktrace} ->\n        ${7:ErrorHandler}\nend',
    doc: 'Sequential exception containment pattern in Erlang/OTP.',
  },
  {
    label: 'receive',
    detail: 'receive Pattern -> Body after ... end',
    insertText: 'receive\n    ${1:Pattern} ->\n        ${2:Body}\nafter ${3:TimeoutMs} ->\n        ${4:TimeoutBody}\nend',
    doc: 'Selective mailbox message receive loop with timeout guard.',
  },
  {
    label: 'fun',
    detail: 'fun(Args) -> Body end',
    insertText: 'fun(${1:Args}) -> ${2:Body} end',
    doc: 'Anonymous function closure.',
  },
  {
    label: 'spawn',
    detail: 'spawn(fun() -> ... end)',
    insertText: 'spawn(fun() ->\n    ${1:Body}\nend)',
    doc: 'Spawns an asynchronous actor process.',
  },
  {
    label: 'spawn_link',
    detail: 'spawn_link(fun() -> ... end)',
    insertText: 'spawn_link(fun() ->\n    ${1:Body}\nend)',
    doc: 'Atomically spawns and links an actor to caller.',
  },
  {
    label: 'spawn_monitor',
    detail: '{Pid, Ref} = spawn_monitor(fun() -> ... end)',
    insertText: '{${1:WorkerPid}, ${2:MRef}} = spawn_monitor(fun() ->\n    ${3:Body}\nend)',
    doc: 'Atomically spawns and monitors an actor to receive {\'DOWN\', Ref, process, Pid, Reason}.',
  },
  {
    label: '-module',
    detail: '-module(name).',
    insertText: '-module(${1:module_name}).\n',
    doc: 'Declares the Erlang module header.',
  },
  {
    label: '-export',
    detail: '-export([func/arity]).',
    insertText: '-export([\n    ${1:function_name}/${2:arity}\n]).\n',
    doc: 'Module public function export declaration list.',
  },
  {
    label: '-record',
    detail: '-record(name, {fields}).',
    insertText: '-record(${1:record_name}, {\n    ${2:field} = ${3:default} :: ${4:type}()\n}).\n',
    doc: 'Defines an Erlang record structure.',
  },
  {
    label: '-define',
    detail: '-define(CONST, value).',
    insertText: '-define(${1:MACRO_NAME}, ${2:Value}).\n',
    doc: 'Compile-time macro definition directive.',
  },
  {
    label: '-type',
    detail: '-type name() :: type.',
    insertText: '-type ${1:type_name}() :: ${2:term()}.\n',
    doc: 'Custom type specification definition.',
  },
  {
    label: '-spec',
    detail: '-spec func(args) -> return.',
    insertText: '-spec ${1:func_name}(${2:arg_types}) -> ${3:return_type}.\n',
    doc: 'Formal Dialyzer function type specification.',
  },
  {
    label: '-behaviour',
    detail: '-behaviour(gen_server).',
    insertText: '-behaviour(${1:gen_server}).\n',
    doc: 'Declares implementation of an OTP design pattern behaviour.',
  },
];

// ── Standard OTP Library Function Completions ─────────────────────────────
export const OTP_LIB_COMPLETIONS: Record<string, Array<{ label: string; detail: string; insertText: string; doc: string }>> = {
  io: [
    { label: 'format/1', detail: 'io:format(Format)', insertText: 'format("${1:~s~n}")', doc: 'Writes formatted output string to standard_io.' },
    { label: 'format/2', detail: 'io:format(Format, Data)', insertText: 'format("${1:~p~n}", [${2:Data}])', doc: 'Writes formatted output string with argument list to standard_io.' },
    { label: 'fwrite/1', detail: 'io:fwrite(Format)', insertText: 'fwrite("${1:~s~n}")', doc: 'Identical to format/1.' },
    { label: 'fwrite/2', detail: 'io:fwrite(Format, Data)', insertText: 'fwrite("${1:~p~n}", [${2:Data}])', doc: 'Identical to format/2.' },
    { label: 'get_line/1', detail: 'io:get_line(Prompt)', insertText: 'get_line("${1:Prompt: }")', doc: 'Reads a line of text terminated by newline from standard_io.' },
    { label: 'get_line/2', detail: 'io:get_line(Device, Prompt)', insertText: 'get_line(${1:Device}, "${2:Prompt: }")', doc: 'Reads a line of text terminated by newline from Device.' },
    { label: 'setopts/2', detail: 'io:setopts(Device, Opts)', insertText: 'setopts(${1:standard_io}, [${2:encoding, utf8}])', doc: 'Sets options for standard or file IO device.' },
    { label: 'read/1', detail: 'io:read(Prompt)', insertText: 'read("${1:Prompt: }")', doc: 'Reads an Erlang term terminated by dot from standard_io.' },
    { label: 'read/2', detail: 'io:read(Device, Prompt)', insertText: 'read(${1:Device}, "${2:Prompt: }")', doc: 'Reads an Erlang term terminated by dot from Device.' },
  ],
  timer: [
    { label: 'sleep/1', detail: 'timer:sleep(TimeMs)', insertText: 'sleep(${1:TimeMs})', doc: 'Suspends the calling process for TimeMs milliseconds.' },
    { label: 'send_after/2', detail: 'timer:send_after(TimeMs, Message)', insertText: 'send_after(${1:TimeMs}, ${2:Message})', doc: 'Evaluates Pid ! Message after TimeMs milliseconds.' },
    { label: 'send_after/3', detail: 'timer:send_after(TimeMs, Dest, Message)', insertText: 'send_after(${1:TimeMs}, ${2:Dest}, ${3:Message})', doc: 'Evaluates Dest ! Message after TimeMs milliseconds.' },
    { label: 'send_interval/2', detail: 'timer:send_interval(TimeMs, Message)', insertText: 'send_interval(${1:TimeMs}, ${2:Message})', doc: 'Periodically sends Message to calling process every TimeMs milliseconds.' },
    { label: 'send_interval/3', detail: 'timer:send_interval(TimeMs, Dest, Message)', insertText: 'send_interval(${1:TimeMs}, ${2:Dest}, ${3:Message})', doc: 'Periodically sends Message to Dest every TimeMs milliseconds.' },
    { label: 'cancel/1', detail: 'timer:cancel(TRef)', insertText: 'cancel(${1:TRef})', doc: 'Cancels a previously scheduled timer reference.' },
    { label: 'tc/1', detail: 'timer:tc(Fun)', insertText: 'tc(${1:Fun})', doc: 'Measures execution time of Fun in microseconds: returns {TimeUs, Value}.' },
    { label: 'tc/2', detail: 'timer:tc(Fun, Arguments)', insertText: 'tc(${1:Fun}, [${2:Args}])', doc: 'Measures execution time of Fun with Arguments in microseconds: returns {TimeUs, Value}.' },
    { label: 'tc/3', detail: 'timer:tc(Module, Function, Arguments)', insertText: 'tc(${1:Module}, ${2:Function}, [${3:Args}])', doc: 'Measures execution time of Module:Function(Arguments) in microseconds.' },
    { label: 'seconds/1', detail: 'timer:seconds(Seconds)', insertText: 'seconds(${1:Seconds})', doc: 'Converts Seconds to milliseconds.' },
    { label: 'minutes/1', detail: 'timer:minutes(Minutes)', insertText: 'minutes(${1:Minutes})', doc: 'Converts Minutes to milliseconds.' },
    { label: 'hours/1', detail: 'timer:hours(Hours)', insertText: 'hours(${1:Hours})', doc: 'Converts Hours to milliseconds.' },
  ],
  binary: [
    { label: 'part/2', detail: 'binary:part(Subject, PosLen)', insertText: 'part(${1:Subject}, {${2:Start}, ${3:Length}})', doc: 'Extracts a slice from Subject binary.' },
    { label: 'part/3', detail: 'binary:part(Subject, Start, Length)', insertText: 'part(${1:Subject}, ${2:Start}, ${3:Length})', doc: 'Extracts Length bytes starting at zero-indexed Start from Subject.' },
    { label: 'split/2', detail: 'binary:split(Subject, Pattern)', insertText: 'split(${1:Subject}, ${2:Pattern})', doc: 'Splits Subject binary on the first occurrence of Pattern.' },
    { label: 'split/3', detail: 'binary:split(Subject, Pattern, Options)', insertText: 'split(${1:Subject}, ${2:Pattern}, [${3:global}])', doc: 'Splits Subject on Pattern with options ([global, trim]).' },
    { label: 'replace/3', detail: 'binary:replace(Subject, Pattern, Replacement)', insertText: 'replace(${1:Subject}, ${2:Pattern}, ${3:Replacement})', doc: 'Replaces the first occurrence of Pattern in Subject with Replacement.' },
    { label: 'replace/4', detail: 'binary:replace(Subject, Pattern, Replacement, Options)', insertText: 'replace(${1:Subject}, ${2:Pattern}, ${3:Replacement}, [${4:global}])', doc: 'Replaces occurrences of Pattern in Subject with Replacement using Options.' },
    { label: 'match/2', detail: 'binary:match(Subject, Pattern)', insertText: 'match(${1:Subject}, ${2:Pattern})', doc: 'Searches for first occurrence of Pattern in Subject; returns {Start, Length} or nomatch.' },
    { label: 'matches/2', detail: 'binary:matches(Subject, Pattern)', insertText: 'matches(${1:Subject}, ${2:Pattern})', doc: 'Returns all occurrences of Pattern in Subject as a list of {Start, Length}.' },
    { label: 'copy/1', detail: 'binary:copy(Subject)', insertText: 'copy(${1:Subject})', doc: 'Creates a unshared copy of Subject binary.' },
    { label: 'copy/2', detail: 'binary:copy(Subject, N)', insertText: 'copy(${1:Subject}, ${2:N})', doc: 'Duplicates Subject binary N times.' },
    { label: 'first/1', detail: 'binary:first(Subject)', insertText: 'first(${1:Subject})', doc: 'Returns the first byte of Subject binary as an integer.' },
    { label: 'last/1', detail: 'binary:last(Subject)', insertText: 'last(${1:Subject})', doc: 'Returns the last byte of Subject binary as an integer.' },
    { label: 'bin_to_list/1', detail: 'binary:bin_to_list(Subject)', insertText: 'bin_to_list(${1:Subject})', doc: 'Converts Subject binary to a list of byte integers.' },
    { label: 'list_to_bin/1', detail: 'binary:list_to_bin(ByteList)', insertText: 'list_to_bin(${1:ByteList})', doc: 'Converts a list of bytes into an Erlang binary.' },
  ],
  string: [
    { label: 'trim/1', detail: 'string:trim(String)', insertText: 'trim(${1:String})', doc: 'Trims leading and trailing whitespace characters.' },
    { label: 'trim/2', detail: 'string:trim(String, Direction)', insertText: 'trim(${1:String}, ${2:both})', doc: 'Trims whitespace in Direction (leading, trailing, both).' },
    { label: 'split/2', detail: 'string:split(String, SearchPattern)', insertText: 'split(${1:String}, ${2:SearchPattern})', doc: 'Splits String on the first occurrence of SearchPattern.' },
    { label: 'split/3', detail: 'string:split(String, SearchPattern, Where)', insertText: 'split(${1:String}, ${2:SearchPattern}, ${3:all})', doc: 'Splits String on SearchPattern (leading, trailing, or all).' },
    { label: 'uppercase/1', detail: 'string:uppercase(String)', insertText: 'uppercase(${1:String})', doc: 'Converts all characters in String to uppercase.' },
    { label: 'lowercase/1', detail: 'string:lowercase(String)', insertText: 'lowercase(${1:String})', doc: 'Converts all characters in String to lowercase.' },
    { label: 'length/1', detail: 'string:length(String)', insertText: 'length(${1:String})', doc: 'Returns the character length of String.' },
    { label: 'find/2', detail: 'string:find(String, SearchPattern)', insertText: 'find(${1:String}, ${2:SearchPattern})', doc: 'Searches for SearchPattern in String: returns suffix or nomatch.' },
    { label: 'replace/3', detail: 'string:replace(String, SearchPattern, Replacement)', insertText: 'replace(${1:String}, ${2:SearchPattern}, ${3:Replacement})', doc: 'Replaces SearchPattern with Replacement in String.' },
    { label: 'prefix/2', detail: 'string:prefix(String, Prefix)', insertText: 'prefix(${1:String}, ${2:Prefix})', doc: 'Returns the remainder of String after Prefix, or nomatch.' },
    { label: 'slice/2', detail: 'string:slice(String, Start)', insertText: 'slice(${1:String}, ${2:Start})', doc: 'Extracts a substring starting at zero-indexed character position Start.' },
    { label: 'slice/3', detail: 'string:slice(String, Start, Length)', insertText: 'slice(${1:String}, ${2:Start}, ${3:Length})', doc: 'Extracts Length characters starting at Start.' },
  ],
  gen_tcp: [
    { label: 'listen/2', detail: 'gen_tcp:listen(Port, Options)', insertText: 'listen(${1:Port}, [binary, {packet, raw}, {active, false}, {reuseaddr, true}])', doc: 'Sets up a socket to listen on Port with given Options.' },
    { label: 'accept/1', detail: 'gen_tcp:accept(ListenSocket)', insertText: 'accept(${1:ListenSocket})', doc: 'Accepts an incoming TCP connection on ListenSocket.' },
    { label: 'accept/2', detail: 'gen_tcp:accept(ListenSocket, TimeoutMs)', insertText: 'accept(${1:ListenSocket}, ${2:5000})', doc: 'Accepts an incoming TCP connection with timeout.' },
    { label: 'connect/3', detail: 'gen_tcp:connect(Address, Port, Options)', insertText: 'connect(${1:Address}, ${2:Port}, [binary, {active, false}])', doc: 'Connects to a server on Address:Port with Options.' },
    { label: 'connect/4', detail: 'gen_tcp:connect(Address, Port, Options, TimeoutMs)', insertText: 'connect(${1:Address}, ${2:Port}, [binary, {active, false}], ${3:5000})', doc: 'Connects to a server with explicit timeout.' },
    { label: 'send/2', detail: 'gen_tcp:send(Socket, Packet)', insertText: 'send(${1:Socket}, ${2:Packet})', doc: 'Sends a packet (binary or iolist) over a TCP socket.' },
    { label: 'recv/2', detail: 'gen_tcp:recv(Socket, Length)', insertText: 'recv(${1:Socket}, ${2:0})', doc: 'Receives a packet from a socket in passive mode ({active, false}).' },
    { label: 'recv/3', detail: 'gen_tcp:recv(Socket, Length, TimeoutMs)', insertText: 'recv(${1:Socket}, ${2:0}, ${3:5000})', doc: 'Receives a packet with timeout.' },
    { label: 'close/1', detail: 'gen_tcp:close(Socket)', insertText: 'close(${1:Socket})', doc: 'Closes a TCP socket.' },
    { label: 'controlling_process/2', detail: 'gen_tcp:controlling_process(Socket, Pid)', insertText: 'controlling_process(${1:Socket}, ${2:Pid})', doc: 'Assigns a new controlling process Pid to Socket.' },
    { label: 'shutdown/2', detail: 'gen_tcp:shutdown(Socket, How)', insertText: 'shutdown(${1:Socket}, ${2:read_write})', doc: 'Shuts down Socket for read, write, or read_write.' },
  ],
  inet: [
    { label: 'setopts/2', detail: 'inet:setopts(Socket, Options)', insertText: 'setopts(${1:Socket}, [{active, ${2:once}}])', doc: 'Sets socket options dynamically (e.g. {active, once}, {packet, http}).' },
    { label: 'getopts/2', detail: 'inet:getopts(Socket, Options)', insertText: 'getopts(${1:Socket}, [${2:active, buffer}])', doc: 'Retrieves current socket options.' },
    { label: 'peername/1', detail: 'inet:peername(Socket)', insertText: 'peername(${1:Socket})', doc: 'Returns the remote IP address and port: {ok, {Address, Port}}.' },
    { label: 'sockname/1', detail: 'inet:sockname(Socket)', insertText: 'sockname(${1:Socket})', doc: 'Returns the local IP address and port: {ok, {Address, Port}}.' },
    { label: 'port/1', detail: 'inet:port(Socket)', insertText: 'port(${1:Socket})', doc: 'Returns the local port number for Socket.' },
    { label: 'parse_address/1', detail: 'inet:parse_address(AddressStr)', insertText: 'parse_address("${1:127.0.0.1}")', doc: 'Parses an IPv4 or IPv6 string into a tuple address.' },
    { label: 'format_error/1', detail: 'inet:format_error(Reason)', insertText: 'format_error(${1:Reason})', doc: 'Returns a human-readable diagnostic string for an inet POSIX error atom.' },
  ],
  file: [
    { label: 'read_file/1', detail: 'file:read_file(Filename)', insertText: 'read_file(${1:Filename})', doc: 'Reads the entire file into a binary: {ok, Binary} | {error, Reason}.' },
    { label: 'write_file/2', detail: 'file:write_file(Filename, Bytes)', insertText: 'write_file(${1:Filename}, ${2:Bytes})', doc: 'Writes binary or iodata to Filename: ok | {error, Reason}.' },
    { label: 'write_file/3', detail: 'file:write_file(Filename, Bytes, Modes)', insertText: 'write_file(${1:Filename}, ${2:Bytes}, [${3:append}])', doc: 'Writes binary or iodata to Filename with modes.' },
    { label: 'open/2', detail: 'file:open(Filename, Modes)', insertText: 'open(${1:Filename}, [${2:read, binary}])', doc: 'Opens Filename with specified access Modes.' },
    { label: 'close/1', detail: 'file:close(IoDevice)', insertText: 'close(${1:IoDevice})', doc: 'Closes an open file descriptor.' },
    { label: 'read/2', detail: 'file:read(IoDevice, Number)', insertText: 'read(${1:IoDevice}, ${2:Number})', doc: 'Reads Number bytes/characters from open IoDevice.' },
    { label: 'write/2', detail: 'file:write(IoDevice, Bytes)', insertText: 'write(${1:IoDevice}, ${2:Bytes})', doc: 'Writes Bytes to open IoDevice.' },
    { label: 'delete/1', detail: 'file:delete(Filename)', insertText: 'delete(${1:Filename})', doc: 'Deletes file Filename.' },
    { label: 'make_dir/1', detail: 'file:make_dir(Dir)', insertText: 'make_dir(${1:Dir})', doc: 'Creates directory Dir.' },
    { label: 'list_dir/1', detail: 'file:list_dir(Dir)', insertText: 'list_dir(${1:Dir})', doc: 'Lists filenames in directory Dir.' },
    { label: 'consult/1', detail: 'file:consult(Filename)', insertText: 'consult(${1:Filename})', doc: 'Reads Erlang terms from file Filename: {ok, Terms} | {error, Reason}.' },
  ],
  crypto: [
    { label: 'strong_rand_bytes/1', detail: 'crypto:strong_rand_bytes(N)', insertText: 'strong_rand_bytes(${1:32})', doc: 'Generates N cryptographically secure random bytes.' },
    { label: 'hash/2', detail: 'crypto:hash(Type, Data)', insertText: 'hash(${1:sha256}, ${2:Data})', doc: 'Computes cryptographic digest (e.g. md5, sha256, sha512).' },
    { label: 'mac/4', detail: 'crypto:mac(hmac, Type, Key, Data)', insertText: 'mac(hmac, ${1:sha256}, ${2:Key}, ${3:Data})', doc: 'Computes Message Authentication Code (HMAC, CMAC, Poly1305).' },
    { label: 'crypto_one_time/4', detail: 'crypto:crypto_one_time(Cipher, Key, Data, Flag)', insertText: 'crypto_one_time(${1:aes_256_gcm}, ${2:Key}, ${3:Data}, ${4:true})', doc: 'Performs one-time symmetric cipher encryption or decryption.' },
  ],
  supervisor: [
    { label: 'start_link/2', detail: 'supervisor:start_link(?MODULE, Args)', insertText: 'start_link(?MODULE, ${1:Args})', doc: 'Starts supervisor process with callback module ?MODULE.' },
    { label: 'start_link/3', detail: 'supervisor:start_link({local, ?MODULE}, ?MODULE, Args)', insertText: 'start_link({local, ?MODULE}, ?MODULE, ${1:Args})', doc: 'Starts supervisor with registered local name.' },
    { label: 'start_child/2', detail: 'supervisor:start_child(SupRef, ChildSpec)', insertText: 'start_child(${1:SupRef}, ${2:ChildSpec})', doc: 'Dynamically adds child specification to running supervisor.' },
    { label: 'restart_child/2', detail: 'supervisor:restart_child(SupRef, Id)', insertText: 'restart_child(${1:SupRef}, ${2:Id})', doc: 'Restarts a terminated child process in supervisor tree.' },
    { label: 'terminate_child/2', detail: 'supervisor:terminate_child(SupRef, Id)', insertText: 'terminate_child(${1:SupRef}, ${2:Id})', doc: 'Terminates running child process managed by supervisor.' },
    { label: 'delete_child/2', detail: 'supervisor:delete_child(SupRef, Id)', insertText: 'delete_child(${1:SupRef}, ${2:Id})', doc: 'Deletes child specification from supervisor after termination.' },
    { label: 'which_children/1', detail: 'supervisor:which_children(SupRef)', insertText: 'which_children(${1:SupRef})', doc: 'Returns list of child specifications and PIDs managed by supervisor.' },
    { label: 'count_children/1', detail: 'supervisor:count_children(SupRef)', insertText: 'count_children(${1:SupRef})', doc: 'Returns counts of specs, active processes, supervisors, and workers.' },
  ],
  application: [
    { label: 'start/1', detail: 'application:start(Application)', insertText: 'start(${1:Application})', doc: 'Starts an OTP application and all of its dependencies.' },
    { label: 'start/2', detail: 'application:start(Application, Type)', insertText: 'start(${1:Application}, ${2:permanent})', doc: 'Starts application with restart type (permanent, transient, temporary).' },
    { label: 'stop/1', detail: 'application:stop(Application)', insertText: 'stop(${1:Application})', doc: 'Stops a running OTP application.' },
    { label: 'get_env/2', detail: 'application:get_env(Application, Par)', insertText: 'get_env(${1:Application}, ${2:Par})', doc: 'Retrieves application configuration parameter: {ok, Val} | undefined.' },
    { label: 'get_env/3', detail: 'application:get_env(Application, Par, Def)', insertText: 'get_env(${1:Application}, ${2:Par}, ${3:Def})', doc: 'Retrieves application config parameter with fallback default.' },
    { label: 'set_env/3', detail: 'application:set_env(Application, Par, Val)', insertText: 'set_env(${1:Application}, ${2:Par}, ${3:Val})', doc: 'Sets application environment parameter.' },
    { label: 'which_applications/0', detail: 'application:which_applications()', insertText: 'which_applications()', doc: 'Lists currently running OTP applications with versions.' },
  ],
  rand: [
    { label: 'uniform/0', detail: 'rand:uniform()', insertText: 'uniform()', doc: 'Returns a random float uniformly distributed in 0.0 =< X < 1.0.' },
    { label: 'uniform/1', detail: 'rand:uniform(N)', insertText: 'uniform(${1:N})', doc: 'Returns a random integer uniformly distributed in 1 =< X =< N.' },
    { label: 'seed/1', detail: 'rand:seed(Alg)', insertText: 'seed(${1:default})', doc: 'Seeds the process-local random number generator.' },
  ],
  math: [
    { label: 'sqrt/1', detail: 'math:sqrt(X)', insertText: 'sqrt(${1:X})', doc: 'Returns square root of X.' },
    { label: 'pow/2', detail: 'math:pow(X, Y)', insertText: 'pow(${1:X}, ${2:Y})', doc: 'Returns X raised to power Y.' },
    { label: 'sin/1', detail: 'math:sin(X)', insertText: 'sin(${1:X})', doc: 'Returns sine of radian angle X.' },
    { label: 'cos/1', detail: 'math:cos(X)', insertText: 'cos(${1:X})', doc: 'Returns cosine of radian angle X.' },
    { label: 'tan/1', detail: 'math:tan(X)', insertText: 'tan(${1:X})', doc: 'Returns tangent of radian angle X.' },
    { label: 'log/1', detail: 'math:log(X)', insertText: 'log(${1:X})', doc: 'Returns natural logarithm of X.' },
    { label: 'log10/1', detail: 'math:log10(X)', insertText: 'log10(${1:X})', doc: 'Returns base-10 logarithm of X.' },
    { label: 'pi/0', detail: 'math:pi()', insertText: 'pi()', doc: 'Returns the mathematical constant pi (3.14159...).' },
  ],
  code: [
    { label: 'load_file/1', detail: 'code:load_file(Module)', insertText: 'load_file(${1:Module})', doc: 'Loads Erlang beam bytecode for Module.' },
    { label: 'which/1', detail: 'code:which(Module)', insertText: 'which(${1:Module})', doc: 'Returns the file path of the beam file loaded for Module.' },
    { label: 'is_loaded/1', detail: 'code:is_loaded(Module)', insertText: 'is_loaded(${1:Module})', doc: 'Checks if Module is currently loaded: {file, LoadedPath} | false.' },
    { label: 'priv_dir/1', detail: 'code:priv_dir(Application)', insertText: 'priv_dir(${1:Application})', doc: 'Returns the priv directory path for Application.' },
  ],
  lists: [
    { label: 'reverse/1', detail: 'lists:reverse(List)', insertText: 'reverse(${1:List})', doc: 'Reverses the elements of a list in O(n).' },
    { label: 'map/2', detail: 'lists:map(Fun, List)', insertText: 'map(${1:Fun}, ${2:List})', doc: 'Applies Fun to each element of List and returns the new list.' },
    { label: 'filter/2', detail: 'lists:filter(Pred, List)', insertText: 'filter(${1:Pred}, ${2:List})', doc: 'Returns elements for which Pred returns true.' },
    { label: 'foldl/3', detail: 'lists:foldl(Fun, Acc0, List)', insertText: 'foldl(${1:Fun}, ${2:Acc0}, ${3:List})', doc: 'Left-associative accumulator reduction over List.' },
    { label: 'foldr/3', detail: 'lists:foldr(Fun, Acc0, List)', insertText: 'foldr(${1:Fun}, ${2:Acc0}, ${3:List})', doc: 'Right-associative accumulator reduction over List.' },
    { label: 'member/2', detail: 'lists:member(Elem, List)', insertText: 'member(${1:Elem}, ${2:List})', doc: 'Returns true if Elem is a member of List, false otherwise.' },
    { label: 'keyfind/3', detail: 'lists:keyfind(Key, N, TupleList)', insertText: 'keyfind(${1:Key}, ${2:N}, ${3:TupleList})', doc: 'Searches for a tuple whose Nth element matches Key.' },
    { label: 'keystore/4', detail: 'lists:keystore(Key, N, TupleList, NewTuple)', insertText: 'keystore(${1:Key}, ${2:N}, ${3:TupleList}, ${4:NewTuple})', doc: 'Replaces or appends tuple by key in TupleList.' },
    { label: 'flatten/1', detail: 'lists:flatten(DeepList)', insertText: 'flatten(${1:DeepList})', doc: 'Flattens deep nested lists into a single flat list.' },
    { label: 'sort/1', detail: 'lists:sort(List)', insertText: 'sort(${1:List})', doc: 'Sorts elements of List into ascending order.' },
    { label: 'seq/2', detail: 'lists:seq(From, To)', insertText: 'seq(${1:From}, ${2:To})', doc: 'Generates an integer sequence from From to To.' },
    { label: 'nth/2', detail: 'lists:nth(N, List)', insertText: 'nth(${1:N}, ${2:List})', doc: 'Returns the Nth element of List (1-indexed).' },
    { label: 'delete/2', detail: 'lists:delete(Elem, List)', insertText: 'delete(${1:Elem}, ${2:List})', doc: 'Deletes first occurrence of Elem from List.' },
    { label: 'append/2', detail: 'lists:append(List1, List2)', insertText: 'append(${1:List1}, ${2:List2})', doc: 'Concatenates two lists.' },
    { label: 'concat/1', detail: 'lists:concat(Things)', insertText: 'concat(${1:Things})', doc: 'Concatenates atoms, integers, floats, or strings into a flat string.' },
  ],
  maps: [
    { label: 'get/2', detail: 'maps:get(Key, Map)', insertText: 'get(${1:Key}, ${2:Map})', doc: 'Returns the value for Key in Map. Throws badkey if missing.' },
    { label: 'get/3', detail: 'maps:get(Key, Map, Default)', insertText: 'get(${1:Key}, ${2:Map}, ${3:Default})', doc: 'Returns the value for Key in Map, or Default if not present.' },
    { label: 'put/3', detail: 'maps:put(Key, Value, Map)', insertText: 'put(${1:Key}, ${2:Value}, ${3:Map})', doc: 'Associates Key with Value in Map.' },
    { label: 'remove/2', detail: 'maps:remove(Key, Map)', insertText: 'remove(${1:Key}, ${2:Map})', doc: 'Removes Key and its associated value from Map.' },
    { label: 'find/2', detail: 'maps:find(Key, Map)', insertText: 'find(${1:Key}, ${2:Map})', doc: 'Returns {ok, Value} or error if Key is not present in Map.' },
    { label: 'keys/1', detail: 'maps:keys(Map)', insertText: 'keys(${1:Map})', doc: 'Returns a list containing all keys in Map.' },
    { label: 'values/1', detail: 'maps:values(Map)', insertText: 'values(${1:Map})', doc: 'Returns a list containing all values in Map.' },
    { label: 'merge/2', detail: 'maps:merge(Map1, Map2)', insertText: 'merge(${1:Map1}, ${2:Map2})', doc: 'Merges two maps. Values from Map2 override Map1.' },
    { label: 'new/0', detail: 'maps:new()', insertText: 'new()', doc: 'Returns a new empty map #{}.' },
    { label: 'from_list/1', detail: 'maps:from_list(Pairs)', insertText: 'from_list(${1:Pairs})', doc: 'Builds a map from key-value tuples [{Key, Val}].' },
    { label: 'to_list/1', detail: 'maps:to_list(Map)', insertText: 'to_list(${1:Map})', doc: 'Converts a map into a list of {Key, Val} tuples.' },
    { label: 'is_key/2', detail: 'maps:is_key(Key, Map)', insertText: 'is_key(${1:Key}, ${2:Map})', doc: 'Returns true if Key is present in Map, false otherwise.' },
  ],
  erlang: [
    { label: 'monitor/2', detail: 'erlang:monitor(process, Item)', insertText: 'monitor(process, ${1:Item})', doc: 'Starts a unidirectional monitor watching Item process.' },
    { label: 'demonitor/2', detail: 'erlang:demonitor(MRef, [flush])', insertText: 'demonitor(${1:MRef}, [flush])', doc: 'Deactivates monitor and flushes pending DOWN message from mailbox.' },
    { label: 'spawn_monitor/1', detail: 'spawn_monitor(Fun)', insertText: 'spawn_monitor(${1:Fun})', doc: 'Atomically creates process and monitor, returning {Pid, Ref}.' },
    { label: 'binary_to_term/2', detail: 'erlang:binary_to_term(Bin, [safe])', insertText: 'binary_to_term(${1:Bin}, [safe])', doc: 'Deserializes binary into Erlang term safely without atom exhaustion.' },
    { label: 'term_to_binary/1', detail: 'erlang:term_to_binary(Term)', insertText: 'term_to_binary(${1:Term})', doc: 'Serializes any Erlang term into standard External Term Format binary.' },
    { label: 'system_time/1', detail: 'erlang:system_time(millisecond)', insertText: 'system_time(${1:millisecond})', doc: 'Returns current Erlang system time in specified time unit.' },
    { label: 'make_ref/0', detail: 'make_ref()', insertText: 'make_ref()', doc: 'Returns a unique BEAM reference term.' },
    { label: 'send_after/3', detail: 'erlang:send_after(TimeMs, Dest, Msg)', insertText: 'send_after(${1:TimeMs}, ${2:Dest}, ${3:Msg})', doc: 'Sends Msg to Dest after TimeMs milliseconds.' },
    { label: 'process_flag/2', detail: 'process_flag(trap_exit, true)', insertText: 'process_flag(trap_exit, ${1:true})', doc: 'Converts exit signals into mailbox messages {\'EXIT\', Pid, Reason}.' },
    { label: 'is_process_alive/1', detail: 'is_process_alive(Pid)', insertText: 'is_process_alive(${1:Pid})', doc: 'Returns true if process is alive, false otherwise.' },
  ],
  gen_server: [
    { label: 'start_link/3', detail: 'gen_server:start_link({local, ?MODULE}, ?MODULE, Args, [])', insertText: 'start_link({local, ?MODULE}, ?MODULE, ${1:Args}, [])', doc: 'Starts gen_server process in supervision tree.' },
    { label: 'start_link/4', detail: 'gen_server:start_link(Name, Module, Args, Options)', insertText: 'start_link(${1:Name}, ${2:Module}, ${3:Args}, ${4:Options})', doc: 'Starts gen_server with custom registered name.' },
    { label: 'call/2', detail: 'gen_server:call(ServerRef, Request)', insertText: 'call(${1:ServerRef}, ${2:Request})', doc: 'Makes a synchronous call to ServerRef and waits 5000ms for reply.' },
    { label: 'call/3', detail: 'gen_server:call(ServerRef, Request, TimeoutMs)', insertText: 'call(${1:ServerRef}, ${2:Request}, ${3:TimeoutMs})', doc: 'Makes a synchronous call with explicit timeout.' },
    { label: 'cast/2', detail: 'gen_server:cast(ServerRef, Request)', insertText: 'cast(${1:ServerRef}, ${2:Request})', doc: 'Sends an asynchronous request to ServerRef and returns ok immediately.' },
    { label: 'reply/2', detail: 'gen_server:reply(From, Reply)', insertText: 'reply(${1:From}, ${2:Reply})', doc: 'Explicitly replies to client caller From.' },
  ],
  gen_statem: [
    { label: 'start_link/3', detail: 'gen_statem:start_link({local, ?MODULE}, ?MODULE, Args, [])', insertText: 'start_link({local, ?MODULE}, ?MODULE, ${1:Args}, [])', doc: 'Starts gen_statem state machine process.' },
    { label: 'call/2', detail: 'gen_statem:call(ServerRef, Request)', insertText: 'call(${1:ServerRef}, ${2:Request})', doc: 'Synchronous call to gen_statem process.' },
    { label: 'cast/2', detail: 'gen_statem:cast(ServerRef, Request)', insertText: 'cast(${1:ServerRef}, ${2:Request})', doc: 'Asynchronous event to gen_statem process.' },
  ],
  ets: [
    { label: 'new/2', detail: 'ets:new(Name, Options)', insertText: 'new(${1:Table}, [set, public, named_table, {read_concurrency, true}])', doc: 'Creates a new off-heap ETS table.' },
    { label: 'insert/2', detail: 'ets:insert(Table, Object)', insertText: 'insert(${1:Table}, ${2:Object})', doc: 'Inserts one or more objects into ETS table.' },
    { label: 'lookup/2', detail: 'ets:lookup(Table, Key)', insertText: 'lookup(${1:Table}, ${2:Key})', doc: 'Returns list of tuples matching Key in ETS table.' },
    { label: 'delete/2', detail: 'ets:delete(Table, Key)', insertText: 'delete(${1:Table}, ${2:Key})', doc: 'Deletes object with matching Key from ETS table.' },
    { label: 'update_counter/3', detail: 'ets:update_counter(Table, Key, {Pos, Incr})', insertText: 'update_counter(${1:Table}, ${2:Key}, {${3:Pos}, ${4:Incr}})', doc: 'Atomically increments a counter field in ETS table.' },
    { label: 'tab2list/1', detail: 'ets:tab2list(Table)', insertText: 'tab2list(${1:Table})', doc: 'Returns all objects stored in Table as a list.' },
  ],
};

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
      className="p-3 sm:p-4 my-3 overflow-x-auto max-w-full text-xs sm:text-sm font-mono leading-relaxed rounded-xl transition-all duration-200"
      style={{
        background: isDark ? 'rgba(11, 15, 23, 0.85)' : '#F8FAFC',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #CBD5E1',
        borderLeft: isDark ? '3px solid #818CF8' : '3px solid #3730A3',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.30)' : '0 2px 8px rgba(15,23,42,0.06)',
        fontVariantLigatures: 'none',
        fontFeatureSettings: '"liga" 0, "calt" 0, "zero" 1',
      }}
    >
      <code style={{ fontVariantLigatures: 'none', fontFeatureSettings: '"liga" 0, "calt" 0, "zero" 1' }}>
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
