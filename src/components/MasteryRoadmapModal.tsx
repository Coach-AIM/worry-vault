"use client";

import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  points: number;
}

const STAGES = [
  { name: "Bedrock", min: 0, max: 74, desc: "Clearing the site and establishing baseline grounding.", icon: "🪨" },
  { name: "Stone Foundation", min: 75, max: 149, desc: "Anchoring thoughts firmly against emotional drift.", icon: "🧱" },
  { name: "Timber & Outer Walls", min: 150, max: 299, desc: "Erecting perimeter defenses to catch distortions.", icon: "🪵" },
  { name: "The Watchtower", min: 300, max: 499, desc: "Elevated perspective to spot avoidance loops early.", icon: "🗼" },
  { name: "Reinforced Gatehouse", min: 500, max: 749, desc: "Testing evidence before admitting thoughts.", icon: "🚪" },
  { name: "The Inner Keep", min: 750, max: 1099, desc: "Protecting core values with proven relief deltas.", icon: "🏰" },
  { name: "High Citadel", min: 1100, max: 1499, desc: "Weathering acute emotional storms intact.", icon: "⛰️" },
  { name: "Impenetrable Bastion", min: 1500, max: Infinity, desc: "Complete empirical flexibility and calm.", icon: "🛡️" },
];

type BadgeDef = { id: string; icon: string; name: string; hint: string; color: string };

const BADGES: BadgeDef[] = [
  { id: "first", icon: "📝", name: "First Thought Logged", hint: "Save your first thought record", color: "from-sky-400 to-blue-500" },
  { id: "loop", icon: "🔄", name: "Loop Closed", hint: "Close a reality-test loop", color: "from-emerald-400 to-green-600" },
  { id: "dread", icon: "🐉", name: "Dread Slayer", hint: "Actual relief beats prediction by +2", color: "from-rose-400 to-red-600" },
  { id: "relief", icon: "🌤️", name: "High Relief", hint: "Rate an action 8+/10", color: "from-amber-300 to-orange-500" },
  { id: "double", icon: "✌️", name: "Double Daily", hint: "Complete a 2/2 habit in a day", color: "from-teal-400 to-cyan-600" },
  { id: "anchor3", icon: "⚓", name: "3-Day Anchor", hint: "Act 3 days in a row", color: "from-indigo-400 to-indigo-600" },
  { id: "streak7", icon: "📅", name: "7-Day Consistency", hint: "Act 7 days in a row", color: "from-violet-400 to-purple-600" },
  { id: "traps", icon: "🔍", name: "Trap Decoder", hint: "Tag 5+ thinking traps", color: "from-fuchsia-400 to-pink-600" },
  { id: "shift", icon: "🔭", name: "Perspective Shift", hint: "Write 5+ reframes", color: "from-lime-400 to-green-500" },
  { id: "call", icon: "⚖️", name: "Clear Call", hint: "Use the Decision Assistant", color: "from-yellow-400 to-amber-600" },
  { id: "clarity", icon: "📋", name: "Clinical Clarity", hint: "Use the Therapy export", color: "from-slate-500 to-slate-700" },
  { id: "century", icon: "💯", name: "Century Club", hint: "Reach 100+ Fortitude Pts", color: "from-orange-400 to-red-500" },
];

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function longestStreak(dates: string[]): number {
  const uniq = Array.from(new Set(dates)).sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of uniq) {
    const [y, m, day] = d.split("-").map(Number);
    const t = Date.UTC(y, m - 1, day);
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    prev = t;
    best = Math.max(best, run);
  }
  return best;
}

