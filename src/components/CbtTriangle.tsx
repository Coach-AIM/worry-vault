"use client";

import React, { useState } from 'react';

// ============================================================
// TYPE DEFINITIONS
// ============================================================
type NodeKey = 'thoughts' | 'feelings' | 'behaviors';

interface NodeConfig {
  title: string;
  desc: string;
  /** Tailwind classes for the info-panel border + text + bg */
  color: string;
  /** Tailwind classes for the active button bg + border */
  activeBtnColor: string;
  /** Tailwind classes for the inactive button hover border */
  hoverBorderColor: string;
  emoji: string;
}

// ============================================================
// STATIC DATA
// ============================================================

const NODES: Record<NodeKey, NodeConfig> = {
  thoughts: {
    emoji: '💭',
    title: '💭 Thoughts',
    desc: "The automatic words, phrases, and narratives your brain loops. (e.g., 'I am going to fail this presentation.') Directly dictates your subsequent emotional chemistry.",
    color: 'border-blue-500 text-blue-900 bg-blue-50/70',
    activeBtnColor: 'border-blue-600 bg-blue-600 text-white shadow-md',
    hoverBorderColor: 'hover:border-blue-300',
  },
  feelings: {
    emoji: '❤️',
    title: '❤️ Feelings',
    desc: 'The visceral emotions and immediate physical body sensations that follow a thought. (e.g., Dread, chest tightening, racing heart pulse.)',
    color: 'border-amber-500 text-amber-900 bg-amber-50/70',
    activeBtnColor: 'border-amber-500 bg-amber-500 text-white shadow-md',
    hoverBorderColor: 'hover:border-amber-300',
  },
  behaviors: {
    emoji: '🏃',
    title: '🏃 Behaviors',
    desc: 'The physical actions you execute or avoid. (e.g., Procrastinating preparation, avoiding eye contact, or social withdrawal.) It reinforces the unhelpful loop.',
    color: 'border-emerald-500 text-emerald-900 bg-emerald-50/70',
    activeBtnColor: 'border-emerald-600 bg-emerald-600 text-white shadow-md',
    hoverBorderColor: 'hover:border-emerald-300',
  },
};

// ============================================================
// HELPER — SVG connection-line stroke color
// ============================================================
function edgeStroke(active: NodeKey, nodeA: NodeKey, nodeB: NodeKey, activeColor: string): string {
  return active === nodeA || active === nodeB ? activeColor : '#cbd5e1';
}

// ============================================================
// MAIN EXPORT
// ============================================================

/**
 * CbtTriangle
 *
 * Renders an absolute-positioned geometric triangle with three
 * interactive apex nodes (Thoughts / Feelings / Behaviors) and
 * SVG connection lines that highlight based on the active node.
 * Clicking a node updates the info-panel below the triangle.
 */
export default function CbtTriangle() {
  const [activeNode, setActiveNode] = useState<NodeKey>('thoughts');

  const active = NODES[activeNode];

  // ── button class builder ──────────────────────────────────
  function btnClass(key: NodeKey): string {
    const base =
      'absolute w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center font-extrabold text-sm transition-all duration-200 shadow-sm';
    if (activeNode === key) {
      return `${base} scale-110 z-10 ${active.activeBtnColor}`;
    }
    return `${base} border-slate-200 bg-white text-slate-700 ${NODES[key].hoverBorderColor}`;
  }

  return (
    <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-center mt-8">

      {/* Header */}
      <span className="bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
        Interactive Engine
      </span>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2 text-center">
        The Cognitive Behavioral Triangle
      </h3>
      <p className="text-base sm:text-lg text-slate-600 mb-12 text-center font-medium">
        Thoughts, feelings, and behaviors reinforce each other. Tap any apex point to trace the circuit.
      </p>

      {/* Triangle workspace — 400 × 360 px logical grid */}
      <div className="w-full max-w-md mx-auto h-[360px] sm:h-[400px] flex items-center justify-center py-2 relative mb-8">

        {/* SVG overlay — connection loop arrows */}
        <svg
          className="w-full h-full max-h-[380px] pointer-events-none"
          viewBox="0 0 400 360"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* dashed triangle outline */}
          <polygon
            points="200,55 80,290 320,290"
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
          {/* Thoughts → Feelings edge (amber when either is active) */}
          <path
            d="M 200 55 L 80 290"
            stroke={edgeStroke(activeNode, 'thoughts', 'feelings', '#f59e0b')}
            strokeWidth="2.5"
            fill="none"
          />
          {/* Feelings → Behaviors edge (emerald when either is active) */}
          <path
            d="M 80 290 L 320 290"
            stroke={edgeStroke(activeNode, 'feelings', 'behaviors', '#10b981')}
            strokeWidth="2.5"
            fill="none"
          />
          {/* Behaviors → Thoughts edge (blue when either is active) */}
          <path
            d="M 320 290 L 200 55"
            stroke={edgeStroke(activeNode, 'behaviors', 'thoughts', '#3b82f6')}
            strokeWidth="2.5"
            fill="none"
          />
        </svg>

        {/* Apex node — Thoughts (Top Center) */}
        <button
          onClick={() => setActiveNode('thoughts')}
          className={`${btnClass('thoughts')} top-0 left-1/2 -translate-x-1/2`}
        >
          <span>💭</span>
          <span className="mt-1">Thoughts</span>
        </button>

        {/* Apex node — Feelings (Bottom Left) */}
        <button
          onClick={() => setActiveNode('feelings')}
          className={`${btnClass('feelings')} bottom-0 left-0`}
        >
          <span>❤️</span>
          <span className="mt-1">Feelings</span>
        </button>

        {/* Apex node — Behaviors (Bottom Right) */}
        <button
          onClick={() => setActiveNode('behaviors')}
          className={`${btnClass('behaviors')} bottom-0 right-0`}
        >
          <span>🏃</span>
          <span className="mt-1">Behaviors</span>
        </button>
      </div>

      {/* Dynamic info panel */}
      <div className={`p-6 rounded-2xl border-2 w-full text-center transition-all duration-300 ${active.color}`}>
        <h4 className="text-xl font-black mb-2 tracking-tight">{active.title}</h4>
        <p className="text-base font-medium leading-relaxed">{active.desc}</p>
      </div>

    </div>
  );
}
