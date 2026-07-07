"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ProCon = {
  text: string;
  weight: number; // 1 to 5
  type: "pro" | "con";
};

type OptionData = {
  label: string;
  predictedFeeling: "Proud" | "Indifferent" | "Regretful" | "Unknown";
  alignsValues: "Yes" | "No" | "Unsure";
  externalPressure: boolean;
  makingAssumptions: boolean;
  prosCons: ProCon[];
};

export default function DecisionsPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [timeframeDays, setTimeframeDays] = useState(30);
  const [options, setOptions] = useState<OptionData[]>([
    {
      label: "", // Starts empty to show placeholder
      predictedFeeling: "Unknown",
      alignsValues: "Unsure",
      externalPressure: false,
      makingAssumptions: false,
      prosCons: []
    },
    {
      label: "", // Starts empty to show placeholder
      predictedFeeling: "Unknown",
      alignsValues: "Unsure",
      externalPressure: false,
      makingAssumptions: false,
      prosCons: []
    }
  ]);
  const [saving, setSaving] = useState(false);
  const [newProConText, setNewProConText] = useState<Record<number, string>>({});
  const [newProConType, setNewProConType] = useState<Record<number, "pro" | "con">>({});

  // Local state variables for Step 2 question group tracking
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [valuesAlign, setValuesAlign] = useState<string | null>(null);
  const [pressure, setPressure] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<string | null>(null);

  // Calculations
  function calculateOptionScore(opt: OptionData): number {
    let score = 0;

    // Values alignment
    if (opt.alignsValues === "Yes") score += 2;
    if (opt.alignsValues === "No") score -= 2;

    // External pressure
    score += opt.externalPressure ? -1 : 1;

    // Assumptions
    score += opt.makingAssumptions ? -1 : 1;

    // Future feeling: Unknown evaluates strictly to 0
    if (opt.predictedFeeling === "Proud") score += 3;
    if (opt.predictedFeeling === "Regretful") score -= 3;
    // Indifferent and Unknown add 0

    // Pros & Cons
    opt.prosCons.forEach((item) => {
      if (item.type === "pro") {
        score += item.weight;
      } else {
        score -= item.weight;
      }
    });

    return score;
  }

  const handleAddOption = () => {
    setOptions([
      ...options,
      {
        label: "",
        predictedFeeling: "Unknown",
        alignsValues: "Unsure",
        externalPressure: false,
        makingAssumptions: false,
        prosCons: []
      }
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionLabelChange = (index: number, val: string) => {
    const updated = options.map((opt, i) => {
      if (i === index) {
        return { ...opt, label: val };
      }
      return opt;
    });
    setOptions(updated);
  };

  const startStep2 = () => {
    if (!title.trim()) {
      alert("Please enter a decision title.");
      return;
    }
    setCurrentOptionIndex(0);
    setFeeling(options[0].predictedFeeling);
    setValuesAlign(options[0].alignsValues);
    setPressure(options[0].externalPressure ? "Yes" : "No");
    setAssumptions(options[0].makingAssumptions ? "Yes" : "No");
    setStep(2);
  };

  const handleNextOption = () => {
    // Save current values to options state
    const updated = options.map((opt, idx) => {
      if (idx === currentOptionIndex) {
        return {
          ...opt,
          predictedFeeling: (feeling as any) || "Unknown",
          alignsValues: (valuesAlign as any) || "Unsure",
          externalPressure: pressure === "Yes",
          makingAssumptions: assumptions === "Yes"
        };
      }
      return opt;
    });
    setOptions(updated);

    if (currentOptionIndex < options.length - 1) {
      const nextIdx = currentOptionIndex + 1;
      setCurrentOptionIndex(nextIdx);
      // Load next option's selections
      setFeeling(updated[nextIdx].predictedFeeling);
      setValuesAlign(updated[nextIdx].alignsValues);
      setPressure(updated[nextIdx].externalPressure ? "Yes" : "No");
      setAssumptions(updated[nextIdx].makingAssumptions ? "Yes" : "No");
    } else {
      setStep(3);
    }
  };

  const handlePrevOption = () => {
    // Save current values to options state
    const updated = options.map((opt, idx) => {
      if (idx === currentOptionIndex) {
        return {
          ...opt,
          predictedFeeling: (feeling as any) || "Unknown",
          alignsValues: (valuesAlign as any) || "Unsure",
          externalPressure: pressure === "Yes",
          makingAssumptions: assumptions === "Yes"
        };
      }
      return opt;
    });
    setOptions(updated);

    if (currentOptionIndex > 0) {
      const prevIdx = currentOptionIndex - 1;
      setCurrentOptionIndex(prevIdx);
      // Load previous option's selections
      setFeeling(updated[prevIdx].predictedFeeling);
      setValuesAlign(updated[prevIdx].alignsValues);
      setPressure(updated[prevIdx].externalPressure ? "Yes" : "No");
      setAssumptions(updated[prevIdx].makingAssumptions ? "Yes" : "No");
    } else {
      setStep(1);
    }
  };

  const handleAddProCon = (index: number) => {
    const text = newProConText[index]?.trim();
    if (!text) return;
    const type = newProConType[index] || "pro";

    const updated = options.map((opt, i) => {
      if (i === index) {
        return {
          ...opt,
          prosCons: [...opt.prosCons, { text, weight: 3, type }]
        };
      }
      return opt;
    });
    setOptions(updated);

    // Reset input
    setNewProConText({ ...newProConText, [index]: "" });
  };

  const handleRemoveProCon = (optIndex: number, pcIndex: number) => {
    const updated = options.map((opt, i) => {
      if (i === optIndex) {
        return {
          ...opt,
          prosCons: opt.prosCons.filter((_, idx) => idx !== pcIndex)
        };
      }
      return opt;
    });
    setOptions(updated);
  };

  const handleWeightChange = (optIndex: number, pcIndex: number, val: number) => {
    const updated = options.map((opt, i) => {
      if (i === optIndex) {
        const newProsCons = opt.prosCons.map((pc, idx) => {
          if (idx === pcIndex) {
            return { ...pc, weight: val };
          }
          return pc;
        });
        return { ...opt, prosCons: newProsCons };
      }
      return opt;
    });
    setOptions(updated);
  };

  async function handleSaveDecision() {
    setSaving(true);
    try {
      const payload = {
        title,
        timeframeDays,
        options: options.map((opt, i) => ({
          label: opt.label.trim() || `Option ${String.fromCharCode(65 + i)}`,
          predictedFeeling: opt.predictedFeeling,
          alignsValues: opt.alignsValues,
          externalPressure: opt.externalPressure,
          makingAssumptions: opt.makingAssumptions,
          netScore: calculateOptionScore(opt)
        }))
      };

      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to save decision");
      }

      alert("Decision successfully saved and tracked!");
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save decision.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 pb-28">
      {/* Back Button and Header */}
      <div className="max-w-3xl mx-auto mb-8 animate-fade-in">
        <button 
          onClick={() => router.push("/")}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 transition mb-6 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🤔</span>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Decision Assistant</h1>
        </div>
        <p className="text-slate-600 text-lg">Challenge biases and make structured, balanced choices.</p>
        <p className="text-blue-600 font-semibold text-sm mt-4 uppercase tracking-wider">Step {step} of 4</p>
      </div>

      {/* STEP 1: SETUP */}
      {step === 1 && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-8 md:p-10 space-y-10 animate-fade-in">
          {/* Question 1 */}
          <div className="space-y-3">
            <label className="block text-2xl font-bold text-slate-900">1. What decision are you facing?</label>
            <input 
              type="text"
              placeholder="e.g., Should I purchase an E-bike?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-4 text-lg border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Question 2 */}
          <div className="space-y-4">
            <label className="block text-2xl font-bold text-slate-900">2. Define your options</label>
            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input 
                    type="text"
                    value={opt.label}
                    onChange={(e) => handleOptionLabelChange(i, e.target.value)}
                    placeholder={i === 0 ? "e.g., Add cliffside hike to the Italy itinerary" : i === 1 ? "e.g., Stick to the valley wine tour" : `Option ${String.fromCharCode(65 + i)}`}
                    className="w-full px-5 py-4 text-lg border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-400"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(i)}
                      className="p-3.5 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors animate-fade-in"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={handleAddOption}
              className="inline-flex items-center justify-center px-5 py-3 font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 mt-2"
            >
              + Add Option
            </button>
          </div>

          {/* Question 3 */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="block text-2xl font-bold text-slate-900">3. Timeframe for Follow-up</label>
            <p className="text-slate-500 text-base">When should Momentum check back on the outcome of this decision?</p>
            <div className="relative max-w-xs">
              <select 
                value={timeframeDays}
                onChange={(e) => setTimeframeDays(parseInt(e.target.value))}
                className="w-full px-5 py-4 text-lg border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none cursor-pointer text-slate-800 font-medium pr-10"
              >
                <option value={7}>1 Week (7 Days)</option>
                <option value={14}>2 Weeks (14 Days)</option>
                <option value={30}>1 Month (30 Days)</option>
                <option value={90}>3 Months (90 Days)</option>
                <option value={180}>6 Months (180 Days)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Setup Footer */}
          <div className="flex justify-end pt-6 border-t border-slate-100">
            <button
              onClick={startStep2}
              className="bg-blue-600 text-white font-bold py-3.5 px-10 rounded-2xl hover:bg-blue-700 hover:scale-[1.01] transition-all shadow-md animate-fade-in"
            >
              Continue &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CONTEXT CHECK */}
      {step === 2 && (
        <div className="space-y-8 animate-fade-in">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-8 md:p-10 space-y-8">
            <h3 className="text-xl font-bold text-blue-600 border-b border-slate-100 pb-3">
              Context Check: {options[currentOptionIndex].label.trim() || `Option ${String.fromCharCode(65 + currentOptionIndex)}`}
            </h3>

            {/* 6 Months Feeling Prompt */}
            <div className="space-y-3">
              <label className="block text-lg font-bold text-slate-800">How will I likely feel about this choice in 6 months?</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["Proud", "Indifferent", "Regretful", "Unknown"] as const).map((f) => {
                  const isSelected = feeling === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFeeling(f)}
                      className={`p-4 rounded-2xl text-sm font-medium transition-all duration-250 ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Values Alignment */}
            <div className="space-y-3">
              <label className="block text-lg font-bold text-slate-800">Does this option align with my core values?</label>
              <div className="grid grid-cols-3 gap-3">
                {(["Yes", "No", "Unsure"] as const).map((v) => {
                  const isSelected = valuesAlign === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setValuesAlign(v)}
                      className={`p-4 rounded-2xl text-sm font-medium transition-all duration-250 ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* External Pressure & Assumptions toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-800 block text-base">Is there external pressure?</span>
                  <span className="text-sm text-slate-500">Feeling forced by others</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPressure("Yes")}
                    className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                      pressure === "Yes"
                        ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setPressure("No")}
                    className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                      pressure === "No"
                        ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-800 block text-base">Am I making assumptions?</span>
                  <span className="text-sm text-slate-500">Deciding without verified facts</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAssumptions("Yes")}
                    className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                      assumptions === "Yes"
                        ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setAssumptions("No")}
                    className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                      assumptions === "No"
                        ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Context Footer */}
          <div className="flex justify-between pt-6 max-w-3xl mx-auto border-t border-slate-200">
            <button
              onClick={handlePrevOption}
              className="bg-slate-100 text-slate-700 font-bold py-3.5 px-10 rounded-2xl hover:bg-slate-200 transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={handleNextOption}
              className="bg-blue-600 text-white font-bold py-3.5 px-10 rounded-2xl hover:bg-blue-700 hover:scale-[1.01] transition-all shadow-md"
            >
              {currentOptionIndex < options.length - 1 ? "Next Option &rarr;" : "Continue &rarr;"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROS & CONS GRID */}
      {step === 3 && (
        <div className="space-y-8 animate-fade-in">
          {options.map((opt, i) => (
            <div key={i} className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-8 md:p-10 space-y-6">
              <h3 className="text-xl font-bold text-blue-600 border-b border-slate-100 pb-3">
                Pros & Cons: {opt.label || `Option ${String.fromCharCode(65 + i)}`}
              </h3>

              {/* Added Items List */}
              {opt.prosCons.length > 0 ? (
                <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                  {opt.prosCons.map((pc, pcIdx) => (
                    <div
                      key={pcIdx}
                      className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border text-sm gap-2 ${
                        pc.type === "pro"
                          ? "bg-emerald-50/50 border-emerald-100"
                          : "bg-red-50/50 border-red-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs font-bold uppercase py-0.5 px-2.5 rounded ${
                            pc.type === "pro"
                              ? "bg-emerald-200 text-emerald-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          {pc.type}
                        </span>
                        <span className="font-semibold text-slate-800 text-base">{pc.text}</span>
                      </div>

                      <div className="flex items-center gap-4 justify-between md:justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Weight:</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={pc.weight}
                            onChange={(e) => handleWeightChange(i, pcIdx, parseInt(e.target.value))}
                            className="w-28 accent-blue-600 cursor-pointer"
                          />
                          <span className="font-bold text-slate-700 w-4 text-center">{pc.weight}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveProCon(i, pcIdx)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold ml-2 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic py-4 text-center">No Pros or Cons added yet. Add one below.</p>
              )}

              {/* Add Pro/Con Row */}
              <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100 mt-3">
                <input
                  type="text"
                  className="flex-1 border border-slate-200 rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="e.g. Save money on fuel/parking"
                  value={newProConText[i] || ""}
                  onChange={(e) => setNewProConText({ ...newProConText, [i]: e.target.value })}
                />
                <div className="relative">
                  <select
                    className="w-full px-5 py-4 text-lg border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none cursor-pointer text-slate-800 font-medium pr-10"
                    value={newProConType[i] || "pro"}
                    onChange={(e) => setNewProConType({ ...newProConType, [i]: e.target.value as "pro" | "con" })}
                  >
                    <option value="pro">Pro (Positive)</option>
                    <option value="con">Con (Negative)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                <button
                  onClick={() => handleAddProCon(i)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base px-7 py-4 rounded-2xl transition-all shadow-md hover:scale-[1.01]"
                >
                  ＋ Add Item
                </button>
              </div>
            </div>
          ))}

          {/* Pros/Cons Footer */}
          <div className="flex justify-between pt-6 max-w-3xl mx-auto border-t border-slate-200">
            <button
              onClick={() => {
                // Initialize context states for the last option before going back
                const lastIdx = options.length - 1;
                setCurrentOptionIndex(lastIdx);
                setFeeling(options[lastIdx].predictedFeeling);
                setValuesAlign(options[lastIdx].alignsValues);
                setPressure(options[lastIdx].externalPressure ? "Yes" : "No");
                setAssumptions(options[lastIdx].makingAssumptions ? "Yes" : "No");
                setStep(2);
              }}
              className="bg-slate-100 text-slate-700 font-bold py-3.5 px-10 rounded-2xl hover:bg-slate-200 transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="bg-blue-600 text-white font-bold py-3.5 px-10 rounded-2xl hover:bg-blue-700 hover:scale-[1.01] transition-all shadow-md"
            >
              Calculate Summary &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUMMARY & SCORE OUTPUT */}
      {step === 4 && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-8 md:p-10 space-y-8 animate-fade-in">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-100 pb-3">
              Decision Analysis: "{title}"
            </h2>

            {/* DUAL COMPARISON COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {options.slice(0, 2).map((opt, i) => {
                const finalScore = calculateOptionScore(opt);
                const resolvedLabel = opt.label.trim() || (i === 0 ? "Option A" : "Option B");
                return (
                  <div key={i} className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-4 shadow-sm flex flex-col justify-between">
                    <div>
                      {/* Score Readout (Bold & Prominent) */}
                      <div className="border-b border-slate-200 pb-3 mb-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{resolvedLabel}</h3>
                        <p className="text-xl font-extrabold text-blue-900 mt-2">
                          {i === 0 ? "Option A" : "Option B"} Net Score:{" "}
                          <span className={`px-3 py-1 rounded-lg text-2xl font-black ${
                            finalScore > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : finalScore < 0
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-200 text-slate-800"
                          }`}>
                            {finalScore > 0 ? `+${finalScore}` : finalScore}
                          </span>
                        </p>
                      </div>

                      {/* Values & Feeling Readouts */}
                      <div className="space-y-2 text-sm text-slate-700 font-medium">
                        <div>
                          <strong className="text-slate-400 block text-xs uppercase tracking-wide">Values Alignment</strong>
                          <span>{`Aligns with values: ${opt.alignsValues}`}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block text-xs uppercase tracking-wide">Predicted Feeling</strong>
                          <span>{`Feeling in 6 months: ${opt.predictedFeeling}`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Simple Pros & Cons Weight Metrics */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-150 text-xs mt-4">
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                        <span className="font-bold text-emerald-800 text-xxs block uppercase tracking-wider mb-1">PROS WEIGHT</span>
                        <span className="text-lg font-black text-emerald-700">
                          +{opt.prosCons.filter(pc => pc.type === "pro").reduce((sum, item) => sum + item.weight, 0)}
                        </span>
                      </div>
                      <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                        <span className="font-bold text-red-800 text-xxs block uppercase tracking-wider mb-1">CONS WEIGHT</span>
                        <span className="text-lg font-black text-red-700">
                          -{opt.prosCons.filter(pc => pc.type === "con").reduce((sum, item) => sum + item.weight, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Handle remaining options if > 2 */}
            {options.length > 2 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Additional Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.slice(2).map((opt, i) => {
                    const finalScore = calculateOptionScore(opt);
                    const resolvedLabel = opt.label.trim() || `Option ${String.fromCharCode(67 + i)}`;
                    return (
                      <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex justify-between items-center">
                        <div>
                          <strong className="block text-slate-800">{resolvedLabel}</strong>
                          <span className="text-xs text-slate-500">Values: {opt.alignsValues} | 6mo: {opt.predictedFeeling}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-sm font-extrabold ${
                          finalScore > 0 ? "bg-emerald-100 text-emerald-800" : finalScore < 0 ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-800"
                        }`}>
                          {finalScore > 0 ? `+${finalScore}` : finalScore}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Baseline Informational Notice Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5 mt-8 shadow-sm">
              <span className="text-2xl mt-0.5 select-none" role="img" aria-label="info">ℹ️</span>
              <p className="text-sm text-amber-900 leading-relaxed font-medium">
                Note: This tool calculates the mathematical weight of your inputs. It does not constitute advice. The final decision is entirely your responsibility.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-slate-200">
            <button
              onClick={() => setStep(3)}
              className="bg-slate-100 text-slate-700 font-bold py-3.5 px-10 rounded-2xl hover:bg-slate-200 transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={handleSaveDecision}
              disabled={saving}
              className="bg-blue-600 text-white font-bold py-4 px-10 rounded-xl hover:bg-blue-700 hover:scale-[1.01] transition-all shadow-md disabled:opacity-50"
            >
              {saving ? "Saving Decision..." : "💾 Save & Track Decision"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
