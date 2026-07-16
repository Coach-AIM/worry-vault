"use client";

import React, { useState } from 'react';

// ==========================================
// 1. DATA DICTIONARIES (QUOTES & DISTORTIONS)
// ==========================================
const distortionsData = [
  { id: 'should', title: 'Should Statements', short: 'Expecting things to be exactly as you think they "must" be.', def: 'Holding yourself or others to rigid, unrealistic internal rules. This inevitably generates intense, unnecessary feelings of guilt, frustration, and resentment when reality doesn\'t match your exact blueprint.', head: '"I should have gone to the gym today, I am completely lazy." or "They must arrive exactly on time or they don\'t respect me."', antidote: 'Pivot your vocabulary from rigid obligations to flexible preferences. Reframe your inner dialogue by swapping out words like "should," "must," and "ought" for phrases like "I would prefer to," "It would be nice if," or "Next time I will try to."' },
  { id: 'allnothing', title: 'All-or-Nothing Thinking', short: 'Viewing your performance or situations in absolute black-or-white terms.', def: 'Evaluating yourself and your life events using absolute, binary categories. If a performance falls short of absolute perfection, you categorize the entire outcome as a total, complete failure, completely ignoring any nuances.', head: '"I ate one slice of pizza, my entire diet is completely ruined." or "If I don\'t get an A on this project, I am a total failure."', antidote: 'Actively search for the shades of gray. Evaluate your situation on a granular scale from 0 to 100 rather than an absolute binary pass/fail toggle. Remind yourself that a partial setback does not erase your entire progress.' },
  { id: 'catastrophe', title: 'Catastrophizing', short: 'Automatically anticipating the absolute worst-case scenario.', def: 'Taking a minor negative event or an unknown future variable and inflating it exponentially into an absolute disaster, while simultaneously underestimating your psychological capacity to adapt or handle the outcome.', head: '"I stumbled over my words during the opening statement. I am going to get fired and lose my apartment." or "They haven\'t texted back; something terrible must have happened."', antidote: 'Perform a realistic probability check. Force your brain to map out three distinct scenarios: The absolute worst case, the absolute best case, and the most likely realistic outcome. Prepare a basic action step for the realistic outcome.' },
  { id: 'mindreading', title: 'Mind Reading', short: 'Assuming you know exactly what others are thinking without proof.', def: 'Making absolute, arbitrary assumptions about the negative thoughts, motives, or evaluations of other people toward you, and treating those unproven mental assumptions as established, undeniable objective facts.', head: '"He looked at his watch while I was presenting; he clearly thinks I am boring and completely unqualified." or "Everyone at this meeting thinks I look out of place."', antidote: 'Demand objective evidence. Gently remind yourself that you are not telepathic. Force your brain to list alternate, non-critical interpretations for their behavior (e.g., "He looked at his watch because he has a tight schedule, not because of me").' },
  { id: 'overgen', title: 'Overgeneralization', short: 'Seeing a single negative event as a never-ending pattern of defeat.', def: 'Taking a isolated, single negative incident (such as a rejection or a mistake) and making a sweeping, absolute rule about your entire life identity based on that one individual occurrence.', head: '"I didn\'t get this client. Nothing ever goes right for me. I will never succeed in this market."', antidote: 'Confine the event strictly to its actual boundaries. Use precise, localized language. Replace global keywords like "always," "never," and "everyone" with targeted words like "this time," "in this specific instance," or "today."' },
  { id: 'emotional', title: 'Emotional Reasoning', short: 'Believing your raw feelings represent absolute factual reality.', def: 'Assuming that your intense negative emotional states reflect the literal objective truth of the surrounding environment. You let your feelings dictate your facts: "I feel completely overwhelmed, therefore this problem is totally unfixable."', head: '"I feel incredibly anxious about this flight, which means flying must be inherently dangerous." or "I feel stupid, so I must be stupid."', antidote: 'Separate raw emotion from absolute objective truth. Write down a clear split statement: "I am currently experiencing a temporary feeling of anxiety, but that feeling does not alter the factual safety metrics of the situation." Review the physical evidence.' }
];

