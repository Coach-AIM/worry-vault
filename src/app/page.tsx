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
    <div className="animate-fade-in pb-40 flex flex-col items-center justify-center min-h-[80vh] gap-y-8 sm:gap-y-12 py-10 w-full max-w-3xl mx-auto">
      <header className="text-center mb-6">
        <h1
          style={{
            fontSize: "3.5rem",
            color: "var(--sage-green)",
            marginBottom: "0.25rem",
            fontWeight: 700,
            letterSpacing: "-1px",
          }}
        >
          Momentum
        </h1>
        <p
          style={{
            fontSize: "1.15rem",
            color: "hsl(200, 10%, 50%)",
            fontWeight: 500,
          }}
        >
          Small, gentle steps forward.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
        
        {/* Evening Reflection Card (Only rendered if isEvening is true) */}
        {isEvening && (
          <div className="card-glass flex flex-col items-center justify-center text-center p-8 w-full border-l-4 border-amber-500 rounded-3xl shadow-[0_4px_15px_rgba(92,127,102,0.04)]">
            <span className="text-3xl mb-2">🌙</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Evening Reflection
            </h2>
            <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed max-w-xl mx-auto mb-6">
              Ready to release today's worries and plan a restful tomorrow?
            </p>
            <Link
              href="/reflect"
              className="btn-primary text-base sm:text-lg font-semibold tracking-wide py-3.5 px-8 rounded-2xl transition-all shadow-md block text-center w-full max-w-[320px] bg-amber-500 hover:bg-amber-600 text-white"
              style={{ border: "none" }}
            >
              Start Reflection
            </Link>
          </div>
        )}

        {/* PRIMARY FUNCTION: CBT Journal Card */}
        <section className="card-premium flex flex-col items-center justify-center text-center p-8 w-full border-t-4 border-emerald-500">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3 flex items-center justify-center gap-2">
            📝 CBT Journal & Reflections
          </h2>
          <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed max-w-xl mx-auto mb-6">
            Process distressing moments with our guided 5-step CBT Thought
            Record wizard to challenge thinking traps, or log positive victories
            to anchor and savor your strengths.
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", alignItems: "center" }}
          >
            <Link
              href="/journal"
              className="btn-primary text-base sm:text-lg font-semibold tracking-wide py-3.5 px-8 rounded-2xl transition-all shadow-md block text-center w-full max-w-[320px]"
            >
              ✍️ Open Guided Journal
            </Link>
          </div>
        </section>

        {/* Context-Aware Quote Deck */}
        {quote && (
          <section className="card-premium flex flex-col items-center justify-center text-center p-8 w-full">
            {/* Perspective Header */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Perspective
            </h2>
            
            <span style={{ fontSize: "3rem", color: "var(--sage-green)", opacity: 0.3, display: "block", height: "1.5rem", lineHeight: 0.5 }}>“</span>
            <p className="text-2xl sm:text-3xl font-bold italic text-slate-900 tracking-wide leading-relaxed my-6 px-4 max-w-xl mx-auto">
              {quote.text}
            </p>
            <span className="text-xs sm:text-sm font-extrabold tracking-widest text-slate-500 uppercase mt-2">
              — {quote.author}
            </span>
          </section>
        )}

        {/* Centered Mini-Planner Card */}
        <div className="card-premium flex flex-col items-center justify-center text-center p-8 w-full">
          {/* Centered Title */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            Today's Focus
          </h2>
          <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed max-w-xl mx-auto mb-6">
            Small daily habits build long-term momentum.
          </p>

          {/* Compact Tasks Grid/Flex */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-base sm:text-lg font-semibold text-slate-700 my-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked readOnly className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-5 w-5" />
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

          {/* Centered Primary Action Button */}
          <Link href="/tasks" className="mt-4 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 rounded-xl transition-colors">
            Open Full Action Planner
          </Link>
        </div>

        {/* Spacing safeguard to push content completely above the fixed navigation bar */}
        <div className="h-32 w-full" />
      </div>
    </div>
  );
}
