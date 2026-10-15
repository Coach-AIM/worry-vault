'use client';

import React, { useState, useMemo, useRef } from 'react';

// ============================================================
// TYPE DEFINITIONS
// ============================================================
export interface GlossaryItem {
  id: string;
  term: string;
  category: 'framework' | 'distortion';
  oneLiner: string;
  definition: string;
  clinicalExample: string;
  antidoteScript: string;
  relatedIds?: string[];
}

type CategoryFilter = 'all' | 'framework' | 'distortion';

// ============================================================
// COMPREHENSIVE TAXONOMY DATA (24 Terms: 8 Frameworks, 16 Distortions)
// ============================================================
export const GLOSSARY_ITEMS: GlossaryItem[] = [
  // ── CORE FRAMEWORKS (8) ──────────────────────────────────────
  {
    id: 'cbt_triangle',
    term: 'The CBT Triangle (Cognitive Model)',
    category: 'framework',
    oneLiner: 'The reciprocal feedback loop between Thoughts, Feelings, and Behaviors.',
    definition:
      'The foundational premise of CBT: situations do not cause our emotional distress directly. Instead, our automatic thoughts about a situation trigger involuntary physiological feelings, which prompt behaviors that reinforce the initial thought loop.',
    clinicalExample:
      '"If I don\'t feel motivated, I can\'t start working." ➔ Waiting for motivation leads to procrastination, which increases anxiety, confirming the belief that work is impossible.',
    antidoteScript:
      'Intervene at the two controllable levers: calibrate Thoughts through evidence-testing, or change Behaviors through 5-minute opposite actions.',
    relatedIds: ['automatic_thoughts', 'cognitive_restructuring', 'opposite_action'],
  },
  {
    id: 'automatic_thoughts',
    term: 'Automatic Negative Thoughts (ANTs)',
    category: 'framework',
    oneLiner: 'Rapid, involuntary micro-second narratives your brain generates in response to triggers.',
    definition:
      'Spontaneous interpretations that flash through consciousness without deliberate effort. Because they arise instantly via the threat-detection system, they feel like undeniable objective facts rather than unverified hypotheses.',
    clinicalExample:
      '"They glanced at the clock while I was presenting — they clearly think my presentation is completely useless."',
    antidoteScript:
      'Treat automatic thoughts as hypotheses to test, not verdicts. Ask: "What is the concrete evidence for and against this specific interpretation?"',
    relatedIds: ['cbt_triangle', 'cognitive_restructuring', 'mindreading'],
  },
  {
    id: 'core_beliefs',
    term: 'Core Beliefs & Schemas',
    category: 'framework',
    oneLiner: 'Deeply ingrained, absolute assumptions about yourself, others, and the world.',
    definition:
      'Underlying templates formed early in life or through repeated experiences (e.g., "I am defective", "Others are untrustworthy"). They act as mental filters that selectively highlight confirming data and discard contradictions.',
    clinicalExample:
      '"No matter what I achieve, I am fundamentally inadequate and will eventually be exposed as an imposter."',
    antidoteScript:
      'Build a Core Belief Positive Evidence Log. Record daily factual counter-evidence that contradicts the rigid schema, however small.',
    relatedIds: ['mentalfilter', 'discounting', 'labelling'],
  },
  {
    id: 'cognitive_restructuring',
    term: 'Cognitive Restructuring',
    category: 'framework',
    oneLiner: 'The systematic practice of identifying, questioning, and calibrating distorted thinking.',
    definition:
      'The primary cognitive tool in CBT: stepping back from distressing thoughts, identifying cognitive traps, gathering counter-evidence, and forming a balanced, realistic alternative explanation.',
    clinicalExample:
      '"I stumbled during the Q&A, my career is finished." ➔ Calibrated: "I struggled on one technical question, but answered the rest clearly. This is a normal growth area."',
    antidoteScript:
      'Execute the 3-Question Reality Check: 1) What is the factual proof? 2) What is the most realistic alternative explanation? 3) What would I tell a close friend?',
    relatedIds: ['automatic_thoughts', 'cbt_triangle', 'catastrophe'],
  },
  {
    id: 'opposite_action',
    term: 'Opposite Action',
    category: 'framework',
    oneLiner: 'Deliberately acting contrary to an unhelpful emotional urge to break a feedback loop.',
    definition:
      'A clinical skill from DBT and CBT: when an emotion generates an unhelpful urge (e.g., anxiety urges avoidance, shame urges hiding, depression urges withdrawal), taking the exact opposite physical action signals safety to the autonomic nervous system.',
    clinicalExample:
      'Feeling acute social anxiety and having the urge to cancel plans, but attending for 15 minutes and greeting two colleagues instead.',
    antidoteScript:
      'Apply the 5-Minute Rule: Commit to opposite physical behavior for exactly 5 minutes. Action down-regulates the amygdala faster than mental reasoning.',
    relatedIds: ['behavioral_activation', 'exposure_habituation', 'cbt_triangle'],
  },
  {
    id: 'behavioral_activation',
    term: 'Behavioral Activation',
    category: 'framework',
    oneLiner: 'Systematically engaging in values-aligned, rewarding activities to counter inertia.',
    definition:
      'A structured therapeutic approach where you schedule and initiate activities that provide a sense of mastery or pleasure, breaking the cycle where inaction breeds hopelessness.',
    clinicalExample:
      '"I have no energy to clean or go for a walk, so I\'ll stay in bed all day." ➔ Scheduling a 10-minute walk by the clock regardless of current mood.',
    antidoteScript:
      'Action precedes motivation. Schedule activities by the clock, not by your feelings. Track mood before and after to collect objective proof of valence improvement.',
    relatedIds: ['opposite_action', 'cbt_triangle', 'allnothing'],
  },
  {
    id: 'exposure_habituation',
    term: 'Exposure & Habituation',
    category: 'framework',
    oneLiner: 'Gradually and safely confronting feared triggers to extinguish the false threat alarm.',
    definition:
      'Repeated, systematic contact with a feared situation, sensation, or thought without resorting to avoidance or safety behaviors, allowing the nervous system\'s alarm to naturally de-escalate (habituation).',
    clinicalExample:
      'Fear of public speaking: Starting by asking one question in a small meeting, progressing to presenting a slide deck to the executive team.',
    antidoteScript:
      'Construct a Fear Hierarchy (1–10 difficulty ladder). Climb one rung at a time, remaining in the situation until physiological arousal drops by 50%.',
    relatedIds: ['catastrophe', 'opposite_action', 'cbt_triangle'],
  },
  {
    id: 'friend_test',
    term: 'The Friend Test (Decentering)',
    category: 'framework',
    oneLiner: 'Evaluating your self-talk through the lens of what you would say to someone you care about.',
    definition:
      'A decentering and self-compassion tool that bypasses harsh self-critical bias by prompting you to imagine a close friend presenting the identical situation and thought.',
    clinicalExample:
      'Thinking: "I\'m an absolute idiot for making that typo." ➔ Friend perspective: "I would tell my friend it\'s a minor error anyone makes, not a measure of their intelligence."',
    antidoteScript:
      'Whenever self-criticism flares, ask out loud: "Would I ever speak these exact words to a friend I respect and care for?" Adopt that exact compassionate tone.',
    relatedIds: ['labelling', 'should', 'personalization'],
  },

  // ── COGNITIVE DISTORTIONS (16) ───────────────────────────────
  {
    id: 'should',
    term: 'Should Statements',
    category: 'distortion',
    oneLiner: 'Expecting reality, yourself, or others to obey rigid internal rules.',
    definition:
      'Holding yourself or others to absolute, unnegotiated standards using "must", "should", or "ought". When reality diverges, it generates intense guilt, resentment, and anger.',
    clinicalExample:
      '"I should have finished this already; I am completely lazy." or "They must reply immediately or they don\'t respect me."',
    antidoteScript:
      'Trade obligations for preferences: Replace "I must" or "They should" with "I would prefer to" or "It would be helpful if." Recognize that expectations are not universal laws.',
    relatedIds: ['allnothing', 'fallacy_fairness', 'blame'],
  },
  {
    id: 'allnothing',
    term: 'All-or-Nothing Thinking',
    category: 'distortion',
    oneLiner: 'Viewing performance, situations, or identity in binary black-or-white extremes.',
    definition:
      'Collapsing complex spectrums into pass/fail dichotomies. If something falls short of 100% perfection, it is treated as a 0% total failure.',
    clinicalExample:
      '"I ate one slice of pizza; my entire diet is completely ruined so I might as well give up."',
    antidoteScript:
      'Find the shades of gray: Rate the outcome on a continuous 0–100% dial. Remind yourself that a 10% setback still preserves 90% of your progress.',
    relatedIds: ['should', 'labelling', 'catastrophe'],
  },
  {
    id: 'catastrophe',
    term: 'Catastrophizing',
    category: 'distortion',
    oneLiner: 'Inflating minor uncertainties or setbacks into worst-case disasters.',
    definition:
      'Taking an ambiguous signal or minor problem and predicting the most catastrophic possible outcome, while vastly underestimating your resilience and coping capacity.',
    clinicalExample:
      '"My manager asked for a quick sync; I am definitely getting fired and losing my apartment."',
    antidoteScript:
      'Map the 3 Probabilities: 1) What is the worst case? 2) What is the best case? 3) What is the realistic, boring, ordinary middle outcome?',
    relatedIds: ['fortunetelling', 'mindreading', 'exposure_habituation'],
  },
  {
    id: 'mindreading',
    term: 'Mind Reading',
    category: 'distortion',
    oneLiner: 'Assuming you know what others are thinking without objective proof.',
    definition:
      'Believing you can perceive other people\'s unspoken negative judgments, motives, or evaluations, and treating your subjective assumption as an established fact.',
    clinicalExample:
      '"She looked away while I was speaking — she clearly thinks I don\'t know what I\'m talking about."',
    antidoteScript:
      'Ask for evidence: "Am I telepathic?" Generate two non-personal alternative explanations (e.g. they were distracted, tired, or checking a notification).',
    relatedIds: ['catastrophe', 'personalization', 'jumpconclusions'],
  },
  {
    id: 'fortunetelling',
    term: 'Fortune Telling',
    category: 'distortion',
    oneLiner: 'Predicting a negative future outcome as if it were a guaranteed certainty.',
    definition:
      'Forecasting failure, embarrassment, or rejection with 100% confidence, then adjusting your present behavior (usually through avoidance) to match the unproven prediction.',
    clinicalExample:
      '"There is no point applying for this opportunity; they will definitely reject my application."',
    antidoteScript:
      'Design a Behavioral Experiment: Treat the prediction as an unverified hypothesis. Take the action and gather real empirical data.',
    relatedIds: ['catastrophe', 'mindreading', 'exposure_habituation'],
  },
  {
    id: 'emotional',
    term: 'Emotional Reasoning',
    category: 'distortion',
    oneLiner: 'Treating subjective feelings as undeniable factual proof of reality.',
    definition:
      'Assuming that visceral emotional states reflect the objective nature of the world: "I feel terrified, therefore I am in danger" or "I feel inadequate, therefore I am incompetent."',
    clinicalExample:
      '"I feel overwhelming dread about this flight, which proves flying is inherently dangerous."',
    antidoteScript:
      'State the emotional split: "I feel anxious right now, but feelings are neurochemical sensations, not radar scanners of objective fact."',
    relatedIds: ['cbt_triangle', 'catastrophe', 'automatic_thoughts'],
  },
  {
    id: 'overgen',
    term: 'Overgeneralization',
    category: 'distortion',
    oneLiner: 'Extending a single negative incident into an immutable, universal law.',
    definition:
      'Taking a single isolated event (like a rejection or mistake) and applying sweeping terms like "always", "never", or "everyone" to describe your entire life trajectory.',
    clinicalExample:
      '"I was turned down for this client. I will never succeed in this industry."',
    antidoteScript:
      'Bound the event to its actual borders: Replace "never" and "always" with "this time" or "in this specific instance today."',
    relatedIds: ['allnothing', 'mentalfilter', 'labelling'],
  },
  {
    id: 'personalization',
    term: 'Personalization',
    category: 'distortion',
    oneLiner: 'Taking excessive, exclusive blame for external events outside your control.',
    definition:
      'Believing that you are the sole causal agent of negative outcomes or other people\'s emotional reactions, ignoring all systemic and external contributing factors.',
    clinicalExample:
      '"The project launch was delayed; it\'s completely my fault because I\'m a terrible lead."',
    antidoteScript:
      'Draw a Responsibility Pie Chart: List every external factor (timeline, resources, market, other contributors) and allocate realistic percentages to each.',
    relatedIds: ['blame', 'friend_test', 'mindreading'],
  },
  {
    id: 'mentalfilter',
    term: 'Mental Filter (Negative Filtering)',
    category: 'distortion',
    oneLiner: 'Fixating exclusively on one flaw while filtering out all positive context.',
    definition:
      'Selecting a single negative detail from an otherwise balanced or positive situation and dwelling on it exclusively, letting it discolor the entire experience.',
    clinicalExample:
      '"Nine people praised the report, but one questioned a figure; the whole presentation was a complete disaster."',
    antidoteScript:
      'Run a Full-Picture Audit: Write down the positive and negative data points side by side to force balanced cognitive appraisal.',
    relatedIds: ['discounting', 'magnification', 'overgen'],
  },
  {
    id: 'discounting',
    term: 'Discounting the Positive',
    category: 'distortion',
    oneLiner: 'Dismissing genuine successes or compliments as flukes that "don\'t count."',
    definition:
      'Actively transforming positive experiences into neutral or negative data points ("They were just being polite", "Anyone could do that") to maintain a negative schema.',
    clinicalExample:
      '"I received a promotion, but only because nobody else was available for the position."',
    antidoteScript:
      'Double-Standard Test: If a colleague received that exact recognition, would you dismiss it as meaningless? Accept positive evidence with a simple "Thank you."',
    relatedIds: ['mentalfilter', 'core_beliefs', 'labelling'],
  },
  {
    id: 'labelling',
    term: 'Labelling & Mislabelling',
    category: 'distortion',
    oneLiner: 'Assigning fixed, global identity verdicts to yourself or others based on isolated acts.',
    definition:
      'Instead of describing a specific error ("I made a calculation mistake"), attaching an absolute character verdict ("I am a complete failure").',
    clinicalExample:
      '"I forgot the appointment. I am a completely useless and unreliable human being."',
    antidoteScript:
      'Separate the actor from the action: Use behavioral descriptions ("I forgot this appointment") instead of character assassinations ("I am unreliable").',
    relatedIds: ['allnothing', 'core_beliefs', 'friend_test'],
  },
  {
    id: 'magnification',
    term: 'Magnification & Minimization',
    category: 'distortion',
    oneLiner: 'Blowing mistakes out of proportion while shrinking personal strengths.',
    definition:
      'Looking through binoculars from both ends: enlarging errors and perceived flaws until they fill the screen, while minimizing competencies and accomplishments to near-zero.',
    clinicalExample:
      '"My minor typo cost us 5 minutes (catastrophe!), but building the entire backend was nothing special."',
    antidoteScript:
      'Use Equal Units of Measurement: Measure mistakes and successes with the exact same objective yardstick.',
    relatedIds: ['catastrophe', 'mentalfilter', 'allnothing'],
  },
  {
    id: 'jumpconclusions',
    term: 'Jumping to Conclusions',
    category: 'distortion',
    oneLiner: 'Making rapid, unverified negative interpretations with zero corroborating facts.',
    definition:
      'An umbrella distortion covering both Mind Reading and Fortune Telling: leaping from a neutral observation directly to a negative conclusion without pausing for facts.',
    clinicalExample:
      '"My friend hasn\'t replied in 2 hours; they are definitely furious with me."',
    antidoteScript:
      'Slow the inference chain: Write: "The neutral fact is ____. The leap I made is ____. Alternate reasons include ____."',
    relatedIds: ['mindreading', 'fortunetelling', 'automatic_thoughts'],
  },
  {
    id: 'blame',
    term: 'Blame & Externalization',
    category: 'distortion',
    oneLiner: 'Holding others wholly responsible for your emotional states and reactions.',
    definition:
      'The inverse of Personalization: attributing 100% of your distress to external people or circumstances, while disowning your own cognitive interpretation and behavioral agency.',
    clinicalExample:
      '"My coworker makes me feel completely hopeless and infuriated every single day."',
    antidoteScript:
      'Reclaim your levers: Acknowledge that while external behavior is outside your control, your interpretation and chosen boundaries belong to you.',
    relatedIds: ['personalization', 'cbt_triangle', 'should'],
  },
  {
    id: 'fallacy_fairness',
    term: 'Fallacy of Fairness',
    category: 'distortion',
    oneLiner: 'Demanding that life and people operate according to your personal standard of fairness.',
    definition:
      'Believing that the universe or other people must adhere to a strict standard of fairness, generating chronic bitterness and resentment when life is asymmetrical.',
    clinicalExample:
      '"I covered their shift last month; it\'s unfair that they didn\'t cover mine when I asked."',
    antidoteScript:
      'Trade fairness for agency: Shift focus from "Is this fair?" to "What is the pragmatic, boundary-respecting next step I can take right now?"',
    relatedIds: ['should', 'blame', 'heavenreward'],
  },
  {
    id: 'heavenreward',
    term: 'Heaven\'s Reward Fallacy',
    category: 'distortion',
    oneLiner: 'Believing that silent self-sacrifice will automatically be recognized and rewarded.',
    definition:
      'Expecting that suffering in silence, self-denial, or martyrdom will produce eventual praise, and experiencing deep bitterness when nobody notices.',
    clinicalExample:
      '"I stayed late every night this week without complaining; nobody even acknowledged it."',
    antidoteScript:
      'Make covert contracts overt: Ask for what you need directly. Never engage in self-sacrifice expecting unspoken dividends.',
    relatedIds: ['fallacy_fairness', 'should', 'personalization'],
  },
];