const CbtTriangle = () => {
  const [activeNode, setActiveNode] = useState<'thoughts' | 'feelings' | 'behaviors'>('thoughts');

  const nodes = {
    thoughts: { title: "💭 Thoughts", desc: "The automatic words, phrases, and narratives your brain loops. (e.g., 'I am going to fail this presentation.') Directly dictates your subsequent emotional chemistry.", color: "border-blue-500 text-blue-900 bg-blue-50/70" },
    feelings: { title: "❤️ Feelings", desc: "The visceral emotions and immediate physical body sensations that follow a thought. (e.g., Dread, chest tightening, racing heart pulse.)", color: "border-amber-500 text-amber-900 bg-amber-50/70" },
    behaviors: { title: "🏃 Behaviors", desc: "The physical actions you execute or avoid. (e.g., Procrastinating preparation, avoiding eye contact, or social withdrawal.) It reinforces the unhelpful loop.", color: "border-emerald-500 text-emerald-900 bg-emerald-50/70" }
  };

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-center mt-8">
      <span className="bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">Interactive Engine</span>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2 text-center">The Cognitive Behavioral Triangle</h3>
      <p className="text-base sm:text-lg text-slate-600 mb-12 text-center font-medium">Thoughts, feelings, and behaviors reinforce each other. Tap any apex point to trace the circuit.</p>

      {/* The Visual Geometric Triangle Layout Workspace */}
      <div className="relative w-72 h-64 flex items-center justify-center mb-8">
        
        {/* SVG Background Vector for Connecting Loop Arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 288 256">
          <polygon points="144,30 40,210 248,210" fill="transparent" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="6 6" />
          {/* Visual indicator paths connecting loop states */}
          <path d="M 144 45 L 60 200" stroke={activeNode === 'thoughts' || activeNode === 'feelings' ? '#f59e0b' : '#cbd5e1'} strokeWidth="2" fill="none" />
          <path d="M 60 210 L 230 210" stroke={activeNode === 'feelings' || activeNode === 'behaviors' ? '#10b981' : '#cbd5e1'} strokeWidth="2" fill="none" />
          <path d="M 230 200 L 144 45" stroke={activeNode === 'behaviors' || activeNode === 'thoughts' ? '#3b82f6' : '#cbd5e1'} strokeWidth="2" fill="none" />
        </svg>

        {/* Apex Node: Thoughts (Top Center) */}
        <button 
          onClick={() => setActiveNode('thoughts')}
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center font-extrabold text-sm transition-all duration-200 shadow-sm ${activeNode === 'thoughts' ? 'border-blue-600 bg-blue-600 text-white scale-110 shadow-md z-10' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}
        >
          <span>💭</span>
          <span className="mt-1">Thoughts</span>
        </button>

        {/* Left Node: Feelings (Bottom Left) */}
        <button 
          onClick={() => setActiveNode('feelings')}
          className={`absolute bottom-0 left-0 w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center font-extrabold text-sm transition-all duration-200 shadow-sm ${activeNode === 'feelings' ? 'border-amber-500 bg-amber-500 text-white scale-110 shadow-md z-10' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'}`}
        >
          <span>❤️</span>
          <span className="mt-1">Feelings</span>
        </button>

        {/* Right Node: Behaviors (Bottom Right) */}
        <button 
          onClick={() => setActiveNode('behaviors')}
          className={`absolute bottom-0 right-0 w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center font-extrabold text-sm transition-all duration-200 shadow-sm ${activeNode === 'behaviors' ? 'border-emerald-600 bg-emerald-600 text-white scale-110 shadow-md z-10' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'}`}
        >
          <span>🏃</span>
          <span className="mt-1">Behaviors</span>
        </button>
      </div>

      {/* Dynamic Explanation Panel Box */}
      <div className={`p-6 rounded-2xl border-2 w-full text-center transition-all duration-300 ${nodes[activeNode].color}`}>
        <h4 className="text-xl font-black mb-2 tracking-tight">{nodes[activeNode].title}</h4>
        <p className="text-base font-medium leading-relaxed">{nodes[activeNode].desc}</p>
      </div>
    </div>
  );
};

