'use client';

import React, { useState } from 'react';

// ============================================================
// TYPES & DATA STRUCTURES
// ============================================================
type NodeKey = 'thoughts' | 'feelings' | 'behaviors';
type ScenarioKey = 'overwhelm' | 'relationships' | 'uncertainty';
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

const NODE_DEEP_DIVE: Record<NodeKey, { title: string; subtitle: string; tag: string; tagColor: string; description: string; clinicalRule: string }> = {
  thoughts: {
    title: '💭 Thoughts & Automatic Stories',
    subtitle: 'Cognitive Restructuring Lever',
    tag: '🟢 Controllable Lever',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Automatic thoughts fire within milliseconds. They are threat hypotheses generated by your pattern-matching brain, not literal facts.',
    clinicalRule: 'The CBT Rule: Never accept an automatic thought at face value. Test it with evidence, alternative explanations, and the friend test.',
  },
  feelings: {
    title: '❤️ Involuntary Feelings & Physical Sensations',
    subtitle: 'Somatic & Neurochemical Output',
    tag: '⚠️ Involuntary Output',
    tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Visceral responses (racing heart, muscle tension, dread) are produced by the autonomic nervous system before conscious thought.',
    clinicalRule: 'The CBT Rule: You cannot force a feeling to stop by willpower. Feelings change when you intervene at Thoughts or Behaviors.',
  },
  behaviors: {
    title: '🏃 Behaviors & Reactive Patterns',
    subtitle: 'Opposite Action Lever',
    tag: '🟢 Controllable Lever',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Avoidance, procrastination, and reassurance-seeking provide temporary relief but reinforce the threat loop in the long term.',
    clinicalRule: 'The CBT Rule: Behavior is your strongest lever. Taking a 5-minute opposite action sends undeniable sensory proof of safety.',
  },
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CbtTriangleSandbox() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('overwhelm');
  const [selectedNode, setSelectedNode] = useState<NodeKey>('thoughts');
  const [activeStep, setActiveStep] = useState<StepNumber>(1);

  const scenario = SCENARIOS[selectedScenario];
  const currentStage = scenario.stages[activeStep];
  const nodeInfo = NODE_DEEP_DIVE[selectedNode];

  // Visual edge highlights based on current active step
  const isThoughtActive = currentStage.nodeFocus === 'thoughts' || currentStage.nodeFocus === 'breaker' || selectedNode === 'thoughts';
  const isFeelingActive = currentStage.nodeFocus === 'feelings' || currentStage.nodeFocus === 'breaker' || selectedNode === 'feelings';
  const isBehaviorActive = currentStage.nodeFocus === 'behaviors' || currentStage.nodeFocus === 'breaker' || selectedNode === 'behaviors';

  const leftLineHighlight = activeStep === 2 || activeStep === 3 || activeStep === 5;
  const rightLineHighlight = activeStep === 2 || activeStep === 4 || activeStep === 5;
  const bottomLineHighlight = activeStep === 3 || activeStep === 4 || activeStep === 5;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 shadow-sm p-3 sm:p-6 flex flex-col gap-5 sm:gap-6">

      {/* ── Header ── */}
      <div className="text-center">
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

      {/* ── Scenario Selector ── */}
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
          Choose a Real-World Scenario
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => {
            const sc = SCENARIOS[key];
            const isSelected = selectedScenario === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
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
      </div>

      {/* ── Responsive SVG Triangle (viewBox 0 0 400 360, max-w-[360px]) ── */}
      <div className="w-full max-w-[360px] mx-auto relative bg-slate-50/70 border border-slate-200/80 rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 400 360"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto select-none block"
        >
          {/* Connecting Lines */}
          {/* Left Edge: Thoughts (200, 55) to Feelings (75, 255) */}
          <line
            x1="180"
            y1="87"
            x2="95"
            y2="223"
            stroke={leftLineHighlight ? (activeStep === 5 ? '#10b981' : '#3b82f6') : '#cbd5e1'}
            strokeWidth={leftLineHighlight ? '3.5' : '2'}
            strokeDasharray={leftLineHighlight ? 'none' : '4 4'}
            className="transition-all duration-300"
          />

          {/* Right Edge: Thoughts (200, 55) to Behaviors (325, 255) */}
          <line
            x1="220"
            y1="87"
            x2="305"
            y2="223"
            stroke={rightLineHighlight ? (activeStep === 5 ? '#10b981' : '#10b981') : '#cbd5e1'}
            strokeWidth={rightLineHighlight ? '3.5' : '2'}
            strokeDasharray={rightLineHighlight ? 'none' : '4 4'}
            className="transition-all duration-300"
          />

          {/* Bottom Edge: Feelings (75, 255) to Behaviors (325, 255) */}
          <line
            x1="113"
            y1="255"
            x2="287"
            y2="255"
            stroke={bottomLineHighlight ? (activeStep === 5 ? '#10b981' : '#f59e0b') : '#cbd5e1'}
            strokeWidth={bottomLineHighlight ? '3.5' : '2'}
            strokeDasharray={bottomLineHighlight ? 'none' : '4 4'}
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
              r="38"
              fill={isThoughtActive ? '#3b82f6' : '#ffffff'}
              stroke={isThoughtActive ? '#2563eb' : '#cbd5e1'}
              strokeWidth={isThoughtActive ? '3.5' : '2'}
              className="transition-all duration-200 drop-shadow-sm group-hover:scale-105"
            />
            <text x="200" y="50" textAnchor="middle" fontSize="17" fill={isThoughtActive ? '#ffffff' : '#334155'}>
              💭
            </text>
            <text x="200" y="66" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={isThoughtActive ? '#ffffff' : '#1e293b'}>
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
              r="38"
              fill={isFeelingActive ? '#f59e0b' : '#ffffff'}
              stroke={isFeelingActive ? '#d97706' : '#cbd5e1'}
              strokeWidth={isFeelingActive ? '3.5' : '2'}
              className="transition-all duration-200 drop-shadow-sm group-hover:scale-105"
            />
            <text x="75" y="250" textAnchor="middle" fontSize="17" fill={isFeelingActive ? '#ffffff' : '#334155'}>
              ❤️
            </text>
            <text x="75" y="266" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={isFeelingActive ? '#ffffff' : '#1e293b'}>
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
              r="38"
              fill={isBehaviorActive ? '#10b981' : '#ffffff'}
              stroke={isBehaviorActive ? '#059669' : '#cbd5e1'}
              strokeWidth={isBehaviorActive ? '3.5' : '2'}
              className="transition-all duration-200 drop-shadow-sm group-hover:scale-105"
            />
            <text x="325" y="250" textAnchor="middle" fontSize="17" fill={isBehaviorActive ? '#ffffff' : '#334155'}>
              🏃
            </text>
            <text x="325" y="266" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={isBehaviorActive ? '#ffffff' : '#1e293b'}>
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
          <span className="text-xs font-bold text-slate-400">
            {scenario.label}
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
