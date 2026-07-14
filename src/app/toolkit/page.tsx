"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GlossaryTerm {
  term: string;
  definition: string;
  category: "CBT Core" | "Distortions" | "Techniques";
  example?: string;
  action?: string;
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: "Cognitive Distortions",
    definition: "Inaccurate, biased, or exaggerated thinking patterns that reinforce negative emotions and worry.",
    category: "CBT Core",
    example: "Assuming you failed a whole test because you got one question wrong.",
    action: "Challenge the distortion by writing out evidence for/against the thought.",
  },
  {
    term: "CBT (Cognitive Behavioral Therapy)",
    definition: "A structured, evidence-based psychotherapy focusing on how thoughts, feelings, and behaviors influence one another.",
    category: "CBT Core",
    example: "Using a Thought Record to trace how a negative event triggered physical panic.",
    action: "Practice identifying automatic thoughts when you feel an emotional shift.",
  },
  {
    term: "Cognitive Reframing",
    definition: "The process of identifying unhelpful thoughts, disputing them, and generating balanced, constructive perspectives.",
    category: "Techniques",
    example: "Replacing 'I'll fail this talk' with 'I've prepared well, and even if it's not perfect, I will get through it.'",
    action: "Identify the absolute worst case scenario and build a constructive action plan for it.",
  },
  {
    term: "Grounding Techniques",
    definition: "Exercises designed to bring your focus back to the present physical moment, helping manage acute anxiety or panic.",
    category: "Techniques",
    example: "The 5-4-3-2-1 technique (finding 5 things you can see, 4 touch, 3 hear, 2 smell, 1 taste).",
    action: "Implement a physical anchor (e.g. holding an ice cube) to disrupt high intensity emotional spirals.",
  },
  {
    term: "Thought Record",
    definition: "A written tool used to systematically break down situations, automatic thoughts, physical feelings, distortions, and reframed thoughts.",
    category: "CBT Core",
    example: "A standard 5-step CBT log analyzing a recent conflict at work.",
    action: "Commit to completing at least one Thought Record per week to track automatic thinking habits.",
  },
  {
    term: "All-or-Nothing Thinking",
    definition: "Viewing situations in black-and-white, absolute categories (e.g., failing completely if a goal isn't met perfectly).",
    category: "Distortions",
    example: "If I don't get an A on this test, I'm a complete failure.",
    action: "Look for shades of gray. Ask: Is there a middle ground between perfection and failure?",
  },
  {
    term: "Catastrophizing",
    definition: "Anticipating the worst-case scenario and assuming it will be an unmitigated disaster that you cannot handle.",
    category: "Distortions",
    example: "If I'm late to the meeting, I'll get fired immediately.",
    action: "Evaluate the likelihood. What is the most realistic outcome, and how would I handle it?",
  },
  {
    term: "Mind Reading",
    definition: "Assuming you know what others are thinking, usually imagining they are judging or thinking negatively of you.",
    category: "Distortions",
    example: "They didn't reply to my text; they must hate me.",
    action: "List alternative explanations. Could they be busy, driving, or away from their phone?",
  },
  {
    term: "Emotional Reasoning",
    definition: "Believing that because you feel a certain way, it must be the objective truth (e.g., 'I feel anxious, therefore I am in danger').",
    category: "Distortions",
    example: "I feel anxious about this flight, so it's unsafe.",
    action: "Distinguish feelings from facts. Remind yourself: An emotion is a reaction, not a reflection of reality.",
  },
];

