"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ReflectStep = 'intro' | 'decision_follow_up' | 'release' | 'plan' | 'rest';

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

  // Expired Decisions Check-in
  const [expiredDecisions, setExpiredDecisions] = useState<any[]>([]);
  const [currentExpiredIndex, setCurrentExpiredIndex] = useState(0);
  const [chosenOptionId, setChosenOptionId] = useState<string>('');
  const [actualFeeling, setActualFeeling] = useState<string>('Proud');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  useEffect(() => {
    async function getExpired() {
      try {
        const res = await fetch('/api/decisions/expired');
        if (res.ok) {
          const data = await res.json();
          if (data.expiredDecisions) {
            setExpiredDecisions(data.expiredDecisions);
          }
        }
      } catch (err) {
        console.error("Failed to load expired decisions:", err);
      }
    }
    getExpired();
  }, []);

  const handleBegin = () => {
    if (expiredDecisions.length > 0) {
      setStep('decision_follow_up');
    } else {
      setStep('release');
    }
  };

  async function handleSubmitFollowUp() {
    if (!chosenOptionId) {
      alert("Please select the option you chose.");
      return;
    }
    setSubmittingFollowUp(true);
    try {
      const decision = expiredDecisions[currentExpiredIndex];
      const res = await fetch('/api/decisions/expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionId: decision.id,
          chosenOptionId: parseInt(chosenOptionId),
          actualFeeling
        })
      });

      if (!res.ok) throw new Error("Failed to submit follow up");

      // Move to next decision or proceed to release
      if (currentExpiredIndex + 1 < expiredDecisions.length) {
        setCurrentExpiredIndex(currentExpiredIndex + 1);
        setChosenOptionId('');
        setActualFeeling('Proud');
      } else {
        setStep('release');
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting follow up.");
    } finally {
      setSubmittingFollowUp(false);
    }
  }

  async function handleReleaseWorry() {
    if (!positive.trim() && !worry.trim()) return;

    setReleasingWorry(true);
    
    // Animate worry floating away for 2 seconds
    setTimeout(async () => {
      // Save positive reflection to the Journal database
      if (positive.trim()) {
        try {
          await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              entryType: 'positive',
              situation: 'End-of-Day Reflection',
              emotionsJson: JSON.stringify([{ name: 'Grateful', weight: 80 }]),
              reframedThought: positive.trim()
            })
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

  const currentDecision = expiredDecisions[currentExpiredIndex];

  return (
    <div className="card-premium animate-fade-in" style={{ 
      maxWidth: '600px', 
      margin: '2rem auto', 
      padding: '2.5rem', 
      backgroundColor: '#fcfaf6', // Soothing warm sand tone
      borderColor: 'hsl(38, 30%, 90%)',
      boxShadow: 'var(--card-shadow)',
      minHeight: '480px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      {step === 'intro' && (
        <div style={{ textAlign: 'center', margin: 'auto 0', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🌙</div>
          <h1 className="serif-heading" style={{ color: 'var(--sage-green)', fontSize: '2.2rem', marginBottom: '1rem', fontWeight: 700 }}>End of Day Reflection</h1>
          <p style={{ color: 'hsl(200, 10%, 45%)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2.5rem', maxWidth: '440px', marginInline: 'auto', fontWeight: 500 }}>
            Take a few moments to offload your thoughts, release today's worries, and set a gentle path for tomorrow so your mind can rest.
          </p>
          <button type="button" onClick={handleBegin} className="btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem' }}>
            Begin Reflection
          </button>
        </div>
      )}

      {/* Decision Follow-up Recap Step */}
      {step === 'decision_follow_up' && currentDecision && (
        <div style={{ animation: 'fadeIn 0.4s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          <div>
            <span className="badge-custom badge-sage" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', fontWeight: 'bold' }}>
              Recap check-in {currentExpiredIndex + 1} of {expiredDecisions.length}
            </span>
            <h2 className="serif-heading" style={{ color: 'var(--sage-green)', fontSize: '1.6rem', marginTop: '0.75rem', marginBottom: '0.5rem', fontWeight: 700 }}>🎯 Decision Check-in</h2>
            <p style={{ color: 'hsl(200, 10%, 45%)', fontSize: '0.98rem', lineHeight: 1.5, fontWeight: 500 }}>
              You recently made a decision about <strong>"{currentDecision.title}"</strong>. Which option did you choose, and how do you feel about it now?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)', opacity: 0.8, marginBottom: '0.4rem' }}>Which option did you choose?</label>
              <select
                value={chosenOptionId}
                onChange={e => setChosenOptionId(e.target.value)}
                className="form-input"
                style={{ width: '100%', fontSize: '0.95rem', backgroundColor: '#fff' }}
              >
                <option value="">-- Select Option --</option>
                {currentDecision.options?.map((opt: any) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)', opacity: 0.8, marginBottom: '0.4rem' }}>How do you feel about it now?</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['Proud', 'Indifferent', 'Regretful'].map(feeling => (
                  <button
                    key={feeling}
                    type="button"
                    onClick={() => setActualFeeling(feeling)}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      border: actualFeeling === feeling ? 'none' : '1px solid var(--border)',
                      borderRadius: '8px',
                      backgroundColor: actualFeeling === feeling ? 'var(--sage-green)' : '#fff',
                      color: actualFeeling === feeling ? '#fff' : 'hsl(200, 10%, 45%)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      transform: 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {feeling}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            <button 
              type="button" 
              onClick={handleSubmitFollowUp} 
              disabled={submittingFollowUp || !chosenOptionId}
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem' }}
            >
              {submittingFollowUp ? 'Submitting...' : 'Submit Check-in'}
            </button>
          </div>
        </div>
      )}

      {step === 'release' && (
        <div style={{ animation: 'fadeIn 0.4s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          <div>
            <h2 className="serif-heading" style={{ color: 'var(--sage-green)', fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 700 }}>Release the Day</h2>
            <p style={{ color: 'hsl(200, 10%, 45%)', fontSize: '0.98rem', margin: 0, fontWeight: 500 }}>Gently acknowledge a positive moment and put today's worries to rest.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)', opacity: 0.8, marginBottom: '0.4rem' }}>What is one thing that went well today?</label>
              <textarea 
                value={positive}
                onChange={e => setPositive(e.target.value)}
                placeholder="E.g., I completed a task I was avoiding, or had a warm conversation."
                rows={3}
                className="form-input"
                style={{ fontSize: '0.95rem', resize: 'none' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)', opacity: 0.8, marginBottom: '0.4rem' }}>Is there a worry you want to leave behind in the vault?</label>
              <textarea 
                value={worry}
                onChange={e => setWorry(e.target.value)}
                placeholder="Write down any residual worries to leave them here."
                rows={3}
                disabled={releasingWorry}
                className="form-input"
                style={{ 
                  fontSize: '0.95rem',
                  resize: 'none', 
                  opacity: releasingWorry ? 0 : 1,
                  transform: releasingWorry ? 'translateY(-30px) scale(0.9)' : 'none',
                  transition: 'opacity 2s ease, transform 2s ease'
                }}
              />
              {releasingWorry && (
                <div style={{ 
                  position: 'absolute', 
                  top: '45px', 
                  left: 0, 
                  right: 0, 
                  textAlign: 'center', 
                  color: 'var(--sage-green)',
                  fontWeight: 700,
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
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem' }}
            >
              {releasingWorry ? 'Releasing...' : 'Lock & Release Today'}
            </button>
          </div>
        </div>
      )}

      {step === 'plan' && (
        <form onSubmit={handleSavePlan} style={{ animation: 'fadeIn 0.4s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          <div>
            <h2 className="serif-heading" style={{ color: 'var(--sage-green)', fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 700 }}>Plan Tomorrow</h2>
            <p style={{ color: 'hsl(200, 10%, 45%)', fontSize: '0.98rem', margin: 0, fontWeight: 500 }}>List up to 3 gentle steps for tomorrow, so you don't have to carry them in your thoughts overnight.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', opacity: 0.8, marginBottom: '0.25rem' }}>Tomorrow's Step 1</label>
              <input 
                type="text" 
                value={tomorrowTask1} 
                onChange={e => setTomorrowTask1(e.target.value)} 
                placeholder="E.g., Review the document first thing"
                className="form-input"
                style={{ padding: '0.65rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', opacity: 0.8, marginBottom: '0.25rem' }}>Tomorrow's Step 2 (Optional)</label>
              <input 
                type="text" 
                value={tomorrowTask2} 
                onChange={e => setTomorrowTask2(e.target.value)} 
                placeholder="E.g., Take a 15-minute stretch break"
                className="form-input"
                style={{ padding: '0.65rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', opacity: 0.8, marginBottom: '0.25rem' }}>Tomorrow's Step 3 (Optional)</label>
              <input 
                type="text" 
                value={tomorrowTask3} 
                onChange={e => setTomorrowTask3(e.target.value)} 
                placeholder="E.g., Call a friend at lunch"
                className="form-input"
                style={{ padding: '0.65rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            <button type="submit" disabled={savingPlan} className="btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
              {savingPlan ? 'Saving Steps...' : 'Schedule for Tomorrow & Finish'}
            </button>
          </div>
        </form>
      )}

      {step === 'rest' && (
        <div style={{ textAlign: 'center', margin: 'auto 0', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✨</div>
          <h2 className="serif-heading" style={{ color: 'var(--sage-green)', fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 700 }}>Your Day is Done</h2>
          <p style={{ color: 'hsl(200, 10%, 45%)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2.5rem', maxWidth: '440px', marginInline: 'auto', fontWeight: 500 }}>
            Your worries are secured, your accomplishments are recognized, and tomorrow's steps are planned. You have cleared the path. 
            <br /><br />
            <strong>Rest well.</strong>
          </p>
          <Link href="/" className="btn-primary" style={{
            display: 'inline-block',
            padding: '0.75rem 2.5rem',
            textDecoration: 'none'
          }}>
            Back to Dashboard
          </Link>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-50px); }
        }
      `}} />
    </div>
  );
}
