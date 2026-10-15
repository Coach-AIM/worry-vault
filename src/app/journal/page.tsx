"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkSafety } from "@/lib/safetyIntercept";
import {
  findDistortions,
  DistortionType,
  DISTORTIONS,
} from "@/lib/cbtDistortions";
import { EMOTION_WHEEL, PRIMARY_EMOTIONS } from "@/lib/emotionWheel";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/utils/storage";
import CloseLoopModal, { type CloseLoopResult } from "@/components/CloseLoopModal";
import { awardPoints, POINT_VALUES, useResiliencePoints } from "@/lib/points";

type Entry = {
  id: number;
  createdAt: string;
  entryType: "negative" | "positive";
  situation: string;
  emotionsJson: string;
  automaticThought: string | null;
  distortionsJson: string | null;
  reframedThought: string;
  outcomeText?: string | null;
  lessonsLearned?: string | null;
  predictionEvaluation?: string | null;
  // Close-the-loop reality check fields
  loopAccuracy?: string | null;   // AccuracyLevel from CloseLoopModal
  reliefRating?: number | null;   // 0–10
  loopClosedAt?: string | null;   // ISO timestamp
};

type SelectedEmotion = {
  name: string;
  weight: number;
};

export default function CBTJournal() {
  const router = useRouter();
  const [entryType, setEntryType] = useState<"negative" | "positive">(
    "negative",
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Thought Record State
  const [situation, setSituation] = useState("");

  // Emotions State (Step 2)
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<SelectedEmotion[]>(
    [],
  );

  const [thought, setThought] = useState("");

  // Distortions State (Step 4)
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([]);
  const [suggestedTraps, setSuggestedTraps] = useState<string[]>([]);

  const [alternativeThought, setAlternativeThought] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<
    "friend" | "fact" | "reset" | null
  >(null);

  // Heuristic Highlights
  const [localDistortions, setLocalDistortions] = useState<DistortionType[]>(
    [],
  );

  // AI Insights
  const [insightsData, setInsightsData] = useState<{
    insights: string;
    reframeSuggestions?: string[];
    suggestedDistortions?: string[];
    friend_test_reframe?: string;
    fact_checking_reframe?: string;
    perspective_reset_reframe?: string;
  } | null>(null);

  const [history, setHistory] = useState<Entry[]>([]);
  const [positives, setPositives] = useState<any[]>([]);
  const [counterEvidence, setCounterEvidence] = useState<string | null>(null);

  // Evidence Loop (Follow-up) State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempOutcomeText, setTempOutcomeText] = useState("");
  const [tempLessonsLearned, setTempLessonsLearned] = useState("");
  const [tempEvaluation, setTempEvaluation] = useState(
    "Much better than expected",
  );
  const [savingOutcomeId, setSavingOutcomeId] = useState<number | null>(null);
  // Close-the-Loop modal state
  const [closeLoopModalEntryId, setCloseLoopModalEntryId] = useState<number | null>(null);
  // SSR-safe Resilience Points
  const { points: resiliencePoints, isLoaded: pointsLoaded } = useResiliencePoints();

  // ── Auto-reframe soft limit ──────────────────────────────────
  const [autoReframeCount, setAutoReframeCount] = useState<number>(0);
  const [showAiOverride, setShowAiOverride] = useState(false);

  // ── Reframe Later ────────────────────────────────────────────
  const [showReframeLaterPicker, setShowReframeLaterPicker] = useState(false);
  const [pendingReframeBanner, setPendingReframeBanner] = useState<{ situation: string; thought: string; ago: string } | null>(null);

  // ── Draft Auto-Save & Recovery ────────────────────────────────
  const [draftRecoveryBanner, setDraftRecoveryBanner] = useState<{
    situation: string;
    timeStr: string;
    data: any;
  } | null>(null);

  // ── Post-save completion insight ─────────────────────────────
  type TriangleCorner = 'thoughts' | 'feelings' | 'behaviors';
  const [showCompletion, setShowCompletion] = useState(false);
  const [dominantCorners, setDominantCorners] = useState<TriangleCorner[]>([]);
  const [completionSituation, setCompletionSituation] = useState('');

  const isSuggested = (trapName: string) => {
    if (!suggestedTraps || !Array.isArray(suggestedTraps)) return false;

    // Normalize both strings to lowercase and strip spaces/underscores for a foolproof match
    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, "");

    return suggestedTraps.some(
      (suggested) => normalize(suggested) === normalize(trapName),
    );
  };

  // Default suggested emotions helper
  const getSuggestedEmotions = (situationText: string) => {
    const text = situationText.toLowerCase();
    const suggestions: string[] = [];

    if (entryType === "positive") {
      return [
        "Proud",
        "Grateful",
        "Calm",
        "Hopeful",
        "Content",
        "Relieved",
        "Energized",
        "Inspired",
      ];
    }

    // Creative & Feedback
    if (
      text.includes("feedback") ||
      text.includes("project") ||
      text.includes("creative") ||
      text.includes("critique") ||
      text.includes("draft") ||
      text.includes("art") ||
      text.includes("video") ||
      text.includes("writing") ||
      text.includes("review") ||
      text.includes("ignored")
    ) {
      suggestions.push("Disappointed", "Vulnerable", "Discouraged", "Insecure");
    }

    // Social Disconnect & Communication
    if (
      text.includes("text") ||
      text.includes("call") ||
      text.includes("replied") ||
      text.includes("ghost") ||
      text.includes("read") ||
      text.includes("nap") ||
      text.includes("friend") ||
      text.includes("hit me up") ||
      text.includes("reach out")
    ) {
      suggestions.push("Hurt", "Misunderstood", "Annoyed", "Dismissed");
    }

    // Incompetence & Imposter Thoughts
    if (
      text.includes("dumb") ||
      text.includes("stupid") ||
      text.includes("incompetent") ||
      text.includes("behind") ||
      text.includes("fail") ||
      text.includes("broken") ||
      text.includes("lazy") ||
      text.includes("imposter")
    ) {
      suggestions.push("Embarrassed", "Worthless", "Inadequate", "Self-Doubt");
    }

    // Work, Pressure & Deadlines
    if (
      text.includes("boss") ||
      text.includes("deadline") ||
      text.includes("presentation") ||
      text.includes("meeting") ||
      text.includes("exam") ||
      text.includes("test") ||
      text.includes("job") ||
      text.includes("interview") ||
      text.includes("task")
    ) {
      suggestions.push("Overwhelmed", "Stressed", "Worried", "Apprehensive");
    }

    // Interpersonal Conflict & Injustice
    if (
      text.includes("argue") ||
      text.includes("fight") ||
      text.includes("unfair") ||
      text.includes("rude") ||
      text.includes("yelled") ||
      text.includes("blame") ||
      text.includes("accus") ||
      text.includes("mad") ||
      text.includes("angry")
    ) {
      suggestions.push("Frustrated", "Irritated", "Resentful", "Outraged");
    }

    // Loss, Grief & Isolation
    if (
      text.includes("lonely") ||
      text.includes("alone") ||
      text.includes("miss") ||
      text.includes("lost") ||
      text.includes("cry") ||
      text.includes("breakup") ||
      text.includes("left") ||
      text.includes("death") ||
      text.includes("goodbye")
    ) {
      suggestions.push("Lonely", "Isolated", "Grieving", "Sorrowful");
    }

    // Guilt, Mistake & Self-Blame
    if (
      text.includes("sorry") ||
      text.includes("mistake") ||
      text.includes("wrong") ||
      text.includes("guilt") ||
      text.includes("shame") ||
      text.includes("fault") ||
      text.includes("regret")
    ) {
      suggestions.push("Remorseful", "Regretful", "Apologetic", "Burdened");
    }

    // Uncertainty & Paralysis
    if (
      text.includes("unsure") ||
      text.includes("stuck") ||
      text.includes("should i") ||
      text.includes("decision") ||
      text.includes("choice") ||
      text.includes("what if") ||
      text.includes("confused")
    ) {
      suggestions.push("Confused", "Hesitant", "Conflicted", "Perplexed");
    }

    // Burnout & Physical Drain
    if (
      text.includes("tired") ||
      text.includes("exhaust") ||
      text.includes("drained") ||
      text.includes("headache") ||
      text.includes("burnout") ||
      text.includes("sleep") ||
      text.includes("energy")
    ) {
      suggestions.push("Drained", "Lethargic", "Overstimulated", "Empty");
    }

    if (suggestions.length === 0) {
      suggestions.push("Stressed", "Overwhelmed", "Frustrated", "Vulnerable");
    }

    return [...new Set(suggestions)];
  };

  const suggestedEmotions = getSuggestedEmotions(situation);

  const getHeuristicReframe = () => {
    if (selectedDistortions.includes("all-or-nothing")) {
      return "While this situation didn't go perfectly, it doesn't mean everything is ruined. I can learn from this single event.";
    }
    if (selectedDistortions.includes("catastrophizing")) {
      return "I am imagining the worst-case scenario. Even if that happens, I can take steps to handle it, and it's more likely that the outcome will be manageable.";
    }
    if (selectedDistortions.includes("should-statements")) {
      return "It would be nice if things went exactly as I wished, but it's okay that they didn't. I will do my best without demanding perfection.";
    }
    if (selectedDistortions.includes("mind-reading")) {
      return "I don't actually know what they are thinking. They might be busy, stressed, or thinking about something else entirely.";
    }
    if (selectedDistortions.includes("emotional-reasoning")) {
      return "My feelings are strong right now, but feelings are not facts. Just because I feel this way doesn't mean it's the truth.";
    }
    if (selectedDistortions.includes("overgeneralization")) {
      return "This is one isolated event. It doesn't mean it will always happen this way in the future.";
    }
    return "I can take a deep breath and look at the facts of this situation objectively, rather than letting my automatic thoughts dictate my reality.";
  };

  // Deterministic offline reframe prompt keyed to the selected distortion
  const getDistortionPrompt = () => {
    const hasMindReading = selectedDistortions.includes("mind-reading");
    const hasCatastrophizing = selectedDistortions.includes("catastrophizing");

    if (hasMindReading && hasCatastrophizing) {
      return "I am assuming the absolute worst without concrete evidence. Their delay is likely due to ordinary reasons like sleeping or being busy.";
    }
    if (hasMindReading) {
      return "I cannot read minds. People have their own schedules, distractions, and fatigue that have nothing to do with me.";
    }
    if (hasCatastrophizing) {
      return "Jumping to the worst-case scenario is an anxiety reaction, not a guaranteed reality. The most probable outcome is manageable.";
    }
    if (selectedDistortions.includes("all-or-nothing")) {
      return "Situations are rarely 100% black and white. There is workable middle ground here.";
    }
    if (selectedDistortions.includes("should-statements")) {
      return "Preferences are not absolute rules. Things don't have to happen on my timeline for things to be okay.";
    }
    return "My thoughts are hypotheses, not proven facts. I can wait for concrete evidence before deciding what this means.";
  };

  const getExerciseSample = (exerciseType = selectedExercise) => {
    if (!insightsData) return getDistortionPrompt();
    if (exerciseType === "friend") {
      return (
        insightsData.friend_test_reframe ||
        "Think about what you'd say to a friend in this exact situation..."
      );
    }
    if (exerciseType === "fact") {
      return (
        insightsData.fact_checking_reframe ||
        "Look at the concrete evidence for and against this specific thought..."
      );
    }
    if (exerciseType === "reset") {
      return (
        insightsData.perspective_reset_reframe ||
        "What is your concrete plan to handle the absolute worst-case scenario?"
      );
    }
    return getHeuristicReframe();
  };

  const [loading, setLoading] = useState(false);
  const [loadingEmotions, setLoadingEmotions] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [crisis, setCrisis] = useState(false);
  // Inline API error — shown below the Analyze button instead of alert()
  const [aiError, setAiError] = useState<string | null>(null);
  // Whether to force-expand the manual distortion picker
  const [showManualPicker, setShowManualPicker] = useState(false);
  // Inline save error (replaces alert() on submit failure)
  const [saveError, setSaveError] = useState<string | null>(null);


  function handleGoToStep2() {
    if (!situation.trim()) return;

    if (checkSafety(situation)) {
      setCrisis(true);
      return;
    }

    setStep(2);
  }

  async function fetchHistory() {
    setFetching(true);
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      let entries: Entry[] = data.entries || [];

      // Merge client-side enriched fields (like loopAccuracy, reliefRating) from momentum_journal_entries
      try {
        const localRaw = safeGetItem("momentum_journal_entries");
        if (localRaw) {
          const localEntries = JSON.parse(localRaw) as any[];
          const localMap = new Map(localEntries.map((e) => [e.id, e]));
          entries = entries.map((entry) => {
            const local = localMap.get(entry.id);
            if (local) {
              return {
                ...entry,
                outcomeText: entry.outcomeText || local.outcomeText,
                predictionEvaluation: entry.predictionEvaluation || local.predictionEvaluation,
                loopAccuracy: local.loopAccuracy,
                reliefRating: local.reliefRating,
                loopClosedAt: local.loopClosedAt,
              };
            }
            return entry;
          });
        }
      } catch { /* best-effort */ }

      setHistory(entries);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }


  async function fetchPositives() {
    try {
      const res = await fetch("/api/positives");
      const data = await res.json();
      if (data.glimmers) setPositives(data.glimmers);
    } catch (err) {
      console.error("Failed to fetch positives:", err);
    }
  }

  useEffect(() => {
    fetchHistory();
    fetchPositives();

    // Load auto-reframe counter
    const stored = parseInt(safeGetItem('momentum_reframe_count') ?? '0', 10);
    setAutoReframeCount(isNaN(stored) ? 0 : stored);

    // Check for a pending reframe reminder
    try {
      const raw = safeGetItem('momentum_pending_reframe');
      if (raw) {
        const pending = JSON.parse(raw) as { remindAt: number; situation: string; thought: string };
        if (pending.remindAt <= Date.now()) {
          const diffMs = Date.now() - (pending.remindAt - (pending.remindAt % 3_600_000 === 0 ? 0 : 0));
          const diffHrs = Math.round((Date.now() - pending.remindAt) / 3_600_000);
          const ago = diffHrs <= 0 ? 'just now' : `${diffHrs}h ago`;
          setPendingReframeBanner({ situation: pending.situation, thought: pending.thought, ago });
        }
      }
    } catch { /* ignore corrupt data */ }

    // Check for auto-saved draft within last 24h
    try {
      const rawDraft = safeGetItem('momentum_journal_draft');
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (
          parsedDraft &&
          parsedDraft.updatedAt &&
          Date.now() - parsedDraft.updatedAt < twentyFourHours &&
          (parsedDraft.situation?.trim() || parsedDraft.thought?.trim())
        ) {
          const draftDate = new Date(parsedDraft.updatedAt);
          const timeStr = draftDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setDraftRecoveryBanner({
            situation: parsedDraft.situation || '',
            timeStr,
            data: parsedDraft,
          });
        }
      }
    } catch { /* ignore draft parse error */ }
  }, []);

  // ── Auto-save draft on step transition or input change ──────────
  useEffect(() => {
    // Only save draft if user has entered content and is not viewing completion
    if (showCompletion) return;
    const hasContent =
      Boolean(situation.trim()) ||
      selectedEmotions.length > 0 ||
      Boolean(thought.trim()) ||
      selectedDistortions.length > 0 ||
      Boolean(alternativeThought.trim());

    if (!hasContent) return;

    try {
      const draftPayload = {
        step,
        entryType,
        situation,
        selectedEmotions,
        thought,
        selectedDistortions,
        alternativeThought,
        selectedExercise,
        updatedAt: Date.now(),
      };
      localStorage.setItem('momentum_journal_draft', JSON.stringify(draftPayload));
    } catch { /* best-effort */ }
  }, [step, entryType, situation, selectedEmotions, thought, selectedDistortions, alternativeThought, selectedExercise, showCompletion]);

  // Dynamic Counter-Evidence Hook
  useEffect(() => {
    if (step === 4 || step === 5) {
      const options: string[] = [];

      // From historical positive journal entries
      history.forEach((item) => {
        if (item.entryType === "positive" && item.reframedThought) {
          options.push(
            `Victory: "${item.reframedThought}" (from ${new Date(item.createdAt).toLocaleDateString()})`,
          );
        }
      });

      // From positive thoughts vault
      positives.forEach((item) => {
        const matchesCat = [
          "Strength Validation",
          "Exception to Problem",
        ].includes(item.category);
        if (matchesCat && item.thoughtText) {
          options.push(
            `${item.category}: "${item.thoughtText}" (from ${new Date(item.createdAt).toLocaleDateString()})`,
          );
        }
      });

      if (options.length > 0) {
        const randomIndex = Math.floor(Math.random() * options.length);
        setCounterEvidence(options[randomIndex]);
      } else {
        setCounterEvidence(null);
      }
    } else {
      setCounterEvidence(null);
    }
  }, [step, history, positives]);

  // Heuristic distortion detection now runs only on explicit click of
  // "Analyze Thought" — no debounce, no automatic background calls.

  function toggleEmotion(emotionName: string) {
    if (selectedEmotions.some((e) => e.name === emotionName)) {
      setSelectedEmotions(
        selectedEmotions.filter((e) => e.name !== emotionName),
      );
    } else {
      setSelectedEmotions([
        ...selectedEmotions,
        { name: emotionName, weight: 50 },
      ]);
    }
  }

  function updateEmotionWeight(emotionName: string, weight: number) {
    setSelectedEmotions(
      selectedEmotions.map((e) =>
        e.name === emotionName ? { ...e, weight } : e,
      ),
    );
  }

  function toggleDistortion(id: string) {
    if (selectedDistortions.includes(id)) {
      setSelectedDistortions(selectedDistortions.filter((d) => d !== id));
    } else {
      setSelectedDistortions([...selectedDistortions, id]);
    }
  }

  function incrementReframeCount() {
    const next = autoReframeCount + 1;
    setAutoReframeCount(next);
    safeSetItem('momentum_reframe_count', String(next));
    setShowAiOverride(false);
  }

  async function handleReframeLater(remindHours: number | null) {
    setShowReframeLaterPicker(false);
    setLoading(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType,
          situation,
          emotionsJson: JSON.stringify(selectedEmotions),
          automaticThought: entryType === 'negative' ? thought : null,
          distortionsJson: entryType === 'negative' ? JSON.stringify(selectedDistortions) : null,
          reframedThought: '[Pending Reframe]',
        }),
      });
      const resData = await res.json().catch(() => ({}));
      try {
        const existing = JSON.parse(localStorage.getItem('momentum_journal_entries') || '[]');
        const pendingEntry = {
          id: resData?.data?.[0]?.id ?? Date.now(),
          createdAt: new Date().toISOString(),
          entryType,
          situation,
          emotionsJson: JSON.stringify(selectedEmotions),
          automaticThought: entryType === 'negative' ? thought : null,
          distortionsJson: entryType === 'negative' ? JSON.stringify(selectedDistortions) : null,
          reframedThought: '[Pending Reframe]',
        };
        localStorage.setItem('momentum_journal_entries', JSON.stringify([pendingEntry, ...existing].slice(0, 100)));
      } catch { /* best-effort */ }
    } catch { /* best-effort */ } finally {
      setLoading(false);
    }
    if (remindHours !== null) {
      safeSetItem('momentum_pending_reframe', JSON.stringify({
        remindAt: Date.now() + remindHours * 3_600_000,
        situation,
        thought,
      }));
    }
    // Clear auto-saved draft
    try {
      localStorage.removeItem('momentum_journal_draft');
    } catch { /* best-effort */ }
    setDraftRecoveryBanner(null);

    // Reset wizard and go home
    setStep(1); setSituation(''); setSelectedEmotions([]);
    setThought(''); setSelectedDistortions([]); setSuggestedTraps([]);
    setAlternativeThought(''); setInsightsData(null);
    setSelectedExercise(null);
    router.push('/');
  }


  async function handleAnalyzeThoughts() {
    if (!thought.trim()) return;

    setCrisis(false);
    setAiError(null);

    if (checkSafety(thought) || checkSafety(situation)) {
      setCrisis(true);
      return;
    }

    // Run local heuristic detection synchronously on click (no debounce/background call)
    const heuristicFound = findDistortions(thought);
    setLocalDistortions(heuristicFound);
    const heuristicIds = heuristicFound.map((d) => d.id);

    setLoading(true);

    try {
      const emotionsListStr = selectedEmotions
        .map((e) => `${e.name} (${e.weight}%)`)
        .join(", ");
      const promptToAnalyze = `Situation: ${situation}\nThought: ${thought}\nEmotions: ${emotionsListStr}`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToAnalyze, type: "journal" }),
      });

      const data = await res.json();
      if (!res.ok || data.fallback || !data.result) {
        const isRateLimit = res.status === 429;
        const e = new Error(data.error || "Gemini API unavailable") as any;
        e.isRateLimit = isRateLimit;
        throw e;
      }

      if (data.result) {
        const aiDistortions = (data.result.distortions || [])
          .map((name: string) => {
            const lower = name.toLowerCase();
            if (
              lower.includes("all-or-nothing") ||
              lower.includes("all or nothing") ||
              lower.includes("black-and-white") ||
              lower.includes("black and white") ||
              lower.includes("allornothing")
            )
              return "all-or-nothing";
            if (
              lower.includes("catastrophiz") ||
              lower.includes("worst-case") ||
              lower.includes("worst case")
            )
              return "catastrophizing";
            if (
              lower.includes("should") ||
              lower.includes("must") ||
              lower.includes("ought") ||
              lower.includes("have to")
            )
              return "should-statements";
            if (
              lower.includes("mind") ||
              lower.includes("reading") ||
              lower.includes("read mind")
            )
              return "mind-reading";
            if (
              lower.includes("emotional") ||
              lower.includes("reasoning") ||
              lower.includes("feel like")
            )
              return "emotional-reasoning";
            if (
              lower.includes("overgeneral") ||
              lower.includes("always") ||
              lower.includes("never") ||
              lower.includes("generaliz")
            )
              return "overgeneralization";
            return null;
          })
          .filter(Boolean) as string[];

        setInsightsData({
          insights:
            "Analysis complete. Review the suggested cognitive distortions and compassionate reframes.",
          reframeSuggestions: data.result.reframed_thought
            ? [data.result.reframed_thought]
            : [],
          suggestedDistortions: aiDistortions,
          friend_test_reframe: data.result.friend_test_reframe || "",
          fact_checking_reframe: data.result.fact_checking_reframe || "",
          perspective_reset_reframe: data.result.perspective_reset_reframe || "",
        });

        if (data.result.reframed_thought) {
          setAlternativeThought(data.result.reframed_thought);
        }

        const combinedDistortions = Array.from(
          new Set([...heuristicIds, ...aiDistortions]),
        );
        setSuggestedTraps(combinedDistortions);
        setSelectedDistortions(combinedDistortions);
        setStep(4);
      }
    } catch (err: any) {
      console.warn("AI CBT Analysis offline, falling back to manual selection:", err);
      setAiError("AI analysis unavailable right now. Select your traps below.");
      // Surface heuristic hints only — never pre-select traps for the user
      setSuggestedTraps(heuristicIds);
      setSelectedDistortions([]);
      setInsightsData(null);
      setShowManualPicker(true); // auto-expand the manual picker so user isn't blocked
      setStep(4);
    } finally {
      setLoading(false);
    }
  }


  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setLoading(true);

    try {
      const reframeToSave = alternativeThought.trim();
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType,
          situation,
          emotionsJson: JSON.stringify(selectedEmotions),
          automaticThought: entryType === "negative" ? thought : null,
          distortionsJson:
            entryType === "negative"
              ? JSON.stringify(selectedDistortions)
              : null,
          reframedThought: reframeToSave,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("SERVER SIDE REJECTION ERROR DETECTED:", errorData);
        setSaveError(
          `Could not save: ${errorData.message || errorData.error || "Unknown server error"}. Please try again.`,
        );
        return;
      }

      const savedData = await response.json().catch(() => ({}));

      // Persist to localStorage so WellnessGraphs and other components can read it
      try {
        const existing = JSON.parse(localStorage.getItem("momentum_journal_entries") || "[]");
        const newEntry = {
          id: savedData?.data?.[0]?.id ?? Date.now(),
          createdAt: new Date().toISOString(),
          entryType,
          situation,
          emotionsJson: JSON.stringify(selectedEmotions),
          automaticThought: entryType === "negative" ? thought : null,
          distortionsJson: entryType === "negative" ? JSON.stringify(selectedDistortions) : null,
          reframedThought: reframeToSave,
        };
        localStorage.setItem("momentum_journal_entries", JSON.stringify([newEntry, ...existing].slice(0, 100)));
      } catch { /* best-effort */ }

      // Award +25 resilience points for journal thought record
      awardPoints(POINT_VALUES.JOURNAL_THOUGHT_RECORD);

      // Clear any pending reframe reminder (it's now complete)
      safeRemoveItem('momentum_pending_reframe');

      // ── Infer dominant triangle corner ──
      const corners: TriangleCorner[] = [];
      const avgWeight = selectedEmotions.length > 0
        ? selectedEmotions.reduce((s, e) => s + e.weight, 0) / selectedEmotions.length
        : 0;
      if (selectedEmotions.length >= 3 || avgWeight >= 65) corners.push('feelings');
      if (selectedDistortions.length >= 1) corners.push('thoughts');
      const behaviorKeywords = ['avoid', 'cancel', 'procrastin', "didn't", 'gave up', 'stopped', 'skipped', 'hide', 'escape', 'withdrew', 'isolat'];
      if (behaviorKeywords.some(kw => situation.toLowerCase().includes(kw))) corners.push('behaviors');
      if (corners.length === 0) corners.push('thoughts'); // fallback

      setCompletionSituation(situation);
      setDominantCorners(corners);
      setShowCompletion(true);
      fetchHistory();

      // Clear draft auto-save
      try {
        localStorage.removeItem('momentum_journal_draft');
      } catch { /* best-effort */ }
      setDraftRecoveryBanner(null);

      // Reset wizard fields (do NOT setStep(1) simultaneously while showCompletion is active)
      setSituation("");
      setSelectedEmotions([]);
      setThought("");
      setSelectedDistortions([]);
      setSuggestedTraps([]);
      setAlternativeThought("");
      setInsightsData(null);
      setSelectedExercise(null);
      setShowAiOverride(false);
      setAiError(null);
      setShowManualPicker(false);
    } catch (clientError: any) {
      console.error("CLIENT SIDE RUNTIME CRASH DETECTED:", clientError);
      setSaveError(`Could not save your entry: ${clientError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveOutcome(entryId: number) {
    if (!tempOutcomeText.trim()) return; // silently ignore — placeholder tells user what to do
    setSavingOutcomeId(entryId);
    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeText: tempOutcomeText,
          lessonsLearned: tempLessonsLearned,
          predictionEvaluation: tempEvaluation,
        }),
      });
      if (res.ok) {
        setHistory(
          history.map((item) => {
            if (item.id === entryId) {
              return {
                ...item,
                outcomeText: tempOutcomeText,
                lessonsLearned: tempLessonsLearned,
                predictionEvaluation: tempEvaluation,
              };
            }
            return item;
          }),
        );
        setEditingId(null);
        setTempOutcomeText("");
        setTempLessonsLearned("");
        setTempEvaluation("Much better than expected");
      } else {
        const data = await res.json();
        console.warn("Failed to save outcome:", data.error || "Server error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingOutcomeId(null);
    }
  }

  const handleCompleteCloseLoop = useCallback((entryId: number, result: CloseLoopResult) => {
    setHistory((prev) =>
      prev.map((item) => {
        if (item.id === entryId) {
          return {
            ...item,
            outcomeText: result.outcomeText,
            predictionEvaluation: result.predictionEvaluation,
            loopAccuracy: result.accuracyLevel,
            reliefRating: result.reliefRating,
            loopClosedAt: result.completedAt,
          };
        }
        return item;
      })
    );

    // Also notify server via PATCH
    fetch(`/api/journal/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcomeText: result.outcomeText,
        predictionEvaluation: result.predictionEvaluation,
      }),
    }).catch((err) => console.warn("Background journal outcome PATCH failed:", err));
  }, []);



  const selectedDistortionNames = selectedDistortions
    .map((id) => DISTORTIONS.find((d) => d.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: "2rem", paddingBottom: "10rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1
              style={{
                color: "var(--sage-green)",
                marginBottom: "0.5rem",
                fontSize: "2.5rem",
                fontWeight: 600,
              }}
            >
              CBT Journal
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#555", margin: 0 }}>
              Gently analyze difficult moments using Cognitive Behavioral Therapy,
              or log positive victories.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>🏆</span>
            <div>
              <span style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Resilience Points
              </span>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#15803d" }}>
                {pointsLoaded ? resiliencePoints : 0} pts
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/"
          style={{
            color: "var(--soft-blue)",
            textDecoration: "none",
            fontWeight: 600,
            display: "inline-block",
            marginTop: "1rem",
          }}
        >
          &larr; Back to Dashboard
        </Link>
      </header>

      {crisis && (
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "var(--radius)",
            marginBottom: "2rem",
            borderLeft: "4px solid #991b1b",
          }}
        >
          <strong style={{ display: "block", marginBottom: "0.5rem" }}>
            Safety Alert:
          </strong>
          We noticed you might be in distress. Momentum is a self-help tool.
          Please contact professional help immediately. <br />
          <br />
          <strong>Call or text 988, or text HOME to 741741 for free, 24/7 crisis support.</strong>
        </div>
      )}

      {/* ── Pending Reframe Reminder Banner ── */}
      {pendingReframeBanner && (
        <div style={{ padding: "1rem 1.25rem", backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderLeft: "4px solid #f59e0b", borderRadius: "var(--radius)", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <strong style={{ color: "#92400e", fontSize: "0.9rem", display: "block", marginBottom: "0.25rem" }}>
              ⏰ Pending Reframe — reminder from {pendingReframeBanner.ago}
            </strong>
            <span style={{ color: "#78350f", fontSize: "0.85rem" }}>
              "{pendingReframeBanner.situation.slice(0, 80)}{pendingReframeBanner.situation.length > 80 ? '…' : ''}"
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" onClick={() => {
              setSituation(pendingReframeBanner.situation);
              setThought(pendingReframeBanner.thought);
              setStep(5);
              setPendingReframeBanner(null);
            }} style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem", backgroundColor: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
              Open Reframe
            </button>
            <button type="button" onClick={() => { safeRemoveItem('momentum_pending_reframe'); setPendingReframeBanner(null); }} style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem", background: "transparent", color: "#92400e", border: "1px solid #fcd34d", borderRadius: "8px", cursor: "pointer", minHeight: "44px" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {!showCompletion && (
        <div style={{ display: "flex", gap: "5px", marginBottom: "2rem" }}>
          {entryType === "negative"
            ? [1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  style={{
                    height: "6px",
                    flex: 1,
                    backgroundColor: s <= step ? "var(--sage-green)" : "#e5e7eb",
                    borderRadius: "10px",
                    transition: "background-color 0.3s ease",
                  }}
                />
              ))
            : [1, 2, 3].map((s) => {
                const mappedStep = s === 1 ? 1 : s === 2 ? 2 : 5;
                return (
                  <div
                    key={s}
                    style={{
                      height: "6px",
                      flex: 1,
                      backgroundColor:
                        mappedStep <= step ? "var(--sage-green)" : "#e5e7eb",
                      borderRadius: "10px",
                      transition: "background-color 0.3s ease",
                    }}
                  />
                );
              })}
        </div>
      )}

      <div
        style={{
          backgroundColor: "#fff",
          padding: "2rem",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "3rem",
        }}
      >
        {!showCompletion ? (
          <>
            {step === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* ── Draft Auto-Save Recovery Banner ── */}
            {draftRecoveryBanner && (
              <div
                style={{
                  padding: "0.9rem 1.15rem",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderLeft: "4px solid #f59e0b",
                  borderRadius: "8px",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <strong style={{ color: "#92400e", fontSize: "0.88rem", display: "block", marginBottom: "0.2rem" }}>
                    📝 Unfinished Reflection from {draftRecoveryBanner.timeStr}
                  </strong>
                  <span style={{ color: "#78350f", fontSize: "0.82rem" }}>
                    "{draftRecoveryBanner.situation.slice(0, 40)}{draftRecoveryBanner.situation.length > 40 ? '…' : ''}"
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const d = draftRecoveryBanner.data;
                      if (d) {
                        if (d.entryType) setEntryType(d.entryType);
                        if (d.situation !== undefined) setSituation(d.situation);
                        if (Array.isArray(d.selectedEmotions)) setSelectedEmotions(d.selectedEmotions);
                        if (d.thought !== undefined) setThought(d.thought);
                        if (Array.isArray(d.selectedDistortions)) setSelectedDistortions(d.selectedDistortions);
                        if (d.alternativeThought !== undefined) setAlternativeThought(d.alternativeThought);
                        if (d.selectedExercise !== undefined) setSelectedExercise(d.selectedExercise);
                        if (d.step) setStep(d.step);
                      }
                      setDraftRecoveryBanner(null);
                    }}
                    style={{
                      padding: "0.4rem 0.85rem",
                      fontSize: "0.82rem",
                      backgroundColor: "#f59e0b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Resume Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem('momentum_journal_draft');
                      } catch { /* best-effort */ }
                      setDraftRecoveryBanner(null);
                    }}
                    style={{
                      padding: "0.4rem 0.85rem",
                      fontSize: "0.82rem",
                      background: "transparent",
                      color: "#92400e",
                      border: "1px solid #fcd34d",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Discard Draft
                  </button>
                </div>
              </div>
            )}

            <h3
              style={{
                fontSize: "1.4rem",
                marginBottom: "1.5rem",
                color: "var(--foreground)",
              }}
            >
              Step 1: Choose Reflection Type
            </h3>

            {/* Entry Type Toggle */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "2rem",
                backgroundColor: "#f1f5f9",
                padding: "0.35rem",
                borderRadius: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setEntryType("negative");
                  setSituation("");
                }}
                style={{
                  flex: 1,
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor:
                    entryType === "negative" ? "#fff" : "transparent",
                  color:
                    entryType === "negative" ? "var(--foreground)" : "#666",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  boxShadow:
                    entryType === "negative"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                💭 CBT Thought Record (Difficult Moment)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryType("positive");
                  setSituation("");
                }}
                style={{
                  flex: 1,
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor:
                    entryType === "positive" ? "#fff" : "transparent",
                  color:
                    entryType === "positive" ? "var(--foreground)" : "#666",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  boxShadow:
                    entryType === "positive"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                🏆 Victory Reflection (Positive Moment)
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <h4
                style={{
                  fontSize: "1.1rem",
                  margin: 0,
                  color: "var(--foreground)",
                }}
              >
                {entryType === "positive"
                  ? "What went well today?"
                  : "What happened?"}
              </h4>
              {entryType === "negative" && (
                <button
                  type="button"
                  onClick={() => {
                    setSituation(
                      "I led a major project review meeting at work today, and my director asked two critical questions about our timeline that I couldn't answer immediately. I felt my chest tighten and thought everyone lost confidence in me."
                    );
                  }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Load realistic scenario for demo / recruiter testing"
                >
                  ✨ Load Sample Scenario
                </button>
              )}
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "#666",
                marginBottom: "1.25rem",
              }}
            >
              {entryType === "positive"
                ? "Describe the positive trigger, win, or moment of peace simply and objectively."
                : "Describe the event or trigger simply and objectively, without interpretation."}
            </p>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder={
                entryType === "positive"
                  ? "E.g., I received warm feedback on my presentation from a coworker."
                  : "E.g., My boss sent me an email saying 'We need to talk' without any other context."
              }
              rows={4}
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                fontFamily: "inherit",
                resize: "vertical",
                fontSize: "1.05rem",
                backgroundColor: "#fafafa",
                marginBottom: "1.5rem",
              }}
            />
            <button
              type="button"
              onClick={handleGoToStep2}
              disabled={!situation.trim()}
              style={{ width: "100%" }}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h3
              style={{
                fontSize: "1.4rem",
                marginBottom: "0.5rem",
                color: "var(--foreground)",
              }}
            >
              {entryType === "positive"
                ? "Savoring Emotions"
                : "Step 2: Emotion Wheel"}
            </h3>
            <p
              style={{
                fontSize: "1rem",
                color: "#666",
                marginBottom: "1.5rem",
              }}
            >
              {entryType === "positive"
                ? "Select the positive emotions you felt and rate their intensity."
                : "Click a general emotion to reveal refined feelings. Select all that apply and rate their weights."}
            </p>

            {/* Suggested Emotions Section */}
            {suggestedEmotions.length > 0 && (
                  <div
                    style={{
                      marginBottom: "1.5rem",
                      padding: "1rem",
                      backgroundColor: "#f0f4f8",
                      borderRadius: "var(--radius)",
                      border: "1px solid #d0e2ff",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#004fe6",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Suggested emotions based on your situation:
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      {suggestedEmotions.map((emotion) => {
                        const isSelected = selectedEmotions.some(
                          (e) => e.name === emotion,
                        );
                        return (
                          <button
                            key={emotion}
                            type="button"
                            onClick={() => toggleEmotion(emotion)}
                            style={{
                              padding: "0.4rem 0.8rem",
                              borderRadius: "20px",
                              border: isSelected
                                ? "1px solid var(--soft-blue)"
                                : "1px solid #cce0ff",
                              backgroundColor: isSelected
                                ? "var(--soft-blue)"
                                : "#fff",
                              color: isSelected ? "#fff" : "#004fe6",
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              cursor: "pointer",
                              transition: "all 0.2s",
                              margin: 0,
                            }}
                          >
                            {emotion} {isSelected ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

            {/* Primary Categories */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {PRIMARY_EMOTIONS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setActiveCategory(
                      activeCategory === category ? null : category,
                    )
                  }
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "20px",
                    border:
                      activeCategory === category
                        ? "2px solid var(--sage-green)"
                        : "1px solid #ccc",
                    backgroundColor:
                      activeCategory === category ? "#f0f7f4" : "#fff",
                    color: activeCategory === category ? "#2b5a2b" : "#555",
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 0.2s",
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Secondary Refined Emotions */}
            {activeCategory && (
              <div
                style={{
                  backgroundColor: "#fafafa",
                  padding: "1.5rem",
                  borderRadius: "var(--radius)",
                  border: "1px dashed #ccc",
                  marginBottom: "2rem",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <p
                  style={{
                    margin: "0 0 1rem 0",
                    fontWeight: 500,
                    color: "#555",
                  }}
                >
                  Refining "{activeCategory}":
                </p>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {EMOTION_WHEEL[activeCategory].map((emotion) => {
                    const isSelected = selectedEmotions.some(
                      (e) => e.name === emotion,
                    );
                    return (
                      <button
                        key={emotion}
                        type="button"
                        onClick={() => toggleEmotion(emotion)}
                        style={{
                          padding: "0.4rem 0.8rem",
                          borderRadius: "16px",
                          border: isSelected
                            ? "1px solid var(--soft-blue)"
                            : "1px solid #e0e0e0",
                          backgroundColor: isSelected ? "#e6f0ff" : "#fff",
                          color: isSelected ? "#004fe6" : "#666",
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {emotion}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sliders for Selected Emotions */}
            {selectedEmotions.length > 0 && (
              <div
                style={{
                  margin: "2rem 0",
                  padding: "1.5rem",
                  backgroundColor: "#fcfcfc",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                }}
              >
                <h4 style={{ margin: "0 0 1rem 0", color: "#333" }}>
                  Emotional Intensity Weights:
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  {selectedEmotions.map((emotion) => (
                    <div
                      key={emotion.name}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                    >
                      {/* Responsive layout: mobile (<640px) stacked, desktop (>=640px) single horizontal row */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                        {/* Row 1 on mobile: Label + percentage readout */}
                        <div className="flex items-center justify-between sm:w-[130px] shrink-0">
                          <span className="font-medium text-[0.95rem] text-slate-800">
                            {emotion.name}
                          </span>
                          <span className="sm:hidden font-semibold text-[0.9rem] text-slate-600">
                            {emotion.weight}%
                          </span>
                        </div>

                        {/* Row 2 on mobile: Slider track (+ percentage readout on desktop) */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={emotion.weight}
                            onChange={(e) =>
                              updateEmotionWeight(
                                emotion.name,
                                parseInt(e.target.value),
                              )
                            }
                            className="w-full accent-[#2563eb]"
                            style={{ flex: 1 }}
                          />
                          <span className="hidden sm:inline-block w-[45px] text-right font-semibold text-[0.9rem] text-slate-600">
                            {emotion.weight}%
                          </span>
                        </div>

                        {/* Row 3 on mobile: Centered preset buttons; right-aligned on desktop */}
                        <div className="flex items-center justify-center sm:justify-end gap-1.5 shrink-0">
                          {[25, 50, 75, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => updateEmotionWeight(emotion.name, preset)}
                              style={{
                                padding: "0.2rem 0.6rem",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                borderRadius: "12px",
                                border:
                                  emotion.weight === preset
                                    ? "2px solid var(--soft-blue)"
                                    : "1px solid #d1d5db",
                                backgroundColor:
                                  emotion.weight === preset ? "#e6f0ff" : "#f8fafc",
                                color:
                                  emotion.weight === preset ? "#004fe6" : "#6b7280",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: "transparent",
                  color: "#666",
                  border: "1px solid #ccc",
                  flex: 1,
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(entryType === "positive" ? 5 : 3)}
                disabled={selectedEmotions.length === 0}
                style={{ flex: 2 }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h3
              style={{
                fontSize: "1.4rem",
                marginBottom: "0.5rem",
                color: "var(--foreground)",
              }}
            >
              Step 3: Automatic Thought
            </h3>
            <p
              style={{
                fontSize: "1rem",
                color: "#666",
                marginBottom: "1.5rem",
              }}
            >
              Write down the exact automatic thought or belief that went through
              your mind when the situation occurred.
            </p>
            <textarea
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="E.g., I am going to get fired, or they think my work is terrible."
              rows={4}
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                fontFamily: "inherit",
                resize: "vertical",
                fontSize: "1.05rem",
                backgroundColor: "#fafafa",
                marginBottom: "1.5rem",
              }}
            />

            {/* Local Heuristic warning banner */}
            {localDistortions.length > 0 && (
              <div
                style={{
                  backgroundColor: "#fff3cd",
                  padding: "1rem",
                  borderRadius: "var(--radius)",
                  borderLeft: "4px solid #ffc107",
                  marginBottom: "1.5rem",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    color: "#856404",
                  }}
                >
                  We noticed some potential thinking traps:
                </p>
                <ul
                  style={{
                    margin: "0.5rem 0 0 0",
                    paddingLeft: "1.5rem",
                    fontSize: "0.9rem",
                    color: "#664d03",
                  }}
                >
                  {localDistortions.map((d) => (
                    <li key={d.id} style={{ marginBottom: "0.25rem" }}>
                      <strong>{d.name}:</strong> {d.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  background: "transparent",
                  color: "#666",
                  border: "1px solid #ccc",
                  flex: 1,
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleAnalyzeThoughts}
                disabled={!thought.trim() || loading}
                style={{
                  flex: 2,
                  opacity: !thought.trim() || loading ? 0.7 : 1,
                  cursor: !thought.trim() || loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      className="animate-spin"
                      style={{
                        display: "inline-block",
                        width: "1rem",
                        height: "1rem",
                        border: "2px solid currentColor",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                      }}
                    ></span>
                    Analyzing Thought...
                  </span>
                ) : (
                  "🔍 Analyze Thought"
                )}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h3
              style={{
                fontSize: "1.4rem",
                marginBottom: "0.5rem",
                color: "var(--foreground)",
              }}
            >
              Step 4: Identify Thinking Traps
            </h3>
            <p
              style={{
                fontSize: "1rem",
                color: "#666",
                marginBottom: "1.5rem",
              }}
            >
              Select the cognitive distortions you believe you are experiencing.
              Read the definitions to learn more about them.
            </p>

            {/* Inline AI error note — shown on 429 or network failure */}
            {aiError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderLeft: "4px solid #fb923c",
                  borderRadius: "var(--radius)",
                  marginBottom: "1.5rem",
                  fontSize: "0.9rem",
                  color: "#9a3412",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "1rem" }}>⚠️</span>
                <span>{aiError}</span>
              </div>
            )}

            {loading ? (
              <div
                style={{ padding: "3rem", textAlign: "center", color: "#666" }}
              >
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    border: "3px solid #f3f3f3",
                    borderTop: "3px solid var(--sage-green)",
                    borderRadius: "50%",
                    margin: "0 auto 1rem auto",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                <p>Generating AI suggestions...</p>
              </div>
            ) : (
              <div>
                {/* AI / Heuristic Suggestions Box */}
                {(insightsData?.insights || localDistortions.length > 0) && (
                  <div
                    style={{
                      backgroundColor: "#f0f7f4",
                      padding: "1.5rem",
                      borderRadius: "var(--radius)",
                      borderLeft: "4px solid var(--sage-green)",
                      marginBottom: "2rem",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "#2b5a2b",
                        fontSize: "0.9rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      AI & Heuristic Suggestions
                    </strong>
                    {insightsData?.insights && (
                      <p
                        style={{
                          color: "#333",
                          fontSize: "0.95rem",
                          margin: "0 0 1rem 0",
                          lineHeight: "1.5",
                        }}
                      >
                        {insightsData.insights}
                      </p>
                    )}

                    {localDistortions.length > 0 && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.9rem",
                          color: "#2b5a2b",
                        }}
                      >
                        The system heuristically flagged:{" "}
                        <strong>
                          {localDistortions.map((d) => d.name).join(", ")}
                        </strong>{" "}
                        based on keywords in your thought.
                      </p>
                    )}
                  </div>
                )}

                {/* Clickable suggested traps badges */}
                {suggestedTraps.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "#f0f4f8",
                      padding: "1.25rem",
                      borderRadius: "var(--radius)",
                      borderLeft: "4px solid var(--soft-blue)",
                      marginBottom: "1.5rem",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#1e40af",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Suggested based on your thoughts:
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      {suggestedTraps.map((id) => {
                        const dist = DISTORTIONS.find(
                          (d) =>
                            d.id === id ||
                            d.name.toLowerCase() === id.toLowerCase(),
                        );
                        if (!dist) return null;
                        const isSelected = selectedDistortions.includes(
                          dist.id,
                        );
                        return (
                          <button
                            key={dist.id}
                            type="button"
                            onClick={() => toggleDistortion(dist.id)}
                            style={{
                              padding: "0.4rem 0.8rem",
                              borderRadius: "20px",
                              border: isSelected
                                ? "2px solid var(--soft-blue)"
                                : "1px solid #cce0ff",
                              backgroundColor: isSelected
                                ? "var(--soft-blue)"
                                : "#fff",
                              color: isSelected ? "#fff" : "#004fe6",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            {dist.name} {isSelected ? "✓" : "＋"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Manual Selection Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "1rem",
                    marginBottom: "2rem",
                  }}
                >
                  {DISTORTIONS.map((distortion) => {
                    const isSelected = selectedDistortions.includes(
                      distortion.id,
                    );
                    const isThisSuggested =
                      isSuggested(distortion.id) ||
                      isSuggested(distortion.name);

                    return (
                      <div
                        key={distortion.id}
                        onClick={() => toggleDistortion(distortion.id)}
                        style={{
                          border: isSelected
                            ? "2px solid var(--soft-blue)"
                            : isThisSuggested
                              ? "2px dashed #f59e0b"
                              : "1px solid #e0e0e0",
                          backgroundColor: isSelected
                            ? "#f5f9ff"
                            : isThisSuggested
                              ? "#fffbeb"
                              : "#fff",
                          borderRadius: "var(--radius)",
                          padding: "1.25rem",
                          cursor: "pointer",
                          position: "relative",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected
                            ? "0 2px 8px rgba(0, 79, 230, 0.1)"
                            : isThisSuggested
                              ? "0 2px 8px rgba(245, 158, 11, 0.05)"
                              : "0 1px 3px rgba(0,0,0,0.02)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            {/* Checkbox indicator */}
                            <div
                              style={{
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                border: isSelected ? "none" : "2px solid #ccc",
                                backgroundColor: isSelected
                                  ? "var(--soft-blue)"
                                  : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && (
                                <span
                                  style={{ color: "#fff", fontSize: "0.75rem" }}
                                >
                                  ✓
                                </span>
                              )}
                            </div>
                            <h4
                              style={{
                                margin: 0,
                                color: isSelected ? "#004fe6" : "#222",
                                fontSize: "1.02rem",
                                fontWeight: 600,
                              }}
                            >
                              {distortion.name}
                            </h4>
                          </div>
                          {isThisSuggested && (
                            <span
                              style={{
                                backgroundColor: "#ffc107",
                                color: "#856404",
                                fontSize: "0.7rem",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "10px",
                                fontWeight: 600,
                              }}
                            >
                              Suggested
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.9rem",
                            color: "#666",
                            lineHeight: "1.4",
                          }}
                        >
                          {distortion.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {counterEvidence && (
                  <div
                    style={{
                      margin: "1.5rem 0",
                      padding: "1.25rem",
                      backgroundColor: "#fffdf5",
                      border: "1px solid #fde68a",
                      borderRadius: "var(--radius)",
                      borderLeft: "5px solid #e9c46a",
                      animation: "fadeIn 0.3s ease",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        color: "#b45309",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "0.35rem",
                      }}
                    >
                      ⚖️ Objective Reality-Testing Counter-Evidence
                    </strong>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        color: "#78350f",
                        fontStyle: "italic",
                        lineHeight: "1.4",
                      }}
                    >
                      Remember this historical strength or exception to balance
                      your thoughts: <br />
                      <strong>{counterEvidence}</strong>
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    style={{
                      background: "transparent",
                      color: "#666",
                      border: "1px solid #ccc",
                      flex: 1,
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    style={{ flex: 2 }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <form
            onSubmit={handleSaveEntry}
            style={{ animation: "fadeIn 0.4s ease" }}
          >
            <h3
              style={{
                fontSize: "1.4rem",
                marginBottom: "0.5rem",
                color: "var(--foreground)",
              }}
            >
              {entryType === "positive"
                ? "Step 3: Core Strength & Anchor"
                : "Step 5: Alternative Thought"}
            </h3>

            {entryType === "negative" && selectedDistortions.length > 0 ? (
              <p
                style={{
                  fontSize: "1rem",
                  color: "#666",
                  marginBottom: "1.5rem",
                  lineHeight: "1.5",
                }}
              >
                You identified: <strong>{selectedDistortionNames}</strong>.{" "}
                <br />
                Knowing this, how can you look at this situation more
                realistically or compassionately?
              </p>
            ) : (
              <p
                style={{
                  fontSize: "1rem",
                  color: "#666",
                  marginBottom: "1.5rem",
                  lineHeight: "1.5",
                }}
              >
                {entryType === "positive"
                  ? "What personal strengths helped bring this about? Or how can you anchor and savor this positive feeling?"
                  : "How can you look at this situation more realistically or compassionately?"}
              </p>
            )}

            {/* Alternative Thought Suggestions */}
            {entryType === "negative" && (
              <>
                <div
                  style={{
                    marginBottom: "1.5rem",
                    animation: "fadeIn 0.3s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#444",
                      display: "block",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Context-based Sample Alternative Thoughts (Click to use and
                    modify):
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {/* AI Reframes — gated by soft limit */}
                    {insightsData?.reframeSuggestions && insightsData.reframeSuggestions.length > 0 && (
                      autoReframeCount < 3 || showAiOverride ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                            <span style={{ fontSize: "0.78rem", color: "#888" }}>AI Suggestion</span>
                            <span style={{ fontSize: "0.75rem", color: autoReframeCount >= 2 ? "#f59e0b" : "#aaa", fontWeight: 600 }}>
                              {autoReframeCount}/3 AI reframes used this streak
                            </span>
                          </div>
                          {insightsData.reframeSuggestions.map((suggestion, idx) => (
                            <button
                              key={`ai-${idx}`}
                              type="button"
                              onClick={() => { setAlternativeThought(suggestion); incrementReframeCount(); }}
                              style={{ textAlign: "left", padding: "0.8rem 1rem", borderRadius: "var(--radius)", backgroundColor: "#f0f7f4", border: "1px solid #c2e0c6", color: "#2b5a2b", cursor: "pointer", transition: "all 0.2s", fontSize: "0.95rem", lineHeight: "1.4" }}
                            >
                              "{suggestion}"{" "}
                              <span style={{ float: "right", fontSize: "0.75rem", opacity: 0.6 }}>AI Option</span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div style={{ padding: "1rem 1.25rem", backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", borderLeft: "4px solid #a855f7", borderRadius: "var(--radius)", animation: "fadeIn 0.3s ease" }}>
                          <strong style={{ display: "block", color: "#6b21a8", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
                            🧠 Build the skill yourself first
                          </strong>
                          <p style={{ margin: "0 0 0.75rem 0", color: "#581c87", fontSize: "0.88rem", lineHeight: "1.5" }}>
                            You've used AI reframe 3 times in a row. Writing your own reframe builds the neural pathway faster — try it in the box below. Once you've written something, you can optionally check it against the AI.
                          </p>
                          {alternativeThought.trim().length >= 20 && (
                            <button type="button" onClick={() => setShowAiOverride(true)} style={{ fontSize: "0.82rem", color: "#7c3aed", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                              ✨ Show me AI's take anyway
                            </button>
                          )}
                        </div>
                      )
                    )}

                    {/* Heuristic Reframe */}
                    <button
                      type="button"
                      onClick={() => {
                        const rawSample = getExerciseSample(selectedExercise);
                        // Clean up quotes, questions, or recursive prompt text
                        const cleanSample = rawSample
                          .replace(/^["'\s]+|["'\s]+$/g, "")
                          .replace(/\.+$/g, "");

                        if (selectedExercise === "friend") {
                          setAlternativeThought(
                            `If a close friend came to me and said "${thought}", I would remind them that: ${cleanSample}.`,
                          );
                        } else if (selectedExercise === "fact") {
                          setAlternativeThought(
                            `Objective facts that support "${thought}": \n- \n\nConcrete facts that contradict it: \n- ${cleanSample}.`,
                          );
                        } else if (selectedExercise === "reset") {
                          setAlternativeThought(
                            `Regarding the situation: "${situation}"—if the absolute worst-case scenario happens, my plan to handle it: I will step back, verify the facts calmly, and remember that ${cleanSample.charAt(0).toLowerCase() + cleanSample.slice(1)}.`,
                          );
                        } else {
                          setAlternativeThought(cleanSample.endsWith(".") ? cleanSample : `${cleanSample}.`);
                        }
                      }}
                      style={{
                        textAlign: "left",
                        padding: "0.8rem 1rem",
                        borderRadius: "var(--radius)",
                        backgroundColor: "#f0f4f8",
                        border: "1px solid #bcd0f7",
                        color: "#1e40af",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontSize: "0.95rem",
                        lineHeight: "1.4",
                      }}
                    >
                      "{getExerciseSample()}"{" "}
                      <span
                        style={{
                          float: "right",
                          fontSize: "0.75rem",
                          opacity: 0.6,
                        }}
                      >
                        Coping Option
                      </span>
                    </button>
                  </div>
                </div>

                {/* CBT Prompts to Unlock Deeper Thinking */}
                <div
                  style={{
                    marginBottom: "1.5rem",
                    padding: "1.25rem",
                    backgroundColor: "#fafaf9",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#4a5d4e",
                      display: "block",
                      marginBottom: "0.75rem",
                    }}
                  >
                    💡 CBT Prompts to Unlock Deeper Thinking (Click to copy as
                    template):
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExercise("friend");
                        const fullText = `If a close friend came to me and said "${thought}", I would remind them that: `;
                        setAlternativeThought(fullText);
                      }}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        borderRadius: "6px",
                        backgroundColor:
                          selectedExercise === "friend" ? "#f0fdf4" : "#fff",
                        border:
                          selectedExercise === "friend"
                            ? "2px solid var(--sage-green)"
                            : "1px solid #e2e8f0",
                        cursor: "pointer",
                        fontSize: "0.88rem",
                        color: "#555",
                        transition: "all 0.2s",
                      }}
                      className="prompt-card"
                    >
                      <strong>👥 The Friend Test:</strong> What would you tell a
                      friend who had this exact thought?
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExercise("fact");
                        const fullText = `Objective facts that support "${thought}": \n- \n\nConcrete facts that contradict it: \n- `;
                        setAlternativeThought(fullText);
                      }}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        borderRadius: "6px",
                        backgroundColor:
                          selectedExercise === "fact" ? "#f0fdf4" : "#fff",
                        border:
                          selectedExercise === "fact"
                            ? "2px solid var(--sage-green)"
                            : "1px solid #e2e8f0",
                        cursor: "pointer",
                        fontSize: "0.88rem",
                        color: "#555",
                        transition: "all 0.2s",
                      }}
                      className="prompt-card"
                    >
                      <strong>⚖️ Fact Checking:</strong> What is the objective
                      evidence for and against this automatic thought?
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExercise("reset");
                        const rawSample = getExerciseSample("reset");
                        const cleanSample = rawSample
                          .replace(/^["'\s]+|["'\s]+$/g, "")
                          .replace(/\.+$/g, "");
                        const fullText = `Regarding the situation: "${situation}"—if the absolute worst-case scenario happens, my plan to handle it: I will step back, verify the facts calmly, and remember that ${cleanSample.charAt(0).toLowerCase() + cleanSample.slice(1)}.`;
                        setAlternativeThought(fullText);
                      }}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        borderRadius: "6px",
                        backgroundColor:
                          selectedExercise === "reset" ? "#f0fdf4" : "#fff",
                        border:
                          selectedExercise === "reset"
                            ? "2px solid var(--sage-green)"
                            : "1px solid #e2e8f0",
                        cursor: "pointer",
                        fontSize: "0.88rem",
                        color: "#555",
                        transition: "all 0.2s",
                      }}
                      className="prompt-card"
                    >
                      <strong>💭 Perspective Reset:</strong> If the worst-case
                      scenario happened, how would you cope?
                    </button>
                  </div>
                </div>

                {selectedExercise && (
                  <div
                    style={{
                      marginBottom: "1.5rem",
                      padding: "1.25rem",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bcf0da",
                      borderRadius: "var(--radius)",
                      borderLeft: "5px solid var(--sage-green)",
                      animation: "fadeIn 0.3s ease",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        color: "#166534",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {selectedExercise === "friend" &&
                        "👥 Active Exercise: The Friend Test"}
                      {selectedExercise === "fact" &&
                        "⚖️ Active Exercise: Fact Checking"}
                      {selectedExercise === "reset" &&
                        "💭 Active Exercise: Perspective Reset"}
                    </strong>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        color: "#14532d",
                        lineHeight: "1.5",
                        fontWeight: 500,
                      }}
                    >
                      {selectedExercise === "friend" &&
                        `If a close friend came to you and said: '${thought}', what realistic advice would you give them?`}
                      {selectedExercise === "fact" &&
                        `What are the concrete facts that support '${thought}'? What concrete facts contradict it?`}
                      {selectedExercise === "reset" &&
                        `Regarding the situation: '${situation}'—if the absolute worst-case scenario happens, what is your plan to handle it?`}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Positive CBT Prompts for Savoring */}
            {entryType === "positive" && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1.25rem",
                  backgroundColor: "#fffdf5",
                  borderRadius: "var(--radius)",
                  border: "1px solid #fef3c7",
                }}
              >
                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "#b45309",
                    display: "block",
                    marginBottom: "0.75rem",
                  }}
                >
                  💡 Positive Anchoring Prompts (Click to copy as template):
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setAlternativeThought(
                        `This positive event happened because I used my personal strengths of communication and preparation. I am capable of achieving good results when I put in focus.`,
                      )
                    }
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "#fff",
                      border: "1px solid #fde68a",
                      cursor: "pointer",
                      fontSize: "0.88rem",
                      color: "#78350f",
                      transition: "all 0.2s",
                    }}
                    className="prompt-card"
                  >
                    <strong>🎯 Strength Validation:</strong> What qualities of
                    yours made this win happen?
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAlternativeThought(
                        `I feel incredibly grateful for this coworker's kind feedback. It reminds me that I have supportive people around me who value my effort.`,
                      )
                    }
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "#fff",
                      border: "1px solid #fde68a",
                      cursor: "pointer",
                      fontSize: "0.88rem",
                      color: "#78350f",
                      transition: "all 0.2s",
                    }}
                    className="prompt-card"
                  >
                    <strong>🙏 Gratitude:</strong> Who else contributed to this
                    moment, and what are you thankful for?
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAlternativeThought(
                        `Even when work feels highly stressful, this event shows that good moments can still occur. It is an exception to my negative thoughts.`,
                      )
                    }
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "#fff",
                      border: "1px solid #fde68a",
                      cursor: "pointer",
                      fontSize: "0.88rem",
                      color: "#78350f",
                      transition: "all 0.2s",
                    }}
                    className="prompt-card"
                  >
                    <strong>🔍 Exception to Problem:</strong> How does this win
                    prove that things aren't 100% negative?
                  </button>
                </div>
              </div>
            )}

            {counterEvidence && (
              <div
                style={{
                  margin: "1.5rem 0",
                  padding: "1.25rem",
                  backgroundColor: "#fffdf5",
                  border: "1px solid #fde68a",
                  borderRadius: "var(--radius)",
                  borderLeft: "5px solid #e9c46a",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    color: "#b45309",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "0.35rem",
                  }}
                >
                  ⚖️ Objective Reality-Testing Counter-Evidence
                </strong>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    color: "#78350f",
                    fontStyle: "italic",
                    lineHeight: "1.4",
                  }}
                >
                  Remember this historical strength or exception to balance your
                  thoughts: <br />
                  <strong>{counterEvidence}</strong>
                </p>
              </div>
            )}

            <textarea
              value={alternativeThought}
              onChange={(e) => setAlternativeThought(e.target.value)}
              placeholder={
                entryType === "positive"
                  ? "Describe your strengths, who you are grateful for, or how you want to remember this win."
                  : selectedExercise === "friend"
                    ? "Based on the Friend Test, my alternative thought is..."
                    : selectedExercise === "fact"
                      ? "Based on Fact Checking, my alternative thought is..."
                      : selectedExercise === "reset"
                        ? "Based on Perspective Reset, my alternative thought is..."
                        : "Type your reframed, realistic thought here..."
              }
              rows={4}
              required
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                fontFamily: "inherit",
                resize: "vertical",
                fontSize: "1.05rem",
                backgroundColor: "#fafafa",
                marginBottom: "1.5rem",
              }}
            />

            {/* Button row */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => { setStep(entryType === "positive" ? 2 : 4); setSelectedExercise(null); }}
                style={{ background: "transparent", color: "#666", border: "1px solid #ccc", flex: 1, minWidth: "80px" }}
              >
                Back
              </button>
              {entryType === "negative" && (
                <button
                  type="button"
                  onClick={() => setShowReframeLaterPicker(true)}
                  style={{ flex: 1, minWidth: "120px", background: "transparent", color: "#92400e", border: "1px solid #fcd34d", backgroundColor: "#fffbeb" }}
                >
                  ⏰ Reframe Later
                </button>
              )}
              <button type="submit" disabled={loading} style={{ flex: 2, minWidth: "140px" }}>
                {loading ? "Saving..." : "Save Entry & Finish"}
              </button>
            </div>

            {/* Inline save error — replaces alert() popups */}
            {saveError && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderLeft: "4px solid #ef4444",
                  borderRadius: "var(--radius)",
                  fontSize: "0.9rem",
                  color: "#991b1b",
                }}
              >
                {saveError}
              </div>
            )}

            {/* Reframe Later time picker */}
            {showReframeLaterPicker && (
              <div style={{ marginTop: "1rem", padding: "1.25rem", backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "var(--radius)", animation: "fadeIn 0.3s ease" }}>
                <strong style={{ display: "block", color: "#92400e", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
                  ⏰ When should we remind you to come back and reframe this?
                </strong>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => handleReframeLater(6)} style={{ padding: "0.5rem 1.1rem", backgroundColor: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                    In 6 Hours
                  </button>
                  <button type="button" onClick={() => handleReframeLater(12)} style={{ padding: "0.5rem 1.1rem", backgroundColor: "#d97706", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                    In 12 Hours
                  </button>
                  <button type="button" onClick={() => handleReframeLater(null)} style={{ padding: "0.5rem 1.1rem", background: "transparent", color: "#78350f", border: "1px solid #fcd34d", borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem" }}>
                    Save without reminder
                  </button>
                  <button type="button" onClick={() => setShowReframeLaterPicker(false)} style={{ padding: "0.5rem 0.75rem", background: "none", color: "#aaa", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </>
    ) : (
      /* ── Completion Insight Card ── */
      <div style={{ animation: "fadeIn 0.5s ease" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "2.5rem" }}>✅</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", margin: "0.5rem 0 0.25rem" }}>
                Entry Saved
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
                Here's what your entry reveals about your CBT triangle today.
              </p>
            </div>

            {/* Mini CBT Triangle SVG */}
            {(() => {
              const APEX = {
                thoughts:  { x: 200, y: 30,  label: '💭 Thoughts',  active: '#2563eb', rest: '#bfdbfe' },
                feelings:  { x: 370, y: 310, label: '❤️ Feelings',  active: '#f43f5e', rest: '#fecdd3' },
                behaviors: { x: 30,  y: 310, label: '🏃 Behaviors', active: '#10b981', rest: '#a7f3d0' },
              } as const;
              const corners = ['thoughts','feelings','behaviors'] as const;
              const isDominant = (k: string) => dominantCorners.includes(k as TriangleCorner);
              const cornerNotes: Record<string, { title: string; body: string }> = {
                thoughts: {
                  title: 'Your Thoughts corner is most active today.',
                  body: `You identified ${dominantCorners.includes('thoughts') ? 'cognitive distortions' : 'patterns'} in your thinking. This is the most powerful lever — the thinking patterns you spotted today are the exact ones that fuel emotional distress and avoidance. Each time you name them, their grip weakens.`,
                },
                feelings: {
                  title: 'Your Feelings corner is most active today.',
                  body: 'High-intensity emotions were a central feature of this entry. Feelings are the output — they\'re generated by your thoughts and sustained by behaviors. You can\'t switch them off directly, but you just took a key step: naming and mapping them reduces amygdala activation.',
                },
                behaviors: {
                  title: 'Your Behaviors corner is most active today.',
                  body: 'Your situation description suggests behavioral patterns (avoidance, withdrawal, or cancellation) may be reinforcing the cycle. Behaviors are the highest-leverage intervention point — even a 5-minute opposite action creates real counter-evidence that updates both your thoughts and feelings.',
                },
              };
              const primaryCorner = dominantCorners[0] ?? 'thoughts';
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                  <svg viewBox="0 0 400 340" width="100%" style={{ maxWidth: "340px" }}>
                    {/* Edges */}
                    <line x1={200} y1={30} x2={370} y2={310} stroke="#e2e8f0" strokeWidth="2"/>
                    <line x1={200} y1={30} x2={30}  y2={310} stroke="#e2e8f0" strokeWidth="2"/>
                    <line x1={30}  y1={310} x2={370} y2={310} stroke="#e2e8f0" strokeWidth="2"/>
                    {/* Apex nodes */}
                    {corners.map(k => {
                      const a = APEX[k];
                      const active = isDominant(k);
                      return (
                        <g key={k}>
                          <circle cx={a.x} cy={a.y} r={active ? 28 : 22} fill={active ? a.active : a.rest} opacity={active ? 1 : 0.5}/>
                          {active && <circle cx={a.x} cy={a.y} r={34} fill="none" stroke={a.active} strokeWidth="2" opacity="0.3"/>}
                          <text x={a.x} y={a.y + 5} textAnchor="middle" fontSize={active ? "11" : "9"} fill={active ? "#fff" : "#64748b"} fontWeight={active ? "700" : "400"}>
                            {a.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Clinical note */}
                  <div style={{ width: "100%", padding: "1.25rem 1.5rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: `4px solid ${dominantCorners.includes('thoughts') ? '#2563eb' : dominantCorners.includes('feelings') ? '#f43f5e' : '#10b981'}`, borderRadius: "var(--radius)" }}>
                    <strong style={{ display: "block", marginBottom: "0.4rem", color: "#1e293b", fontSize: "0.95rem" }}>
                      {cornerNotes[primaryCorner].title}
                    </strong>
                    <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem", lineHeight: "1.6" }}>
                      {cornerNotes[primaryCorner].body}
                    </p>
                    {dominantCorners.length > 1 && (
                      <p style={{ margin: "0.75rem 0 0", color: "#64748b", fontSize: "0.85rem", fontStyle: "italic" }}>
                        Also active: {dominantCorners.slice(1).map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' & ')}
                      </p>
                    )}
                  </div>

                  {/* Navigation */}
                  <div style={{ display: "flex", gap: "0.75rem", width: "100%", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => { setShowCompletion(false); setStep(1); router.push('/'); router.refresh(); }} style={{ flex: 2 }}>
                      Go to Dashboard
                    </button>
                    <Link href="/toolkit" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0.65rem 1rem", borderRadius: "var(--radius)", border: "1px solid #e2e8f0", color: "#2563eb", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600, textAlign: "center" }}>
                      Explore Triangle →
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* History section */}
      <div style={{ marginTop: "3rem" }}>
        <h2
          style={{
            fontSize: "1.6rem",
            color: "var(--foreground)",
            marginBottom: "1.5rem",
            fontWeight: 600,
          }}
        >
          Reflective History
        </h2>

        {fetching ? (
          <p>Loading your journal...</p>
        ) : history.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              backgroundColor: "#fff",
              borderRadius: "var(--radius)",
              border: "1px dashed var(--border)",
            }}
          >
            <p style={{ color: "#888", fontSize: "1.1rem" }}>
              No records yet. Start your first CBT session above.
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {history.map((item) => {
              const isPositive = item.entryType === "positive";

              let emotions = [];
              try {
                emotions = item.emotionsJson
                  ? JSON.parse(item.emotionsJson)
                  : [];
              } catch (e) {
                console.error("Failed to parse emotions", e);
              }

              let distortions = [];
              try {
                distortions = item.distortionsJson
                  ? JSON.parse(item.distortionsJson)
                  : [];
              } catch (e) {
                console.error("Failed to parse distortions", e);
              }

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    padding: "1.5rem",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
                    borderLeft: isPositive
                      ? "5px solid #e9c46a"
                      : "5px solid var(--sage-green)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.85rem",
                      color: "#888",
                      marginBottom: "1rem",
                      borderBottom: "1px solid #eee",
                      paddingBottom: "0.5rem",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <span>
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      {!isPositive && (
                        item.outcomeText ? (
                          <span
                            style={{
                              backgroundColor:
                                item.loopAccuracy === "Exactly as Feared" ||
                                item.predictionEvaluation === "Worse than expected"
                                  ? "#fff7ed"
                                  : item.loopAccuracy === "Partially True" ||
                                    item.predictionEvaluation === "As expected"
                                    ? "#fefce8"
                                    : "#f0fdf4",
                              color:
                                item.loopAccuracy === "Exactly as Feared" ||
                                item.predictionEvaluation === "Worse than expected"
                                  ? "#c2410c"
                                  : item.loopAccuracy === "Partially True" ||
                                    item.predictionEvaluation === "As expected"
                                    ? "#a16207"
                                    : "#15803d",
                              padding: "0.15rem 0.65rem",
                              borderRadius: "10px",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              border: `1px solid ${
                                item.loopAccuracy === "Exactly as Feared" ||
                                item.predictionEvaluation === "Worse than expected"
                                  ? "#fdba74"
                                  : item.loopAccuracy === "Partially True" ||
                                    item.predictionEvaluation === "As expected"
                                    ? "#fde047"
                                    : "#86efac"
                              }`,
                            }}
                          >
                            {item.loopAccuracy === "Completely False / Disproved" ||
                            item.predictionEvaluation === "Much better than expected"
                              ? "✅ Reality Tested (Belief Disproved)"
                              : item.loopAccuracy === "Partially True" ||
                                item.predictionEvaluation === "As expected"
                                ? "⚖️ Reality Tested (Partially True)"
                                : item.loopAccuracy === "Exactly as Feared" ||
                                  item.predictionEvaluation === "Worse than expected"
                                  ? "⚠️ Reality Tested (Exactly as Feared)"
                                  : "✅ Reality Tested"}
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: "#fff7ed",
                              color: "#c2410c",
                              padding: "0.15rem 0.65rem",
                              borderRadius: "10px",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              border: "1px solid #fdba74",
                            }}
                          >
                            ⏳ Open Loop
                          </span>
                        )
                      )}
                      <span
                        style={{
                          backgroundColor: isPositive ? "#fffbeb" : "#f0f7f4",
                          color: isPositive ? "#b45309" : "#2b5a2b",
                          padding: "0.15rem 0.6rem",
                          borderRadius: "10px",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          border: isPositive
                            ? "1px solid #fde68a"
                            : "1px solid #c2e0c6",
                        }}
                      >
                        {isPositive
                          ? "🏆 Victory Reflection"
                          : "💭 CBT Thought Record"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "0.72rem",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                          fontWeight: 700,
                          fontFamily: "sans-serif",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {isPositive
                          ? "The Win / Event"
                          : "The Triggering Situation"}
                      </strong>
                      <p
                        style={{
                          margin: 0,
                          color: "#0f172a",
                          fontSize: "1rem",
                          lineHeight: "1.65",
                          fontWeight: 600,
                          fontFamily: "sans-serif",
                        }}
                      >
                        {item.situation}
                      </p>
                    </div>

                    {!isPositive && item.automaticThought && (
                      <div>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "0.72rem",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.8px",
                            fontWeight: 700,
                            fontFamily: "sans-serif",
                            marginBottom: "0.2rem",
                          }}
                        >
                          Automatic Thought
                        </strong>
                        <p
                          style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: "1rem",
                            lineHeight: "1.65",
                            fontWeight: 600,
                            fontFamily: "sans-serif",
                          }}
                        >
                          {item.automaticThought}
                        </p>
                      </div>
                    )}

                    {emotions.length > 0 && (
                      <div>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "0.78rem",
                            color: "#777",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Emotions
                        </strong>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.4rem",
                          }}
                        >
                          {emotions.map((e: SelectedEmotion, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                backgroundColor: isPositive
                                  ? "#fffbeb"
                                  : "#f0f4f8",
                                color: isPositive ? "#b45309" : "#1e40af",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "12px",
                                fontSize: "0.8rem",
                                border: isPositive
                                  ? "1px solid #fde68a"
                                  : "1px solid #d0e2ff",
                              }}
                            >
                              {e.name}: {e.weight}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isPositive && distortions.length > 0 && (
                      <div>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "0.78rem",
                            color: "#777",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Thinking Traps
                        </strong>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.4rem",
                          }}
                        >
                          {distortions.map((d: string, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                backgroundColor: "#fffdf5",
                                color: "#b45309",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "12px",
                                fontSize: "0.8rem",
                                border: "1px solid #fde68a",
                                fontWeight: 500,
                              }}
                            >
                              {DISTORTIONS.find((dist) => dist.id === d)
                                ?.name || d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "0.72rem",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                          fontWeight: 700,
                          fontFamily: "sans-serif",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {isPositive
                          ? "Core Strength / Savoring Anchor"
                          : "Reframed Thought"}
                      </strong>
                      <p
                        style={{
                          margin: 0,
                          color: isPositive ? "#451a03" : "#1e3a1e",
                          backgroundColor: isPositive ? "#fffdf5" : "#f0f7f4",
                          padding: "0.75rem 1rem",
                          borderRadius: "6px",
                          borderLeft: isPositive
                            ? "3px solid #e9c46a"
                            : "3px solid var(--sage-green)",
                          fontSize: "1rem",
                          fontWeight: 600,
                          fontFamily: "sans-serif",
                          fontStyle: "italic",
                          lineHeight: "1.65",
                        }}
                      >
                        {item.reframedThought}
                      </p>
                    </div>

                    {/* Stable Counter-Evidence Box for negative history entries */}
                    {!isPositive &&
                      (() => {
                        const positivePool: string[] = [];
                        history.forEach((h) => {
                          if (h.entryType === "positive" && h.reframedThought) {
                            positivePool.push(
                              `Victory: "${h.reframedThought}"`,
                            );
                          }
                        });
                        positives.forEach((p) => {
                          if (
                            [
                              "Strength Validation",
                              "Exception to Problem",
                            ].includes(p.category) &&
                            p.thoughtText
                          ) {
                            positivePool.push(
                              `${p.category}: "${p.thoughtText}"`,
                            );
                          }
                        });

                        const poolIndex =
                          positivePool.length > 0
                            ? item.id % positivePool.length
                            : -1;
                        const cardCounterEvidence =
                          poolIndex !== -1 ? positivePool[poolIndex] : null;

                        return (
                          cardCounterEvidence && (
                            <div
                              style={{
                                marginTop: "0.5rem",
                                padding: "0.75rem 1rem",
                                backgroundColor: "#fffdf5",
                                border: "1px solid #fde68a",
                                borderRadius: "6px",
                                borderLeft: "3px solid #e9c46a",
                              }}
                            >
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.72rem",
                                  color: "#b45309",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  marginBottom: "0.2rem",
                                }}
                              >
                                ⚖️ Archived Counter-Evidence
                              </span>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "0.85rem",
                                  color: "#78350f",
                                  fontStyle: "italic",
                                }}
                              >
                                "{cardCounterEvidence}"
                              </p>
                            </div>
                          )
                        );
                      })()}

                    {/* Close the Loop / The Evidence Check section */}
                    {!isPositive && (
                      <div
                        style={{
                          marginTop: "1.25rem",
                          paddingTop: "1rem",
                          borderTop: "1px dashed #e2e8f0",
                        }}
                      >
                        {item.outcomeText ? (
                          // If outcome is logged, show it in a beautiful frame
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              padding: "1rem 1.25rem",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              borderLeft: "4px solid #3b82f6",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "0.5rem",
                                flexWrap: "wrap",
                                gap: "0.5rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "#1d4ed8",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                ⚖️ The Evidence Loop (Reality Tested)
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {item.reliefRating !== undefined && item.reliefRating !== null && (
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      padding: "0.12rem 0.5rem",
                                      borderRadius: "10px",
                                      backgroundColor: item.reliefRating >= 7 ? "#dcfce7" : item.reliefRating >= 4 ? "#fef9c3" : "#fee2e2",
                                      color: item.reliefRating >= 7 ? "#15803d" : item.reliefRating >= 4 ? "#a16207" : "#b91c1c",
                                      border: `1px solid ${item.reliefRating >= 7 ? '#86efac' : item.reliefRating >= 4 ? '#fde047' : '#fca5a5'}`,
                                    }}
                                  >
                                    Relief: {item.reliefRating}/10
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    backgroundColor:
                                      item.loopAccuracy === "Exactly as Feared" || item.predictionEvaluation === "Worse than expected"
                                        ? "#fff7ed"
                                        : item.loopAccuracy === "Partially True" || item.predictionEvaluation === "As expected"
                                        ? "#fefce8"
                                        : "#dcfce7",
                                    color:
                                      item.loopAccuracy === "Exactly as Feared" || item.predictionEvaluation === "Worse than expected"
                                        ? "#c2410c"
                                        : item.loopAccuracy === "Partially True" || item.predictionEvaluation === "As expected"
                                        ? "#a16207"
                                        : "#15803d",
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "12px",
                                    border: `1px solid ${
                                      item.loopAccuracy === "Exactly as Feared" || item.predictionEvaluation === "Worse than expected"
                                        ? "#fdba74"
                                        : item.loopAccuracy === "Partially True" || item.predictionEvaluation === "As expected"
                                        ? "#fde047"
                                        : "#86efac"
                                    }`,
                                  }}
                                >
                                  {item.loopAccuracy || item.predictionEvaluation}
                                </span>
                              </div>
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.92rem",
                                color: "#1e293b",
                                lineHeight: 1.5,
                                fontWeight: 500,
                              }}
                            >
                              <strong>What actually happened:</strong> {item.outcomeText}
                            </p>
                            {item.lessonsLearned && (
                              <p
                                style={{
                                  margin: "0.4rem 0 0 0",
                                  fontSize: "0.88rem",
                                  color: "#475569",
                                  lineHeight: 1.4,
                                  fontStyle: "italic",
                                }}
                              >
                                <strong>Takeaway:</strong> {item.lessonsLearned}
                              </p>
                            )}
                            <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => setCloseLoopModalEntryId(item.id)}
                                style={{
                                  padding: "0.3rem 0.75rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: "#475569",
                                  backgroundColor: "#fff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                }}
                              >
                                ✏️ Re-evaluate Reality Check
                              </button>
                            </div>
                          </div>
                        ) : (
                          // If outcome not logged
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              backgroundColor: "#fffbeb",
                              padding: "0.9rem 1.25rem",
                              borderRadius: "10px",
                              border: "1.5px dashed #fde68a",
                              gap: "1rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: "#b45309",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.7px",
                                  display: "block",
                                  marginBottom: "0.2rem",
                                }}
                              >
                                ⏳ Open Loop — Prediction Untested
                              </span>
                              <span
                                style={{
                                  fontSize: "0.88rem",
                                  color: "#78350f",
                                  fontWeight: 500,
                                  lineHeight: 1.4,
                                  display: "block",
                                }}
                              >
                                How did this situation actually turn out in reality? Compare what happened against your automatic thought to earn +40 Resilience Points.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCloseLoopModalEntryId(item.id)}
                              style={{
                                padding: "0.5rem 1.1rem",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                borderRadius: "8px",
                                backgroundColor: "#f59e0b",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                whiteSpace: "nowrap",
                                transition: "all 0.15s",
                              }}
                            >
                              🔬 Close the Loop (+40 pts)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over Close the Loop Modal */}
      {closeLoopModalEntryId !== null && (() => {
        const activeEntry = history.find((e) => e.id === closeLoopModalEntryId);
        if (!activeEntry) return null;
        return (
          <CloseLoopModal
            entryId={activeEntry.id}
            situation={activeEntry.situation}
            automaticThought={activeEntry.automaticThought}
            isOpen={true}
            onClose={() => setCloseLoopModalEntryId(null)}
            onComplete={handleCompleteCloseLoop}
          />
        );
      })()}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .prompt-card { transition: all 0.2s ease-in-out; }
        .prompt-card:hover { border-color: var(--sage-green) !important; background-color: #f6faf7 !important; }
      `,
        }}
      />
    </div>
  );
}
