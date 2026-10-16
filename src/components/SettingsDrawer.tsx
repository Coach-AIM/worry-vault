'use client';

import React, { useEffect, useState, useRef } from 'react';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupRemindersEnabled, setBackupRemindersEnabled] = useState(false);
  const [showSecondaryWipeModal, setShowSecondaryWipeModal] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Request non-evictable storage on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  // Load reminder preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('momentum_backup_reminders_enabled');
      if (saved === 'true') {
        setBackupRemindersEnabled(true);
      }
    } catch (_) {}
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle Esc key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showSecondaryWipeModal) {
          setShowSecondaryWipeModal(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showSecondaryWipeModal]);

  if (!isOpen) return null;

  function handleToggleBackupReminders(checked: boolean) {
    setBackupRemindersEnabled(checked);
    try {
      localStorage.setItem('momentum_backup_reminders_enabled', String(checked));
    } catch (_) {}
  }

  function handleExportBackup() {
    try {
      const backupData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('momentum_') || key.startsWith('momentum'))) {
          try {
            backupData[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            backupData[key] = localStorage.getItem(key);
          }
        }
      }
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `momentum-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export backup: ' + (err?.message || 'Unknown error'));
    }
  }

  function handleRestoreFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatus('Reading backup file...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Invalid backup file format: must be a valid JSON key-value map.');
        }

        const keys = Object.keys(parsed);
        const momentumKeys = keys.filter((k) => k.startsWith('momentum_') || k.startsWith('momentum'));
        if (momentumKeys.length === 0) {
          throw new Error('No valid Momentum records found in this backup file.');
        }

        momentumKeys.forEach((key) => {
          const val = parsed[key];
          const valStr = typeof val === 'string' ? val : JSON.stringify(val);
          localStorage.setItem(key, valStr);
        });

        setRestoreStatus(`Restored ${momentumKeys.length} items. Reloading...`);
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } catch (err: any) {
        setRestoreStatus(null);
        alert('Failed to restore backup: ' + (err?.message || 'Unknown error'));
      }
    };
    reader.readAsText(file);
  }

  function handleInitialWipeClick() {
    const confirmed = window.confirm(
      'Are you sure? This will permanently delete all thought records, habits, and fortitude points from this browser.'
    );
    if (!confirmed) return;
    setShowSecondaryWipeModal(true);
  }

  function purgeAllData() {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('momentum_') || key.startsWith('momentum'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  }

  function getDiagnosticData() {
    let storageKeyCount = 0;
    let journalCount = 0;
    let actionsCount = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('momentum')) storageKeyCount++;
      }
      const j = JSON.parse(localStorage.getItem('momentum_journal_entries') || '[]');
      if (Array.isArray(j)) journalCount = j.length;
      const a = JSON.parse(localStorage.getItem('momentum_actions') || '[]');
      if (Array.isArray(a)) actionsCount = a.length;
    } catch (_) {}

    return {
      appVersion: 'v1.0 (Alpha Build)',
      timestamp: new Date().toLocaleString(),
      isoTimestamp: new Date().toISOString(),
      route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      storageSummary: {
        momentumKeys: storageKeyCount,
        journalEntriesCount: journalCount,
        plannerActionsCount: actionsCount,
      },
    };
  }

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    const userFeedbackText = feedbackText.trim();
    if (!userFeedbackText || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    setFeedbackToast(null);
    setFeedbackError(null);

    const diagnosticData = getDiagnosticData();

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: '9f828efe-6966-47bd-a63e-5562646003ff',
          subject: 'Momentum Alpha Feedback & Bug Report',
          from_name: 'Momentum Tester',
          message: userFeedbackText,
          diagnostics: JSON.stringify(diagnosticData, null, 2),
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || (result && result.success === false)) {
        throw new Error(result?.message || 'Submission failed');
      }

      try {
        const existing = JSON.parse(localStorage.getItem('momentum_alpha_feedback_logs') || '[]');
        const entry = {
          id: Date.now(),
          message: userFeedbackText,
          timestamp: diagnosticData.isoTimestamp,
          path: diagnosticData.route,
        };
        localStorage.setItem(
          'momentum_alpha_feedback_logs',
          JSON.stringify([entry, ...(Array.isArray(existing) ? existing : [])])
        );
      } catch (_) {}

      setFeedbackText('');
      setFeedbackToast('Feedback sent successfully! Thank you for helping build Momentum.');
    } catch (_) {
      setFeedbackError("Could not send report. Please click 'Copy Diagnostic Info' to share it manually.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  async function handleCopyDiagnostics() {
    try {
      const diag = {
        ...getDiagnosticData(),
        testerNote: feedbackText.trim() || undefined,
      };
      const text = JSON.stringify(diag, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setFeedbackToast('Diagnostic info copied to clipboard!');
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (_) {
      setFeedbackError('Could not copy automatically — please check browser permissions.');
    }
  }

  return (
    <>
      {/* Drawer Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-drawer-title"
      >
        <div className="bg-white h-full sm:h-auto sm:max-h-[92vh] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-y-auto flex flex-col animate-slideInRight sm:animate-scaleUp">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 sticky top-0 z-10 backdrop-blur-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <h3 id="settings-drawer-title" className="text-lg font-black text-slate-900">
                  Settings &amp; Privacy
                </h3>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Storage Mode: On-Device (Zero-Cloud Local Storage)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg font-bold cursor-pointer"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            
            {/* Section A: Backup & Recovery */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💾</span>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Section A: Backup &amp; Recovery
                </h4>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                {/* Manual Backup Buttons */}
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Manual Backup &amp; Transfer
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📥</span>
                      <span>Export Backup File</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📤</span>
                      <span>Restore from Backup</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".json"
                      onChange={handleRestoreFileChange}
                      className="hidden"
                      aria-label="Upload backup file"
                    />
                  </div>
                  {restoreStatus && (
                    <p className="text-xs font-bold text-emerald-700 mt-2 animate-fadeIn">
                      ✓ {restoreStatus}
                    </p>
                  )}
                </div>

                {/* Milestone Reminders Toggle */}
                <div className="pt-3 border-t border-slate-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={backupRemindersEnabled}
                      onChange={(e) => handleToggleBackupReminders(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 h-4 w-4 accent-emerald-600 cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-semibold text-slate-800 leading-snug">
                      Prompt me to save a backup after closing major reality loops
                    </span>
                  </label>
                </div>

                {/* Explanatory Notice */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                  <p className="text-[11px] sm:text-xs text-amber-950 font-medium leading-relaxed">
                    <strong>Note:</strong> Since Momentum stores 100% of data locally for privacy, clearing your browser&apos;s &quot;Cookies &amp; Site Data&quot; will erase your records unless you have exported a backup.
                  </p>
                </div>
              </div>
            </div>

            {/* Section B: Data Governance (Wipe) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗑️</span>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Section B: Data Governance
                </h4>
              </div>

              <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4 space-y-2.5">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Permanently purge all stored entries, custom habits, and fortitude scores from this browser.
                </p>
                <button
                  type="button"
                  onClick={handleInitialWipeClick}
                  style={{
                    border: '1px solid #ef4444',
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-none hover:bg-rose-100"
                >
                  <span>🗑️ Wipe All Application Data</span>
                </button>
              </div>
            </div>

            {/* Section C: Crisis Safeguards & Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🆘</span>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Section C: Crisis Safeguards &amp; Info
                </h4>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  Free, confidential 24/7 support. Call or text 988 (Suicide &amp; Crisis Lifeline), or text 741741 (Crisis Text Line).
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="tel:988"
                    className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold text-center transition-all shadow-sm flex items-center justify-center gap-1.5 no-underline"
                  >
                    <span>📞 Call 988</span>
                  </a>
                  <a
                    href="sms:741741?body=HOME"
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold text-center transition-all shadow-sm flex items-center justify-center gap-1.5 no-underline"
                    title="Text HOME to 741741 for free, confidential 24/7 crisis support"
                  >
                    <span>💬 Text Crisis Line</span>
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">Client Version</span>
                  <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    Momentum v1.0 (Alpha Web Build)
                  </span>
                </div>
              </div>
            </div>

            {/* Section D: Alpha Feedback & Bug Report */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛠️</span>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Section D: Alpha Feedback &amp; Bug Report
                </h4>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Spot a layout glitch or have a suggestion? Send feedback below or copy privacy-safe diagnostic metadata (no personal journal text is ever included) to share with the team.
                </p>
                <form onSubmit={handleSubmitFeedback} className="space-y-2.5">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => {
                      setFeedbackText(e.target.value);
                      if (feedbackError) setFeedbackError(null);
                    }}
                    disabled={isSubmittingFeedback}
                    placeholder="Describe what happened or share a suggestion..."
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="submit"
                      disabled={!feedbackText.trim() || isSubmittingFeedback}
                      className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>💬</span>
                      <span>{isSubmittingFeedback ? 'Sending...' : 'Submit Feedback'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyDiagnostics}
                      className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📋</span>
                      <span>Copy Diagnostic Info</span>
                    </button>
                  </div>
                </form>
                {feedbackToast && (
                  <p className="text-xs font-bold text-emerald-700 animate-fadeIn">
                    ✓ {feedbackToast}
                  </p>
                )}
                {feedbackError && (
                  <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 animate-fadeIn" role="alert">
                    ⚠️ {feedbackError}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/60 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Done
            </button>
          </div>

        </div>
      </div>

      {/* Secondary Wipe Confirmation Modal */}
      {showSecondaryWipeModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wipe-confirm-title"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 animate-scaleUp">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⚠️</span>
              <h4 id="wipe-confirm-title" className="text-base font-extrabold text-slate-900 leading-snug">
                Would you like to export a backup file first?
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Your local records will be permanently deleted from this device. You can export a JSON backup file now to ensure you don&apos;t lose your progress.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleExportBackup();
                  setTimeout(() => {
                    purgeAllData();
                  }, 600);
                }}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📥 Download Backup &amp; Wipe</span>
              </button>

              <button
                type="button"
                onClick={purgeAllData}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Wipe Without Backup
              </button>

              <button
                type="button"
                onClick={() => setShowSecondaryWipeModal(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
