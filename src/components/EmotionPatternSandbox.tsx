'use client';

import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type ViewMode      = 'decoder' | 'mirror';
type ClusterKey    = 'anger' | 'anxiety' | 'sadness' | 'guilt';
type Timeframe     = 'recent' | '7d' | '30d';

export interface EmotionProfile {
  id:               string;
  label:            string;
  cluster:          ClusterKey;
  topTrap:          string;
  trapTagColor:     string;
  correlationRate:  string;
  hiddenScript:     string;
  defusingQuestion: string;
  trapScores:       Record<string, number>; // 8 traps, score 0-10
}

// ═══════════════════════════════════════════════════════════
// CLUSTER METADATA
// ═══════════════════════════════════════════════════════════
const CLUSTERS: Record<ClusterKey, { label: string; emoji: string; color: string; bg: string; border: string; desc: string }> = {
  anger:   { label: 'Anger',   emoji: '🔥', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', desc: 'Injustice, violation of rules, perceived attack' },
  anxiety: { label: 'Anxiety', emoji: '⚡', color: '#8b5cf6', bg: '#faf5ff', border: '#e9d5ff', desc: 'Threat, uncertainty, anticipation of harm' },
  sadness: { label: 'Sadness', emoji: '💙', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', desc: 'Loss, disconnection, unmet belonging needs' },
  guilt:   { label: 'Guilt',   emoji: '🌀', color: '#8b5cf6', bg: '#fdf4ff', border: '#e9d5ff', desc: 'Self-blame, moral failure, shame spiral' },
};

const TRAP_LIST = [
  'Catastrophizing', 'Mind Reading', 'All-or-Nothing',
  'Should Statements', 'Overgeneralization', 'Emotional Reasoning',
  'Labelling', 'Personalization',
] as const;

// ═══════════════════════════════════════════════════════════
// CLINICAL DICTIONARY — 28 micro-emotions, 7 per cluster
// ═══════════════════════════════════════════════════════════
const EMOTION_PROFILES: EmotionProfile[] = [

  // ── ANGER ────────────────────────────────────────────────
  { id: 'resentful', label: 'Resentful', cluster: 'anger',
    topTrap: 'Should Statements', trapTagColor: 'bg-red-50 text-red-700 border-red-200',
    correlationRate: '84%',
    hiddenScript: '"They broke a rule that was never negotiated. This is unfair and they should be accountable — they chose this."',
    defusingQuestion: 'Is this "rule" one you explicitly agreed on together, or a standard you assumed was universal?',
    trapScores: { 'Catastrophizing':5,'Mind Reading':6,'All-or-Nothing':7,'Should Statements':9,'Overgeneralization':6,'Emotional Reasoning':6,'Labelling':7,'Personalization':4 } },

  { id: 'contemptuous', label: 'Contemptuous', cluster: 'anger',
    topTrap: 'Labelling', trapTagColor: 'bg-orange-50 text-orange-700 border-orange-200',
    correlationRate: '89%',
    hiddenScript: '"This person is fundamentally flawed or inferior. Their single behavior defines everything they are."',
    defusingQuestion: 'What is one thing this person has done that contradicts the global label you have assigned them?',
    trapScores: { 'Catastrophizing':4,'Mind Reading':5,'All-or-Nothing':8,'Should Statements':7,'Overgeneralization':8,'Emotional Reasoning':7,'Labelling':10,'Personalization':3 } },

  { id: 'frustrated', label: 'Frustrated', cluster: 'anger',
    topTrap: 'All-or-Nothing', trapTagColor: 'bg-rose-50 text-rose-700 border-rose-200',
    correlationRate: '78%',
    hiddenScript: '"Progress is completely blocked. Nothing is working. This effort is pointless."',
    defusingQuestion: 'What is the smallest sign — however minor — that some progress has been made or is possible?',
    trapScores: { 'Catastrophizing':6,'Mind Reading':3,'All-or-Nothing':9,'Should Statements':6,'Overgeneralization':7,'Emotional Reasoning':5,'Labelling':5,'Personalization':4 } },

  { id: 'irritable', label: 'Irritable', cluster: 'anger',
    topTrap: 'Emotional Reasoning', trapTagColor: 'bg-amber-50 text-amber-700 border-amber-200',
    correlationRate: '71%',
    hiddenScript: '"Everything feels wrong. My discomfort is proof that something is wrong — probably with them, or with this situation."',
    defusingQuestion: 'Is it possible the irritation is signaling exhaustion or unmet needs rather than an actual external problem?',
    trapScores: { 'Catastrophizing':4,'Mind Reading':5,'All-or-Nothing':6,'Should Statements':7,'Overgeneralization':6,'Emotional Reasoning':9,'Labelling':6,'Personalization':3 } },

  { id: 'hostile', label: 'Hostile', cluster: 'anger',
    topTrap: 'Mind Reading', trapTagColor: 'bg-red-50 text-red-700 border-red-200',
    correlationRate: '80%',
    hiddenScript: '"They are deliberately trying to provoke or harm me. Their intent is malicious."',
    defusingQuestion: 'What is the most generous interpretation of their behavior — what else could explain it besides hostile intent?',
    trapScores: { 'Catastrophizing':6,'Mind Reading':10,'All-or-Nothing':6,'Should Statements':7,'Overgeneralization':6,'Emotional Reasoning':7,'Labelling':8,'Personalization':5 } },

  { id: 'outraged', label: 'Outraged', cluster: 'anger',
    topTrap: 'Overgeneralization', trapTagColor: 'bg-red-50 text-red-700 border-red-200',
    correlationRate: '76%',
    hiddenScript: '"This is always how it goes. This one event proves a universal truth about them, this system, or the world."',
    defusingQuestion: 'Is this event actually representative of a pattern, or does it feel that way because of how intense this moment is?',
    trapScores: { 'Catastrophizing':7,'Mind Reading':5,'All-or-Nothing':7,'Should Statements':8,'Overgeneralization':9,'Emotional Reasoning':8,'Labelling':7,'Personalization':4 } },

  { id: 'disgusted', label: 'Disgusted', cluster: 'anger',
    topTrap: 'Labelling', trapTagColor: 'bg-orange-50 text-orange-700 border-orange-200',
    correlationRate: '82%',
    hiddenScript: '"This behavior or quality is so repellent that it defines the entire person or situation as worthless."',
    defusingQuestion: 'Can you separate the behavior (which may genuinely be problematic) from a global judgment of the person as worthless?',
    trapScores: { 'Catastrophizing':4,'Mind Reading':4,'All-or-Nothing':8,'Should Statements':7,'Overgeneralization':7,'Emotional Reasoning':6,'Labelling':10,'Personalization':3 } },

  // ── ANXIETY ──────────────────────────────────────────────
  { id: 'worried', label: 'Worried', cluster: 'anxiety',
    topTrap: 'Catastrophizing', trapTagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    correlationRate: '91%',
    hiddenScript: '"Something bad is going to happen. I need to mentally rehearse every possible disaster to stay prepared."',
    defusingQuestion: 'What is the realistic base-rate probability of the worst outcome — and what is your actual plan if it happens?',
    trapScores: { 'Catastrophizing':10,'Mind Reading':7,'All-or-Nothing':5,'Should Statements':4,'Overgeneralization':6,'Emotional Reasoning':8,'Labelling':3,'Personalization':5 } },

  { id: 'apprehensive', label: 'Apprehensive', cluster: 'anxiety',
    topTrap: 'Mind Reading', trapTagColor: 'bg-violet-50 text-violet-700 border-violet-200',
    correlationRate: '79%',
    hiddenScript: '"They will judge me negatively. I know what they will think before it even happens."',
    defusingQuestion: 'What concrete evidence do you have that this person is evaluating you critically right now?',
    trapScores: { 'Catastrophizing':7,'Mind Reading':9,'All-or-Nothing':5,'Should Statements':5,'Overgeneralization':5,'Emotional Reasoning':8,'Labelling':3,'Personalization':6 } },

  { id: 'dread', label: 'Dread', cluster: 'anxiety',
    topTrap: 'Catastrophizing', trapTagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    correlationRate: '88%',
    hiddenScript: '"The upcoming event will be unbearable, humiliating, or catastrophic. I will not be able to cope."',
    defusingQuestion: 'Think of a past event you dreaded. How does what actually happened compare to what you predicted?',
    trapScores: { 'Catastrophizing':10,'Mind Reading':6,'All-or-Nothing':6,'Should Statements':4,'Overgeneralization':7,'Emotional Reasoning':9,'Labelling':3,'Personalization':6 } },

  { id: 'panicked', label: 'Panicked', cluster: 'anxiety',
    topTrap: 'Emotional Reasoning', trapTagColor: 'bg-violet-50 text-violet-700 border-violet-200',
    correlationRate: '93%',
    hiddenScript: '"My body is in crisis, therefore the danger is real and imminent. The physical feeling is proof."',
    defusingQuestion: 'Could the physical sensations you are experiencing be anxiety mimicking danger rather than actual danger? What would help you feel safer right now?',
    trapScores: { 'Catastrophizing':9,'Mind Reading':5,'All-or-Nothing':5,'Should Statements':3,'Overgeneralization':5,'Emotional Reasoning':10,'Labelling':3,'Personalization':5 } },

  { id: 'overwhelmed', label: 'Overwhelmed', cluster: 'anxiety',
    topTrap: 'All-or-Nothing', trapTagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    correlationRate: '77%',
    hiddenScript: '"Everything needs to be done perfectly and all at once. I cannot handle this volume. I will collapse."',
    defusingQuestion: 'If you could only do one thing in the next 15 minutes, what would make the smallest real difference?',
    trapScores: { 'Catastrophizing':8,'Mind Reading':4,'All-or-Nothing':9,'Should Statements':7,'Overgeneralization':6,'Emotional Reasoning':8,'Labelling':4,'Personalization':5 } },

  { id: 'tense', label: 'Tense', cluster: 'anxiety',
    topTrap: 'Should Statements', trapTagColor: 'bg-violet-50 text-violet-700 border-violet-200',
    correlationRate: '68%',
    hiddenScript: '"I should be performing better. I should not be struggling. Something is wrong with me for finding this hard."',
    defusingQuestion: 'What would you tell a colleague who told you they were feeling this kind of pressure — would you hold them to the same standard?',
    trapScores: { 'Catastrophizing':5,'Mind Reading':5,'All-or-Nothing':6,'Should Statements':9,'Overgeneralization':5,'Emotional Reasoning':7,'Labelling':5,'Personalization':6 } },

  { id: 'nervous', label: 'Nervous', cluster: 'anxiety',
    topTrap: 'Mind Reading', trapTagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    correlationRate: '74%',
    hiddenScript: '"Everyone will notice. They will see my discomfort and judge me for it. I will embarrass myself."',
    defusingQuestion: 'When you are around others, how much of your attention is focused on them versus yourself? Most people are similarly self-focused.',
    trapScores: { 'Catastrophizing':6,'Mind Reading':9,'All-or-Nothing':5,'Should Statements':5,'Overgeneralization':5,'Emotional Reasoning':7,'Labelling':4,'Personalization':7 } },

  // ── SADNESS ──────────────────────────────────────────────
  { id: 'lonely', label: 'Lonely', cluster: 'sadness',
    topTrap: 'Mind Reading', trapTagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    correlationRate: '81%',
    hiddenScript: '"No one actually cares or wants to be around me. If they knew the real me, they would leave."',
    defusingQuestion: 'What is one person who has shown genuine care for you recently — even in a small way? What would it take to reach out?',
    trapScores: { 'Catastrophizing':7,'Mind Reading':9,'All-or-Nothing':7,'Should Statements':4,'Overgeneralization':8,'Emotional Reasoning':7,'Labelling':7,'Personalization':7 } },

  { id: 'hopeless', label: 'Hopeless', cluster: 'sadness',
    topTrap: 'Overgeneralization', trapTagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    correlationRate: '90%',
    hiddenScript: '"Nothing will ever change. Every attempt has failed. The future is predetermined and bleak."',
    defusingQuestion: 'Has there ever been a time when something you thought would never change actually did change? What made that possible?',
    trapScores: { 'Catastrophizing':9,'Mind Reading':4,'All-or-Nothing':9,'Should Statements':4,'Overgeneralization':10,'Emotional Reasoning':8,'Labelling':7,'Personalization':6 } },

  { id: 'despairing', label: 'Despairing', cluster: 'sadness',
    topTrap: 'All-or-Nothing', trapTagColor: 'bg-sky-50 text-sky-700 border-sky-200',
    correlationRate: '86%',
    hiddenScript: '"I have completely failed. There is no path forward. My situation is total and permanent."',
    defusingQuestion: 'What is the single smallest thing — a phone call, one sentence written, five minutes outside — that is not nothing?',
    trapScores: { 'Catastrophizing':9,'Mind Reading':4,'All-or-Nothing':10,'Should Statements':5,'Overgeneralization':9,'Emotional Reasoning':8,'Labelling':8,'Personalization':7 } },

  { id: 'melancholy', label: 'Melancholy', cluster: 'sadness',
    topTrap: 'Overgeneralization', trapTagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    correlationRate: '72%',
    hiddenScript: '"Things used to be better and will not return. What was good is gone. This wistfulness is reality."',
    defusingQuestion: 'What aspects of the present have value that you might be discounting because the past had different value?',
    trapScores: { 'Catastrophizing':6,'Mind Reading':3,'All-or-Nothing':7,'Should Statements':5,'Overgeneralization':9,'Emotional Reasoning':7,'Labelling':5,'Personalization':5 } },

  { id: 'empty', label: 'Empty', cluster: 'sadness',
    topTrap: 'Emotional Reasoning', trapTagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    correlationRate: '83%',
    hiddenScript: '"I feel nothing, therefore I am nothing. The absence of feeling proves there is something wrong with me fundamentally."',
    defusingQuestion: 'Emotional numbness is often a protective state after overload. What need has been going unmet that might create this numbness?',
    trapScores: { 'Catastrophizing':5,'Mind Reading':3,'All-or-Nothing':8,'Should Statements':5,'Overgeneralization':8,'Emotional Reasoning':10,'Labelling':8,'Personalization':6 } },

  { id: 'defeated', label: 'Defeated', cluster: 'sadness',
    topTrap: 'All-or-Nothing', trapTagColor: 'bg-sky-50 text-sky-700 border-sky-200',
    correlationRate: '85%',
    hiddenScript: '"I tried and it did not work, which proves I am incapable. Effort is futile. I should stop."',
    defusingQuestion: 'What specifically did not work — and what remains unproven? Failure at a task is not failure as a person.',
    trapScores: { 'Catastrophizing':7,'Mind Reading':4,'All-or-Nothing':10,'Should Statements':6,'Overgeneralization':8,'Emotional Reasoning':7,'Labelling':8,'Personalization':7 } },

  // ── GUILT ────────────────────────────────────────────────
  { id: 'ashamed', label: 'Ashamed', cluster: 'guilt',
    topTrap: 'Labelling', trapTagColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    correlationRate: '92%',
    hiddenScript: '"I am not just someone who did a bad thing — I am a bad person. This defines my worth as a human being."',
    defusingQuestion: 'Can you separate the action (which may need addressing) from a global verdict about your entire identity and worth?',
    trapScores: { 'Catastrophizing':5,'Mind Reading':5,'All-or-Nothing':8,'Should Statements':9,'Overgeneralization':7,'Emotional Reasoning':8,'Labelling':10,'Personalization':10 } },

  { id: 'remorseful', label: 'Remorseful', cluster: 'guilt',
    topTrap: 'Should Statements', trapTagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    correlationRate: '80%',
    hiddenScript: '"I should have known. I should have done differently. A better person would not have made this choice."',
    defusingQuestion: 'Did you have the same information, resources, and emotional state then as you do now? Judging past decisions with present knowledge is unfair.',
    trapScores: { 'Catastrophizing':5,'Mind Reading':4,'All-or-Nothing':7,'Should Statements':10,'Overgeneralization':6,'Emotional Reasoning':7,'Labelling':8,'Personalization':9 } },

  { id: 'self_critical', label: 'Self-Critical', cluster: 'guilt',
    topTrap: 'Personalization', trapTagColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    correlationRate: '87%',
    hiddenScript: '"Every negative outcome is my fault. I am the causal agent of anything that goes wrong around me."',
    defusingQuestion: 'What percentage of this outcome was actually within your control? List the factors that were not.',
    trapScores: { 'Catastrophizing':5,'Mind Reading':5,'All-or-Nothing':7,'Should Statements':8,'Overgeneralization':7,'Emotional Reasoning':7,'Labelling':8,'Personalization':10 } },

  { id: 'embarrassed', label: 'Embarrassed', cluster: 'guilt',
    topTrap: 'Mind Reading', trapTagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    correlationRate: '78%',
    hiddenScript: '"Everyone saw. Everyone is judging me right now. They will remember this and think less of me permanently."',
    defusingQuestion: 'The spotlight effect research shows people notice and remember our mistakes far less than we predict. What would make you forget a similar mistake by someone else?',
    trapScores: { 'Catastrophizing':6,'Mind Reading':10,'All-or-Nothing':5,'Should Statements':6,'Overgeneralization':6,'Emotional Reasoning':7,'Labelling':6,'Personalization':9 } },

  { id: 'humiliated', label: 'Humiliated', cluster: 'guilt',
    topTrap: 'Labelling', trapTagColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    correlationRate: '85%',
    hiddenScript: '"I have been exposed as incompetent, stupid, or worthless in front of others. This defines how they see me now."',
    defusingQuestion: 'How many people in that situation were focused on evaluating you versus managing their own experience?',
    trapScores: { 'Catastrophizing':7,'Mind Reading':8,'All-or-Nothing':7,'Should Statements':6,'Overgeneralization':7,'Emotional Reasoning':7,'Labelling':10,'Personalization':9 } },

  { id: 'regretful', label: 'Regretful', cluster: 'guilt',
    topTrap: 'Should Statements', trapTagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    correlationRate: '73%',
    hiddenScript: '"I chose wrong. I wasted time or opportunity. If I had acted differently, everything would have been better."',
    defusingQuestion: 'Counterfactual thinking assumes the alternative choice would have worked out better. What might have gone wrong on that other path?',
    trapScores: { 'Catastrophizing':6,'Mind Reading':3,'All-or-Nothing':8,'Should Statements':10,'Overgeneralization':7,'Emotional Reasoning':6,'Labelling':6,'Personalization':8 } },

  { id: 'unworthy', label: 'Unworthy', cluster: 'guilt',
    topTrap: 'Personalization', trapTagColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    correlationRate: '88%',
    hiddenScript: '"I do not deserve good things. Any kindness directed at me is a mistake. People will realize their error."',
    defusingQuestion: 'Worth is not earned — it is a condition of being human. What evidence would it take to convince you that you deserved care? Does that standard apply to others?',
    trapScores: { 'Catastrophizing':6,'Mind Reading':6,'All-or-Nothing':8,'Should Statements':8,'Overgeneralization':8,'Emotional Reasoning':8,'Labelling':9,'Personalization':10 } },
];

// ═══════════════════════════════════════════════════════════
// PATTERN MIRROR — simulated historical data (7 entries)
// ═══════════════════════════════════════════════════════════
interface HistoryEntry { day: string; short: string; cluster: ClusterKey; emotion: string; trap: string; }
const RECENT_ENTRIES: HistoryEntry[] = [
  { day: 'Today',          short: 'Mon', cluster: 'anxiety', emotion: 'Overwhelmed',    trap: 'All-or-Nothing' },
  { day: 'Yesterday',      short: 'Sun', cluster: 'guilt',   emotion: 'Self-Critical',  trap: 'Personalization' },
  { day: '2 days ago',     short: 'Sat', cluster: 'anger',   emotion: 'Resentful',      trap: 'Should Statements' },
  { day: '3 days ago',     short: 'Fri', cluster: 'anxiety', emotion: 'Worried',        trap: 'Catastrophizing' },
  { day: '4 days ago',     short: 'Thu', cluster: 'sadness', emotion: 'Defeated',       trap: 'All-or-Nothing' },
  { day: '5 days ago',     short: 'Wed', cluster: 'guilt',   emotion: 'Ashamed',        trap: 'Labelling' },
  { day: '6 days ago',     short: 'Tue', cluster: 'anxiety', emotion: 'Apprehensive',   trap: 'Mind Reading' },
];
const WEEK_ENTRIES: HistoryEntry[] = [
  ...RECENT_ENTRIES,
  { day: 'Last week',      short: 'Mon', cluster: 'anger',   emotion: 'Frustrated',     trap: 'All-or-Nothing' },
  { day: 'Last week',      short: 'Tue', cluster: 'anxiety', emotion: 'Dread',          trap: 'Catastrophizing' },
  { day: 'Last week',      short: 'Wed', cluster: 'sadness', emotion: 'Lonely',         trap: 'Mind Reading' },
  { day: 'Last week',      short: 'Thu', cluster: 'guilt',   emotion: 'Remorseful',     trap: 'Should Statements' },
  { day: 'Last week',      short: 'Fri', cluster: 'anger',   emotion: 'Hostile',        trap: 'Mind Reading' },
];
const MONTH_ENTRIES: HistoryEntry[] = [
  ...WEEK_ENTRIES,
  { day: '2 weeks ago',    short: 'W2', cluster: 'anxiety', emotion: 'Nervous',         trap: 'Mind Reading' },
  { day: '2 weeks ago',    short: 'W2', cluster: 'sadness', emotion: 'Hopeless',        trap: 'Overgeneralization' },
  { day: '2 weeks ago',    short: 'W2', cluster: 'guilt',   emotion: 'Embarrassed',    trap: 'Mind Reading' },
  { day: '3 weeks ago',    short: 'W3', cluster: 'anger',   emotion: 'Outraged',       trap: 'Overgeneralization' },
  { day: '3 weeks ago',    short: 'W3', cluster: 'anxiety', emotion: 'Panicked',       trap: 'Emotional Reasoning' },
  { day: '3 weeks ago',    short: 'W3', cluster: 'sadness', emotion: 'Empty',          trap: 'Emotional Reasoning' },
  { day: '4 weeks ago',    short: 'W4', cluster: 'guilt',   emotion: 'Unworthy',       trap: 'Personalization' },
  { day: '4 weeks ago',    short: 'W4', cluster: 'anger',   emotion: 'Contemptuous',   trap: 'Labelling' },
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function countClusters(entries: HistoryEntry[]): Record<ClusterKey, number> {
  const counts: Record<ClusterKey, number> = { anger: 0, anxiety: 0, sadness: 0, guilt: 0 };
  entries.forEach(e => { counts[e.cluster]++; });
  return counts;
}
function topCluster(counts: Record<ClusterKey, number>): ClusterKey {
  return (Object.keys(counts) as ClusterKey[]).reduce((a, b) => counts[a] >= counts[b] ? a : b);
}
function countTraps(entries: HistoryEntry[]): Record<string, number> {
  const c: Record<string, number> = {};
  entries.forEach(e => { c[e.trap] = (c[e.trap] ?? 0) + 1; });
  return c;
}
function topTrap(counts: Record<string, number>): string {
  return Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b, '');
}

const BAR_COLORS: Record<ClusterKey, string> = {
  anger: '#ef4444', anxiety: '#8b5cf6', sadness: '#3b82f6', guilt: '#a21caf',
};
const CLUSTER_PATTERN_NOTES: Record<ClusterKey, { headline: string; note: string; antidote: string }> = {
  anger:   { headline: 'Anger & Injustice Pattern', note: 'Your entries show a recurring sense of violated expectations — should violations and labelling of others suggest that rules you hold as universal are being broken. The brain interprets this as injustice, generating sustained anger.', antidote: 'Try writing down the specific rule that was violated and asking whether it was explicitly agreed upon. Anger often dissolves when expectations are renegotiated rather than enforced.' },
  anxiety: { headline: 'Threat-Detection Loop', note: 'Catastrophizing and mind reading appear repeatedly across your entries, which is the signature of a hyperactivated threat-detection system. The brain is treating uncertainty as danger and scanning for worst-case outcomes.', antidote: 'Ground exercises work here: name 5 things you can see right now. Physical safety signals deactivate the alarm system faster than reasoning.' },
  sadness: { headline: 'Disconnection & Loss Pattern', note: 'All-or-nothing and overgeneralization dominate, which is characteristic of low-mood states that colour every event with the same grey brush. Single setbacks are being processed as permanent, total failures.', antidote: 'Behavioural activation — one small, meaningful action regardless of motivation — creates evidence that contradicts the all-is-lost narrative.' },
  guilt:   { headline: 'Self-Blame Signature', note: 'Personalization and labelling appear as your dominant traps, meaning external events are being routed through a filter of personal responsibility. You are treating yourself as the causal agent of outcomes that involve many factors.', antidote: 'Write a list of factors outside your control that contributed to the outcome. Self-compassion is not lowering standards — it is accurate attribution.' },
};

// ═══════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════
function TrapBar({ label, score, max = 10, isTop = false }: { label: string; score: number; max?: number; isTop?: boolean }) {
  const pct = Math.round((score / max) * 100);
  const color = score >= 9 ? '#ef4444' : score >= 7 ? '#f59e0b' : score >= 5 ? '#6366f1' : '#94a3b8';
  return (
    <div
      className="flex items-center gap-2 text-xs rounded-lg px-2 py-1 transition-all"
      style={isTop ? { backgroundColor: color + '12', outline: `1.5px solid ${color}40` } : {}}
    >
      <span
        className="w-32 shrink-0 truncate"
        style={{ fontWeight: isTop ? 700 : 500, color: isTop ? color : '#475569' }}
      >
        {isTop && '▶ '}{label}
      </span>
      <div className="flex-1 bg-slate-100 rounded-full overflow-hidden" style={{ height: isTop ? '10px' : '8px' }}>
        <div style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: '9999px', transition: 'width 0.6s ease' }} />
      </div>
      <span className="w-6 text-right font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function ClusterPill({ clusterKey, active, onClick }: { clusterKey: ClusterKey; active: boolean; onClick: () => void }) {
  const c = CLUSTERS[clusterKey];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-2xl border-2 transition-all duration-200 min-w-[70px]"
      style={{
        borderColor: active ? c.color : '#e2e8f0',
        backgroundColor: active ? c.bg : '#f8fafc',
        boxShadow: active ? `0 0 0 3px ${c.color}22` : 'none',
        transform: active ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      <span className="text-xl">{c.emoji}</span>
      <span className="text-xs font-bold" style={{ color: active ? c.color : '#475569' }}>{c.label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════
export default function EmotionPatternSandbox() {
  const [viewMode,            setViewMode]            = useState<ViewMode>('decoder');
  const [selectedCluster,     setSelectedCluster]     = useState<ClusterKey>('anxiety');
  const [selectedMicroEmotion,setSelectedMicroEmotion]= useState<string>('worried');
  const [mirrorTimeframe,     setMirrorTimeframe]     = useState<Timeframe>('recent');
  const [dataSource,          setDataSource]          = useState<'live' | 'sample'>('sample');
  const [liveEntries,         setLiveEntries]         = useState<HistoryEntry[]>([]);
  const [hasLiveJournal,      setHasLiveJournal]      = useState<boolean>(false);

  // Passes context to the CBT Triangle sandbox at the top of the page
  function handleTransferToTriangle(emotionId: string, topTrap: string, defusingQuestion: string) {
    const payload = {
      emotionId,
      topTrap,
      defusingQuestion,
      transferredAt: Date.now(),
    };

    try {
      localStorage.setItem('momentum_triangle_transfer', JSON.stringify(payload));
    } catch (_) { /* localStorage unavailable — silent fail */ }

    // Dispatch event for active in-page components
    window.dispatchEvent(new CustomEvent('momentum:triangle-transfer', { detail: payload }));

    // Scroll to CBT Triangle tool
    const el = document.getElementById('cbt-triangle-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Attempt live pattern sync with user's journal entries
  useEffect(() => {
    async function syncJournal() {
      try {
        const res = await fetch('/api/journal');
        if (!res.ok) return;
        const data = await res.json();
        if (data.entries && Array.isArray(data.entries) && data.entries.length > 0) {
          const parsed: HistoryEntry[] = data.entries.map((item: any, idx: number) => {
            // Infer cluster
            let cluster: ClusterKey = 'anxiety';
            let emotionName = 'Reflective';
            try {
              const ems = typeof item.emotionsJson === 'string' ? JSON.parse(item.emotionsJson) : item.emotionsJson;
              if (Array.isArray(ems) && ems.length > 0) {
                emotionName = ems[0].name || ems[0];
                const lower = emotionName.toLowerCase();
                if (/anger|frustrat|resent|irrit|hostil|outrage|disgust/i.test(lower)) cluster = 'anger';
                else if (/sad|lonel|hope|despair|melan|empty|defeat|grief/i.test(lower)) cluster = 'sadness';
                else if (/guilt|shame|remorse|critic|embarrass|humiliat|regret|unworth/i.test(lower)) cluster = 'guilt';
                else cluster = 'anxiety';
              }
            } catch (_) {}

            // Infer trap
            let trap = 'Catastrophizing';
            try {
              const traps = typeof item.distortionsJson === 'string' ? JSON.parse(item.distortionsJson) : item.distortionsJson;
              if (Array.isArray(traps) && traps.length > 0) {
                trap = traps[0];
              }
            } catch (_) {}

            const createdDate = item.createdAt ? new Date(item.createdAt) : new Date();
            const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            const dayLabel = idx === 0 ? 'Latest' : daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
            const shortLabel = createdDate.toLocaleDateString(undefined, { weekday: 'short' });

            return {
              day: dayLabel,
              short: shortLabel,
              cluster,
              emotion: emotionName,
              trap,
            };
          });

          setLiveEntries(parsed);
          setHasLiveJournal(true);
          setDataSource('live');
        }
      } catch (_) {}
    }
    syncJournal();
  }, []);

  const clusterEmotions = EMOTION_PROFILES.filter(e => e.cluster === selectedCluster);
  const activeProfile   = EMOTION_PROFILES.find(e => e.id === selectedMicroEmotion)
                        ?? clusterEmotions[0];

  const sampleEntriesByTimeframe: Record<Timeframe, HistoryEntry[]> = {
    recent: RECENT_ENTRIES,
    '7d':   WEEK_ENTRIES,
    '30d':  MONTH_ENTRIES,
  };

  const currentDataset = dataSource === 'live' && liveEntries.length > 0 ? liveEntries : sampleEntriesByTimeframe[mirrorTimeframe];
  const entriesBySlice = dataSource === 'live'
    ? (mirrorTimeframe === 'recent' ? currentDataset.slice(0, 7) : mirrorTimeframe === '7d' ? currentDataset.slice(0, 14) : currentDataset)
    : currentDataset;

  const entries         = entriesBySlice;
  const clusterCounts   = countClusters(entries);
  const totalEntries    = entries.length;
  const dominantCluster = topCluster(clusterCounts);
  const trapCounts      = countTraps(entries);
  const topTrapName     = topTrap(trapCounts);
  const patternNote     = CLUSTER_PATTERN_NOTES[dominantCluster];

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 sm:p-8 flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="text-center">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Emotion Decoder & Pattern Mirror
        </h3>
        <p className="text-slate-500 mt-1 text-sm sm:text-base font-medium">
          Identify what each emotion is really saying — and spot recurring patterns.
        </p>
      </div>

      {/* ── View mode tabs ── */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80">
        {(['decoder', 'mirror'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={
              viewMode === mode
                ? 'bg-slate-900 text-white shadow-sm font-semibold rounded-xl px-5 py-2.5 text-sm transition-all flex items-center justify-center gap-2 flex-1'
                : 'bg-transparent text-slate-600 hover:text-slate-900 font-medium rounded-xl px-5 py-2.5 text-sm transition-all flex items-center justify-center gap-2 flex-1'
            }
          >
            {mode === 'decoder' ? '🔍 Emotion Decoder' : '🪞 Pattern Mirror'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* DECODER MODE */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === 'decoder' && (
        <div className="flex flex-col gap-5">

          {/* Cluster selector */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Emotion Cluster</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(CLUSTERS) as ClusterKey[]).map(k => (
                <ClusterPill key={k} clusterKey={k} active={selectedCluster === k}
                  onClick={() => {
                    setSelectedCluster(k);
                    const first = EMOTION_PROFILES.find(e => e.cluster === k);
                    if (first) setSelectedMicroEmotion(first.id);
                  }}
                />))}
            </div>
          </div>

          {/* Micro-emotion picker */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Refine the Feeling</p>
            <div className="flex flex-wrap gap-2">
              {clusterEmotions.map(e => {
                const c = CLUSTERS[selectedCluster];
                const active = selectedMicroEmotion === e.id;
                return (
                  <button key={e.id} type="button"
                    onClick={() => setSelectedMicroEmotion(e.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150"
                    style={{
                      backgroundColor: active ? c.color : '#f1f5f9',
                      color: active ? '#fff' : '#475569',
                      borderColor: active ? c.color : 'transparent',
                    }}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main deep-dive card */}
          {activeProfile && (() => {
            const c = CLUSTERS[activeProfile.cluster];
            return (
              <div className="rounded-2xl border p-5 sm:p-6 flex flex-col gap-4"
                style={{ borderColor: c.color + '40', backgroundColor: c.bg }}>

                {/* Emotion + trap header */}
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-2xl font-extrabold" style={{ color: c.color }}>
                      {c.emoji} {activeProfile.label}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${activeProfile.trapTagColor}`}>
                        Top Trap: {activeProfile.topTrap}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{activeProfile.correlationRate} correlation</span>
                    </div>
                  </div>
                </div>

                {/* Hidden script */}
                <div className="rounded-xl bg-white/70 border border-white/80 p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Hidden Script</p>
                  <p className="text-slate-700 text-sm leading-relaxed italic">{activeProfile.hiddenScript}</p>
                </div>

                {/* Defusing question */}
                <div className="rounded-xl p-4" style={{ backgroundColor: c.color + '15', border: `1px solid ${c.color}30` }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: c.color }}>Defusing Question</p>
                  <p className="text-slate-800 text-sm leading-relaxed font-medium">{activeProfile.defusingQuestion}</p>
                  <button
                    type="button"
                    onClick={() => handleTransferToTriangle(activeProfile.id, activeProfile.topTrap, activeProfile.defusingQuestion)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition-all"
                  >
                    <span>⚡ Break This Loop in CBT Triangle</span>
                  </button>
                </div>

                {/* Trap activation bars — sorted descending */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Thinking Trap Activation Profile</p>
                  <div className="flex flex-col gap-2">
                    {[...TRAP_LIST]
                      .map(trap => ({ trap, score: activeProfile.trapScores[trap] ?? 0 }))
                      .sort((a, b) => b.score - a.score)
                      .map(({ trap, score }, i) => (
                        <TrapBar key={trap} label={trap} score={score} isTop={i === 0} />
                      ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* MIRROR MODE */}
      {/* ══════════════════════════════════════════════════════ */}
      {viewMode === 'mirror' && (
        <div className="flex flex-col gap-5">

          {/* Data source status & toggle */}
          {hasLiveJournal && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/80 border border-emerald-200/70 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 font-medium text-emerald-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {dataSource === 'live'
                    ? `Synced with Journal (${liveEntries.length} entries)`
                    : 'Viewing Sample Baseline Dataset'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDataSource(prev => prev === 'live' ? 'sample' : 'live')}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                {dataSource === 'live' ? 'Switch to Sample' : 'Switch to Live'}
              </button>
            </div>
          )}

          {/* Timeframe selector */}
          <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1">
            {([['recent', 'Recent (7 entries)'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']] as [Timeframe, string][]).map(([tf, label]) => (
              <button key={tf} type="button"
                onClick={() => setMirrorTimeframe(tf)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  backgroundColor: mirrorTimeframe === tf ? '#fff' : 'transparent',
                  color: mirrorTimeframe === tf ? '#1e293b' : '#94a3b8',
                  boxShadow: mirrorTimeframe === tf ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
              </button>))}
          </div>

          {/* Cluster distribution bar */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Emotion Cluster Distribution</p>
            <div className="flex rounded-xl overflow-hidden h-6" style={{ border: '1px solid #e2e8f0' }}>
              {(Object.keys(CLUSTERS) as ClusterKey[]).map(k => {
                const pct = totalEntries > 0 ? (clusterCounts[k] / totalEntries) * 100 : 0;
                if (pct === 0) return null;
                return <div key={k} style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[k] }}
                         title={`${CLUSTERS[k].label}: ${clusterCounts[k]} entries (${Math.round(pct)}%)`} />;
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {(Object.keys(CLUSTERS) as ClusterKey[]).map(k => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BAR_COLORS[k] }} />
                  <span className="text-xs text-slate-500">{CLUSTERS[k].label}: {clusterCounts[k]}</span>
                </div>))}
            </div>
          </div>

          {/* Entry timeline */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Entry Timeline</p>
            <div className="flex flex-col gap-2">
              {entries.slice(0, 10).map((entry, i) => {
                const c = CLUSTERS[entry.cluster];
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ backgroundColor: c.bg, borderColor: c.color + '30' }}>
                    <span className="text-base">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold" style={{ color: c.color }}>{entry.emotion}</span>
                        <span className="text-xs bg-white/80 border text-slate-500 px-1.5 py-0.5 rounded-full"
                          style={{ borderColor: '#e2e8f0' }}>
                          {entry.trap}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{entry.short}</span>
                  </div>
                );
              })}
              {entries.length > 10 && (
                <p className="text-xs text-center text-slate-400 py-1">+{entries.length - 10} more entries</p>)}
            </div>
          </div>

          {/* Dominant pattern card */}
          <div className="rounded-2xl border p-5 flex flex-col gap-3"
            style={{ borderColor: BAR_COLORS[dominantCluster] + '50', backgroundColor: CLUSTERS[dominantCluster].bg }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{CLUSTERS[dominantCluster].emoji}</span>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Signature Pattern</p>
                <p className="font-extrabold text-base" style={{ color: BAR_COLORS[dominantCluster] }}>
                  {patternNote.headline}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{patternNote.note}</p>
            <div className="rounded-xl p-3 bg-white/70 border border-white">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: BAR_COLORS[dominantCluster] }}>Recommended Antidote</p>
              <p className="text-sm text-slate-700 leading-relaxed">{patternNote.antidote}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Most active trap: <strong className="text-slate-600">{topTrapName}</strong></span>
              <span>{totalEntries} entries analyzed</span>
            </div>
            <button
              type="button"
              onClick={() => handleTransferToTriangle(dominantCluster, topTrapName, patternNote.antidote)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition-all"
            >
              <span>⚡ Break This Pattern in CBT Triangle</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}