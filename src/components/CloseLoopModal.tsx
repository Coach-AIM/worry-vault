'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { awardPoints, POINT_VALUES } from '@/lib/points';

// ── Types ─────────────────────────────────────────────────────

export type AccuracyLevel =
  | 'Completely False / Disproved'
  | 'Partially True'
  | 'Exactly as Feared';

export interface CloseLoopResult {
  outcomeText: string;
  accuracyLevel: AccuracyLevel;
  reliefRating: number;          // 0–10
  predictionEvaluation: string;  // legacy compat label
  completedAt: string;           // ISO timestamp
}

interface CloseLoopModalProps {
  entryId: number;
  situation: string;
  automaticThought: string | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (entryId: number, result: CloseLoopResult) => void;
}

// ── Accuracy card config ───────────────────────────────────────

const ACCURACY_OPTIONS: {
  value: AccuracyLevel;
  label: string;
  emoji: string;
  bg: string;
  border: string;
  color: string;
  predictionEval: string;
}[] = [
  {
    value: 'Completely False / Disproved',
    label: 'Completely False / Disproved',
    emoji: '✅',
    bg: '#f0fdf4',
    border: '#86efac',
    color: '#15803d',
    predictionEval: 'Much better than expected',
  },
  {
    value: 'Partially True',
    label: 'Partially True',
    emoji: '⚖️',
    bg: '#fefce8',
    border: '#fde047',
    color: '#a16207',
    predictionEval: 'As expected',
  },
  {
    value: 'Exactly as Feared',
    label: 'Exactly as Feared',
    emoji: '⚠️',
    bg: '#fff7ed',
    border: '#fdba74',
    color: '#c2410c',
    predictionEval: 'Worse than expected',
  },
];

// ── Main component ────────────────────────────────────────────

