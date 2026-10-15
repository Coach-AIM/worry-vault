'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getValenceDetails } from '@/utils/valence';

// ============================================================
// TYPES
// ============================================================
type Preset = '7d' | '30d' | '6m' | 'custom';

interface TimelinePoint {
  day: string;
  mood: number;
  status: string;
  iso?: string;       // YYYY-MM-DD local date of this point
  monthly?: boolean;  // true when the point represents a whole month (6-month view)
}

interface TrapSlice {
  name: string;
  count: number;
  pct: number;
  color: string;
}

// ── Correlation marker types ──────────────────────────────────
interface ActionMarker {
  type: 'action';
  title: string;
  moodRating?: number;         // 0–10 rating from focus actions
  actualRelief?: number;       // 0–10 from momentum_actual_reliefs
  predictedDifficulty?: number;// from momentum_task_meta
  completedAt: string;         // ISO timestamp
}

interface JournalMarker {
  type: 'journal';
  situation: string;
  reframe: string;             // reframedThought
  createdAt: string;           // ISO timestamp
  loopAccuracy?: string;       // 'Completely False' | 'Partially True' | 'Exactly as Feared'
  outcomeText?: string;        // actual outcome from Close the Loop
  loopClosedAt?: string;       // ISO timestamp of reality check
}

type CorrelationMarker = ActionMarker | JournalMarker;

// ============================================================
// PERIOD-AWARE TRAP DATA
// ============================================================

const TRAP_DATA_BY_PRESET: Record<Exclude<Preset, 'custom'>, TrapSlice[]> = {
  '7d': [
    { name: 'Should Statements', count: 6,  pct: 38, color: '#2563eb' },
    { name: 'All-or-Nothing',    count: 4,  pct: 25, color: '#f59e0b' },
    { name: 'Catastrophizing',   count: 3,  pct: 19, color: '#f43f5e' },
    { name: 'Other Traps',       count: 3,  pct: 18, color: '#64748b' },
  ],
  '30d': [
    { name: 'Should Statements', count: 22, pct: 41, color: '#2563eb' },
    { name: 'Catastrophizing',   count: 14, pct: 26, color: '#f43f5e' },
    { name: 'All-or-Nothing',    count: 11, pct: 20, color: '#f59e0b' },
    { name: 'Other Traps',       count: 7,  pct: 13, color: '#64748b' },
  ],
  '6m': [
    { name: 'Should Statements', count: 105, pct: 38, color: '#2563eb' },
    { name: 'All-or-Nothing',    count: 78,  pct: 28, color: '#f59e0b' },
    { name: 'Catastrophizing',   count: 56,  pct: 20, color: '#f43f5e' },
    { name: 'Other Traps',       count: 41,  pct: 14, color: '#64748b' },
  ],
};

interface PeriodStats {
  records:  number;
  total:    number;
  topLabel: string;
}

const STATS_BY_PRESET: Record<Exclude<Preset, 'custom'>, PeriodStats> = {
  '7d':  { records: 9,   total: 16,  topLabel: 'SHOULDS' },
  '30d': { records: 32,  total: 54,  topLabel: 'SHOULDS' },
  '6m':  { records: 165, total: 280, topLabel: 'SHOULDS' },
};

function generateCustomTraps(startStr: string, endStr: string): TrapSlice[] {
  const start = new Date(startStr);
  const end   = new Date(endStr);
  const days  = isNaN(start.getTime()) || isNaN(end.getTime())
    ? 7
    : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const scale = days / 7;
  return TRAP_DATA_BY_PRESET['7d'].map((s) => ({
    ...s,
    count: Math.max(1, Math.round(s.count * scale)),
  }));
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: '7d',     label: '7 Days'          },
  { key: '30d',    label: '30 Days'         },
  { key: '6m',     label: '6 Months'        },
  { key: 'custom', label: '\u{1F4C5} Custom Range' },
];

// ============================================================
// DATE UTILITIES
// ============================================================
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function fmtMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function moodForDate(date: Date): number {
  const seed = date.getDate() + date.getMonth() * 31 + date.getFullYear() * 12;
  return Math.round(40 + ((Math.sin(seed * 2.3 + 1.7) + 1) / 2) * 55);
}

