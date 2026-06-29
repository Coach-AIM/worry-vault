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

  const emotionStats = getEmotionStats();
  const distortionStats = getDistortionStats();

  return (
    <div style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ color: 'var(--sage-green)', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 600 }}>Wellness Trends</h1>
        <p style={{ fontSize: '1.1rem', color: '#555' }}>Analyze emotional patterns and tracing distortion frequencies over time.</p>
        <Link href="/" style={{ color: 'var(--soft-blue)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '1rem' }}>&larr; Back to Dashboard</Link>
      </header>

      {fetchingStats ? (
        <p>Analyzing wellness trends...</p>
      ) : journalEntries.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <p style={{ color: '#888', fontSize: '1.15rem' }}>
            Complete a guided CBT thought record in the **Journal** tab to begin generating wellness trends.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', animation: 'fadeIn 0.4s ease' }}>
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
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
