"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export interface TrapDistributionItem {
  id: string;
  name: string;
  count: number;
  pct: number;
  color: string;
}

const DISTORTION_PALETTE: Record<string, { id: string; name: string; color: string }> = {
  'mind-reading': { id: 'mind-reading', name: 'Mind Reading', color: '#3b82f6' },
  'mind reading': { id: 'mind-reading', name: 'Mind Reading', color: '#3b82f6' },
  'catastrophizing': { id: 'catastrophizing', name: 'Catastrophizing', color: '#f43f5e' },
  'all-or-nothing': { id: 'all-or-nothing', name: 'All-or-Nothing Thinking', color: '#f59e0b' },
  'all-or-nothing thinking': { id: 'all-or-nothing', name: 'All-or-Nothing Thinking', color: '#f59e0b' },
  'should-statements': { id: 'should-statements', name: 'Should Statements', color: '#8b5cf6' },
  'should statements': { id: 'should-statements', name: 'Should Statements', color: '#8b5cf6' },
  'shoulds': { id: 'should-statements', name: 'Should Statements', color: '#8b5cf6' },
  'emotional-reasoning': { id: 'emotional-reasoning', name: 'Emotional Reasoning', color: '#ec4899' },
  'emotional reasoning': { id: 'emotional-reasoning', name: 'Emotional Reasoning', color: '#ec4899' },
  'overgeneralization': { id: 'overgeneralization', name: 'Overgeneralization', color: '#06b6d4' },
  'mental-filter': { id: 'mental-filter', name: 'Mental Filter', color: '#10b981' },
  'discounting-positive': { id: 'discounting-positive', name: 'Discounting Positive', color: '#14b8a6' },
  'discounting the positive': { id: 'discounting-positive', name: 'Discounting Positive', color: '#14b8a6' },
  'personalization': { id: 'personalization', name: 'Personalization', color: '#f97316' },
  'labeling': { id: 'labeling', name: 'Labeling', color: '#6366f1' },
};

const FALLBACK_COLORS = [
  '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#10b981', '#f97316',
];

export function calculateThinkingTraps(records: any[]): TrapDistributionItem[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const counts: Record<string, { name: string; color: string; count: number }> = {};
  let totalTraps = 0;

  for (const entry of records) {
    if (!entry) continue;
    const rawTraps: string[] = [];

    if (entry.distortionsJson) {
      try {
        const parsed = typeof entry.distortionsJson === 'string'
          ? JSON.parse(entry.distortionsJson)
          : entry.distortionsJson;
        if (Array.isArray(parsed)) rawTraps.push(...parsed);
        else if (parsed && typeof parsed === 'object') rawTraps.push(...Object.keys(parsed));
      } catch (_) {}
    }
    if (Array.isArray(entry.distortions)) rawTraps.push(...entry.distortions);
    if (Array.isArray(entry.selectedDistortions)) rawTraps.push(...entry.selectedDistortions);
    if (typeof entry.cognitiveDistortions === 'string') {
      rawTraps.push(...entry.cognitiveDistortions.split(',').map((s: string) => s.trim()));
    }

    for (const raw of rawTraps) {
      if (!raw || typeof raw !== 'string') continue;
      const key = raw.toLowerCase().trim();
      const meta = DISTORTION_PALETTE[key] || {
        id: key,
        name: raw.charAt(0).toUpperCase() + raw.slice(1),
        color: FALLBACK_COLORS[Object.keys(counts).length % FALLBACK_COLORS.length],
      };

      if (!counts[meta.name]) {
        counts[meta.name] = { name: meta.name, color: meta.color, count: 0 };
      }
      counts[meta.name].count += 1;
      totalTraps += 1;
    }
  }

  if (totalTraps === 0) return [];

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      id: item.name.toLowerCase().replace(/\s+/g, '-'),
      name: item.name,
      count: item.count,
      pct: Math.round((item.count / totalTraps) * 100),
      color: item.color,
    }));
}

interface ThinkingTrapChartProps {
  records?: any[];
  title?: string;
  subtitle?: string;
}

export default function ThinkingTrapChart({
  records = [],
  title = "Thinking Trap Distribution",
  subtitle = "Hover any slice or legend row to inspect your pattern.",
}: ThinkingTrapChartProps) {
  const [activeTrapIndex, setActiveTrapIndex] = useState<number | null>(null);

  const trapData = useMemo(() => calculateThinkingTraps(records), [records]);
  const activeTrap = activeTrapIndex !== null ? trapData[activeTrapIndex] : null;
  const topTrap = trapData[0] ?? null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
      <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">
        {title}
      </h4>
      <p className="text-sm text-slate-500 font-medium mb-6">
        {subtitle}
      </p>

      {trapData.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-center">
          <span className="text-3xl mb-2">💭</span>
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Log your first thought record to reveal your thinking trap distribution.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Once you tag cognitive distortions in your journal, your personalized pattern and percentages will appear here.
          </p>
          <Link
            href="/journal"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            Start CBT Journal →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut Chart with center label overlay */}
          <div className="relative w-52 h-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trapData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={trapData.length > 1 ? 4 : 0}
                  dataKey="count"
                  onMouseEnter={(_, index) => setActiveTrapIndex(index)}
                  onMouseLeave={() => setActiveTrapIndex(null)}
                  stroke="none"
                  isAnimationActive
                >
                  {trapData.map((slice, index) => (
                    <Cell
                      key={`trap-${slice.name}-${index}`}
                      fill={slice.color}
                      opacity={
                        activeTrapIndex === null || activeTrapIndex === index ? 1 : 0.35
                      }
                      style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none mb-1 font-sans">
                {activeTrap ? activeTrap.name : 'Top Trap'}
              </span>
              <span
                className="font-sans font-bold text-xs sm:text-sm uppercase tracking-wider leading-tight transition-all duration-200"
                style={{ color: activeTrap ? activeTrap.color : (topTrap?.color ?? '#0f172a') }}
              >
                {activeTrap ? `${activeTrap.pct}%` : (topTrap ? `${topTrap.name} (${topTrap.pct}%)` : 'ACTIVE')}
              </span>
            </div>
          </div>

          {/* Dynamic legend list with actual counts & percentages */}
          <div className="w-full space-y-2.5">
            {trapData.map((row, index) => (
              <div
                key={`legend-${row.name}-${index}`}
                onMouseEnter={() => setActiveTrapIndex(index)}
                onMouseLeave={() => setActiveTrapIndex(null)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 cursor-default ${
                  activeTrapIndex === index
                    ? 'border-slate-800 bg-slate-50 shadow-sm translate-x-1'
                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="text-sm sm:text-base font-bold text-slate-800">
                    {row.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500">{row.pct}%</span>
                  <span className="text-sm font-black text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200 shadow-sm">
                    {row.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