// ── Window boundaries for a given preset + offset ────────────
function getWindowBounds(
  preset: Preset,
  offset: number,
  customStart: string,
  customEnd: string,
  today: Date,
): { start: Date; end: Date } {
  if (preset === 'custom') {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    return { start: isNaN(s.getTime()) ? today : s, end: isNaN(e.getTime()) ? today : e };
  }
  if (preset === '7d') {
    const end = addDays(today, offset * 7);
    return { start: addDays(end, -6), end };
  }
  if (preset === '30d') {
    const end = addDays(today, offset * 30);
    return { start: addDays(end, -29), end };
  }
  // 6m
  const end = addMonths(today, offset * 6);
  return { start: addMonths(end, -5), end };
}

// ── Normalised position (0–1) of a date within [start, end] ──
function positionInWindow(ts: string, start: Date, end: Date): number | null {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return null;
  const pos = (d.getTime() - start.getTime()) / total;
  if (pos < 0 || pos > 1) return null;
  return pos;
}

// ============================================================
// DATASET GENERATORS
// ============================================================

function generate7d(today: Date, offset: number): TimelinePoint[] {
  const start = addDays(today, offset * 7 - 6);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const mood = moodForDate(d);
    return { day: fmtWeekday(d), mood, status: getValenceDetails(mood).label, iso: toInputValue(d) };
  });
}

// Real day-by-day points across the whole 30-day window (no weekly averaging)
function generate30d(today: Date, offset: number): TimelinePoint[] {
  const start = addDays(today, offset * 30 - 29);
  return Array.from({ length: 30 }, (_, i) => {
    const d = addDays(start, i);
    const mood = moodForDate(d);
    return { day: fmtShort(d), mood, status: getValenceDetails(mood).label, iso: toInputValue(d) };
  });
}

function generate6m(today: Date, offset: number): TimelinePoint[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = addMonths(today, -(5 - i) + offset * 6);
    const mood = moodForDate(d);
    return { day: fmtMonth(d), mood, status: getValenceDetails(mood).label, iso: toInputValue(d), monthly: true };
  });
}

function generateCustom(startStr: string, endStr: string): TimelinePoint[] {
  const start = new Date(startStr);
  const end   = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return [];

  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const steps    = Math.min(diffDays + 1, 10);
  const interval = diffDays / Math.max(steps - 1, 1);

  return Array.from({ length: steps }, (_, i) => {
    const d    = addDays(start, Math.round(i * interval));
    const mood = moodForDate(d);
    return { day: fmtShort(d), mood, status: getValenceDetails(mood).label, iso: toInputValue(d) };
  });
}

// ============================================================
// RANGE LABEL
// ============================================================
function buildRangeLabel(
  preset: Preset,
  offset: number,
  customStart: string,
  customEnd: string,
  today: Date,
): string {
  if (preset === 'custom') {
    if (!customStart || !customEnd) return 'Custom Range';
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Custom Range';
    return `${fmtShort(s)} – ${fmtShort(e)}, ${e.getFullYear()}`;
  }
  if (preset === '7d') {
    const end   = addDays(today, offset * 7);
    const start = addDays(end, -6);
    return `${fmtShort(start)} – ${fmtShort(end)}, ${end.getFullYear()}`;
  }
  if (preset === '30d') {
    const end   = addDays(today, offset * 30);
    const start = addDays(end, -29);
    return `${fmtShort(start)} – ${fmtShort(end)}, ${end.getFullYear()}`;
  }
  const end   = addMonths(today, offset * 6);
  const start = addMonths(end, -5);
  return `${fmtMonth(start)} – ${fmtMonth(end)}, ${end.getFullYear()}`;
}

// ============================================================
// CUSTOM TOOLTIP
// ============================================================
interface TooltipPayloadItem {
  value: number;
  payload: TimelinePoint;
}
interface CustomTooltipProps {
  active?:  boolean;
  payload?: TooltipPayloadItem[];
  label?:   string;
}

function MoodTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const { mood } = payload[0].payload;
  const valence  = getValenceDetails(mood);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-left min-w-[150px]">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-black leading-none ${valence.color}`}>{mood}%</p>
      <span
        className={`inline-block mt-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${valence.badge} ${valence.color}`}
      >
        {valence.label}
      </span>
    </div>
  );
}

