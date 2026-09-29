"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRandomQuote, QuoteItem } from "@/utils/perspectiveQuotes";
import { awardPoints, POINT_VALUES, useResiliencePoints } from "@/lib/points";

interface FocusAction {
  id: string;
  title: string;
  completed: boolean;
  moodRating?: number;
  completedAt?: string;
}

interface MilestoneTier {
  id: string;
  name: string;
  pointsRequired: number;
  badge: string;
  description: string;
  clinicalInsight: string;
}

const MILESTONE_TIERS: MilestoneTier[] = [
  {
    id: "anchor",
    name: "Awareness Anchor",
    pointsRequired: 100,
    badge: "🌱",
    description: "Building initial mindfulness and establishing daily grounding habits.",
    clinicalInsight: "Consistently noticing your automatic states creates the cognitive gap needed to choose constructive responses instead of automatic reactions.",
  },
  {
    id: "challenger",
    name: "Cognitive Challenger",
    pointsRequired: 250,
    badge: "⚡",
    description: "Actively identifying thinking traps and reframing distorted beliefs.",
    clinicalInsight: "Empirical reality testing weakens catastrophic assumptions. Your nervous system learns through experience that discomfort does not equal danger.",
  },
  {
    id: "master",
    name: "Resilience Master",
    pointsRequired: 500,
    badge: "🏆",
    description: "Sustained behavioral momentum with verified closed-loop reality checks.",
    clinicalInsight: "By consistently closing loops between negative predictions and real outcomes, you rewire threat circuits and build deep, enduring psychological flexibility.",
  },
];

