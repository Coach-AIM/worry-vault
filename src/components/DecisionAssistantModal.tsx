'use client';

import React, { useState, useEffect } from 'react';
import { safeGetJSON, safeSetJSON } from '@/utils/storage';

export interface ProConItem {
  id: string;
  text: string;
  weight: number; // 1 to 5
  type: 'pro' | 'con';
}

export interface DecisionOption {
  id: string;
  label: string;
  alignsValues: 'Yes' | 'Unsure' | 'No';
  lifeImprovement: 'Significantly' | 'Neutral' | 'Unlikely';
  prosCons: ProConItem[];
  score?: number;
}

export interface SavedDecision {
  id: string;
  timestamp: string;
  dilemma: string;
  options: DecisionOption[];
  verdict: string;
  winnerLabel?: string;
  decisionNote: string;
}

interface DecisionAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function createDefaultOption(index: number): DecisionOption {
  return {
    id: `opt_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    label: '',
    alignsValues: 'Unsure',
    lifeImprovement: 'Neutral',
    prosCons: []
  };
}

export default function DecisionAssistantModal({ isOpen, onClose }: DecisionAssistantModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dilemma, setDilemma] = useState('');
  
  // Multi-option state (default 2 options, supports up to 5)
  const [options, setOptions] = useState<DecisionOption[]>([
    createDefaultOption(0),
    createDefaultOption(1)
  ]);

  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);

  // Quick factor input state for Step 2
  const [factorText, setFactorText] = useState('');
  const [factorWeight, setFactorWeight] = useState<number>(3);
  
  // Inline Factor Editing state for Step 2
  const [editingFactorId, setEditingFactorId] = useState<string | null>(null);

  // Step 3 Decision Note & Feedback
  const [decisionNote, setDecisionNote] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Option Score Calculation
  function calculateOptionScore(opt: DecisionOption): number {
    let score = 0;
    
    // 1. Core values alignment (+2 / 0 / -2)
    if (opt.alignsValues === 'Yes') score += 2;
    if (opt.alignsValues === 'No') score -= 2;

    // 2. Life improvement (+3 / 0 / -3)
    if (opt.lifeImprovement === 'Significantly') score += 3;
    if (opt.lifeImprovement === 'Unlikely') score -= 3;

    // 3. Weighted Pros and Cons
    opt.prosCons.forEach(item => {
      if (item.type === 'pro') score += item.weight;
      else score -= item.weight;
    });

    return score;
  }

  // Option helper getters
  function getOptionLabel(opt: DecisionOption, index: number): string {
    const letter = String.fromCharCode(65 + index);
    return opt.label.trim() || `Option ${letter}`;
  }

  // --- Step 1 Handlers ---
  function handleAddOption() {
    if (options.length >= 5) return;
    setOptions(prev => [...prev, createDefaultOption(prev.length)]);
  }

  function handleRemoveOption(indexToRemove: number) {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (currentOptionIndex >= options.length - 1) {
      setCurrentOptionIndex(Math.max(0, options.length - 2));
    }
  }

  function handleOptionLabelChange(index: number, newLabel: string) {
    setOptions(prev => prev.map((opt, idx) => {
      if (idx === index) {
        return { ...opt, label: newLabel };
      }
      return opt;
    }));
  }

  // --- Step 2 Handlers ---
  const currentOption = options[currentOptionIndex] || options[0];
  const currentScore = calculateOptionScore(currentOption);

  function handleAddFactor(type: 'pro' | 'con') {
    if (!factorText.trim()) return;
    const newItem: ProConItem = {
      id: `factor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: factorText.trim(),
      weight: factorWeight,
      type
    };

    setOptions(prev => prev.map((opt, idx) => {
      if (idx === currentOptionIndex) {
        return { ...opt, prosCons: [...opt.prosCons, newItem] };
      }
      return opt;
    }));

