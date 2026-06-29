"use client";

import { useState, useEffect } from 'react';
import { checkSafety } from '@/lib/safetyIntercept';
import Link from 'next/link';

function parseTimeStr(timeStr: string) {
  if (!timeStr) return { value: '15', unit: 'mins' };
  const num = parseInt(timeStr, 10);
  if (isNaN(num)) return { value: '15', unit: 'mins' };
  const unit = timeStr.toLowerCase().includes('hour') || timeStr.toLowerCase().includes('hr') ? 'hours' : 'mins';
  return { value: String(num), unit };
}

type PendingTask = {
  title: string;
  estimatedTime: string;
  emotionalIntensity: string;
  dueDate: string;
};

type WorryStep = 'input' | 'question' | 'released' | 'schedule' | 'scheduled_done';

type Victory = {
  id: number;
  createdAt: string;
  thoughtText: string;
  category: string;
};

export default function VaultsPage() {
  const [activeVault, setActiveVault] = useState<'worry' | 'victory'>('worry');

  // WORRY VAULT STATE
  const [worry, setWorry] = useState('');
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [worryStep, setWorryStep] = useState<WorryStep>('input');

  // VICTORY VAULT STATE
  const [victories, setVictories] = useState<Victory[]>([]);
  const [newVictory, setNewVictory] = useState('');
  const [victoryCategory, setVictoryCategory] = useState<'Gratitude' | 'Strength Validation' | 'Exception to Problem' | 'General'>('General');
  const [addingVictory, setAddingVictory] = useState(false);
  const [fetchingVictories, setFetchingVictories] = useState(true);

  // Fetch Victories (Victory Vault)
  async function fetchVictories() {
    setFetchingVictories(true);
    try {
      const res = await fetch('/api/positives');
      const data = await res.json();
      if (data.glimmers) setVictories(data.glimmers);
    } catch (err) {
      console.error("Failed to fetch victories:", err);
    } finally {
      setFetchingVictories(false);
    }
  }

  useEffect(() => {
    if (activeVault === 'victory') {
      fetchVictories();
    }
  }, [activeVault]);

  // WORRY VAULT HANDLERS
  async function handleWorrySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!worry.trim()) return;
    
    setCrisis(false);

    // 1. Safety Intercept
    if (checkSafety(worry)) {
      setCrisis(true);
      return;
    }

    setLoading(true);
    let resolvedTasks: any[] = [];
    try {
      // 2. Try Gemini API
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: worry, type: 'vault' })
      });
      
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'GEMINI_API_KEY_MISSING') {
          console.warn("Gemini API Key is missing. Falling back to local offline dictionary.");
        }
        throw new Error(data.error || 'API Error');
      }
      resolvedTasks = data.result;

    } catch (err: any) {
      console.error(err);
      alert(`AI Task Generation Failed: ${err.message || 'Gemini API Error. Ensure GEMINI_API_KEY is configured.'}`);
      resolvedTasks = [];
    } finally {
      setLoading(false);
      if (resolvedTasks && resolvedTasks.length > 0) {
        setPendingTasks(resolvedTasks.map(t => ({
          title: t.title || t,
          estimatedTime: t.estimatedTime || '10 mins',
          emotionalIntensity: t.emotionalIntensity || 'Low',
          dueDate: ''
        })));
        setWorryStep('question');
      }
    }
  }

  const updatePendingTask = (index: number, key: keyof PendingTask, value: string) => {
    setPendingTasks(prev => prev.map((task, idx) => 
      idx === index ? { ...task, [key]: value } : task
    ));
  };

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: pendingTasks })
      });
      if (res.ok) {
        setWorryStep('scheduled_done');
      }
    } catch (err) {
      console.error("Failed to save scheduled tasks:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleResetWorry() {
    setWorry('');
    setPendingTasks([]);
    setWorryStep('input');
    setCrisis(false);
  }

  // VICTORY VAULT HANDLERS
  async function handleVictorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newVictory.trim()) return;

    setAddingVictory(true);
    try {
      const res = await fetch('/api/positives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thoughtText: newVictory, category: victoryCategory })
      });
      if (res.ok) {
        setNewVictory('');
        setVictoryCategory('General');
        fetchVictories();
      }
    } catch (err) {
      console.error("Failed to save victory:", err);
    } finally {
      setAddingVictory(false);
    }
  }

  return (
    <div style={{ padding: '2rem 0', maxWidth: '700px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--sage-green)', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 600 }}>The Vaults</h1>
        <p style={{ fontSize: '1.1rem', color: '#555' }}>Safeguard your worries or lock in your triumphs.</p>
        <Link href="/" style={{ color: 'var(--soft-blue)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '1rem' }}>&larr; Back to Dashboard</Link>
      </header>

      {/* Vault Type Selector Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '2rem', gap: '1rem' }}>
        <button 
          type="button" 
          onClick={() => setActiveVault('worry')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeVault === 'worry' ? '3px solid var(--sage-green)' : '3px solid transparent',
            color: activeVault === 'worry' ? 'var(--sage-green)' : '#888',
            padding: '0.75rem 1.5rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 0,
            transition: 'all 0.2s'
          }}
        >
          🔒 Worry Vault
        </button>
        <button 
          type="button" 
          onClick={() => setActiveVault('victory')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeVault === 'victory' ? '3px solid var(--sage-green)' : '3px solid transparent',
            color: activeVault === 'victory' ? 'var(--sage-green)' : '#888',
            padding: '0.75rem 1.5rem',
            fontSize: '1.05rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 0,
            transition: 'all 0.2s'
          }}
        >
          🏆 Victory Vault
        </button>
      </div>

      {/* WORRY VAULT HUB */}
      {activeVault === 'worry' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          {crisis && (
            <div style={{ padding: '1.5rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: '2rem', borderLeft: '4px solid #991b1b' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Safety Alert:</strong> 
              We noticed you might be in distress. Momentum is a self-help tool. Please contact professional help immediately. <br/><br/>
              <strong>Call or text 988</strong> to reach the Suicide & Crisis Lifeline.
            </div>
          )}

          {worryStep === 'input' && (
            <form onSubmit={handleWorrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.95rem', color: '#555', fontWeight: 600 }}>Deposit a worry to offload it safely from your mind:</label>
              <textarea 
                value={worry}
                onChange={(e) => setWorry(e.target.value)}
                placeholder="What's weighing on your mind?"
                rows={5}
                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical', fontSize: '1rem', backgroundColor: '#fff' }}
              />
              <button type="submit" disabled={loading} style={{ alignSelf: 'flex-start', minWidth: '200px' }}>
                {loading ? 'Processing Gently...' : 'Secure Worry & Get Steps'}
              </button>
            </form>
          )}

          {worryStep === 'question' && (
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--foreground)', marginBottom: '1rem' }}>Worry Secured in the Vault</h2>
              <p style={{ color: '#555', marginBottom: '2rem', lineHeight: '1.6' }}>
                Your worry has been successfully written down and locked in. Now, let's decide how to approach it.
              </p>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--foreground)', marginBottom: '1.25rem' }}>Is this worry something you can take action on?</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={() => setWorryStep('schedule')}
                  style={{ flex: 1, padding: '0.75rem 1rem' }}
                >
                  Yes, let's schedule steps
                </button>
                <button 
                  type="button" 
                  onClick={() => setWorryStep('released')}
                  className="secondary"
                  style={{ flex: 1, padding: '0.75rem 1rem' }}
                >
                  No, it's out of my control
                </button>
              </div>
            </div>
          )}

          {worryStep === 'released' && (
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍃</div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--foreground)', marginBottom: '1rem' }}>Letting it Go</h2>
              <p style={{ color: '#555', marginBottom: '2rem', lineHeight: '1.6', maxWidth: '480px', marginInline: 'auto' }}>
                Since this worry is out of your control, carrying it will not change the outcome. 
                We have locked it safely in the vault so your mind doesn't have to carry it. Take a deep breath and let it rest.
              </p>
              <button type="button" onClick={handleResetWorry} style={{ padding: '0.75rem 2rem' }}>
                Release & Done
              </button>
            </div>
          )}

          {worryStep === 'schedule' && (
            <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Schedule Your Steps</h2>
                <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '1.5rem' }}>Review, edit, and schedule the coping steps generated from your worry.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {pendingTasks.map((task, index) => (
                    <div key={index} style={{ padding: '1.25rem', border: '1px solid #f0f0f0', borderRadius: 'var(--radius)', backgroundColor: '#fafafa' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#555' }}>Step {index + 1}</label>
                          <input 
                            type="text" 
                            value={task.title} 
                            onChange={e => updatePendingTask(index, 'title', e.target.value)} 
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#555' }}>Approx Time</label>
                            {(() => {
                              const parsed = parseTimeStr(task.estimatedTime);
                              return (
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <input 
                                    type="number" 
                                    min="1"
                                    value={parsed.value} 
                                    onChange={e => updatePendingTask(index, 'estimatedTime', `${e.target.value} ${parsed.unit}`)} 
                                    style={{ width: '60px', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                                  />
                                  <select
                                    value={parsed.unit}
                                    onChange={e => updatePendingTask(index, 'estimatedTime', `${parsed.value} ${e.target.value}`)}
                                    style={{ flex: 1, padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                                  >
                                    <option value="mins">Minutes</option>
                                    <option value="hours">Hours</option>
                                  </select>
                                </div>
                              );
                            })()}
                          </div>
                          
                          <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#555' }}>Emotional Intensity / Cost</label>
                            <select 
                              value={task.emotionalIntensity} 
                              onChange={e => updatePendingTask(index, 'emotionalIntensity', e.target.value)} 
                              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                            >
                              <option>Low</option>
                              <option>Medium</option>
                              <option>High</option>
                            </select>
                          </div>

                          <div style={{ flex: 2, minWidth: '180px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#555' }}>Schedule Date & Time</label>
                            <input 
                              type="datetime-local" 
                              value={task.dueDate} 
                              onChange={e => updatePendingTask(index, 'dueDate', e.target.value)} 
                              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setWorryStep('question')} className="secondary" style={{ flex: 1 }}>Back</button>
                <button type="submit" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Scheduling...' : 'Save & Schedule to Planner'}
                </button>
              </div>
            </form>
          )}

          {worryStep === 'scheduled_done' && (
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--foreground)', marginBottom: '1rem' }}>Steps Scheduled!</h2>
              <p style={{ color: '#555', marginBottom: '2rem', lineHeight: '1.6', maxWidth: '480px', marginInline: 'auto' }}>
                Your steps have been successfully scheduled and written to your Action Planner. You can review and complete them anytime.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link href="/tasks" style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--sage-green)',
                  color: '#fff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontWeight: 500
                }}>
                  Go to Action Planner
                </Link>
                <button type="button" onClick={handleResetWorry} className="secondary" style={{ padding: '0.75rem 1.5rem' }}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VICTORY VAULT HUB */}
      {activeVault === 'victory' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          <form onSubmit={handleVictorySubmit} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ flex: '2 1 250px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: '#555', fontWeight: 600 }}>Deposit a Win or Gratitude in your Victory Vault:</label>
              <input 
                type="text" 
                value={newVictory} 
                onChange={e => setNewVictory(e.target.value)} 
                placeholder="E.g., Felt warm sunshine during lunch walk. Finished project draft."
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ width: '160px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: '#555', fontWeight: 600 }}>Category</label>
              <select
                value={victoryCategory}
                onChange={e => setVictoryCategory(e.target.value as any)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.95rem', backgroundColor: '#fff' }}
              >
                <option value="General">General Win</option>
                <option value="Gratitude">Gratitude</option>
                <option value="Strength Validation">Strength</option>
                <option value="Exception to Problem">Exception to Trap</option>
              </select>
            </div>
            <button type="submit" disabled={addingVictory} style={{ padding: '0.75rem 1.75rem', height: '45px', backgroundColor: '#e9c46a', color: '#264653', fontWeight: 600 }}>
              {addingVictory ? 'Saving...' : 'Lock In Victory'}
            </button>
          </form>

          {/* Victory Grid */}
          {fetchingVictories ? (
            <p>Loading victories...</p>
          ) : victories.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
              <p style={{ color: '#888', fontSize: '1.15rem', lineHeight: '1.6', maxWidth: '400px', marginInline: 'auto' }}>
                Your Victory Vault is currently empty. Whenever you experience a win, a positive reflection, or a glimmer of happiness, write it down here to preserve it.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {victories.map(v => (
                <div key={v.id} style={{ 
                  backgroundColor: '#fffbeb', 
                  border: '1px solid #fef3c7', 
                  borderRadius: 'var(--radius)', 
                  padding: '1.5rem', 
                  boxShadow: '0 2px 8px rgba(253, 230, 138, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '130px'
                }}>
                  <div>
                    <span style={{ 
                      backgroundColor: '#fef3c7', 
                      color: '#b45309', 
                      fontSize: '0.68rem', 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: '6px', 
                      fontWeight: 600,
                      display: 'inline-block',
                      marginBottom: '0.5rem',
                      border: '1px solid #fde68a'
                    }}>
                      {v.category || 'General'}
                    </span>
                    <p style={{ margin: '0 0 1rem 0', color: '#78350f', fontSize: '0.98rem', lineHeight: '1.5', fontWeight: 500 }}>
                      "{v.thoughtText}"
                    </p>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#b45309', borderTop: '1px dashed #fde68a', paddingTop: '0.5rem', display: 'block' }}>
                    🏆 Saved {new Date(v.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
