"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
  Sector,
} from "recharts";

type JournalEntry = {
  id: number;
  createdAt: string;
  entryType: "negative" | "positive";
  situation: string;
  emotionsJson: string;
  automaticThought: string | null;
  distortionsJson: string | null;
  reframedThought: string;
};

const DISTORTION_NAMES: Record<string, string> = {
  "all-or-nothing": "All-or-Nothing",
  catastrophizing: "Catastrophizing",
  "should-statements": "Should Statements",
  "mind-reading": "Mind Reading",
  "emotional-reasoning": "Emotional Reasoning",
  overgeneralization: "Overgeneralization",
};

const DONUT_COLORS = [
  "var(--soft-blue)",
  "var(--sage-green)",
  "var(--accent-gold)",
  "hsl(200, 40%, 65%)", // soft slate blue
  "hsl(140, 20%, 65%)", // soft moss sage
  "hsl(38, 45%, 65%)", // soft ochre gold
  "hsl(200, 10%, 55%)", // calming grey
];

const getEmotionCategory = (
  name: string,
): "positive" | "threat" | "reactive" | "unknown" => {
  const n = name.toLowerCase();

  const positive = [
    "grateful",
    "proud",
    "relieved",
    "energized",
    "happy",
    "calm",
    "content",
    "hopeful",
    "excited",
    "peaceful",
    "inspired",
    "elated",
    "serene",
  ];
  const threat = [
    "anxiety",
    "overwhelm",
    "frustrated",
    "frustration",
    "fear",
    "nervous",
    "stressed",
    "panicked",
    "irritated",
    "anxious",
    "overwhelmed",
  ];
  const reactive = [
    "anger",
    "sadness",
    "sad",
    "angry",
    "grief",
    "hurt",
    "guilt",
    "shame",
    "regretful",
    "lonely",
    "embarrassment",
  ];

  if (positive.some((e) => n.includes(e))) return "positive";
  if (threat.some((e) => n.includes(e))) return "threat";
  if (reactive.some((e) => n.includes(e))) return "reactive";
  return "unknown";
};

const getEmotionColor = (name: string) => {
  const cat = getEmotionCategory(name);
  if (cat === "positive") return "var(--sage-green)";
  if (cat === "threat") return "var(--accent-gold)";
  if (cat === "reactive") return "var(--accent-danger)";
  return "hsl(200, 10%, 50%)";
};

