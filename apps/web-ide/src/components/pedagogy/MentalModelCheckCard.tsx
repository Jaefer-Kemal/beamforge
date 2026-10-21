'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import type { MentalModelCheckSpec } from '../../types/workspace';

export interface MentalModelCheckCardProps {
  check?: MentalModelCheckSpec;
  lessonId?: string;
  chapterNumber?: number;
  lessonNumber?: number;
  title?: string;
  isDark: boolean;
}

/**
 * Smart Fallback Generator:
 * Generates an engineering-grade concept prediction question for any lesson
 * when an explicit `mentalModelCheck` is not provided.
 */
function getFallbackCheck(chapterNumber?: number, lessonNumber?: number, title?: string): MentalModelCheckSpec {
  const ch = chapterNumber || 1;

  if (ch === 1) {
    return {
      question: 'In Erlang, what happens when an incoming tuple fails to match any function clause pattern and has no fallback clause?',
      codeSnippet: `handle_msg({ping, Id}) -> {pong, Id}.\n%% Learner calls: handle_msg({disconnect, 99})`,
      options: [
        {
          id: 'A',
          label: 'The function returns undefined and execution continues silently.',
          isCorrect: false,
          explanation: 'Erlang has no silent undefined fallback; unmatched function clauses throw an immediate function_clause exception to prevent corrupt state from spreading.',
        },
        {
          id: 'B',
          label: 'The BEAM throws a function_clause exception and crashes the current process with clean garbage collection.',
          isCorrect: true,
          explanation: 'Correct! The BEAM enforces strict pattern matching. If no clause matches, a function_clause exception terminates the calling process, allowing the supervisor to recover.',
        },
        {
          id: 'C',
          label: 'The function blocks indefinitely in the mailbox waiting for a matching message.',
          isCorrect: false,
          explanation: 'Only a receive block waits on the mailbox; ordinary function clause dispatch fails immediately if no pattern matches.',
        },
      ],
    };
  }

  if (ch === 2) {
    return {
      question: 'Why does body recursion (e.g. Price + calc(Rest)) cause memory exhaustion on large lists while tail recursion executes in constant O(1) stack space?',
      codeSnippet: `%% Body: calc([H|T]) -> H + calc(T).\n%% Tail: calc([H|T], Acc) -> calc(T, Acc + H).`,
      options: [
        {
          id: 'A',
          label: 'Body recursion allocates stack frames for pending additions (+) while tail recursion overwrites the current frame via call_last.',
          isCorrect: true,
          explanation: 'Correct! In body recursion, the addition (+) happens AFTER the recursive call returns, requiring the VM to keep every stack frame alive. Tail recursion has no pending work and reuses Frame 1 via call_last.',
        },
        {
          id: 'B',
          label: 'The BEAM converts body-recursive functions into C-loops, but tail recursion creates OS threads.',
          isCorrect: false,
          explanation: 'The BEAM never spawns OS threads for recursion; tail calls are optimized into in-place jump instructions (call_last) directly on the BEAM stack.',
        },
        {
          id: 'C',
          label: 'Tail recursion allocates memory on the global shared heap rather than the process heap.',
          isCorrect: false,
          explanation: 'Erlang processes have private isolated heaps; tail recursion eliminates stack frame growth altogether rather than moving it to another heap.',
        },
      ],
    };
  }

  if (ch === 3) {
    return {
      question: 'When updating a key in an Erlang Map (#{id => 1, status => active}), how does the BEAM maintain immutability without copying the entire map?',
      codeSnippet: `OldMap = #{id => 1, status => pending, items => [a, b, c]},\nNewMap = OldMap#{status => active}.`,
      options: [
        {
          id: 'A',
          label: 'The BEAM modifies the memory address of OldMap in-place using thread locks.',
          isCorrect: false,
          explanation: 'Erlang terms are strictly immutable; in-place mutations do not exist on the BEAM heap.',
        },
        {
          id: 'B',
          label: 'The BEAM creates a shallow structural share where unchanged keys and sub-lists point to the exact same memory references.',
          isCorrect: true,
          explanation: 'Correct! Erlang leverages persistent data structures. Modifying a map or prepending a list reuses the unmodified memory nodes, providing O(1) or O(log N) operations with zero full-clone overhead.',
        },
        {
          id: 'C',
          label: 'The BEAM serializes the map to disk and reads it back as a fresh term.',
          isCorrect: false,
          explanation: 'Map updates are pure in-memory pointer operations; disk I/O is never involved.',
        },
      ],
    };
  }

  if (ch === 4) {
    return {
      question: 'A worker process receives a 64 KB TCP socket binary and extracts a 16-byte header <<Header:16/binary, _/binary>>. What memory hazard occurs if binary:copy/1 is NOT used?',
      codeSnippet: `extract_header(<<Header:16/binary, _/binary>>) ->\n    Header. %% Missing binary:copy/1!`,
      options: [
        {
          id: 'A',
          label: 'The 16-byte SubBinary pointer pins the entire 64 KB off-heap ProcBin buffer in RAM until the worker process dies.',
          isCorrect: true,
          explanation: 'Correct! Binaries > 64 bytes are reference-counted ProcBins. A sub-binary references the parent buffer with an offset. Until that sub-binary is GC\'d, the parent 64 KB buffer cannot be freed. binary:copy/1 isolates the 16 bytes onto the process heap.',
        },
        {
          id: 'B',
          label: 'The BEAM throws a badarg exception because sub-binaries cannot be returned from functions.',
          isCorrect: false,
          explanation: 'Sub-binaries are first-class Erlang terms and completely valid to return; the hazard is insidious silent memory pinning.',
        },
        {
          id: 'C',
          label: 'The socket is closed immediately by the OS kernel.',
          isCorrect: false,
          explanation: 'Kernel sockets are unaffected by how user-space processes reference binary slices in Erlang memory.',
        },
      ],
    };
  }

  if (ch === 5) {
    return {
      question: 'How does an Erlang actor perform selective receive when matching {urgent, Msg} while thousands of {log, Msg} messages sit in its mailbox?',
      codeSnippet: `receive\n    {urgent, Payload} -> handle_urgent(Payload)\nend`,
      options: [
        {
          id: 'A',
          label: 'It drops all preceding {log, Msg} messages permanently to read the urgent message.',
          isCorrect: false,
          explanation: 'Unmatched messages are never dropped; they are preserved in order inside the internal Save Queue.',
        },
        {
          id: 'B',
          label: 'It moves unmatched messages into an internal Save Queue, extracts {urgent, Payload}, and restores the Save Queue back to the mailbox.',
          isCorrect: true,
          explanation: 'Correct! The BEAM message scan pointer moves unmatched terms into the internal Save Queue. Once a matching message is extracted, the Save Queue is spliced back to the front of the mailbox.',
        },
        {
          id: 'C',
          label: 'It restarts the actor process from its init callback.',
          isCorrect: false,
          explanation: 'Selective receive is a normal VM opcode scan, not an error or crash condition.',
        },
      ],
    };
  }

  if (ch === 6) {
    return {
      question: 'What is the critical difference between a bidirectional Link (link/1) and a unidirectional Monitor (erlang:monitor/2)?',
      codeSnippet: `%% Caller <0.101.0> watches Worker <0.102.0>\nMRef = erlang:monitor(process, WorkerPid).`,
      options: [
        {
          id: 'A',
          label: 'If the worker crashes, a link kills the caller (unless trapping exits), whereas a monitor always delivers a harmless {\'DOWN\', Ref, process, Pid, Reason} message without hurting the caller.',
          isCorrect: true,
          explanation: 'Correct! Links are symmetric failure cascades designed for supervisor clusters. Monitors are asymmetric observer contracts where the caller is guaranteed to survive worker failures unharmed.',
        },
        {
          id: 'B',
          label: 'Monitors can only be created by supervisors, while links can be created by any process.',
          isCorrect: false,
          explanation: 'Any process can create monitors or links via erlang:monitor/2 and link/1.',
        },
        {
          id: 'C',
          label: 'Links operate across distributed nodes while monitors only work on a single local node.',
          isCorrect: false,
          explanation: 'Both links and monitors work transparently across distributed Erlang nodes.',
        },
      ],
    };
  }

  if (ch === 7) {
    return {
      question: 'In an OTP gen_server:call/3 synchronous request, what guarantees that the client receives the exact reply meant for it under high concurrency?',
      codeSnippet: `gen_server:call(ServerRef, {get_balance, AccountId})`,
      options: [
        {
          id: 'A',
          label: 'The server pauses all other requests until the current client receives its answer.',
          isCorrect: false,
          explanation: 'Pausing the server would destroy throughput; requests are handled sequentially or asynchronously via continue.',
        },
        {
          id: 'B',
          label: 'The gen engine pairs every call with a globally unique reference (#Ref<...>) via make_ref() and temporary monitor.',
          isCorrect: true,
          explanation: 'Correct! OTP synchronous calls generate a unique reference tag and temporary monitor. The client pattern matches strictly on {MRef, Reply}, guaranteeing zero response crosstalk.',
        },
        {
          id: 'C',
          label: 'Clients use TCP socket ports to identify their responses.',
          isCorrect: false,
          explanation: 'Erlang internal gen_server messaging uses BEAM process mailboxes, not TCP sockets.',
        },
      ],
    };
  }

  if (ch === 8) {
    return {
      question: 'Under a rest_for_one supervisor with children [Child1: DB, Child2: Cache, Child3: Gateway], what happens if Child2 (Cache) crashes?',
      codeSnippet: `#{strategy => rest_for_one, intensity => 3, period => 5}`,
      options: [
        {
          id: 'A',
          label: 'Only Child2 is restarted; Child1 and Child3 continue uninterrupted.',
          isCorrect: false,
          explanation: 'That would be one_for_one. Under rest_for_one, downstream dependent processes are restarted.',
        },
        {
          id: 'B',
          label: 'Child2 and Child3 (started after it) are restarted in order, while Child1 (DB) is preserved untouched.',
          isCorrect: true,
          explanation: 'Correct! In rest_for_one, when a child crashes, any child started AFTER it in the spec list is terminated and restarted in order. Upstream dependencies (Child1) remain running.',
        },
        {
          id: 'C',
          label: 'All 3 children are immediately terminated and restarted together.',
          isCorrect: false,
          explanation: 'That is the one_for_all strategy, which tears down unnecessary upstream handles.',
        },
      ],
    };
  }

  if (ch === 9) {
    return {
      question: 'Why should a high-throughput session cache use protected ETS access rather than storing state in a gen_server state map?',
      codeSnippet: `ets:new(session_tab, [set, protected, named_table, {read_concurrency, true}])`,
      options: [
        {
          id: 'A',
          label: 'Protected ETS allows 100,000 concurrent clients to execute direct, lock-free C-level reads in parallel without sending messages or bottlenecking the gen_server process mailbox.',
          isCorrect: true,
          explanation: 'Correct! An actor mailbox is a single sequential queue. In protected ETS, reads bypass the actor entirely at nanosecond C memory speed, while writes remain serialized safely by the owner.',
        },
        {
          id: 'B',
          label: 'ETS tables automatically persist all data to PostgreSQL on every write.',
          isCorrect: false,
          explanation: 'ETS is an in-memory storage engine outside process heaps; persistence requires Mnesia, DETS, or external databases.',
        },
        {
          id: 'C',
          label: 'The gen_server process mailbox cannot store terms larger than 1 KB.',
          isCorrect: false,
          explanation: 'BEAM process mailboxes can hold arbitrarily large terms, but sequential message passing becomes a serialization bottleneck.',
        },
      ],
    };
  }

  if (ch === 10) {
    return {
      question: 'In network server engineering, why is {active, true} considered dangerous under heavy client traffic compared to {active, once}?',
      codeSnippet: `%% Safe: inet:setopts(Socket, [{active, once}]).\n%% Unsafe: inet:setopts(Socket, [{active, true}]).`,
      options: [
        {
          id: 'A',
          label: '{active, true} causes the OS kernel to flood the Erlang process mailbox with hundreds of thousands of un-throttled {tcp, Socket, Data} messages, causing RAM exhaustion and OOM crashes.',
          isCorrect: true,
          explanation: 'Correct! {active, true} provides zero flow control. {active, once} applies hardware backpressure: the kernel sends 1 packet and switches the socket to passive mode until the actor explicitly re-arms it.',
        },
        {
          id: 'B',
          label: '{active, true} encrypts network packets with an invalid TLS certificate.',
          isCorrect: false,
          explanation: 'Active mode controls socket read event dispatching in the BEAM runtime, not cryptographic protocols.',
        },
        {
          id: 'C',
          label: '{active, once} closes the TCP connection immediately after the first byte is received.',
          isCorrect: false,
          explanation: '{active, once} leaves the socket open and waiting in passive mode until re-armed.',
        },
      ],
    };
  }

  if (ch === 11 || ch === 12) {
    return {
      question: 'Why does an XMPP client-to-server connection parser fail if it relies on standard XML DOM parsers (like xmerl_scan:string/1)?',
      codeSnippet: `<stream:stream to='localhost' xmlns='jabber:client'>\n%% The stream remains open for hours without </stream:stream>!`,
      options: [
        {
          id: 'A',
          label: 'An XML DOM parser expects a closing </stream:stream> tag and EOF before emitting elements; in XMPP, the initial stream header is NEVER closed during active communication.',
          isCorrect: true,
          explanation: 'Correct! XMPP is a continuous, streaming XML document that stays open indefinitely. Standard DOM parsers block forever waiting for EOF. Production servers use streaming binary chunk accumulators and stanza framers.',
        },
        {
          id: 'B',
          label: 'XMPP packets use YAML instead of XML on TCP connections.',
          isCorrect: false,
          explanation: 'XMPP is strictly based on XML stanzas (RFC 6120).',
        },
        {
          id: 'C',
          label: 'The BEAM runtime does not allow string manipulation in user space.',
          isCorrect: false,
          explanation: 'Erlang provides extensive binary pattern matching and string processing capabilities.',
        },
      ],
    };
  }

  // General default fallback
  return {
    question: `Before implementing ${title || 'this challenge'}, verify your mental model of the BEAM execution semantics:`,
    options: [
      {
        id: 'A',
        label: 'Function clauses match top-to-bottom; guards must be strictly side-effect free.',
        isCorrect: true,
        explanation: 'Correct! The BEAM evaluates function clauses sequentially from top to bottom. Guards are restricted to side-effect-free BIFs evaluated without changing process state.',
      },
      {
        id: 'B',
        label: 'Variables in Erlang can be reassigned multiple times inside a function clause.',
        isCorrect: false,
        explanation: 'Erlang terms are bound once. Attempting to assign X = 1 followed by X = 2 is a pattern match assertion that fails with badmatch.',
      },
      {
        id: 'C',
        label: 'Exceptions inside guard clauses crash the calling process immediately.',
        isCorrect: false,
        explanation: 'Exceptions in guards do not crash; they simply evaluate to false, causing the VM to test the next clause.',
      },
    ],
  };
}

