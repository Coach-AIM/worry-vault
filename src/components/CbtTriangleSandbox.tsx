'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================
// TYPES & DATA STRUCTURES
// ============================================================
type NodeKey = 'thoughts' | 'feelings' | 'behaviors';
type ScenarioKey = 'overwhelm' | 'relationships' | 'uncertainty';
type SourceMode = 'preset' | 'journal';
type StepNumber = 1 | 2 | 3 | 4 | 5;

interface StageInfo {
  step: StepNumber;
  title: string;
  stageName: string;
  nodeFocus: NodeKey | 'trigger' | 'breaker';
  badgeColor: string;
  text: string;
  clinicalNote: string;
}

interface ScenarioData {
  id: ScenarioKey;
  label: string;
  emoji: string;
  subtitle: string;
  stages: Record<StepNumber, StageInfo>;
}

interface JournalEntry {
  id: number;
  createdAt: string;
  situation: string;
  automaticThought: string | null;
  emotionsJson: string;
  distortionsJson: string | null;
  reframedThought: string;
  outcomeText?: string | null;
  loopClosedAt?: string | null;
  reliefRating?: number | null;
}

// Normalizes raw records (any key / API) into JournalEntry. Includes every entry that
// has a situation (situation|trigger) and a thought (automaticThought|thought) —
// no "completed" or reframe requirement.
function normalizeJournalEntries(parsed: any[], idBase = 0): JournalEntry[] {
  const out: JournalEntry[] = [];
  parsed.forEach((e: any, idx: number) => {
    if (!e || typeof e !== 'object') return;
    const situation = String(e.situation || e.trigger || '').trim();
    const thought = String(e.automaticThought || e.thought || '').trim();
    if (!situation || !thought) return;
    const rawEmotions = e.emotionsJson ?? e.selectedEmotions ?? e.emotions;
    const emotionsJson =
      typeof rawEmotions === 'string'
        ? rawEmotions
        : JSON.stringify(rawEmotions || []);
    const rawDistortions = e.distortionsJson ?? e.selectedDistortions ?? e.distortions;
    const distortionsJson =
      typeof rawDistortions === 'string'
        ? rawDistortions
        : rawDistortions
          ? JSON.stringify(rawDistortions)
          : null;
    const numericId = Number(e.id);
    out.push({
      id: e.id !== undefined && e.id !== null && !isNaN(numericId) ? numericId : -(idBase + idx + 1),
      createdAt: e.createdAt || new Date().toISOString(),
      situation,
      automaticThought: thought,
      emotionsJson,
      distortionsJson,
      reframedThought: String(e.reframedThought || e.reframe || ''),
      outcomeText: e.outcomeText ?? e.outcome ?? null,
      loopClosedAt: e.loopClosedAt ?? null,
      reliefRating: e.reliefRating ?? null,
    });
  });
  return out;
}

