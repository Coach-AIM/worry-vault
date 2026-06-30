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
      label: "Option A",
      predictedFeeling: "Unknown",
      alignsValues: "Unsure",
      externalPressure: false,
      makingAssumptions: false,
      prosCons: []
    },
    {
      label: "Option B",
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
        label: `Option ${String.fromCharCode(65 + options.length)}`,
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
    const updated = [...options];
    updated[index].label = val;
    setOptions(updated);
  };

  const handleOptionContextChange = <K extends keyof OptionData>(
    index: number,
    key: K,
    val: OptionData[K]
  ) => {
    const updated = [...options];
    updated[index][key] = val;
    setOptions(updated);
  };

  const handleAddProCon = (index: number) => {
    const text = newProConText[index]?.trim();
    if (!text) return;
    const type = newProConType[index] || "pro";

    const updated = [...options];
    updated[index].prosCons.push({
      text,
      weight: 3,
      type
    });
    setOptions(updated);

    // Reset input
    setNewProConText({ ...newProConText, [index]: "" });
  };

  const handleRemoveProCon = (optIndex: number, pcIndex: number) => {
    const updated = [...options];
    updated[optIndex].prosCons = updated[optIndex].prosCons.filter((_, i) => i !== pcIndex);
    setOptions(updated);
  };

  const handleWeightChange = (optIndex: number, pcIndex: number, val: number) => {
    const updated = [...options];
    updated[optIndex].prosCons[pcIndex].weight = val;
    setOptions(updated);
  };

  async function handleSaveDecision() {
    setSaving(true);
    try {
      const payload = {
        title,
        timeframeDays,
        options: options.map((opt) => ({
          label: opt.label,
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
    <div className="max-w-3xl mx-auto py-8 px-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">&larr; Back to Dashboard</Link>
          <h1 className="text-3xl font-serif font-bold text-gray-800 mt-2">🤔 Decision Assistant</h1>
          <p className="text-gray-500 text-sm mt-1">Challenge biases and make structured, balanced choices.</p>
        </div>
        {/* Step Indicator */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center min-w-[120px]">
          <span className="text-xs uppercase tracking-wider text-emerald-700 font-bold block">Progress</span>
          <span className="text-lg font-bold text-emerald-800">Step {step} of 4</span>
        </div>
      </div>

      {/* STEP 1: SETUP */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">1. What decision are you facing?</h2>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Should I purchase an E-bike for commuting?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">2. Define your options</h2>
              <div className="space-y-3">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="flex-1 border border-gray-300 rounded-lg p-2.5"
                      value={opt.label}
                      onChange={(e) => handleOptionLabelChange(i, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(i)}
                        className="p-2.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddOption}
                  className="w-full text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 rounded-lg p-2.5 font-semibold transition-colors mt-2"
                >
                  ＋ Add Option
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">3. Timeframe for Follow-up</h2>
              <p className="text-gray-500 text-sm mb-3">When should Momentum check back on the outcome of this decision?</p>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
                value={timeframeDays}
                onChange={(e) => setTimeframeDays(parseInt(e.target.value))}
              >
                <option value={7}>1 Week (7 Days)</option>
                <option value={14}>2 Weeks (14 Days)</option>
                <option value={30}>1 Month (30 Days)</option>
                <option value={90}>3 Months (90 Days)</option>
                <option value={180}>6 Months (180 Days)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                if (!title.trim()) {
                  alert("Please enter a decision title.");
                  return;
                }
                setStep(2);
              }}
              className="bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Continue &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CONTEXT CHECK */}
      {step === 2 && (
        <div className="space-y-6">
          {options.map((opt, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
              <h3 className="text-lg font-bold text-emerald-700 border-b border-emerald-100 pb-2">
                Context Check: {opt.label || `Option ${String.fromCharCode(65 + i)}`}
              </h3>

              {/* 6 Months Feeling Prompt */}
              <div>
                <p className="font-semibold text-gray-800 mb-2">How will I likely feel about this choice in 6 months?</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(["Proud", "Indifferent", "Regretful", "Unknown"] as const).map((feeling) => (
                    <button
                      key={feeling}
                      onClick={() => handleOptionContextChange(i, "predictedFeeling", feeling)}
                      className={`p-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        opt.predictedFeeling === feeling
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {feeling}
                    </button>
                  ))}
                </div>
              </div>

              {/* Values Alignment */}
              <div>
                <p className="font-semibold text-gray-800 mb-2">Does this option align with my core values?</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["Yes", "No", "Unsure"] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => handleOptionContextChange(i, "alignsValues", align)}
                      className={`p-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        opt.alignsValues === align
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* External Pressure & Assumptions toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <span className="font-semibold text-gray-800 block text-sm">Is there external pressure?</span>
                    <span className="text-xs text-gray-500">Feeling forced by others</span>
                  </div>
                  <button
                    onClick={() => handleOptionContextChange(i, "externalPressure", !opt.externalPressure)}
                    className={`py-1.5 px-4 rounded text-xs font-bold transition-all ${
                      opt.externalPressure
                        ? "bg-amber-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {opt.externalPressure ? "YES" : "NO"}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <span className="font-semibold text-gray-800 block text-sm">Am I making assumptions?</span>
                    <span className="text-xs text-gray-500">Deciding without verified facts</span>
                  </div>
                  <button
                    onClick={() => handleOptionContextChange(i, "makingAssumptions", !opt.makingAssumptions)}
                    className={`py-1.5 px-4 rounded text-xs font-bold transition-all ${
                      opt.makingAssumptions
                        ? "bg-amber-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {opt.makingAssumptions ? "YES" : "NO"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-100 text-gray-700 font-semibold py-3 px-8 rounded-lg hover:bg-gray-250 transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Continue &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROS & CONS GRID */}
      {step === 3 && (
        <div className="space-y-6">
          {options.map((opt, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-emerald-700 border-b border-emerald-100 pb-2">
                Pros & Cons: {opt.label}
              </h3>

              {/* Added Items List */}
              {opt.prosCons.length > 0 ? (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {opt.prosCons.map((pc, pcIdx) => (
                    <div
                      key={pcIdx}
                      className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border text-sm gap-2 ${
                        pc.type === "pro"
                          ? "bg-emerald-50/50 border-emerald-100"
                          : "bg-red-50/50 border-red-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold uppercase py-0.5 px-2 rounded ${
                            pc.type === "pro"
                              ? "bg-emerald-200 text-emerald-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          {pc.type}
                        </span>
                        <span className="font-semibold text-gray-800">{pc.text}</span>
                      </div>

                      <div className="flex items-center gap-3 justify-between md:justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Weight:</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={pc.weight}
                            onChange={(e) => handleWeightChange(i, pcIdx, parseInt(e.target.value))}
                            className="w-24 accent-emerald-600"
                          />
                          <span className="font-bold text-gray-700 w-4 text-center">{pc.weight}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveProCon(i, pcIdx)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold ml-2"
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
              <div className="flex flex-col md:flex-row gap-2 pt-2 border-t border-gray-100 mt-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm"
                  placeholder="e.g. Save money on fuel/parking"
                  value={newProConText[i] || ""}
                  onChange={(e) => setNewProConText({ ...newProConText, [i]: e.target.value })}
                />
                <select
                  className="border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                  value={newProConType[i] || "pro"}
                  onChange={(e) => setNewProConType({ ...newProConType, [i]: e.target.value as "pro" | "con" })}
                >
                  <option value="pro">Pro (Positive)</option>
                  <option value="con">Con (Negative)</option>
                </select>
                <button
                  onClick={() => handleAddProCon(i)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
                >
                  ＋ Add Item
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="bg-gray-100 text-gray-700 font-semibold py-3 px-8 rounded-lg hover:bg-gray-250 transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Calculate Summary &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUMMARY & SCORE OUTPUT */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-2">
              Decision Analysis: "{title}"
            </h2>

            <div className="space-y-6">
              {options.map((opt, i) => {
                const finalScore = calculateOptionScore(opt);
                return (
                  <div key={i} className="border border-gray-200 rounded-lg p-5 bg-gray-50/50 space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <h3 className="text-lg font-bold text-gray-800">{opt.label}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium">Net Score:</span>
                        <span className={`text-2xl font-bold px-3 py-1 rounded-lg ${
                          finalScore > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : finalScore < 0
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-200 text-gray-800"
                        }`}>
                          {finalScore > 0 ? `+${finalScore}` : finalScore}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Math Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-600 bg-white p-3 rounded-lg border border-gray-150">
                      <div>
                        <span className="text-gray-400 block mb-0.5">Values Align</span>
                        <span className={opt.alignsValues === "Yes" ? "text-emerald-600" : opt.alignsValues === "No" ? "text-red-600" : "text-gray-500"}>
                          {opt.alignsValues} ({opt.alignsValues === "Yes" ? "+2" : opt.alignsValues === "No" ? "-2" : "0"})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Ext. Pressure</span>
                        <span className={opt.externalPressure ? "text-red-600" : "text-emerald-600"}>
                          {opt.externalPressure ? "Yes (-1)" : "No (+1)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Assumptions</span>
                        <span className={opt.makingAssumptions ? "text-red-600" : "text-emerald-600"}>
                          {opt.makingAssumptions ? "Yes (-1)" : "No (+1)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Predicted Feeling</span>
                        <span className={
                          opt.predictedFeeling === "Proud"
                            ? "text-emerald-600"
                            : opt.predictedFeeling === "Regretful"
                            ? "text-red-600"
                            : "text-gray-500"
                        }>
                          {opt.predictedFeeling} ({
                            opt.predictedFeeling === "Proud" ? "+3" : opt.predictedFeeling === "Regretful" ? "-3" : "0"
                          })
                        </span>
                      </div>
                    </div>

                    {/* Pros & Cons Summarized */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-emerald-50/30 border border-emerald-100 rounded-lg p-3">
                        <span className="font-bold text-emerald-800 text-xs block mb-1">PROS</span>
                        {opt.prosCons.filter(pc => pc.type === "pro").length > 0 ? (
                          <ul className="space-y-1 text-xs">
                            {opt.prosCons.filter(pc => pc.type === "pro").map((item, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span className="text-gray-700">{item.text}</span>
                                <span className="font-bold text-emerald-700">+{item.weight}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No pros added.</span>
                        )}
                      </div>

                      <div className="bg-red-50/30 border border-red-100 rounded-lg p-3">
                        <span className="font-bold text-red-800 text-xs block mb-1">CONS</span>
                        {opt.prosCons.filter(pc => pc.type === "con").length > 0 ? (
                          <ul className="space-y-1 text-xs">
                            {opt.prosCons.filter(pc => pc.type === "con").map((item, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span className="text-gray-700">{item.text}</span>
                                <span className="font-bold text-red-700">-{item.weight}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No cons added.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
              💡 <strong>Grounding Tip:</strong> The option with the highest score aligns best with your values while minimizing assumptions and external pressures. Check back in <strong>{timeframeDays} days</strong> to log how you feel about your final choice!
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(3)}
              className="bg-gray-100 text-gray-700 font-semibold py-3 px-8 rounded-lg hover:bg-gray-250 transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={handleSaveDecision}
              disabled={saving}
              className="bg-emerald-600 text-white font-bold py-3.5 px-10 rounded-lg hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
            >
              {saving ? "Saving Decision..." : "💾 Save & Track Decision"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
