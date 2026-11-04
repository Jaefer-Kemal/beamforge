'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Terminal,
  Send,
  UserCheck,
  UserX,
  Radio,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Code2,
  CheckCircle2,
  Layers,
  Sparkles,
  Server,
  Lock,
  Eye,
} from 'lucide-react';

interface StanzaLog {
  id: string;
  timestamp: string;
  direction: 'in' | 'out' | 'router';
  source: string;
  target?: string;
  xml: string;
  detail: string;
  handledByModule: string;
}

interface ChatMessage {
  id: string;
  sender: 'alice' | 'bob' | 'system';
  senderJid: string;
  body: string;
  timestamp: string;
  status: 'delivered' | 'spooled_offline' | 'rejected';
  rawXml: string;
  routedVia: string;
}

const INITIAL_STANZAS: StanzaLog[] = [
  {
    id: 'st-01',
    timestamp: '10:14:02.102',
    direction: 'in',
    source: 'alice@beamforge.local',
    xml: "<stream:stream to='beamforge.local' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>",
    detail: 'Incremental XML stream initiation header',
    handledByModule: 'xmpp_stream_parser.erl (M2)',
  },
  {
    id: 'st-02',
    timestamp: '10:14:02.115',
    direction: 'out',
    source: 'beamforge.local',
    xml: "<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>",
    detail: 'Advertising supported SASL authentication mechanisms',
    handledByModule: 'xmpp_c2s_statem.erl (M4)',
  },
  {
    id: 'st-03',
    timestamp: '10:14:02.138',
    direction: 'in',
    source: 'alice@beamforge.local',
    xml: "<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>AGFsaWNlAHBhc3N3b3Jk</auth>",
    detail: 'Base64 RFC 4616 SASL authentication credentials',
    handledByModule: 'xmpp_c2s_statem.erl (M4)',
  },
  {
    id: 'st-04',
    timestamp: '10:14:02.144',
    direction: 'out',
    source: 'beamforge.local',
    xml: "<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>",
    detail: 'SASL success response; transitioning to authenticated state',
    handledByModule: 'xmpp_c2s_statem.erl (M4)',
  },
  {
    id: 'st-05',
    timestamp: '10:14:02.160',
    direction: 'in',
    source: 'alice@beamforge.local',
    xml: "<iq type='set' id='bind-1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>web</resource></bind></iq>",
    detail: 'Resource binding request for alice@beamforge.local/web',
    handledByModule: 'xmpp_c2s_statem.erl (M4)',
  },
  {
    id: 'st-06',
    timestamp: '10:14:02.165',
    direction: 'out',
    source: 'beamforge.local',
    xml: "<iq type='result' id='bind-1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>alice@beamforge.local/web</jid></bind></iq>",
    detail: 'Registration in ETS session registry with monitor/2 attached',
    handledByModule: 'xmpp_session_registry.erl (M3)',
  },
  {
    id: 'st-07',
    timestamp: '10:14:02.180',
    direction: 'in',
    source: 'alice@beamforge.local/web',
    xml: "<presence><priority>10</priority><show>chat</show><status>Online in BeamForge</status></presence>",
    detail: 'Presence broadcast received with priority 10',
    handledByModule: 'xmpp_router.erl (M5)',
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'alice',
    senderJid: 'alice@beamforge.local/web',
    body: 'Hey Bob! The 6-milestone OTP XMPP server is live and routing stanzas!',
    timestamp: '10:14:05',
    status: 'delivered',
    rawXml: `<message from="alice@beamforge.local/web" to="bob@beamforge.local/mobile" type="chat" id="m-101">\n  <body>Hey Bob! The 6-milestone OTP XMPP server is live and routing stanzas!</body>\n</message>`,
    routedVia: 'xmpp_router:route/2 -> ETS PID <0.142.0>',
  },
  {
    id: 'msg-2',
    sender: 'bob',
    senderJid: 'bob@beamforge.local/mobile',
    body: 'Awesome Alice! Received your message over TCP socket via {active, once} flow control.',
    timestamp: '10:14:07',
    status: 'delivered',
    rawXml: `<message from="bob@beamforge.local/mobile" to="alice@beamforge.local/web" type="chat" id="m-102">\n  <body>Awesome Alice! Received your message over TCP socket via {active, once} flow control.</body>\n</message>`,
    routedVia: 'xmpp_router:route/2 -> ETS PID <0.138.0>',
  },
];

