'use client';

/**
 * SSR-safe Resilience Points Engine
 * Point values:
 *  - Daily Habit completed          => +5 pts
 *  - High-Discomfort Action (1-10)  => 10 + (discomfort * 2) pts
 *  - Journal Thought Record saved   => +25 pts
 *  - Closed Loop / Reality Check    => +40 pts
 */

import { useState, useEffect } from 'react';

export const POINTS_KEY = 'momentum_resilience_points';

export const POINT_VALUES = {
  DAILY_HABIT: 5,
  JOURNAL_THOUGHT_RECORD: 25,
  CLOSED_LOOP: 40,
  highDiscomfortAction: (discomfort: number) =>
    10 + Math.round(Math.max(1, Math.min(10, discomfort)) * 2),
} as const;

function readPoints(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(POINTS_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  } catch {
    return 0;
  }
}

function writePoints(total: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POINTS_KEY, String(Math.max(0, total)));
  } catch { /* silently ignore */ }
}

/**
 * Award points. Strictly cumulative — never decrements.
 * Returns the new total.
 */
export function awardPoints(amount: number): number {
  const current = readPoints();
  const next = current + Math.max(0, amount);
  writePoints(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('momentum_points_updated', { detail: next }));
  }
  return next;
}

/**
 * Get current total without modifying. Returns 0 during SSR.
 */
export function getPoints(): number {
  return readPoints();
}

/**
 * useResiliencePoints()
 *
 * SSR-safe hook — returns { points, awardPoints, isLoaded }.
 * points = 0 during SSR to prevent hydration mismatches.
 * isLoaded flips to true after mount once real value is read.
 */
export function useResiliencePoints() {
  const [points, setPoints] = useState<number>(0); // 0 on server
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setPoints(readPoints());
    setIsLoaded(true);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === 'number') {
        setPoints(customEvent.detail);
      } else {
        setPoints(readPoints());
      }
    };

    window.addEventListener('momentum_points_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('momentum_points_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const award = (amount: number) => {
    const next = awardPoints(amount);
    setPoints(next);
    return next;
  };

  return { points, awardPoints: award, isLoaded };
}