    setFactorText('');
  }

  function handleRemoveFactor(factorId: string) {
    if (editingFactorId === factorId) {
      setEditingFactorId(null);
    }
    setOptions(prev => prev.map((opt, idx) => {
      if (idx === currentOptionIndex) {
        return { ...opt, prosCons: opt.prosCons.filter(item => item.id !== factorId) };
      }
      return opt;
    }));
  }

  function handleUpdateFactorType(factorId: string, newType: 'pro' | 'con') {
    setOptions(prev => prev.map((opt, idx) => {
      if (idx === currentOptionIndex) {
        return {
          ...opt,
          prosCons: opt.prosCons.map(f => f.id === factorId ? { ...f, type: newType } : f)
        };
      }
      return opt;
    }));
  }

  function handleUpdateFactorWeight(factorId: string, newWeight: number) {
    setOptions(prev => prev.map((opt, idx) => {
      if (idx === currentOptionIndex) {
        return {
          ...opt,
          prosCons: opt.prosCons.map(f => f.id === factorId ? { ...f, weight: newWeight } : f)
        };
      }
      return opt;
    }));
  }

  function handleSetCoreValues(value: 'Yes' | 'Unsure' | 'No') {
    setOptions(prev => prev.map((opt, idx) => {
      if (idx === currentOptionIndex) {
        return { ...opt, alignsValues: value };
      }
      return opt;
    }));
  }

  function handleSetLifeImprovement(value: 'Significantly' | 'Neutral' | 'Unlikely') {
    setOptions(prev => prev.map((opt, idx) => {
      if (idx === currentOptionIndex) {
        return { ...opt, lifeImprovement: value };
      }
      return opt;
    }));
  }

  // --- Step 3 Summary & Ranking ---
  const scoredOptions = options.map((opt, index) => ({
    ...opt,
    resolvedLabel: getOptionLabel(opt, index),
    originalIndex: index,
    score: calculateOptionScore(opt),
    prosWeight: opt.prosCons.filter(i => i.type === 'pro').reduce((sum, i) => sum + i.weight, 0),
    consWeight: opt.prosCons.filter(i => i.type === 'con').reduce((sum, i) => sum + i.weight, 0),
    prosCount: opt.prosCons.filter(i => i.type === 'pro').length,
    consCount: opt.prosCons.filter(i => i.type === 'con').length,
  }));

  // Sort from highest score to lowest score
  const rankedOptions = [...scoredOptions].sort((a, b) => b.score - a.score);
  const highestScore = rankedOptions.length > 0 ? rankedOptions[0].score : 0;
  const topWinners = rankedOptions.filter(o => o.score === highestScore);
  const isTie = topWinners.length > 1;

  function getVerdictSummary(): { winnerText: string; description: string } {
    if (isTie) {
      const tiedLabels = topWinners.map(w => `"${w.resolvedLabel}"`).join(' and ');
      return {
        winnerText: 'Equal Balance (Tie)',
        description: `Both ${tiedLabels} share the highest calculated score (${highestScore > 0 ? `+${highestScore}` : highestScore} pts). Consider which core personal values or long-term commitments take higher priority.`
      };
    }
    const winner = rankedOptions[0];
    return {
      winnerText: `${winner.resolvedLabel} Favored`,
      description: `"${winner.resolvedLabel}" holds the strongest positive balance (${winner.score > 0 ? `+${winner.score}` : winner.score} pts) with optimal values alignment, life improvement, and weighted pros.`
    };
  }

  function handleSaveDecision() {
    const verdict = getVerdictSummary();
    const newRecord: SavedDecision = {
      id: `dec_${Date.now()}`,
      timestamp: new Date().toISOString(),
      dilemma: dilemma.trim(),
      options: scoredOptions,
      verdict: verdict.description,
      winnerLabel: isTie ? 'Tie' : rankedOptions[0]?.resolvedLabel,
      decisionNote: decisionNote.trim()
    };

    const existing = safeGetJSON<SavedDecision[]>('momentum_decisions', []);
    const updated = [newRecord, ...existing];
    safeSetJSON('momentum_decisions', updated);

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3500);
  }

  function handleReset() {
    setStep(1);
    setDilemma('');
    setOptions([
      createDefaultOption(0),
      createDefaultOption(1)
    ]);
    setCurrentOptionIndex(0);
    setFactorText('');
    setEditingFactorId(null);
    setDecisionNote('');
    setSaveSuccess(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h2 id="decision-modal-title" className="text-xl font-extrabold text-slate-900">
                Decision Assistant
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Step {step} of 3 • {step === 1 ? 'Frame Dilemma & Options' : step === 2 ? 'Weigh Options & Pros/Cons' : 'Ranked Summary & Verdict'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xl font-bold cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 space-y-6">

          {/* STEP 1: Input Dilemma & Multi-Options */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  What choice or dilemma are you facing?
                </label>
                <textarea
                  value={dilemma}
                  onChange={(e) => setDilemma(e.target.value)}
                  placeholder="e.g. Should I accept the new job offer, stay at my current company, or start freelance consulting?"
                  rows={3}
                  className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-800 font-medium text-sm sm:text-base outline-none resize-none transition-all"
                />
              </div>

              {/* Dynamic Multi-Option Inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-800">
                    Define Options to Weigh ({options.length} of 5 max)
                  </label>
                  <span className="text-xs font-medium text-slate-500">
                    Enter labels for each choice
                  </span>
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const placeholder = `Option ${letter}`;
                    const canDelete = options.length > 2 && idx >= 2;

                    return (
                      <div key={opt.id} className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400 select-none">
                            {letter}.
                          </span>
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => handleOptionLabelChange(idx, e.target.value)}
                            placeholder={placeholder}
                            className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-800 font-medium text-sm outline-none transition-all"
                          />
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-colors font-bold text-sm cursor-pointer"
                            aria-label={`Remove Option ${letter}`}
                            title={`Remove Option ${letter}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    <span>＋</span>
                    <span>Add Another Option</span>
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (dilemma.trim()) {
                      setCurrentOptionIndex(0);
                      setStep(2);
                    }
                  }}
                  disabled={!dilemma.trim() || options.length < 2}
                  className="min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                >
                  Continue to Options & Pros/Cons →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Chunked Evaluation with Fixed Active Tab Styling & Inline Factor Editor */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Dilemma Header Recap */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Dilemma</span>
                <p className="text-sm font-semibold text-slate-800">{dilemma}</p>
              </div>

              {/* Option Switcher Tabs with Fixed Active Tab Styling */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Select Option to Evaluate ({currentOptionIndex + 1} of {options.length}):
                </span>
                <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/90 rounded-2xl">
                  {options.map((opt, idx) => {
                    const optScore = calculateOptionScore(opt);
                    const isTabActive = currentOptionIndex === idx;
                    const label = getOptionLabel(opt, idx);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setCurrentOptionIndex(idx);
                          setEditingFactorId(null);
                        }}
                        className={`min-h-[44px] py-2 px-3.5 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 min-w-[120px] ${
                          isTabActive
                            ? 'bg-slate-900 text-white font-bold shadow-sm ring-2 ring-slate-900'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                          isTabActive
                            ? optScore >= 0 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                            : optScore >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {optScore > 0 ? `+${optScore}` : optScore}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Option Form Card */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    Evaluating: <span className="text-blue-700">{getOptionLabel(currentOption, currentOptionIndex)}</span>
                  </h3>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                    currentScore > 0 ? 'bg-emerald-100 text-emerald-800' : currentScore < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    Net Score: {currentScore > 0 ? `+${currentScore}` : currentScore}
                  </span>
                </div>

                {/* 1. Core Values Alignment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    1. Aligns with your core personal values?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Yes', 'Unsure', 'No'] as const).map((val) => {
                      const isSelected = currentOption.alignsValues === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleSetCoreValues(val)}
                          className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm border transition-all cursor-pointer ${
                            isSelected
                              ? val === 'Yes'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold ring-2 ring-emerald-600/30'
                                : val === 'No'
                                ? 'bg-rose-600 border-rose-600 text-white shadow-sm font-bold ring-2 ring-rose-600/30'
                                : 'bg-slate-700 border-slate-700 text-white shadow-sm font-bold ring-2 ring-slate-700/30'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          {val === 'Yes' ? '✅ Yes (+2)' : val === 'No' ? '❌ No (-2)' : '🤔 Unsure (0)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Life Improvement (Updated Prompt) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    2. Will this choice improve your life?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Significantly', 'Neutral', 'Unlikely'] as const).map((imp) => {
                      const isSelected = currentOption.lifeImprovement === imp;
                      return (
                        <button
                          key={imp}
                          type="button"
                          onClick={() => handleSetLifeImprovement(imp)}
                          className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm border transition-all cursor-pointer ${
                            isSelected
                              ? imp === 'Significantly'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold ring-2 ring-blue-600/30'
                                : imp === 'Unlikely'
                                ? 'bg-amber-600 border-amber-600 text-white shadow-sm font-bold ring-2 ring-amber-600/30'
                                : 'bg-slate-700 border-slate-700 text-white shadow-sm font-bold ring-2 ring-slate-700/30'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          {imp === 'Significantly' ? '🌟 Significantly (+3)' : imp === 'Unlikely' ? '⚠️ Unlikely (-3)' : '😐 Neutral (0)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Weighted Pros & Cons (Quick 1-Click Input & Inline Pencil Editor) */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      3. Weighted Pros &amp; Cons for {getOptionLabel(currentOption, currentOptionIndex)}
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      1-click quick factor entry
                    </span>
                  </div>
                  
                  <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={factorText}
                        onChange={(e) => setFactorText(e.target.value)}
                        placeholder="e.g. Higher growth opportunities, high upfront cost..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFactor('pro');
                          }
                        }}
                        className="flex-1 p-2.5 rounded-xl border border-slate-300 focus:border-blue-600 bg-white text-sm text-slate-800 outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Weight Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500">Weight (1-5):</span>
                        {[1, 2, 3, 4, 5].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setFactorWeight(w)}
                            className={`min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg font-bold transition-all cursor-pointer ${
                              factorWeight === w
                                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>

                      {/* Quick 1-Click Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddFactor('pro')}
                          disabled={!factorText.trim()}
                          className="min-h-[38px] px-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <span>👍</span>
                          <span>+ Pro (+{factorWeight})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddFactor('con')}
                          disabled={!factorText.trim()}
                          className="min-h-[38px] px-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <span>👎</span>
                          <span>- Con (-{factorWeight})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of factors for current option with Inline ✏️ Pencil Weight Editor */}
                  <div className="space-y-2 mt-2 max-h-56 overflow-y-auto pr-1">
                    {currentOption.prosCons.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        No pros or cons added yet for this option. Add one above.
                      </p>
                    ) : (
                      currentOption.prosCons.map((item) => {
                        const isEditing = editingFactorId === item.id;
                        return (
                          <div key={item.id} className="space-y-1.5">
                            <div
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                                item.type === 'pro'
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span>{item.type === 'pro' ? '👍' : '👎'}</span>
                                <span className="flex-1 font-semibold truncate">{item.text}</span>
                                <span className={`px-2 py-0.5 rounded-md font-bold text-xs whitespace-nowrap ${
                                  item.type === 'pro' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                                }`}>
                                  {item.type === 'pro' ? `+${item.weight}` : `-${item.weight}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingFactorId(isEditing ? null : item.id)}
                                  className={`min-w-[34px] min-h-[34px] flex items-center justify-center text-sm cursor-pointer rounded-lg transition-colors ${
                                    isEditing
                                      ? 'bg-slate-900 text-white shadow-sm'
                                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                                  }`}
                                  aria-label="Edit factor weight and type"
                                  title="Edit factor weight & type"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFactor(item.id)}
                                  className="min-w-[34px] min-h-[34px] flex items-center justify-center text-slate-400 hover:text-rose-600 text-sm cursor-pointer rounded-lg hover:bg-white/80 transition-colors"
                                  aria-label="Remove item"
                                  title="Delete factor"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            {/* Inline Factor Editor Popover */}
                            {isEditing && (
                              <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-sm space-y-2.5 animate-fadeIn">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                  <span>Edit Factor: &ldquo;{item.text}&rdquo;</span>
                                  <span className="text-[11px] font-semibold text-blue-600">Recalibrates score instantly</span>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
                                  {/* Toggle Pro / Con */}
                                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateFactorType(item.id, 'pro')}
                                      className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                                        item.type === 'pro'
                                          ? 'bg-emerald-600 text-white shadow-sm'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      👍 Pro (+)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateFactorType(item.id, 'con')}
                                      className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                                        item.type === 'con'
                                          ? 'bg-rose-600 text-white shadow-sm'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      👎 Con (-)
                                    </button>
                                  </div>

                                  {/* Adjust Weight (1 to 5) */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-600">Weight:</span>
                                    {[1, 2, 3, 4, 5].map((w) => (
                                      <button
                                        key={w}
                                        type="button"
                                        onClick={() => handleUpdateFactorWeight(item.id, w)}
                                        className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg font-bold transition-all cursor-pointer ${
                                          item.weight === w
                                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                      >
                                        {w}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Done Button */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingFactorId(null)}
                                    className="min-h-[32px] px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-all shadow-sm cursor-pointer ml-auto"
                                  >
                                    ✓ Done
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Score Readout Summary for Active Option */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-bold text-slate-600">
                    Net Calculated Score for {getOptionLabel(currentOption, currentOptionIndex)}:
                  </span>
                  <span className={`font-black px-3 py-1 rounded-xl text-sm ${
                    currentScore > 0 ? 'bg-emerald-100 text-emerald-800' : currentScore < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {currentScore > 0 ? `+${currentScore}` : currentScore} pts
                  </span>
                </div>
              </div>

              {/* Navigation Footer for Step 2 */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFactorId(null);
                    if (currentOptionIndex > 0) {
                      setCurrentOptionIndex(currentOptionIndex - 1);
                    } else {
                      setStep(1);
                    }
                  }}
                  className="min-h-[44px] px-5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
                >
                  ← {currentOptionIndex > 0 ? 'Previous Option' : 'Back to Dilemma'}
                </button>

                <div className="flex items-center gap-2">
                  {currentOptionIndex < options.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFactorId(null);
                        setCurrentOptionIndex(currentOptionIndex + 1);
                      }}
                      className="min-h-[44px] px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                    >
                      Next Option ({getOptionLabel(options[currentOptionIndex + 1], currentOptionIndex + 1)}) →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFactorId(null);
                        setStep(3);
                      }}
                      className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-100 cursor-pointer"
                    >
                      Calculate Summary &amp; Verdict →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Summary & Ranked Verdict with High-Contrast Typography & Badges */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Verdict Header Banner */}
              {(() => {
                const verdict = getVerdictSummary();
                return (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-blue-300">
                        ⚖️ Decision Analysis Verdict
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        isTie ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {verdict.winnerText}
                      </span>
                    </div>

                    <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed">
                      {verdict.description}
                    </p>

                    <div className="text-xs text-slate-300 pt-1 border-t border-slate-700/60 flex items-center justify-between">
                      <span>Dilemma: &ldquo;{dilemma}&rdquo;</span>
                      <span>{options.length} options evaluated</span>
                    </div>
                  </div>
                );
              })()}

              {/* Ranked Comparison Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ranked Comparison (Highest to Lowest Score)
                </h3>

                <div className="space-y-3">
                  {rankedOptions.map((opt, rankIdx) => {
                    const isTop = rankIdx === 0;
                    return (
                      <div
                        key={opt.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isTop
                            ? 'bg-blue-50/40 border-blue-200 shadow-sm'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg text-xs font-black ${
                              isTop ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              #{rankIdx + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                                {opt.resolvedLabel}
                              </h4>
                              {isTop && !isTie && (
                                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                                  ★ Top Recommendation
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-base sm:text-lg font-black rounded-xl inline-block ${
                              opt.score > 0
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1'
                                : opt.score < 0
                                ? 'bg-rose-100 text-rose-900 border border-rose-300 font-bold px-3 py-1'
                                : 'bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3 py-1'
                            }`}>
                              {opt.score > 0 ? `+${opt.score}` : opt.score} pts
                            </span>
                          </div>
                        </div>

                        {/* High-Contrast Breakdown Pills with Polished Typography */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-150">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              VALUES ALIGNMENT
                            </span>
                            <span className="font-bold text-sm text-slate-900">
                              {opt.alignsValues === 'Yes' ? '✅ Aligns (+2)' : opt.alignsValues === 'No' ? '❌ Misaligned (-2)' : '🤔 Unsure (0)'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              LIFE IMPROVEMENT
                            </span>
                            <span className="font-bold text-sm text-slate-900">
                              {opt.lifeImprovement === 'Significantly' ? '🌟 Significantly (+3)' : opt.lifeImprovement === 'Unlikely' ? '⚠️ Unlikely (-3)' : '😐 Neutral (0)'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              WEIGHTED FACTORS
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              +{opt.prosWeight} Pros / -{opt.consWeight} Cons
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Personal Decision Note */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800">
                  Personal Decision Note &amp; Next Action Step:
                </label>
                <textarea
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="e.g. Choosing Option A because long-term growth aligns with my family values. Next action: confirm timeline tomorrow morning."
                  rows={3}
                  className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-blue-600 text-slate-800 font-medium text-sm outline-none resize-none transition-all"
                />
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-bold text-center animate-fadeIn">
                  ✅ Decision note saved to your local records!
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    ← Edit Evaluation
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    🔄 Start New
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveDecision}
                    className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                  >
                    💾 Save Decision Note
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
