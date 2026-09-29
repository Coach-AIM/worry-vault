'use client';

import React, { useState, useEffect } from 'react';

export interface ExportEntry {
  id: string | number;
  createdAt: string;
  entryType?: string;
  situation: string;
  automaticThought?: string | null;
  distortionsJson?: string | null;
  reframedThought?: string;
}

export interface ExportTask {
  id: string | number;
  title: string;
  emotionalIntensity?: string;
  estimatedTime?: string;
  completed?: boolean | number;
  createdAt?: string;
}

interface TherapyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TherapyExportModal({ isOpen, onClose }: TherapyExportModalProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ExportEntry[]>([]);
  const [tasks, setTasks] = useState<ExportTask[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    async function loadData() {
      // 1. Try fetching live API data
      let apiEntries: ExportEntry[] = [];
      let apiTasks: ExportTask[] = [];

      try {
        if (typeof fetch === 'function') {
          const journalPromise = Promise.resolve(fetch('/api/journal')).catch(() => null);
          const tasksPromise = Promise.resolve(fetch('/api/tasks')).catch(() => null);
          const [journalRes, tasksRes] = await Promise.all([journalPromise, tasksPromise]);

          if (journalRes && 'ok' in journalRes && journalRes.ok) {
            const jData = await journalRes.json();
            apiEntries = jData.entries || [];
          }
          if (tasksRes && 'ok' in tasksRes && tasksRes.ok) {
            const tData = await tasksRes.json();
            apiTasks = tData.tasks || [];
          }
        }
      } catch (err) {
        console.warn('API fetch fallback to localStorage:', err);
      }

      // 2. Filter for past 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const filteredEntries = apiEntries.filter(e => {
        if (!e.createdAt) return true;
        return new Date(e.createdAt) >= oneWeekAgo;
      });

      const filteredTasks = apiTasks.filter(t => {
        if (!t.createdAt) return Boolean(t.completed);
        return new Date(t.createdAt) >= oneWeekAgo && Boolean(t.completed);
      });

      setEntries(filteredEntries);
      setTasks(filteredTasks);
      setLoading(false);
    }

    loadData();
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  const startDateStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const endDateStr = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Modal Header (Hidden during print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div>
              <h2 id="export-modal-title" className="text-xl font-extrabold text-slate-900">
                Therapy Integration Summary
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Week Range: {startDateStr} – {endDateStr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span>🖨️</span>
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xl font-bold cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Content Container */}
        <div id="therapy-printable-report" className="p-6 sm:p-8 space-y-6 text-slate-900 font-sans">
          
          {/* Clinical Report Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Momentum: Clinical &amp; CBT Weekly Summary
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Structured Cognitive Behavioral Therapy (CBT) Thought Records &amp; Grounding Log
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-500 font-semibold">
              <div>Date Range: <strong>{startDateStr} – {endDateStr}</strong></div>
              <div>Generated: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              Loading recent clinical records...
            </div>
          ) : (
            <>
              {/* Section 1: Completed Grounding Steps & Tasks */}
              <div className="space-y-3">
                <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
                  <span>✅</span>
                  <span>Completed Grounding Steps ({tasks.length})</span>
                </h3>
                
                {tasks.length === 0 ? (
                  <p className="text-xs sm:text-sm text-slate-500 italic py-1">
                    No completed tasks recorded in the past 7 days.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    {tasks.map((t, idx) => (
                      <div key={t.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">• {t.title}</span>
                        {t.emotionalIntensity && (
                          <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold">
                            {t.emotionalIntensity}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: CBT Thought Records & Reframing Log */}
              <div className="space-y-4 pt-2">
                <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
                  <span>💭</span>
                  <span>CBT Thought Records &amp; Reframing Log ({entries.length})</span>
                </h3>

                {entries.length === 0 ? (
                  <p className="text-xs sm:text-sm text-slate-500 italic py-1">
                    No journal reflections recorded in the past 7 days.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {entries.map((entry, idx) => {
                      let distortions: string[] = [];
                      if (entry.distortionsJson) {
                        try {
                          distortions = JSON.parse(entry.distortionsJson);
                        } catch {
                          distortions = [];
                        }
                      }
                      const dateStr = entry.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                        : 'Recent';

                      return (
                        <div
                          key={entry.id || idx}
                          className="p-4 rounded-xl border border-slate-300 bg-white space-y-2.5 break-inside-avoid shadow-none"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-700">Record #{idx + 1} • {dateStr}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                              {entry.entryType === 'positive' ? '🏆 Victory Reflection' : '💭 CBT Record'}
                            </span>
                          </div>

                          <div className="text-xs sm:text-sm space-y-1.5">
                            <div>
                              <strong className="text-slate-600 uppercase text-[11px] tracking-wider block">
                                Triggering Situation:
                              </strong>
                              <p className="text-slate-800 font-medium">{entry.situation}</p>
                            </div>

                            {entry.automaticThought && (
                              <div>
                                <strong className="text-slate-600 uppercase text-[11px] tracking-wider block">
                                  Automatic Thought:
                                </strong>
                                <p className="text-slate-800 italic">"{entry.automaticThought}"</p>
                              </div>
                            )}

                            {distortions.length > 0 && (
                              <div>
                                <strong className="text-slate-600 uppercase text-[11px] tracking-wider block">
                                  Identified Thinking Traps:
                                </strong>
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                  {distortions.map((d, dIdx) => (
                                    <span key={dIdx} className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-xs font-semibold">
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {entry.reframedThought && (
                              <div className="p-2.5 bg-emerald-50/70 border-l-4 border-emerald-600 rounded-r-lg mt-2">
                                <strong className="text-emerald-900 uppercase text-[11px] tracking-wider block">
                                  Balanced Reframed Perspective / Anchor:
                                </strong>
                                <p className="text-emerald-950 font-medium text-xs sm:text-sm mt-0.5">
                                  {entry.reframedThought}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Report Footer */}
          <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
            Momentum Mental Toolkit • Self-directed cognitive wellness record • For clinical review
          </div>
        </div>

        {/* Modal Footer (Hidden during print) */}
        <div className="print:hidden p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="min-h-[44px] px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-100 cursor-pointer"
          >
            🖨️ Print / Save as PDF
          </button>
        </div>

      </div>
    </div>
  );
}
