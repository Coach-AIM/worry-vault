'use client';

import React, { useState, useEffect } from 'react';
import { safeSetJSON, safeRemoveItem } from '@/utils/storage';

export interface SupportContact {
  name: string;
  role: 'Therapist' | 'Trusted Friend' | 'Crisis Line' | 'Family Member' | 'Other';
  phone: string;
  notes?: string;
}

interface SupportContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContact: SupportContact | null;
  onSave: (contact: SupportContact | null) => void;
}

export default function SupportContactModal({
  isOpen,
  onClose,
  initialContact,
  onSave
}: SupportContactModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<SupportContact['role']>('Therapist');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialContact) {
      setName(initialContact.name || '');
      setRole(initialContact.role || 'Therapist');
      setPhone(initialContact.phone || '');
      setNotes(initialContact.notes || '');
    } else {
      setName('');
      setRole('Therapist');
      setPhone('');
      setNotes('');
    }
    setError(null);
  }, [initialContact, isOpen]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a contact name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please provide a valid phone number.');
      return;
    }

    const updated: SupportContact = {
      name: name.trim(),
      role,
      phone: phone.trim(),
      notes: notes.trim() || undefined
    };

    safeSetJSON('momentum_support_contact', updated);
    onSave(updated);
    onClose();
  }

  function handleRemove() {
    safeRemoveItem('momentum_support_contact');
    onSave(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-contact-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col animate-fadeIn">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <h2 id="support-contact-modal-title" className="text-xl font-extrabold text-slate-900">
                {initialContact ? 'Edit Support Contact' : 'Add Support Contact'}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Quick 1-tap dial access for emergency or therapy check-ins
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xl font-bold cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Contact Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="e.g. Dr. Sarah Jenkins or Crisis Helpline"
              className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-slate-800 font-medium text-sm outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Role / Relationship *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as SupportContact['role'])}
              className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-slate-800 font-medium text-sm outline-none transition-all bg-white"
            >
              <option value="Therapist">Therapist / Counselor</option>
              <option value="Trusted Friend">Trusted Friend / Partner</option>
              <option value="Crisis Line">Crisis Hotline / Text Line</option>
              <option value="Family Member">Family Member</option>
              <option value="Other">Other Supporter</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(null); }}
              placeholder="e.g. 988 or (555) 234-5678"
              className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-slate-800 font-medium text-sm outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Notes / Availability (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Available weekdays 9am-5pm. Call if anxiety reaches >7/10."
              rows={2}
              className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-slate-800 font-medium text-sm outline-none resize-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
            {initialContact ? (
              <button
                type="button"
                onClick={handleRemove}
                className="min-h-[44px] px-4 py-2 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                🗑️ Remove Contact
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-100 cursor-pointer"
            >
              {initialContact ? 'Save Changes' : 'Save Support Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
