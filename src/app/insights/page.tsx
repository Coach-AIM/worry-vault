"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function InsightsPage() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [fetchingStats, setFetchingStats] = useState(true);
  const [viewStyle, setViewStyle] = useState<'frequency' | 'timeline'>('frequency');

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
  }, []);

  // Process Emotion Stats (for Frequency Bar Charts)
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

  // Process Distortion Stats (for Frequency Bar Charts)
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

  // Process Timeline Data (for Line / Area Chart View)
  const getTimelineData = () => {
    // Sort chronologically ascending
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
            const isPos = ["Happy", "Proud", "Optimistic", "Calm", "Grateful", "Content", "Relieved", "Hopeful", "Excited", "Peaceful"].includes(em.name);
            if (isPos) {
              posSum += em.weight;
              posCount++;
            } else {
              negSum += em.weight;
              negCount++;
            }
          });

          // Only keep unique days, average them if there are multiple entries on the same calendar day
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

    // Limit to past 30 distinct logged days for clarity
    return points.slice(-30);
  };

  const emotionStats = getEmotionStats();
  const distortionStats = getDistortionStats();
  const timelinePoints = getTimelineData();

  // SVG Area Paths Drawing Helpers
  const width = 600;
  const height = 300;
  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getCoordinates = (points: typeof timelinePoints) => {
    const N = points.length;
    if (N === 0) return { posLine: "", negLine: "", posArea: "", negArea: "", coords: [] };

    const coords = points.map((p, i) => {
      const x = paddingLeft + (N > 1 ? (i / (N - 1)) * chartWidth : chartWidth / 2);
      const yPos = paddingTop + chartHeight - (p.positive / 100) * chartHeight;
      const yNeg = paddingTop + chartHeight - (p.negative / 100) * chartHeight;
      return { x, yPos, yNeg, date: p.date, rawPos: p.positive, rawNeg: p.negative };
    });

    // POSITIVE PATHS
    const posLine = coords.length > 0 
      ? `M ${coords[0].x} ${coords[0].yPos} ` + coords.slice(1).map(c => `L ${c.x} ${c.yPos}`).join(" ")
      : "";
    const posArea = coords.length > 0
      ? `${posLine} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`
      : "";

    // NEGATIVE PATHS
    const negLine = coords.length > 0
      ? `M ${coords[0].x} ${coords[0].yNeg} ` + coords.slice(1).map(c => `L ${c.x} ${c.yNeg}`).join(" ")
      : "";
    const negArea = coords.length > 0
      ? `${negLine} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`
      : "";

    return { posLine, negLine, posArea, negArea, coords };
  };

  const { posLine, negLine, posArea, negArea, coords } = getCoordinates(timelinePoints);

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
      ) : journalEntries.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <p style={{ color: '#888', fontSize: '1.15rem' }}>
            Complete a guided CBT thought record in the **Journal** tab to begin generating wellness trends.
          </p>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          
          {viewStyle === 'frequency' ? (
            /* Bar / Pie Chart View: Overall Frequencies */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {/* Emotion Intensities Chart */}
              <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', marginBottom: '0.25rem' }}>Emotion Trends</h3>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '2rem' }}>Shows which emotions are logged most frequently, along with their average intensity.</p>
                
                {emotionStats.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '0.95rem' }}>No structured emotion data recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {emotionStats.map(stat => (
                      <div key={stat.name} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '130px', textAlign: 'right', paddingRight: '1rem', fontSize: '0.88rem', fontWeight: 600, color: '#444' }}>
                          {stat.name}
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#f0f4f8', height: '1.5rem', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ 
                            backgroundColor: 'var(--soft-blue)', 
                            width: `${stat.averageIntensity}%`, 
                            height: '100%', 
                            borderRadius: '12px',
                            transition: 'width 1s cubic-bezier(0.25, 0.8, 0.25, 1)'
                          }} />
                        </div>
                        <div style={{ width: '100px', paddingLeft: '1rem', fontSize: '0.85rem', color: '#666' }}>
                          <strong>{stat.averageIntensity}%</strong> ({stat.frequency}x)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Distortion Frequencies Chart */}
              <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', marginBottom: '0.25rem' }}>Thinking Trap Frequency</h3>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '2rem' }}>Frequency distribution of cognitive distortions flagged in your thought records.</p>
                
                {distortionStats.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '0.95rem' }}>No structured distortion data recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {distortionStats.map(stat => (
                      <div key={stat.id} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '130px', textAlign: 'right', paddingRight: '1rem', fontSize: '0.88rem', fontWeight: 600, color: '#444' }}>
                          {stat.name}
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#f0f4f8', height: '1.5rem', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ 
                            backgroundColor: 'var(--sage-green)', 
                            width: `${stat.percentage}%`, 
                            height: '100%', 
                            borderRadius: '12px',
                            transition: 'width 1s cubic-bezier(0.25, 0.8, 0.25, 1)'
                          }} />
                        </div>
                        <div style={{ width: '100px', paddingLeft: '1rem', fontSize: '0.85rem', color: '#666' }}>
                          <strong>{stat.count}x</strong> ({stat.percentage}%)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Line / Area Chart View: Fluctuations over Trajectories */
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', animation: 'fadeIn 0.4s ease' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', marginBottom: '0.25rem' }}>Timeline Trajectory</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '2.5rem' }}>
                Monitors fluctuations of positive vs. negative feelings. (Reflects averages per distinct logged day).
              </p>

              {timelinePoints.length === 0 ? (
                <p style={{ color: '#999', fontSize: '0.95rem', textAlign: 'center', padding: '2rem' }}>Not enough emotional data logged yet. Add journal logs to plot your timeline!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Custom SVG Line/Area Chart */}
                  <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', maxWidth: '100%' }}>
                    <defs>
                      <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8fbc8f" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#8fbc8f" stopOpacity="0.0"/>
                      </linearGradient>
                      <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3a6073" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#3a6073" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0, 25, 50, 75, 100].map(val => {
                      const y = paddingTop + chartHeight - (val / 100) * chartHeight;
                      return (
                        <g key={val}>
                          <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f0f0f0" strokeWidth="1" strokeDasharray="4 4" />
                          <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#999">{val}%</text>
                        </g>
                      );
                    })}

                    {/* Draw positive area & line */}
                    {posArea && <path d={posArea} fill="url(#posGrad)" />}
                    {posLine && <path d={posLine} fill="none" stroke="var(--sage-green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                    {/* Draw negative area & line */}
                    {negArea && <path d={negArea} fill="url(#negGrad)" />}
                    {negLine && <path d={negLine} fill="none" stroke="#2b4c5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                    {/* Dots and Labels */}
                    {coords.map((c, idx) => (
                      <g key={idx}>
                        {/* Positive dot */}
                        {c.rawPos > 0 && (
                          <circle cx={c.x} cy={c.yPos} r="4" fill="var(--sage-green)" stroke="#fff" strokeWidth="1.5" />
                        )}
                        {/* Negative dot */}
                        {c.rawNeg > 0 && (
                          <circle cx={c.x} cy={c.yNeg} r="4" fill="#2b4c5e" stroke="#fff" strokeWidth="1.5" />
                        )}
                        {/* Date Label on X Axis (every few points to avoid clutter) */}
                        {(idx === 0 || idx === coords.length - 1 || idx === Math.floor(coords.length / 2)) && (
                          <g>
                            <line x1={c.x} y1={paddingTop + chartHeight} x2={c.x} y2={paddingTop + chartHeight + 5} stroke="#ccc" strokeWidth="1" />
                            <text x={c.x} y={paddingTop + chartHeight + 20} textAnchor="middle" fontSize="10" fill="#777">{c.date}</text>
                          </g>
                        )}
                      </g>
                    ))}
                  </svg>

                  {/* Chart Legend */}
                  <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#444' }}>
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', backgroundColor: 'var(--sage-green)', borderRadius: '50%' }} />
                      <strong>🟢 Positive Trajectory (Joy/Relief)</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#444' }}>
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', backgroundColor: '#2b4c5e', borderRadius: '50%' }} />
                      <strong>🔵 Negative Trajectory (Stress/Anxiety)</strong>
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