export default function InsightsPage() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [fetchingStats, setFetchingStats] = useState(true);
  const [viewStyle, setViewStyle] = useState<"frequency" | "timeline">(
    "frequency",
  );
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "resourceful" | "distressing"
  >("all");
  const [sortBy, setSortBy] = useState<"intensity" | "frequency">("frequency");

  const [activeRange, setActiveRange] = useState<
    "week" | "month" | "year" | "custom"
  >("month");
  const [timelinePoints, setTimelinePoints] = useState<
    { date: string; positive: number; negative: number }[]
  >([]);
  const [fetchingTrends, setFetchingTrends] = useState(true);

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [hoveredSlice, setHoveredSlice] = useState<{
    name: string;
    percentage: number;
    color: string;
  } | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [validationError, setValidationError] = useState("");

  async function fetchStats() {
    setFetchingStats(true);
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      if (data.entries) setJournalEntries(data.entries);
    } catch (err) {
      console.error("Failed to fetch stats data:", err);
    } finally {
      setFetchingStats(false);
    }
  }

  async function fetchTrends(range: string, start?: string, end?: string) {
    setFetchingTrends(true);
    try {
      let url = `/api/journal/trends?range=${range}`;
      if (range === "custom" && start && end) {
        url += `&startDate=${start}&endDate=${end}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.timelineData) {
        setTimelinePoints(data.timelineData);
      }
    } catch (err) {
      console.error("Failed to fetch trends data:", err);
    } finally {
      setFetchingTrends(false);
    }
  }

  useEffect(() => {
    fetchStats();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeRange !== "custom") {
      setShowCustomPicker(false);
      fetchTrends(activeRange);
    } else {
      setShowCustomPicker(true);
    }
  }, [activeRange]);

  useEffect(() => {
    if (customStartDate && customEndDate) {
      if (new Date(customStartDate) > new Date(customEndDate)) {
        setValidationError("Start date cannot occur after end date.");
      } else {
        setValidationError("");
      }
    } else {
      setValidationError("");
    }
  }, [customStartDate, customEndDate]);

  const getFilteredEntriesForStats = () => {
    const now = new Date();
    let thresholdStart = 0;
    let thresholdEnd = now.getTime();

    if (activeRange === "week") {
      const date = new Date();
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      thresholdStart = monday.getTime();
    } else if (activeRange === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      thresholdStart = startOfMonth.getTime();
    } else if (activeRange === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      thresholdStart = startOfYear.getTime();
    } else if (activeRange === "custom" && customStartDate && customEndDate) {
      thresholdStart = new Date(customStartDate).getTime();
      const endOfEndDay = new Date(customEndDate);
      endOfEndDay.setHours(23, 59, 59, 999);
      thresholdEnd = endOfEndDay.getTime();
    } else {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      thresholdStart = startOfMonth.getTime();
    }

    return journalEntries.filter((entry) => {
      const dateStr = entry.createdAt.includes("T")
        ? entry.createdAt
        : entry.createdAt.replace(" ", "T") + "Z";
      const entryTime = new Date(dateStr).getTime();
      return entryTime >= thresholdStart && entryTime <= thresholdEnd;
    });
  };

  // Process Emotion Stats
  const getEmotionStats = () => {
    const emotionTotals: Record<
      string,
      { totalWeight: number; count: number }
    > = {};

    const normalizeName = (rawName: string): string => {
      const trimmed = rawName.trim();
      const lower = trimmed.toLowerCase();
      if (lower === "overwhelm" || lower === "overwhelmed") {
        return "Overwhelmed";
      }
      if (lower === "frustrated" || lower === "frustration") {
        return "Frustrated";
      }
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    };

    getFilteredEntriesForStats().forEach((entry) => {
      if (!entry.emotionsJson) return;
      try {
        const emotions = JSON.parse(entry.emotionsJson);
        if (Array.isArray(emotions)) {
          emotions.forEach((e: any) => {
            const name = normalizeName(e.name);
            if (!emotionTotals[name]) {
              emotionTotals[name] = { totalWeight: 0, count: 0 };
            }
            emotionTotals[name].totalWeight += e.weight || 50;
            emotionTotals[name].count += 1;
          });
        }
      } catch (err) {}
    });

    const stats = Object.keys(emotionTotals).map((name) => {
      const { totalWeight, count } = emotionTotals[name];
      return {
        name,
        averageIntensity: Math.round(totalWeight / count),
        frequency: count,
        category: getEmotionCategory(name),
      };
    });

    let processedData = [...stats];

    // 1. Apply Filter
    if (activeTab === "resourceful") {
      processedData = processedData.filter((d) => d.category === "positive");
    } else if (activeTab === "distressing") {
      processedData = processedData.filter(
        (d) => d.category === "threat" || d.category === "reactive",
      );
    }

    // 2. Apply Sort
    if (sortBy === "intensity") {
      processedData.sort((a, b) => b.averageIntensity - a.averageIntensity);
    } else if (sortBy === "frequency") {
      processedData.sort((a, b) => b.frequency - a.frequency);
    }

    return processedData;
  };

  // Process Distortion Stats
  const getDistortionStats = () => {
    const distortionCounts: Record<string, number> = {};
    let totalCount = 0;

    getFilteredEntriesForStats().forEach((entry) => {
      if (!entry.distortionsJson) return;
      try {
        const distortions = JSON.parse(entry.distortionsJson);
        if (Array.isArray(distortions)) {
          distortions.forEach((d: string) => {
            distortionCounts[d] = (distortionCounts[d] || 0) + 1;
            totalCount += 1;
          });
        }
      } catch (err) {}
    });

    return Object.keys(distortionCounts)
      .map((id) => {
        const count = distortionCounts[id];
        return {
          id,
          name: DISTORTION_NAMES[id] || id,
          count,
          percentage:
            totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  };

  // Process Timeline Data
  const getTimelineData = () => {
    const sorted = [...journalEntries]
      .filter((e) => e.emotionsJson)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    const points: { date: string; positive: number; negative: number }[] = [];

    sorted.forEach((entry) => {
      try {
        const emotions = JSON.parse(entry.emotionsJson);
        if (Array.isArray(emotions) && emotions.length > 0) {
          let posSum = 0,
            posCount = 0;
          let negSum = 0,
            negCount = 0;

          emotions.forEach((em: any) => {
            const isPos = [
              "Happy",
              "Proud",
              "Optimistic",
              "Calm",
              "Grateful",
              "Content",
              "Relieved",
              "Hopeful",
              "Excited",
              "Peaceful",
              "Energized",
              "Inspired",
              "Elated",
              "Serene",
            ].includes(em.name);
            if (isPos) {
              posSum += em.weight;
              posCount++;
            } else {
              negSum += em.weight;
              negCount++;
            }
          });

          const dateStr = new Date(entry.createdAt).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" },
          );
          const existing = points.find((p) => p.date === dateStr);
          const computedPos = posCount > 0 ? Math.round(posSum / posCount) : 0;
          const computedNeg = negCount > 0 ? Math.round(negSum / negCount) : 0;

          if (existing) {
            existing.positive =
              existing.positive > 0
                ? Math.round((existing.positive + computedPos) / 2)
                : computedPos;
            existing.negative =
              existing.negative > 0
                ? Math.round((existing.negative + computedNeg) / 2)
                : computedNeg;
          } else {
            points.push({
              date: dateStr,
              positive: computedPos,
              negative: computedNeg,
            });
          }
        }
      } catch (err) {}
    });

    return points.slice(-30);
  };

  const emotionStats = getEmotionStats();
  const distortionStats = getDistortionStats();
  const totalDistortionsCount = distortionStats.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const getLabelStyle = (text: string): React.CSSProperties => {
    if (text.length > 15) {
      return {
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: "hsl(200, 10%, 40%)",
        lineHeight: 1.25,
        maxWidth: "150px",
        textAlign: "center",
        textTransform: "uppercase",
        marginTop: "4px",
      };
    }
    return {
      fontSize: "0.85rem",
      fontWeight: 700,
      color: "hsl(200, 10%, 40%)",
      lineHeight: 1.4,
      letterSpacing: "0.03em",
      textAlign: "center",
      textTransform: "uppercase",
      marginTop: "4px",
    };
  };

  // Custom Tooltip Components
  const CustomEmotionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: "#fff",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
            fontSize: "0.88rem",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "var(--foreground)" }}>
            {data.name}
          </p>
          <p
            style={{
              margin: "0.35rem 0 0 0",
              color: "var(--soft-blue-hover)",
              fontWeight: 700,
            }}
          >
            Avg. Intensity: {data.averageIntensity}%
          </p>
          <p
            style={{ margin: 0, color: "hsl(200, 10%, 45%)", fontWeight: 500 }}
          >
            Logged: {data.frequency} times
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomDistortionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: "var(--foreground)",
            color: "#fff",
            padding: "0.4rem 0.8rem",
            borderRadius: "20px",
            fontSize: "0.82rem",
            fontWeight: 600,
            boxShadow: "var(--card-shadow)",
            border: "none",
          }}
        >
          {data.name}
        </div>
      );
    }
    return null;
  };

  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "#fff",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
            fontSize: "0.88rem",
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              color: "var(--foreground)",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "0.25rem",
              marginBottom: "0.35rem",
            }}
          >
            {label}
          </p>
          {payload.map((p: any) => (
            <p
              key={p.name}
              style={{
                margin: "0.25rem 0 0 0",
                color: p.stroke || p.color,
                fontWeight: 700,
              }}
            >
              {p.name}: {p.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="animate-fade-in"
      style={{ padding: "1.5rem 0", maxWidth: "800px", margin: "0 auto" }}
    >
      <header style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <h1
          style={{
            color: "var(--sage-green)",
            marginBottom: "0.5rem",
            fontSize: "2.5rem",
            fontWeight: 700,
          }}
        >
          Wellness Trends
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "hsl(200, 10%, 45%)",
            fontWeight: 500,
          }}
        >
          Analyze emotional patterns and tracing distortion frequencies over
          time.
        </p>
        <Link
          href="/"
          style={{
            color: "var(--soft-blue)",
            textDecoration: "none",
            fontWeight: 700,
            display: "inline-block",
            marginTop: "0.5rem",
          }}
        >
          &larr; Back to Dashboard
        </Link>
      </header>

      {/* Advanced Chart Toggle Controller */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "2.5rem",
          backgroundColor: "var(--border)",
          padding: "0.35rem",
          borderRadius: "12px",
          maxWidth: "420px",
          marginInline: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setViewStyle("frequency")}
          style={{
            flex: 1,
            padding: "0.65rem 1.25rem",
            borderRadius: "10px",
            border: "none",
            backgroundColor: viewStyle === "frequency" ? "#fff" : "transparent",
            color:
              viewStyle === "frequency"
                ? "var(--foreground)"
                : "hsl(200, 10%, 50%)",
            fontWeight: 700,
            fontSize: "0.9rem",
            boxShadow:
              viewStyle === "frequency" ? "var(--card-shadow)" : "none",
            cursor: "pointer",
            transform: "none",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          📊 Frequency Metrics
        </button>
        <button
          type="button"
          onClick={() => setViewStyle("timeline")}
          style={{
            flex: 1,
            padding: "0.65rem 1.25rem",
            borderRadius: "10px",
            border: "none",
            backgroundColor: viewStyle === "timeline" ? "#fff" : "transparent",
            color:
              viewStyle === "timeline"
                ? "var(--foreground)"
                : "hsl(200, 10%, 50%)",
            fontWeight: 700,
            fontSize: "0.9rem",
            boxShadow: viewStyle === "timeline" ? "var(--card-shadow)" : "none",
            cursor: "pointer",
            transform: "none",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          📈 Timeline Fluctuations
        </button>
      </div>

      {/* Date Range Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          backgroundColor: "var(--border)",
          padding: "0.35rem",
          borderRadius: "12px",
          maxWidth: "520px",
          marginInline: "auto",
        }}
      >
        {(["week", "month", "year", "custom"] as const).map((r) => {
          const label =
            r === "week"
              ? "Current Week"
              : r === "month"
                ? "Current Month"
                : r === "year"
                  ? "Current Year"
                  : "🗓️ Custom Range";
          const active = activeRange === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setActiveRange(r)}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                borderRadius: "10px",
                border: "none",
                backgroundColor: active ? "#fff" : "transparent",
                color: active ? "var(--foreground)" : "hsl(200, 10%, 50%)",
                fontWeight: 700,
                fontSize: "0.82rem",
                boxShadow: active ? "var(--card-shadow)" : "none",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Expandable Custom Date Range Picker */}
      {showCustomPicker && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
            backgroundColor: "#f8fafc",
            padding: "1.25rem",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            maxWidth: "420px",
            marginInline: "auto",
            marginBottom: "2rem",
            boxShadow: "var(--card-shadow)",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <span
                style={{ fontSize: "0.75rem", fontWeight: 700, color: "#666" }}
              >
                Start Date
              </span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: "0.45rem 0.65rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  width: "100%",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <span
                style={{ fontSize: "0.75rem", fontWeight: 700, color: "#666" }}
              >
                End Date
              </span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: "0.45rem 0.65rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  width: "100%",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>
          {validationError && (
            <div
              style={{
                color: "var(--accent-danger)",
                fontSize: "0.82rem",
                fontWeight: 700,
                textAlign: "center",
                marginTop: "0.25rem",
              }}
            >
              ⚠️ {validationError}
            </div>
          )}
          <button
            type="button"
            disabled={!!validationError || !customStartDate || !customEndDate}
            onClick={() => {
              fetchTrends("custom", customStartDate, customEndDate);
            }}
            style={{
              width: "100%",
              padding: "0.55rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--soft-blue)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor:
                !!validationError || !customStartDate || !customEndDate
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !!validationError || !customStartDate || !customEndDate
                  ? 0.6
                  : 1,
              transition: "all 0.2s",
            }}
          >
            Apply Custom Filter
          </button>
        </div>
      )}

      {fetchingStats ? (
        <p style={{ textAlign: "center", color: "hsl(200, 10%, 45%)" }}>
          Analyzing wellness trends...
        </p>
      ) : !mounted ? (
        <p style={{ textAlign: "center", color: "hsl(200, 10%, 45%)" }}>
          Loading interactive charts...
        </p>
      ) : journalEntries.length === 0 ? (
        <div
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
            backgroundColor: "#fff",
            borderRadius: "var(--radius)",
            border: "1px dashed var(--border)",
          }}
        >
          <p style={{ color: "hsl(200, 10%, 50%)", fontSize: "1.15rem" }}>
            Complete a guided CBT thought record in the **Journal** tab to begin
            generating wellness trends.
          </p>
        </div>
      ) : (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          {viewStyle === "frequency" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2.5rem",
              }}
            >
              {/* Emotion Intensities Chart */}
              <div className="card-premium" style={{ padding: "2rem" }}>
                <h3
                  style={{
                    fontSize: "1.35rem",
                    color: "var(--foreground)",
                    marginBottom: "0.25rem",
                    fontWeight: 700,
                  }}
                >
                  Emotion Trends
                </h3>
                <p
                  style={{
                    fontSize: "0.92rem",
                    color: "hsl(200, 10%, 45%)",
                    marginBottom: "2rem",
                    fontWeight: 500,
                  }}
                >
                  Shows which emotions are logged most frequently, along with
                  their average intensity.
                </p>

                {/* Controls Bar: Category Tabs & Sorting Dropdown */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    backgroundColor: "#f8fafc",
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Category Tabs */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      style={{
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        borderRadius: "20px",
                        border: "none",
                        backgroundColor:
                          activeTab === "all"
                            ? "var(--foreground)"
                            : "transparent",
                        color:
                          activeTab === "all" ? "#fff" : "hsl(200, 10%, 45%)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("resourceful")}
                      style={{
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        borderRadius: "20px",
                        border: "none",
                        backgroundColor:
                          activeTab === "resourceful"
                            ? "var(--sage-green)"
                            : "transparent",
                        color:
                          activeTab === "resourceful"
                            ? "#fff"
                            : "hsl(200, 10%, 45%)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      Resourceful Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("distressing")}
                      style={{
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        borderRadius: "20px",
                        border: "none",
                        backgroundColor:
                          activeTab === "distressing"
                            ? "var(--accent-gold)"
                            : "transparent",
                        color:
                          activeTab === "distressing"
                            ? "#fff"
                            : "hsl(200, 10%, 45%)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      Distressing Only
                    </button>
                  </div>

                  {/* Sorting Selector */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "hsl(200, 10%, 45%)",
                      }}
                    >
                      Sort by:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      style={{
                        padding: "0.4rem 0.6rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <option value="frequency">
                        Frequency (Most frequent first)
                      </option>
                      <option value="intensity">
                        Intensity (Highest first)
                      </option>
                    </select>
                  </div>
                </div>

                {emotionStats.length === 0 ? (
                  <p
                    style={{
                      color: "hsl(200, 10%, 50%)",
                      fontSize: "0.95rem",
                      padding: "1rem 0",
                    }}
                  >
                    {journalEntries.length > 0
                      ? "No emotions match the selected filter category."
                      : "No structured emotion data recorded yet."}
                  </p>
                ) : (
                  <div>
                    <div
                      style={{
                        height: `${Math.max(320, emotionStats.length * 35)}px`,
                        minHeight: "320px",
                        width: "100%",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={emotionStats}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            stroke="#94a3b8"
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#94a3b8"
                            width={110}
                            tick={{ fontSize: "12px", fontWeight: 600 }}
                          />
                          <Tooltip content={<CustomEmotionTooltip />} />
                          <Bar
                            dataKey="averageIntensity"
                            radius={[0, 10, 10, 0]}
                            barSize={18}
                          >
                            {emotionStats.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={getEmotionColor(entry.name)}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Chart Legend */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: "1.5rem",
                        marginTop: "1.5rem",
                        paddingTop: "1.25rem",
                        borderTop: "1px solid var(--border)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "var(--sage-green)",
                            borderRadius: "50%",
                          }}
                        />
                        <span style={{ color: "hsl(200, 10%, 45%)" }}>
                          Positive / Resourceful
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "var(--accent-gold)",
                            borderRadius: "50%",
                          }}
                        />
                        <span style={{ color: "hsl(200, 10%, 45%)" }}>
                          High-Stress / Threat
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "var(--accent-danger)",
                            borderRadius: "50%",
                          }}
                        />
                        <span style={{ color: "hsl(200, 10%, 45%)" }}>
                          Heavy / Reactive
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Distortion Frequencies Donut Chart */}
              <div className="w-full max-w-4xl bg-white p-6 rounded-2xl shadow-sm flex flex-col mx-auto mb-8">
                {/* BLOCK 1: THE HEADER (Spans full width at the top) */}
                <div className="w-full mb-8 text-left">
                  <h3 className="text-2xl font-bold text-slate-900">
                    Thinking Trap Frequency
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Frequency distribution of cognitive distortions flagged in
                    your thought records.
                  </p>
                </div>

                {distortionStats.length === 0 ? (
                  <p
                    style={{ color: "hsl(200, 10%, 50%)", fontSize: "0.95rem" }}
                  >
                    No structured distortion data recorded yet.
                  </p>
                ) : (
                  /* BLOCK 2: THE SIDE-BY-SIDE SPLIT WRAPPER */
                  <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-8">
                    {/* LEFT COLUMN: CHART AREA (Takes 55% width) */}
                    <div className="w-full lg:w-[55%] flex flex-col items-center justify-center">
                      <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center">
                        {/* RECHARTS / SVG DONUT CHART ENGINE GOES HERE */}
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={distortionStats}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={85}
                              outerRadius={110}
                              paddingAngle={3}
                              // @ts-ignore
                              activeIndex={activeIndex}
                              // @ts-ignore
                              activeShape={(props: any) => (
                                <Sector
                                  {...props}
                                  outerRadius={props.outerRadius + 5}
                                />
                              )}
                              onMouseEnter={(data: any, index: number) => {
                                setActiveIndex(index);
                                setHoveredSlice({
                                  name: data.name,
                                  percentage: data.percentage,
                                  color: DONUT_COLORS[index % DONUT_COLORS.length],
                                });
                              }}
                              onMouseLeave={() => {
                                setActiveIndex(-1);
                                setHoveredSlice(null);
                              }}
                            >
                              {distortionStats.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    DONUT_COLORS[index % DONUT_COLORS.length]
                                  }
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Central Dynamic Text/Icon Layer with Inner Hue background */}
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "160px",
                            height: "160px",
                            borderRadius: "50%",
                            backgroundColor: hoveredSlice
                              ? `${hoveredSlice.color}15`
                              : "transparent",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            pointerEvents: "none",
                            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                        >
                          {hoveredSlice ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                animation: "fadeIn 0.2s ease",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "2.1rem",
                                  fontWeight: 800,
                                  color: "var(--foreground)",
                                  lineHeight: 1,
                                }}
                              >
                                {hoveredSlice.percentage}%
                              </span>
                              <span
                                style={getLabelStyle(hoveredSlice.name)}
                                title={hoveredSlice.name}
                              >
                                {hoveredSlice.name}
                              </span>
                            </div>
                          ) : (
                            /* Stylized minimal vault lock SVG icon */
                            <svg
                              width="38"
                              height="38"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--soft-blue)"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ opacity: 0.8 }}
                            >
                              <rect
                                x="3"
                                y="11"
                                width="18"
                                height="11"
                                rx="2"
                                ry="2"
                              />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              <circle cx="12" cy="16" r="1.5" />
                            </svg>
                          )}
                        </div>
                      </div>
                      {/* CAPTION STAYS LINKED DIRECTLY UNDER THE CIRCLE */}
                      <div className="text-base font-semibold text-slate-800 mt-4 text-center">
                        {totalDistortionsCount} Total Traps
                      </div>
                    </div>

                    {/* RIGHT COLUMN: LEGEND AREA (Takes 45% width) */}
                    <div className="w-full lg:w-[45%] flex flex-col gap-3">
                      {/* THE COMPACT VERTICAL ROW ITEMS LIST GOES HERE */}
                      <div
                        style={{
                          maxHeight: "260px",
                          overflowY: "auto",
                          paddingRight: "0.5rem",
                        }}
                      >
                        {distortionStats.map((stat, index) => (
                          <div
                            key={stat.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: "0.88rem",
                              marginBottom: "0.65rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "12px",
                                  height: "12px",
                                  backgroundColor:
                                    DONUT_COLORS[index % DONUT_COLORS.length],
                                  borderRadius: "50%",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "var(--foreground)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {stat.name}
                              </span>
                            </div>
                            <span
                              style={{
                                color: "hsl(200, 10%, 45%)",
                                fontWeight: 700,
                                paddingLeft: "0.5rem",
                              }}
                            >
                              {stat.count}x ({stat.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Timeline View with Interactive AreaChart */
            <div className="card-premium" style={{ padding: "2rem" }}>
              <h3
                style={{
                  fontSize: "1.35rem",
                  color: "var(--foreground)",
                  marginBottom: "0.25rem",
                  fontWeight: 700,
                }}
              >
                Timeline Trajectory
              </h3>
              <p
                style={{
                  fontSize: "0.92rem",
                  color: "hsl(200, 10%, 45%)",
                  marginBottom: "2.5rem",
                  fontWeight: 500,
                }}
              >
                Monitors fluctuations of positive vs. negative feelings.
                (Reflects averages per distinct logged day).
              </p>

              {fetchingTrends ? (
                <p
                  style={{
                    color: "hsl(200, 10%, 50%)",
                    fontSize: "0.95rem",
                    textAlign: "center",
                    padding: "4rem 2rem",
                  }}
                >
                  Updating trends timeline...
                </p>
              ) : timelinePoints.length === 0 ? (
                <p
                  style={{
                    color: "hsl(200, 10%, 50%)",
                    fontSize: "0.95rem",
                    textAlign: "center",
                    padding: "2rem",
                  }}
                >
                  Not enough emotional data logged yet. Add journal logs to plot
                  your timeline!
                </p>
              ) : (
                <div>
                  <div style={{ height: "320px", width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timelinePoints}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="posGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--sage-green)"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--sage-green)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="negGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--soft-blue)"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--soft-blue)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          tick={{ fontSize: "11px" }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          domain={[0, 100]}
                          tick={{ fontSize: "11px" }}
                        />
                        <Tooltip content={<CustomTimelineTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="positive"
                          name="Positive Trajectory"
                          stroke="var(--sage-green)"
                          fillOpacity={1}
                          fill="url(#posGrad)"
                          strokeWidth={3}
                        />
                        <Area
                          type="monotone"
                          dataKey="negative"
                          name="Negative Trajectory"
                          stroke="var(--soft-blue)"
                          fillOpacity={1}
                          fill="url(#negGrad)"
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Chart Legend */}
                  <div
                    style={{
                      display: "flex",
                      gap: "2rem",
                      marginTop: "1.5rem",
                      justifyContent: "center",
                      fontSize: "0.88rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "var(--foreground)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "12px",
                          height: "12px",
                          backgroundColor: "var(--sage-green)",
                          borderRadius: "50%",
                        }}
                      />
                      <strong style={{ fontWeight: 700 }}>
                        Positive Trajectory (Joy/Relief)
                      </strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "var(--foreground)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "12px",
                          height: "12px",
                          backgroundColor: "var(--soft-blue)",
                          borderRadius: "50%",
                        }}
                      />
                      <strong style={{ fontWeight: 700 }}>
                        Negative Trajectory (Stress/Anxiety)
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
