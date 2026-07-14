"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRandomQuote, QuoteItem } from "@/utils/perspectiveQuotes";

export default function Home() {
  const [isEvening, setIsEvening] = useState(false);
  const [quote, setQuote] = useState<QuoteItem | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    const evening = hour >= 17; // 5:00 PM Logic
    setIsEvening(evening);
    setQuote(getRandomQuote(evening));
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 overflow-y-auto px-4 pt-8 pb-48 flex flex-col items-center">
      
      {/* Symmetrically Spaced Centered Feed Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Momentum</h1>
        <p className="text-lg text-slate-600 mt-2 font-medium">Small, gentle steps forward.</p>
      </div>

      {/* Vertically Distributed Cards Stack */}
      <div className="w-full max-w-2xl flex flex-col gap-8 sm:gap-10 items-center justify-center my-auto">
        
        {/* Evening Reflection Card (Only rendered if isEvening is true) */}
        {isEvening && (
          <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-l-4 border-l-amber-500 border-slate-200/60 flex flex-col items-center text-center">
            <span className="text-3xl mb-2 animate-bounce">🌙</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Evening Reflection
            </h2>
            <p className="text-base sm:text-lg text-slate-800 font-normal leading-relaxed max-w-xl mb-6">
              Ready to release today's worries and plan a restful tomorrow?
            </p>
            <Link
              href="/reflect"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold tracking-wide py-3.5 px-8 rounded-xl transition-all shadow-md text-base sm:text-lg block text-center w-full max-w-[320px]"
            >
              Start Reflection
            </Link>
          </div>
        )}

        {/* 1. CBT Journal Card */}
        <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">📝 CBT Journal & Reflections</h2>
          <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed max-w-xl mb-6">
            Process distressing moments with our guided 5-step CBT Thought Record wizard to challenge thinking traps, or log positive victories to anchor and savor your strengths.
          </p>
          <Link
            href="/journal"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold tracking-wide py-3.5 px-8 rounded-xl transition-all shadow-md text-base sm:text-lg block text-center w-full max-w-[320px]"
          >
            ✍️ Open Guided Journal
          </Link>
        </div>

        {/* 2. Perspective Quote Card */}
        <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Perspective</h2>
          <span className="text-4xl text-slate-300 font-serif leading-none">“</span>
          <p className="text-2xl sm:text-3xl font-bold italic text-slate-900 tracking-wide leading-relaxed px-4 -mt-2 mb-4">
            {quote ? quote.text : "Loading..."}
          </p>
          <span className="text-xs sm:text-sm font-extrabold tracking-widest text-slate-500 uppercase">
            — {quote ? quote.author : "CBT"}
          </span>
        </div>

        {/* 3. Today's Focus Mini-Planner Card */}
        <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Today's Focus</h2>
          <p className="text-base sm:text-lg text-slate-600 font-medium mb-6">Small daily habits build long-term momentum.</p>
          
          {/* Real Checkbox Elements */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-base sm:text-lg font-bold text-slate-800 mb-6">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked readOnly className="rounded border-slate-300 text-emerald-600 h-5 w-5 accent-emerald-600" />
              <span>Meditate</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded border-slate-300 text-slate-300 h-5 w-5" />
              <span>Read</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" disabled className="rounded border-slate-300 text-slate-300 h-5 w-5" />
              <span>Walk</span>
            </div>
          </div>

          <Link
            href="/tasks"
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-base font-semibold text-slate-800 rounded-xl transition-colors block text-center"
          >
            Open Full Action Planner
          </Link>
        </div>

      </div>
    </div>
  );
}
