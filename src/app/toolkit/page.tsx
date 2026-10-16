"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import WellnessGraphs from '@/components/WellnessGraphs';
import CbtTriangleSandbox from '@/components/CbtTriangleSandbox';
import CbtGlossary from '@/components/CbtGlossary';
import DecisionAssistantModal from '@/components/DecisionAssistantModal';
import TherapyExportModal from '@/components/TherapyExportModal';
import SupportContactsCard from '@/components/SupportContactsCard';
import { safeGetAllItems } from '@/utils/storage';

// ============================================================
// TOOLKIT PAGE
// Dynamic CBT Utility Hub with 4 interactive feature modals:
// 1. Decision Assistant (Multi-step dilemma & pros/cons weighting)
// 2. Support Contact Quick-Dialer (+ Add Contact / Call + Edit)
// 3. Therapy Integration (Print / Save as PDF summary)
// 4. Secure Vault Backup (Client-side JSON data exporter + Toast)
// ============================================================
export default function Toolkit() {
  // Modal states
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Thought records state check
  const [hasThoughtRecords, setHasThoughtRecords] = useState(false);
  const [isRecordsChecked, setIsRecordsChecked] = useState(false);

  useEffect(() => {
    async function checkRecords() {
      try {
        const localRaw = localStorage.getItem('momentum_journal_entries');
        let count = 0;
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            count = parsed.length;
          }
        }
        if (count === 0 && typeof fetch === 'function') {
          const res = await fetch('/api/journal').catch(() => null);
          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.entries && Array.isArray(data.entries) && data.entries.length > 0) {
              count = data.entries.length;
            }
          }
        }
        setHasThoughtRecords(count > 0);
      } catch (_) {
        setHasThoughtRecords(false);
      } finally {
        setIsRecordsChecked(true);
      }
    }
    checkRecords();
  }, []);

  // Backup Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);


  // Handler for Secure Vault Backup
  async function handleCreateBackup() {
    setIsBackingUp(true);
    try {
      // 1. Collect all localStorage keys
      const localData = safeGetAllItems();

      // 2. Try fetching server records for complete offline backup
      let apiBackupData: any = {};
      try {
        if (typeof fetch === 'function') {
          const res = await Promise.resolve(fetch('/api/backup')).catch(() => null);
          if (res && 'ok' in res && res.ok) {
            apiBackupData = await res.json();
          }
        }
      } catch (err) {
        console.warn('API backup fetch skipped (offline fallback):', err);
      }

      // 3. Combine into comprehensive export payload
      const allUserData = {
        app: 'Momentum Mental Wellness Toolkit',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        localStorageRecords: localData,
        databaseRecords: apiBackupData,
      };

      // 4. Format and trigger client-side file download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allUserData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mind-toolkit-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      // 5. Display success toast notification
      setToastMessage("✅ Vault backup downloaded successfully");
      setTimeout(() => {
        setToastMessage(null);
      }, 3500);

    } catch (err) {
      console.error('Backup generation error:', err);
      alert('Failed to generate vault backup. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50/50 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pt-10 pb-48 flex flex-col items-center relative">

      {/* Floating Success Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 z-50 px-5 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-xl border border-slate-700/60 text-sm sm:text-base flex items-center gap-2 animate-fadeIn transition-all"
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
          CBT Mental Toolkit
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 mt-2 font-medium">
          Explore interactive tools, analyze core trends, and master key concepts.
        </p>
      </div>

      {/* ── 📊 Wellness trends & analytics or Empty State ── */}
      {isRecordsChecked && (
        hasThoughtRecords ? (
          <WellnessGraphs />
        ) : (
          <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200/80 text-center flex flex-col items-center justify-center my-2 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl mb-4 text-emerald-800 shadow-2xs">
              📊
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
              No trend data yet
            </h3>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto mb-6 font-medium leading-relaxed">
              No trend data yet. Complete your first CBT thought record to unlock your mood stability trend and distortion analysis.
            </p>
            <Link
              href="/journal"
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 no-underline cursor-pointer"
            >
              <span>Complete Thought Record</span>
              <span>→</span>
            </Link>
          </div>
        )
      )}

      {/* ── 🧠 Two-column utility shortcuts grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto my-8">

        {/* 1. Decision Assistant Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center justify-between">
          <div>
            <h4 className="text-xl font-extrabold text-slate-900 mb-1">🧠 Decision Assistant</h4>
            <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">
              Align standard options with your core values &amp; calculate pros/cons.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDecisionOpen(true)}
            className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl py-2.5 px-4 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Open Assistant</span>
          </button>
        </div>

        {/* 2. Multi-Contact Support Card (988 banner + channel toggles) */}
        <SupportContactsCard />

        {/* 3. Therapy Integration Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center justify-between">
          <div>
            <h4 className="text-xl font-extrabold text-slate-900 mb-1">📄 Therapy Integration</h4>
            <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">
              Export complete grounding steps and thought records to clear formats.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl py-2.5 px-4 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>⬇️ Export Week to PDF</span>
          </button>
        </div>

        {/* 4. Secure Vault Backup Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center justify-between">
          <div>
            <h4 className="text-xl font-extrabold text-slate-900 mb-1">🔒 Secure Vault Backup</h4>
            <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">
              Download an encrypted local file of your complete application records.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={isBackingUp}
            className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-2.5 px-4 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isBackingUp ? "⏳ Exporting Vault..." : "🔐 Create Encrypted Backup"}</span>
          </button>
        </div>

      </div>

      {/* ── 🔄 Interactive CBT triangle ── */}
      <CbtTriangleSandbox />

      {/* ── 📖 CBT concept glossary ── */}
      <CbtGlossary />

      {/* ── Modals ── */}
      <DecisionAssistantModal
        isOpen={isDecisionOpen}
        onClose={() => setIsDecisionOpen(false)}
      />


      <TherapyExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

    </div>
  );
}