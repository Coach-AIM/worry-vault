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
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#64748b', // Slate
  '#475569', // Dark Slate
];

const getEmotionColor = (name: string) => {
  const n = name.toLowerCase();
  
  const positive = ['grateful', 'proud', 'relieved', 'energized', 'happy', 'calm', 'content', 'hopeful', 'excited', 'peaceful', 'inspired', 'elated', 'serene'];
  const stress = ['anxiety', 'overwhelm', 'frustrated', 'frustration', 'fear', 'nervous', 'stressed', 'panicked'];
  const reactive = ['anger', 'sadness', 'sad', 'angry', 'grief', 'hurt', 'guilt', 'shame', 'regretful'];

  if (positive.some(e => n.includes(e))) return '#10b981'; // Emerald Green
  if (stress.some(e => n.includes(e))) return '#f59e0b'; // Amber Orange
  if (reactive.some(e => n.includes(e))) return '#f43f5e'; // Rose Red
  
  return '#64748b'; // Fallback Slate
};

export default function InsightsPage() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [fetchingStats, setFetchingStats] = useState(true);
  const [viewStyle, setViewStyle] = useState<'frequency' | 'timeline'>('frequency');
  const [mounted, setMounted] = useState(false);

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
    
    journalEntries.forEach(entry => {
      if (!entry.emotionsJson) return;
      try {
        const emotions = JSON.parse(entry.emotionsJson);
        if (Array.isArray(emotions)) {
          emotions.forEach((e: any) => {
            if (!emotionTotals[e.name]) {
              emotionTotals[e.name] = { totalWeight: 0, count: 0 };
            }
            emotionTotals[e.name].totalWeight += (e.weight || 50);
            emotionTotals[e.name].count += 1;
          });
        }
      } catch (err) {}
    });

    const stats = Object.keys(emotionTotals).map(name => {
      const { totalWeight, count } = emotionTotals[name];
      return {
        name,
        averageIntensity: Math.round(totalWeight / count),
        frequency: count
      };
    });

    return stats.sort((a, b) => b.frequency - a.frequency);
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
        <div style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: '0.85rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{data.name}</p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#3b82f6', fontWeight: 600 }}>Avg. Intensity: {data.averageIntensity}%</p>
          <p style={{ margin: 0, color: '#64748b' }}>Logged: {data.frequency} times</p>
        </div>
      );
    }
    return null;
  };

  const CustomDistortionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: '0.85rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{data.name}</p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6366f1', fontWeight: 600 }}>Count: {data.count} times</p>
          <p style={{ margin: 0, color: '#64748b' }}>Share: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: '0.85rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ margin: '0.25rem 0 0 0', color: p.stroke || p.color, fontWeight: 600 }}>
              {p.name}: {p.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--sage-green)', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 600 }}>Wellness Trends</h1>
        <p style={{ fontSize: '1.1rem', color: '#555' }}>Analyze emotional patterns and tracing distortion frequencies over time.</p>
        <Link href="/" style={{ color: 'var(--soft-blue)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>&larr; Back to Dashboard</Link>
      </header>

      {/* Advanced Chart Toggle Controller */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2.5rem', backgroundColor: '#f1f5f9', padding: '0.35rem', borderRadius: '12px', maxWidth: '420px', marginInline: 'auto' }}>
        <button 
          type="button" 
          onClick={() => setViewStyle('frequency')}
          style={{ 
            flex: 1, 
            padding: '0.6rem 1.25rem', 
            borderRadius: '10px', 
            border: 'none', 
            backgroundColor: viewStyle === 'frequency' ? '#fff' : 'transparent',
            color: viewStyle === 'frequency' ? 'var(--foreground)' : '#666',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: viewStyle === 'frequency' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📊 Frequency Metrics
        </button>
        <button 
          type="button" 
          onClick={() => setViewStyle('timeline')}
          style={{ 
            flex: 1, 
            padding: '0.6rem 1.25rem', 
            borderRadius: '10px', 
            border: 'none', 
            backgroundColor: viewStyle === 'timeline' ? '#fff' : 'transparent',
            color: viewStyle === 'timeline' ? 'var(--foreground)' : '#666',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: viewStyle === 'timeline' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📈 Timeline Fluctuations
        </button>
      </div>

      {fetchingStats ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Analyzing wellness trends...</p>
      ) : !mounted ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Loading interactive charts...</p>
      ) : journalEntries.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <p style={{ color: '#888', fontSize: '1.15rem' }}>
            Complete a guided CBT thought record in the **Journal** tab to begin generating wellness trends.
          </p>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          
          {viewStyle === 'frequency' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Emotion Intensities Chart */}
              <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', marginBottom: '0.25rem' }}>Emotion Trends</h3>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '2rem' }}>Shows which emotions are logged most frequently, along with their average intensity.</p>
                
                {emotionStats.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '0.95rem' }}>No structured emotion data recorded yet.</p>
                ) : (
                  <div>
                    <div style={{ height: '320px', width: '100%' }}>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                        <span style={{ color: '#64748b' }}>Positive / Resourceful</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '50%' }} />
                        <span style={{ color: '#64748b' }}>High-Stress / Threat</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f43f5e', borderRadius: '50%' }} />
                        <span style={{ color: '#64748b' }}>Heavy / Reactive</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Distortion Frequencies Donut Chart */}
              <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', marginBottom: '0.25rem' }}>Thinking Trap Frequency</h3>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '2rem' }}>Frequency distribution of cognitive distortions flagged in your thought records.</p>
                
                {distortionStats.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '0.95rem' }}>No structured distortion data recorded yet.</p>
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
                          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{totalDistortionsCount}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Total Traps</span>
                        </div>
                      </div>

                      {/* Custom styled list legend */}
                      <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {distortionStats.map((stat, index) => (
                          <div key={stat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length], borderRadius: '50%', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.name}</span>
                            </div>
                            <span style={{ color: '#64748b', fontWeight: 700, paddingLeft: '0.5rem' }}>{stat.count}x ({stat.percentage}%)</span>
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
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', marginBottom: '0.25rem' }}>Timeline Trajectory</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '2.5rem' }}>
                Monitors fluctuations of positive vs. negative feelings. (Reflects averages per distinct logged day).
              </p>

              {timelinePoints.length === 0 ? (
                <p style={{ color: '#999', fontSize: '0.95rem', textAlign: 'center', padding: '2rem' }}>Not enough emotional data logged yet. Add journal logs to plot your timeline!</p>
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
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2b4c5e" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#2b4c5e" stopOpacity={0}/>
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
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#posGrad)" 
                          strokeWidth={3} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="negative" 
                          name="Negative Trajectory" 
                          stroke="#2b4c5e" 
                          fillOpacity={1} 
                          fill="url(#negGrad)" 
                          strokeWidth={3} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Chart Legend */}
                  <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', justifyContent: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#444' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                      <strong style={{ fontWeight: 600 }}>Positive Trajectory (Joy/Relief)</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#444' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#2b4c5e', borderRadius: '50%' }} />
                      <strong style={{ fontWeight: 600 }}>Negative Trajectory (Stress/Anxiety)</strong>
                    </div>
                  </div>
                </div>
              )}
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