// Reads BOTH storage keys (independently) and merges by id, newest first.
function loadJournalEntries(): JournalEntry[] {
  const keys = ['momentum_journal_entries', 'cbt_thought_records'];
  const all: JournalEntry[] = [];
  keys.forEach((key, k) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) all.push(...normalizeJournalEntries(parsed, k * 100000));
    } catch (_) { /* ignore corrupt key */ }
  });
  const seen = new Set<number>();
  return all
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const SCENARIOS: Record<ScenarioKey, ScenarioData> = {
  overwhelm: {
    id: 'overwhelm',
    label: 'Work Overwhelm',
    emoji: '🏢',
    subtitle: 'Mounting inbox, impending deadline, and acute paralysis',
    stages: {
      1: {
        step: 1,
        stageName: 'Activating Trigger',
        title: 'Opening laptop to 47 unread emails and a deadline in 2 hours',
        nodeFocus: 'trigger',
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
        text: 'The sensory trigger arrives: numbers flashing on the screen, immediate demands, and perceived resource scarcity.',
        clinicalNote: 'Triggers are neutral external facts. The cognitive loop only begins when the brain generates an immediate narrative.',
      },
      2: {
        step: 2,
        stageName: 'Automatic Story (Thought)',
        title: '"I am hopelessly behind. Everyone is going to realize I cannot handle this."',
        nodeFocus: 'thoughts',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        text: 'The threat-detection system immediately predicts catastrophe and catastrophic evaluation from peers.',
        clinicalNote: 'Catastrophizing & All-or-Nothing traps treat worst-case predictions as imminent, undeniable truths.',
      },
      3: {
        step: 3,
        stageName: 'Visceral Reaction (Feeling)',
        title: 'Chest tightness, racing pulse, stomach drop, and acute dread (85% intensity)',
        nodeFocus: 'feelings',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        text: 'The amygdala commands an autonomic nervous system surge within 120ms before conscious evaluation occurs.',
        clinicalNote: 'Involuntary physiological output. You cannot switch this off with willpower; it must be addressed through upstream levers.',
      },
      4: {
        step: 4,
        stageName: 'Avoidance Pattern (Behavior)',
        title: 'Minimizing the window, scrolling social media, or freezing in paralysis',
        nodeFocus: 'behaviors',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        text: 'Avoidance brings short-term momentary relief, but signals to the nervous system that the inbox is genuinely life-threatening.',
        clinicalNote: 'Avoidance confirms the threat hypothesis, locking in future panic whenever the trigger reappears.',
      },
      5: {
        step: 5,
        stageName: 'Circuit Breaker (Intervention)',
        title: '5-Minute Opposite Action: Reply to 1 simple email right now',
        nodeFocus: 'breaker',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        text: 'Committing to just 5 minutes of initiation generates concrete sensory evidence that you are safe and capable.',
        clinicalNote: 'Behavioral activation breaks the feedback loop. Physical action down-regulates the amygdala faster than argument.',
      },
    },
  },
  relationships: {
    id: 'relationships',
    label: 'Unspoken Expectations',
    emoji: '💬',
    subtitle: 'Unanswered text message and the mind-reading spiral',
    stages: {
      1: {
        step: 1,
        stageName: 'Activating Trigger',
        title: 'A close friend or colleague has not replied to your text sent yesterday morning',
        nodeFocus: 'trigger',
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
        text: 'The objective fact: Silence on the screen. No other contextual information is present.',
        clinicalNote: 'The brain despises ambiguity. When information is missing, the threat system fills in the worst possible story.',
      },
      2: {
        step: 2,
        stageName: 'Automatic Story (Thought)',
        title: '"They are upset with me. I said something wrong and they are pulling away."',
        nodeFocus: 'thoughts',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        text: 'Personalization and Mind Reading take over: assuming silence is intentional, hostile, and caused by your flaw.',
        clinicalNote: 'Notice the leap: lack of data becomes conclusive proof of relational rupture.',
      },
      3: {
        step: 3,
        stageName: 'Visceral Reaction (Feeling)',
        title: 'Sinking sensation in gut, social anxiety, resentment, and hyper-vigilance',
        nodeFocus: 'feelings',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        text: 'Rejection-sensitive neural circuits light up, mimicking physical pain in the anterior cingulate cortex.',
        clinicalNote: 'Feelings reflect what you believe is happening, not necessarily what is actually happening.',
      },
      4: {
        step: 4,
        stageName: 'Avoidance Pattern (Behavior)',
        title: 'Checking "last seen" status obsessively, drafting passive-aggressive notes, or withdrawing into cold silence',
        nodeFocus: 'behaviors',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        text: 'Protective self-distancing or anxious reassurance seeking creates real relational friction.',
        clinicalNote: 'Our reactive behaviors often provoke the very rejection we were afraid of creating.',
      },
      5: {
        step: 5,
        stageName: 'Circuit Breaker (Intervention)',
        title: 'Reality Check: "What are 2 realistic, non-personal reasons for their silence?"',
        nodeFocus: 'breaker',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        text: 'They might be in back-to-back meetings, managing a personal issue, or forgot to press send. Re-calibrating thoughts lowers emotional intensity.',
        clinicalNote: 'Treating the initial thought as a hypothesis instead of a verdict dissolves interpersonal friction immediately.',
      },
    },
  },
  uncertainty: {
    id: 'uncertainty',
    label: 'Growth Uncertainty',
    emoji: '📈',
    subtitle: 'New opportunity, imposter syndrome, and comfort zone tension',
    stages: {
      1: {
        step: 1,
        stageName: 'Activating Trigger',
        title: 'Offered an unfamiliar project lead role or public speaking opportunity',
        nodeFocus: 'trigger',
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
        text: 'The event introduces novelty, public visibility, and unpredictable outcomes.',
        clinicalNote: 'Novelty is parsed by the nervous system identically to biological threat until proven otherwise.',
      },
      2: {
        step: 2,
        stageName: 'Automatic Story (Thought)',
        title: '"If I step up, I will fail publicly and everyone will see I am an imposter."',
        nodeFocus: 'thoughts',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        text: 'Fortune Telling predicts failure with 100% certainty, dismissing all past competencies.',
        clinicalNote: 'The brain tries to protect you from potential social pain by urging you to stay small.',
      },
      3: {
        step: 3,
        stageName: 'Visceral Reaction (Feeling)',
        title: 'Stomach fluttering, trembling hands, urge to flee or hide, acute dread',
        nodeFocus: 'feelings',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        text: 'Adrenaline and cortisol surge to prepare for fight, flight, or freeze.',
        clinicalNote: 'Somatic arousal is energy for performance, but when labeled as "terror", it paralyzes.',
      },
      4: {
        step: 4,
        stageName: 'Avoidance Pattern (Behavior)',
        title: 'Politely declining the opportunity with an excuse, retreating to familiar comfort zone',
        nodeFocus: 'behaviors',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        text: 'Immediate relief is experienced, reinforcing the belief that you were incapable.',
        clinicalNote: 'Each retreat shrinks your comfort zone and confirms the narrative of inadequacy.',
      },
      5: {
        step: 5,
        stageName: 'Circuit Breaker (Intervention)',
        title: 'Reframe & Micro-Step: "Arousal is readiness. Commit to step 1 with preparation."',
        nodeFocus: 'breaker',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        text: 'Accepting the opportunity while outlining a concrete 3-step preparation plan shifts fear into competence.',
        clinicalNote: 'Courage is not the absence of visceral fear — it is taking opposite action in its presence.',
      },
    },
  },
};

