"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';

type JournalEntry = {
  id: number;
  createdAt: string;
  entryType: 'negative' | 'positive';
  situation: string;
  emotionsJson: string;
  automaticThought: string | null;
  distortionsJson: string | null;
  reframedThought: string;
};

const DISTORTION_NAMES: Record<string, string> = {
  "all-or-nothing": "All-or-Nothing",
  "catastrophizing": "Catastrophizing",
  "should-statements": "Should Statements",
  "mind-reading": "Mind Reading",
  "emotional-reasoning": "Emotional Reasoning",
  "overgeneralization": "Overgeneralization"
};

const DONUT_COLORS = [
  'var(--soft-blue)',
  'var(--sage-green)',
  'var(--accent-gold)',
  'hsl(200, 40%, 65%)', // soft slate blue
  'hsl(140, 20%, 65%)', // soft moss sage
  'hsl(38, 45%, 65%)',  // soft ochre gold
  'hsl(200, 10%, 55%)',  // calming grey
];

const getEmotionCategory = (name: string): 'positive' | 'threat' | 'reactive' | 'unknown' => {
  const n = name.toLowerCase();
  
  const positive = ['grateful', 'proud', 'relieved', 'energized', 'happy', 'calm', 'content', 'hopeful', 'excited', 'peaceful', 'inspired', 'elated', 'serene'];
  const threat = ['anxiety', 'overwhelm', 'frustrated', 'frustration', 'fear', 'nervous', 'stressed', 'panicked', 'irritated', 'anxious', 'overwhelmed'];
  const reactive = ['anger', 'sadness', 'sad', 'angry', 'grief', 'hurt', 'guilt', 'shame', 'regretful', 'lonely', 'embarrassment'];

  if (positive.some(e => n.includes(e))) return 'positive';
  if (threat.some(e => n.includes(e))) return 'threat';
  if (reactive.some(e => n.includes(e))) return 'reactive';
  return 'unknown';
};

const getEmotionColor = (name: string) => {
  const cat = getEmotionCategory(name);
  if (cat === 'positive') return 'var(--sage-green)';
  if (cat === 'threat') return 'var(--accent-gold)';
  if (cat === 'reactive') return 'var(--accent-danger)';
  return 'hsl(200, 10%, 50%)';
};

