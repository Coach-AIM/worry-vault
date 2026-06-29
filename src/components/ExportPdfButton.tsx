"use client";

import { useState } from 'react';
import jsPDF from 'jspdf';

const DISTORTION_NAMES: Record<string, string> = {
  "all-or-nothing": "All-or-Nothing",
  "catastrophizing": "Catastrophizing",
  "should-statements": "Should Statements",
  "mind-reading": "Mind Reading",
  "emotional-reasoning": "Emotional Reasoning",
  "overgeneralization": "Overgeneralization"
};

export default function ExportPdfButton() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const [tasksRes, journalRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/journal')
      ]);

      const tasksData = await tasksRes.json();
      const journalData = await journalRes.json();

      const tasks = tasksData.tasks || [];
      const entries = journalData.entries || [];

      // Filter for past 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentTasks = tasks.filter((t: any) => new Date(t.createdAt) >= oneWeekAgo && t.completed);
      const recentEntries = entries.filter((e: any) => new Date(e.createdAt) >= oneWeekAgo);

      const doc = new jsPDF();
      let y = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text("Momentum: Weekly Therapy Summary", 20, y);
      y += 15;

      doc.setFontSize(15);
      doc.text("Completed Grounding Steps", 20, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      if (recentTasks.length === 0) {
        doc.text("No tasks completed this week.", 20, y);
        y += 10;
      } else {
        recentTasks.forEach((t: any) => {
          doc.text(`• ${t.title} (${t.emotionalIntensity} Intensity, ${t.estimatedTime || 'N/A'})`, 25, y);
          y += 8;
        });
      }

      y += 10;
      if (y > 270) { doc.addPage(); y = 20; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text("Journal Reflections & Coping Patterns", 20, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      if (recentEntries.length === 0) {
        doc.text("No journal entries this week.", 20, y);
      } else {
        recentEntries.forEach((e: any) => {
          if (y > 230) { doc.addPage(); y = 20; }
          const date = new Date(e.createdAt).toLocaleDateString();
          const isPositive = e.entryType === 'positive';
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text(`Date: ${date} - [${isPositive ? '🏆 Victory Reflection' : '💭 CBT Thought Record'}]`, 20, y);
          y += 7;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          // Situation
          const sitHeader = isPositive ? "Win/Event: " : "Situation: ";
          const sitLines = doc.splitTextToSize(`${sitHeader}${e.situation}`, 170);
          doc.text(sitLines, 20, y);
          y += (sitLines.length * 6) + 2;

          // Automatic Thought (only negative)
          if (!isPositive && e.automaticThought) {
            const thoughtLines = doc.splitTextToSize(`Thought: ${e.automaticThought}`, 170);
            doc.text(thoughtLines, 20, y);
            y += (thoughtLines.length * 6) + 2;
          }

          // Emotions
          if (e.emotionsJson) {
            try {
              const emotions = JSON.parse(e.emotionsJson);
              if (Array.isArray(emotions) && emotions.length > 0) {
                const emotionNames = emotions.map((em: any) => `${em.name} (${em.weight}%)`).join(", ");
                const emotionLines = doc.splitTextToSize(`Emotions: ${emotionNames}`, 170);
                doc.text(emotionLines, 20, y);
                y += (emotionLines.length * 6) + 2;
              }
            } catch (err) {}
          }

          // Distortions (only negative)
          if (!isPositive && e.distortionsJson) {
            try {
              const distortions = JSON.parse(e.distortionsJson);
              if (Array.isArray(distortions) && distortions.length > 0) {
                const distortionNames = distortions.map((id: string) => DISTORTION_NAMES[id] || id).join(", ");
                const distortionLines = doc.splitTextToSize(`Thinking Traps: ${distortionNames}`, 170);
                doc.setTextColor(180, 83, 9); // brown tint
                doc.text(distortionLines, 20, y);
                doc.setTextColor(0, 0, 0);
                y += (distortionLines.length * 6) + 2;
              }
            } catch (err) {}
          }

          // Reframed Thought / Anchor
          const reframeHeader = isPositive ? "Anchor/Strength: " : "Reframed Thought: ";
          const reframeLines = doc.splitTextToSize(`${reframeHeader}${e.reframedThought}`, 170);
          doc.setTextColor(43, 90, 43); // sage green tint
          doc.text(reframeLines, 20, y);
          doc.setTextColor(0, 0, 0);
          y += (reframeLines.length * 6) + 8;
        });
      }

      doc.save("momentum-weekly-summary.pdf");

    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <button onClick={handleExport} disabled={exporting} className="secondary" style={{ width: '100%', fontSize: '1.05rem', padding: '0.875rem' }}>
      {exporting ? 'Generating PDF...' : '⬇ Export Week to PDF'}
    </button>
  );
}
