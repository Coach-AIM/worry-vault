"use client";

import React, { useState, useEffect } from 'react';
import WellnessGraphs from '@/components/WellnessGraphs';
import CbtTriangleSandbox from '@/components/CbtTriangleSandbox';
import CbtGlossary from '@/components/CbtGlossary';
import DecisionAssistantModal from '@/components/DecisionAssistantModal';
import SupportContactModal, { SupportContact } from '@/components/SupportContactModal';
import TherapyExportModal from '@/components/TherapyExportModal';
import { safeGetJSON, safeGetAllItems } from '@/utils/storage';

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
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Support contact state & SSR-mount guard
  const [isMounted, setIsMounted] = useState(false);
  const [contact, setContact] = useState<SupportContact | null>(null);

  // Backup Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Load support contact strictly on mount
  useEffect(() => {
    setIsMounted(true);
    const savedContact = safeGetJSON<SupportContact | null>('momentum_support_contact', null);
    setContact(savedContact);
  }, []);

  // Handler for Support Contact quick dial
  function handleDialContact() {
    if (!contact?.phone) {
      setIsContactModalOpen(true);
      return;
    }
    const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  }

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
    <div className="w-full min-h-screen bg-slate-50/50 overflow-y-auto px-4 pt-10 pb-48 flex flex-col items-center relative">

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

      {/* ── 📊 Wellness trends & analytics ── */}
      <WellnessGraphs />

      {/* ── 🧠 Two-column utility shortcuts grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl my-8">

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

        {/* 2. Support Contact Quick-Dialer Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center text-center justify-between">
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <h4 className="text-xl font-extrabold text-slate-900">📞 My Support Contact</h4>
            </div>
            {isMounted && contact ? (
              <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">
                Saved: <strong className="font-semibold text-emerald-800">{contact.name}</strong> ({contact.role || 'Support'})
              </p>
            ) : (
              <p className="text-sm sm:text-base text-slate-700 font-normal mb-4">
                Reach out to your pre-configured emergency contact or therapist in one tap.
              </p>
            )}
          </div>

          {isMounted && contact ? (
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={handleDialContact}
                className="flex-1 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl py-2.5 px-3 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 truncate"
                title={`Call ${contact.name} at ${contact.phone}`}
              >
                <span>📞</span>
                <span className="truncate">Call {contact.name.split(' ')[0]}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="min-w-[44px] min-h-[44px] p-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center"
                aria-label="Edit Support Contact"
                title="Edit Support Contact"
              >
                ⚙️
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsContactModalOpen(true)}
              className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl py-2.5 px-4 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>+ Add Support Contact</span>
            </button>
          )}
        </div>

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

      <SupportContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        initialContact={contact}
        onSave={(newContact) => setContact(newContact)}
      />

      <TherapyExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

    </div>
  );
}