export default function InsightsPage() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [fetchingStats, setFetchingStats] = useState(true);
  const [viewStyle, setViewStyle] = useState<'frequency' | 'timeline'>('frequency');
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'resourceful' | 'distressing'>('all');
  const [sortBy, setSortBy] = useState<'intensity' | 'frequency'>('frequency');

  async function fetchStats() {
    setFetchingStats(true);
    try {
      const res = await fetch('/api/journal');
      const data = await res.json();
      if (data.entries) setJournalEntries(data.entries);
    } catch (err) {
      console.error("Failed to fetch stats data:", err);
    } finally {
      setFetchingStats(false);
    }
  }

  useEffect(() => {
    fetchStats();
    setMounted(true);
  }, []);

  // Process Emotion Stats
  const getEmotionStats = () => {
    const emotionTotals: Record<string, { totalWeight: number, count: number }> = {};
    
    const normalizeName = (rawName: string): string => {
      const trimmed = rawName.trim();
      const lower = trimmed.toLowerCase();
      if (lower === 'overwhelm' || lower === 'overwhelmed') return 'Overwhelmed';
      if (lower === 'frustrated' || lower === 'frustration') return 'Frustrated';
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    };

    journalEntries.forEach(entry => {
      if (!entry.emotionsJson) return;
      try {
        const emotions = JSON.parse(entry.emotionsJson);
        if (Array.isArray(emotions)) {
          emotions.forEach((e: any) => {
            const name = normalizeName(e.name);
            if (!emotionTotals[name]) {
              emotionTotals[name] = { totalWeight: 0, count: 0 };
            }
            emotionTotals[name].totalWeight += (e.weight || 50);
            emotionTotals[name].count += 1;
          });
        }
      } catch (err) {}
    });

    const stats = Object.keys(emotionTotals).map(name => {
      const { totalWeight, count } = emotionTotals[name];
      return {
        name,
        averageIntensity: Math.round(totalWeight / count),
        frequency: count,
        category: getEmotionCategory(name)
      };
    });

    let processedData = [...stats];

    // 1. Apply Filter
    if (activeTab === 'resourceful') {
      processedData = processedData.filter(d => d.category === 'positive');
    } else if (activeTab === 'distressing') {
      processedData = processedData.filter(d => d.category === 'threat' || d.category === 'reactive');
    }

    // 2. Apply Sort
    if (sortBy === 'intensity') {
      processedData.sort((a, b) => b.averageIntensity - a.averageIntensity);
    } else if (sortBy === 'frequency') {
      processedData.sort((a, b) => b.frequency - a.frequency);
    }

    return processedData;
  };

  // Process Distortion Stats
  const getDistortionStats = () => {
    const distortionCounts: Record<string, number> = {};
    let totalCount = 0;

    journalEntries.forEach(entry => {
      if (!entry.distortionsJson) return;
      try {
        const distortions = JSON.parse(entry.distortionsJson);
        if (Array.isArray(distortions)) {
          distortions.forEach((d: string) => {
            distortionCounts[d] = (distortionCounts[d] || 0) + 1;
            totalCount += 1;
          });
        }
      } catch (err) {}
    });

    return Object.keys(distortionCounts).map(id => {
      const count = distortionCounts[id];
      return {
        id,
        name: DISTORTION_NAMES[id] || id,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
      };
    }).sort((a, b) => b.count - a.count);
  };

  // Process Timeline Data
  const getTimelineData = () => {
    const sorted = [...journalEntries]
      .filter(e => e.emotionsJson)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const points: { date: string; positive: number; negative: number }[] = [];

    sorted.forEach(entry => {
      try {
        const emotions = JSON.parse(entry.emotionsJson);
        if (Array.isArray(emotions) && emotions.length > 0) {
          let posSum = 0, posCount = 0;
          let negSum = 0, negCount = 0;

          emotions.forEach((em: any) => {
            const isPos = [
              "Happy", "Proud", "Optimistic", "Calm", "Grateful", "Content", 
              "Relieved", "Hopeful", "Excited", "Peaceful", "Energized", 
              "Inspired", "Elated", "Serene"
            ].includes(em.name);
            if (isPos) {
              posSum += em.weight;
              posCount++;
            } else {
              negSum += em.weight;
              negCount++;
            }
          });

          const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const existing = points.find(p => p.date === dateStr);
          const computedPos = posCount > 0 ? Math.round(posSum / posCount) : 0;
          const computedNeg = negCount > 0 ? Math.round(negSum / negCount) : 0;

          if (existing) {
            existing.positive = existing.positive > 0 ? Math.round((existing.positive + computedPos) / 2) : computedPos;
            existing.negative = existing.negative > 0 ? Math.round((existing.negative + computedNeg) / 2) : computedNeg;
          } else {
            points.push({
              date: dateStr,
              positive: computedPos,
              negative: computedNeg
            });
          }
        }
      } catch (err) {}
    });

    return points.slice(-30);
  };

  const emotionStats = getEmotionStats();
  const distortionStats = getDistortionStats();
  const timelinePoints = getTimelineData();
  const totalDistortionsCount = distortionStats.reduce((sum, item) => sum + item.count, 0);

  // Custom Tooltip Components
  const CustomEmotionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#fff', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)', fontSize: '0.88rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--foreground)' }}>{data.name}</p>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--soft-blue-hover)', fontWeight: 700 }}>Avg. Intensity: {data.averageIntensity}%</p>
          <p style={{ margin: 0, color: 'hsl(200, 10%, 45%)', fontWeight: 500 }}>Logged: {data.frequency} times</p>
        </div>
      );
    }
    return null;
  };

  const CustomDistortionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#fff', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)', fontSize: '0.88rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--foreground)' }}>{data.name}</p>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--soft-blue-hover)', fontWeight: 700 }}>Count: {data.count} times</p>
          <p style={{ margin: 0, color: 'hsl(200, 10%, 45%)', fontWeight: 500 }}>Share: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)', fontSize: '0.88rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--foreground)', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', marginBottom: '0.35rem' }}>{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ margin: '0.25rem 0 0 0', color: p.stroke || p.color, fontWeight: 700 }}>
              {p.name}: {p.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--sage-green)', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 700 }}>Wellness Trends</h1>
        <p style={{ fontSize: '1.1rem', color: 'hsl(200, 10%, 45%)', fontWeight: 500 }}>Analyze emotional patterns and tracing distortion frequencies over time.</p>
        <Link href="/" style={{ color: 'var(--soft-blue)', textDecoration: 'none', fontWeight: 700, display: 'inline-block', marginTop: '0.5rem' }}>&larr; Back to Dashboard</Link>
      </header>

      {/* Advanced Chart Toggle Controller */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2.5rem', backgroundColor: 'var(--border)', padding: '0.35rem', borderRadius: '12px', maxWidth: '420px', marginInline: 'auto' }}>
        <button 
          type="button" 
          onClick={() => setViewStyle('frequency')}
          style={{ 
            flex: 1, 
            padding: '0.65rem 1.25rem', 
            borderRadius: '10px', 
            border: 'none', 
            backgroundColor: viewStyle === 'frequency' ? '#fff' : 'transparent',
            color: viewStyle === 'frequency' ? 'var(--foreground)' : 'hsl(200, 10%, 50%)',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: viewStyle === 'frequency' ? 'var(--card-shadow)' : 'none',
            cursor: 'pointer',
            transform: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          📊 Frequency Metrics
        </button>
        <button 
          type="button" 
          onClick={() => setViewStyle('timeline')}
          style={{ 
            flex: 1, 
            padding: '0.65rem 1.25rem', 
            borderRadius: '10px', 
            border: 'none', 
            backgroundColor: viewStyle === 'timeline' ? '#fff' : 'transparent',
            color: viewStyle === 'timeline' ? 'var(--foreground)' : 'hsl(200, 10%, 50%)',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: viewStyle === 'timeline' ? 'var(--card-shadow)' : 'none',
            cursor: 'pointer',
            transform: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          📈 Timeline Fluctuations
        </button>
      </div>

      {fetchingStats ? (
        <p style={{ textAlign: 'center', color: 'hsl(200, 10%, 45%)' }}>Analyzing wellness trends...</p>
      ) : !mounted ? (
        <p style={{ textAlign: 'center', color: 'hsl(200, 10%, 45%)' }}>Loading interactive charts...</p>
      ) : journalEntries.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <p style={{ color: 'hsl(200, 10%, 50%)', fontSize: '1.15rem' }}>
            Complete a guided CBT thought record in the **Journal** tab to begin generating wellness trends.
          </p>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          
          {viewStyle === 'frequency' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Emotion Intensities Chart */}
              <div className="card-premium" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--foreground)', marginBottom: '0.25rem', fontWeight: 700 }}>Emotion Trends</h3>
                <p style={{ fontSize: '0.92rem', color: 'hsl(200, 10%, 45%)', marginBottom: '2rem', fontWeight: 500 }}>Shows which emotions are logged most frequently, along with their average intensity.</p>
                
                {/* Controls Bar: Category Tabs & Sorting Dropdown */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  {/* Category Tabs */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: activeTab === 'all' ? 'var(--foreground)' : 'transparent',
                        color: activeTab === 'all' ? '#fff' : 'hsl(200, 10%, 45%)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('resourceful')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: activeTab === 'resourceful' ? 'var(--sage-green)' : 'transparent',
                        color: activeTab === 'resourceful' ? '#fff' : 'hsl(200, 10%, 45%)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Resourceful Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('distressing')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: activeTab === 'distressing' ? 'var(--accent-gold)' : 'transparent',
                        color: activeTab === 'distressing' ? '#fff' : 'hsl(200, 10%, 45%)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Distressing Only
                    </button>
                  </div>

                  {/* Sorting Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(200, 10%, 45%)' }}>Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        backgroundColor: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="frequency">Frequency (Most frequent first)</option>
                      <option value="intensity">Intensity (Highest first)</option>
                    </select>
                  </div>
                </div>

                {emotionStats.length === 0 ? (
                  <p style={{ color: 'hsl(200, 10%, 50%)', fontSize: '0.95rem', padding: '1rem 0' }}>
                    {journalEntries.length > 0 ? "No emotions match the selected filter category." : "No structured emotion data recorded yet."}
                  </p>
                ) : (
                  <div>
                    <div style={{ height: `${Math.max(320, emotionStats.length * 35)}px`, minHeight: '320px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={emotionStats}
                           layout="vertical"
                           margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" width={110} tick={{ fontSize: '12px', fontWeight: 600 }} />
                          <Tooltip content={<CustomEmotionTooltip />} />
                          <Bar dataKey="averageIntensity" radius={[0, 10, 10, 0]} barSize={18}>
                            {emotionStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getEmotionColor(entry.name)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Chart Legend */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--sage-green)', borderRadius: '50%' }} />
                        <span style={{ color: 'hsl(200, 10%, 45%)' }}>Positive / Resourceful</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--accent-gold)', borderRadius: '50%' }} />
                        <span style={{ color: 'hsl(200, 10%, 45%)' }}>High-Stress / Threat</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--accent-danger)', borderRadius: '50%' }} />
                        <span style={{ color: 'hsl(200, 10%, 45%)' }}>Heavy / Reactive</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Distortion Frequencies Donut Chart */}
              <div className="card-premium" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--foreground)', marginBottom: '0.25rem', fontWeight: 700 }}>Thinking Trap Frequency</h3>
                <p style={{ fontSize: '0.92rem', color: 'hsl(200, 10%, 45%)', marginBottom: '2rem', fontWeight: 500 }}>Frequency distribution of cognitive distortions flagged in your thought records.</p>
                
                {distortionStats.length === 0 ? (
                  <p style={{ color: 'hsl(200, 10%, 50%)', fontSize: '0.95rem' }}>No structured distortion data recorded yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                    {/* Responsive Flex layout for chart + legend */}
                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: '2rem' }}>
                      {/* Donut container */}
                      <div style={{ position: 'relative', width: '220px', height: '220px', flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={distortionStats}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={90}
                              paddingAngle={3}
                            >
                              {distortionStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomDistortionTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Central text layer for total traps sum */}
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          right: 0, 
                          bottom: 0, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          pointerEvents: 'none' 
                        }}>
                          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{totalDistortionsCount}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(200, 10%, 50%)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>Total Traps</span>
                        </div>
                      </div>

                      {/* Custom styled list legend */}
                      <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {distortionStats.map((stat, index) => (
                          <div key={stat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length], borderRadius: '50%', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.name}</span>
                            </div>
                            <span style={{ color: 'hsl(200, 10%, 45%)', fontWeight: 700, paddingLeft: '0.5rem' }}>{stat.count}x ({stat.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Timeline View with Interactive AreaChart */
            <div className="card-premium" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--foreground)', marginBottom: '0.25rem', fontWeight: 700 }}>Timeline Trajectory</h3>
              <p style={{ fontSize: '0.92rem', color: 'hsl(200, 10%, 45%)', marginBottom: '2.5rem', fontWeight: 500 }}>
                Monitors fluctuations of positive vs. negative feelings. (Reflects averages per distinct logged day).
              </p>

              {timelinePoints.length === 0 ? (
                <p style={{ color: 'hsl(200, 10%, 50%)', fontSize: '0.95rem', textAlign: 'center', padding: '2rem' }}>Not enough emotional data logged yet. Add journal logs to plot your timeline!</p>
              ) : (
                <div>
                  <div style={{ height: '320px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timelinePoints}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--sage-green)" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="var(--sage-green)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--soft-blue)" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="var(--soft-blue)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: '11px' }} />
                        <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: '11px' }} />
                        <Tooltip content={<CustomTimelineTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="positive" 
                          name="Positive Trajectory" 
                          stroke="var(--sage-green)" 
                          fillOpacity={1} 
                          fill="url(#posGrad)" 
                          strokeWidth={3} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="negative" 
                          name="Negative Trajectory" 
                          stroke="var(--soft-blue)" 
                          fillOpacity={1} 
                          fill="url(#negGrad)" 
                          strokeWidth={3} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Chart Legend */}
                  <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', justifyContent: 'center', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--sage-green)', borderRadius: '50%' }} />
                      <strong style={{ fontWeight: 700 }}>Positive Trajectory (Joy/Relief)</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--soft-blue)', borderRadius: '50%' }} />
                      <strong style={{ fontWeight: 700 }}>Negative Trajectory (Stress/Anxiety)</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