// ============================================================
// JOURNAL → STAGE MAPPER
// ============================================================
function journalEntryToStages(entry: JournalEntry): Record<StepNumber, StageInfo> {
  // Parse emotions (both array and object formats)
  let emotionLabel = 'Emotional distress';
  try {
    const raw = typeof entry.emotionsJson === 'string'
      ? JSON.parse(entry.emotionsJson || '[]')
      : entry.emotionsJson;

    let items: { name: string; weight: number }[] = [];
    if (Array.isArray(raw)) {
      items = raw.map((item: any) => {
        if (typeof item === 'string') return { name: item, weight: 100 };
        return {
          name: item?.name || item?.label || item?.emotion || 'Emotion',
          weight: typeof item?.weight === 'number'
            ? item.weight
            : (typeof item?.intensity === 'number' ? item.intensity : 100),
        };
      });
    } else if (raw && typeof raw === 'object') {
      items = Object.entries(raw).map(([key, val]: [string, any]) => {
        const weight = typeof val === 'number'
          ? val
          : (typeof val?.weight === 'number'
              ? val.weight
              : (typeof val?.intensity === 'number' ? val.intensity : 100));
        return { name: key, weight };
      });
    }

    if (items.length > 0) {
      emotionLabel = items.map((em) => `${em.name} ${em.weight}%`).join(', ');
    }
  } catch (_) { /* ignore parse error */ }

  // Parse distortions
  let distortionLabel = '';
  let parsedDistortions: string[] = [];
  try {
    const rawDist = typeof entry.distortionsJson === 'string'
      ? JSON.parse(entry.distortionsJson || '[]')
      : entry.distortionsJson;
    if (Array.isArray(rawDist)) {
      parsedDistortions = rawDist.map((d: any) => typeof d === 'string' ? d : (d?.name || ''));
    } else if (rawDist && typeof rawDist === 'object') {
      parsedDistortions = Object.keys(rawDist);
    }
    parsedDistortions = parsedDistortions.filter(Boolean);
    if (parsedDistortions.length > 0) {
      distortionLabel = ` · Tagged traps: ${parsedDistortions.slice(0, 3).join(', ')}`;
    }
  } catch (_) { /* ignore parse error */ }

  // Dynamic behavioral reaction and reflection prompt tailored to identified distortion
  const primaryTrap = parsedDistortions[0]?.toLowerCase() || '';
  let behaviorTitle = 'Avoidance, tension, or rumination triggered by this belief';
  let behaviorText = 'Without intervention, this thought-feeling pair tends to produce avoidance, reassurance-seeking, or shutdown behavior.';
  let behaviorNote = 'Reflection prompt: What specific reaction or avoidance did this automatic thought trigger in that moment, and how did it reinforce the thought loop?';

  if (primaryTrap.includes('mind reading') || primaryTrap.includes('mind-reading')) {
    behaviorTitle = 'Withdrawing, reassurance-seeking, or over-analyzing interactions';
    behaviorText = 'Mind reading prompts you to react to assumed intentions. Common responses include pre-emptive withdrawal, scanning for subtle signs of rejection, or seeking repeated reassurance.';
    behaviorNote = 'Reflection prompt: How did acting on an assumed thought change your behavior? Notice if protective distance created the very separation you feared.';
  } else if (primaryTrap.includes('catastroph')) {
    behaviorTitle = 'Emergency avoidance, freezing, or hyper-vigilant scanning';
    behaviorText = 'Predicting the worst imaginable outcome drives high urgency: dodging tasks, calling off plans, or freezing in paralysis to stay safe.';
    behaviorNote = 'Reflection prompt: What actions did you take to escape the imagined disaster? Notice how avoiding the situation prevents you from discovering you can handle it.';
  } else if (primaryTrap.includes('all-or-nothing') || primaryTrap.includes('black-and-white')) {
    behaviorTitle = 'Giving up entirely, perfectionistic paralysis, or total withdrawal';
    behaviorText = 'Viewing situations as either flawless or ruined prompts binary behavior: quitting midway, postponing, or discarding progress.';
    behaviorNote = 'Reflection prompt: Did you hold back or abandon effort because it couldn’t be done perfectly? Where can you find a workable middle step?';
  } else if (primaryTrap.includes('should')) {
    behaviorTitle = 'Resentment, procrastination, or rigid self-punishment';
    behaviorText = 'Demanding absolute "shoulds" builds intense pressure, leading to passive rebellion, procrastination, or irritable conflict.';
    behaviorNote = 'Reflection prompt: How did rigid rules dictate your actions? Notice how replacing "must" with "I prefer" releases behavioral paralysis.';
  } else if (primaryTrap.includes('emotional reasoning') || primaryTrap.includes('emotional-reasoning')) {
    behaviorTitle = 'Treating distressing feelings as facts and retreating';
    behaviorText = 'Allowing the intensity of emotion to govern decisions results in staying away from challenges under the assumption that feeling overwhelmed equals danger.';
    behaviorNote = 'Reflection prompt: Did you hold back simply because it felt uncomfortable? Remember that emotions are internal signals, not external facts.';
  } else if (primaryTrap.includes('overgeneraliz')) {
    behaviorTitle = 'Reluctance to try again and defeatist withdrawal';
    behaviorText = 'Believing that one setback means "it always happens" leads to preemptive resignation and refusing to re-engage.';
    behaviorNote = 'Reflection prompt: Did one bad outcome stop you from trying? What opposite action would challenge the idea of a never-ending pattern?';
  } else if (parsedDistortions.length > 0) {
    behaviorTitle = `Protective reaction shaped by ${parsedDistortions[0]}`;
    behaviorText = `Operating under ${parsedDistortions[0]} often causes compensatory habits, hesitation, or emotional withdrawal.`;
    behaviorNote = `Reflection prompt: What specific reaction or avoidance did ${parsedDistortions[0]} trigger in that moment, and how did it reinforce the thought loop?`;
  }

  const situationSnippet = entry.situation.length > 120
    ? entry.situation.slice(0, 120) + '…'
    : entry.situation;

  const thoughtText = entry.automaticThought
    ? (entry.automaticThought.length > 150 ? entry.automaticThought.slice(0, 150) + '…' : entry.automaticThought)
    : 'No automatic thought recorded.';

  const hasReframe = Boolean(
    entry.reframedThought &&
    entry.reframedThought.trim() &&
    entry.reframedThought !== '[Pending Reframe]'
  );

  let breakerTitle = '';
  let breakerText = '';
  let breakerNote = '';

  if (entry.loopClosedAt && entry.outcomeText) {
    breakerTitle = `✅ Loop Closed: "${entry.outcomeText.slice(0, 100)}${entry.outcomeText.length > 100 ? '…' : ''}"`;
    breakerText = 'You reality-tested this thought and closed the loop. The triangle is broken.';
    breakerNote = `Reality-tested on ${new Date(entry.loopClosedAt).toLocaleDateString()}. Relief rating: ${entry.reliefRating ?? 'N/A'}/10.`;
  } else if (hasReframe) {
    breakerTitle = `Reframe: "${entry.reframedThought.trim().slice(0, 120)}${entry.reframedThought.trim().length > 120 ? '…' : ''}"`;
    breakerText = 'A reframe has been logged. Reality test it by closing the loop in your journal to complete the circuit.';
    breakerNote = 'This thought has not been reality-tested yet. Use "Close the Loop" in your journal to complete the circuit.';
  } else {
    breakerTitle = 'Reframe Pending in Journal';
    breakerText = 'This thought record has not been reframed yet. Open Guided Journal to challenge this thinking trap and construct a balanced reframe.';
    breakerNote = 'Constructing a balanced alternative thought is the primary cognitive lever to break this loop.';
  }

  return {
    1: {
      step: 1,
      stageName: 'Activating Trigger',
      title: situationSnippet,
      nodeFocus: 'trigger',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      text: 'This is the real-world situation that initiated the cognitive loop — pulled directly from your journal.',
      clinicalNote: 'Triggers are neutral external events. Your distress began the moment your brain generated a narrative about it.',
    },
    2: {
      step: 2,
      stageName: 'Automatic Story (Thought)',
      title: `"${thoughtText}"${distortionLabel}`,
      nodeFocus: 'thoughts',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: 'Your automatic thought fired milliseconds after the trigger — a threat prediction generated before conscious reasoning.',
      clinicalNote: distortionLabel
        ? `Identified thinking traps in this thought:${distortionLabel.replace(' · Tagged traps:', '')}. These are the upstream levers to challenge.`
        : 'No traps tagged yet. Open the journal entry to analyse this thought with the distortion picker.',
    },
    3: {
      step: 3,
      stageName: 'Visceral Reaction (Feeling)',
      title: emotionLabel,
      nodeFocus: 'feelings',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'Your recorded emotional response — the downstream output of the automatic thought.',
      clinicalNote: 'Feelings are involuntary outputs of what you believed in that moment. They change when you intervene at the Thought or Behavior level.',
    },
    4: {
      step: 4,
      stageName: 'Avoidance Pattern (Behavior)',
      title: behaviorTitle,
      nodeFocus: 'behaviors',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      text: behaviorText,
      clinicalNote: behaviorNote,
    },
    5: {
      step: 5,
      stageName: 'Circuit Breaker (Intervention)',
      title: breakerTitle,
      nodeFocus: 'breaker',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      text: breakerText,
      clinicalNote: breakerNote,
    },
  };
}

