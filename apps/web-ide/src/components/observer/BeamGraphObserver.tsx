'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { 
  Radio, 
  Skull, 
  Mail, 
  Flame, 
  Minus, 
  Plus, 
  RotateCcw
} from 'lucide-react';

export const BeamGraphObserver: React.FC = () => {
  const {
    nodes,
    edges,
    pulses,
    selectedNodeId,
    setSelectedNodeId,
    updateNodePosition,
    killProcess,
    sendTestMessage,
    injectMailboxFlood,
  } = useWorkspaceStore();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggingNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = (e.clientX - rect.left - pan.x) / zoom;
      const newY = (e.clientY - rect.top - pan.y) / zoom;
      updateNodePosition(draggingNodeId, Math.round(newX), Math.round(newY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(2.5, Math.max(0.4, prev * factor)));
  };

  // Pulse animation state
  const [pulseTick, setPulseTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((t) => (t + 1) % 100);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full bg-slate-50/90 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Top Header Bar */}
      <div className="absolute top-3 left-4 z-10 flex items-center space-x-2 bg-white/85 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/80 text-xs font-mono shadow-sm">
        <div className="flex items-center space-x-1.5 text-ios-blue">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-semibold tracking-wide">BEAM Observer</span>
        </div>
        <span className="text-slate-300">|</span>
        <span className="text-ios-muted">Topology:</span>
        <span className="text-emerald-600 font-semibold">{nodes.filter((n) => n.status === 'running').length} active</span>
        {nodes.some((n) => n.status === 'crashed') && (
          <span className="text-rose-600 font-bold animate-pulse">
            • {nodes.filter((n) => n.status === 'crashed').length} crashed
          </span>
        )}
      </div>

      {/* Floating Controls (Zoom / Center) */}
      <div className="absolute top-3 right-4 z-10 flex items-center space-x-1 bg-white/85 backdrop-blur-xl p-1 rounded-xl border border-white/80 shadow-sm">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.15))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-ios-slate transition-colors"
          title="Zoom In"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z * 0.85))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-ios-slate transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-ios-slate transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main SVG Process Graph Canvas */}
      <svg
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          {/* Radial Glow Filters */}
          <filter id="glow-violet" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-crimson" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Graph Edges */}
        {edges.map((edge) => {
          const source = nodes.find((n) => n.id === edge.source);
          const target = nodes.find((n) => n.id === edge.target);
          if (!source || !target) return null;

          let strokeColor = '#334155';
          let strokeDasharray = 'none';
          let strokeWidth = 1.5;

          if (edge.relation === 'ets_owner') {
            strokeColor = '#f59e0b';
            strokeWidth = 2;
          } else if (edge.relation === 'ets_heir') {
            strokeColor = '#f59e0b';
            strokeDasharray = '4 4';
          } else if (edge.relation === 'monitor') {
            strokeColor = '#38bdf8';
            strokeDasharray = '5 3';
          }

          return (
            <g key={edge.id}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                opacity={0.7}
              />
            </g>
          );
        })}

        {/* Animated Message Pulses along Edges */}
        {pulses.map((pulse) => {
          const source = nodes.find((n) => n.id === pulse.source);
          const target = nodes.find((n) => n.id === pulse.target);
          if (!source || !target) return null;

          const progress = (pulseTick % 100) / 100;
          const curX = source.x + (target.x - source.x) * progress;
          const curY = source.y + (target.y - source.y) * progress;

          let pulseColor = '#38bdf8';
          if (pulse.kind === 'exit_signal') pulseColor = '#ef4444';
          if (pulse.kind === 'ets_transfer') pulseColor = '#f59e0b';

          return (
            <g key={pulse.id}>
              <circle
                cx={curX}
                cy={curY}
                r={6}
                fill={pulseColor}
                filter="url(#glow-violet)"
              />
              <text
                x={curX + 8}
                y={curY - 6}
                fill={pulseColor}
                fontSize={9}
                fontFamily="JetBrains Mono"
                className="font-bold"
              >
                {pulse.label}
              </text>
            </g>
          );
        })}

        {/* BEAM Nodes */}
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const isSupervisor = node.kind === 'supervisor';
          const isEts = node.kind === 'ets_table';
          const isCrashed = node.status === 'crashed';
          const isWarning = node.status === 'warning';

          let nodeColor = '#10b981'; // Emerald
          if (isSupervisor) nodeColor = '#8b5cf6'; // Violet
          if (isEts) nodeColor = '#f59e0b'; // Amber
          if (isWarning) nodeColor = '#f59e0b'; // Amber warning
          if (isCrashed) nodeColor = '#ef4444'; // Crimson

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeId(node.id);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingNodeId(node.id);
              }}
              className="cursor-pointer group"
            >
              {/* Outer Selection Ring */}
              {isSelected && (
                <circle
                  r={isSupervisor ? 36 : isEts ? 32 : 28}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  className="animate-spin"
                  style={{ animationDuration: '10s' }}
                />
              )}

              {/* Node Shape */}
              {isSupervisor ? (
                // Hexagon for Supervisor
                <polygon
                  points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14"
                  fill="#ffffff"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={isCrashed ? 'url(#glow-crimson)' : 'url(#glow-violet)'}
                  className="transition-all duration-300"
                />
              ) : isEts ? (
                // Pill / Cylinder for ETS
                <rect
                  x={-34}
                  y={-18}
                  width={68}
                  height={36}
                  rx={8}
                  fill="#ffffff"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  filter="url(#glow-amber)"
                  className="transition-all duration-300"
                />
              ) : (
                // Circle for Workers
                <circle
                  r={22}
                  fill="#ffffff"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={
                    isCrashed
                      ? 'url(#glow-crimson)'
                      : isWarning
                      ? 'url(#glow-amber)'
                      : 'url(#glow-emerald)'
                  }
                  className="transition-all duration-300"
                />
              )}

              {/* Status / Activity Icon inside node */}
              <text
                textAnchor="middle"
                dy="4"
                fill={nodeColor}
                fontSize={isSupervisor ? 12 : 11}
                fontFamily="JetBrains Mono"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {isCrashed ? 'RIP' : isSupervisor ? 'SUP' : isEts ? 'ETS' : 'GEN'}
              </text>

              {/* Registered Name Label */}
              <text
                textAnchor="middle"
                y={isSupervisor ? 42 : isEts ? 32 : 36}
                fill="#0f172a"
                fontSize={11}
                fontFamily="JetBrains Mono"
                fontWeight="600"
                className="pointer-events-none drop-shadow-sm"
              >
                {node.name}
              </text>

              {/* PID or Ref Subtitle */}
              <text
                textAnchor="middle"
                y={isSupervisor ? 54 : isEts ? 44 : 48}
                fill="#94a3b8"
                fontSize={9}
                fontFamily="JetBrains Mono"
                className="pointer-events-none"
              >
                {node.id}
              </text>

              {/* Mailbox Backpressure Pill if high */}
              {node.mailboxLen > 0 && (
                <g transform="translate(14, -22)">
                  <rect
                    width={26}
                    height={14}
                    rx={7}
                    fill="#ef4444"
                    className="animate-pulse"
                  />
                  <text
                    x={13}
                    y={10}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={8}
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    {node.mailboxLen > 999 ? '999+' : node.mailboxLen}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Daylight Node Inspector HUD */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-20 w-80 glass-panel p-4 shadow-glass-float border border-white font-mono text-xs text-ios-slate">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  selectedNode.status === 'crashed'
                    ? 'bg-rose-600 animate-pulse'
                    : selectedNode.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="font-bold text-ios-slate">
                {selectedNode.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 uppercase font-bold">
              {selectedNode.kind}
            </span>
          </div>

          <div className="space-y-1.5 mb-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-ios-muted">Process Identifier:</span>
              <span className="text-ios-blue font-bold">{selectedNode.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ios-muted">Mailbox Queue:</span>
              <span
                className={
                  selectedNode.mailboxLen > 100
                    ? 'text-rose-600 font-bold'
                    : 'text-ios-slate'
                }
              >
                {selectedNode.mailboxLen} msgs
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ios-muted">Heap Memory:</span>
              <span className="text-ios-slate">
                {(selectedNode.heapBytes / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ios-muted">Reductions:</span>
              <span className="text-emerald-600 font-semibold">
                {selectedNode.reductions.toLocaleString()}
              </span>
            </div>
            {selectedNode.details?.restartIntensity && (
              <div className="flex justify-between">
                <span className="text-ios-muted">Restart Intensity:</span>
                <span className="text-violet-600 font-medium">
                  {selectedNode.details.restartIntensity}
                </span>
              </div>
            )}
            {selectedNode.details?.socketMode && (
              <div className="flex justify-between">
                <span className="text-ios-muted">Socket Mode:</span>
                <span className="text-emerald-600 font-bold">
                  {selectedNode.details.socketMode}
                </span>
              </div>
            )}
          </div>

          {/* State Term Box */}
          <div className="mb-3">
            <span className="text-[10px] text-ios-muted block mb-1">
              sys:get_state/1 Erlang Term:
            </span>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-emerald-700 overflow-x-auto max-h-20 whitespace-pre-wrap">
              {selectedNode.stateTerm}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() =>
                sendTestMessage(
                  selectedNode.id,
                  "{ping, <<" + selectedNode.name + ">>}"
                )
              }
              className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center space-x-1 transition-colors font-medium"
            >
              <Mail className="w-3 h-3 text-ios-blue" />
              <span className="text-[10px]">Call Message</span>
            </button>
            <button
              onClick={() => injectMailboxFlood(selectedNode.id)}
              className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center space-x-1 transition-colors font-medium"
            >
              <Flame className="w-3 h-3 text-amber-600" />
              <span className="text-[10px]">Flood Queue</span>
            </button>
            <button
              onClick={() => killProcess(selectedNode.id)}
              className="col-span-2 px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center space-x-1.5 transition-colors font-semibold"
            >
              <Skull className="w-3.5 h-3.5" />
              <span className="text-[10px]">Inject exit(Pid, kill)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
