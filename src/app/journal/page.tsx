"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { checkSafety } from '@/lib/safetyIntercept';
import { findDistortions, DistortionType, DISTORTIONS } from '@/lib/cbtDistortions';
import { EMOTION_WHEEL, PRIMARY_EMOTIONS } from '@/lib/emotionWheel';

type Entry = {
  id: number;
  createdAt: string;
  entryText: string;
  insights: string | null;
};

type SelectedEmotion = {
  name: string;
  weight: number;
};

export default function CBTJournal() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  
  // Thought Record State
  const [situation, setSituation] = useState('');
  
  // Emotions State (Step 2)
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<SelectedEmotion[]>([]);
  
  const [thought, setThought] = useState('');
  
  // Distortions State (Step 4)
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([]);
  
  const [reframe, setReframe] = useState('');
  
  // Heuristic Highlights
  const [localDistortions, setLocalDistortions] = useState<DistortionType[]>([]);
  
  // AI Insights
  const [insightsData, setInsightsData] = useState<{ insights: string, reframeSuggestions?: string[], suggestedDistortions?: string[] } | null>(null);
  
  const [history, setHistory] = useState<Entry[]>([]);

  // Suggest emotions based on the situation text
  const getSuggestedEmotions = (situationText: string) => {
    const text = situationText.toLowerCase();
    const suggestions: string[] = [];
    
    if (text.includes("work") || text.includes("boss") || text.includes("deadline") || text.includes("test") || text.includes("exam") || text.includes("fail") || text.includes("worry") || text.includes("future") || text.includes("presentation") || text.includes("meeting") || text.includes("job") || text.includes("interview")) {
      suggestions.push("Worried", "Overwhelmed", "Stressed", "Nervous");
    }
    if (text.includes("sad") || text.includes("lonely") || text.includes("lose") || text.includes("lost") || text.includes("cry") || text.includes("hurt") || text.includes("breakup") || text.includes("miss") || text.includes("alone")) {
      suggestions.push("Lonely", "Hurt", "Disappointed", "Isolated");
    }
    if (text.includes("angry") || text.includes("mad") || text.includes("hate") || text.includes("fight") || text.includes("argue") || text.includes("annoy") || text.includes("rude") || text.includes("unfair") || text.includes("argument")) {
      suggestions.push("Frustrated", "Irritated", "Annoyed", "Mad");
    }
    if (text.includes("shame") || text.includes("guilt") || text.includes("sorry") || text.includes("mistake") || text.includes("wrong") || text.includes("blame") || text.includes("stupid") || text.includes("fault")) {
      suggestions.push("Embarrassed", "Remorseful", "Regretful", "Worthless");
    }
    
    if (suggestions.length === 0) {
      suggestions.push("Stressed", "Overwhelmed", "Worried", "Frustrated");
    }
    
    return [...new Set(suggestions)];
  };

  const suggestedEmotions = getSuggestedEmotions(situation);

  const getHeuristicReframe = () => {
    if (selectedDistortions.includes("all-or-nothing")) {
      return "While this situation didn't go perfectly, it doesn't mean everything is ruined. I can learn from this single event.";
    }
    if (selectedDistortions.includes("catastrophizing")) {
      return "I am imagining the worst-case scenario. Even if that happens, I can take steps to handle it, and it's more likely that the outcome will be manageable.";
    }
    if (selectedDistortions.includes("should-statements")) {
      return "It would be nice if things went exactly as I wished, but it's okay that they didn't. I will do my best without demanding perfection.";
    }
    if (selectedDistortions.includes("mind-reading")) {
      return "I don't actually know what they are thinking. They might be busy, stressed, or thinking about something else entirely.";
    }
    if (selectedDistortions.includes("emotional-reasoning")) {
      return "My feelings are strong right now, but feelings are not facts. Just because I feel this way doesn't mean it's the truth.";
    }
    if (selectedDistortions.includes("overgeneralization")) {
      return "This is one isolated event. It doesn't mean it will always happen this way in the future.";
    }
    return "I can take a deep breath and look at the facts of this situation objectively, rather than letting my automatic thoughts dictate my reality.";
  };
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [crisis, setCrisis] = useState(false);

  async function fetchHistory() {
    setFetching(true);
    const res = await fetch('/api/journal');
    const data = await res.json();
    if (data.entries) setHistory(data.entries);
    setFetching(false);
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  // Delayed Heuristic Distortion Highlighting logic for step 3
  useEffect(() => {
    if (step !== 3) return;
    
    const timeoutId = setTimeout(() => {
      if (thought.trim()) {
        const found = findDistortions(thought);
        setLocalDistortions(found);
      } else {
        setLocalDistortions([]);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [thought, step]);

  function toggleEmotion(emotionName: string) {
    if (selectedEmotions.some(e => e.name === emotionName)) {
      setSelectedEmotions(selectedEmotions.filter(e => e.name !== emotionName));
    } else {
      setSelectedEmotions([...selectedEmotions, { name: emotionName, weight: 50 }]);
    }
  }

  function updateEmotionWeight(emotionName: string, weight: number) {
    setSelectedEmotions(selectedEmotions.map(e => 
      e.name === emotionName ? { ...e, weight } : e
    ));
  }
  
  function toggleDistortion(id: string) {
    if (selectedDistortions.includes(id)) {
      setSelectedDistortions(selectedDistortions.filter(d => d !== id));
    } else {
      setSelectedDistortions([...selectedDistortions, id]);
    }
  }

  async function handleAnalyzeThoughts() {
    if (!thought.trim()) return;
    
    setCrisis(false);

    // 1. Safety Intercept
    if (checkSafety(thought) || checkSafety(situation)) {
      setCrisis(true);
      return;
    }

    setStep(4);
    setLoading(true);
    
    try {
      // 2. Try Gemini API for CBT Analysis
      const emotionsListStr = selectedEmotions.map(e => `${e.name} (${e.weight}%)`).join(", ");
      const promptToAnalyze = `Situation: ${situation}\nThought: ${thought}\nEmotions: ${emotionsListStr}`;
      
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToAnalyze, type: 'journal' })
      });
      
      const data = await res.json();
      if (res.ok && data.result) {
        setInsightsData(data.result);
        const aiDistortions = data.result.suggestedDistortions || [];
        const heuristicDistortions = localDistortions.map(ld => ld.id);
        setSelectedDistortions(Array.from(new Set([...heuristicDistortions, ...aiDistortions])));
      }
    } catch (err) {
      console.error("Insight Error", err);
      setSelectedDistortions(localDistortions.map(ld => ld.id));
    }
    setLoading(false);
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    const emotionsFormatted = selectedEmotions.length > 0 
      ? selectedEmotions.map(e => `- ${e.name}: ${e.weight}/100`).join('\n')
      : "None selected";
      
    const distortionsFormatted = selectedDistortions.length > 0 
      ? selectedDistortions.map(id => DISTORTIONS.find(d => d.id === id)?.name).join(', ')
      : "None selected";

    const finalEntryText = `**Situation:**\n${situation}\n\n**Emotions Identified:**\n${emotionsFormatted}\n\n**Automatic Thought:**\n${thought}\n\n**Identified Cognitive Distortions:**\n${distortionsFormatted}\n\n**Reframed Thought:**\n${reframe}`;

    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        entryText: finalEntryText, 
        insights: {
          aiInsights: insightsData,
          emotions: selectedEmotions,
          distortions: selectedDistortions
        }
      })
    });

    // Reset state
    setStep(1);
    setSituation('');
    setSelectedEmotions([]);
    setActiveCategory(null);
    setThought('');
    setSelectedDistortions([]);
    setReframe('');
    setInsightsData(null);
    setLocalDistortions([]);
    fetchHistory();
    setLoading(false);
  }

  const selectedDistortionNames = selectedDistortions
    .map(id => DISTORTIONS.find(d => d.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div style={{ padding: '2rem 0', maxWidth: '750px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--sage-green)', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 600 }}>CBT Journal</h1>
        <p style={{ fontSize: '1.1rem', color: '#555' }}>Guided thought record to identify and reframe cognitive distortions.</p>
        <Link href="/" style={{ color: 'var(--soft-blue)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '1rem' }}>&larr; Back to Dashboard</Link>
      </header>

      {crisis && (
        <div style={{ padding: '1.5rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: '2rem', borderLeft: '4px solid #991b1b' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Safety Alert:</strong> 
          We noticed you might be in distress. Momentum is a self-help tool. Please contact professional help immediately. <br/><br/>
          <strong>Call or text 988</strong> to reach the Suicide & Crisis Lifeline.
        </div>
      )}

      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '2rem' }}>
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} style={{ 
            height: '6px', 
            flex: 1, 
            backgroundColor: s <= step ? 'var(--sage-green)' : '#e5e7eb',
            borderRadius: '10px',
            transition: 'background-color 0.3s ease'
          }} />
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '3rem' }}>
        
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Step 1: The Situation</h3>
            <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>What happened? Describe the event or trigger simply and objectively, without interpretation.</p>
            <textarea 
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="E.g., My boss sent me an email saying 'We need to talk' without any other context."
              rows={4}
              style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical', fontSize: '1.05rem', backgroundColor: '#fafafa', marginBottom: '1.5rem' }}
            />
            <button type="button" onClick={() => setStep(2)} disabled={!situation.trim()} style={{ width: '100%' }}>Continue</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Step 2: Emotion Wheel</h3>
            <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>Click a general emotion to reveal refined feelings. Select all that apply and weight their intensity.</p>
            
            {/* Suggested Emotions Section */}
            {suggestedEmotions.length > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f4f8', borderRadius: 'var(--radius)', border: '1px solid #d0e2ff' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#004fe6', display: 'block', marginBottom: '0.5rem' }}>Suggested emotions based on your situation:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {suggestedEmotions.map(emotion => {
                    const isSelected = selectedEmotions.some(e => e.name === emotion);
                    return (
                      <button
                        key={emotion}
                        type="button"
                        onClick={() => toggleEmotion(emotion)}
                        style={{
                          padding: '0.3rem 0.7rem',
                          borderRadius: '12px',
                          border: isSelected ? '1px solid var(--soft-blue)' : '1px solid #bcd0f7',
                          backgroundColor: isSelected ? '#e6f0ff' : '#fff',
                          color: isSelected ? '#004fe6' : '#555',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{emotion}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Primary Categories */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {PRIMARY_EMOTIONS.map(category => (
                <button 
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '20px', 
                    border: activeCategory === category ? '2px solid var(--sage-green)' : '1px solid #ccc',
                    backgroundColor: activeCategory === category ? '#f0f7f4' : '#fff',
                    color: activeCategory === category ? '#2b5a2b' : '#555',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Secondary Refined Emotions */}
            {activeCategory && (
              <div style={{ backgroundColor: '#fafafa', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px dashed #ccc', marginBottom: '2rem', animation: 'fadeIn 0.3s ease' }}>
                <p style={{ margin: '0 0 1rem 0', fontWeight: 500, color: '#555' }}>Refining "{activeCategory}":</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {EMOTION_WHEEL[activeCategory].map(emotion => {
                    const isSelected = selectedEmotions.some(e => e.name === emotion);
                    return (
                      <button
                        key={emotion}
                        type="button"
                        onClick={() => toggleEmotion(emotion)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '16px',
                          border: isSelected ? '1px solid var(--soft-blue)' : '1px solid #e0e0e0',
                          backgroundColor: isSelected ? '#e6f0ff' : '#fff',
                          color: isSelected ? '#004fe6' : '#666',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{emotion}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Emotions & Weighting */}
            {selectedEmotions.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--foreground)' }}>Weight Your Emotions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedEmotions.map(emotion => (
                    <div key={emotion.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#fff', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid #eee' }}>
                      <div style={{ minWidth: '120px', fontWeight: 500, color: '#444' }}>{emotion.name}</div>
                      <input 
                        type="range" 
                        min="1" max="100" 
                        value={emotion.weight} 
                        onChange={(e) => updateEmotionWeight(emotion.name, Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--soft-blue)' }}
                      />
                      <div style={{ minWidth: '40px', textAlign: 'right', color: '#666', fontSize: '0.9rem' }}>{emotion.weight}%</div>
                      <button 
                        type="button" 
                        onClick={() => toggleEmotion(emotion.name)}
                        style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '0.25rem' }}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setStep(1)} style={{ background: 'transparent', color: '#666', border: '1px solid #ccc', flex: 1 }}>Back</button>
              <button type="button" onClick={() => setStep(3)} disabled={selectedEmotions.length === 0} style={{ flex: 2 }}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Step 3: Automatic Thoughts</h3>
            <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>What went through your mind right then? What did this situation mean to you?</p>
            
            <textarea 
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="E.g., He's going to fire me. I always mess things up. I'm a complete failure."
              rows={5}
              style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical', fontSize: '1.05rem', backgroundColor: '#fafafa', marginBottom: '1rem' }}
            />

            {/* Delayed Heuristic Highlighting Output */}
            {localDistortions.length > 0 && (
              <div style={{ backgroundColor: '#fff3cd', padding: '1rem', borderRadius: 'var(--radius)', borderLeft: '4px solid #ffc107', marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#856404' }}>We noticed some potential thinking traps:</p>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#664d03' }}>
                  {localDistortions.map(d => (
                    <li key={d.id} style={{ marginBottom: '0.25rem' }}>
                      <strong>{d.name}:</strong> {" "}{d.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={() => setStep(2)} style={{ background: 'transparent', color: '#666', border: '1px solid #ccc', flex: 1 }}>Back</button>
              <button type="button" onClick={handleAnalyzeThoughts} disabled={!thought.trim()} style={{ flex: 2 }}>Identify Thinking Traps</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Step 4: Identify Thinking Traps</h3>
            <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>Select the cognitive distortions you believe you are experiencing. Read the definitions to learn more about them.</p>
            
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                <div style={{ width: '30px', height: '30px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--sage-green)', borderRadius: '50%', margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }}></div>
                <p>Generating AI suggestions...</p>
              </div>
            ) : (
              <div>
                {/* AI / Heuristic Suggestions Box */}
                {(insightsData?.insights || localDistortions.length > 0) && (
                  <div style={{ backgroundColor: '#f0f7f4', padding: '1.5rem', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--sage-green)', marginBottom: '2rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#2b5a2b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI & Heuristic Suggestions</strong>
                    {insightsData?.insights && <p style={{ color: '#333', fontSize: '0.95rem', margin: '0 0 1rem 0', lineHeight: '1.5' }}>{insightsData.insights}</p>}
                    
                    {localDistortions.length > 0 && (
                       <p style={{ margin: 0, fontSize: '0.9rem', color: '#2b5a2b' }}>
                         The system heuristically flagged: <strong>{localDistortions.map(d => d.name).join(", ")}</strong> based on keywords in your thought.
                       </p>
                    )}
                  </div>
                )}
                
                {/* Manual Selection Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {DISTORTIONS.map(distortion => {
                    const isSelected = selectedDistortions.includes(distortion.id);
                    const isSuggested = localDistortions.some(ld => ld.id === distortion.id) || 
                                        (insightsData?.suggestedDistortions && insightsData.suggestedDistortions.includes(distortion.id));
                    
                    return (
                      <div 
                        key={distortion.id}
                        onClick={() => toggleDistortion(distortion.id)}
                        style={{
                          border: isSelected ? '2px solid var(--soft-blue)' : '1px solid #e0e0e0',
                          backgroundColor: isSelected ? '#f5f9ff' : '#fff',
                          borderRadius: 'var(--radius)',
                          padding: '1.25rem',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 2px 8px rgba(0, 79, 230, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, color: isSelected ? '#004fe6' : '#222', fontSize: '1.05rem' }}>{distortion.name}</h4>
                          {isSuggested && (
                            <span style={{ backgroundColor: '#ffc107', color: '#856404', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 600 }}>Suggested</span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666', lineHeight: '1.4' }}>{distortion.description}</p>
                        
                        {/* Checkbox indicator */}
                        <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: isSelected ? 'none' : '2px solid #ccc', backgroundColor: isSelected ? 'var(--soft-blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <span style={{ color: '#fff', fontSize: '0.8rem' }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setStep(3)} style={{ background: 'transparent', color: '#666', border: '1px solid #ccc', flex: 1 }}>Back</button>
                  <button type="button" onClick={() => setStep(5)} style={{ flex: 2 }}>{selectedDistortions.length > 0 ? "Continue to Reframe" : "Skip without Distortions"}</button>
                </div>
              </div>
            )}
            {/* Global style for spinner */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
          </div>
        )}

        {step === 5 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Step 5: Alternative Thought</h3>
            
            {selectedDistortions.length > 0 ? (
               <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                 You identified: <strong>{selectedDistortionNames}</strong>. <br/>
                 Knowing this, how can you look at this situation more realistically or compassionately?
               </p>
            ) : (
               <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>How can you look at this situation more realistically or compassionately?</p>
            )}
            
            {/* Alternative Thought Suggestions */}
            <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#444', display: 'block', marginBottom: '0.75rem' }}>
                Context-based Sample Alternative Thoughts (Click to use and modify):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* AI Reframes */}
                {insightsData?.reframeSuggestions && insightsData.reframeSuggestions.map((suggestion, idx) => (
                  <button 
                    key={`ai-${idx}`}
                    type="button"
                    onClick={() => setReframe(suggestion)}
                    style={{
                      textAlign: 'left', padding: '0.8rem 1rem', borderRadius: 'var(--radius)',
                      backgroundColor: '#f0f7f4', border: '1px solid #c2e0c6', color: '#2b5a2b',
                      cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem', lineHeight: '1.4'
                    }}
                  >
                    "{suggestion}" <span style={{ float: 'right', fontSize: '0.75rem', opacity: 0.6 }}>AI Option</span>
                  </button>
                ))}
                {/* Heuristic Reframe */}
                <button 
                  type="button"
                  onClick={() => setReframe(getHeuristicReframe())}
                  style={{
                    textAlign: 'left', padding: '0.8rem 1rem', borderRadius: 'var(--radius)',
                    backgroundColor: '#f0f4f8', border: '1px solid #bcd0f7', color: '#1e40af',
                    cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem', lineHeight: '1.4'
                  }}
                >
                  "{getHeuristicReframe()}" <span style={{ float: 'right', fontSize: '0.75rem', opacity: 0.6 }}>Coping Option</span>
                </button>
              </div>
            </div>

            {/* CBT Prompts to Unlock Deeper Thinking */}
            <div style={{ marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: '#fafaf9', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#4a5d4e', display: 'block', marginBottom: '0.75rem' }}>
                💡 CBT Prompts to Unlock Deeper Thinking (Click to copy as template):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  type="button"
                  onClick={() => setReframe(`If a close friend were in this situation, I would tell them: "This is a single event, not a reflection of your worth. You are doing the best you can and have handled hard things before."`)}
                  style={{ textAlign: 'left', padding: '0.75rem', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.88rem', color: '#555', transition: 'all 0.2s' }}
                  className="prompt-card"
                >
                  <strong>👥 The Friend Test:</strong> What would you tell a friend who had this exact thought?
                </button>
                <button 
                  type="button"
                  onClick={() => setReframe(`Looking at the objective evidence: The fact is I made a mistake, but the evidence against it being a disaster is that I can fix it tomorrow and my overall track record is very solid.`)}
                  style={{ textAlign: 'left', padding: '0.75rem', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.88rem', color: '#555', transition: 'all 0.2s' }}
                  className="prompt-card"
                >
                  <strong>⚖️ Fact Checking:</strong> What is the objective evidence for and against this automatic thought?
                </button>
                <button 
                  type="button"
                  onClick={() => setReframe(`Even if the worst-case scenario happened (such as the meeting going poorly), the reality is I would feel embarrassed for a day but I would recover, learn, and move on.`)}
                  style={{ textAlign: 'left', padding: '0.75rem', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.88rem', color: '#555', transition: 'all 0.2s' }}
                  className="prompt-card"
                >
                  <strong>💭 Decatastrophizing (So What?):</strong> If the worst-case scenario happened, how would you cope?
                </button>
              </div>
            </div>
            
            <textarea 
              value={reframe}
              onChange={(e) => setReframe(e.target.value)}
              placeholder="E.g., My boss might just want to discuss a normal project update. There's no evidence I'm being fired."
              rows={5}
              style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical', fontSize: '1.05rem', backgroundColor: '#fafafa', marginBottom: '2rem' }}
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={() => setStep(4)} style={{ background: 'transparent', color: '#666', border: '1px solid #ccc', flex: 1 }}>Back</button>
              <button type="button" onClick={handleSaveEntry} disabled={loading || !reframe.trim()} style={{ flex: 2 }}>{loading ? 'Saving...' : 'Finish & Save Record'}</button>
            </div>
          </div>
        )}

      </div>

      <div>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', color: 'var(--foreground)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Past Thought Records</h2>
        
        {fetching ? (
          <p>Loading your journal...</p>
        ) : history.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
            <p style={{ color: '#888', fontSize: '1.1rem' }}>No records yet. Start your first CBT session above.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {history.map((item) => {
              const insights = item.insights ? JSON.parse(item.insights) : null;
              
              return (
                <div key={item.id} style={{ 
                  backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', 
                  padding: '1.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                    {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  
                  {/* Safely render the compiled entryText */}
                  <div style={{ fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#444', marginBottom: insights ? '1.5rem' : '0' }}>
                    {/* Render basic bolding from markdown ** -> bold */}
                    {item.entryText.split('\n').map((line, i) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <strong key={i} style={{ display: 'block', marginTop: i > 0 ? '0.5rem' : 0, color: '#222' }}>{line.replace(/\*\*/g, '')}</strong>;
                      }
                      return <span key={i} style={{ display: 'block' }}>{line}</span>;
                    })}
                  </div>
                  
                  {insights && (insights.insights || (insights.aiInsights && insights.aiInsights.insights)) && (
                    <div style={{ backgroundColor: '#f0f7f4', padding: '1.25rem', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--sage-green)' }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#2b5a2b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Insight</strong>
                      <p style={{ color: '#333', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                        {insights.insights || insights.aiInsights.insights}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