function valenceHex(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >  50) return '#0ea5e9';
  if (score === 50) return '#94a3b8';
  if (score >= 25) return '#f59e0b';
  return '#f43f5e';
}

// ============================================================
// SAFE LOCALSTORAGE HELPER
// ============================================================
function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

// ============================================================
// CORRELATION MARKER TOOLTIP
// ============================================================
interface MarkerTooltipState {
  marker: CorrelationMarker;
  x: number;   // left % within the strip
}

function MarkerTooltipPopover({ state }: { state: MarkerTooltipState }) {
  const { marker, x } = state;
  const isAction = marker.type === 'action';

  // Clamp so tooltip stays within bounds
  const clampedX = Math.min(Math.max(x, 8), 88);

  if (isAction) {
    const relief = marker.actualRelief ?? marker.moodRating;
    const delta = (marker.actualRelief !== undefined && marker.predictedDifficulty !== undefined)
      ? marker.actualRelief - marker.predictedDifficulty
      : null;
    return (
      <div
        className="absolute bottom-full mb-2 z-20 bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-2.5 text-left w-56 pointer-events-none"
        style={{ left: `${clampedX}%`, transform: 'translateX(-50%)' }}
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">
          ✅ Action Completed
        </p>
        <p className="text-sm font-bold text-slate-900 leading-snug">{marker.title}</p>
        {relief !== undefined && (
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {marker.predictedDifficulty !== undefined
              ? <>Predicted: <strong>{marker.predictedDifficulty}/10</strong> → Relief: <strong className="text-emerald-700">{relief}/10</strong></>
              : <>Relief: <strong className="text-emerald-700">{relief}/10</strong></>
            }
          </p>
        )}
        {delta !== null && delta >= 0 && (
          <p className="text-[10px] font-black text-emerald-600 mt-0.5">🎉 Overcame Dread (+{delta})</p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">
          {new Date(marker.completedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })}
        </p>
      </div>
    );
  }

  // Journal marker
  const dateStr = (marker.loopClosedAt ?? marker.createdAt);
  const outcomeSnippet = marker.outcomeText
    ? `"${marker.outcomeText.slice(0, 70)}${marker.outcomeText.length > 70 ? '…' : ''}"`
    : null;
  return (
    <div
      className="absolute bottom-full mb-2 z-20 bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-2.5 text-left w-56 pointer-events-none"
      style={{ left: `${clampedX}%`, transform: 'translateX(-50%)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-0.5">
        🧠 Reality Check
      </p>
      <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">{marker.situation}</p>
      {outcomeSnippet ? (
        <p className="text-xs text-slate-500 mt-1 leading-snug italic line-clamp-2">{outcomeSnippet}</p>
      ) : (
        <p className="text-xs text-slate-500 mt-1 leading-snug italic line-clamp-2">"{marker.reframe}"</p>
      )}
      {marker.loopAccuracy && (
        <p className="text-[10px] font-bold text-purple-700 mt-0.5">Accuracy: {marker.loopAccuracy}</p>
      )}
      <p className="text-[10px] text-slate-400 mt-1">
        {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}

// ============================================================
// CORRELATION TIMELINE STRIP
// ============================================================
interface CorrelationStripProps {
  markers: CorrelationMarker[];
  windowStart: Date;
  windowEnd: Date;
}

function CorrelationStrip({ markers, windowStart, windowEnd }: CorrelationStripProps) {
  const [hovered, setHovered] = useState<MarkerTooltipState | null>(null);

  if (markers.length === 0) return null;

  // Bucket markers by calendar date — same date → same cluster
  const buckets = new Map<string, { markers: CorrelationMarker[]; pos: number }>();
  for (const marker of markers) {
    const ts = marker.type === 'action' ? marker.completedAt : (marker.loopClosedAt ?? marker.createdAt);
    const pos = positionInWindow(ts, windowStart, windowEnd);
    if (pos === null) continue;
    const dateKey = ts.slice(0, 10); // YYYY-MM-DD
    if (!buckets.has(dateKey)) {
      buckets.set(dateKey, { markers: [], pos });
    }
    buckets.get(dateKey)!.markers.push(marker);
  }

  const clusters = Array.from(buckets.values());

  return (
    <div className="relative mt-2 h-9 w-full" aria-label="Behavioral correlation markers">
      {clusters.map(({ markers: clusterMarkers, pos }, ci) => {
        const leftPct = pos * 100;
        const actionCount  = clusterMarkers.filter((m) => m.type === 'action').length;
        const journalCount = clusterMarkers.filter((m) => m.type === 'journal').length;
        // Use the first marker for the tooltip (single), or pick first on hover
        const primaryMarker = clusterMarkers[0];
        const isMulti = clusterMarkers.length > 1;
        const isSingleAction  = !isMulti && actionCount === 1;

        return (
          <div
            key={ci}
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-pointer group"
            style={{ left: `${leftPct}%` }}
            onMouseEnter={() => setHovered({ marker: primaryMarker, x: leftPct })}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Stem */}
            <div
              className="w-px h-2"
              style={{ backgroundColor: actionCount > 0 ? '#10b981' : '#a855f7' }}
            />
            {/* Badge — SVG shapes: green circle = action, purple diamond = closed loop */}
            {isMulti ? (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-sm text-[10px] font-bold leading-none transition-transform group-hover:scale-110 whitespace-nowrap">
                {actionCount > 0 && (
                  <span className="flex items-center gap-0.5 text-emerald-600">
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                      <title>{clusterMarkers.filter((m) => m.type === 'action').map((m) => (m as ActionMarker).title).join(', ')}</title>
                      <circle cx="5" cy="5" r="4.5" fill="#10b981" />
                    </svg>
                    {actionCount}
                  </span>
                )}
                {journalCount > 0 && (
                  <span className="flex items-center gap-0.5 text-purple-600">
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                      <title>{clusterMarkers.filter((m) => m.type === 'journal').map((m) => `Reality check: ${(m as JournalMarker).situation}`).join(', ')}</title>
                      <polygon points="5,0 10,5 5,10 0,5" fill="#a855f7" />
                    </svg>
                    {journalCount}
                  </span>
                )}
              </div>
            ) : isSingleAction ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                className="transition-transform group-hover:scale-125 drop-shadow-sm"
                role="img"
              >
                <title>{`${(primaryMarker as ActionMarker).title} — completed`}</title>
                <circle cx="7" cy="7" r="5.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                className="transition-transform group-hover:scale-125 drop-shadow-sm"
                role="img"
              >
                <title>{`Reality check: ${(primaryMarker as JournalMarker).outcomeText || (primaryMarker as JournalMarker).situation}`}</title>
                <polygon points="7,0.5 13.5,7 7,13.5 0.5,7" fill="#a855f7" stroke="#ffffff" strokeWidth="1.5" />
              </svg>
            )}
          </div>
        );
      })}

      {/* Tooltip popover */}
      {hovered && <MarkerTooltipPopover state={hovered} />}
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================
export default function WellnessGraphs() {
  const today = useMemo(() => new Date(), []);

  const [preset,      setPreset]      = useState<Preset>('7d');
  const [offset,      setOffset]      = useState<number>(0);
  const [customStart, setCustomStart] = useState<string>(() => toInputValue(addDays(today, -14)));
  const [customEnd,   setCustomEnd]   = useState<string>(() => toInputValue(today));
  const [activeTrapIndex, setActiveTrapIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // ── Correlation data from localStorage & API ─────────────────
  const [actionMarkers,  setActionMarkers]  = useState<ActionMarker[]>([]);
  const [journalMarkers, setJournalMarkers] = useState<JournalMarker[]>([]);

  useEffect(() => {
    setMounted(true);

    // ── 1) ACTION MARKERS ────────────────────────────────────────
    const focusActions   = safeReadJson<any[]>('momentum_today_focus_actions', []);
    const moodLogs       = safeReadJson<any[]>('momentum_habit_mood_logs', []);
    const actualReliefs  = safeReadJson<Record<string, number>>('momentum_actual_reliefs', {});
    const taskMeta       = safeReadJson<Record<string, { predictedDifficulty?: number; actionType?: string }>>('momentum_task_meta', {});

    // moodRating lookup by actionId
    const logsByActionId: Record<string, number | undefined> = {};
    for (const log of moodLogs) {
      if (log.actionId != null && log.moodRating != null) {
        logsByActionId[String(log.actionId)] = log.moodRating;
      }
    }

    const actionMks: ActionMarker[] = [];

    // From focus actions (have completedAt + optional moodRating)
    for (const a of focusActions) {
      if (a.completed && a.completedAt) {
        actionMks.push({
          type: 'action',
          title: a.title || 'Habit',
          moodRating: a.moodRating,
          completedAt: a.completedAt,
        });
      }
    }

    // From full momentum_actions cache — enrich with actualRelief + predictedDifficulty
    const allActions = safeReadJson<any[]>('momentum_actions', []);
    for (const t of allActions) {
      const doneAt = t.completedAt || t.dueDate;
      if ((t.isCompleted === true || !!t.completed) && doneAt) {
        const idStr = String(t.id);
        const relief = actualReliefs[idStr];
        const meta   = taskMeta[idStr];
        actionMks.push({
          type: 'action',
          title: t.title || 'Action',
          moodRating: undefined,
          actualRelief: relief,
          predictedDifficulty: meta?.predictedDifficulty,
          completedAt: doneAt,
        });
      }
    }

    // De-duplicate by date + title
    const seen = new Set<string>();
    const deduped = actionMks.filter((m) => {
      const key = `${m.title}|${m.completedAt.slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setActionMarkers(deduped);

    // ── 2) JOURNAL MARKERS ───────────────────────────────────────
    // Primary source: localStorage momentum_journal_entries (includes closed loops)
    const localEntries = safeReadJson<any[]>('momentum_journal_entries', []);
    const isClosed = (e: any) =>
      e && (e.isClosedLoop === true || !!e.actualOutcome || !!e.outcomeText || !!e.loopClosedAt);
    const toJournalMarker = (e: any): JournalMarker => ({
      type: 'journal' as const,
      situation: e.situation || 'Thought record',
      reframe: e.reframedThought || '',
      createdAt: e.createdAt,
      loopAccuracy: e.loopAccuracy ?? e.predictionAccuracy ?? undefined,
      outcomeText: e.outcomeText ?? e.actualOutcome ?? undefined,
      loopClosedAt: e.loopClosedAt ?? e.outcomeDate ?? e.createdAt,
    });

    const localJmks: JournalMarker[] = localEntries
      .filter((e: any) => e && e.createdAt && isClosed(e))
      .map(toJournalMarker);

    // Secondary: API fetch — merge, no duplicates
    if (typeof fetch === 'function') {
      Promise.resolve(fetch('/api/journal'))
        .then((res) => (res && 'json' in res ? res.json() : { entries: [] }))
        .then((data) => {
          if (!data || !Array.isArray(data.entries)) {
            setJournalMarkers(localJmks);
            return;
          }
          const apiIds = new Set(localEntries.map((e: any) => e.id));
          const apiJmks: JournalMarker[] = data.entries
            .filter((e: any) => e && e.createdAt && !apiIds.has(e.id) && isClosed(e))
            .map(toJournalMarker);
          setJournalMarkers([...localJmks, ...apiJmks]);
        })
        .catch(() => { setJournalMarkers(localJmks); });
    } else {
      setJournalMarkers(localJmks);
    }
  }, []);

  // ── Derived state ─────────────────────────────────────────────
  function handlePresetChange(p: Preset) {
    setPreset(p);
    setOffset(0);
  }

  const chartData = useMemo<TimelinePoint[]>(() => {
    if (preset === '7d')     return generate7d(today, offset);
    if (preset === '30d')    return generate30d(today, offset);
    if (preset === '6m')     return generate6m(today, offset);
    return generateCustom(customStart, customEnd);
  }, [preset, offset, customStart, customEnd, today]);

  const trapData = useMemo<TrapSlice[]>(() => {
    if (preset === 'custom') return generateCustomTraps(customStart, customEnd);
    return TRAP_DATA_BY_PRESET[preset];
  }, [preset, customStart, customEnd]);

  const periodStats = useMemo<PeriodStats>(() => {
    if (preset === 'custom') {
      const total = generateCustomTraps(customStart, customEnd).reduce(
        (sum, s) => sum + s.count, 0,
      );
      return { records: Math.round(total * 0.56), total, topLabel: 'SHOULDS' };
    }
    return STATS_BY_PRESET[preset];
  }, [preset, customStart, customEnd]);

  // ── Window date bounds for marker filtering ───────────────────
  const { start: windowStart, end: windowEnd } = useMemo(
    () => getWindowBounds(preset, offset, customStart, customEnd, today),
    [preset, offset, customStart, customEnd, today],
  );

  // Filter markers to only those within the active window
  const visibleMarkers = useMemo<CorrelationMarker[]>(() => {
    const combined: CorrelationMarker[] = [
      ...actionMarkers,
      ...journalMarkers,
    ];
    return combined.filter((m) => {
      const ts = m.type === 'action' ? m.completedAt : m.createdAt;
      return positionInWindow(ts, windowStart, windowEnd) !== null;
    });
  }, [actionMarkers, journalMarkers, windowStart, windowEnd]);

  const activeTrap   = activeTrapIndex !== null ? trapData[activeTrapIndex] : null;
  const rangeLabel   = buildRangeLabel(preset, offset, customStart, customEnd, today);
  const canGoFwd     = offset < 0;
  const hasMarkers   = visibleMarkers.length > 0;

  // Match completed actions / closed loops to chart X positions
  const pins = useMemo(() => {
    type Pin = { key: string; x: string; y: number; kind: 'action' | 'loop'; title: string };
    const out: Pin[] = [];
    const snip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);
    for (const p of chartData) {
      if (!p.iso) continue;
      const len = p.monthly ? 7 : 10;
      const pKey = p.iso.slice(0, len);
      const keyOf = (ts: string) => {
        const d = new Date(ts);
        return isNaN(d.getTime()) ? '' : toInputValue(d).slice(0, len);
      };

      const acts = actionMarkers.filter((m) => keyOf(m.completedAt) === pKey);
      if (acts.length > 0) {
        out.push({
          key: `a-${p.iso}`,
          x: p.day,
          y: 6,
          kind: 'action',
          title: acts
            .map((m) => {
              const relief = m.actualRelief ?? m.moodRating;
              return `${m.title} • Relief: ${relief !== undefined ? relief : 'N/A'}/10`;
            })
            .join('\n'),
        });
      }

      const loops = journalMarkers.filter((m) => keyOf(m.loopClosedAt ?? m.createdAt) === pKey);
      if (loops.length > 0) {
        out.push({
          key: `l-${p.iso}`,
          x: p.day,
          y: 16,
          kind: 'loop',
          title: loops
            .map(
              (m) =>
                `Reality Checked: ${snip(m.outcomeText || m.situation, 70)} • ${m.loopAccuracy ?? 'Accuracy: N/A'}`,
            )
            .join('\n'),
        });
      }
    }
    return out;
  }, [chartData, actionMarkers, journalMarkers]);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">

      {/* ════════════════════════════════════════
          CARD 1 — Header + Area Chart
          ════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">

        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1 text-center">
          📊 Wellness Trends &amp; Analytics
        </h3>
        <p className="text-base sm:text-lg text-slate-600 text-center font-medium mb-6">
          A real-time breakdown of your logged thought records and identified thinking traps.
        </p>

        {/* ── Summary stat counters ── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
            <span className="block text-4xl sm:text-5xl font-black text-slate-900 mb-1 transition-all duration-300">
              {periodStats.records}
            </span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-500">
              Thought Records Logged
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
            <span className="block text-4xl sm:text-5xl font-black text-emerald-700 mb-1 transition-all duration-300">
              {periodStats.total}
            </span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-500">
              Distortions Challenged
            </span>
          </div>
        </div>

        {/* ── Preset pill bar ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(({ key, label: lbl }) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                preset === key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* ── Custom date inputs ── */}
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              From
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              To
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={toInputValue(today)}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </label>
          </div>
        )}

        {/* ── Time navigation stepper ── */}
        {preset !== 'custom' && (
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setOffset((o) => o - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg leading-none transition-colors select-none"
              aria-label="Previous period"
            >
              ‹
            </button>

            <span className="text-xs font-black uppercase tracking-widest text-slate-500 text-center px-3">
              {rangeLabel}
            </span>

            <button
              onClick={() => setOffset((o) => o + 1)}
              disabled={!canGoFwd}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-lg font-black leading-none transition-colors select-none ${
                canGoFwd
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-slate-50 text-slate-300 cursor-not-allowed'
              }`}
              aria-label="Next period"
            >
              ›
            </button>
          </div>
        )}

        {/* ── Chart label + live trajectory badge ── */}
        {(() => {
          const latest  = chartData[chartData.length - 1];
          const valence = latest ? getValenceDetails(latest.mood) : null;
          return (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                Mood Stability Trend
              </span>
              {valence && (
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${valence.badge} ${valence.color}`}
                >
                  {valence.label}
                </span>
              )}
            </div>
          );
        })()}

        {/* ── Recharts Area Chart ── */}
        <div className="h-64 sm:h-72 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 8,
                right: 8,
                left: -24,
                bottom: chartData.length > 7 ? 16 : 0,
              }}
            >
              <defs>
                <linearGradient id="valenceStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#10b981" stopOpacity={1} />
                  <stop offset="25%"  stopColor="#10b981" stopOpacity={1} />
                  <stop offset="50%"  stopColor="#0ea5e9" stopOpacity={1} />
                  <stop offset="75%"  stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={1} />
                </linearGradient>

                <linearGradient id="valenceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="50%"  stopColor="#0ea5e9" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.20} />
                </linearGradient>
              </defs>

              <ReferenceArea y1={0} y2={50} fill="#fff1f2" fillOpacity={0.4} />
              <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
              <ReferenceLine
                y={50}
                stroke="#cbd5e1"
                strokeDasharray="4 4"
                label={{
                  value: 'Baseline (50)',
                  fill: '#94a3b8',
                  fontSize: 11,
                  position: 'insideBottomLeft',
                }}
              />

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                interval={0}
                height={chartData.length > 7 ? 44 : 30}
                tick={({
                  x,
                  y,
                  payload,
                  index,
                }: {
                  x: string | number;
                  y: string | number;
                  payload: { value: string };
                  index?: number;
                }) => {
                  const total = chartData.length;
                  const isManyPoints = total > 7;
                  const step = isManyPoints ? Math.ceil(total / 6) : 1;
                  const shouldShow =
                    !isManyPoints ||
                    index === 0 ||
                    index === total - 1 ||
                    (index != null && index % step === 0);

                  if (!shouldShow) return <g />;

                  return (
                    <g transform={`translate(${x},${Number(y) + (isManyPoints ? 8 : 10)})`}>
                      <text
                        x={0}
                        y={0}
                        dy={0}
                        textAnchor={isManyPoints ? 'end' : 'middle'}
                        transform={isManyPoints ? 'rotate(-35)' : undefined}
                        fontSize={11}
                        fontWeight={600}
                        fill="#64748b"
                        className="font-sans text-[11px] text-slate-500"
                        style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />

              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={<MoodTooltip />}
                cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
              />

              <Area
                type="linear"
                dataKey="mood"
                stroke="url(#valenceStroke)"
                strokeWidth={4}
                fill="url(#valenceFill)"
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload: TimelinePoint;
                }) => {
                  if (props.cx == null || props.cy == null) return <g />;
                  const hex = valenceHex(props.payload.mood);
                  return (
                    <circle
                      key={`dot-${props.cx}-${props.cy}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={chartData.length > 14 ? 3 : 5}
                      fill="#ffffff"
                      stroke={hex}
                      strokeWidth={3}
                    />
                  );
                }}
                activeDot={(props: {
                  cx?: number;
                  cy?: number;
                  payload: TimelinePoint;
                }) => {
                  if (props.cx == null || props.cy == null) return <g />;
                  const hex = valenceHex(props.payload.mood);
                  return (
                    <circle
                      key={`adot-${props.cx}-${props.cy}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={7}
                      fill={hex}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}
              />

              {pins.map((pin) => (
                <ReferenceDot
                  key={pin.key}
                  x={pin.x}
                  y={pin.y}
                  ifOverflow="visible"
                  shape={(p: { cx?: number; cy?: number }) => {
                    if (p.cx == null || p.cy == null) return <g />;
                    return pin.kind === 'action' ? (
                      <g style={{ cursor: 'pointer' }}>
                        <title>{pin.title}</title>
                        <circle cx={p.cx} cy={p.cy} r={6} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
                      </g>
                    ) : (
                      <g style={{ cursor: 'pointer' }}>
                        <title>{pin.title}</title>
                        <polygon
                          points={`${p.cx},${p.cy - 8} ${p.cx + 8},${p.cy} ${p.cx},${p.cy + 8} ${p.cx - 8},${p.cy}`}
                          fill="#a855f7"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      </g>
                    );
                  }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-400">
              Loading wellness trends...
            </div>
          )}
        </div>

        {/* Action & reality-check pins are rendered directly on the chart above */}

        {/* ── Legend: Valence bands + Correlation marker types ── */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-4 pt-3 border-t border-slate-100/80">
          {/* Valence bands */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span>75–100% Grounded</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm" />
            <span>50–74% Stable</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
            <span>25–49% Tension</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
            <span>0–24% Distress</span>
          </div>

          {/* Correlation marker legend — only shown if any markers exist in session */}
          {(actionMarkers.length > 0 || journalMarkers.length > 0) && (
            <>
              <div className="w-full border-t border-slate-100/80 my-0.5" />
              {actionMarkers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  <span>🟢 Completed Action</span>
                </div>
              )}
              {journalMarkers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />
                  <span>🟣 Tested Reality / Closed Loop</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Behavioral Activation Insight Pill ── */}
        {mounted && (() => {
          const windowActions  = visibleMarkers.filter((m) => m.type === 'action') as ActionMarker[];
          const windowJournal  = visibleMarkers.filter((m) => m.type === 'journal') as JournalMarker[];
          const closedLoops    = windowJournal.filter((m) => m.loopClosedAt || m.loopAccuracy);
          const reliefValues   = windowActions
            .map((m) => m.actualRelief ?? m.moodRating)
            .filter((v): v is number => v !== undefined);
          const avgRelief = reliefValues.length > 0
            ? (reliefValues.reduce((a, b) => a + b, 0) / reliefValues.length).toFixed(1)
            : null;

          if (windowActions.length === 0 && closedLoops.length === 0) return null;
          return (
            <div className="mt-3 flex items-center justify-center">
              <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-[11px] font-semibold text-slate-600">
                <span>⚡ Behavioral Activation</span>
                <span className="text-slate-300">·</span>
                <span>Actions Logged: <strong className="text-emerald-700">{windowActions.length}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Reality Loops Closed: <strong className="text-purple-700">{closedLoops.length}</strong></span>
                {avgRelief !== null && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>Avg Relief on Active Days: <strong className="text-slate-800">{avgRelief}/10</strong></span>
                  </>
                )}
              </div>
            </div>
          );
        })()}

      </div>

      {/* ════════════════════════════════════════
          CARD 2 — Interactive Donut Chart
          ════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">
          Thinking Trap Distribution
        </h4>
        <p className="text-sm text-slate-500 font-medium mb-6">
          Hover any slice or legend row to inspect your pattern.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">

          {/* Donut + HTML center label overlay */}
          <div className="relative w-52 h-52 shrink-0">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trapData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                  onMouseEnter={(_, index) => setActiveTrapIndex(index)}
                  onMouseLeave={()          => setActiveTrapIndex(null)}
                  stroke="none"
                  isAnimationActive
                >
                  {trapData.map((slice, index) => (
                    <Cell
                      key={`${slice.name}-${preset}`}
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
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-full border border-slate-100 text-xs font-semibold text-slate-400">
                Loading...
              </div>
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none mb-1 font-sans">
                {activeTrap ? activeTrap.name : 'Top Trap'}
              </span>
              <span
                className="font-sans font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider leading-tight transition-all duration-200"
                style={{ color: activeTrap ? activeTrap.color : '#0f172a' }}
              >
                {activeTrap ? `${activeTrap.pct}%` : periodStats.topLabel}
              </span>
            </div>
          </div>

          {/* Hover-synced legend */}
          <div className="w-full space-y-2.5">
            {trapData.map((row, index) => (
              <div
                key={`${row.name}-${preset}`}
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
                  <span className="text-xs font-black text-slate-400">{row.pct}%</span>
                  <span className="text-sm font-black text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200 shadow-sm">
                    {row.count}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