const DEFAULT_FOCUS_ACTIONS: FocusAction[] = [
  { id: "meditate", title: "Meditate", completed: false },
  { id: "read", title: "Read", completed: false },
  { id: "walk", title: "Walk", completed: false },
];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isEvening, setIsEvening] = useState(false);
  const [quote, setQuote] = useState<QuoteItem | null>(null);
  const [focusActions, setFocusActions] = useState<FocusAction[]>(DEFAULT_FOCUS_ACTIONS);
  const [activeRatingAction, setActiveRatingAction] = useState<FocusAction | null>(null);
  // ratingMode: 'initial' = first time after check-off, 're-edit' = user clicked badge to change rating
  const [ratingMode, setRatingMode] = useState<'initial' | 're-edit'>('initial');
  const [ratingSuccessToast, setRatingSuccessToast] = useState<string | null>(null);

  // Customization state
  const [isEditingHabits, setIsEditingHabits] = useState(false);
  const [newHabitInput, setNewHabitInput] = useState("");
  const [plannerTasks, setPlannerTasks] = useState<any[]>([]);

  // Resilience & Milestones State (SSR-safe)
  const { points: resiliencePoints } = useResiliencePoints();
  const [closedLoopsCount, setClosedLoopsCount] = useState(0);
  const [distortionsChallenged, setDistortionsChallenged] = useState(0);
  const [disprovedPredictionsPct, setDisprovedPredictionsPct] = useState(0);
  const [selectedMilestoneModal, setSelectedMilestoneModal] = useState<MilestoneTier | null>(null);

  useEffect(() => {
    setIsMounted(true);

    const hour = new Date().getHours();
    const evening = hour >= 17; // 5:00 PM Logic
    setIsEvening(evening);
    setQuote(getRandomQuote(evening));

    function loadFocus() {
      try {
        const saved = localStorage.getItem("momentum_today_focus_actions");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFocusActions(parsed);
            return;
          }
        }
        setFocusActions(DEFAULT_FOCUS_ACTIONS);
      } catch (_) {
        setFocusActions(DEFAULT_FOCUS_ACTIONS);
      }
    }

    function loadPlannerTasks() {
      try {
        const saved = localStorage.getItem("momentum_actions");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setPlannerTasks(parsed);
          }
        }
      } catch (_) {}
    }

    function loadResilienceStats() {
      try {
        const localEntriesRaw = localStorage.getItem("momentum_journal_entries");
        const localEntries: any[] = localEntriesRaw ? JSON.parse(localEntriesRaw) : [];
        const allEntries = [...localEntries];

        // Backup entries fallback if present
        const backupRaw = localStorage.getItem("momentum_backup_data");
        if (backupRaw) {
          try {
            const backup = JSON.parse(backupRaw);
            if (backup.journal && Array.isArray(backup.journal)) {
              backup.journal.forEach((be: any) => {
                if (!allEntries.some((e) => e.id === be.id)) {
                  allEntries.push(be);
                }
              });
            }
          } catch (_) {}
        }

        // Count closed loops
        const closed = allEntries.filter(
          (e) => Boolean(e.loopOutcome || e.loopAccuracy || e.predictionEvaluation || e.loopCompletedAt)
        );
        setClosedLoopsCount(closed.length);

        // Count cognitive distortions challenged
        let distCount = 0;
        allEntries.forEach((e) => {
          if (Array.isArray(e.cognitiveDistortions)) {
            distCount += e.cognitiveDistortions.length;
          } else if (typeof e.cognitiveDistortions === "string" && e.cognitiveDistortions.trim()) {
            distCount += e.cognitiveDistortions.split(",").length;
          } else if (e.distortion) {
            distCount += 1;
          }
        });
        if (distCount === 0 && allEntries.length > 0) {
          distCount = allEntries.length;
        }
        setDistortionsChallenged(distCount);

        // Percentage of negative predictions disproved
        if (closed.length > 0) {
          const disproved = closed.filter(
            (e) =>
              e.loopAccuracy === "Completely False / Disproved" ||
              e.predictionEvaluation === "Much better than expected" ||
              e.predictionEvaluation === "Better than expected"
          );
          const pct = Math.round((disproved.length / closed.length) * 100);
          setDisprovedPredictionsPct(pct);
        } else {
          setDisprovedPredictionsPct(0);
        }
      } catch (_) {}
    }

    loadFocus();
    loadPlannerTasks();
    loadResilienceStats();

    // Keep planner tasks and journal fresh via API fetch
    if (typeof fetch === "function") {
      Promise.resolve(fetch("/api/tasks"))
        .then((res) => (res && "json" in res ? res.json() : { tasks: [] }))
        .then((data) => {
          if (data && data.tasks && Array.isArray(data.tasks)) {
            setPlannerTasks(data.tasks);
            try {
              localStorage.setItem("momentum_actions", JSON.stringify(data.tasks));
            } catch (_) {}
          }
        })
        .catch(() => {});

      Promise.resolve(fetch("/api/journal"))
        .then((res) => (res && "json" in res ? res.json() : { entries: [] }))
        .then((data) => {
          if (data && Array.isArray(data.entries)) {
            const apiEntries: any[] = data.entries;
            const closed = apiEntries.filter(
              (e) => Boolean(e.loopOutcome || e.loopAccuracy || e.predictionEvaluation || e.loopCompletedAt)
            );
            setClosedLoopsCount((prev) => Math.max(prev, closed.length));

            let distCount = 0;
            apiEntries.forEach((e) => {
              if (Array.isArray(e.cognitiveDistortions)) {
                distCount += e.cognitiveDistortions.length;
              } else if (typeof e.cognitiveDistortions === "string" && e.cognitiveDistortions.split(",").length) {
                distCount += e.cognitiveDistortions.split(",").length;
              } else if (e.distortion) {
                distCount += 1;
              }
            });
            setDistortionsChallenged((prev) => Math.max(prev, distCount));

            if (closed.length > 0) {
              const disproved = closed.filter(
                (e) =>
                  e.loopAccuracy === "Completely False / Disproved" ||
                  e.predictionEvaluation === "Much better than expected" ||
                  e.predictionEvaluation === "Better than expected"
              );
              const pct = Math.round((disproved.length / closed.length) * 100);
              setDisprovedPredictionsPct(pct);
            }
          }
        })
        .catch(() => {});
    }

    function handleStorage() {
      loadFocus();
      loadPlannerTasks();
      loadResilienceStats();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("momentum_points_updated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("momentum_points_updated", handleStorage);
    };
  }, []);

  function handleToggleAction(action: FocusAction) {
    const nextCompleted = !action.completed;
    const updatedActions = focusActions.map((a) =>
      a.id === action.id
        ? {
            ...a,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            moodRating: nextCompleted ? a.moodRating : undefined,
          }
        : a
    );
    setFocusActions(updatedActions);
    try {
      localStorage.setItem("momentum_today_focus_actions", JSON.stringify(updatedActions));
      window.dispatchEvent(new Event("storage"));
    } catch (_) {}

    if (nextCompleted) {
      awardPoints(POINT_VALUES.DAILY_HABIT);
      setRatingMode('initial');
      setActiveRatingAction(action);
    } else {
      if (activeRatingAction?.id === action.id) {
        setActiveRatingAction(null);
      }
    }
  }

  function handleSelectMoodRating(rating: number) {
    if (!activeRatingAction) return;

    const timestamp = new Date().toISOString();
    const updatedActions = focusActions.map((a) =>
      a.id === activeRatingAction.id
        ? { ...a, moodRating: rating, completedAt: timestamp }
        : a
    );
    setFocusActions(updatedActions);

    try {
      localStorage.setItem("momentum_today_focus_actions", JSON.stringify(updatedActions));
      window.dispatchEvent(new Event("storage"));
      const logs = JSON.parse(localStorage.getItem("momentum_habit_mood_logs") || "[]");
      logs.push({
        actionId: activeRatingAction.id,
        title: activeRatingAction.title,
        moodRating: rating,
        timestamp,
      });
      localStorage.setItem("momentum_habit_mood_logs", JSON.stringify(logs));
    } catch (_) {}

    setRatingSuccessToast(`Logged ${activeRatingAction.title}: Completed (Rating: ${rating}/10)`);
    setActiveRatingAction(null);

    setTimeout(() => {
      setRatingSuccessToast(null);
    }, 3000);
  }

  // Add custom focus habit directly
  function handleAddCustomHabit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newHabitInput.trim()) return;

    const newAction: FocusAction = {
      id: `custom_${Date.now()}`,
      title: newHabitInput.trim(),
      completed: false,
    };

    const updated = [...focusActions, newAction];
    setFocusActions(updated);
    try {
      localStorage.setItem("momentum_today_focus_actions", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (_) {}
    setNewHabitInput("");
  }

  // Delete habit from focus list
  function handleDeleteHabit(id: string) {
    const updated = focusActions.filter((a) => a.id !== id);
    setFocusActions(updated);
    try {
      localStorage.setItem("momentum_today_focus_actions", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (_) {}
  }

  // Toggle pin planner task to Today's Focus
  function handleTogglePinPlannerTask(task: any) {
    const taskIdStr = String(task.id);
    const isPinned = focusActions.some((a) => a.id === taskIdStr);
    let updated: FocusAction[];
    if (isPinned) {
      updated = focusActions.filter((a) => a.id !== taskIdStr);
    } else {
      updated = [
        ...focusActions,
        {
          id: taskIdStr,
          title: task.title,
          completed: Boolean(task.completed),
        },
      ];
    }
    setFocusActions(updated);
    try {
      localStorage.setItem("momentum_today_focus_actions", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (_) {}
  }

  // Calculate current points and milestone progression
  const currentPoints = isMounted ? resiliencePoints : 0;
  const currentClosedLoops = isMounted ? closedLoopsCount : 0;

  // Next milestone calculation
  const nextMilestone =
    MILESTONE_TIERS.find((tier) => currentPoints < tier.pointsRequired) ||
    MILESTONE_TIERS[MILESTONE_TIERS.length - 1];

  const highestUnlockedMilestone =
    [...MILESTONE_TIERS]
      .reverse()
      .find((tier) => currentPoints >= tier.pointsRequired) || null;

  // Calculate progress percentage to next milestone
  let progressPct = 0;
  if (currentPoints >= 500) {
    progressPct = 100;
  } else if (currentPoints >= 250) {
    progressPct = Math.round(((currentPoints - 250) / 250) * 100);
  } else if (currentPoints >= 100) {
    progressPct = Math.round(((currentPoints - 100) / 150) * 100);
  } else {
    progressPct = Math.round((currentPoints / 100) * 100);
  }

  return (
    <div className="w-full min-h-screen bg-slate-50/50 overflow-y-auto px-4 pt-8 pb-48 flex flex-col items-center">
      
      {/* Symmetrically Spaced Centered Feed Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Momentum</h1>
        <p className="text-lg text-slate-600 mt-2 font-medium">Small, gentle steps forward.</p>
      </div>

      {/* Vertically Distributed Cards Stack */}
      <div className="w-full max-w-2xl flex flex-col gap-8 sm:gap-10 items-center justify-center my-auto">
        
        {/* Evening Reflection Card (Only rendered if isEvening is true) */}
        {isEvening && (
          <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-l-4 border-l-amber-500 border-slate-200/60 flex flex-col items-center text-center">
            <span className="text-3xl mb-2 animate-bounce">🌙</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Evening Reflection
            </h2>
            <p className="text-base sm:text-lg text-slate-800 font-normal leading-relaxed max-w-xl mb-6">
              Ready to release today's worries and plan a restful tomorrow?
            </p>
            <Link
              href="/reflect"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold tracking-wide py-3.5 px-8 rounded-xl transition-all shadow-md text-base sm:text-lg block text-center w-full max-w-[320px]"
            >
              Start Reflection
            </Link>
          </div>
        )}

        {/* 1. SSR-SAFE RESILIENCE MOMENTUM PROGRESS CARD */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Resilience Momentum
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">
                Empirical mental fortitude and verified reality checks.
              </p>
            </div>
            {highestUnlockedMilestone && (
              <button
                type="button"
                onClick={() => setSelectedMilestoneModal(highestUnlockedMilestone)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>✨</span>
                <span>Insight Summary</span>
              </button>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
              <span className="block text-2xl sm:text-3xl font-black text-slate-900">
                {currentPoints}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Resilience Pts
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
              <span className="block text-2xl sm:text-3xl font-black text-emerald-700">
                {currentClosedLoops}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Closed Loops
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
              <span className="block text-2xl sm:text-3xl font-black text-violet-700">
                {isMounted && currentClosedLoops > 0 ? `${disprovedPredictionsPct}%` : isMounted && distortionsChallenged > 0 ? "100%" : "—"}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Fears Disproved
              </span>
            </div>
          </div>

          {/* Progress Bar toward next milestone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Next Milestone: {nextMilestone.name}</span>
              <span className="text-slate-500">
                {currentPoints >= 500 ? "All Tiers Achieved!" : `${currentPoints} / ${nextMilestone.pointsRequired} pts`}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-slate-900 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, Math.min(100, progressPct))}%` }}
              />
            </div>
          </div>

          {/* Milestone Tiers Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {MILESTONE_TIERS.map((tier) => {
              const isUnlocked = currentPoints >= tier.pointsRequired;
              return (
                <div
                  key={tier.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between text-left ${
                    isUnlocked
                      ? "bg-slate-50/80 border-slate-300 shadow-2xs"
                      : "bg-slate-50/30 border-slate-200 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{tier.badge}</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isUnlocked
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {isUnlocked ? "✓ Unlocked" : `${tier.pointsRequired} pts`}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900 mb-1">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-snug">
                      {tier.description}
                    </p>
                  </div>

                  {isUnlocked && (
                    <button
                      type="button"
                      onClick={() => setSelectedMilestoneModal(tier)}
                      className="mt-3 text-xs font-bold text-slate-900 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>View Insights →</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. CBT Journal Card */}
        <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">📝 CBT Journal & Reflections</h2>
          <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed max-w-xl mb-6">
            Process distressing moments with our guided 5-step CBT Thought Record wizard to challenge thinking traps, or log positive victories to anchor and savor your strengths.
          </p>
          <Link
            href="/journal"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold tracking-wide py-3.5 px-8 rounded-xl transition-all shadow-md text-base sm:text-lg block text-center w-full max-w-[320px]"
          >
            ✍️ Open Guided Journal
          </Link>
        </div>

        {/* 3. Perspective Quote Card */}
        <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Perspective</h2>
          <span className="text-4xl text-slate-300 font-serif leading-none">“</span>
          <p className="text-2xl sm:text-3xl font-bold italic text-slate-900 tracking-wide leading-relaxed px-4 -mt-2 mb-4">
            {quote ? quote.text : "Loading..."}
          </p>
          <span className="text-xs sm:text-sm font-extrabold tracking-widest text-slate-500 uppercase">
            — {quote ? quote.author : "CBT"}
          </span>
        </div>

        {/* 4. Today's Focus Mini-Planner Card */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          
          {/* Card Header with Edit Habits Toggle */}
          <div className="w-full flex items-center justify-between mb-2">
            <div className="flex-1" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Today's Focus</h2>
            <div className="flex-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditingHabits(!isEditingHabits)}
                className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Customize Daily Habits & Actions"
              >
                <span>⚙️</span>
                <span>{isEditingHabits ? "Done" : "Edit Habits"}</span>
              </button>
            </div>
          </div>
          <p className="text-sm sm:text-base text-slate-600 font-medium mb-6">
            Small daily habits build long-term momentum.
          </p>
          
          {/* Habits Customization Editor Drawer */}
          {isEditingHabits ? (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Custom Daily Habits
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {focusActions.length} active
                </span>
              </div>

              {/* Add Custom Focus Action Input */}
              <form onSubmit={handleAddCustomHabit} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newHabitInput}
                  onChange={(e) => setNewHabitInput(e.target.value)}
                  placeholder="Add a new daily habit (e.g., Drink 2L water)..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newHabitInput.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all"
                >
                  + Add
                </button>
              </form>

              {/* Current Focus Habits List with Delete Option */}
              <div className="flex flex-col gap-2 mb-5">
                {focusActions.length > 0 ? (
                  focusActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                    >
                      <span className="font-semibold text-slate-800">{action.title}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteHabit(action.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                        title="Remove habit"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    No active focus habits. Add one above or pin from Action Planner below.
                  </p>
                )}
              </div>

              {/* Pin from Action Planner Section */}
              {plannerTasks.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                    📌 Pin from Action Planner
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {plannerTasks.map((t) => {
                      const isPinned = focusActions.some((a) => a.id === String(t.id));
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTogglePinPlannerTask(t)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isPinned
                              ? "bg-amber-50 text-amber-900 border-amber-300 font-bold"
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span>{isPinned ? "⭐" : "+"}</span>
                          <span>{t.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsEditingHabits(false)}
                className="w-full mt-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors text-center cursor-pointer"
              >
                ✓ Done Editing Habits
              </button>
            </div>
          ) : (
            /* Interactive Checkbox Elements */
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-base sm:text-lg font-bold text-slate-800 mb-6">
              {focusActions.length > 0 ? (
                focusActions.map((action) => (
                  <div key={action.id} className="flex flex-col items-center gap-1">
                    <label
                      className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={action.completed}
                        onChange={() => handleToggleAction(action)}
                        className="rounded border-slate-300 text-emerald-600 h-5 w-5 accent-emerald-600 cursor-pointer"
                      />
                      <span className={action.completed ? "line-through text-slate-400 font-medium" : "text-slate-800"}>
                        {action.title}
                      </span>
                    </label>
                    {/* Clickable re-edit rating badge: Completed (Rating: X/10) */}
                    {action.completed && action.moodRating != null && (
                      <button
                        type="button"
                        onClick={() => {
                          setRatingMode('re-edit');
                          setActiveRatingAction(action);
                        }}
                        title="Tap to change your rating"
                        className={`group text-xs px-2.5 py-1 rounded-full font-bold border transition-all cursor-pointer hover:opacity-90 hover:shadow-sm flex items-center gap-1.5 ${
                          action.moodRating >= 7
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : action.moodRating >= 4
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        <span>Completed (Rating: {action.moodRating}/10)</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">✏️</span>
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-2 text-slate-400 text-sm italic">
                  No focus habits active. Click "⚙️ Edit Habits" to add some!
                </div>
              )}
            </div>
          )}

          {/* Micro-popover / Inline prompt for 0-10 Mood Rating */}
          {activeRatingAction && (
            <div className="w-full max-w-md bg-white border border-slate-200 text-slate-900 rounded-2xl p-5 mb-6 shadow-lg animate-fadeIn flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">
                {ratingMode === 're-edit' ? 'Update rating for:' : 'Completed:'}{' '}
                <strong className="text-slate-900 font-bold">{activeRatingAction.title}</strong>
              </span>
              <p className="text-sm sm:text-base font-bold text-slate-900 mb-4">
                {ratingMode === 're-edit'
                  ? 'How would you rate this outcome?'
                  : 'How do you feel about completing this task?'}
              </p>

              {/* 11 circular pips: 0 through 10 */}
              <div className="flex items-center justify-between gap-1 sm:gap-1.5 w-full my-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = activeRatingAction.moodRating === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSelectMoodRating(num)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 border-slate-900"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                      title={`Rate ${num}/10`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              {/* Anchor text below the pips */}
              <div className="flex items-center justify-between w-full text-[11px] font-medium text-slate-500 mt-2 px-1">
                <span className="text-left text-slate-500 font-semibold">0: Drained / Hard</span>
                <span className="text-center text-slate-500 font-semibold">5: Neutral</span>
                <span className="text-right text-slate-500 font-semibold">10: Relieved / Accomplished</span>
              </div>

              {ratingMode === 're-edit' && (
                <button
                  type="button"
                  onClick={() => setActiveRatingAction(null)}
                  className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {ratingSuccessToast && (
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full mb-4 animate-fadeIn">
              ✓ {ratingSuccessToast}
            </div>
          )}

          <Link
            href="/tasks"
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-sm sm:text-base font-semibold text-slate-800 rounded-xl transition-colors block text-center"
          >
            Open Full Action Planner
          </Link>
        </div>

      </div>

      {/* Insight Summary Modal for Unlocked Milestones */}
      {selectedMilestoneModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMilestoneModal(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="milestone-modal-title"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedMilestoneModal.badge}</span>
                <div>
                  <h3 id="milestone-modal-title" className="text-lg font-extrabold text-slate-900">
                    {selectedMilestoneModal.name}
                  </h3>
                  <span className="text-xs font-bold text-emerald-700">
                    Milestone Unlocked ({selectedMilestoneModal.pointsRequired}+ Pts)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMilestoneModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg font-bold cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-700 font-medium leading-relaxed">
                {selectedMilestoneModal.description}
              </p>

              {/* Empirical Stats Box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Your Empirical Cognitive Proof
                </span>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-2xl font-black text-slate-900 block">
                      {isMounted ? distortionsChallenged : 0}
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      Distortions Challenged
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-2xl font-black text-emerald-700 block">
                      {isMounted && currentClosedLoops > 0 ? `${disprovedPredictionsPct}%` : isMounted && distortionsChallenged > 0 ? "100%" : "—"}
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      Predictions Disproved
                    </span>
                  </div>
                </div>
                <div className="pt-2 text-xs text-slate-600 flex items-center justify-between border-t border-slate-200">
                  <span>Total Closed Loops: <strong>{currentClosedLoops}</strong></span>
                  <span>Resilience Total: <strong>{currentPoints} pts</strong></span>
                </div>
              </div>

              {/* Clinical Insight Callout */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 block mb-1">
                  🧠 CBT Clinical Takeaway
                </span>
                <p className="text-xs sm:text-sm text-amber-950 leading-relaxed font-medium">
                  {selectedMilestoneModal.clinicalInsight}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedMilestoneModal(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