interface LiveXmppChatSimulatorProps {
  isDark: boolean;
  milestoneStatus?: Record<number, boolean>;
  isMasterUnlocked?: boolean;
}

export function LiveXmppChatSimulator({
  isDark,
  milestoneStatus,
  isMasterUnlocked = false,
}: LiveXmppChatSimulatorProps) {
  // Granular milestone activation resolution
  const m1Passed = Boolean(milestoneStatus?.[0] || isMasterUnlocked);
  const m2Passed = Boolean(milestoneStatus?.[1] || isMasterUnlocked);
  const m3Passed = Boolean(milestoneStatus?.[2] || isMasterUnlocked);
  const m4Passed = Boolean(milestoneStatus?.[3] || isMasterUnlocked);
  const m5Passed = Boolean(milestoneStatus?.[4] || isMasterUnlocked);
  const m6Passed = Boolean(milestoneStatus?.[5] || isMasterUnlocked);

  // Total verified count across all 6 milestones
  const passedTotalCount = [m1Passed, m2Passed, m3Passed, m4Passed, m5Passed, m6Passed].filter(Boolean).length;

  // Strict dependency check: Port 5222 requires all 5 core modules (M1–M5) to prevent broken routing
  const isClusterBooted = m1Passed && m2Passed && m3Passed && m4Passed && m5Passed;

  // Identify any missing core dependencies for transparent feedback
  const missingCoreDependencies: string[] = [];
  if (!m1Passed) missingCoreDependencies.push('M1 Supervisor');
  if (!m2Passed) missingCoreDependencies.push('M2 XML Framer');
  if (!m3Passed) missingCoreDependencies.push('M3 ETS Registry');
  if (!m4Passed) missingCoreDependencies.push('M4 SASL FSM');
  if (!m5Passed) missingCoreDependencies.push('M5 Router');

  const [previewGoldenModel, setPreviewGoldenModel] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [stanzas, setStanzas] = useState<StanzaLog[]>(INITIAL_STANZAS);
  const [inputVal, setInputVal] = useState('');
  const [isBobOnline, setIsBobOnline] = useState(true);
  const [selectedStanzaXml, setSelectedStanzaXml] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'chat' | 'wire' | 'arch'>('chat');
  const [activeChaosNotice, setActiveChaosNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wireEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (subTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (subTab === 'wire') {
      wireEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, stanzas, subTab]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputVal).trim();
    if (!text) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const msgId = `m-${Date.now().toString().slice(-4)}`;

    const xml = `<message from="alice@beamforge.local/web" to="bob@beamforge.local/mobile" type="chat" id="${msgId}">\n  <body>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>\n</message>`;

    const status: ChatMessage['status'] = isBobOnline ? 'delivered' : 'spooled_offline';
    const routeDetail = isBobOnline
      ? 'xmpp_router:route/2 -> Target PID <0.142.0> found in ETS -> Dispatched'
      : 'xmpp_router:route/2 -> Bob is unavailable -> Spooled into ETS offline_queue table';

    const newMsg: ChatMessage = {
      id: msgId,
      sender: 'alice',
      senderJid: 'alice@beamforge.local/web',
      body: text,
      timestamp: timeStr,
      status,
      rawXml: xml,
      routedVia: routeDetail,
    };

    setMessages((prev) => [...prev, newMsg]);

    // Append wire stanza
    const newStanza: StanzaLog = {
      id: `st-${Date.now()}`,
      timestamp: `${timeStr}.${Math.floor(Math.random() * 900 + 100)}`,
      direction: 'in',
      source: 'alice@beamforge.local/web',
      target: 'bob@beamforge.local/mobile',
      xml,
      detail: isBobOnline
        ? 'Delivered directly to online session process'
        : 'Buffered in offline queue table for delayed delivery upon reconnection',
      handledByModule: isBobOnline ? 'xmpp_router.erl (M5)' : 'xmpp_router.erl offline queue (M5)',
    };

    setStanzas((prev) => [...prev, newStanza]);
    if (!textToSend) setInputVal('');

    // If Bob is online, simulate an automated smart reply after a brief moment
    if (isBobOnline && !textToSend?.startsWith('[Bob]')) {
      setTimeout(() => {
        const bobReplyId = `m-${(Date.now() + 1).toString().slice(-4)}`;
        const replyText = text.toLowerCase().includes('help')
          ? 'Check xmpp_router:route/2 logic and verify ETS session registration!'
          : text.toLowerCase().includes('sup') || text.toLowerCase().includes('restart')
          ? 'The rest_for_one supervisor ensures child workers restart cleanly with state intact.'
          : `Ack: "${text.slice(0, 32)}${text.length > 32 ? '...' : ''}" received via RFC 6120 XML parser!`;

        const replyXml = `<message from="bob@beamforge.local/mobile" to="alice@beamforge.local/web" type="chat" id="${bobReplyId}">\n  <body>${replyText}</body>\n</message>`;
        const replyMsg: ChatMessage = {
          id: bobReplyId,
          sender: 'bob',
          senderJid: 'bob@beamforge.local/mobile',
          body: replyText,
          timestamp: new Date().toTimeString().split(' ')[0],
          status: 'delivered',
          rawXml: replyXml,
          routedVia: 'xmpp_router:route/2 -> Target PID <0.138.0> in ETS',
        };
        setMessages((prev) => [...prev, replyMsg]);

        setStanzas((prev) => [
          ...prev,
          {
            id: `st-${Date.now()}`,
            timestamp: `${new Date().toTimeString().split(' ')[0]}.${Math.floor(Math.random() * 900 + 100)}`,
            direction: 'out',
            source: 'bob@beamforge.local/mobile',
            target: 'alice@beamforge.local/web',
            xml: replyXml,
            detail: 'Direct reply routed across ETS session table',
            handledByModule: 'xmpp_router.erl (M5)',
          },
        ]);
      }, 700);
    }
  };

  const handleToggleBobPresence = () => {
    const nextState = !isBobOnline;
    setIsBobOnline(nextState);

    const now = new Date().toTimeString().split(' ')[0];
    const xml = nextState
      ? "<presence from='bob@beamforge.local/mobile'><priority>5</priority><show>chat</show><status>Online via Mobile</status></presence>"
      : "<presence from='bob@beamforge.local/mobile' type='unavailable'/>";

    setStanzas((prev) => [
      ...prev,
      {
        id: `st-${Date.now()}`,
        timestamp: `${now}.${Math.floor(Math.random() * 900 + 100)}`,
        direction: 'in',
        source: 'bob@beamforge.local/mobile',
        xml,
        detail: nextState
          ? 'Bob registered as available. Flushing any queued offline stanzas!'
          : 'Bob went unavailable. xmpp_session_registry:unregister/1 removes session from ETS.',
        handledByModule: nextState ? 'xmpp_router.erl (M5 offline flush)' : 'xmpp_session_registry.erl (M3)',
      },
    ]);

    // If reconnecting Bob, deliver any spooled messages
    if (nextState) {
      setMessages((prev) =>
        prev.map((m) =>
          m.status === 'spooled_offline'
            ? { ...m, status: 'delivered', routedVia: 'Flushed from offline_queue to newly connected Bob!' }
            : m
        )
      );
      setActiveChaosNotice('Bob reconnected! All offline queued stanzas have been flushed to Bob.');
      setTimeout(() => setActiveChaosNotice(null), 4000);
    } else {
      setActiveChaosNotice('Bob disconnected. Future messages to Bob will buffer in the ETS offline queue.');
      setTimeout(() => setActiveChaosNotice(null), 4000);
    }
  };

  const handleSimulateStanzaInjection = () => {
    const now = new Date().toTimeString().split(' ')[0];
    const injectionXml = "<message to='bob@beamforge.local'><script>malicious_payload()</script>&invalid_entity;</message>";

    setStanzas((prev) => [
      ...prev,
      {
        id: `st-${Date.now()}`,
        timestamp: `${now}.${Math.floor(Math.random() * 900 + 100)}`,
        direction: 'in',
        source: 'unauthenticated_attacker',
        xml: injectionXml,
        detail: 'SECURITY ALERT: Pre-auth injection attempt detected! Sanitized & rejected by xmpp_stream_parser.',
        handledByModule: 'xmpp_stream_parser.erl (M2 Security Guard)',
      },
      {
        id: `st-${Date.now() + 1}`,
        timestamp: `${now}.${Math.floor(Math.random() * 900 + 100)}`,
        direction: 'out',
        source: 'beamforge.local',
        xml: "<stream:error><not-well-formed xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error></stream:stream>",
        detail: 'Connection immediately closed following RFC 6120 Section 4.9.3 stream error contract.',
        handledByModule: 'xmpp_c2s_statem.erl (M4 Error Recovery)',
      },
    ]);

    setActiveChaosNotice('Security Guard Tripped: Pre-auth XML injection safely sanitized & connection dropped.');
    setTimeout(() => setActiveChaosNotice(null), 4500);
  };

  const handleSimulateChaosCrash = () => {
    const now = new Date().toTimeString().split(' ')[0];
    setStanzas((prev) => [
      ...prev,
      {
        id: `st-${Date.now()}`,
        timestamp: `${now}.${Math.floor(Math.random() * 900 + 100)}`,
        direction: 'router',
        source: 'Chaos Monkey',
        xml: "exit(whereis(xmpp_router), kill).",
        detail: 'Simulated router crash signal: exit(kill) sent to registered process.',
        handledByModule: 'test/xmpp_chaos_test.erl (Chaos Engine)',
      },
      {
        id: `st-${Date.now() + 1}`,
        timestamp: `${now}.${Math.floor(Math.random() * 900 + 100)}`,
        direction: 'out',
        source: 'xmpp_sup',
        xml: "xmpp_sup: rest_for_one restart -> restarted xmpp_router, preserved ETS session table.",
        detail: 'Supervisor recovered router in 2.4ms with ZERO session loss due to ETS heir architecture.',
        handledByModule: 'xmpp_sup.erl (M1 Supervisor)',
      },
    ]);

    setActiveChaosNotice('Chaos Attack Triage: xmpp_router crashed and was auto-restarted by xmpp_sup under rest_for_one!');
    setTimeout(() => setActiveChaosNotice(null), 4500);
  };

  const handleResetSimulator = () => {
    setMessages(INITIAL_MESSAGES);
    setStanzas(INITIAL_STANZAS);
    setIsBobOnline(true);
    setSelectedStanzaXml(null);
    setActiveChaosNotice(null);
  };

  const totalDelivered = messages.filter((m) => m.status === 'delivered').length;
  const totalSpooled = messages.filter((m) => m.status === 'spooled_offline').length;

  return (
    <div
      id="live-xmpp-chat-simulator"
      className="flex flex-col h-full rounded-2xl overflow-hidden border select-none"
      style={{
        background: isDark ? 'rgba(11, 15, 23, 0.85)' : 'rgba(255, 255, 255, 0.90)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)',
        boxShadow: isDark
          ? '0 16px 40px -10px rgba(0, 0, 0, 0.70)'
          : '0 12px 32px -8px rgba(15, 23, 42, 0.10)',
        backdropFilter: 'blur(28px)',
      }}
    >
      {/* ── Top Header Strip: Server Status & Telemetry ── */}
      <div
        className="px-3 sm:px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 flex-shrink-0"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(248, 250, 252, 0.80)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${
              isClusterBooted || previewGoldenModel
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
            }`}
          >
            <Radio className={`w-3 h-3 ${isClusterBooted || previewGoldenModel ? 'animate-pulse' : ''}`} />
            <span>{isClusterBooted || previewGoldenModel ? 'Port 5222 Live' : 'Port 5222 Standby'}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>BeamForge XMPP Core (6 Milestones Integrated)</span>
          </div>
        </div>

        {/* View Switcher: Live Chat vs Wire Terminal vs Mobile Architecture */}
        <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 p-0.5 rounded-xl border border-white/10">
          <button
            onClick={() => setSubTab('chat')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
            style={{
              background: subTab === 'chat' ? (isDark ? '#F59E0B' : '#D97706') : 'transparent',
              color: subTab === 'chat' ? '#0F172A' : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dual Chat Client</span>
            <span className="sm:hidden">Chat</span>
          </button>

          <button
            onClick={() => setSubTab('wire')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
            style={{
              background: subTab === 'wire' ? (isDark ? '#8B5CF6' : '#7C3AED') : 'transparent',
              color: subTab === 'wire' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Stanza Wire Terminal ({stanzas.length})</span>
            <span className="sm:hidden">Wire ({stanzas.length})</span>
          </button>

          {/* Mobile Architecture Tab */}
          <button
            onClick={() => setSubTab('arch')}
            className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
            style={{
              background: subTab === 'arch' ? (isDark ? '#3B82F6' : '#2563EB') : 'transparent',
              color: subTab === 'arch' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Modules</span>
          </button>

          <button
            onClick={handleResetSimulator}
            title="Reset Simulator"
            className="p-1 rounded-lg text-xs hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Spec Sandbox Preview Banner (if active) ── */}
      {previewGoldenModel && !isClusterBooted && (
        <div
          className="px-4 py-1.5 text-xs font-medium flex items-center justify-between border-b"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.10)',
            borderColor: 'rgba(245, 158, 11, 0.30)',
            color: '#F59E0B',
          }}
        >
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Spec Sandbox Preview (Target RFC 6120 Specification)</span>
          </div>
          <button
            onClick={() => setPreviewGoldenModel(false)}
            className="text-[10px] font-bold underline hover:text-amber-400 cursor-pointer"
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* ── Chaos Alert Toast (if active) ── */}
      {activeChaosNotice && (
        <div
          className="px-4 py-1.5 text-xs font-medium flex items-center gap-2 border-b animate-slide-down"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.10)',
            borderColor: 'rgba(245, 158, 11, 0.30)',
            color: '#F59E0B',
          }}
        >
          <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="flex-1">{activeChaosNotice}</span>
        </div>
      )}

      {/* ── PROGRESSIVE MILESTONE GATING: If cluster is offline & not previewing ── */}
      {!isClusterBooted && !previewGoldenModel ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-y-auto">
          <div
            className="max-w-md w-full p-5 sm:p-6 rounded-3xl border text-center shadow-xl backdrop-blur-xl"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.90)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)',
            }}
          >
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-inner">
              <Server className="w-6 h-6" />
            </div>

            <h3 className="text-sm sm:text-base font-bold mb-1" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
              XMPP Cluster Standby
            </h3>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Your server cluster requires all core OTP modules to boot. Solve and verify your components to start routing stanzas on Port 5222.
            </p>

            {/* Missing Dependencies Notice if learner solved out-of-order */}
            {missingCoreDependencies.length > 0 && passedTotalCount > 0 && (
              <div
                className="mb-3 px-3 py-1.5 rounded-xl border text-[11px] font-semibold text-amber-500 bg-amber-500/10 border-amber-500/25 flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Waiting on: {missingCoreDependencies.join(', ')}</span>
              </div>
            )}

            {/* 6-Milestone Power-Up Assembly Rack */}
            <div className="space-y-1.5 mb-4 text-left text-xs font-mono">
              {/* M1: Supervisor */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${
                  m1Passed
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {m1Passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-bold font-sans" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      M1: xmpp_sup
                    </span>
                    <span className="text-[10px] ml-1.5 text-slate-400 font-sans">Root Supervisor</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m1Passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {m1Passed ? 'RUNNING' : 'OFFLINE'}
                </span>
              </div>

              {/* M2: Stream Parser */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${
                  m2Passed
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {m2Passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-bold font-sans" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      M2: xmpp_stream_parser
                    </span>
                    <span className="text-[10px] ml-1.5 text-slate-400 font-sans">XML Tokenizer</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m2Passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {m2Passed ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>

              {/* M3: Session Registry */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${
                  m3Passed
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {m3Passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-bold font-sans" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      M3: xmpp_session_registry
                    </span>
                    <span className="text-[10px] ml-1.5 text-slate-400 font-sans">ETS JID Table</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m3Passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {m3Passed ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>

              {/* M4: C2S StateM */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${
                  m4Passed
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {m4Passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-bold font-sans" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      M4: xmpp_c2s_statem
                    </span>
                    <span className="text-[10px] ml-1.5 text-slate-400 font-sans">SASL FSM</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m4Passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {m4Passed ? 'AUTHENTICATED' : 'OFFLINE'}
                </span>
              </div>

              {/* M5: Router */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${
                  m5Passed
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {m5Passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-bold font-sans" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      M5: xmpp_router
                    </span>
                    <span className="text-[10px] ml-1.5 text-slate-400 font-sans">Router & Queue</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m5Passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {m5Passed ? 'ONLINE' : 'LOCKED'}
                </span>
              </div>

              {/* M6: Chaos Monkey Resilience Lab */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${
                  m6Passed
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {m6Passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-bold font-sans" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      M6: xmpp_chaos_test
                    </span>
                    <span className="text-[10px] ml-1.5 text-slate-400 font-sans">Chaos Resilience</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m6Passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {m6Passed ? 'RESILIENT' : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Spec Sandbox Preview Button */}
            <div
              className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
            >
              <span className="text-[11px]" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Verified milestones: <strong>{passedTotalCount}/6</strong>
              </span>
              <button
                onClick={() => setPreviewGoldenModel(true)}
                className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Preview Spec Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── MAIN CONTENT AREA ── */
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {subTab === 'chat' ? (
            <>
              {/* ── Alice's Client Window ── */}
              <div
                className="flex-1 flex flex-col min-w-0 border-r"
                style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }}
              >
                {/* Alice Header with Mobile Bob Presence Switcher */}
                <div
                  className="px-3 sm:px-4 py-2 border-b flex items-center justify-between"
                  style={{
                    background: isDark ? 'rgba(30, 41, 59, 0.40)' : 'rgba(241, 245, 249, 0.60)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-[10px]">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        Alice
                      </div>
                      <div className="text-[10px] font-mono text-blue-400">alice@beamforge.local/web</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <UserCheck className="w-3 h-3" />
                      <span>Available (Pri 10)</span>
                    </div>

                    {/* Mobile-Friendly Bob Presence Toggle */}
                    <button
                      onClick={handleToggleBobPresence}
                      className={`md:hidden flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        isBobOnline
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                      title="Toggle Bob's presence"
                    >
                      {isBobOnline ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      <span>Bob: {isBobOnline ? 'Online' : 'Offline'}</span>
                    </button>
                  </div>
                </div>

                {/* Message Scrollable Stream */}
                <div className="p-3 overflow-y-auto space-y-2.5 flex-1 min-h-0">
                  {messages.map((msg) => {
                    const isAlice = msg.sender === 'alice';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAlice ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div
                          className="flex items-center gap-1.5 text-[10px]"
                          style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                        >
                          <span className="font-bold">{isAlice ? 'Alice' : 'Bob'}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm transition-all ${
                            isAlice
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : isDark
                              ? 'bg-slate-800 text-slate-100 rounded-bl-xs border border-white/10'
                              : 'bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200'
                          }`}
                        >
                          <p>{msg.body}</p>

                          {/* Stanza Inspection Pill */}
                          <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] opacity-85 font-mono">
                            <span className="truncate max-w-[140px] sm:max-w-[180px]">{msg.routedVia}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedStanzaXml(msg.rawXml)}
                              className="underline hover:text-white shrink-0 ml-1 cursor-pointer"
                            >
                              XML Wire
                            </button>
                          </div>
                        </div>

                        <div className="text-[10px] flex items-center gap-1">
                          {msg.status === 'delivered' ? (
                            <span className="text-emerald-500 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Delivered
                            </span>
                          ) : (
                            <span className="text-amber-500 flex items-center gap-0.5">
                              <ShieldAlert className="w-3 h-3" /> Spooled Offline in ETS
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Presets Ribbon */}
                <div
                  className="p-2 border-t flex gap-1.5 overflow-x-auto no-scrollbar"
                  style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.40)' : 'rgba(248, 250, 252, 0.50)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                  }}
                >
                  <button
                    onClick={() => handleSendMessage('OTP 29 processes handle 4,000 reductions per time slice!')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors border cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                      color: isDark ? '#E2E8F0' : '#334155',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.10)',
                    }}
                  >
                    Ask about OTP Reductions
                  </button>
                  <button
                    onClick={handleSimulateStanzaInjection}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors border text-rose-400 bg-rose-500/10 border-rose-500/25 cursor-pointer"
                  >
                    Test Stanza Injection (M2)
                  </button>
                  <button
                    onClick={handleSimulateChaosCrash}
                    disabled={!m6Passed && !previewGoldenModel}
                    title={!m6Passed && !previewGoldenModel ? 'Verify Milestone 6 (Chaos Monkey) to unlock live crash triage' : 'Simulate supervisor recovery'}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors border cursor-pointer ${
                      m6Passed || previewGoldenModel
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20'
                        : 'text-slate-500 bg-slate-500/10 border-slate-500/20 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {!m6Passed && !previewGoldenModel ? <Lock className="w-3 h-3 inline mr-1" /> : null}
                    <span>Crash Router with Chaos (M1)</span>
                  </button>
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-2.5 border-t flex items-center gap-2"
                  style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.80)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                  }}
                >
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Type an RFC 6120 chat stanza to Bob..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    style={{
                      background: isDark ? 'rgba(30, 41, 59, 0.60)' : 'rgba(241, 245, 249, 0.80)',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.10)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!inputVal.trim()}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* ── Bob's Session & Controls Pane (Desktop Only) ── */}
              <div
                className="hidden md:flex w-80 flex-col flex-shrink-0"
                style={{ background: isDark ? 'rgba(15, 23, 42, 0.40)' : 'rgba(248, 250, 252, 0.50)' }}
              >
                {/* Bob Header & Presence Switcher */}
                <div
                  className="px-4 py-2 border-b flex items-center justify-between"
                  style={{
                    background: isDark ? 'rgba(30, 41, 59, 0.40)' : 'rgba(241, 245, 249, 0.60)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-[10px]">
                      B
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        Bob (Recipient)
                      </div>
                      <div className="text-[10px] font-mono text-purple-400">bob@beamforge.local/mobile</div>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleBobPresence}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      isBobOnline
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                    title="Toggle Bob's presence between Available and Unavailable"
                  >
                    {isBobOnline ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                    <span>{isBobOnline ? 'Online (Pri 5)' : 'Offline (Simulate Spool)'}</span>
                  </button>
                </div>

                {/* Architectural Module Mapping Cards */}
                <div className="p-3.5 space-y-2 overflow-y-auto flex-1 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    <span>XMPP Blueprint (6/6)</span>
                    <span className="text-[10px] font-mono text-emerald-400">{passedTotalCount}/6 Live</span>
                  </div>

                  <div
                    className="p-2 rounded-xl border text-xs space-y-1"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-400">M1: xmpp_sup</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300">
                        rest_for_one
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                      Supervises registry, router, parser & acceptor pool in dependency order.
                    </p>
                  </div>

                  <div
                    className="p-2 rounded-xl border text-xs space-y-1"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400">M2: xmpp_stream_parser</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300">
                        binary:copy/1
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                      Tokenizes incremental XML bytes and prevents sub-binary memory leaks.
                    </p>
                  </div>

                  <div
                    className="p-2 rounded-xl border text-xs space-y-1"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">M3: xmpp_session_registry</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300">
                        ETS + monitor/2
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                      Stores active JID-to-PID maps and auto-cleans on &apos;DOWN&apos; signals.
                    </p>
                  </div>

                  <div
                    className="p-2 rounded-xl border text-xs space-y-1"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-400">M4: xmpp_c2s_statem</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300">
                        SASL FSM
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                      4-phase client connection FSM handling SASL PLAIN & resource binding.
                    </p>
                  </div>

                  <div
                    className="p-2 rounded-xl border text-xs space-y-1"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">M5: xmpp_router</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300">
                        Direct + Offline
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                      Delivered: <strong className="text-emerald-500">{totalDelivered}</strong> | Spooled: <strong className="text-amber-500">{totalSpooled}</strong>
                    </p>
                  </div>

                  <div
                    className="p-2 rounded-xl border text-xs space-y-1"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400">M6: xmpp_chaos_test</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300">
                        Chaos Monkey
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                      Validates supervisor recovery under untrappable exit(kill) signals.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : subTab === 'arch' ? (
            /* ── Dedicated Mobile Architecture View (< md) ── */
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5" style={{ background: isDark ? '#0B0F17' : '#FFFFFF' }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                <span>XMPP Blueprint (6/6)</span>
                <span className="text-[10px] font-mono text-emerald-400">{passedTotalCount}/6 Live</span>
              </div>

              <div
                className="p-2.5 rounded-xl border text-xs space-y-1"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-400">M1: xmpp_sup</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300">
                    rest_for_one
                  </span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  Supervises registry, router, parser & acceptor pool in dependency order.
                </p>
              </div>

              <div
                className="p-2.5 rounded-xl border text-xs space-y-1"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400">M2: xmpp_stream_parser</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300">
                    binary:copy/1
                  </span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  Tokenizes incremental XML bytes and prevents sub-binary memory leaks.
                </p>
              </div>

              <div
                className="p-2.5 rounded-xl border text-xs space-y-1"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">M3: xmpp_session_registry</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300">
                    ETS + monitor/2
                  </span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  Stores active JID-to-PID maps and auto-cleans on &apos;DOWN&apos; signals.
                </p>
              </div>

              <div
                className="p-2.5 rounded-xl border text-xs space-y-1"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-400">M4: xmpp_c2s_statem</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300">
                    SASL FSM
                  </span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  4-phase client connection FSM handling SASL PLAIN & resource binding.
                </p>
              </div>

              <div
                className="p-2.5 rounded-xl border text-xs space-y-1"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">M5: xmpp_router</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300">
                    Direct + Offline
                  </span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  Delivered: <strong className="text-emerald-500">{totalDelivered}</strong> | Spooled: <strong className="text-amber-500">{totalSpooled}</strong>
                </p>
              </div>

              <div
                className="p-2.5 rounded-xl border text-xs space-y-1"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400">M6: xmpp_chaos_test</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300">
                    Chaos Monkey
                  </span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  Validates supervisor recovery under untrappable exit(kill) signals.
                </p>
              </div>
            </div>
          ) : (
            /* ── Stanza Wire Terminal View ── */
            <div className="flex-1 flex flex-col font-mono text-xs overflow-hidden" style={{ background: '#0B0F17' }}>
              <div className="px-3 sm:px-4 py-2 border-b border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Raw TCP Stream Transcript (RFC 6120 Frame Wire)</span>
                </div>
                <span className="hidden sm:inline">Port 5222 • UTF-8 XML</span>
              </div>
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
                {stanzas.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-white/5 space-y-1.5 hover:border-white/20 transition-all cursor-pointer"
                    style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                    onClick={() => setSelectedStanzaXml(st.xml)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded ${
                            st.direction === 'in'
                              ? 'bg-blue-500/20 text-blue-400'
                              : st.direction === 'out'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {st.direction.toUpperCase()}
                        </span>
                        <span className="text-slate-400">{st.timestamp}</span>
                        <span className="text-slate-300 font-bold">{st.source}</span>
                        {st.target && (
                          <>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="text-slate-300">{st.target}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-amber-400 font-sans">{st.handledByModule}</span>
                    </div>
                    <pre className="text-emerald-300 whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-black/40 p-2 rounded-lg border border-white/5 overflow-x-auto">
                      {st.xml}
                    </pre>
                    <p className="text-[10px] text-slate-400 font-sans italic">{st.detail}</p>
                  </div>
                ))}
                <div ref={wireEndRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Monospace XML Stanza Inspector Modal (if selected) ── */}
      {selectedStanzaXml && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedStanzaXml(null)}
        >
          <div
            className="w-full max-w-lg p-5 rounded-2xl border space-y-3"
            style={{
              background: '#0B0F17',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.80)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">RFC 6120 XML Stanza Wire Frame</span>
              </div>
              <button
                onClick={() => setSelectedStanzaXml(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
              >
                Close
              </button>
            </div>
            <pre className="font-mono text-xs text-emerald-300 p-3 rounded-xl bg-black/60 border border-white/10 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {selectedStanzaXml}
            </pre>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Encoding: UTF-8</span>
              <span>Framing: Incremental stream element</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