export default function CloseLoopModal({
  entryId,
  situation,
  automaticThought,
  isOpen,
  onClose,
  onComplete,
}: CloseLoopModalProps) {
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [outcomeText, setOutcomeText] = useState('');
  const [accuracy, setAccuracy] = useState<AccuracyLevel | null>(null);
  const [reliefRating, setReliefRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);

  // Reset when opened on a different card
  useEffect(() => {
    if (isOpen) {
      setModalStep(1);
      setOutcomeText('');
      setAccuracy(null);
      setReliefRating(5);
      setSubmitting(false);
      setPointsAwarded(null);
    }
  }, [isOpen, entryId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!outcomeText.trim() || !accuracy) return;
    setSubmitting(true);

    const selectedOption = ACCURACY_OPTIONS.find((o) => o.value === accuracy)!;

    const result: CloseLoopResult = {
      outcomeText: outcomeText.trim(),
      accuracyLevel: accuracy,
      reliefRating,
      predictionEvaluation: selectedOption.predictionEval,
      completedAt: new Date().toISOString(),
    };

    // Award +40 pts
    const newTotal = awardPoints(POINT_VALUES.CLOSED_LOOP);
    setPointsAwarded(POINT_VALUES.CLOSED_LOOP);

    // Persist to momentum_journal_entries in localStorage
    try {
      const raw = localStorage.getItem('momentum_journal_entries') ?? '[]';
      const entries = JSON.parse(raw) as any[];
      const updated = entries.map((e: any) =>
        e.id === entryId
          ? {
              ...e,
              outcomeText: result.outcomeText,
              predictionEvaluation: result.predictionEvaluation,
              loopAccuracy: result.accuracyLevel,
              reliefRating: result.reliefRating,
              loopClosedAt: result.completedAt,
            }
          : e,
      );
      localStorage.setItem('momentum_journal_entries', JSON.stringify(updated));
    } catch { /* best-effort */ }

    onComplete(entryId, result);

    // Brief delay so the user sees the success flash
    await new Promise((r) => setTimeout(r, 1600));
    setSubmitting(false);
    onClose();
  }, [outcomeText, accuracy, reliefRating, entryId, onComplete, onClose]);

  if (!isOpen) return null;

  const canAdvanceStep1 = outcomeText.trim().length >= 5;
  const canAdvanceStep2 = accuracy !== null;
  const canSubmit = canAdvanceStep1 && canAdvanceStep2;

  const reliefLabel =
    reliefRating <= 2 ? 'Still Distressed' :
    reliefRating <= 4 ? 'Slightly Relieved' :
    reliefRating <= 6 ? 'Moderately Relieved' :
    reliefRating <= 8 ? 'Mostly Relieved' :
    'Completely Relieved';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          zIndex: 900,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Slide-over drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Close the Loop — Reality Check"
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#fff',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexShrink: 0,
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              🔬 Close the Loop
            </h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Reality-test your original prediction
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              color: '#64748b',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Context strip */}
        <div
          style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            borderLeft: '3px solid #94a3b8',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '0.2rem' }}>
            Original Situation
          </span>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
            {(situation || '').length > 180 ? (situation || '').slice(0, 180) + '…' : (situation || '')}
          </p>
          {automaticThought && (
            <>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginTop: '0.5rem', marginBottom: '0.2rem' }}>
                Automatic Thought
              </span>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{automaticThought.length > 140 ? automaticThought.slice(0, 140) + '…' : automaticThought}"
              </p>
            </>
          )}
        </div>

        {/* Step progress pills */}
        <div style={{ display: 'flex', gap: '0.35rem', margin: '1rem 1.5rem 0', flexShrink: 0 }}>
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '4px',
                backgroundColor: s <= modalStep ? '#3b82f6' : '#e2e8f0',
                transition: 'background-color 0.25s',
              }}
            />
          ))}
        </div>

        {/* Step body */}
        <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>

          {/* ── Step 1: Actual Outcome ─────────────────────── */}
          {modalStep === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                Step 1: What actually happened in reality?
              </label>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.55 }}>
                Describe the actual outcome objectively — what you observed, heard, or experienced.
              </p>
              <textarea
                value={outcomeText}
                onChange={(e) => setOutcomeText(e.target.value)}
                placeholder="E.g., The meeting went ahead normally. My boss was focused on the agenda, not on me specifically."
                rows={5}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                  backgroundColor: '#fafafa',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: 1.6,
                  color: '#0f172a',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>
          )}

          {/* ── Step 2: Prediction Accuracy ───────────────── */}
          {modalStep === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                Step 2: How accurate was your prediction?
              </label>
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.55 }}>
                Compare what you feared would happen against what actually did.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {ACCURACY_OPTIONS.map((opt) => {
                  const isSelected = accuracy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAccuracy(opt.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        padding: '0.9rem 1.1rem',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${opt.border}` : '1.5px solid #e2e8f0',
                        backgroundColor: isSelected ? opt.bg : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? `0 0 0 3px ${opt.border}55` : 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{opt.emoji}</span>
                      <div>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem', color: isSelected ? opt.color : '#334155' }}>
                          {opt.label}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: '0.78rem', color: opt.color, marginTop: '0.1rem', display: 'block' }}>
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Current Relief Rating ─────────────── */}
          {modalStep === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                Step 3: Current Relief Rating
              </label>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.55 }}>
                How relieved or resolved do you feel right now — knowing the actual outcome?
              </p>

              {/* Large numeric display */}
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '3.5rem', fontWeight: 800, color: reliefRating >= 7 ? '#16a34a' : reliefRating >= 4 ? '#d97706' : '#dc2626', lineHeight: 1 }}>
                  {reliefRating}
                </span>
                <span style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 400 }}>/10</span>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                  {reliefLabel}
                </p>
              </div>

              {/* Numeric tap grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem', marginBottom: '1rem' }}>
                {[0,1,2,3,4,5,6,7,8,9,10].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setReliefRating(v)}
                    style={{
                      padding: '0.55rem 0',
                      borderRadius: '10px',
                      border: reliefRating === v ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
                      backgroundColor: reliefRating === v ? '#eff6ff' : '#f8fafc',
                      color: reliefRating === v ? '#1d4ed8' : '#374151',
                      fontWeight: reliefRating === v ? 800 : 500,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                <span>0 = Still Distressed</span>
                <span>10 = Completely Relieved</span>
              </div>

              {/* Summary recap before submit */}
              {accuracy && (
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '0.35rem' }}>
                    Summary
                  </span>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: '#334155' }}>
                    <strong>Outcome:</strong> {outcomeText.slice(0, 80)}{outcomeText.length > 80 ? '…' : ''}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>
                    <strong>Prediction accuracy:</strong> {ACCURACY_OPTIONS.find(o => o.value === accuracy)?.emoji} {accuracy}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Success flash ─────────────────────────────── */}
          {pointsAwarded !== null && (
            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🏆</div>
              <strong style={{ display: 'block', color: '#15803d', fontSize: '1rem' }}>Reality Check Complete!</strong>
              <p style={{ margin: '0.25rem 0 0', color: '#166534', fontSize: '0.88rem' }}>
                +{pointsAwarded} Resilience Points earned
              </p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '0.75rem',
            flexShrink: 0,
            backgroundColor: '#f8fafc',
          }}
        >
          {modalStep > 1 && pointsAwarded === null && (
            <button
              type="button"
              onClick={() => setModalStep((s) => (s - 1) as 1 | 2 | 3)}
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                backgroundColor: '#fff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}

          {modalStep < 3 && pointsAwarded === null && (
            <button
              type="button"
              onClick={() => setModalStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={modalStep === 1 ? !canAdvanceStep1 : !canAdvanceStep2}
              style={{
                flex: 2,
                padding: '0.65rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: (modalStep === 1 ? canAdvanceStep1 : canAdvanceStep2) ? '#3b82f6' : '#e2e8f0',
                color: (modalStep === 1 ? canAdvanceStep1 : canAdvanceStep2) ? '#fff' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: (modalStep === 1 ? canAdvanceStep1 : canAdvanceStep2) ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              Continue →
            </button>
          )}

          {modalStep === 3 && pointsAwarded === null && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              style={{
                flex: 2,
                padding: '0.7rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: canSubmit && !submitting ? '#16a34a' : '#e2e8f0',
                color: canSubmit && !submitting ? '#fff' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              {submitting ? (
                <>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Saving...
                </>
              ) : (
                'Complete Reality Check (+40 pts)'
              )}
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </>
  );
}
