"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRandomQuote, getRandomPerspectiveQuote, QuoteItem } from "@/utils/perspectiveQuotes";
import { awardPoints, POINT_VALUES, useResiliencePoints } from "@/lib/points";
import MasteryRoadmapModal from "@/components/MasteryRoadmapModal";

interface FocusAction {
  id: string;
  title: string;
  completed: boolean;
  moodRating?: number;
  completedAt?: string;
  duration?: string;
  difficulty?: string;
}

const DEFAULT_FOCUS_ACTIONS: FocusAction[] = [
  { id: "meditate", title: "Meditate", completed: false, duration: "10m", difficulty: "Low" },
  { id: "read", title: "Read", completed: false, duration: "15m", difficulty: "Low" },
  { id: "walk", title: "Walk", completed: false, duration: "15m", difficulty: "Low" },
];

function PencilIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isEvening, setIsEvening] = useState(false);
  const [quote, setQuote] = useState<QuoteItem | null>({
    quote: "If you can change your mind, you can change your life.",
    text: "If you can change your mind, you can change your life.",
    author: "William James",
  });
  const [isShufflingQuote, setIsShufflingQuote] = useState(false);
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
  const [totalEntriesCount, setTotalEntriesCount] = useState(0);
  const [activeReflectionDraft, setActiveReflectionDraft] = useState<{
    thoughtSnippet: string;
    metaLabel: string;
  } | null>(null);
  const [distortionsChallenged, setDistortionsChallenged] = useState(0);
  const [disprovedPredictionsPct, setDisprovedPredictionsPct] = useState(0);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Open the Mastery Roadmap modal when the top-bar button in Navigation fires its event
  useEffect(() => {
    const openRoadmap = () => setIsRoadmapOpen(true);
    window.addEventListener("momentum:open-roadmap", openRoadmap);
    return () => window.removeEventListener("momentum:open-roadmap", openRoadmap);
  }, []);

  // Share the closed-loops count with the top-bar stats pill in Navigation
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem("momentum_closed_loops_count", String(closedLoopsCount));
      window.dispatchEvent(new Event("momentum:stats"));
    } catch (_) {}
  }, [isMounted, closedLoopsCount]);

  useEffect(() => {
    setIsMounted(true);

    try {
      const accepted = localStorage.getItem("momentum_disclaimer_accepted");
      if (!accepted) {
        setShowDisclaimerModal(true);
      }
    } catch (_) {}

    const hour = new Date().getHours();
    // ?simNight=true forces the Evening Reflection card regardless of clock time
    let simNight = false;
    try {
      simNight = new URLSearchParams(window.location.search).get("simNight") === "true";
    } catch (_) {}
    const evening = simNight || hour >= 17; // 5:00 PM Logic
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

        setTotalEntriesCount(allEntries.length);

        // Determine active draft or pending reframe (State A)
        let foundDraft: { thoughtSnippet: string; metaLabel: string } | null = null;
        try {
          const rawDraft = localStorage.getItem("momentum_journal_draft");
          if (rawDraft) {
            const parsedDraft = JSON.parse(rawDraft);
            const snippet = (parsedDraft?.thought || parsedDraft?.situation || "").toString().trim();
            if (snippet) {
              let metaLabel = "Draft in progress";
              if (parsedDraft?.updatedAt) {
                const d = new Date(parsedDraft.updatedAt);
                if (!isNaN(d.getTime())) {
                  metaLabel = `Saved ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                }
              } else if (parsedDraft?.step) {
                metaLabel = `Step ${parsedDraft.step} of 4`;
              }
              foundDraft = { thoughtSnippet: snippet, metaLabel };
            }
          }
        } catch (_) {}

        if (!foundDraft) {
          try {
            const rawPending = localStorage.getItem("momentum_pending_reframe");
            if (rawPending) {
              const parsedPending = JSON.parse(rawPending);
              const snippet = (parsedPending?.thought || parsedPending?.situation || "").toString().trim();
              if (snippet) {
                foundDraft = { thoughtSnippet: snippet, metaLabel: "Pending Reframe" };
              }
            }
          } catch (_) {}
        }

        if (!foundDraft && allEntries.length > 0) {
          const pendingEntry = allEntries.find((e) => {
            const isPendingReframe =
              e.reframedThought === "[Pending Reframe]" ||
              e.reframe === "[Pending Reframe]";
            const isClosed = Boolean(
              (e.outcomeText && String(e.outcomeText).trim()) ||
              e.loopOutcome ||
              e.loopAccuracy ||
              e.predictionEvaluation ||
              e.loopCompletedAt ||
              e.loopClosedAt ||
              e.entryType === "positive"
            );
            return isPendingReframe || !isClosed;
          });
          if (pendingEntry) {
            const snippet = (
              pendingEntry.automaticThought ||
              pendingEntry.thought ||
              pendingEntry.situation ||
              "Unfinished thought record"
            )
              .toString()
              .trim();
            const isPendingReframe =
              pendingEntry.reframedThought === "[Pending Reframe]" ||
              pendingEntry.reframe === "[Pending Reframe]";
            foundDraft = {
              thoughtSnippet: snippet,
              metaLabel: isPendingReframe ? "Pending Reframe" : "Open Thought Loop",
            };
          }
        }
        setActiveReflectionDraft(foundDraft);

        // Count closed loops
        const closed = allEntries.filter(
          (e) => Boolean((e.outcomeText && String(e.outcomeText).trim()) || e.loopOutcome || e.loopAccuracy || e.predictionEvaluation || e.loopCompletedAt)
        );
        const totalClosedLoops = closed.length;
        setClosedLoopsCount(totalClosedLoops);

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
        if (totalClosedLoops > 0) {
          const disprovedCount = closed.filter((entry) => {
            const isDisproved =
              entry.predictionEvaluation !== "Worse than expected" &&
              entry.loopAccuracy !== "Exactly as Feared";
            return isDisproved;
          }).length;
          const pct = Math.round((disprovedCount / totalClosedLoops) * 100);
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
            setTotalEntriesCount((prev) => Math.max(prev, apiEntries.length));
            const closed = apiEntries.filter(
              (e) => Boolean((e.outcomeText && String(e.outcomeText).trim()) || e.loopOutcome || e.loopAccuracy || e.predictionEvaluation || e.loopCompletedAt)
            );
            const totalClosedLoops = closed.length;
            setClosedLoopsCount((prev) => Math.max(prev, totalClosedLoops));

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

            if (totalClosedLoops > 0) {
              const disprovedCount = closed.filter((entry) => {
                const isDisproved =
                  entry.predictionEvaluation !== "Worse than expected" &&
                  entry.loopAccuracy !== "Exactly as Feared";
                return isDisproved;
              }).length;
              const pct = Math.round((disprovedCount / totalClosedLoops) * 100);
              setDisprovedPredictionsPct(pct);
            } else {
              setDisprovedPredictionsPct(0);
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
      duration: "15m",
      difficulty: "Low",
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

  function formatCompactDuration(raw?: string): string {
    if (!raw) return "15m";
    const s = raw.trim().toLowerCase();
    const num = parseInt(s, 10);
    if (isNaN(num)) return raw;
    if (s.includes("hour") || s.includes("hr") || s.endsWith("h")) return `${num}h`;
    return `${num}m`;
  }

  function getFocusActionMeta(action: FocusAction): { duration: string; difficulty: string } {
    const matchedTask = plannerTasks.find((t) => String(t.id) === String(action.id));
    const defaultItem = DEFAULT_FOCUS_ACTIONS.find((d) => d.id === action.id);
    const rawDuration = action.duration || matchedTask?.estimatedTime || defaultItem?.duration || "15m";
    const difficulty = action.difficulty || matchedTask?.emotionalIntensity || defaultItem?.difficulty || "Low";
    return {
      duration: formatCompactDuration(rawDuration),
      difficulty,
    };
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
          duration: formatCompactDuration(task.estimatedTime),
          difficulty: task.emotionalIntensity || "Low",
        },
      ];
    }
    setFocusActions(updated);
    try {
      localStorage.setItem("momentum_today_focus_actions", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (_) {}
  }

  function handleShuffleQuote() {
    setIsShufflingQuote(true);
    setTimeout(() => {
      setQuote((prev) => getRandomPerspectiveQuote(prev?.quote || prev?.text));
      setIsShufflingQuote(false);
    }, 150);
  }

  // Calculate current points and milestone progression
  const currentPoints = isMounted ? resiliencePoints : 0;

  return (
    <div className="w-full min-h-screen bg-[#f8faf9] overflow-y-auto overflow-x-hidden flex flex-col items-center">
      
      {/* Main Content Sanctuary Container (max-w-6xl) */}
      <div className="w-full max-w-6xl mx-auto px-6 py-2 md:py-4 pb-24 md:pb-8 flex flex-col gap-6">
        
        {/* Slim Evening Reflection Banner (Only rendered if isEvening is true) */}
        {isEvening && (
          <div className="w-full max-w-6xl mx-auto flex flex-row items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-stone-700 shadow-sm my-4">
            <p className="flex items-center gap-2 text-xs md:text-sm font-medium min-w-0">
              <span className="shrink-0" aria-hidden="true">{"\u{1F319}"}</span>
              <span>Evening Reflection: Ready to release today&apos;s worries and plan tomorrow?</span>
            </p>
            <Link
              href="/reflect"
              className="shrink-0 text-xs font-semibold py-1.5 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-all no-underline"
            >
              Start Reflection
            </Link>
          </div>
        )}

        {/* 2. Editorial Epigraph */}
        <section className="w-full py-6 md:py-8 flex flex-col items-center justify-center" aria-label="Daily Perspective">
          <div className={`max-w-2xl mx-auto text-center px-4 transition-opacity duration-200 ${isShufflingQuote ? "opacity-0" : "opacity-100"}`}>
            <blockquote className="font-serif text-lg md:text-xl text-stone-800 italic leading-relaxed">
              “{quote ? (quote.quote || quote.text) : "If you can change your mind, you can change your life."}”
            </blockquote>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-xs tracking-widest uppercase text-stone-500">
                — {quote ? quote.author : "William James"}
              </span>
              <button
                type="button"
                onClick={handleShuffleQuote}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-200/50 transition-colors inline-flex items-center cursor-pointer"
                aria-label="New Perspective"
                title="Show another perspective"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${isShufflingQuote ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Daily Action Zone (2-Column Desktop Grid / 1-Column Stack on Mobile) */}
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

        {/* 4. Today's Focus Mini-Planner Card */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200/60 flex flex-col items-center text-center h-full justify-between relative overflow-hidden">
          
          <div className="w-full flex flex-col items-center flex-1">
            {/* Card Header with Edit Habits Toggle */}
            <div className="w-full flex items-center justify-between mb-1.5">
              <div className="flex-1" />
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">Today&apos;s Focus</h2>
              <div className="flex-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditingHabits(!isEditingHabits)}
                  className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Customize Daily Habits & Actions"
                >
                  {isEditingHabits ? (
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <PencilIcon className="w-3.5 h-3.5" />
                  )}
                  <span>{isEditingHabits ? "Done" : "Edit Habits"}</span>
                </button>
              </div>
            </div>
            <p className="text-sm md:text-base text-stone-500 mb-6">
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
                          className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="Remove habit"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          <span>Delete</span>
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
                            <span className={isPinned ? "text-amber-500 font-bold" : "text-slate-400"}>
                              {isPinned ? "★" : "+"}
                            </span>
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
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 items-start justify-items-center gap-3 sm:gap-x-6 sm:gap-y-4 text-base md:text-lg font-semibold text-stone-800 mb-6">
                {focusActions.length > 0 ? (
                  focusActions.map((action) => {
                    const meta = getFocusActionMeta(action);
                    return (
                      <div key={action.id} className="flex flex-col items-center gap-1">
                        <label
                          className="flex items-start gap-2.5 cursor-pointer select-none px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                        >
                          <input
                            type="checkbox"
                            checked={action.completed}
                            onChange={() => handleToggleAction(action)}
                            className="mt-1 h-5 w-5 rounded border-stone-300 text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                          />
                          <div className="flex flex-col leading-tight">
                            <span className={action.completed ? "line-through text-stone-400 font-medium text-base md:text-lg" : "text-base md:text-lg font-semibold text-stone-800"}>
                              {action.title}
                            </span>
                            <span className="text-xs md:text-sm text-stone-400 font-normal mt-0.5">
                              {meta.duration} &middot; {meta.difficulty}
                            </span>
                          </div>
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
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <PencilIcon className="w-2.5 h-2.5 inline-block text-current" />
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-2 text-slate-400 text-sm italic">
                    No focus habits active. Click &quot;Edit Habits&quot; to add some!
                  </div>
                )}
              </div>
            )}

            {/* Contained absolute overlay for 0-10 Mood Rating so card height & bottom button never shift */}
            {activeRatingAction && (
              <div className="absolute inset-x-4 sm:inset-x-6 bottom-20 z-20 p-4 bg-white/95 backdrop-blur-xs rounded-2xl border border-stone-200 shadow-lg text-center overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="w-5" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    {ratingMode === 're-edit' ? 'Update rating for:' : 'Completed:'}{' '}
                    <span className="text-slate-800">{activeRatingAction.title}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveRatingAction(null)}
                    className="w-5 h-5 p-0 rounded-full bg-transparent border-0 shadow-none text-stone-400 hover:text-stone-700 hover:bg-stone-100 text-xs flex items-center justify-center cursor-pointer"
                    aria-label="Close rating prompt"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm font-bold text-slate-900 mb-2.5">
                  {ratingMode === 're-edit'
                    ? 'How would you rate this outcome?'
                    : 'How do you feel about completing this task?'}
                </p>

                {/* Clean 2-Row Pip Grid (0-5 top, 6-10 bottom) */}
                <div className="flex flex-col gap-1.5 max-w-[280px] mx-auto mb-2.5">
                  <div className="flex justify-between gap-1">
                    {[0, 1, 2, 3, 4, 5].map((num) => {
                      const isSelected = activeRatingAction.moodRating === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleSelectMoodRating(num)}
                          className={`w-8 h-8 p-0 rounded-full border text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white shadow-none'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {[6, 7, 8, 9, 10].map((num) => {
                      const isSelected = activeRatingAction.moodRating === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleSelectMoodRating(num)}
                          className={`w-8 h-8 p-0 rounded-full border text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white shadow-none'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Labels */}
                <div className="flex justify-between text-[11px] font-medium text-slate-400 px-1">
                  <span>0: Drained / Hard</span>
                  <span>5: Neutral</span>
                  <span>10: Relieved / Accomplished</span>
                </div>
              </div>
            )}

            {ratingSuccessToast && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-xs animate-fadeIn">
                ✓ {ratingSuccessToast}
              </div>
            )}
          </div>

          <div className="w-full mt-auto pt-4">
            <Link
              href="/tasks"
              className="w-full py-3 px-5 text-base font-semibold rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-800 transition-all text-center block"
            >
              Open Full Action Planner
            </Link>
          </div>
        </div>

        {/* Right Column: CBT Reflection Card */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200/60 flex flex-col justify-between h-full">
          {/* Header Row */}
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-full flex items-center justify-center mb-1.5">
              <h2 className="flex items-center justify-center gap-2 text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                <svg
                  className="w-5 h-5 text-emerald-700 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11.8 15H9v-2.8l8.6-8.6z"
                  />
                </svg>
                <span>CBT Reflection</span>
              </h2>
            </div>
            <p className="text-sm md:text-base text-stone-500">
              Clear your head, challenge unhelpful thoughts, or log a win.
            </p>
          </div>

          {/* Dynamic Content Area (Middle Section) */}
          <div className="my-6 flex-1 flex flex-col justify-center">
            {isMounted && activeReflectionDraft ? (
              /* State A: Active Draft / Pending Reframe */
              <div className="w-full rounded-xl bg-amber-50/60 border border-amber-200/80 p-4 flex flex-col gap-2.5 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Unfinished Reflection
                  </span>
                  <span className="text-[11px] font-medium text-stone-500">
                    {activeReflectionDraft.metaLabel}
                  </span>
                </div>
                <p className="text-sm text-stone-700 italic line-clamp-2 leading-relaxed">
                  &ldquo;{activeReflectionDraft.thoughtSnippet}&rdquo;
                </p>
                <div className="pt-1">
                  <Link
                    href="/journal"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-2xs no-underline"
                  >
                    <span>Resume Draft</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            ) : isMounted && totalEntriesCount > 0 ? (
              /* State B: All Caught Up */
              <div className="w-full rounded-xl bg-stone-50/90 border border-stone-200/80 p-5 flex items-center gap-3.5 text-left">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-bold text-stone-900">
                    All caught up
                  </span>
                  <span className="text-xs sm:text-sm text-stone-500 mt-0.5">
                    Your active thought loops are resolved.
                  </span>
                </div>
              </div>
            ) : (
              /* State C: Empty State / New User */
              <div className="w-full rounded-xl bg-stone-50/70 border border-stone-200/60 p-5 text-center">
                <p className="text-sm text-stone-600 leading-relaxed">
                  No reflections logged yet. Take a moment to untangle a thought or anchor a personal win.
                </p>
              </div>
            )}
          </div>

          {/* Pinned Footer Button */}
          <div className="w-full mt-auto pt-4">
            <Link
              href="/journal"
              className="w-full py-3 px-5 text-base font-semibold rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-800 transition-all text-center block"
            >
              Open Full Journal
            </Link>
          </div>
        </div>

      </div>

    </div>

      <MasteryRoadmapModal isOpen={isRoadmapOpen} onClose={() => setIsRoadmapOpen(false)} points={currentPoints} />

      {/* First-Launch Disclaimer Gate Modal */}
      {showDisclaimerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col p-6 sm:p-8 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              <div>
                <h3 id="disclaimer-title" className="text-2xl font-black text-slate-900 tracking-tight">
                  Welcome to Momentum
                </h3>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Self-Guided Cognitive Training
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-sm leading-relaxed">
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  ⚕️ Clinical Boundary
                </span>
                <p className="text-slate-700 font-medium text-xs sm:text-sm">
                  Momentum is a self-guided educational and journaling tool based on Cognitive Behavioral Therapy (CBT) principles. It is not intended to diagnose, treat, or replace professional mental health care or medical advice.
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 block">
                  🔒 Privacy Guarantee
                </span>
                <p className="text-emerald-950 font-medium text-xs sm:text-sm">
                  100% of your thoughts, reflections, and habit logs remain encrypted in your device&apos;s local storage. Your reflections are never transmitted to external servers or used to train public AI models.
                </p>
              </div>

              <label className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 h-5 w-5 accent-emerald-600 cursor-pointer shrink-0"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                  I understand that Momentum is a self-help tool and not a substitute for clinical medical care.
                </span>
              </label>
            </div>

            <button
              type="button"
              disabled={!disclaimerAccepted}
              onClick={() => {
                try {
                  localStorage.setItem("momentum_disclaimer_accepted", "true");
                } catch (_) {}
                setShowDisclaimerModal(false);
              }}
              className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Accept &amp; Enter Momentum
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
