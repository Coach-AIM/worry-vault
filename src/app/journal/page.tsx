"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkSafety } from "@/lib/safetyIntercept";
import {
  findDistortions,
  DistortionType,
  DISTORTIONS,
} from "@/lib/cbtDistortions";
import { EMOTION_WHEEL, PRIMARY_EMOTIONS } from "@/lib/emotionWheel";

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

  // Default suggested emotions helper
  const getSuggestedEmotions = (situationText: string) => {
    const text = situationText.toLowerCase();
    const suggestions: string[] = [];

    if (entryType === "positive") {
      suggestions.push(
        "Proud",
        "Grateful",
        "Calm",
        "Hopeful",
        "Happy",
        "Content",
        "Energized",
        "Inspired",
      );
      return suggestions;
    }

    if (
      text.includes("work") ||
      text.includes("boss") ||
      text.includes("deadline") ||
      text.includes("test") ||
      text.includes("exam") ||
      text.includes("fail") ||
      text.includes("worry") ||
      text.includes("future") ||
      text.includes("presentation") ||
      text.includes("meeting") ||
      text.includes("job") ||
      text.includes("interview")
    ) {
      suggestions.push("Worried", "Overwhelmed", "Stressed", "Nervous");
    }
    if (
      text.includes("sad") ||
      text.includes("lonely") ||
      text.includes("lose") ||
      text.includes("lost") ||
      text.includes("cry") ||
      text.includes("hurt") ||
      text.includes("breakup") ||
      text.includes("miss") ||
      text.includes("alone")
    ) {
      suggestions.push("Lonely", "Hurt", "Disappointed", "Isolated");
    }
    if (
      text.includes("angry") ||
      text.includes("mad") ||
      text.includes("hate") ||
      text.includes("fight") ||
      text.includes("argue") ||
      text.includes("annoy") ||
      text.includes("rude") ||
      text.includes("unfair") ||
      text.includes("argument")
    ) {
      suggestions.push("Frustrated", "Irritated", "Annoyed", "Mad");
    }
    if (
      text.includes("shame") ||
      text.includes("guilt") ||
      text.includes("sorry") ||
      text.includes("mistake") ||
      text.includes("wrong") ||
      text.includes("blame") ||
      text.includes("stupid") ||
      text.includes("fault")
    ) {
      suggestions.push("Embarrassed", "Remorseful", "Regretful", "Worthless");
    }

    if (suggestions.length === 0) {
      suggestions.push("Stressed", "Overwhelmed", "Worried", "Frustrated");
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

  const getExerciseSample = (exerciseType = selectedExercise) => {
    if (exerciseType === "friend") {
      return "If a friend were facing this, I'd remind them that a single stressful event doesn't define their capability. This is just a temporary challenge, and they are doing the best they can.";
    }
    if (exerciseType === "fact") {
      return "Looking at the actual evidence, the situation is frustrating, but it does not guarantee a total disaster. I have navigated unexpected hurdles successfully in the past.";
    }
    if (exerciseType === "reset") {
      return "Even if the worst-case scenario happens, it is an annoying inconvenience, not an insurmountable catastrophe. I am fully capable of handling the fallout step-by-step.";
    }
    return getHeuristicReframe();
  };

  const [loading, setLoading] = useState(false);
  const [loadingEmotions, setLoadingEmotions] = useState(false);
  const [apiSuggestedEmotions, setApiSuggestedEmotions] = useState<string[]>(
    [],
  );
  const [fetching, setFetching] = useState(true);
  const [crisis, setCrisis] = useState(false);

  async function handleGoToStep2() {
    if (!situation.trim()) return;

    if (checkSafety(situation)) {
      setCrisis(true);
      return;
    }

    setLoadingEmotions(true);
    setStep(2); // Go to step 2 immediately for a responsive UI

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: situation, type: "emotions" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gemini API Error");
      }
      if (data.result && Array.isArray(data.result)) {
        const names = data.result.map((item: any) => item.name);
        setApiSuggestedEmotions(names);
      }
    } catch (err: any) {
      console.error("Failed to retrieve AI emotions:", err);
      alert(
        `AI Emotion Analysis Failed: ${err.message || "Gemini API Error. Check your environment variables."}`,
      );
    } finally {
      setLoadingEmotions(false);
    }
  }

  async function fetchHistory() {
    setFetching(true);
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      if (data.entries) setHistory(data.entries);
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
  }, []);

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

  // Delayed Heuristic Distortion Highlighting logic for step 3
  useEffect(() => {
    if (step !== 3) return;

    const timeoutId = setTimeout(() => {
      if (thought.trim()) {
        const found = findDistortions(thought);
        setLocalDistortions(found);
        setSuggestedTraps(found.map((d) => d.id));
      } else {
        setLocalDistortions([]);
        setSuggestedTraps([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [thought, step]);

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

  async function handleAnalyzeThoughts() {
    if (!thought.trim()) return;

    setCrisis(false);

    if (checkSafety(thought) || checkSafety(situation)) {
      setCrisis(true);
      return;
    }

    setStep(4);
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
      if (!res.ok) {
        throw new Error(data.error || "Gemini API Error");
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
        });

        if (data.result.reframed_thought) {
          setAlternativeThought(data.result.reframed_thought);
        }

        const heuristicDistortions = localDistortions.map((ld) => ld.id);
        const combinedDistortions = Array.from(
          new Set([...heuristicDistortions, ...aiDistortions]),
        );
        setSuggestedTraps(combinedDistortions);
        setSelectedDistortions(combinedDistortions);
      }
    } catch (err: any) {
      console.error("Insight Error", err);
      alert(
        "AI CBT Analysis is currently offline. You can manually identify your thinking traps in the next steps.",
      );
      setInsightsData({
        insights:
          "AI analysis is offline. Please manually identify your thinking traps.",
        reframeSuggestions: [
          "Focus on what you can control in this situation.",
          "Look at this situation with more self-compassion.",
        ],
        suggestedDistortions: [],
      });
      // Fallback: populate selectedDistortions and suggestedTraps with heuristic distortions if API is offline
      const heuristicDistortions = localDistortions.map((ld) => ld.id);
      setSuggestedTraps(heuristicDistortions);
      setSelectedDistortions(heuristicDistortions);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
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
          reframedThought: alternativeThought,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("SERVER SIDE REJECTION ERROR DETECTED:", errorData);
        alert(
          `Submission Failed: ${errorData.message || errorData.error || "Unknown Server Error"}`,
        );
        return;
      }

      console.log("Database entry saved successfully! Redirecting...");

      // Reset wizard
      setStep(1);
      setSituation("");
      setSelectedEmotions([]);
      setThought("");
      setSelectedDistortions([]);
      setSuggestedTraps([]);
      setAlternativeThought("");
      setInsightsData(null);
      setApiSuggestedEmotions([]);
      setSelectedExercise(null);

      router.push("/");
      router.refresh();
    } catch (clientError: any) {
      console.error("CLIENT SIDE RUNTIME CRASH DETECTED:", clientError);
      alert(`Client Error: ${clientError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveOutcome(entryId: number) {
    if (!tempOutcomeText.trim()) {
      alert("Please enter what actually happened.");
      return;
    }
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
        alert(`Failed to save outcome: ${data.error || "Server error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving outcome");
    } finally {
      setSavingOutcomeId(null);
    }
  }

  const selectedDistortionNames = selectedDistortions
    .map((id) => DISTORTIONS.find((d) => d.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div style={{ padding: "2rem 0", maxWidth: "800px", margin: "0 auto" }}>
      <header style={{ marginBottom: "2.5rem" }}>
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
        <p style={{ fontSize: "1.1rem", color: "#555" }}>
          Gently analyze difficult moments using Cognitive Behavioral Therapy,
          or log positive victories.
        </p>
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
          <strong>Call or text 988</strong> to reach the Suicide & Crisis
          Lifeline.
        </div>
      )}

      {/* Progress Bar */}
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
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
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

            <h4
              style={{
                fontSize: "1.1rem",
                marginBottom: "0.5rem",
                color: "var(--foreground)",
              }}
            >
              {entryType === "positive"
                ? "What went well today?"
                : "What happened?"}
            </h4>
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
              disabled={!situation.trim() || loadingEmotions}
              style={{ width: "100%" }}
            >
              {loadingEmotions ? "Analyzing Trigger..." : "Continue"}
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
            {(() => {
              const suggestedList =
                apiSuggestedEmotions.length > 0
                  ? apiSuggestedEmotions
                  : suggestedEmotions;
              return (
                suggestedList.length > 0 && (
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
                      {suggestedList.map((emotion) => {
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
                )
              );
            })()}

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
                        alignItems: "center",
                        gap: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          width: "120px",
                          fontWeight: 500,
                          fontSize: "0.95rem",
                        }}
                      >
                        {emotion.name}
                      </span>
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
                        style={{ flex: 1, accentColor: "var(--soft-blue)" }}
                      />
                      <span
                        style={{
                          width: "45px",
                          textAlign: "right",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "#666",
                        }}
                      >
                        {emotion.weight}%
                      </span>
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
                disabled={!thought.trim()}
                style={{ flex: 2 }}
              >
                Identify Thinking Traps
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
                        const dist = DISTORTIONS.find((d) => d.id === id);
                        if (!dist) return null;
                        const isSelected = selectedDistortions.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleDistortion(id)}
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
                    const isSuggested =
                      localDistortions.some((ld) => ld.id === distortion.id) ||
                      (insightsData?.suggestedDistortions &&
                        insightsData.suggestedDistortions.includes(
                          distortion.id,
                        ));

                    return (
                      <div
                        key={distortion.id}
                        onClick={() => toggleDistortion(distortion.id)}
                        style={{
                          border: isSelected
                            ? "2px solid var(--soft-blue)"
                            : "1px solid #e0e0e0",
                          backgroundColor: isSelected ? "#f5f9ff" : "#fff",
                          borderRadius: "var(--radius)",
                          padding: "1.25rem",
                          cursor: "pointer",
                          position: "relative",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected
                            ? "0 2px 8px rgba(0, 79, 230, 0.1)"
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
                          {isSuggested && (
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
                    {/* AI Reframes */}
                    {insightsData?.reframeSuggestions &&
                      insightsData.reframeSuggestions.map((suggestion, idx) => (
                        <button
                          key={`ai-${idx}`}
                          type="button"
                          onClick={() => setAlternativeThought(suggestion)}
                          style={{
                            textAlign: "left",
                            padding: "0.8rem 1rem",
                            borderRadius: "var(--radius)",
                            backgroundColor: "#f0f7f4",
                            border: "1px solid #c2e0c6",
                            color: "#2b5a2b",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            fontSize: "0.95rem",
                            lineHeight: "1.4",
                          }}
                        >
                          "{suggestion}"{" "}
                          <span
                            style={{
                              float: "right",
                              fontSize: "0.75rem",
                              opacity: 0.6,
                            }}
                          >
                            AI Option
                          </span>
                        </button>
                      ))}
                    {/* Heuristic Reframe */}
                    <button
                      type="button"
                      onClick={() => {
                        const sample = getExerciseSample(selectedExercise);
                        if (selectedExercise === "friend") {
                          setAlternativeThought(
                            `If a close friend came to me and said: "${thought}", I would tell them: "${sample}"`,
                          );
                        } else if (selectedExercise === "fact") {
                          setAlternativeThought(
                            `Objective facts that support "${thought}": \n- \n\nConcrete facts that contradict it: \n- "${sample}"`,
                          );
                        } else if (selectedExercise === "reset") {
                          setAlternativeThought(
                            `Regarding the situation: "${situation}"—if the absolute worst-case scenario happens, my plan is: "${sample}"`,
                          );
                        } else {
                          setAlternativeThought(sample);
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
                        const currentSampleThought =
                          getExerciseSample("friend");
                        const fullText = `If a close friend came to me and said: "${thought}", I would tell them: "${currentSampleThought}"`;
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
                        const currentSampleThought = getExerciseSample("fact");
                        const fullText = `Objective facts that support "${thought}": \n- \n\nConcrete facts that contradict it: \n- "${currentSampleThought}"`;
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
                        const currentSampleThought = getExerciseSample("reset");
                        const fullText = `Regarding the situation: "${situation}"—if the absolute worst-case scenario happens, my plan is: "${currentSampleThought}"`;
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

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => {
                  setStep(entryType === "positive" ? 2 : 4);
                  setSelectedExercise(null);
                }}
                style={{
                  background: "transparent",
                  color: "#666",
                  border: "1px solid #ccc",
                  flex: 1,
                }}
              >
                Back
              </button>
              <button type="submit" disabled={loading} style={{ flex: 2 }}>
                {loading ? "Saving..." : "Save Entry & Finish"}
              </button>
            </div>
          </form>
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
                          fontSize: "0.78rem",
                          color: "#777",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {isPositive
                          ? "The Win / Event"
                          : "The Triggering Situation"}
                      </strong>
                      <p
                        style={{
                          margin: "0.2rem 0 0 0",
                          color: "#222",
                          fontSize: "0.98rem",
                          lineHeight: "1.5",
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
                            fontSize: "0.78rem",
                            color: "#777",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Automatic Thought
                        </strong>
                        <p
                          style={{
                            margin: "0.2rem 0 0 0",
                            color: "#222",
                            fontSize: "0.98rem",
                            lineHeight: "1.5",
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
                          fontSize: "0.78rem",
                          color: "#777",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {isPositive
                          ? "Core Strength / Savoring Anchor"
                          : "Reframed Thought"}
                      </strong>
                      <p
                        style={{
                          margin: "0.2rem 0 0 0",
                          color: isPositive ? "#451a03" : "#1e3a1e",
                          backgroundColor: isPositive ? "#fffdf5" : "#f0f7f4",
                          padding: "0.75rem 1rem",
                          borderRadius: "6px",
                          borderLeft: isPositive
                            ? "3px solid #e9c46a"
                            : "3px solid var(--sage-green)",
                          fontSize: "0.98rem",
                          fontStyle: "italic",
                          lineHeight: "1.5",
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
                              padding: "1rem",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              borderLeft: "4px solid var(--soft-blue)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "0.4rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "var(--soft-blue-hover)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                ⚖️ The Evidence Loop (Outcome Logged)
                              </span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  backgroundColor:
                                    item.predictionEvaluation ===
                                    "Much better than expected"
                                      ? "#dcfce7"
                                      : item.predictionEvaluation ===
                                          "As expected"
                                        ? "#fef9c3"
                                        : "#fee2e2",
                                  color:
                                    item.predictionEvaluation ===
                                    "Much better than expected"
                                      ? "#15803d"
                                      : item.predictionEvaluation ===
                                          "As expected"
                                        ? "#a16207"
                                        : "#b91c1c",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "12px",
                                }}
                              >
                                {item.predictionEvaluation}
                              </span>
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.92rem",
                                color: "var(--foreground)",
                                lineHeight: 1.4,
                                fontWeight: 500,
                              }}
                            >
                              <strong>What happened:</strong> {item.outcomeText}
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
                          </div>
                        ) : (
                          // If outcome not logged
                          <div>
                            {editingId === item.id ? (
                              <div
                                style={{
                                  backgroundColor: "#fcfaf6",
                                  padding: "1.25rem",
                                  borderRadius: "8px",
                                  border: "1px solid #f5efe6",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.75rem",
                                  animation: "fadeIn 0.3s ease",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    color: "var(--accent-gold-text)",
                                  }}
                                >
                                  📝 Log Real-World Outcome
                                </span>
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      color: "#666",
                                      marginBottom: "0.2rem",
                                    }}
                                  >
                                    How did this situation actually turn out?
                                    (Outcome)
                                  </label>
                                  <textarea
                                    value={tempOutcomeText}
                                    onChange={(e) =>
                                      setTempOutcomeText(e.target.value)
                                    }
                                    placeholder="Write down the concrete, objective details of what occurred..."
                                    rows={2}
                                    style={{
                                      width: "100%",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "1px solid #ccc",
                                      fontSize: "0.9rem",
                                      fontFamily: "inherit",
                                      resize: "vertical",
                                    }}
                                  />
                                </div>
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      color: "#666",
                                      marginBottom: "0.2rem",
                                    }}
                                  >
                                    Prediction Evaluation
                                  </label>
                                  <select
                                    value={tempEvaluation}
                                    onChange={(e) =>
                                      setTempEvaluation(e.target.value)
                                    }
                                    style={{
                                      width: "100%",
                                      padding: "0.5rem",
                                      borderRadius: "6px",
                                      border: "1px solid #ccc",
                                      fontSize: "0.9rem",
                                      backgroundColor: "#fff",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <option value="Much better than expected">
                                      Much better than expected
                                    </option>
                                    <option value="As expected">
                                      As expected
                                    </option>
                                    <option value="Worse than expected">
                                      Worse than expected
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      color: "#666",
                                      marginBottom: "0.2rem",
                                    }}
                                  >
                                    Lessons / Key Takeaways (Optional)
                                  </label>
                                  <textarea
                                    value={tempLessonsLearned}
                                    onChange={(e) =>
                                      setTempLessonsLearned(e.target.value)
                                    }
                                    placeholder="Any patterns noticed, should statements debunked, etc."
                                    rows={2}
                                    style={{
                                      width: "100%",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "1px solid #ccc",
                                      fontSize: "0.9rem",
                                      fontFamily: "inherit",
                                      resize: "vertical",
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    marginTop: "0.25rem",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingId(null);
                                      setTempOutcomeText("");
                                      setTempLessonsLearned("");
                                      setTempEvaluation(
                                        "Much better than expected",
                                      );
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: "0.4rem 0.8rem",
                                      fontSize: "0.85rem",
                                      backgroundColor: "transparent",
                                      color: "#666",
                                      border: "1px solid #ccc",
                                      borderRadius: "6px",
                                    }}
                                    className="btn-secondary"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveOutcome(item.id)}
                                    disabled={
                                      savingOutcomeId === item.id ||
                                      !tempOutcomeText.trim()
                                    }
                                    style={{
                                      flex: 2,
                                      padding: "0.4rem 0.8rem",
                                      fontSize: "0.85rem",
                                      borderRadius: "6px",
                                    }}
                                    className="btn-primary"
                                  >
                                    {savingOutcomeId === item.id
                                      ? "Saving..."
                                      : "Save Outcome"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  backgroundColor: "#f8fafc",
                                  padding: "0.75rem 1rem",
                                  borderRadius: "8px",
                                  border: "1px dashed #cbd5e1",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "#475569",
                                    fontWeight: 500,
                                  }}
                                >
                                  How did this situation actually turn out? Add
                                  an outcome to update your evidence engine.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setTempOutcomeText("");
                                    setTempLessonsLearned("");
                                    setTempEvaluation(
                                      "Much better than expected",
                                    );
                                  }}
                                  style={{
                                    padding: "0.4rem 0.8rem",
                                    fontSize: "0.8rem",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                  }}
                                  className="btn-secondary"
                                >
                                  Close the Loop
                                </button>
                              </div>
                            )}
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
