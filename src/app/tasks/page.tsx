"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { awardPoints, POINT_VALUES } from "@/lib/points";

type Task = {
  id: number;
  title: string;
  description: string | null;
  estimatedTime: string;
  emotionalIntensity: string;
  dueDate: string;
  completed: number;
  sortOrder: number;
  parentId: number | null;
  recurrence: string;
};

// Per-task metadata stored in localStorage (keyed by task id)
type TaskMeta = {
  predictedDifficulty?: number; // 1–10
  actionType?: 'habit' | 'oneoff';
};

type ViewMode = "all" | "today" | "week";
type TaskTypeFilter = "all" | "habit" | "oneoff";

// { [taskId]: { [localDateStr]: { count, ratings } } } — historical logs are never deleted
type DailyCompletions = Record<string, Record<string, { count: number; ratings: number[] }>>;

function localDateStr(d: Date = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseTimeStr(timeStr: string) {
  if (!timeStr) return { value: "15", unit: "mins" };
  const num = parseInt(timeStr, 10);
  if (isNaN(num)) return { value: "15", unit: "mins" };
  const unit =
    timeStr.toLowerCase().includes("hour") ||
    timeStr.toLowerCase().includes("hr")
      ? "hours"
      : "mins";
  return { value: String(num), unit };
}

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewMode>("today");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [todayFocusIds, setTodayFocusIds] = useState<string[]>([]);
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskTypeFilter>("all");
  // Per-task metadata (prediction + type), keyed by task id string
  const [taskMeta, setTaskMeta] = useState<Record<string, TaskMeta>>({});

  // Rating popover state (0-10 completion rating)
  const [ratingPopoverId, setRatingPopoverId] = useState<number | null>(null);
  // Actual relief ratings keyed by task id string
  const [actualReliefs, setActualReliefs] = useState<Record<string, number>>({});

  // Sub-day lifecycle for recurring tasks: { [taskId]: { [localDateStr]: { count, ratings } } }
  const [dailyCompletions, setDailyCompletions] = useState<DailyCompletions>({});
  // Local calendar date key (set client-side only to avoid hydration mismatch)
  const [todayKey, setTodayKey] = useState<string>("");
  // True when the rating popover was opened from a badge to edit the latest rating
  const [ratingEditMode, setRatingEditMode] = useState(false);
  // Weekly Agenda: 0 = current 7-day window, +1 = next 7 days, etc.
  const [agendaWeekOffset, setAgendaWeekOffset] = useState<number>(0);

  function isRecurringTask(t?: Task | null) {
    return !!t && (t.recurrence === "daily" || t.recurrence === "twice-daily");
  }
  function targetCount(t?: Task | null) {
    return t?.recurrence === "twice-daily" ? 2 : 1;
  }
  function todayEntry(taskId: number) {
    return (todayKey && dailyCompletions[String(taskId)]?.[todayKey]) || { count: 0, ratings: [] as number[] };
  }
  // Effective completion state: recurring tasks reset each local day
  function effDone(t: Task) {
    if (isRecurringTask(t)) return todayEntry(t.id).count >= targetCount(t);
    return !!t.completed;
  }
  function avgRating(ratings: number[]) {
    if (!ratings.length) return 0;
    return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  }
  function renderRecurringBadge(t: Task) {
    if (!isRecurringTask(t)) return null;
    const entry = todayEntry(t.id);
    if (entry.count === 0) return null;
    const target = targetCount(t);
    const done = entry.count >= target;
    return (
      <button
        type="button"
        onClick={() => { setRatingEditMode(true); setRatingPopoverId(t.id); }}
        style={{
          marginTop: "0.4rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          fontSize: "0.75rem",
          fontWeight: 700,
          backgroundColor: done ? "#f0fdf4" : "#fffbeb",
          border: done ? "1px solid #bbf7d0" : "1px solid #fde68a",
          borderRadius: "20px",
          padding: "0.2rem 0.7rem",
          color: done ? "#15803d" : "#b45309",
          cursor: "pointer",
          width: "fit-content",
        }}
      >
        {done
          ? `Completed ${entry.count}/${target} (Avg Rating: ${avgRating(entry.ratings)}/10)`
          : `Logged ${entry.count}/${target} Today (Rating: ${entry.ratings[entry.ratings.length - 1]}/10)`}{" "}
        ✏️
      </button>
    );
  }

  // Add top-level task form state
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [timeValue, setTimeValue] = useState("15");
  const [timeUnit, setTimeUnit] = useState("mins");
  const [intensity, setIntensity] = useState("Low");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [actionType, setActionType] = useState<'habit' | 'oneoff'>("oneoff");
  const [predictedDifficulty, setPredictedDifficulty] = useState<string>("");

  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEstimatedTime, setEditEstimatedTime] = useState("");
  const [editIntensity, setEditIntensity] = useState("Low");
  const [editDueDate, setEditDueDate] = useState("");
  const [editRecurrence, setEditRecurrence] = useState("none");

  // Add sub-step state
  const [addingSubToTaskId, setAddingSubToTaskId] = useState<number | null>(
    null,
  );
  const [subTaskTitle, setSubTaskTitle] = useState("");
  const [subTaskDescription, setSubTaskDescription] = useState("");
  const [subTaskTimeValue, setSubTaskTimeValue] = useState("15");
  const [subTaskTimeUnit, setSubTaskTimeUnit] = useState("mins");
  const [subTaskIntensity, setSubTaskIntensity] = useState("Low");
  const [subTaskDueDate, setSubTaskDueDate] = useState("");
  const [subTaskRecurrence, setSubTaskRecurrence] = useState("none");

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
        try {
          localStorage.setItem("momentum_actions", JSON.stringify(data.tasks));
        } catch (_) {}
      }
    } catch (_) {
      try {
        const stored = localStorage.getItem("momentum_actions");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
          }
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial load from localStorage cache for instant rendering
    try {
      const storedActions = localStorage.getItem("momentum_actions");
      if (storedActions) {
        const parsed = JSON.parse(storedActions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
        }
      }
    } catch (_) {}

    // Load per-task meta (predictions, action types)
    try {
      const storedMeta = localStorage.getItem("momentum_task_meta");
      if (storedMeta) {
        const parsed = JSON.parse(storedMeta);
        if (parsed && typeof parsed === 'object') setTaskMeta(parsed);
      }
    } catch (_) {}

    // Load actual relief ratings from localStorage
    try {
      const storedReliefs = localStorage.getItem('momentum_actual_reliefs');
      if (storedReliefs) {
        const parsed = JSON.parse(storedReliefs);
        if (parsed && typeof parsed === 'object') setActualReliefs(parsed);
      }
    } catch (_) {}

    // Load sub-day completion logs + current local date (client-only)
    setTodayKey(localDateStr());
    try {
      const storedDaily = localStorage.getItem('momentum_daily_completions');
      if (storedDaily) {
        const parsed = JSON.parse(storedDaily);
        if (parsed && typeof parsed === 'object') setDailyCompletions(parsed);
      }
    } catch (_) {}

    // Midnight rollover: re-evaluate local calendar date every 30s
    const dayTimer = setInterval(() => {
      setTodayKey((prev) => {
        const next = localDateStr();
        return prev === next ? prev : next;
      });
    }, 30000);

    fetchTasks();

    try {
      const saved = localStorage.getItem("momentum_today_focus_actions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTodayFocusIds(parsed.map((a: any) => String(a.id)));
        }
      }
    } catch (_) {}
    return () => clearInterval(dayTimer);
  }, []);

  function toggleTodayFocus(t: Task) {
    const taskIdStr = String(t.id);
    const isCurrentlyFocused = todayFocusIds.includes(taskIdStr);
    let nextIds: string[];
    if (isCurrentlyFocused) {
      nextIds = todayFocusIds.filter((id) => id !== taskIdStr);
    } else {
      nextIds = [...todayFocusIds, taskIdStr];
    }
    setTodayFocusIds(nextIds);

    try {
      const currentStored = JSON.parse(localStorage.getItem("momentum_today_focus_actions") || "[]");
      let nextActions = Array.isArray(currentStored) ? [...currentStored] : [];
      if (isCurrentlyFocused) {
        nextActions = nextActions.filter((a: any) => String(a.id) !== taskIdStr);
      } else {
        if (!nextActions.some((a: any) => String(a.id) === taskIdStr)) {
          nextActions.push({
            id: taskIdStr,
            title: t.title,
            completed: Boolean(t.completed),
          });
        }
      }
      localStorage.setItem("momentum_today_focus_actions", JSON.stringify(nextActions));
      window.dispatchEvent(new Event("storage"));
    } catch (_) {}
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Please enter a title for your action.");
      return;
    }
    setTitleError(null);

    // Ensure dueDate is optional and defaults to today's date if empty
    const nowIso = new Date().toISOString();
    const finalDueDate = dueDate ? new Date(dueDate).toISOString() : nowIso;

    const newTaskPayload = {
      title: title.trim(),
      description: description.trim() || null,
      estimatedTime: `${timeValue} ${timeUnit}`,
      emotionalIntensity: intensity,
      dueDate: finalDueDate,
      recurrence: actionType === "habit" ? (recurrence === "none" ? "daily" : recurrence) : "none",
      parentId: null,
    };

    // Optimistically update tasks state immediately
    const tempId = Date.now();
    const optimisticTask: Task = {
      id: tempId,
      ...newTaskPayload,
      completed: 0,
      sortOrder: 0,
    };

    setTasks((prev) => [optimisticTask, ...prev]);

    // Persist to localStorage immediately
    try {
      const existing = JSON.parse(localStorage.getItem("momentum_actions") || "[]");
      const updated = [optimisticTask, ...(Array.isArray(existing) ? existing : [])];
      localStorage.setItem("momentum_actions", JSON.stringify(updated));
    } catch (_) {}

    // Persist per-task meta (actionType + predictedDifficulty) keyed by temp ID
    const newMeta: TaskMeta = { actionType };
    if (predictedDifficulty.trim()) {
      const parsed = parseInt(predictedDifficulty, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        newMeta.predictedDifficulty = parsed;
      }
    }
    const nextMeta = { ...taskMeta, [String(tempId)]: newMeta };
    setTaskMeta(nextMeta);
    try {
      localStorage.setItem("momentum_task_meta", JSON.stringify(nextMeta));
    } catch (_) {}

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: [newTaskPayload],
        }),
      });
      // After server responds, fetchTasks will replace tempId with real id;
      // re-key meta from tempId to real id
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        // Find the newly created task (last-inserted should be at top after fetchTasks ordering)
        const matches = data.tasks.filter((t: Task) => t.title === title.trim() && !t.parentId);
        const newTask = matches.length
          ? matches.reduce((a: Task, b: Task) => (b.id > a.id ? b : a))
          : undefined;
        if (newTask && String(newTask.id) !== String(tempId)) {
          const rekeyed = { ...nextMeta };
          rekeyed[String(newTask.id)] = newMeta;
          delete rekeyed[String(tempId)];
          setTaskMeta(rekeyed);
          try {
            localStorage.setItem("momentum_task_meta", JSON.stringify(rekeyed));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error("Task server save failed, persisted locally:", err);
    }

    setTitle("");
    setDescription("");
    setTimeValue("15");
    setTimeUnit("mins");
    setIntensity("Low");
    setDueDate("");
    setRecurrence("none");
    setActionType("oneoff");
    setPredictedDifficulty("");
    setIsFormOpen(false);
  }

  async function handleAddSub(parentId: number) {
    if (!subTaskTitle.trim()) return;

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: [
          {
            title: subTaskTitle,
            description: subTaskDescription.trim() || null,
            estimatedTime: `${subTaskTimeValue} ${subTaskTimeUnit}`,
            emotionalIntensity: subTaskIntensity,
            dueDate: subTaskDueDate || null,
            recurrence: subTaskRecurrence,
            parentId,
          },
        ],
      }),
    });

    setSubTaskTitle("");
    setSubTaskDescription("");
    setSubTaskTimeValue("15");
    setSubTaskTimeUnit("mins");
    setSubTaskIntensity("Low");
    setSubTaskDueDate("");
    setSubTaskRecurrence("none");
    setAddingSubToTaskId(null);
    fetchTasks();
  }

  function persistDaily(next: DailyCompletions) {
    setDailyCompletions(next);
    try {
      localStorage.setItem('momentum_daily_completions', JSON.stringify(next));
    } catch (_) {}
  }

  async function toggleComplete(id: number, currentStatus: number) {
    const task = tasks.find((t) => t.id === id);
    if (isRecurringTask(task)) {
      setRatingEditMode(false);
      if (task && effDone(task)) {
        // Un-check today: drop the latest log for today only (history for other days is untouched)
        const key = String(id);
        const entry = todayEntry(id);
        const nextEntry = { count: Math.max(0, entry.count - 1), ratings: entry.ratings.slice(0, -1) };
        persistDaily({ ...dailyCompletions, [key]: { ...(dailyCompletions[key] || {}), [todayKey]: nextEntry } });
        await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: 0 }),
        });
        fetchTasks();
      } else {
        setRatingPopoverId(id);
      }
      return;
    }
    const nextCompleted = !currentStatus;
    if (nextCompleted) {
      // Open rating popover instead of immediately completing
      setRatingPopoverId(id);
    } else {
      // Un-completing: just toggle back
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: 0 }),
      });
      fetchTasks();
    }
  }

  async function handleSelectRelief(taskId: number, rating: number) {
    setRatingPopoverId(null);

    // Persist relief rating
    const nextReliefs = { ...actualReliefs, [String(taskId)]: rating };
    setActualReliefs(nextReliefs);
    try {
      localStorage.setItem('momentum_actual_reliefs', JSON.stringify(nextReliefs));
    } catch (_) {}

    const task = tasks.find((t) => t.id === taskId);
    const meta = taskMeta[String(taskId)];

    // ── Recurring sub-day lifecycle ──
    if (task && isRecurringTask(task)) {
      const key = String(taskId);
      const target = targetCount(task);
      const entry = todayEntry(taskId);
      const editing = ratingEditMode && entry.count > 0;
      setRatingEditMode(false);

      const nextEntry = editing
        ? { count: entry.count, ratings: [...entry.ratings.slice(0, -1), rating] }
        : { count: entry.count + 1, ratings: [...entry.ratings, rating] };
      persistDaily({ ...dailyCompletions, [key]: { ...(dailyCompletions[key] || {}), [todayKey]: nextEntry } });

      if (!editing) {
        if (nextEntry.count >= target) {
          // Full completion: partial points already granted for earlier logs + full habit points
          awardPoints(target > 1 ? 10 + POINT_VALUES.DAILY_HABIT : POINT_VALUES.DAILY_HABIT);
        } else {
          awardPoints(10); // partial Resilience Points
        }
      }

      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextEntry.count >= target ? 1 : 0 }),
      });
      fetchTasks();
      return;
    }

    // Award points
    const isHabit = meta?.actionType === 'habit' || (task?.recurrence && task.recurrence !== 'none');
    if (isHabit) {
      awardPoints(POINT_VALUES.DAILY_HABIT);
    } else {
      const difficulty = meta?.predictedDifficulty ?? (task?.emotionalIntensity === 'High' ? 8 : task?.emotionalIntensity === 'Medium' ? 5 : 2);
      awardPoints(POINT_VALUES.highDiscomfortAction(difficulty));
    }

    // Mark as complete on server
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: 1 }),
    });
    fetchTasks();
  }



  async function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditEstimatedTime(task.estimatedTime || "");
    setEditIntensity(task.emotionalIntensity || "Low");
    setEditDueDate(task.dueDate || "");
    setEditRecurrence(task.recurrence || "none");
  }

  async function handleSaveEdit(id: number) {
    if (!editTitle.trim()) return;

    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        description: editDescription.trim() || null,
        estimatedTime: editEstimatedTime,
        emotionalIntensity: editIntensity,
        dueDate: editDueDate || null,
        recurrence: editRecurrence,
      }),
    });

    setEditingTaskId(null);
    fetchTasks();
  }

  async function handleClearCompleted() {
    if (!confirm("Are you sure you want to clear completed tasks?")) return;
    try {
      const res = await fetch("/api/tasks", { method: "DELETE" });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error("Failed to clear completed tasks:", err);
    }
  }

  async function handleDeleteTask(id: number) {
    if (!confirm("Are you sure you want to delete this action?")) return;
    
    // Optimistic removal from state
    setTasks((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
    
    // Update momentum_actions cache
    try {
      const stored = localStorage.getItem("momentum_actions");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((t: any) => t.id !== id && t.parentId !== id);
          localStorage.setItem("momentum_actions", JSON.stringify(updated));
        }
      }
    } catch (_) {}

    // If pinned in Today's Focus, remove it and sync storage
    const taskIdStr = String(id);
    if (todayFocusIds.includes(taskIdStr)) {
      setTodayFocusIds((prev) => prev.filter((i) => i !== taskIdStr));
      try {
        const focusStored = JSON.parse(localStorage.getItem("momentum_today_focus_actions") || "[]");
        if (Array.isArray(focusStored)) {
          const updatedFocus = focusStored.filter((a: any) => String(a.id) !== taskIdStr);
          localStorage.setItem("momentum_today_focus_actions", JSON.stringify(updatedFocus));
          window.dispatchEvent(new Event("storage"));
        }
      } catch (_) {}
    }

    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete task on server:", err);
    }
  }

  async function moveParentTask(parentIndex: number, direction: "up" | "down") {
    const parentTasks = tasks.filter((t) => !t.parentId);
    const targetIndex = direction === "up" ? parentIndex - 1 : parentIndex + 1;
    if (targetIndex < 0 || targetIndex >= parentTasks.length) return;

    const temp = parentTasks[parentIndex];
    parentTasks[parentIndex] = parentTasks[targetIndex];
    parentTasks[targetIndex] = temp;

    // Rebuild order maintaining subtasks underneath their parents
    const subTasks = tasks.filter((t) => t.parentId);
    const rebuiltTasks: Task[] = [];
    parentTasks.forEach((pt) => {
      rebuiltTasks.push(pt);
      subTasks
        .filter((st) => st.parentId === pt.id)
        .forEach((st) => rebuiltTasks.push(st));
    });

    setTasks(rebuiltTasks);

    try {
      const orderedIds = rebuiltTasks.map((t) => t.id);
      await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (err) {
      console.error("Reorder parents failed:", err);
      fetchTasks();
    }
  }

  async function moveSubTask(
    parentId: number,
    subIndex: number,
    direction: "up" | "down",
  ) {
    const parentTasks = tasks.filter((t) => !t.parentId);
    const subTasks = tasks.filter((t) => t.parentId);
    const siblingSubTasks = subTasks.filter((st) => st.parentId === parentId);

    const targetIndex = direction === "up" ? subIndex - 1 : subIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblingSubTasks.length) return;

    const temp = siblingSubTasks[subIndex];
    siblingSubTasks[subIndex] = siblingSubTasks[targetIndex];
    siblingSubTasks[targetIndex] = temp;

    const rebuiltTasks: Task[] = [];
    parentTasks.forEach((pt) => {
      rebuiltTasks.push(pt);
      if (pt.id === parentId) {
        siblingSubTasks.forEach((st) => rebuiltTasks.push(st));
      } else {
        subTasks
          .filter((st) => st.parentId === pt.id)
          .forEach((st) => rebuiltTasks.push(st));
      }
    });

    setTasks(rebuiltTasks);

    try {
      const orderedIds = rebuiltTasks.map((t) => t.id);
      await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (err) {
      console.error("Reorder subtasks failed:", err);
      fetchTasks();
    }
  }

  // Calendar Link Helpers
  function formatDateTimeForGoogle(dateStr: string) {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  function getCalendarUrls(t: Task) {
    const titleStr = encodeURIComponent(`Momentum: ${t.title}`);
    const details = encodeURIComponent(
      `Coping Grounding Task.\nEstimated time: ${t.estimatedTime || "N/A"}\nEmotional Cost/Intensity: ${t.emotionalIntensity || "N/A"}\nRepeat: ${t.recurrence || "none"}`,
    );

    const startDate = t.dueDate
      ? formatDateTimeForGoogle(t.dueDate)
      : formatDateTimeForGoogle(new Date().toISOString());
    const endDate = t.dueDate
      ? formatDateTimeForGoogle(
          new Date(
            new Date(t.dueDate).getTime() + 30 * 60 * 1000,
          ).toISOString(),
        )
      : formatDateTimeForGoogle(
          new Date(new Date().getTime() + 30 * 60 * 1000).toISOString(),
        );

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleStr}&dates=${startDate}/${endDate}&details=${details}`;

    const startIso = t.dueDate
      ? new Date(t.dueDate).toISOString()
      : new Date().toISOString();
    const endIso = new Date(
      new Date(startIso).getTime() + 30 * 60 * 1000,
    ).toISOString();
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${titleStr}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(endIso)}&body=${details}`;

    return { googleUrl, outlookUrl };
  }

  function downloadAppleIcs(t: Task) {
    const startIso = t.dueDate
      ? new Date(t.dueDate).toISOString()
      : new Date().toISOString();
    const endIso = new Date(
      new Date(startIso).getTime() + 30 * 60 * 1000,
    ).toISOString();

    const startFormatted = startIso.replace(/[-:]/g, "").split(".")[0] + "Z";
    const endFormatted = endIso.replace(/[-:]/g, "").split(".")[0] + "Z";

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Momentum//NONSGML Mental Wellness App//EN",
      "BEGIN:VEVENT",
      `SUMMARY:Momentum: ${t.title}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `DESCRIPTION:Coping Grounding Task.\\nEstimated time: ${t.estimatedTime || "N/A"}\\nEmotional Cost/Intensity: ${t.emotionalIntensity || "N/A"}\\nRepeat: ${t.recurrence || "none"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `momentum-${t.title.replace(/\s+/g, "-").toLowerCase().substring(0, 20)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function CalendarDropdown({ task }: { task: Task }) {
    const [open, setOpen] = useState(false);
    const urls = getCalendarUrls(task);

    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="secondary"
          style={{
            padding: "0.35rem 0.6rem",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.2rem",
            margin: 0,
          }}
        >
          <span>📅 Add to Calendar</span>
          <span style={{ fontSize: "0.5rem" }}>▼</span>
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              right: 0,
              marginTop: "0.25rem",
              backgroundColor: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              width: "160px",
              padding: "0.25rem 0",
            }}
          >
            <a
              href={urls.googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                color: "#444",
                textDecoration: "none",
              }}
              className="calendar-link"
            >
              Google Calendar
            </a>
            <a
              href={urls.outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                color: "#444",
                textDecoration: "none",
              }}
              className="calendar-link"
            >
              Outlook
            </a>
            <button
              type="button"
              onClick={() => {
                downloadAppleIcs(task);
                setOpen(false);
              }}
              style={{
                textAlign: "left",
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                color: "#444",
                background: "none",
                border: "none",
                width: "100%",
                cursor: "pointer",
                borderRadius: 0,
              }}
              className="calendar-link"
            >
              Apple Calendar (.ics)
            </button>
          </div>
        )}
      </div>
    );
  }

  // Filter Helpers for views
  const isDateToday = (dateStr: string | null | undefined) => {
    if (!dateStr) return true; // Tasks without explicit due date appear in today's view by default
    const today = new Date();
    const d = new Date(dateStr);
    return (
      today.getFullYear() === d.getFullYear() &&
      today.getMonth() === d.getMonth() &&
      today.getDate() === d.getDate()
    );
  };

  const getTasksForDay = (date: Date) => {
    return tasks.filter((t) => {
      if (t.recurrence === "daily" || t.recurrence === "twice-daily")
        return true;
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return (
        date.getFullYear() === d.getFullYear() &&
        date.getMonth() === d.getMonth() &&
        date.getDate() === d.getDate()
      );
    });
  };

  const getDayLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    ) {
      return "Today";
    }
    if (
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate()
    ) {
      return "Tomorrow";
    }
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Generate next 7 days list
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + agendaWeekOffset * 7 + i);
    return d;
  });

  // Separate parent and child tasks for 'all' view
  const parentTasks = tasks.filter((t) => !t.parentId);
  const subTasks = tasks.filter((t) => t.parentId);

  // Resolve a task's kind: the user's explicit selection wins; recurrence is only a fallback
  function getTaskKind(t: Task): 'habit' | 'oneoff' {
    const meta = taskMeta[String(t.id)];
    if (meta?.actionType === "oneoff") return "oneoff";
    if (meta?.actionType === "habit") return "habit";
    return t.recurrence === "daily" ||
      t.recurrence === "twice-daily" ||
      t.recurrence === "weekly"
      ? "habit"
      : "oneoff";
  }

  // Helper: does a task match the current taskTypeFilter?
  function matchesTypeFilter(t: Task): boolean {
    if (taskTypeFilter === "all") return true;
    return getTaskKind(t) === taskTypeFilter;
  }

  const filteredParentTasks = parentTasks.filter(matchesTypeFilter);

  // Flat list of today's tasks
  const todayTasks = tasks.filter(
    (t) =>
      !t.dueDate ||
      isDateToday(t.dueDate) ||
      t.recurrence === "daily" ||
      t.recurrence === "twice-daily" ||
      todayFocusIds.includes(String(t.id)),
  );

  const filteredTodayTasks = todayTasks.filter(matchesTypeFilter);

  return (
    <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: "2rem", paddingBottom: "2rem", boxSizing: "border-box" }}>
      <header
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              color: "var(--sage-green)",
              marginBottom: "0.5rem",
              fontSize: "2.5rem",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Action Planner
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#555",
              margin: "0.5rem 0 0 0",
            }}
          >
            Manage, reorder, and schedule the gentle steps generated from your
            worries.
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
        </div>
        {tasks.some((t) => t.completed) && (
          <button
            type="button"
            onClick={handleClearCompleted}
            className="secondary"
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              transition: "all 0.2s",
              margin: 0,
            }}
          >
            🧹 Clear Completed
          </button>
        )}
      </header>

      {/* View Switcher Menu & New Action Toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveView("today")}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor:
                activeView === "today" ? "var(--sage-green)" : "transparent",
              color: activeView === "today" ? "#fff" : "#666",
              border: activeView === "today" ? "none" : "1px solid var(--border)",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📅 Today's View
          </button>
          <button
            type="button"
            onClick={() => setActiveView("week")}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor:
                activeView === "week" ? "var(--sage-green)" : "transparent",
              color: activeView === "week" ? "#fff" : "#666",
              border: activeView === "week" ? "none" : "1px solid var(--border)",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🗓️ Weekly Agenda View
          </button>
          <button
            type="button"
            onClick={() => setActiveView("all")}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor:
                activeView === "all" ? "var(--sage-green)" : "transparent",
              color: activeView === "all" ? "#fff" : "#666",
              border: activeView === "all" ? "none" : "1px solid var(--border)",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📋 All Actions (List)
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isFormOpen) {
              // Always open the drawer defaulting to One-Off
              setActionType("oneoff");
              setRecurrence("none");
            }
            setIsFormOpen(!isFormOpen);
          }}
          style={{
            padding: "0.55rem 1.1rem",
            fontSize: "0.9rem",
            backgroundColor: isFormOpen ? "#475569" : "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <span>{isFormOpen ? "✕ Close Form" : "+ New Action"}</span>
        </button>
      </div>

      {/* Task Type Filter Strip */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        {(["all", "habit", "oneoff"] as TaskTypeFilter[]).map((f) => {
          const labels: Record<TaskTypeFilter, string> = {
            all: "All Actions",
            habit: "🔁 Daily Habits",
            oneoff: "📌 One-Off Tasks",
          };
          return (
            <button
              key={f}
              type="button"
              onClick={() => setTaskTypeFilter(f)}
              style={{
                padding: "0.3rem 0.85rem",
                fontSize: "0.8rem",
                backgroundColor: taskTypeFilter === f ? "#0f172a" : "transparent",
                color: taskTypeFilter === f ? "#fff" : "#64748b",
                border: taskTypeFilter === f ? "none" : "1px solid #e2e8f0",
                borderRadius: "20px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Expandable Action Creation Form */}
      {isFormOpen && (
        <form
          onSubmit={async (e) => {
            await handleAdd(e);
            setIsFormOpen(false);
          }}
          style={{
            backgroundColor: "#fff",
            padding: "1.5rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            marginBottom: "2rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-end",
            boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
            animation: "fadeIn 0.25s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              width: "100%",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "1rem",
                width: "100%",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 200px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    marginBottom: "0.3rem",
                    color: "var(--foreground)",
                    fontWeight: 600,
                  }}
                >
                  Short Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  placeholder="E.g., Prepare Presentation"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "var(--radius)",
                    border: titleError ? "1.5px solid #ef4444" : "1px solid var(--border)",
                    backgroundColor: titleError ? "#fef2f2" : "#fff",
                  }}
                />
                {titleError && (
                  <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", fontWeight: 600 }}>
                    {titleError}
                  </p>
                )}
              </div>
            </div>
            <div style={{ width: "100%" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  marginBottom: "0.3rem",
                  color: "var(--foreground)",
                  fontWeight: 600,
                }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                placeholder="Describe your steps or plan here..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  fontFamily: "inherit",
                  resize: "none",
                  overflow: "hidden",
                  lineHeight: "1.5",
                  minHeight: "60px",
                }}
              />
            </div>
          </div>
          <div style={{ width: "150px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                marginBottom: "0.3rem",
                color: "var(--foreground)",
              }}
            >
              Time span
            </label>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <input
                type="number"
                min="1"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                style={{
                  width: "60px",
                  padding: "0.75rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                }}
              />
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  backgroundColor: "#fff",
                }}
              >
                <option value="mins">Mins</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>
          <div style={{ width: "100px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                marginBottom: "0.3rem",
                color: "var(--foreground)",
              }}
            >
              Intensity
            </label>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                backgroundColor: "white",
              }}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div style={{ width: "160px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                marginBottom: "0.3rem",
                color: "var(--foreground)",
              }}
            >
              Due Date & Time
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                backgroundColor: "white",
              }}
            />
          </div>
          {actionType === "habit" && (<div style={{ width: "130px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                marginBottom: "0.3rem",
                color: "var(--foreground)",
              }}
            >
              Repeat
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                backgroundColor: "white",
              }}
            >

              <option value="daily">Daily</option>
              <option value="twice-daily">Twice Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>)}
          {/* Action Type selector */}
          <div style={{ width: "auto" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                marginBottom: "0.3rem",
                color: "var(--foreground)",
                fontWeight: 600,
              }}
            >
              Type
            </label>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {(["habit", "oneoff"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setActionType(t);
                    setRecurrence(t === "habit" ? "daily" : "none");
                  }}
                  style={{
                    padding: "0.75rem 0.9rem",
                    fontSize: "0.8rem",
                    backgroundColor: actionType === t ? "#0f172a" : "#f1f5f9",
                    color: actionType === t ? "#fff" : "#64748b",
                    border: actionType === t ? "2px solid #0f172a" : "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontWeight: actionType === t ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: actionType === t ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                    outline: "none",
                  }}
                >
                  {t === "habit" ? "🔁 Daily Habit" : "📌 One-Off"}
                </button>
              ))}
            </div>
          </div>
          {/* Predicted Difficulty */}
          <div style={{ width: "130px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                marginBottom: "0.3rem",
                color: "var(--foreground)",
                fontWeight: 600,
              }}
            >
              Predicted Difficulty
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min="1"
                max="10"
                value={predictedDifficulty}
                onChange={(e) => setPredictedDifficulty(e.target.value)}
                placeholder="1–10"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  paddingRight: "2rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  backgroundColor: "#fff",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.7rem",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              >
                /10
              </span>
            </div>
          </div>
          <button
            type="submit"
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add Action
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading your gently actionable tasks...</p>
      ) : (
        <>
          {/* ALL TASKS (BY TASK) VIEW */}
          {activeView === "all" &&
            (filteredParentTasks.length === 0 ? (
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
                  {taskTypeFilter === "all"
                    ? "You have no actions yet. Schedule your first action above!"
                    : `No ${taskTypeFilter === "habit" ? "daily habits" : "one-off tasks"} found.`}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                {filteredParentTasks.map((pt, parentIndex) => {
                  const currentChildren = subTasks.filter(
                    (st) => st.parentId === pt.id,
                  );
                  const isEditing = editingTaskId === pt.id;

                  return (
                    <div
                      key={pt.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {/* Parent Task Container */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          padding: "1.25rem 1.5rem",
                          backgroundColor: "#fff",
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--border)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                          opacity: effDone(pt) ? 0.6 : 1,
                          transition: "opacity 0.2s",
                        }}
                      >
                        {/* Reordering column */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.1rem",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => moveParentTask(parentIndex, "up")}
                            disabled={parentIndex === 0 || !!pt.completed}
                            style={{
                              background: "none",
                              border: "none",
                              color:
                                parentIndex === 0 || !!pt.completed
                                  ? "#e2e8f0"
                                  : "#888",
                              cursor: "pointer",
                              padding: "0.1rem 0.2rem",
                              fontSize: "0.85rem",
                            }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveParentTask(parentIndex, "down")}
                            disabled={
                              parentIndex === parentTasks.length - 1 ||
                              !!pt.completed
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color:
                                parentIndex === parentTasks.length - 1 ||
                                !!pt.completed
                                  ? "#e2e8f0"
                                  : "#888",
                              cursor: "pointer",
                              padding: "0.1rem 0.2rem",
                              fontSize: "0.85rem",
                            }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>

                        <input
                          type="checkbox"
                          checked={effDone(pt)}
                          onChange={() => toggleComplete(pt.id, pt.completed)}
                          style={{
                            width: "1.4rem",
                            height: "1.4rem",
                            cursor: "pointer",
                            accentColor: "var(--sage-green)",
                          }}
                        />

                        {isEditing ? (
                          /* Editing Form fields */
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "0.75rem",
                                alignItems: "flex-end",
                                width: "100%",
                              }}
                            >
                              <div style={{ flex: "2 1 200px" }}>
                                <label
                                  style={{
                                    display: "block",
                                    fontSize: "0.8rem",
                                    color: "#555",
                                    marginBottom: "0.2rem",
                                  }}
                                >
                                  Short Title
                                </label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                    border: "1px solid var(--border)",
                                  }}
                                />
                              </div>
                              <div style={{ width: "140px" }}>
                                {(() => {
                                  const parsed =
                                    parseTimeStr(editEstimatedTime);
                                  return (
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "0.25rem",
                                      }}
                                    >
                                      <input
                                        type="number"
                                        min="1"
                                        value={parsed.value}
                                        onChange={(e) =>
                                          setEditEstimatedTime(
                                            `${e.target.value} ${parsed.unit}`,
                                          )
                                        }
                                        style={{
                                          width: "60px",
                                          padding: "0.5rem",
                                          borderRadius: "4px",
                                          border: "1px solid var(--border)",
                                        }}
                                      />
                                      <select
                                        value={parsed.unit}
                                        onChange={(e) =>
                                          setEditEstimatedTime(
                                            `${parsed.value} ${e.target.value}`,
                                          )
                                        }
                                        style={{
                                          flex: 1,
                                          padding: "0.5rem",
                                          borderRadius: "4px",
                                          border: "1px solid var(--border)",
                                          backgroundColor: "#fff",
                                        }}
                                      >
                                        <option value="mins">Mins</option>
                                        <option value="hours">Hours</option>
                                      </select>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div style={{ width: "90px" }}>
                                <select
                                  value={editIntensity}
                                  onChange={(e) =>
                                    setEditIntensity(e.target.value)
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                    border: "1px solid var(--border)",
                                    backgroundColor: "#fff",
                                  }}
                                >
                                  <option>Low</option>
                                  <option>Medium</option>
                                  <option>High</option>
                                </select>
                              </div>
                              <div style={{ width: "160px" }}>
                                <input
                                  type="datetime-local"
                                  value={editDueDate}
                                  onChange={(e) =>
                                    setEditDueDate(e.target.value)
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                    border: "1px solid var(--border)",
                                  }}
                                />
                              </div>
                              <div style={{ width: "95px" }}>
                                <select
                                  value={editRecurrence}
                                  onChange={(e) =>
                                    setEditRecurrence(e.target.value)
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                    border: "1px solid var(--border)",
                                    backgroundColor: "#fff",
                                  }}
                                >
                                  <option value="none">Once</option>
                                  <option value="daily">Daily</option>
                                  <option value="twice-daily">
                                    Twice Daily
                                  </option>
                                  <option value="weekly">Weekly</option>
                                </select>
                              </div>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(pt.id)}
                                  style={{ padding: "0.5rem 1rem" }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="secondary"
                                  style={{ padding: "0.5rem 1rem" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                            <div style={{ width: "100%" }}>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "0.8rem",
                                  color: "#555",
                                  marginBottom: "0.2rem",
                                }}
                              >
                                Description
                              </label>
                              <textarea
                                value={editDescription}
                                onChange={(e) => {
                                  setEditDescription(e.target.value);
                                  e.target.style.height = "auto";
                                  e.target.style.height =
                                    e.target.scrollHeight + "px";
                                }}
                                style={{
                                  width: "100%",
                                  padding: "0.5rem",
                                  borderRadius: "4px",
                                  border: "1px solid var(--border)",
                                  fontFamily: "inherit",
                                  resize: "none",
                                  overflow: "hidden",
                                  lineHeight: "1.4",
                                  minHeight: "50px",
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          /* Display Layout */
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "1rem",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: "1.15rem",
                                  fontWeight: 600,
                                  display: "block",
                                  marginBottom: "0.2rem",
                                  textDecoration: effDone(pt)
                                    ? "line-through"
                                    : "none",
                                  color: effDone(pt)
                                    ? "#888"
                                    : "var(--foreground)",
                                }}
                              >
                                {pt.title}
                              </span>
                              {pt.description && (
                                <p
                                  style={{
                                    margin: "0 0 0.5rem 0",
                                    fontSize: "0.92rem",
                                    color: "#555",
                                    lineHeight: "1.4",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {pt.description}
                                </p>
                              )}
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#666",
                                  display: "flex",
                                  gap: "0.75rem",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    backgroundColor: "#f0f4f8",
                                    padding: "0.2rem 0.6rem",
                                    borderRadius: "12px",
                                  }}
                                >
                                  ⏱ {pt.estimatedTime || "N/A"}
                                </span>
                                <span
                                  style={{
                                    backgroundColor: "#edf2f7",
                                    padding: "0.2rem 0.6rem",
                                    borderRadius: "12px",
                                  }}
                                >
                                  Intensity: {pt.emotionalIntensity || "N/A"}
                                </span>
                                {pt.dueDate && (
                                  <span
                                    style={{
                                      backgroundColor: "#fff0f0",
                                      padding: "0.2rem 0.6rem",
                                      borderRadius: "12px",
                                    }}
                                  >
                                    📅 By{" "}
                                    {new Date(pt.dueDate).toLocaleString(
                                      undefined,
                                      {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      },
                                    )}
                                  </span>
                                )}
                                {pt.recurrence && pt.recurrence !== "none" && (
                                  <span
                                    style={{
                                      backgroundColor: "#fdf4e3",
                                      padding: "0.2rem 0.6rem",
                                      borderRadius: "12px",
                                      color: "#b45309",
                                      fontWeight: 600,
                                    }}
                                  >
                                    🔁{" "}
                                    {pt.recurrence === "daily"
                                      ? "Daily"
                                      : "Weekly"}
                                  </span>
                                )}
                              </div>

                              {/* Action type pill — All Actions view */}
                              {(() => {
                                const kind = getTaskKind(pt);
                                return (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      marginTop: "0.4rem",
                                      fontSize: "0.72rem",
                                      backgroundColor: kind === 'habit' ? "#ecfdf5" : "#f0f9ff",
                                      padding: "0.15rem 0.5rem",
                                      borderRadius: "8px",
                                      color: kind === 'habit' ? "#065f46" : "#0369a1",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {kind === 'habit' ? '🔁 Habit' : '📌 One-Off'}
                                  </span>
                                );
                              })()}

                              {/* Completion rating badge — All Actions view */}
                              {renderRecurringBadge(pt)}
                              {!isRecurringTask(pt) && !!pt.completed && (() => {
                                const meta = taskMeta[String(pt.id)];
                                const actualRelief = actualReliefs[String(pt.id)];
                                const predicted = (meta?.predictedDifficulty !== undefined && meta?.predictedDifficulty !== null) ? meta.predictedDifficulty : null;
                                const delta = (predicted !== null && actualRelief !== undefined) ? actualRelief - predicted : null;
                                if (predicted !== null && actualRelief !== undefined) {
                                  return (
                                    <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                      <button
                                        type="button"
                                        onClick={() => setRatingPopoverId(pt.id)}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.35rem",
                                          fontSize: "0.75rem",
                                          fontWeight: 700,
                                          backgroundColor: "#f0fdf4",
                                          border: "1px solid #bbf7d0",
                                          borderRadius: "20px",
                                          padding: "0.2rem 0.7rem",
                                          color: "#15803d",
                                          cursor: "pointer",
                                          width: "fit-content",
                                        }}
                                      >
                                        <span style={{ color: "#94a3b8", fontWeight: 600 }}>Predicted: {predicted}/10</span>
                                        <span style={{ color: "#94a3b8" }}>➔</span>
                                        <span>Actual Relief: {actualRelief}/10</span>
                                        <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>✏️</span>
                                      </button>
                                      {delta !== null && delta >= 0 && (
                                        <span style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.25rem",
                                          fontSize: "0.72rem",
                                          fontWeight: 800,
                                          color: "#059669",
                                          backgroundColor: "#ecfdf5",
                                          border: "1px solid #a7f3d0",
                                          borderRadius: "20px",
                                          padding: "0.15rem 0.6rem",
                                          width: "fit-content",
                                        }}>
                                          🎉 Overcame Dread
                                        </span>
                                      )}
                                    </div>
                                  );
                                } else if (actualRelief !== undefined) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => setRatingPopoverId(pt.id)}
                                      style={{
                                        marginTop: "0.4rem",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        backgroundColor: "#f0fdf4",
                                        border: "1px solid #bbf7d0",
                                        borderRadius: "20px",
                                        padding: "0.2rem 0.7rem",
                                        color: "#15803d",
                                        cursor: "pointer",
                                        width: "fit-content",
                                      }}
                                    >
                                      Completed (Rating: {actualRelief}/10) ✏️
                                    </button>
                                  );
                                } else {
                                  return (
                                    <span style={{
                                      marginTop: "0.4rem",
                                      display: "inline-flex",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      backgroundColor: "#f0fdf4",
                                      border: "1px solid #bbf7d0",
                                      borderRadius: "20px",
                                      padding: "0.2rem 0.7rem",
                                      color: "#15803d",
                                    }}>
                                      ✅ Completed
                                    </span>
                                  );
                                }
                              })()}
                            </div>

                            {/* Parent Actions */}
                            {!effDone(pt) && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.5rem",
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingSubToTaskId(
                                      addingSubToTaskId === pt.id
                                        ? null
                                        : pt.id,
                                    );
                                    setSubTaskTitle("");
                                  }}
                                  className="secondary"
                                  style={{
                                    padding: "0.35rem 0.6rem",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  + Add Sub-step
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleTodayFocus(pt)}
                                  title={todayFocusIds.includes(String(pt.id)) ? "Remove from Today's Focus" : "Pin to Today's Focus"}
                                  style={{
                                    backgroundColor: todayFocusIds.includes(String(pt.id)) ? "#fef3c7" : "#f1f5f9",
                                    border: todayFocusIds.includes(String(pt.id)) ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                                    color: todayFocusIds.includes(String(pt.id)) ? "#b45309" : "#475569",
                                    borderRadius: "8px",
                                    padding: "0.35rem 0.6rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  {todayFocusIds.includes(String(pt.id)) ? "⭐ Focused" : "☆ Focus"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEdit(pt)}
                                  className="secondary"
                                  style={{
                                    padding: "0.35rem 0.6rem",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(pt.id)}
                                  title="Delete action"
                                  style={{
                                    background: "none",
                                    border: "1px solid #fecaca",
                                    backgroundColor: "#fef2f2",
                                    color: "#dc2626",
                                    borderRadius: "8px",
                                    padding: "0.35rem 0.6rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                                <CalendarDropdown task={pt} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sub-steps container (indented) */}
                      {(currentChildren.length > 0 ||
                        addingSubToTaskId === pt.id) && (
                        <div
                          style={{
                            marginLeft: "2.5rem",
                            paddingLeft: "1rem",
                            borderLeft: "2px dashed var(--border)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                            animation: "fadeIn 0.2s ease",
                          }}
                        >
                          {currentChildren.map((st, subIndex) => {
                            const isSubEditing = editingTaskId === st.id;

                            return (
                              <div
                                key={st.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                  padding: "0.75rem 1.25rem",
                                  backgroundColor: "#fff",
                                  borderRadius: "var(--radius)",
                                  border: "1px solid var(--border)",
                                  opacity: effDone(st) ? 0.6 : 1,
                                }}
                              >
                                {/* Reordering subtask column */}
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.05rem",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveSubTask(pt.id, subIndex, "up")
                                    }
                                    disabled={subIndex === 0 || !!st.completed}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color:
                                        subIndex === 0 || !!st.completed
                                          ? "#e2e8f0"
                                          : "#888",
                                      cursor: "pointer",
                                      padding: "0 0.1rem",
                                      fontSize: "0.75rem",
                                    }}
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveSubTask(pt.id, subIndex, "down")
                                    }
                                    disabled={
                                      subIndex === currentChildren.length - 1 ||
                                      !!st.completed
                                    }
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color:
                                        subIndex ===
                                          currentChildren.length - 1 ||
                                        !!st.completed
                                          ? "#e2e8f0"
                                          : "#888",
                                      cursor: "pointer",
                                      padding: "0 0.1rem",
                                      fontSize: "0.75rem",
                                    }}
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                </div>

                                <input
                                  type="checkbox"
                                  checked={effDone(st)}
                                  onChange={() =>
                                    toggleComplete(st.id, st.completed)
                                  }
                                  style={{
                                    width: "1.2rem",
                                    height: "1.2rem",
                                    cursor: "pointer",
                                    accentColor: "var(--sage-green)",
                                  }}
                                />

                                {isSubEditing ? (
                                  <div
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "0.75rem",
                                      width: "100%",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "0.5rem",
                                        alignItems: "flex-end",
                                        width: "100%",
                                      }}
                                    >
                                      <div style={{ flex: "2 1 150px" }}>
                                        <label
                                          style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            color: "#555",
                                            marginBottom: "0.2rem",
                                          }}
                                        >
                                          Short Title
                                        </label>
                                        <input
                                          type="text"
                                          value={editTitle}
                                          onChange={(e) =>
                                            setEditTitle(e.target.value)
                                          }
                                          style={{
                                            width: "100%",
                                            padding: "0.4rem",
                                            borderRadius: "4px",
                                            border: "1px solid var(--border)",
                                          }}
                                        />
                                      </div>
                                      <div style={{ width: "140px" }}>
                                        {(() => {
                                          const parsed =
                                            parseTimeStr(editEstimatedTime);
                                          return (
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: "0.25rem",
                                              }}
                                            >
                                              <input
                                                type="number"
                                                min="1"
                                                value={parsed.value}
                                                onChange={(e) =>
                                                  setEditEstimatedTime(
                                                    `${e.target.value} ${parsed.unit}`,
                                                  )
                                                }
                                                style={{
                                                  width: "60px",
                                                  padding: "0.4rem",
                                                  borderRadius: "4px",
                                                  border:
                                                    "1px solid var(--border)",
                                                }}
                                              />
                                              <select
                                                value={parsed.unit}
                                                onChange={(e) =>
                                                  setEditEstimatedTime(
                                                    `${parsed.value} ${e.target.value}`,
                                                  )
                                                }
                                                style={{
                                                  flex: 1,
                                                  padding: "0.4rem",
                                                  borderRadius: "4px",
                                                  border:
                                                    "1px solid var(--border)",
                                                  backgroundColor: "#fff",
                                                }}
                                              >
                                                <option value="mins">
                                                  Mins
                                                </option>
                                                <option value="hours">
                                                  Hours
                                                </option>
                                              </select>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div style={{ width: "80px" }}>
                                        <select
                                          value={editIntensity}
                                          onChange={(e) =>
                                            setEditIntensity(e.target.value)
                                          }
                                          style={{
                                            width: "100%",
                                            padding: "0.4rem",
                                            borderRadius: "4px",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "#fff",
                                          }}
                                        >
                                          <option>Low</option>
                                          <option>Medium</option>
                                          <option>High</option>
                                        </select>
                                      </div>
                                      <div style={{ width: "150px" }}>
                                        <input
                                          type="datetime-local"
                                          value={editDueDate}
                                          onChange={(e) =>
                                            setEditDueDate(e.target.value)
                                          }
                                          style={{
                                            width: "100%",
                                            padding: "0.4rem",
                                            borderRadius: "4px",
                                            border: "1px solid var(--border)",
                                          }}
                                        />
                                      </div>
                                      <div style={{ width: "90px" }}>
                                        <select
                                          value={editRecurrence}
                                          onChange={(e) =>
                                            setEditRecurrence(e.target.value)
                                          }
                                          style={{
                                            width: "100%",
                                            padding: "0.4rem",
                                            borderRadius: "4px",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "#fff",
                                          }}
                                        >
                                          <option value="none">Once</option>
                                          <option value="daily">Daily</option>
                                          <option value="twice-daily">
                                            Twice Daily
                                          </option>
                                          <option value="weekly">Weekly</option>
                                        </select>
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "0.25rem",
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEdit(st.id)}
                                          style={{
                                            padding: "0.4rem 0.8rem",
                                            fontSize: "0.85rem",
                                          }}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingTaskId(null)}
                                          className="secondary"
                                          style={{
                                            padding: "0.4rem 0.8rem",
                                            fontSize: "0.85rem",
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                    <div style={{ width: "100%" }}>
                                      <label
                                        style={{
                                          display: "block",
                                          fontSize: "0.8rem",
                                          color: "#555",
                                          marginBottom: "0.2rem",
                                        }}
                                      >
                                        Description
                                      </label>
                                      <textarea
                                        value={editDescription}
                                        onChange={(e) => {
                                          setEditDescription(e.target.value);
                                          e.target.style.height = "auto";
                                          e.target.style.height =
                                            e.target.scrollHeight + "px";
                                        }}
                                        style={{
                                          width: "100%",
                                          padding: "0.4rem",
                                          borderRadius: "4px",
                                          border: "1px solid var(--border)",
                                          fontFamily: "inherit",
                                          resize: "none",
                                          overflow: "hidden",
                                          lineHeight: "1.4",
                                          minHeight: "50px",
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <div>
                                      <span
                                        style={{
                                          fontSize: "0.95rem",
                                          fontWeight: 500,
                                          display: "block",
                                          marginBottom: "0.2rem",
                                          textDecoration: effDone(st)
                                            ? "line-through"
                                            : "none",
                                          color: effDone(st)
                                            ? "#888"
                                            : "var(--foreground)",
                                        }}
                                      >
                                        {st.title}
                                      </span>
                                      {st.description && (
                                        <p
                                          style={{
                                            margin: "0 0 0.3rem 0",
                                            fontSize: "0.85rem",
                                            color: "#555",
                                            lineHeight: "1.4",
                                            whiteSpace: "pre-wrap",
                                          }}
                                        >
                                          {st.description}
                                        </p>
                                      )}
                                      <div
                                        style={{
                                          fontSize: "0.75rem",
                                          color: "#777",
                                          display: "flex",
                                          gap: "0.5rem",
                                          alignItems: "center",
                                        }}
                                      >
                                        <span
                                          style={{
                                            backgroundColor: "#f0f4f8",
                                            padding: "0.1rem 0.4rem",
                                            borderRadius: "8px",
                                          }}
                                        >
                                          ⏱ {st.estimatedTime}
                                        </span>
                                        <span
                                          style={{
                                            backgroundColor: "#edf2f7",
                                            padding: "0.1rem 0.4rem",
                                            borderRadius: "8px",
                                          }}
                                        >
                                          Intensity: {st.emotionalIntensity}
                                        </span>
                                        {st.dueDate && (
                                          <span
                                            style={{
                                              backgroundColor: "#fff0f0",
                                              padding: "0.1rem 0.4rem",
                                              borderRadius: "8px",
                                            }}
                                          >
                                            📅 By{" "}
                                            {new Date(
                                              st.dueDate,
                                            ).toLocaleString(undefined, {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })}
                                          </span>
                                        )}
                                        {st.recurrence &&
                                          st.recurrence !== "none" && (
                                            <span
                                              style={{
                                                backgroundColor: "#fdf4e3",
                                                padding: "0.1rem 0.3rem",
                                                borderRadius: "8px",
                                                color: "#b45309",
                                                fontWeight: 600,
                                              }}
                                            >
                                              🔁{" "}
                                              {st.recurrence === "daily"
                                                ? "Daily"
                                                : "Weekly"}
                                            </span>
                                          )}
                                      </div>
                                    </div>

                                    {!effDone(st) && (
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "0.25rem",
                                          alignItems: "center",
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => startEdit(st)}
                                          className="secondary"
                                          style={{
                                            padding: "0.25rem 0.4rem",
                                            fontSize: "0.7rem",
                                            margin: 0,
                                          }}
                                        >
                                          ✏️ Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTask(st.id)}
                                          title="Delete sub-step"
                                          style={{
                                            background: "none",
                                            border: "1px solid #fecaca",
                                            backgroundColor: "#fef2f2",
                                            color: "#dc2626",
                                            borderRadius: "6px",
                                            padding: "0.25rem 0.4rem",
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            margin: 0,
                                          }}
                                        >
                                          🗑️
                                        </button>
                                        <CalendarDropdown task={st} />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add subtask input box */}
                          {addingSubToTaskId === pt.id && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.75rem",
                                padding: "1rem",
                                backgroundColor: "#f8fafc",
                                border: "1px dashed var(--border)",
                                borderRadius: "var(--radius)",
                                animation: "fadeIn 0.2s ease",
                                width: "100%",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  flexWrap: "wrap",
                                  width: "100%",
                                }}
                              >
                                <div style={{ flex: "1 1 200px" }}>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: "0.8rem",
                                      marginBottom: "0.2rem",
                                      color: "#555",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Short Title
                                  </label>
                                  <input
                                    type="text"
                                    value={subTaskTitle}
                                    onChange={(e) =>
                                      setSubTaskTitle(e.target.value)
                                    }
                                    placeholder="E.g., Slide Outline"
                                    style={{
                                      width: "100%",
                                      padding: "0.5rem",
                                      borderRadius: "4px",
                                      border: "1px solid var(--border)",
                                      backgroundColor: "#fff",
                                    }}
                                  />
                                </div>
                              </div>
                              <div style={{ width: "100%" }}>
                                <label
                                  style={{
                                    display: "block",
                                    fontSize: "0.8rem",
                                    marginBottom: "0.2rem",
                                    color: "#555",
                                    fontWeight: 600,
                                  }}
                                >
                                  Description
                                </label>
                                <textarea
                                  value={subTaskDescription}
                                  onChange={(e) => {
                                    setSubTaskDescription(e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height =
                                      e.target.scrollHeight + "px";
                                  }}
                                  placeholder="E.g., List the main bullet points for each slide..."
                                  rows={2}
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                    border: "1px solid var(--border)",
                                    backgroundColor: "#fff",
                                    fontFamily: "inherit",
                                    resize: "none",
                                    overflow: "hidden",
                                    lineHeight: "1.4",
                                    minHeight: "50px",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  flexWrap: "wrap",
                                  alignItems: "flex-end",
                                }}
                              >
                                <div style={{ width: "150px" }}>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: "0.8rem",
                                      marginBottom: "0.2rem",
                                      color: "#555",
                                    }}
                                  >
                                    Time span
                                  </label>
                                  <div
                                    style={{ display: "flex", gap: "0.25rem" }}
                                  >
                                    <input
                                      type="number"
                                      min="1"
                                      value={subTaskTimeValue}
                                      onChange={(e) =>
                                        setSubTaskTimeValue(e.target.value)
                                      }
                                      style={{
                                        width: "60px",
                                        padding: "0.5rem",
                                        borderRadius: "4px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "#fff",
                                      }}
                                    />
                                    <select
                                      value={subTaskTimeUnit}
                                      onChange={(e) =>
                                        setSubTaskTimeUnit(e.target.value)
                                      }
                                      style={{
                                        flex: 1,
                                        padding: "0.5rem",
                                        borderRadius: "4px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "#fff",
                                      }}
                                    >
                                      <option value="mins">Mins</option>
                                      <option value="hours">Hours</option>
                                    </select>
                                  </div>
                                </div>
                                <div style={{ width: "80px" }}>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: "0.8rem",
                                      marginBottom: "0.2rem",
                                      color: "#555",
                                    }}
                                  >
                                    Intensity
                                  </label>
                                  <select
                                    value={subTaskIntensity}
                                    onChange={(e) =>
                                      setSubTaskIntensity(e.target.value)
                                    }
                                    style={{
                                      width: "100%",
                                      padding: "0.5rem",
                                      borderRadius: "4px",
                                      border: "1px solid var(--border)",
                                      backgroundColor: "#fff",
                                    }}
                                  >
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                  </select>
                                </div>
                                <div style={{ width: "150px" }}>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: "0.8rem",
                                      marginBottom: "0.2rem",
                                      color: "#555",
                                    }}
                                  >
                                    Due Date & Time
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={subTaskDueDate}
                                    onChange={(e) =>
                                      setSubTaskDueDate(e.target.value)
                                    }
                                    style={{
                                      width: "100%",
                                      padding: "0.5rem",
                                      borderRadius: "4px",
                                      border: "1px solid var(--border)",
                                      backgroundColor: "#fff",
                                    }}
                                  />
                                </div>
                                <div style={{ width: "90px" }}>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: "0.8rem",
                                      marginBottom: "0.2rem",
                                      color: "#555",
                                    }}
                                  >
                                    Repeat
                                  </label>
                                  <select
                                    value={subTaskRecurrence}
                                    onChange={(e) =>
                                      setSubTaskRecurrence(e.target.value)
                                    }
                                    style={{
                                      width: "100%",
                                      padding: "0.5rem",
                                      borderRadius: "4px",
                                      border: "1px solid var(--border)",
                                      backgroundColor: "#fff",
                                    }}
                                  >
                                    <option value="none">Once</option>
                                    <option value="daily">Daily</option>
                                    <option value="twice-daily">
                                      Twice Daily
                                    </option>
                                    <option value="weekly">Weekly</option>
                                  </select>
                                </div>
                                <div
                                  style={{ display: "flex", gap: "0.25rem" }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleAddSub(pt.id)}
                                    style={{
                                      padding: "0.5rem 1rem",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddingSubToTaskId(null)}
                                    className="secondary"
                                    style={{
                                      padding: "0.5rem 1rem",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

          {/* TODAY'S VIEW */}
          {activeView === "today" &&
            (filteredTodayTasks.length === 0 ? (
              <div
                style={{
                  padding: "4rem 2rem",
                  textAlign: "center",
                  backgroundColor: "#fff",
                  borderRadius: "var(--radius)",
                  border: "1px dashed var(--border)",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🍃</div>
                <p
                  style={{
                    color: "#888",
                    fontSize: "1.15rem",
                    lineHeight: "1.6",
                    maxWidth: "300px",
                    marginInline: "auto",
                  }}
                >
                  {taskTypeFilter === "all"
                    ? "No tasks scheduled for today. Take a deep breath and enjoy the quiet space."
                    : `No ${taskTypeFilter === "habit" ? "daily habits" : "one-off tasks"} for today.`}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.2rem",
                    color: "#4a5d4e",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  Today's Agenda (
                  {new Date().toLocaleDateString(undefined, {
                    dateStyle: "long",
                  })}
                  )
                </h3>
                {filteredTodayTasks.map((t) => {
                  const parentTask = t.parentId
                    ? tasks.find((pt) => pt.id === t.parentId)
                    : null;

                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1.25rem 1.5rem",
                        backgroundColor: "#fff",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                        opacity: effDone(t) ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={effDone(t)}
                        onChange={() => toggleComplete(t.id, t.completed)}
                        style={{
                          width: "1.4rem",
                          height: "1.4rem",
                          cursor: "pointer",
                          accentColor: "var(--sage-green)",
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            display: "block",
                            marginBottom: "0.3rem",
                            textDecoration: effDone(t)
                              ? "line-through"
                              : "none",
                            color: effDone(t) ? "#888" : "var(--foreground)",
                          }}
                        >
                          {parentTask ? `${parentTask.title} ➜ ` : ""}
                          {t.title}
                        </span>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#777",
                            display: "flex",
                            gap: "0.75rem",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              backgroundColor: "#f0f4f8",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "8px",
                            }}
                          >
                            ⏱ {t.estimatedTime}
                          </span>
                          <span
                            style={{
                              backgroundColor: "#edf2f7",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "8px",
                            }}
                          >
                            Intensity: {t.emotionalIntensity}
                          </span>
                          {t.recurrence && t.recurrence !== "none" && (
                            <span
                              style={{
                                backgroundColor: "#fdf4e3",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "8px",
                                color: "#b45309",
                                fontWeight: 600,
                              }}
                            >
                              🔁 {t.recurrence}
                            </span>
                          )}
                          {/* Action type pill */}
                          {(() => {
                            const kind = getTaskKind(t);
                            return (
                              <span
                                style={{
                                  backgroundColor: kind === 'habit' ? "#ecfdf5" : "#f0f9ff",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "8px",
                                  color: kind === 'habit' ? "#065f46" : "#0369a1",
                                  fontWeight: 600,
                                }}
                              >
                                {kind === 'habit' ? '🔁 Habit' : '📌 One-Off'}
                              </span>
                            );
                          })()}
                        </div>
                        {/* Completion rating badge — Today's View */}
                        {renderRecurringBadge(t)}
                        {!isRecurringTask(t) && !!t.completed && (() => {
                          const meta = taskMeta[String(t.id)];
                          const actualRelief = actualReliefs[String(t.id)];
                          const predicted = (meta?.predictedDifficulty !== undefined && meta?.predictedDifficulty !== null) ? meta.predictedDifficulty : null;
                          const delta = (predicted !== null && actualRelief !== undefined) ? actualRelief - predicted : null;
                          if (predicted !== null && actualRelief !== undefined) {
                            return (
                              <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                <button
                                  type="button"
                                  onClick={() => setRatingPopoverId(t.id)}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    backgroundColor: "#f0fdf4",
                                    border: "1px solid #bbf7d0",
                                    borderRadius: "20px",
                                    padding: "0.2rem 0.7rem",
                                    color: "#15803d",
                                    cursor: "pointer",
                                    width: "fit-content",
                                  }}
                                >
                                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>Predicted: {predicted}/10</span>
                                  <span style={{ color: "#94a3b8" }}>➔</span>
                                  <span>Actual Relief: {actualRelief}/10</span>
                                  <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>✏️</span>
                                </button>
                                {delta !== null && delta >= 0 && (
                                  <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    color: "#059669",
                                    backgroundColor: "#ecfdf5",
                                    border: "1px solid #a7f3d0",
                                    borderRadius: "20px",
                                    padding: "0.15rem 0.6rem",
                                    width: "fit-content",
                                  }}>
                                    🎉 Overcame Dread (+{delta} Relief)
                                  </span>
                                )}
                              </div>
                            );
                          } else if (actualRelief !== undefined) {
                            return (
                              <button
                                type="button"
                                onClick={() => setRatingPopoverId(t.id)}
                                style={{
                                  marginTop: "0.4rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  backgroundColor: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  borderRadius: "20px",
                                  padding: "0.2rem 0.7rem",
                                  color: "#15803d",
                                  cursor: "pointer",
                                  width: "fit-content",
                                }}
                              >
                                Completed (Rating: {actualRelief}/10) ✏️
                              </button>
                            );
                          } else {
                            return (
                              <span style={{
                                marginTop: "0.4rem",
                                display: "inline-flex",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                backgroundColor: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                borderRadius: "20px",
                                padding: "0.2rem 0.7rem",
                                color: "#15803d",
                              }}>
                                ✅ Completed
                              </span>
                            );
                          }
                        })()}
                      </div>

                      {!effDone(t) && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => toggleTodayFocus(t)}
                            title={todayFocusIds.includes(String(t.id)) ? "Remove from Today's Focus" : "Pin to Today's Focus"}
                            style={{
                              backgroundColor: todayFocusIds.includes(String(t.id)) ? "#fef3c7" : "#f1f5f9",
                              border: todayFocusIds.includes(String(t.id)) ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                              color: todayFocusIds.includes(String(t.id)) ? "#b45309" : "#475569",
                              borderRadius: "8px",
                              padding: "0.35rem 0.6rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {todayFocusIds.includes(String(t.id)) ? "⭐ Focused" : "☆ Focus"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            title="Delete action"
                            style={{
                              background: "none",
                              border: "1px solid #fecaca",
                              backgroundColor: "#fef2f2",
                              color: "#dc2626",
                              borderRadius: "8px",
                              padding: "0.35rem 0.6rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            🗑️
                          </button>
                          <CalendarDropdown task={t} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

          {/* WEEKLY AGENDA VIEW */}
          {activeView === "week" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2rem",
                animation: "fadeIn 0.3s ease",
              }}
            >
              {/* Week switcher */}
              {(() => {
                const first = next7Days[0];
                const last = next7Days[6];
                const fmt = (d: Date, withYear = false) =>
                  d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
                const pill = (active: boolean, disabled = false): React.CSSProperties => ({
                  padding: "0.5rem 0.9rem",
                  fontSize: "0.85rem",
                  fontWeight: active ? 700 : 500,
                  borderRadius: "999px",
                  border: active ? "2px solid #0f172a" : "1px solid #cbd5e1",
                  backgroundColor: active ? "#0f172a" : "#fff",
                  color: active ? "#fff" : "#334155",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.45 : 1,
                });
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      <button type="button" disabled={agendaWeekOffset === 0} onClick={() => setAgendaWeekOffset((o) => Math.max(0, o - 1))} style={pill(false, agendaWeekOffset === 0)}>
                        &lt; Prev Week
                      </button>
                      <button type="button" onClick={() => setAgendaWeekOffset(0)} style={pill(agendaWeekOffset === 0)}>
                        Current Week
                      </button>
                      <button type="button" onClick={() => setAgendaWeekOffset((o) => o + 1)} style={pill(false)}>
                        Next Week &gt;
                      </button>
                    </div>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>
                      {fmt(first)} – {fmt(last, true)}
                    </span>
                  </div>
                );
              })()}

              {next7Days.map((day, idx) => {
                const dayTasks = getTasksForDay(day);
                const targetDateStr = localDateStr(day);
                const todayStr = todayKey || localDateStr();
                const isFutureDay = targetDateStr > todayStr;

                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "#fff",
                      padding: "1.5rem",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.01)",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "1.15rem",
                        color: "#4a5d4e",
                        borderBottom: "1px solid #f0f0f0",
                        paddingBottom: "0.5rem",
                        marginBottom: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      {getDayLabel(day)}
                    </h4>

                    {dayTasks.length === 0 ? (
                      <p
                        style={{
                          color: "#999",
                          fontSize: "0.9rem",
                          fontStyle: "italic",
                          margin: "0.5rem 0",
                        }}
                      >
                        No tasks scheduled.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        {dayTasks.map((t) => {
                          const parentTask = t.parentId
                            ? tasks.find((pt) => pt.id === t.parentId)
                            : null;
                          // Completion is evaluated strictly per rendered calendar date
                          const recurring = isRecurringTask(t);
                          const isDayDone = recurring
                            ? !isFutureDay && Boolean((dailyCompletions[String(t.id)]?.[targetDateStr]?.count ?? 0) >= targetCount(t))
                            : !!t.completed;

                          return (
                            <div
                              key={t.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "1rem",
                                padding: "0.75rem 1rem",
                                backgroundColor: "#fafafa",
                                borderRadius: "8px",
                                border: "1px solid #f0f0f0",
                                opacity: isDayDone ? 0.6 : 1,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isDayDone}
                                disabled={recurring && isFutureDay}
                                onChange={() =>
                                  toggleComplete(t.id, t.completed)
                                }
                                style={{
                                  width: "1.2rem",
                                  height: "1.2rem",
                                  cursor: "pointer",
                                  accentColor: "var(--sage-green)",
                                }}
                              />

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: "0.98rem",
                                    fontWeight: 600,
                                    display: "block",
                                    marginBottom: "0.2rem",
                                    textDecoration: isDayDone
                                      ? "line-through"
                                      : "none",
                                    color: isDayDone
                                      ? "#888"
                                      : "var(--foreground)",
                                  }}
                                >
                                  {parentTask ? `${parentTask.title} ➜ ` : ""}
                                  {t.title}
                                </span>
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#777",
                                    display: "flex",
                                    gap: "0.5rem",
                                    alignItems: "center",
                                  }}
                                >
                                  <span>⏱ {t.estimatedTime}</span>
                                  <span>•</span>
                                  <span>Intensity: {t.emotionalIntensity}</span>
                                  {t.recurrence && t.recurrence !== "none" && (
                                    <>
                                      <span>•</span>
                                      <span style={{ color: "#b45309" }}>
                                        🔁 {t.recurrence}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {!isDayDone && (
                                <button
                                  type="button"
                                  onClick={() => toggleTodayFocus(t)}
                                  title={todayFocusIds.includes(String(t.id)) ? "Remove from Today's Focus" : "Pin to Today's Focus"}
                                  style={{
                                    backgroundColor: todayFocusIds.includes(String(t.id)) ? "#fef3c7" : "#f1f5f9",
                                    border: todayFocusIds.includes(String(t.id)) ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                                    color: todayFocusIds.includes(String(t.id)) ? "#b45309" : "#475569",
                                    borderRadius: "8px",
                                    padding: "0.25rem 0.5rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  {todayFocusIds.includes(String(t.id)) ? "⭐ Focused" : "☆ Focus"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Rating Popover Overlay */}
      {ratingPopoverId !== null && (() => {
        const task = tasks.find((t) => t.id === ratingPopoverId);
        const meta = taskMeta[String(ratingPopoverId)];
        const currentRelief = actualReliefs[String(ratingPopoverId)];
        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
            onClick={() => setRatingPopoverId(null)}
          >
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                padding: "1.75rem",
                maxWidth: "420px",
                width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                animation: "fadeIn 0.2s ease",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
                How do you feel about completing this?
              </h3>
              {task && (
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem", fontStyle: "italic" }}>
                  {task.title}
                </p>
              )}
              {meta?.predictedDifficulty !== undefined && meta?.predictedDifficulty !== null && (
                <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1rem" }}>
                  Predicted difficulty: <strong style={{ color: "#475569" }}>{meta.predictedDifficulty}/10</strong>
                </p>
              )}
              <div style={{ marginBottom: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.6rem" }}>
                  <span>0 — Drained / Hard</span>
                  <span>10 — Relieved / Energized</span>
                </div>
                {/* Row 1: 0–5 */}
                <div style={{ display: "flex", gap: "0.45rem", justifyContent: "center", marginBottom: "0.45rem" }}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectRelief(ratingPopoverId, i)}
                      style={{
                        width: "2.6rem",
                        height: "2.6rem",
                        borderRadius: "50%",
                        border: currentRelief === i ? "2px solid #059669" : "1px solid #e2e8f0",
                        backgroundColor: currentRelief === i ? "#ecfdf5" : (i <= 2 ? "#fef2f2" : "#fefce8"),
                        color: currentRelief === i ? "#059669" : "#374151",
                        fontWeight: currentRelief === i ? 800 : 600,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        transition: "all 0.1s",
                        flexShrink: 0,
                      }}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                {/* Row 2: 6–10 */}
                <div style={{ display: "flex", gap: "0.45rem", justifyContent: "center" }}>
                  {[6, 7, 8, 9, 10].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectRelief(ratingPopoverId, i)}
                      style={{
                        width: "2.6rem",
                        height: "2.6rem",
                        borderRadius: "50%",
                        border: currentRelief === i ? "2px solid #059669" : "1px solid #e2e8f0",
                        backgroundColor: currentRelief === i ? "#ecfdf5" : "#f0fdf4",
                        color: currentRelief === i ? "#059669" : "#374151",
                        fontWeight: currentRelief === i ? 800 : 600,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        transition: "all 0.1s",
                        flexShrink: 0,
                      }}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRatingPopoverId(null)}
                style={{
                  marginTop: "1rem",
                  width: "100%",
                  padding: "0.6rem",
                  backgroundColor: "#f1f5f9",
                  color: "#64748b",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .calendar-link { display: block; width: 100%; transition: background-color 0.2s; box-sizing: border-box; }
        .calendar-link:hover { background-color: #f0f7f4; color: var(--foreground) !important; }
      `,
        }}
      />
    </div>
  );
}
