// ============================================================
// src/utils/valence.ts
//
// Maps a 0–100 mood/stability score to a human-readable label
// plus Tailwind class sets for consistent colour-coding across
// every component that displays mood state.
// ============================================================

/** The five valence bands, ordered from highest to lowest. */
export type ValenceBand =
  | 'Grounded & Thriving'
  | 'Stable & Constructive'
  | 'Neutral Baseline'
  | 'Vulnerable / Tension'
  | 'Acute Distress / Low';

/** Shape returned by getValenceDetails. */
export interface ValenceDetails {
  /** Human-readable band label. */
  label: ValenceBand;
  /** Tailwind text-colour class for the label / score. */
  color: string;
  /** Tailwind bg + border classes for pill / badge containers. */
  badge: string;
}

/**
 * Maps a numeric mood/stability score (0–100) to its valence band.
 *
 * Bands:
 *   ≥ 75  →  Grounded & Thriving    (emerald)
 *   51–74 →  Stable & Constructive  (teal)
 *   50    →  Neutral Baseline       (slate)
 *   25–49 →  Vulnerable / Tension   (amber)
 *   0–24  →  Acute Distress / Low   (rose)
 *
 * @param score  Integer in the range 0–100 (clamped automatically).
 * @returns      ValenceDetails with label, Tailwind color, and badge classes.
 */
export function getValenceDetails(score: number): ValenceDetails {
  const s = Math.max(0, Math.min(100, Math.round(score)));

  if (s >= 75) {
    return {
      label: 'Grounded & Thriving',
      color: 'text-emerald-600',
      badge: 'bg-emerald-50 border-emerald-200',
    };
  }
  if (s > 50) {
    return {
      label: 'Stable & Constructive',
      color: 'text-teal-600',
      badge: 'bg-teal-50 border-teal-200',
    };
  }
  if (s === 50) {
    return {
      label: 'Neutral Baseline',
      color: 'text-slate-600',
      badge: 'bg-slate-50 border-slate-200',
    };
  }
  if (s >= 25) {
    return {
      label: 'Vulnerable / Tension',
      color: 'text-amber-600',
      badge: 'bg-amber-50 border-amber-200',
    };
  }
  return {
    label: 'Acute Distress / Low',
    color: 'text-rose-600',
    badge: 'bg-rose-50 border-rose-200',
  };
}
