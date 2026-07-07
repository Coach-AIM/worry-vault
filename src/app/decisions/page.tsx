'use client';

import React, { useState } from 'react';

export default function DecisionContextCheck() {
  // Explicitly track separate state strings for each question group
  const [feeling, setFeeling] = useState<string | null>(null);
  const [valuesAlign, setValuesAlign] = useState<string | null>(null);
  const [pressure, setPressure] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<string | null>(null);

  // Dynamic CSS injector to guarantee immediate color transformation on selection
  const checkStyle = (currentValue: string | null, targetValue: string) => {
    return currentValue === targetValue
      ? "flex-1 min-w-[100px] px-5 py-4 text-base font-bold rounded-2xl border-2 transition-all duration-150 bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100 scale-[1.02]"
      : "flex-1 min-w-[100px] px-5 py-4 text-base font-medium rounded-2xl border transition-all duration-150 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300";
  };

  return (
    <div className="max-w-3xl mx-auto my-8 p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100 space-y-8">
      
      {/* Question 1 */}
      <div className="space-y-3">
        <label className="block text-xl font-bold text-slate-900">How will I likely feel about this choice in 6 months?</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Proud', 'Indifferent', 'Regretful', 'Unknown'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFeeling(item)}
              className={checkStyle(feeling, item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Question 2 */}
      <div className="space-y-3">
        <label className="block text-xl font-bold text-slate-900">Does this option align with my core values?</label>
        <div className="grid grid-cols-3 gap-3">
          {['Yes', 'No', 'Unsure'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setValuesAlign(item)}
              className={checkStyle(valuesAlign, item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Questions 3 & 4 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-4">
          <p className="font-bold text-slate-900 text-lg">Is there external pressure?</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPressure('YES')} className={checkStyle(pressure, 'YES')}>YES</button>
            <button type="button" onClick={() => setPressure('NO')} className={checkStyle(pressure, 'NO')}>NO</button>
          </div>
        </div>

        <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-4">
          <p className="font-bold text-slate-900 text-lg">Am I making assumptions?</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setAssumptions('YES')} className={checkStyle(assumptions, 'YES')}>YES</button>
            <button type="button" onClick={() => setAssumptions('NO')} className={checkStyle(assumptions, 'NO')}>NO</button>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-8">
        <button type="button" className="px-6 py-3 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
          ← Back
        </button>
        <button type="button" className="px-6 py-3 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition">
          Next Option →
        </button>
      </div>

    </div>
  );
}