export default function ToolkitPage() {
  const [activeNode, setActiveNode] = useState<"thoughts" | "feelings" | "behaviors" | null>("thoughts");
  
  // Custom user inputs for the triangle demonstration
  const [thoughtInput, setThoughtInput] = useState("I am going to fail this presentation.");
  const [feelingInput, setFeelingInput] = useState("Anxious, overwhelmed, scared.");
  const [behaviorInput, setBehaviorInput] = useState("Procrastinating prep, avoiding eye contact.");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  // Dynamic user insights stats
  const [entriesCount, setEntriesCount] = useState<number | null>(null);
  const [distortionsCount, setDistortionsCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/journal");
        const data = await res.json();
        if (data.entries) {
          setEntriesCount(data.entries.length);
          let count = 0;
          data.entries.forEach((e: any) => {
            if (e.distortionsJson) {
              try {
                const parsed = JSON.parse(e.distortionsJson);
                if (Array.isArray(parsed)) {
                  count += parsed.length;
                }
              } catch (err) {}
            }
          });
          setDistortionsCount(count);
        }
      } catch (err) {
        console.error("Failed to load toolkit stats:", err);
      }
    };
    fetchStats();
  }, []);

  const filteredGlossary = glossaryTerms.filter((item) => {
    const matchesSearch = item.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const nodeDetails = {
    thoughts: {
      title: "Thoughts",
      desc: "What we tell ourselves. Automatic interpretations, beliefs, and internal dialogue about a situation.",
      impact: "Thoughts directly trigger our emotional states and guide our behavioral responses.",
      color: "border-sky-200 bg-sky-50 text-sky-800",
      accent: "bg-sky-500",
    },
    feelings: {
      title: "Feelings / Emotions",
      desc: "Emotional states (e.g., anxiety, sadness, anger) and physical body sensations (e.g., rapid heartbeat, tightness).",
      impact: "Feelings reinforce our negative thoughts and tempt us to act in survival-oriented ways.",
      color: "border-amber-200 bg-amber-50 text-amber-800",
      accent: "bg-amber-500",
    },
    behaviors: {
      title: "Behaviors",
      desc: "The actions we take or avoid (e.g., procrastination, avoidance, checking, practicing mindfulness).",
      impact: "Our behaviors can either break the feedback loop or further reinforce negative thoughts and emotions.",
      color: "border-emerald-200 bg-emerald-50 text-emerald-800",
      accent: "bg-emerald-500",
    },
  };

  const toggleExpandTerm = (term: string) => {
    if (expandedTerm === term) {
      setExpandedTerm(null);
    } else {
      setExpandedTerm(term);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-40 animate-fade-in">
      <header className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          CBT Mental Toolkit
        </h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
          Explore interactive tools, break down negative feedback loops, and master key concepts.
        </p>
      </header>

      {/* Personal Insights Summary Widget */}
      <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl mb-10 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
        <div className="text-center sm:text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CBT PROGRESS</span>
          <h3 className="text-xl font-bold text-slate-800">Your Insights</h3>
        </div>
        <div className="bg-white border border-slate-100/80 p-4 rounded-2xl text-center shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <span className="text-2xl font-bold text-slate-900 block">{entriesCount !== null ? entriesCount : "—"}</span>
          <span className="text-xs text-slate-400 font-medium">Thought Records Logged</span>
        </div>
        <div className="bg-white border border-slate-100/80 p-4 rounded-2xl text-center shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <span className="text-2xl font-bold text-slate-900 block">{distortionsCount !== null ? distortionsCount : "—"}</span>
          <span className="text-xs text-slate-400 font-medium">Distortions Challenged</span>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE CBT TRIANGLE */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 mb-12">
        <div className="text-center mb-8">
          <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full">
            Interactive Tool
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
            The Cognitive Behavioral Triangle
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto">
            Thoughts, feelings, and behaviors are interconnected. Click each node to see how they feed into each other.
          </p>
        </div>

        {/* Triangle Visual Map */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 flex justify-center items-center py-8 relative">
            
            {/* SVG Connector Lines in Background */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
              <svg width="280" height="240" viewBox="0 0 280 240" className="w-[280px] h-[240px] opacity-25">
                {/* Arrow Paths */}
                <path d="M 140 30 L 230 180" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                <path d="M 230 180 L 50 180" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                <path d="M 50 180 L 140 30" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" fill="none" />
              </svg>
            </div>

            {/* Absolute positioning nodes */}
            <div className="relative w-[280px] h-[240px] z-10">
              
              {/* Thoughts Node (Top) */}
              <button
                onClick={() => setActiveNode("thoughts")}
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center font-bold transition-all duration-300 shadow-sm ${
                  activeNode === "thoughts"
                    ? "border-sky-500 bg-sky-500 text-white scale-110 shadow-md ring-4 ring-sky-100"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600"
                }`}
              >
                <span className="text-2xl mb-1">💭</span>
                <span className="text-xs tracking-wide">Thoughts</span>
              </button>

              {/* Feelings Node (Bottom Left) */}
              <button
                onClick={() => setActiveNode("feelings")}
                className={`absolute bottom-0 left-0 w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center font-bold transition-all duration-300 shadow-sm ${
                  activeNode === "feelings"
                    ? "border-amber-500 bg-amber-500 text-white scale-110 shadow-md ring-4 ring-amber-100"
                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-600"
                }`}
              >
                <span className="text-2xl mb-1">❤️</span>
                <span className="text-xs tracking-wide">Feelings</span>
              </button>

              {/* Behaviors Node (Bottom Right) */}
              <button
                onClick={() => setActiveNode("behaviors")}
                className={`absolute bottom-0 right-0 w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center font-bold transition-all duration-300 shadow-sm ${
                  activeNode === "behaviors"
                    ? "border-emerald-500 bg-emerald-500 text-white scale-110 shadow-md ring-4 ring-emerald-100"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                }`}
              >
                <span className="text-2xl mb-1">🏃‍♂️</span>
                <span className="text-xs tracking-wide">Behaviors</span>
              </button>

              {/* Center Inter-connected Badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
                Feedback Loop
              </div>

            </div>
          </div>

          {/* Interactive Node Breakdown & Live Inputs */}
          <div className="md:col-span-6">
            {activeNode && (
              <div className={`p-5 rounded-2xl border transition-all duration-300 ${nodeDetails[activeNode].color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${nodeDetails[activeNode].accent}`} />
                  <h3 className="text-lg font-bold">{nodeDetails[activeNode].title}</h3>
                </div>
                <p className="text-sm leading-relaxed mb-3">
                  {nodeDetails[activeNode].desc}
                </p>
                <p className="text-xs font-semibold opacity-90 border-t border-slate-200/50 pt-2">
                  <strong>System Impact:</strong> {nodeDetails[activeNode].impact}
                </p>
              </div>
            )}

            {/* Custom Input Practice */}
            <div className="mt-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Map Your Current Loop
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">My Automatic Thought:</label>
                  <input
                    type="text"
                    value={thoughtInput}
                    onChange={(e) => setThoughtInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">My Emotional/Physical Feel:</label>
                  <input
                    type="text"
                    value={feelingInput}
                    onChange={(e) => setFeelingInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">My Resulting Behavior:</label>
                  <input
                    type="text"
                    value={behaviorInput}
                    onChange={(e) => setBehaviorInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-300"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2: GLOSSARY SECTION */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-slate-900">CBT Concept Glossary</h2>
            <p className="text-sm text-slate-500 mt-1">Quick explanations of vital mental models and terms. Click to expand.</p>
          </div>
          
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {["All", "CBT Core", "Distortions", "Techniques"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search glossary terms or definitions..."
            className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
        </div>

        {/* Glossary Results List */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {filteredGlossary.length > 0 ? (
            filteredGlossary.map((item) => {
              const isExpanded = expandedTerm === item.term;
              return (
                <div
                  key={item.term}
                  onClick={() => toggleExpandTerm(item.term)}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isExpanded 
                      ? "border-slate-300 bg-slate-50 shadow-sm" 
                      : "border-slate-50 bg-slate-50/30 hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{item.term}</h3>
                      <span className="text-slate-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.category === "CBT Core"
                        ? "bg-sky-50 text-sky-700 border border-sky-100"
                        : item.category === "Distortions"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.definition}</p>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
                      {item.example && (
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-400 uppercase block mb-1">Example</span>
                          <p className="text-slate-700 italic leading-relaxed">"{item.example}"</p>
                        </div>
                      )}
                      {item.action && (
                        <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50">
                          <span className="font-bold text-emerald-600 uppercase block mb-1">CBT Action Tip</span>
                          <p className="text-slate-700 leading-relaxed">{item.action}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              No matching glossary terms found.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