function WellnessInsightsGraphs() {
  // Active State Controls
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [activeHoverTrap, setActiveHoverTrap] = useState<string | null>(null);
  const [hoveredTimelinePoint, setHoveredTimelinePoint] = useState<{ label: string; mood: number } | null>(null);

  // 1. Dynamic Coordinate Sets for the Line Graph
  const timelineData = {
    weekly: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      points: [
        { label: 'Mon', mood: 60, x: 40, y: 110 },
        { label: 'Tue', mood: 40, x: 120, y: 150 },
        { label: 'Wed', mood: 75, x: 200, y: 80 },
        { label: 'Thu', mood: 50, x: 280, y: 130 },
        { label: 'Fri', mood: 80, x: 360, y: 70 },
        { label: 'Sat', mood: 65, x: 440, y: 100 },
        { label: 'Sun', mood: 85, x: 520, y: 60 }
      ],
      path: "M 40 110 L 120 150 L 200 80 L 280 130 L 360 70 L 440 100 L 520 60"
    },
    monthly: {
      labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
      points: [
        { label: 'Wk 1', mood: 55, x: 40, y: 130 },
        { label: 'Wk 2', mood: 85, x: 200, y: 70 },
        { label: 'Wk 3', mood: 60, x: 360, y: 120 },
        { label: 'Wk 4', mood: 90, x: 520, y: 50 }
      ],
      path: "M 40 130 L 200 70 L 360 120 L 520 50"
    }
  };

  const currentTimeline = timelineData[viewMode];

  // 2. Data Structures Matrix for the Interactive Donut Chart
  const trapLegendData = [
    { id: 'should', name: 'Should Statements', count: 6, color: 'stroke-blue-600', bg: 'bg-blue-600', fillText: 'Shoulds', dashArray: '35 65', dashOffset: '100' },
    { id: 'allnothing', name: 'All-or-Nothing', count: 4, color: 'stroke-amber-500', bg: 'bg-amber-500', fillText: 'Binary', dashArray: '25 75', dashOffset: '65' },
    { id: 'catastrophe', name: 'Catastrophizing', count: 3, color: 'stroke-rose-500', bg: 'bg-rose-500', fillText: 'Worst-Case', dashArray: '20 80', dashOffset: '40' },
    { id: 'other', name: 'Other Traps', count: 3, color: 'stroke-slate-400', bg: 'bg-slate-400', fillText: 'Others', dashArray: '20 80', dashOffset: '20' }
  ];

  // Dynamic calculation system for center of Donut Hole text label parameters
  const getDonutCenterLabel = () => {
    if (!activeHoverTrap) return { title: "Top Trap", text: "SHOULDS", style: "text-blue-600" };
    const activeMatch = trapLegendData.find(t => t.id === activeHoverTrap);
    if (!activeMatch) return { title: "Top Trap", text: "SHOULDS", style: "text-blue-600" };
    
    const total = 16;
    const percentage = Math.round((activeMatch.count / total) * 100);
    return {
      title: activeMatch.fillText,
      text: `${percentage}% Focus`,
      style: activeMatch.id === 'should' ? 'text-blue-600' : activeMatch.id === 'allnothing' ? 'text-amber-500' : activeMatch.id === 'catastrophe' ? 'text-rose-500' : 'text-slate-500'
    };
  };

  const centerLabel = getDonutCenterLabel();

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-center">
      
      {/* Module Title Section */}
      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2 text-center">
        📊 Wellness Trends & Analytics
      </h3>
      <p className="text-base sm:text-lg text-slate-600 mb-6 text-center font-medium">
        A real-time breakdown of your logged thought records and identified thinking traps.
      </p>

      {/* ==========================================
          1. INTERACTIVE DATE VIEW CHANGER TOGGLES
         ========================================== */}
      <div className="flex items-center justify-center gap-2 bg-slate-100 p-1.5 rounded-xl mb-6 shadow-inner">
        <button 
          onClick={() => setViewMode('weekly')}
          className={`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${viewMode === 'weekly' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Weekly View
        </button>
        <button 
          onClick={() => setViewMode('monthly')}
          className={`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${viewMode === 'monthly' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Monthly View
        </button>
      </div>

      {/* ==========================================
          2. ACTIVE LINE CHART CONTAINER FRAME
         ========================================== */}
      <div className="w-full border border-slate-200 rounded-2xl p-6 bg-white mb-8 relative">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Mood & Anxiety Trends</span>
          {hoveredTimelinePoint && (
            <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded animate-fadeIn uppercase tracking-wider">
              {hoveredTimelinePoint.label}: {hoveredTimelinePoint.mood}% Stability
            </span>
          )}
        </div>

        <div className="relative w-full h-44 overflow-visible">
          {/* Native High-Contrast Graphic Grid Array */}
          <svg className="w-full h-full overflow-visible" viewBox="0 0 560 180" preserveAspectRatio="none">
            <line x1="40" y1="40" x2="520" y2="40" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="40" y1="100" x2="520" y2="100" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="40" y1="150" x2="520" y2="150" stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Dynamic Interactive Render Path String */}
            <path 
              d={currentTimeline.path} 
              fill="transparent" 
              stroke="#2563eb" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="transition-all duration-500 ease-in-out"
            />

            {/* Vector Active Points Mapper */}
            {currentTimeline.points.map((pt) => (
              <circle 
                key={pt.label}
                cx={pt.x}
                cy={pt.y}
                r={hoveredTimelinePoint?.label === pt.label ? "7" : "5"}
                onMouseEnter={() => setHoveredTimelinePoint(pt)}
                onMouseLeave={() => setHoveredTimelinePoint(null)}
                className="fill-white stroke-blue-600 stroke-[3.5] cursor-pointer transition-all duration-150 hover:scale-125"
              />
            ))}
          </svg>

          {/* Left Y-Axis Static Visual Annotations */}
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 pointer-events-none">
            <span>Good</span>
            <span>Neutral</span>
            <span>Low</span>
          </div>

          {/* Bottom X-Axis Dynamic Label Loop Array */}
          <div className="absolute bottom-0 left-10 right-10 flex justify-between text-xs font-black text-slate-500 uppercase tracking-wider pointer-events-none px-2">
            {currentTimeline.labels.map(lbl => <span key={lbl}>{lbl}</span>)}
          </div>
        </div>
      </div>

      {/* Core Core Aggregate Counters */}
      <div className="grid grid-cols-2 gap-6 w-full mb-8">
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
          <span className="block text-4xl sm:text-5xl font-black text-slate-900 mb-1">9</span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-500">Thought Records Logged</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
          <span className="block text-4xl sm:text-5xl font-black text-emerald-700 mb-1">16</span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-500">Distortions Challenged</span>
        </div>
      </div>

      {/* ==========================================
          3. INTERACTIVE DONUT HOVER ENGINE MODULE
         ========================================== */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-8 border-t border-slate-100 pt-6">
        
        {/* Responsive Interactive SVG Donut Object Canvas */}
        <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4.5"></circle>
            
            {trapLegendData.map((slice) => (
              <circle 
                key={slice.id}
                cx="21" 
                cy="21" 
                r="15.915" 
                fill="transparent" 
                className={`${slice.color} transition-all duration-200 cursor-pointer origin-center`}
                strokeWidth={activeHoverTrap === slice.id ? "6" : "4.5"}
                strokeDasharray={slice.dashArray} 
                strokeDashoffset={slice.dashOffset}
                onMouseEnter={() => setActiveHoverTrap(slice.id)}
                onMouseLeave={() => setActiveHoverTrap(null)}
              />
            ))}
          </svg>
          
          {/* Dynamic Core Ring Core Label Box Primitives */}
          <div className="absolute text-center select-none pointer-events-none transition-all duration-200">
            <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">{centerLabel.title}</span>
            <span className={`block text-xl font-black tracking-tight ${centerLabel.style}`}>{centerLabel.text}</span>
          </div>
        </div>

        {/* Legend Panel Sync Group Grid */}
        <div className="w-full space-y-2.5">
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Thinking Trap Distribution</h4>
          
          {trapLegendData.map((row) => (
            <div 
              key={row.id}
              onMouseEnter={() => setActiveHoverTrap(row.id)}
              onMouseLeave={() => setActiveHoverTrap(null)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 cursor-default ${activeHoverTrap === row.id ? 'border-slate-800 bg-slate-50 shadow-sm translate-x-1' : 'border-slate-100 bg-slate-50/50'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full ${row.bg} shadow-sm shrink-0`} />
                <span className="text-base font-bold text-slate-800">{row.name}</span>
              </div>
              <span className="text-base font-black text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200 shadow-sm">
                {row.count}
              </span>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}

export default function Toolkit() {
  const [expandedGlossaryId, setExpandedGlossaryId] = useState<string | null>(null);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 overflow-y-auto px-4 pt-10 pb-48 flex flex-col items-center">
      
      {/* ==========================================
          HEADER SECTION
         ========================================== */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">CBT Mental Toolkit</h1>
        <p className="text-lg sm:text-xl text-slate-600 mt-2 font-medium">Explore interactive tools, analyze core trends, and master key concepts.</p>
      </div>

      {/* ==========================================
          📊 WELLNESS INSIGHTS & GRAPHS SECTION
         ========================================== */}
      <WellnessInsightsGraphs />

      {/* ==========================================
          🧠 TWO-COLUMN CORE UTILITIES GRID
         ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h4 className="text-xl font-extrabold text-slate-900 mb-1">🧠 Decision Assistant</h4>
          <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">Align standard options with your core values & calculate pros/cons.</p>
          <button className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors">Open Assistant</button>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h4 className="text-xl font-extrabold text-slate-900 mb-1">📞 My Support Contact</h4>
          <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">Reach out to your pre-configured emergency contact or therapist in one tap.</p>
          <button className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition-colors">+ Add Support Contact</button>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h4 className="text-xl font-extrabold text-slate-900 mb-1">📄 Therapy Integration</h4>
          <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">Export complete grounding steps and thought records to clear formats.</p>
          <button className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-sm transition-colors">⬇️ Export Week to PDF</button>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center">
          <h4 className="text-xl font-extrabold text-slate-900 mb-1">🔒 Secure Vault Backup</h4>
          <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">Download an encrypted local file of your complete application records.</p>
          <button className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors">🔐 Create Encrypted Backup</button>
        </div>
      </div>

      {/* ==========================================
          🔄 INTERACTIVE CBT TRIANGLE
         ========================================== */}
      <CbtTriangle />

      {/* ==========================================
          📖 DEEP-DIVE ACCORDION CONCEPT GLOSSARY
         ========================================== */}
      <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-center mb-10">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2 text-center">CBT Concept Glossary</h3>
        <p className="text-base sm:text-lg text-slate-600 mb-6 text-center font-medium">Click any distortion card to reveal explicit definitions, real-world patterns, and actionable antidotes.</p>

        <div className="w-full space-y-4">
          {distortionsData.map((term) => {
            const isExpanded = expandedGlossaryId === term.id;
            return (
              <div 
                key={term.id}
                onClick={() => setExpandedGlossaryId(isExpanded ? null : term.id)}
                className={`w-full p-5 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${isExpanded ? 'border-slate-800 bg-slate-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900">{term.title}</h4>
                    {!isExpanded && <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">{term.short}</p>}
                  </div>
                  <span className="text-xl font-bold text-slate-400 ml-4">{isExpanded ? '−' : '+'}</span>
                </div>

                {isExpanded && (
                  <div className="mt-5 space-y-4 border-t border-slate-200/80 pt-4">
                    <div>
                      <span className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Plain English Definition</span>
                      <p className="text-base text-slate-800 font-normal leading-relaxed">{term.def}</p>
                    </div>
                    <div>
                      <span className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">What It Sounds Like Inside Your Head</span>
                      <p className="text-base italic text-slate-900 bg-slate-100 p-3 rounded-xl border border-slate-200/50 font-medium">
                        {term.head}
                      </p>
                    </div>
                    <div>
                      <span className="block text-xs font-black uppercase tracking-widest text-emerald-600 mb-1">The CBT Antidote Script</span>
                      <p className="text-base text-emerald-900 font-bold bg-emerald-50 border border-emerald-200 p-4 rounded-xl leading-relaxed">
                        {term.antidote}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