function localKey(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MasteryRoadmapModal({ isOpen, onClose, points }: Props) {
  const [tab, setTab] = useState<"stages" | "badges">("stages");
  const [earned, setEarned] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const entries = readJSON<any[]>("momentum_journal_entries", []);
    const meta = readJSON<Record<string, any>>("momentum_task_meta", {});
    const reliefs = readJSON<Record<string, number>>("momentum_actual_reliefs", {});
    const daily = readJSON<Record<string, Record<string, { count: number }>>>("momentum_daily_completions", {});
    const moodLogs = readJSON<any[]>("momentum_habit_mood_logs", []);
    const decisions = readJSON<any[]>("momentum_decisions", []);
    let exported = false;
    try {
      exported = localStorage.getItem("momentum_therapy_export_used") === "true";
    } catch {}

    const closed = entries.filter((e) => Boolean(e.loopOutcome || e.loopAccuracy || e.predictionEvaluation || e.loopCompletedAt || e.loopClosedAt));
    let distCount = 0;
    entries.forEach((e) => {
      if (Array.isArray(e.cognitiveDistortions)) distCount += e.cognitiveDistortions.length;
      else if (typeof e.cognitiveDistortions === "string" && e.cognitiveDistortions.trim()) distCount += e.cognitiveDistortions.split(",").length;
      else if (e.distortionsJson) {
        try {
          const arr = JSON.parse(e.distortionsJson);
          if (Array.isArray(arr)) distCount += arr.length;
        } catch {}
      }
    });
    const reframes = entries.filter((e) => {
      const r = (e.reframedThought || e.reframe || "").toString().trim();
      return r && r !== "[Pending Reframe]";
    }).length;

    const dread = Object.keys(reliefs).some((id) => {
      const p = meta[id]?.predictedDifficulty;
      return typeof p === "number" && reliefs[id] - p >= 2;
    });
    const highRelief =
      Object.values(reliefs).some((r) => r >= 8) ||
      moodLogs.some((l) => l?.moodRating >= 8) ||
      entries.some((e) => e.reliefRating >= 8);
    const double = Object.values(daily).some((byDay) => Object.values(byDay).some((d) => d.count >= 2));

    const activeDays: string[] = [];
    Object.values(daily).forEach((byDay) =>
      Object.entries(byDay).forEach(([day, d]) => {
        if (d.count > 0) activeDays.push(day);
      })
    );
    moodLogs.forEach((l) => {
      if (l?.timestamp) {
        const k = localKey(l.timestamp);
        if (k) activeDays.push(k);
      }
    });
    const streak = longestStreak(activeDays);

    setEarned({
      first: entries.length >= 1,
      loop: closed.length >= 1,
      dread,
      relief: highRelief,
      double,
      anchor3: streak >= 3,
      streak7: streak >= 7,
      traps: distCount >= 5,
      shift: reframes >= 5,
      call: decisions.length >= 1,
      clarity: exported,
      century: points >= 100,
    });
  }, [isOpen, points]);

  if (!isOpen) return null;

  const stageIdx = STAGES.findIndex((s) => points >= s.min && points <= s.max);
  const idx = stageIdx === -1 ? STAGES.length - 1 : stageIdx;
  const current = STAGES[idx];
  const next = STAGES[idx + 1];
  const toNext = next ? next.min - points : 0;
  const pct = next ? Math.round(((points - current.min) / (next.min - current.min)) * 100) : 100;
  const earnedCount = BADGES.filter((b) => earned[b.id]).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mastery Roadmap"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <h3 className="text-lg font-extrabold text-slate-900">🏰 Mastery Roadmap</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-2">
          {([
            ["stages", "The 8 Fortification Stages"],
            ["badges", `Achievement Badges (${earnedCount}/12)`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-all ${
                tab === id ? "bg-slate-900 text-white font-bold ring-2 ring-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "stages" ? (
          <div className="p-6 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900 text-white">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>
                  {current.icon} Stage {idx + 1}: {current.name}
                </span>
                <span>{points} Fortitude Pts</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 mt-3 overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
              </div>
              <p className="text-xs text-slate-300 mt-2">
                {next ? `${toNext} pts to ${next.name}` : "Final stage reached — Impenetrable Bastion."}
              </p>
            </div>
            {STAGES.map((s, i) => {
              const isCurrent = i === idx;
              const done = i < idx;
              return (
                <div
                  key={s.name}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30"
                      : done
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-200 bg-white opacity-70"
                  }`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">
                        {i + 1}. {s.name}
                      </span>
                      <span className="text-[11px] font-black text-slate-500">
                        {s.max === Infinity ? "1,500+ pts" : `${s.min.toLocaleString()}–${s.max.toLocaleString()} pts`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
                    {isCurrent && <span className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">● You are here</span>}
                    {done && <span className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">✓ Completed</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3">
              {BADGES.map((b) => {
                const on = earned[b.id];
                return (
                  <div
                    key={b.id}
                    title={b.hint}
                    className={`aspect-square sm:aspect-auto sm:min-h-[130px] p-2 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 ${
                      on ? "border-slate-200 bg-white shadow-sm" : "border-dashed border-slate-300 bg-slate-50"
                    }`}
                  >
                    <span
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        on ? `bg-gradient-to-br ${b.color} shadow-md` : "bg-white border border-slate-300 grayscale opacity-40"
                      }`}
                    >
                      {b.icon}
                    </span>
                    <span className={`text-[11px] sm:text-xs font-extrabold leading-tight ${on ? "text-slate-900" : "text-slate-400"}`}>{b.name}</span>
                    <span className="text-[10px] text-slate-500 leading-tight hidden sm:block">{on ? "✓ Earned" : b.hint}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
