"use client";

import { useState } from 'react';
import jsPDF from 'jspdf';

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
      doc.setFontSize(22);
      doc.text("Momentum: Weekly Therapy Summary", 20, y);
      y += 15;

      doc.setFontSize(16);
      doc.text("Completed Grounding Steps", 20, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);

      if (recentTasks.length === 0) {
        doc.text("No tasks completed this week.", 20, y);
        y += 10;
      } else {
        recentTasks.forEach((t: any) => {
          doc.text(`• ${t.title} (${t.emotionalIntensity} Intensity, ${t.estimatedTime || 'N/A'})`, 25, y);
          y += 10;
        });
      }

      y += 10;
      if (y > 270) { doc.addPage(); y = 20; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text("Journal Reflections & Identified Thought Patterns", 20, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);

      if (recentEntries.length === 0) {
        doc.text("No journal entries this week.", 20, y);
      } else {
        recentEntries.forEach((e: any) => {
          if (y > 250) { doc.addPage(); y = 20; }
          const date = new Date(e.createdAt).toLocaleDateString();
          
          doc.setFont('helvetica', 'bold');
          doc.text(`Date: ${date}`, 20, y);
          
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(e.entryText, 170);
          doc.text(lines, 20, y + 7);
          y += 7 + (lines.length * 7);

          if (e.insights) {
            try {
              const parsed = JSON.parse(e.insights);
              const aiInsights = parsed.aiInsights || parsed;
              if (aiInsights && aiInsights.insights) {
                const insightLines = doc.splitTextToSize(`Insight: ${aiInsights.insights}`, 160);
                doc.setTextColor(43, 90, 43); // sage green tint
                doc.text(insightLines, 25, y);
                doc.setTextColor(0, 0, 0);
                y += (insightLines.length * 7) + 5;
              }
            } catch (err) {}
          }
          y += 5;
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
