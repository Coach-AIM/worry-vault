'use client';

import React, { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

const TRAPS = [
  'Catastrophizing', 'Mind Reading', 'All-or-Nothing', 'Should Statements',
  'Overgeneralization', 'Emotional Reasoning', 'Labelling', 'Personalization',
] as const;
type Trap = (typeof TRAPS)[number];

interface EmotionProfile {
  name: string; color: string;
  scores: Record<Trap, number>;
  description: string;
}

const EMOTIONS: EmotionProfile[] = [
  {
    name: 'Anxiety / Fear', color: '#6366f1',
    description: 'Anxiety primes the brain to scan for threats, tightly coupling it to Catastrophizing and Mind Reading. The anxious brain treats worst-case predictions as facts and social ambiguity as rejection.',
    scores: { 'Catastrophizing':9,'Mind Reading':8,'All-or-Nothing':4,'Should Statements':3,'Overgeneralization':4,'Emotional Reasoning':9,'Labelling':3,'Personalization':5 },
  },
  {
    name: 'Anger', color: '#f43f5e',
    description: 'Anger reflects should violations -- the world is not meeting internal rules. It strongly activates Should Statements, Labelling of others as bad people, and Overgeneralization into fixed patterns.',
    scores: { 'Catastrophizing':5,'Mind Reading':6,'All-or-Nothing':7,'Should Statements':9,'Overgeneralization':8,'Emotional Reasoning':8,'Labelling':9,'Personalization':4 },
  },
  {
    name: 'Sadness', color: '#3b82f6',
    description: 'Sadness fuels globally negative self-referential thinking. Overgeneralization, Labelling, and All-or-Nothing are the primary traps, turning single setbacks into permanent identity statements.',
    scores: { 'Catastrophizing':6,'Mind Reading':4,'All-or-Nothing':8,'Should Statements':4,'Overgeneralization':9,'Emotional Reasoning':7,'Labelling':8,'Personalization':6 },
  },
  {
    name: 'Guilt / Shame', color: '#8b5cf6',
    description: 'The most self-directed states. They maximally activate Should Statements, Personalization, and Labelling while strongly amplifying Emotional Reasoning. Shame uniquely makes distortions feel like objective truths.',
    scores: { 'Catastrophizing':3,'Mind Reading':3,'All-or-Nothing':5,'Should Statements':9,'Overgeneralization':5,'Emotional Reasoning':8,'Labelling':9,'Personalization':9 },
  },
  {
    name: 'High-Activation Joy', color: '#f59e0b',
    description: 'Positive high-activation states show very low distortion coupling overall. Mild links include Catastrophizing in anticipation of the joy ending, and occasional Emotional Reasoning about unrealistic positivity.',
    scores: { 'Catastrophizing':2,'Mind Reading':3,'All-or-Nothing':2,'Should Statements':2,'Overgeneralization':2,'Emotional Reasoning':4,'Labelling':2,'Personalization':2 },
  },
  {
    name: 'Surprise / Confusion', color: '#06b6d4',
    description: 'Surprise activates Mind Reading as the brain tries to interpret unexpected events by projecting internal narratives onto others. It creates conditions for snap negative judgments.',
    scores: { 'Catastrophizing':5,'Mind Reading':7,'All-or-Nothing':4,'Should Statements':3,'Overgeneralization':3,'Emotional Reasoning':5,'Labelling':3,'Personalization':4 },
  },
  {
    name: 'Low-Activation Joy', color: '#10b981',
    description: 'Contentment and calm show the lowest distortion coupling of any emotional state. Slight links to Emotional Reasoning appear but are typically benign in this positive valence.',
    scores: { 'Catastrophizing':1,'Mind Reading':2,'All-or-Nothing':1,'Should Statements':1,'Overgeneralization':1,'Emotional Reasoning':2,'Labelling':1,'Personalization':1 },
  },
];

const TRAP_NOTES: Record<Trap, { headline: string; body: string; emotions: string[] }> = {
  'Catastrophizing': {
    headline: 'Catastrophizing -- Amplified by Anxiety',
    body: 'Takes a real or imagined threat and inflates it to the worst possible outcome. Anxiety supercharges this trap because the anxious brain is already in active threat-scanning mode, making disasters feel not just possible but inevitable.',
    emotions: ['Anxiety / Fear', 'Sadness', 'Surprise / Confusion'],
  },
  'Mind Reading': {
    headline: 'Mind Reading -- Fuelled by Anxiety & Anger',
    body: 'The assumption that you know what others are thinking, almost always negatively. Anxiety drives it through social threat-scanning; anger drives it through the expectation that others are acting with hostile intent.',
    emotions: ['Anxiety / Fear', 'Anger', 'Surprise / Confusion'],
  },
  'All-or-Nothing': {
    headline: 'All-or-Nothing -- Linked to Sadness & Anger',
    body: 'Binary thinking that collapses the spectrum into pass/fail. Sadness pulls everything into the failure bin; anger triggers it when situations violate rigid expectations -- making disappointments feel like disasters.',
    emotions: ['Sadness', 'Anger'],
  },
  'Should Statements': {
    headline: 'Should Statements -- Guilt & Anger Engine',
    body: 'Rigid internal rules generating guilt when you break them, anger when others do, and anxiety when you fear breaking them. The most moralistic distortion, closely tied to the emotion of feeling wronged or falling short.',
    emotions: ['Guilt / Shame', 'Anger'],
  },
  'Overgeneralization': {
    headline: 'Overgeneralization -- Sadness & Anger Pattern',
    body: 'One negative event becomes a universal rule. Sadness generates the nothing-ever-works narrative; anger generates they-always-do-this. Both emotions provide momentum to extend a single data point into a life-defining pattern.',
    emotions: ['Sadness', 'Anger'],
  },
  'Emotional Reasoning': {
    headline: 'Emotional Reasoning -- Cross-Emotion Trap',
    body: 'Treating feelings as facts. This trap couples strongly to almost all negative emotions because it is the meta-mechanism: I feel anxious, therefore I am in danger. It is what makes all other distortions feel objectively true.',
    emotions: ['Anxiety / Fear', 'Anger', 'Sadness', 'Guilt / Shame'],
  },
  'Labelling': {
    headline: 'Labelling -- Shame, Anger & Sadness',
    body: 'Collapsing a person identity to a single negative attribute. Shame drives self-labelling; anger drives other-labelling; sadness makes global negative labels feel like permanent, immovable truths.',
    emotions: ['Guilt / Shame', 'Anger', 'Sadness'],
  },
  'Personalization': {
    headline: 'Personalization -- Guilt & Anxiety',
    body: 'Taking excessive personal responsibility for external events. Guilt directly feeds it; anxiety extends it through hypervigilance about one impact on others. It is the trap that makes unrelated events feel like your fault.',
    emotions: ['Guilt / Shame', 'Anxiety / Fear'],
  },
};

const MAX_SELECTED = 3;

function buildRadarData(selected: string[]): Record<string, number | string>[] {
  return TRAPS.map((trap) => {
    const row: Record<string, number | string> = { trap };
    for (const name of selected) {
      const em = EMOTIONS.find((e) => e.name === name);
      row[name] = em ? em.scores[trap] : 0;
    }
    return row;
  });
}

export default function EmotionTrapMap() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<string[]>(['Anxiety / Fear', 'Guilt / Shame']);
  const [activeTrap, setActiveTrap] = useState<Trap | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function toggleEmotion(name: string) {
    if (selected.includes(name)) {
      setSelected((prev) => prev.filter((n) => n !== name));
    } else if (selected.length < MAX_SELECTED) {
      setSelected((prev) => [...prev, name]);
    }
  }

  const data = buildRadarData(selected);

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 sm:p-8 flex flex-col gap-6">

      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Emotion &rarr; Thinking Trap Map
        </h3>
        <p className="text-slate-500 mt-1 text-sm sm:text-base font-medium">
          Toggle up to 3 emotions to see which cognitive distortions they activate. Tap any axis label for a clinical breakdown.
        </p>
      </div>

      {/* Emotion toggle pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {EMOTIONS.map((em) => {
          const active = selected.includes(em.name);
          const disabled = !active && selected.length >= MAX_SELECTED;
          return (
            <button
              key={em.name}
              type="button"
              onClick={() => toggleEmotion(em.name)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150"
              style={{
                backgroundColor: active ? em.color : '#f1f5f9',
                color: active ? '#fff' : disabled ? '#cbd5e1' : '#475569',
                border: `2px solid ${active ? em.color : 'transparent'}`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
              }}
            >
              {em.name}
            </button>
          );
        })}
      </div>

      {/* Radar chart */}
      <div>
        {mounted ? (
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="trap"
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const isActive = activeTrap === payload.value;
                  return (
                    <text
                      x={x} y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={11}
                      fontWeight={isActive ? 700 : 500}
                      fill={isActive ? '#2563eb' : '#475569'}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setActiveTrap(isActive ? null : payload.value as Trap)}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
              {selected.map((name) => {
                const em = EMOTIONS.find((e) => e.name === name)!;
                return (
                  <Radar
                    key={name} name={name} dataKey={name}
                    stroke={em.color} fill={em.color} fillOpacity={0.18} strokeWidth={2}
                  />
                );
              })}
              <Tooltip
                formatter={(v: any, n: any) => [`${Number(v)}/10`, String(n ?? '')]}
                contentStyle={{ borderRadius: '10px', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}
              />
              {selected.length > 1 && <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />}
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-[360px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-400">
            Loading radar map...
          </div>
        )}
      </div>

      {!activeTrap && (
        <p className="text-center text-xs text-slate-400 -mt-2">
          Tap any axis label above to see the clinical link between that trap and its trigger emotions.
        </p>
      )}

      {/* Trap detail card */}
      {activeTrap && (() => {
        const note = TRAP_NOTES[activeTrap];
        return (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5 relative">
            <button
              type="button"
              onClick={() => setActiveTrap(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xl leading-none"
            >
              &times;
            </button>
            <strong className="block text-slate-900 text-sm sm:text-base mb-1">{note.headline}</strong>
            <p className="text-slate-600 text-sm leading-relaxed mb-3">{note.body}</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">Peak in:</span>
              {note.emotions.map((emName) => {
                const p = EMOTIONS.find((e) => e.name === emName);
                return (
                  <span key={emName} className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: p?.color ?? '#94a3b8' }}>
                    {emName}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Single-emotion description card */}
      {selected.length === 1 && (() => {
        const em = EMOTIONS.find((e) => e.name === selected[0])!;
        return (
          <div className="rounded-2xl border p-4 sm:p-5"
            style={{ borderColor: em.color + '40', backgroundColor: em.color + '0d' }}>
            <strong className="block text-sm mb-1" style={{ color: em.color }}>
              Why does {em.name} activate these traps?
            </strong>
            <p className="text-slate-600 text-sm leading-relaxed">{em.description}</p>
          </div>
        );
      })()}
    </div>
  );
}
