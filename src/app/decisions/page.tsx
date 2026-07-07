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

  const handleOptionContextChange = <K extends keyof OptionData>(
    index: number,
    key: K,
    val: OptionData[K]
  ) => {
    const updated = options.map((opt, i) => {
      if (i === index) {
        return { ...opt, [key]: val };
      }
      return opt;
    });
    setOptions(updated);
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
    <div className="max-w-4xl mx-auto py-8 px-4 pb-24 space-y-6">
      {/* Header & Stepper */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-5 max-w-3xl mx-auto">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium">&larr; Back to Dashboard</Link>
          <h1 className="text-3xl font-serif font-bold text-gray-800 mt-2">🤔 Decision Assistant</h1>
          <p className="text-gray-500 text-sm mt-1">Challenge biases and make structured, balanced choices.</p>
        </div>
        {/* Step Indicator */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-2.5 text-center min-w-[120px] transition-all duration-300 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-blue-700 font-bold block mb-0.5">Progress</span>
          <span className="text-lg font-extrabold text-blue-900">Step {step} of 4</span>
        </div>
      </div>

      {/* STEP 1: SETUP */}
      {step === 1 && (
        <div className="w-full max-w-3xl mx-auto bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 space-y-8 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">1. What decision are you facing?</h2>
            <input
              type="text"
              className="w-full max-w-xl px-5 py-4 text-xl border border-gray-300 rounded-2xl bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="e.g. Should I purchase an E-bike for commuting?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-6 pt-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">2. Define your options</h2>
              <div className="space-y-4">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-3 items-center max-w-xl">
                    <input
                      type="text"
                      className="w-full max-w-xl px-5 py-4 text-xl border border-gray-300 rounded-2xl bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      value={opt.label}
                      onChange={(e) => handleOptionLabelChange(i, e.target.value)}
                      placeholder={i === 0 ? "e.g., Add cliffside hike to the Italy itinerary" : i === 1 ? "e.g., Stick to the valley wine tour" : `Option ${String.fromCharCode(65 + i)}`}
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(i)}
                        className="p-4 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddOption}
                  className="w-full max-w-xl text-blue-600 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 rounded-2xl py-4 font-semibold transition-colors mt-2"
                >
                  ＋ Add Option
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">3. Timeframe for Follow-up</h2>
              <p className="text-gray-500 text-sm mb-3">When should Momentum check back on the outcome of this decision?</p>
              <div className="relative max-w-xl">
                <select
                  className="w-full max-w-xl px-5 py-4 text-lg border border-gray-300 rounded-2xl bg-white shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10"
                  value={timeframeDays}
                  onChange={(e) => setTimeframeDays(parseInt(e.target.value))}
                >
                  <option value={7}>1 Week (7 Days)</option>
                  <option value={14}>2 Weeks (14 Days)</option>
                  <option value={30}>1 Month (30 Days)</option>
                  <option value={90}>3 Months (90 Days)</option>
                  <option value={180}>6 Months (180 Days)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-500">
                  <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button
              onClick={() => {
                if (!title.trim()) {
                  alert("Please enter a decision title.");
                  return;
                }
                setStep(2);
              }}
              className="bg-blue-600 text-white font-bold py-3.5 px-10 rounded-2xl hover:bg-blue-700 hover:scale-[1.01] transition-all shadow-md"
            >
              Continue &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CONTEXT CHECK */}
      {step === 2 && (
        <div className="space-y-8">
          {options.map((opt, i) => (
            <div key={i} className="w-full max-w-3xl mx-auto bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 space-y-8 animate-fade-in">
              <h3 className="text-2xl font-bold text-blue-700 border-b border-blue-100 pb-3">
                Context Check: {opt.label || `Option ${String.fromCharCode(65 + i)}`}
              </h3>

              {/* 6 Months Feeling Prompt */}
              <div>
                <p className="font-semibold text-gray-800 mb-3 text-base">How will I likely feel about this choice in 6 months?</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["Proud", "Indifferent", "Regretful", "Unknown"] as const).map((feeling) => {
                    const isSelected = opt.predictedFeeling === feeling;
                    return (
                      <button
                        key={feeling}
                        onClick={() => handleOptionContextChange(i, "predictedFeeling", feeling)}
                        className={`p-4 rounded-2xl text-sm font-medium transition-all duration-250 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        {feeling}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Values Alignment */}
              <div>
                <p className="font-semibold text-gray-800 mb-3 text-base">Does this option align with my core values?</p>
                <div className="grid grid-cols-3 gap-3">
                  {(["Yes", "No", "Unsure"] as const).map((align) => {
                    const isSelected = opt.alignsValues === align;
                    return (
                      <button
                        key={align}
                        onClick={() => handleOptionContextChange(i, "alignsValues", align)}
                        className={`p-4 rounded-2xl text-sm font-medium transition-all duration-250 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        {align}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* External Pressure & Assumptions toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-200">
                  <div>
                    <span className="font-semibold text-gray-800 block text-base">Is there external pressure?</span>
                    <span className="text-sm text-gray-500">Feeling forced by others</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOptionContextChange(i, "externalPressure", true)}
                      className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                        opt.externalPressure
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      onClick={() => handleOptionContextChange(i, "externalPressure", false)}
                      className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                        !opt.externalPressure
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-200">
                  <div>
                    <span className="font-semibold text-gray-800 block text-base">Am I making assumptions?</span>
                    <span className="text-sm text-gray-500">Deciding without verified facts</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOptionContextChange(i, "makingAssumptions", true)}
                      className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                        opt.makingAssumptions
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      onClick={() => handleOptionContextChange(i, "makingAssumptions", false)}
                      className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                        !opt.makingAssumptions
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-6 max-w-3xl mx-auto border-t border-gray-200">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-100 text-gray-700 font-bold py-3.5 px-10 rounded-2xl hover:bg-gray-200 transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-blue-600 text-white font-bold py-3.5 px-10 rounded-2xl hover:bg-blue-700 hover:scale-[1.01] transition-all shadow-md"
            >
              Continue &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROS & CONS GRID */}
      {step === 3 && (
        <div className="space-y-8">
          {options.map((opt, i) => (
            <div key={i} className="w-full max-w-3xl mx-auto bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 space-y-6 animate-fade-in">
              <h3 className="text-2xl font-bold text-blue-700 border-b border-blue-100 pb-3">
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
                        <span className="font-semibold text-gray-800 text-base">{pc.text}</span>
                      </div>

                      <div className="flex items-center gap-4 justify-between md:justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Weight:</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={pc.weight}
                            onChange={(e) => handleWeightChange(i, pcIdx, parseInt(e.target.value))}
                            className="w-28 accent-blue-600 cursor-pointer"
                          />
                          <span className="font-bold text-gray-700 w-4 text-center">{pc.weight}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveProCon(i, pcIdx)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold ml-2 hover:underline animate-fade-in"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic py-4 text-center">No Pros or Cons added yet. Add one below.</p>
              )}

              {/* Add Pro/Con Row */}
              <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-100 mt-3">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g. Save money on fuel/parking"
                  value={newProConText[i] || ""}
                  onChange={(e) => setNewProConText({ ...newProConText, [i]: e.target.value })}
                />
                <div className="relative">
                  <select
                    className="w-full max-w-xl px-5 py-4 text-lg border border-gray-300 rounded-2xl bg-white shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10"
                    value={newProConType[i] || "pro"}
                    onChange={(e) => setNewProConType({ ...newProConType, [i]: e.target.value as "pro" | "con" })}
                  >
                    <option value="pro">Pro (Positive)</option>
                    <option value="con">Con (Negative)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
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

          <div className="flex justify-between pt-6 max-w-3xl mx-auto border-t border-gray-200">
            <button
              onClick={() => setStep(2)}
              className="bg-gray-100 text-gray-700 font-bold py-3.5 px-10 rounded-2xl hover:bg-gray-200 transition-colors"
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
        <div className="w-full max-w-3xl mx-auto bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 space-y-8 animate-fade-in">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 border-b border-gray-100 pb-3">
              Decision Analysis: "{title}"
            </h2>

            {/* DUAL COMPARISON COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {options.slice(0, 2).map((opt, i) => {
                const finalScore = calculateOptionScore(opt);
                const resolvedLabel = opt.label.trim() || (i === 0 ? "Option A" : "Option B");
                return (
                  <div key={i} className="border border-gray-200 rounded-2xl p-6 bg-gray-50/50 space-y-4 shadow-sm flex flex-col justify-between">
                    <div>
                      {/* Score Readout (Bold & Prominent) */}
                      <div className="border-b border-gray-200 pb-3 mb-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{resolvedLabel}</h3>
                        <p className="text-2xl font-extrabold text-blue-900 mt-2">
                          {i === 0 ? "Option A" : "Option B"} Net Score:{" "}
                          <span className={`px-3 py-1 rounded-lg text-2xl font-black ${
                            finalScore > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : finalScore < 0
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-200 text-gray-800"
                          }`}>
                            {finalScore > 0 ? `+${finalScore}` : finalScore}
                          </span>
                        </p>
                      </div>

                      {/* Values & Feeling Readouts */}
                      <div className="space-y-2 text-sm text-gray-700 font-medium">
                        <div>
                          <strong className="text-gray-400 block text-xs uppercase tracking-wide">Values Alignment</strong>
                          <span>{`Aligns with values: ${opt.alignsValues}`}</span>
                        </div>
                        <div>
                          <strong className="text-gray-400 block text-xs uppercase tracking-wide">Predicted Feeling</strong>
                          <span>{`Feeling in 6 months: ${opt.predictedFeeling}`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Simple Pros & Cons Weight Metrics */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-150 text-xs mt-4">
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
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Additional Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.slice(2).map((opt, i) => {
                    const finalScore = calculateOptionScore(opt);
                    const resolvedLabel = opt.label.trim() || `Option ${String.fromCharCode(67 + i)}`;
                    return (
                      <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex justify-between items-center">
                        <div>
                          <strong className="block text-gray-800">{resolvedLabel}</strong>
                          <span className="text-xs text-gray-500">Values: {opt.alignsValues} | 6mo: {opt.predictedFeeling}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-sm font-extrabold ${
                          finalScore > 0 ? "bg-emerald-100 text-emerald-800" : finalScore < 0 ? "bg-red-100 text-red-800" : "bg-gray-200 text-gray-800"
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

          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              onClick={() => setStep(3)}
              className="bg-gray-100 text-gray-700 font-bold py-3.5 px-10 rounded-2xl hover:bg-gray-200 transition-colors"
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