interface CbtTriangleSandboxProps {
  initialEntryId?: number | null;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CbtTriangleSandbox({ initialEntryId }: CbtTriangleSandboxProps = {}) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('overwhelm');
  const [selectedNode, setSelectedNode] = useState<NodeKey>('thoughts');
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [sourceMode, setSourceMode] = useState<SourceMode>('preset');

  // Journal state (SSR-safe — only populated client-side)
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Re-read journal records: localStorage (both keys) + server history, merged by id
  const refreshJournal = useCallback(async (autoSelectLatest = false) => {
    let merged = loadJournalEntries();
    setJournalEntries(merged);

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlEntryId = urlParams ? urlParams.get('entryId') : null;
    const targetId = initialEntryId ?? (urlEntryId ? Number(urlEntryId) : null);

    if (targetId && !isNaN(targetId)) {
      setSourceMode('journal');
      setActiveStep(1);
      const match = merged.find((e) => e.id === targetId);
      if (match) {
        setSelectedEntryId(match.id);
      } else {
        setSelectedEntryId(targetId);
      }
    } else if (merged.length > 0) {
      setSelectedEntryId((prev) =>
        autoSelectLatest || prev === null || !merged.some((e) => e.id === prev) ? merged[0].id : prev,
      );
    }
    try {
      const res = await fetch('/api/journal');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.entries)) {
          const local = new Map(merged.map((e) => [e.id, e]));
          const fromApi = normalizeJournalEntries(data.entries).map((e) => {
            const l = local.get(e.id);
            return l ? { ...e, ...Object.fromEntries(Object.entries(l).filter(([, v]) => v !== null && v !== '' && v !== undefined)) } as JournalEntry : e;
          });
          const apiIds = new Set(fromApi.map((e) => e.id));
          merged = [...fromApi, ...merged.filter((e) => !apiIds.has(e.id))].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setJournalEntries(merged);
          if (targetId && !isNaN(targetId)) {
            setSourceMode('journal');
            setActiveStep(1);
            const match = merged.find((e) => e.id === targetId);
            if (match) {
              setSelectedEntryId(match.id);
            }
          } else if (merged.length > 0) {
            setSelectedEntryId((prev) =>
              autoSelectLatest || prev === null || !merged.some((e) => e.id === prev) ? merged[0].id : prev,
            );
          }
        }
      }
    } catch (_) { /* offline — local entries already shown */ }
  }, [initialEntryId]);

  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlEntryId = urlParams ? urlParams.get('entryId') : null;
    const targetId = initialEntryId ?? (urlEntryId ? Number(urlEntryId) : null);

    if (targetId && !isNaN(targetId)) {
      setSourceMode('journal');
      setActiveStep(1);
      setSelectedEntryId(targetId);
    }
  }, [initialEntryId]);

  // Load on mount (SSR-safe)
  useEffect(() => {
    setIsMounted(true);
    void refreshJournal();
  }, [refreshJournal]);

  // Listen for "Break This Pattern" transfer from EmotionPatternSandbox
  const handleTriangleTransfer = useCallback(() => {
    setSourceMode('journal');
    setActiveStep(1);
    void refreshJournal(true);
  }, [refreshJournal]);

  useEffect(() => {
    window.addEventListener('momentum:triangle-transfer', handleTriangleTransfer);
    return () => window.removeEventListener('momentum:triangle-transfer', handleTriangleTransfer);
  }, [handleTriangleTransfer]);

  // Resolve current scenario stages
  const selectedJournalEntry = journalEntries.find((e) => e.id === selectedEntryId) ?? null;
  const journalStages = selectedJournalEntry ? journalEntryToStages(selectedJournalEntry) : null;

  const isJournalMode = sourceMode === 'journal';
  const currentStages = isJournalMode && journalStages ? journalStages : SCENARIOS[selectedScenario].stages;
  const currentStage = currentStages[activeStep];
  const scenarioLabel = isJournalMode
    ? (selectedJournalEntry
        ? new Date(selectedJournalEntry.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : 'Journal Entry')
    : SCENARIOS[selectedScenario].label;

  // Visual edge highlights based on current active step
  const isThoughtActive = currentStage.nodeFocus === 'thoughts' || currentStage.nodeFocus === 'breaker' || selectedNode === 'thoughts';
  const isFeelingActive = currentStage.nodeFocus === 'feelings' || currentStage.nodeFocus === 'breaker' || selectedNode === 'feelings';
  const isBehaviorActive = currentStage.nodeFocus === 'behaviors' || currentStage.nodeFocus === 'breaker' || selectedNode === 'behaviors';

  const leftLineHighlight = activeStep === 2 || activeStep === 3 || activeStep === 5;
  const rightLineHighlight = activeStep === 2 || activeStep === 4 || activeStep === 5;
  const bottomLineHighlight = activeStep === 3 || activeStep === 4 || activeStep === 5;

  return (
    <div id="cbt-triangle-container" className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm p-3 sm:p-6 flex flex-col gap-5 sm:gap-6">

      {/* ── Header ── */}
      <div id="cbt-triangle-section" className="text-center scroll-mt-6">
        <span className="bg-violet-50 text-violet-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
          CBT Cognitive Model
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5 mb-1">
          How The Triangle Works
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          See how triggers trigger automatic stories, fuel visceral emotions, and lock in avoidance loops.
        </p>
      </div>

      {/* ── Source Mode Toggle (Presets vs Journal) ── */}
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
          Choose a Scenario
        </p>
        <div className="flex flex-col gap-2">
          {/* Preset scenario pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => {
              const sc = SCENARIOS[key];
              const isSelected = sourceMode === 'preset' && selectedScenario === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSourceMode('preset');
                    setSelectedScenario(key);
                    setActiveStep(1);
                  }}
                  className={`px-3.5 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-[1.02]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{sc.emoji}</span>
                  <span>{sc.label}</span>
                </button>
              );
            })}
          </div>

          {/* Journal source tab */}
          <button
            type="button"
            onClick={() => {
              setSourceMode('journal');
              setActiveStep(1);
              void refreshJournal();
            }}
            className={`w-full px-3.5 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              sourceMode === 'journal'
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200'
            }`}
          >
            <span>📖</span>
            <span>Load from My Journal</span>
            {isMounted && journalEntries.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                sourceMode === 'journal' ? 'bg-white/20 text-white' : 'bg-violet-200 text-violet-800'
              }`}>
                {journalEntries.length}
              </span>
            )}
          </button>
        </div>

        {/* Journal entry selector — shown when in journal mode */}
        {sourceMode === 'journal' && isMounted && (
          <div className="mt-3">
            {journalEntries.length === 0 ? (
              <div className="text-center py-4 px-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <p className="text-sm text-slate-500 italic leading-relaxed">
                  No thought records logged yet. Write an entry in the{' '}
                  <a href="/journal" className="text-violet-600 font-semibold underline underline-offset-2">
                    CBT Journal
                  </a>{' '}
                  to break your own pattern here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Select a Journal Entry
                </p>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {journalEntries.map((entry) => {
                    const isSelected = entry.id === selectedEntryId;
                    const dateLabel = new Date(entry.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' });
                    const snippet = entry.situation.slice(0, 55) + (entry.situation.length > 55 ? '…' : '');
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setSelectedEntryId(entry.id);
                          setActiveStep(1);
                        }}
                        className={`text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-50 border-violet-300 text-violet-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <span className="font-bold text-slate-500 mr-1.5">{dateLabel}</span>
                        <span>— "{snippet}"</span>
                        {entry.loopClosedAt && (
                          <span className="ml-1.5 text-emerald-600 font-black">✅ Closed</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Responsive SVG Triangle (viewBox 0 0 400 360, scaled) ── */}
      <div className="w-full max-w-[440px] sm:max-w-[480px] min-h-[340px] sm:min-h-[360px] mx-auto relative bg-slate-50/70 border border-slate-200/80 rounded-2xl sm:rounded-3xl p-2 sm:p-4 flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 400 360"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-[340px] sm:h-[360px] select-none block"
        >
          <defs>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
            </marker>
            <marker id="arrow-emerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-slate" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Connecting Lines */}
          {/* Left Edge: Thoughts (200, 55) to Feelings (75, 255) */}
          <line
            x1="178"
            y1="91"
            x2="97"
            y2="219"
            stroke={leftLineHighlight ? (activeStep === 5 ? '#10b981' : '#3b82f6') : '#cbd5e1'}
            strokeWidth={leftLineHighlight ? '4' : '2.5'}
            strokeDasharray={leftLineHighlight ? 'none' : '5 5'}
            markerEnd={leftLineHighlight ? (activeStep === 5 ? 'url(#arrow-emerald)' : 'url(#arrow-blue)') : 'url(#arrow-slate)'}
            className="transition-all duration-300"
          />

          {/* Bottom Edge: Feelings (75, 255) to Behaviors (325, 255) */}
          <line
            x1="117"
            y1="255"
            x2="283"
            y2="255"
            stroke={bottomLineHighlight ? (activeStep === 5 ? '#10b981' : '#f59e0b') : '#cbd5e1'}
            strokeWidth={bottomLineHighlight ? '4' : '2.5'}
            strokeDasharray={bottomLineHighlight ? 'none' : '5 5'}
            markerEnd={bottomLineHighlight ? (activeStep === 5 ? 'url(#arrow-emerald)' : 'url(#arrow-amber)') : 'url(#arrow-slate)'}
            className="transition-all duration-300"
          />

          {/* Right Edge: Behaviors (325, 255) to Thoughts (200, 55) */}
          <line
            x1="303"
            y1="219"
            x2="222"
            y2="91"
            stroke={rightLineHighlight ? (activeStep === 5 ? '#10b981' : '#10b981') : '#cbd5e1'}
            strokeWidth={rightLineHighlight ? '4' : '2.5'}
            strokeDasharray={rightLineHighlight ? 'none' : '5 5'}
            markerEnd={rightLineHighlight ? 'url(#arrow-emerald)' : 'url(#arrow-slate)'}
            className="transition-all duration-300"
          />

          {/* Central Loop Indicator */}
          <circle cx="200" cy="188" r="26" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
          <text x="200" y="186" textAnchor="middle" fontSize="15" fill="#64748b">
            {activeStep === 5 ? '⚡' : '🔄'}
          </text>
          <text x="200" y="200" textAnchor="middle" fontSize="8" fontWeight="700" fill="#64748b">
            {activeStep === 5 ? 'BROKEN' : 'THE LOOP'}
          </text>

          {/* 💭 Top Apex: Thoughts (200, 55) */}
          <g
            onClick={() => {
              setSelectedNode('thoughts');
              setActiveStep(2);
            }}
            className="cursor-pointer group"
          >
            {/* Enlarged touch target circle (>44px equivalent) */}
            <circle cx="200" cy="55" r="48" fill="transparent" />
            <circle
              cx="200"
              cy="55"
              r="36"
              fill={isThoughtActive ? '#3b82f6' : '#ffffff'}
              stroke={isThoughtActive ? '#2563eb' : '#cbd5e1'}
              strokeWidth={isThoughtActive ? '3.5' : '2'}
              className="transition-all duration-200 drop-shadow-sm group-hover:scale-105"
            />
            <text x="200" y="50" textAnchor="middle" fontSize="18" fill={isThoughtActive ? '#ffffff' : '#334155'}>
              💭
            </text>
            <text x="200" y="66" textAnchor="middle" fontSize="11" fontWeight="800" fill={isThoughtActive ? '#ffffff' : '#1e293b'}>
              Thoughts
            </text>
            <rect x="135" y="98" width="130" height="18" rx="9" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
            <text x="200" y="110" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#047857">
              🟢 Controllable Lever
            </text>
          </g>

          {/* ❤️ Bottom-Left: Feelings (75, 255) */}
          <g
            onClick={() => {
              setSelectedNode('feelings');
              setActiveStep(3);
            }}
            className="cursor-pointer group"
          >
            {/* Enlarged touch target circle (>44px equivalent) */}
            <circle cx="75" cy="255" r="48" fill="transparent" />
            <circle
              cx="75"
              cy="255"
              r="36"
              fill={isFeelingActive ? '#f59e0b' : '#ffffff'}
              stroke={isFeelingActive ? '#d97706' : '#cbd5e1'}
              strokeWidth={isFeelingActive ? '3.5' : '2'}
              className="transition-all duration-200 drop-shadow-sm group-hover:scale-105"
            />
            <text x="75" y="250" textAnchor="middle" fontSize="18" fill={isFeelingActive ? '#ffffff' : '#334155'}>
              ❤️
            </text>
            <text x="75" y="266" textAnchor="middle" fontSize="11" fontWeight="800" fill={isFeelingActive ? '#ffffff' : '#1e293b'}>
              Feelings
            </text>
            <rect x="10" y="298" width="130" height="18" rx="9" fill="#fffbeb" stroke="#fde68a" strokeWidth="1" />
            <text x="75" y="310" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#b45309">
              ⚠️ Involuntary Output
            </text>
          </g>

          {/* 🏃 Bottom-Right: Behaviors (325, 255) */}
          <g
            onClick={() => {
              setSelectedNode('behaviors');
              setActiveStep(4);
            }}
            className="cursor-pointer group"
          >
            {/* Enlarged touch target circle (>44px equivalent) */}
            <circle cx="325" cy="255" r="48" fill="transparent" />
            <circle
              cx="325"
              cy="255"
              r="36"
              fill={isBehaviorActive ? '#10b981' : '#ffffff'}
              stroke={isBehaviorActive ? '#059669' : '#cbd5e1'}
              strokeWidth={isBehaviorActive ? '3.5' : '2'}
              className="transition-all duration-200 drop-shadow-sm group-hover:scale-105"
            />
            <text x="325" y="250" textAnchor="middle" fontSize="18" fill={isBehaviorActive ? '#ffffff' : '#334155'}>
              🏃
            </text>
            <text x="325" y="266" textAnchor="middle" fontSize="11" fontWeight="800" fill={isBehaviorActive ? '#ffffff' : '#1e293b'}>
              Behaviors
            </text>
            <rect x="260" y="298" width="130" height="18" rx="9" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
            <text x="325" y="310" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#047857">
              🟢 Controllable Lever
            </text>
          </g>
        </svg>
      </div>

      {/* ── Step-Through Progress Navigation ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Scenario Progression (5 Stages)
          </span>
          <span className="text-xs font-bold text-slate-600">
            Stage {activeStep} of 5
          </span>
        </div>

        {/* Step Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-transparent flex-wrap sm:flex-nowrap">
          {([1, 2, 3, 4, 5] as StepNumber[]).map((stepNum) => {
            const isCurrent = activeStep === stepNum;
            const labels = ['1. Trigger', '2. Thought', '3. Feeling', '4. Reaction', '5. Breaker'];
            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => {
                  setActiveStep(stepNum);
                  if (stepNum === 2) setSelectedNode('thoughts');
                  if (stepNum === 3) setSelectedNode('feelings');
                  if (stepNum === 4) setSelectedNode('behaviors');
                }}
                className={`flex-1 min-w-[65px] py-1.5 px-2 rounded-xl text-[11px] sm:text-xs transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-900 text-white font-bold shadow-sm ring-2 ring-slate-900'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200'
                }`}
              >
                {labels[stepNum - 1]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Interactive Step-Through Detail Card (Below Triangle) ── */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col gap-3.5 animate-fadeIn">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${currentStage.badgeColor}`}>
            Stage {currentStage.step}: {currentStage.stageName}
          </span>
          <span className={`text-xs font-bold ${isJournalMode ? 'text-violet-600' : 'text-slate-400'}`}>
            {isJournalMode ? '📖 ' : ''}{scenarioLabel}
          </span>
        </div>

        <div>
          <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
            {currentStage.title}
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            {currentStage.text}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            🧠 Cognitive Science Insight
          </span>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {currentStage.clinicalNote}
          </p>
        </div>

        {/* Step Forward / Backward Controls */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={activeStep === 1}
            onClick={() => setActiveStep((prev) => (prev > 1 ? ((prev - 1) as StepNumber) : prev))}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Previous Stage
          </button>

          <button
            type="button"
            disabled={activeStep === 5}
            onClick={() => setActiveStep((prev) => (prev < 5 ? ((prev + 1) as StepNumber) : prev))}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {activeStep === 4 ? 'See Circuit Breaker ⚡' : 'Next Stage →'}
          </button>
        </div>
      </div>

    </div>
  );
}