// ============================================================
// SUB-COMPONENT: Single Accordion Card with Cross-Linking
// ============================================================
interface AccordionCardProps {
  item: GlossaryItem;
  isExpanded: boolean;
  isHighlighted: boolean;
  onToggle: () => void;
  onNavigateToRelated: (relatedId: string) => void;
}

function AccordionCard({
  item,
  isExpanded,
  isHighlighted,
  onToggle,
  onNavigateToRelated,
}: AccordionCardProps) {
  const isFramework = item.category === 'framework';

  return (
    <div
      id={`glossary-${item.id}`}
      className={`w-full transition-all duration-300 scroll-mt-24 ${
        isHighlighted
          ? 'bg-white border-2 border-indigo-500 rounded-2xl p-5 transition-all shadow-md ring-4 ring-indigo-100'
          : 'bg-white border border-slate-200 rounded-2xl p-5 transition-all shadow-sm'
      }`}
    >
      {/* Clickable Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex justify-between items-start gap-3 cursor-pointer bg-white"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={
                isFramework
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider'
              }
            >
              {isFramework ? '🧠 Core Framework' : '⚡ Thinking Trap'}
            </span>
          </div>

          <h4 className="text-lg font-bold text-slate-900 font-sans tracking-tight">
            {item.term}
          </h4>

          {!isExpanded && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-1 font-sans">
              {item.oneLiner}
            </p>
          )}
        </div>

        <span
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors select-none shrink-0"
        >
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 animate-fadeIn">
          {/* 1. Plain English Definition */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <span>📖</span> Plain-English Definition
            </span>
            <p className="text-base text-slate-700 leading-relaxed">
              {item.definition}
            </p>
          </div>

          {/* 2. Real-World Pattern ("What It Sounds Like") */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 my-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <span>🗣️</span> What It Sounds Like Inside Your Head
            </span>
            <p className="text-base italic text-slate-800 leading-relaxed font-sans">
              {item.clinicalExample}
            </p>
          </div>

          {/* 3. Actionable CBT Antidote Script */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 my-3">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <span>🛡️</span> Actionable CBT Antidote Script
            </span>
            <p className="text-base font-medium text-emerald-950 leading-relaxed">
              {item.antidoteScript}
            </p>
          </div>

          {/* 4. Related Concepts & Interventions (Cross-Reference Bar) */}
          {item.relatedIds && item.relatedIds.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 mt-4">
                <span>🔗</span> Related Concepts & Interventions
              </span>
              <div className="flex flex-wrap gap-2">
                {item.relatedIds.map((relId) => {
                  const relItem = GLOSSARY_ITEMS.find((g) => g.id === relId);
                  if (!relItem) return null;
                  const isRelFramework = relItem.category === 'framework';
                  return (
                    <button
                      key={relId}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToRelated(relId);
                      }}
                      className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{isRelFramework ? '🧠' : '⚡'}</span>
                      <span>{relItem.term}</span>
                      <span className="text-[10px] text-slate-400">→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CbtGlossary() {
  const [expandedId, setExpandedId] = useState<string | null>('cbt_triangle');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter terms by category and search term
  const filteredItems = useMemo(() => {
    return GLOSSARY_ITEMS.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' ? true : item.category === activeCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        item.term.toLowerCase().includes(q) ||
        item.oneLiner.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        item.clinicalExample.toLowerCase().includes(q) ||
        item.antidoteScript.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  // Counts for taxonomy tabs
  const totalCount = GLOSSARY_ITEMS.length;
  const frameworkCount = GLOSSARY_ITEMS.filter((i) => i.category === 'framework').length;
  const distortionCount = GLOSSARY_ITEMS.filter((i) => i.category === 'distortion').length;

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Cross-link navigation handler: opens target card, ensures it is in view, highlights it
  function handleNavigateToRelated(relatedId: string) {
    const targetItem = GLOSSARY_ITEMS.find((i) => i.id === relatedId);
    if (!targetItem) return;

    // If current category filter would hide the target, switch category to 'all' or target's category
    if (activeCategory !== 'all' && activeCategory !== targetItem.category) {
      setActiveCategory('all');
    }

    // Clear search if it would hide the target
    setSearchQuery('');

    // Expand the item
    setExpandedId(relatedId);

    // Highlight the item
    setHighlightedId(relatedId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2500);

    // Scroll into view
    setTimeout(() => {
      const el = document.getElementById(`glossary-${relatedId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

  return (
    <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-center mb-10">

      {/* Header */}
      <div className="text-center mb-6">
        <span className="bg-violet-50 text-violet-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
          CBT Encyclopedia & Taxonomy
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5 mb-1.5">
          CBT Concept & Distortion Glossary
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg mx-auto">
          Explore core cognitive frameworks and thinking traps. Expand any concept to reveal clinical definitions, real-world patterns, and cross-linked antidotes.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div className="w-full flex rounded-2xl border border-slate-200/80 p-1.5 bg-slate-100 gap-1 mb-4">
        {(
          [
            ['all', `All (${totalCount})`],
            ['framework', `🧠 Frameworks (${frameworkCount})`],
            ['distortion', `⚡ Traps (${distortionCount})`],
          ] as [CategoryFilter, string][]
        ).map(([cat, label]) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="w-full mb-5">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts, definitions, or symptoms..."
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Accordion Cards List */}
      <div className="w-full space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <AccordionCard
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              isHighlighted={highlightedId === item.id}
              onToggle={() => toggle(item.id)}
              onNavigateToRelated={handleNavigateToRelated}
            />
          ))
        ) : (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
            <p className="text-sm font-bold text-slate-600">No concepts found matching "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
            >
              Clear search & filters
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
