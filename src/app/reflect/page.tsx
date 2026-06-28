"use client";

import { useState } from 'react';
import Link from 'next/link';

type ReflectStep = 'intro' | 'release' | 'plan' | 'rest';

export default function EndOfDayReflection() {
  const [step, setStep] = useState<ReflectStep>('intro');
  
  // Step 1: Release
  const [positive, setPositive] = useState('');
  const [worry, setWorry] = useState('');
  const [releasingWorry, setReleasingWorry] = useState(false);
  
  // Step 2: Plan
  const [tomorrowTask1, setTomorrowTask1] = useState('');
  const [tomorrowTask2, setTomorrowTask2] = useState('');
  const [tomorrowTask3, setTomorrowTask3] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  async function handleReleaseWorry() {
    if (!positive.trim() && !worry.trim()) return;

    setReleasingWorry(true);
    
    // Animate worry floating away for 2 seconds
    setTimeout(async () => {
      // Save positive reflection to the Journal database
      if (positive.trim()) {
        try {
          const entryText = `**End-of-Day Gratitude:**\n${positive}`;
          await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryText, insights: null })
          });
        } catch (err) {
          console.error("Failed to save night reflection:", err);
        }
      }
      
      setReleasingWorry(false);
      setStep('plan');
    }, 2000);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setSavingPlan(true);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Set to 9:00 AM tomorrow local ISO string
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T09:00`;

    const tasksToInsert = [];
    if (tomorrowTask1.trim()) tasksToInsert.push({ title: tomorrowTask1.trim(), estimatedTime: '15 mins', emotionalIntensity: 'Low', dueDate: tomorrowStr });
    if (tomorrowTask2.trim()) tasksToInsert.push({ title: tomorrowTask2.trim(), estimatedTime: '15 mins', emotionalIntensity: 'Low', dueDate: tomorrowStr });
    if (tomorrowTask3.trim()) tasksToInsert.push({ title: tomorrowTask3.trim(), estimatedTime: '15 mins', emotionalIntensity: 'Low', dueDate: tomorrowStr });

    if (tasksToInsert.length > 0) {
      try {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: tasksToInsert })
        });
      } catch (err) {
        console.error("Failed to save tomorrow's plan:", err);
      }
    }

    setSavingPlan(false);
    setStep('rest');
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '2rem auto', 
      padding: '2.5rem', 
      backgroundColor: '#fdfbf7', // Warm cream background for winding down
      borderRadius: '16px', 
      border: '1px solid #f1e9db',
      boxShadow: '0 8px 30px rgba(143, 188, 143, 0.08)',
      minHeight: '450px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      animation: 'fadeIn 0.6s ease'
    }}>
      {step === 'intro' && (
        <div style={{ textAlign: 'center', margin: 'auto 0', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🌙</div>
          <h1 style={{ color: '#4a5d4e', fontFamily: 'serif', fontSize: '2.2rem', marginBottom: '1rem', fontWeight: 600 }}>End of Day Reflection</h1>
          <p style={{ color: '#6e7e73', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2.5rem', maxWidth: '440px', marginInline: 'auto' }}>
            Take a few moments to offload your thoughts, release today's worries, and set a gentle path for tomorrow so your mind can rest.
          </p>
          <button type="button" onClick={() => setStep('release')} style={{ backgroundColor: '#7da084', padding: '0.8rem 2.5rem', fontSize: '1.05rem' }}>
            Begin Reflection
          </button>
        </div>
      )}

      {step === 'release' && (
        <div style={{ animation: 'fadeIn 0.4s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          <div>
            <h2 style={{ color: '#4a5d4e', fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 600 }}>Release the Day</h2>
            <p style={{ color: '#778', fontSize: '0.95rem', margin: 0 }}>Gently acknowledge a positive moment and put today's worries to rest.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#5a6b5e', marginBottom: '0.4rem' }}>What is one thing that went well today?</label>
              <textarea 
                value={positive}
                onChange={e => setPositive(e.target.value)}
                placeholder="E.g., I completed a task I was avoiding, or had a warm conversation."
                rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #dcd3c4', fontFamily: 'inherit', resize: 'none', backgroundColor: '#fff', fontSize: '0.95rem' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#5a6b5e', marginBottom: '0.4rem' }}>Is there a worry you want to leave behind in the vault?</label>
              <textarea 
                value={worry}
                onChange={e => setWorry(e.target.value)}
                placeholder="Write down any residual worries to leave them here."
                rows={3}
                disabled={releasingWorry}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  border: '1px solid #dcd3c4', 
                  fontFamily: 'inherit', 
                  resize: 'none', 
                  backgroundColor: '#fff',
                  fontSize: '0.95rem',
                  opacity: releasingWorry ? 0 : 1,
                  transform: releasingWorry ? 'translateY(-30px) scale(0.9)' : 'none',
                  transition: 'opacity 2s ease, transform 2s ease'
                }}
              />
              {releasingWorry && (
                <div style={{ 
                  position: 'absolute', 
                  top: '40px', 
                  left: 0, 
                  right: 0, 
                  textAlign: 'center', 
                  color: 'var(--sage-green)',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  animation: 'floatUp 2s ease-out'
                }}>
                  💨 Releasing worry from your mind...
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            <button 
              type="button" 
              onClick={handleReleaseWorry} 
              disabled={releasingWorry || (!positive.trim() && !worry.trim())}
              style={{ flex: 1, backgroundColor: '#7da084', padding: '0.75rem' }}
            >
              {releasingWorry ? 'Releasing...' : 'Lock & Release Today'}
            </button>
          </div>
        </div>
      )}

      {step === 'plan' && (
        <form onSubmit={handleSavePlan} style={{ animation: 'fadeIn 0.4s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          <div>
            <h2 style={{ color: '#4a5d4e', fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 600 }}>Plan Tomorrow</h2>
            <p style={{ color: '#778', fontSize: '0.95rem', margin: 0 }}>List up to 3 gentle steps for tomorrow, so you don't have to carry them in your thoughts overnight.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem' }}>Tomorrow's Step 1</label>
              <input 
                type="text" 
                value={tomorrowTask1} 
                onChange={e => setTomorrowTask1(e.target.value)} 
                placeholder="E.g., Review the document first thing"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #dcd3c4' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem' }}>Tomorrow's Step 2 (Optional)</label>
              <input 
                type="text" 
                value={tomorrowTask2} 
                onChange={e => setTomorrowTask2(e.target.value)} 
                placeholder="E.g., Take a 15-minute stretch break"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #dcd3c4' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem' }}>Tomorrow's Step 3 (Optional)</label>
              <input 
                type="text" 
                value={tomorrowTask3} 
                onChange={e => setTomorrowTask3(e.target.value)} 
                placeholder="E.g., Call a friend at lunch"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #dcd3c4' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            <button type="submit" disabled={savingPlan} style={{ flex: 1, backgroundColor: '#7da084', padding: '0.75rem' }}>
              {savingPlan ? 'Saving Steps...' : 'Schedule for Tomorrow & Finish'}
            </button>
          </div>
        </form>
      )}

      {step === 'rest' && (
        <div style={{ textAlign: 'center', margin: 'auto 0', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✨</div>
          <h2 style={{ color: '#4a5d4e', fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 600 }}>Your Day is Done</h2>
          <p style={{ color: '#6e7e73', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2.5rem', maxWidth: '440px', marginInline: 'auto' }}>
            Your worries are secured, your accomplishments are recognized, and tomorrow's steps are planned. You have cleared the path. 
            <br /><br />
            <strong>Rest well.</strong>
          </p>
          <Link href="/" style={{
            display: 'inline-block',
            backgroundColor: '#7da084',
            color: '#fff',
            padding: '0.75rem 2.5rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500
          }}>
            Back to Dashboard
          </Link>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-50px); }
        }
      `}} />
    </div>
  );
}