export function MentalModelCheckCard({
  check,
  lessonId,
  chapterNumber,
  lessonNumber,
  title,
  isDark,
}: MentalModelCheckCardProps) {
  // Resolve check specification (provided or smart fallback)
  const resolvedCheck = check || getFallbackCheck(chapterNumber, lessonNumber, title);

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Reset answer when lesson changes
  useEffect(() => {
    setSelectedOptionId(null);
  }, [lessonId]);

  const selectedOption = resolvedCheck.options.find((opt) => opt.id === selectedOptionId);
  const hasAnswered = selectedOptionId !== null;

  return (
    <div
      className="rounded-2xl transition-all duration-300 overflow-hidden border shadow-sm my-4"
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* ── Header Strip ──────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{
          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
          background: isDark
            ? 'linear-gradient(90deg, rgba(139,92,246,0.10) 0%, rgba(15,23,42,0.40) 100%)'
            : 'linear-gradient(90deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,0.60) 100%)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
            style={{
              background: isDark ? 'rgba(139, 92, 246, 0.22)' : 'rgba(124, 58, 237, 0.12)',
              color: isDark ? '#C4B5FD' : '#6D28D9',
              border: isDark ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(124, 58, 237, 0.25)',
            }}
          >
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold tracking-tight"
                style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
              >
                Quick Mental Model Check
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
                style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(217, 119, 6, 0.12)',
                  color: isDark ? '#FCD34D' : '#B45309',
                  border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(217, 119, 6, 0.25)',
                }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                Predict Before Coding
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasAnswered && (
            <button
              onClick={() => setSelectedOptionId(null)}
              className="p-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors px-2 py-0.5"
              style={{
                color: isDark ? '#94A3B8' : '#64748B',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
              }}
              title="Reset prediction"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md transition-colors"
            style={{
              color: isDark ? '#94A3B8' : '#64748B',
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
            }}
            title={isCollapsed ? 'Expand mental model check' : 'Collapse mental model check'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="p-4 space-y-3.5">
          {/* Question Text */}
          <p
            className="text-xs font-medium leading-relaxed"
            style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
          >
            {resolvedCheck.question}
          </p>

          {/* Optional Code Snippet */}
          {resolvedCheck.codeSnippet && (
            <div
              className="p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border select-text"
              style={{
                background: isDark ? 'rgba(11, 15, 23, 0.85)' : 'rgba(248, 250, 252, 0.95)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                color: isDark ? '#CBD5E1' : '#334155',
              }}
            >
              <pre className="font-mono whitespace-pre">{resolvedCheck.codeSnippet}</pre>
            </div>
          )}

          {/* Clickable Options (A, B, C) */}
          <div className="space-y-2 pt-1">
            {resolvedCheck.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isCorrect = option.isCorrect;

              // Color styles depending on answered state
              let optionBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)';
              let optionBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';
              let badgeBg = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)';
              let badgeColor = isDark ? '#94A3B8' : '#64748B';
              let textColor = isDark ? '#CBD5E1' : '#334155';

              if (hasAnswered) {
                if (isSelected) {
                  if (isCorrect) {
                    optionBg = isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.08)';
                    optionBorder = isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.35)';
                    badgeBg = isDark ? '#10B981' : '#059669';
                    badgeColor = '#FFFFFF';
                    textColor = isDark ? '#ECFDF5' : '#064E3B';
                  } else {
                    optionBg = isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.08)';
                    optionBorder = isDark ? 'rgba(245, 158, 11, 0.45)' : 'rgba(245, 158, 11, 0.35)';
                    badgeBg = isDark ? '#F59E0B' : '#D97706';
                    badgeColor = '#FFFFFF';
                    textColor = isDark ? '#FFFBEB' : '#78350F';
                  }
                } else if (isCorrect && !selectedOption?.isCorrect) {
                  // Reveal correct answer if learner missed it
                  optionBg = isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)';
                  optionBorder = isDark ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.20)';
                  badgeBg = isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.15)';
                  badgeColor = isDark ? '#34D399' : '#059669';
                }
              }

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  className="w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 group relative cursor-pointer"
                  style={{
                    background: optionBg,
                    borderColor: optionBorder,
                  }}
                >
                  {/* Option letter pill (A, B, C) */}
                  <span
                    className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-black transition-colors shadow-xs"
                    style={{
                      background: badgeBg,
                      color: badgeColor,
                    }}
                  >
                    {option.id}
                  </span>

                  {/* Option Text */}
                  <span
                    className="text-xs leading-relaxed flex-1 select-none"
                    style={{ color: textColor }}
                  >
                    {option.label || option.text}
                  </span>

                  {/* Feedback Icon */}
                  {hasAnswered && isSelected && (
                    <div className="flex-shrink-0 ml-1">
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in fade-in" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 animate-in fade-in" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner (revealed on selection) */}
          {hasAnswered && selectedOption && (
            <div
              className="p-3.5 rounded-xl border text-xs leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
              style={{
                background: selectedOption.isCorrect
                  ? (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.06)')
                  : (isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.06)'),
                borderColor: selectedOption.isCorrect
                  ? (isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)')
                  : (isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)'),
                color: selectedOption.isCorrect
                  ? (isDark ? '#6EE7B7' : '#065F46')
                  : (isDark ? '#FCD34D' : '#92400E'),
              }}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1 uppercase text-[10px] tracking-wider">
                {selectedOption.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Correct Mental Model</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Not Quite — Check the BEAM Rule</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                {selectedOption.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MentalModelCheckCard;
