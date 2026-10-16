'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function WelcomeModal() {
  const { isWelcomeModalOpen, acceptDisclaimer, handleSignOut } = useAuth();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  if (!isWelcomeModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-disclaimer-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col p-6 sm:p-8 space-y-5 animate-scaleUp">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">🛡️</span>
          <div>
            <h3 id="welcome-disclaimer-title" className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome to Momentum
            </h3>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Self-Guided Cognitive Training
            </span>
          </div>
        </div>

        <div className="space-y-3.5 text-sm leading-relaxed">
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              ⚕️ Clinical Boundary
            </span>
            <p className="text-slate-700 font-medium text-xs sm:text-sm">
              Momentum is a self-guided educational and journaling tool based on Cognitive Behavioral Therapy (CBT) principles. It is not intended to diagnose, treat, or replace professional mental health care or medical advice.
            </p>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900 block">
              🔒 Privacy Guarantee
            </span>
            <p className="text-emerald-950 font-medium text-xs sm:text-sm">
              100% of your thoughts, reflections, and habit logs remain encrypted in your device&apos;s local storage. Your reflections are never transmitted to external servers or used to train public AI models.
            </p>
          </div>

          <label className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 h-5 w-5 accent-emerald-600 cursor-pointer shrink-0"
            />
            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
              I understand that Momentum is a self-help tool and not a substitute for clinical medical care.
            </span>
          </label>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={!hasAcknowledged}
            onClick={() => acceptDisclaimer()}
            className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            Accept &amp; Enter Momentum
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium transition-colors bg-transparent border-0 cursor-pointer"
            >
              Cancel &amp; Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
