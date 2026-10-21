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
      provideCompletionItems: (model: any, position: any) => {
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

        const SnippetKind = monaco.languages.CompletionItemKind?.Snippet ?? 27;
        const FunctionKind = monaco.languages.CompletionItemKind?.Function ?? 1;
        const ModuleKind = monaco.languages.CompletionItemKind?.Module ?? 8;
        const VariableKind = monaco.languages.CompletionItemKind?.Variable ?? 4;
        const InsertAsSnippet = monaco.languages.CompletionItemInsertTextRule?.InsertAsSnippet ?? 4;

        // Check if typing after a module colon e.g. "lists:", "maps:", "erlang:", "gen_server:"
        const colonMatch = textUntilPosition.match(/([a-z_][a-zA-Z0-9_]*):$/);
        if (colonMatch) {
          const mod = colonMatch[1];
          if (OTP_LIB_COMPLETIONS[mod]) {
            return {
              suggestions: OTP_LIB_COMPLETIONS[mod].map((c) => ({
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
        }

        const suggestions: any[] = [];

        // Standard OTP Snippets (case, try, receive, fun, -module, -export, etc.)
        for (const s of ERLANG_SNIPPETS) {
          suggestions.push({
            label: s.label,
            kind: SnippetKind,
            documentation: s.doc,
            detail: s.detail,
            insertText: s.insertText,
            insertTextRules: InsertAsSnippet,
            range,
          });
        }

        // Standard OTP Modules
        for (const m of ['lists', 'maps', 'erlang', 'gen_server', 'gen_statem', 'ets', 'timer', 'io', 'binary']) {
          suggestions.push({
            label: `${m}:`,
            kind: ModuleKind,
            detail: `OTP ${m} standard library module`,
            insertText: `${m}:`,
            range,
          });
        }

        // In-scope variables: scan words starting with uppercase or underscore
        const fullContent = model.getValue();
        const varMatches = fullContent.match(/\b[A-Z_][a-zA-Z0-9_]*\b/g);
        if (varMatches) {
          const uniqueVars = Array.from(new Set(varMatches));
          for (const v of uniqueVars.slice(0, 30)) {
            if (typeof v === 'string' && v.length > 1) {
              suggestions.push({
                label: v,
                kind: VariableKind,
                detail: 'In-scope variable',
                insertText: v,
                range,
              });
            }
          }
        }

        return { suggestions };
      },
    });
  }
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
