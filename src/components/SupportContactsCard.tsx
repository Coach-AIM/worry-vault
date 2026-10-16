'use client';

import React, { useEffect, useState } from 'react';

export interface MultiSupportContact {
  id: string;
  name: string;
  role: string;
  phone1: string;
  canCall: boolean;
  canText: boolean;
  phone2?: string;
  canCall2?: boolean;
  canText2?: boolean;
  email?: string;
  canEmail?: boolean;
  notes?: string;
  // Legacy aliases
  call1?: boolean;
  text1?: boolean;
  call2?: boolean;
  text2?: boolean;
  emailOn?: boolean;
}

const STORAGE_KEY = 'momentum_support_contacts';

// Checkboxes default to FALSE
const EMPTY: Omit<MultiSupportContact, 'id'> = {
  name: '',
  role: '',
  phone1: '',
  canCall: false,
  canText: false,
  phone2: '',
  canCall2: false,
  canText2: false,
  email: '',
  canEmail: false,
  notes: '',
};

const clean = (p: string) => p.replace(/[^0-9+]/g, '');

const btn =
  'rounded-xl px-4 py-2 font-medium text-sm border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 shadow-sm transition-all flex items-center gap-2 no-underline';

function Pencil({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function Trash2({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function Phone({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MessageSquare({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function Mail({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default function SupportContactsCard() {
  const [isMounted, setIsMounted] = useState(false);
  const [contacts, setContacts] = useState<MultiSupportContact[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<MultiSupportContact, 'id'>>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-only read (avoids hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setContacts(
            parsed.map((c: any) => ({
              ...c,
              canCall: Boolean(c.canCall ?? c.call1),
              canText: Boolean(c.canText ?? c.text1),
              canCall2: Boolean(c.canCall2 ?? c.call2),
              canText2: Boolean(c.canText2 ?? c.text2),
              canEmail: Boolean(c.canEmail ?? c.emailOn),
            }))
          );
          return;
        }
      }
      // Migrate legacy single contact
      const legacy = localStorage.getItem('momentum_support_contact');
      if (legacy) {
        const l = JSON.parse(legacy);
        if (l && l.name) {
          const migrated: MultiSupportContact = {
            ...EMPTY,
            id: `c_${Date.now()}`,
            name: l.name,
            role: l.role || '',
            phone1: l.phone || '',
            canCall: true,
            canText: false,
            notes: l.notes || '',
          };
          setContacts([migrated]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify([migrated]));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: MultiSupportContact[]) {
    setContacts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  }

  function openEdit(c: MultiSupportContact) {
    setEditingId(c.id);
    setForm({
      name: c.name || '',
      role: c.role || '',
      phone1: c.phone1 || '',
      canCall: Boolean(c.canCall ?? c.call1),
      canText: Boolean(c.canText ?? c.text1),
      phone2: c.phone2 || '',
      canCall2: Boolean(c.canCall2 ?? c.call2),
      canText2: Boolean(c.canText2 ?? c.text2),
      email: c.email || '',
      canEmail: Boolean(c.canEmail ?? c.emailOn),
      notes: c.notes || '',
    });
    setError(null);
    setShowForm(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please enter a name.');
      return;
    }
    if (!form.phone1.trim() && !form.phone2?.trim() && !form.email?.trim()) {
      setError('Add at least one phone number or email.');
      return;
    }
    const record: MultiSupportContact = {
      id: editingId || `c_${Date.now()}`,
      ...form,
      call1: form.canCall,
      text1: form.canText,
      call2: form.canCall2,
      text2: form.canText2,
      emailOn: form.canEmail,
    };

    if (editingId) {
      persist(contacts.map((c) => (c.id === editingId ? record : c)));
    } else {
      persist([...contacts, record]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this contact?')) return;
    persist(contacts.filter((c) => c.id !== id));
  }

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const input =
    'w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-600 bg-white text-sm text-slate-800 outline-none';
  const check = 'flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-4 text-left sm:col-span-2">
      {/* Permanent Crisis Safeguards Banner */}
      <div className="w-full rounded-2xl bg-rose-600 text-white p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="text-sm sm:text-base font-extrabold flex items-center gap-1.5">
            <span>🆘</span>
            <span>Crisis Support Available 24/7</span>
          </div>
          <p className="text-xs sm:text-sm text-rose-100 font-medium mt-0.5">
            Free, confidential 24/7 support. Call or text 988 (Suicide &amp; Crisis Lifeline), or text 741741 (Crisis Text Line).
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <a
            href="tel:988"
            className="flex-1 sm:flex-none text-xs font-bold px-3.5 py-2 bg-white text-rose-700 hover:bg-rose-50 rounded-xl whitespace-nowrap text-center transition-colors no-underline shadow-xs"
          >
            Call 988
          </a>
          <a
            href="sms:741741?body=HOME"
            className="flex-1 sm:flex-none text-xs font-bold px-3.5 py-2 bg-rose-950/40 hover:bg-rose-950/60 text-white border border-rose-300/40 rounded-xl whitespace-nowrap text-center transition-colors no-underline shadow-xs"
            title="Text HOME to 741741 for free, confidential 24/7 crisis support"
          >
            Text Crisis Line
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xl font-extrabold text-slate-900">📞 My Support Contacts</h4>
        {!showForm && (
          <button
            type="button"
            onClick={openNew}
            className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl cursor-pointer"
          >
            + Add Contact
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={input} placeholder="Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <input
              className={input}
              placeholder="Role / Relationship (e.g. Therapist)"
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <input
              className={input}
              type="tel"
              placeholder="Primary phone"
              value={form.phone1}
              onChange={(e) => set('phone1', e.target.value)}
            />
            <div className="flex gap-4">
              <label className={check}>
                <input type="checkbox" checked={form.canCall} onChange={(e) => set('canCall', e.target.checked)} /> Call
              </label>
              <label className={check}>
                <input type="checkbox" checked={form.canText} onChange={(e) => set('canText', e.target.checked)} /> Text
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <input
              className={input}
              type="tel"
              placeholder="Secondary phone (optional)"
              value={form.phone2 || ''}
              onChange={(e) => set('phone2', e.target.value)}
            />
            <div className="flex gap-4">
              <label className={check}>
                <input type="checkbox" checked={Boolean(form.canCall2)} onChange={(e) => set('canCall2', e.target.checked)} /> Call
              </label>
              <label className={check}>
                <input type="checkbox" checked={Boolean(form.canText2)} onChange={(e) => set('canText2', e.target.checked)} /> Text
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <input
              className={input}
              type="email"
              placeholder="Email (optional)"
              value={form.email || ''}
              onChange={(e) => set('email', e.target.value)}
            />
            <label className={check}>
              <input type="checkbox" checked={Boolean(form.canEmail)} onChange={(e) => set('canEmail', e.target.checked)} /> Email
            </label>
          </div>

          <textarea
            className={input}
            rows={2}
            placeholder="Context notes (optional) — e.g. best times to reach, what helps"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />

          {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[40px] px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm cursor-pointer"
            >
              {editingId ? 'Save Changes' : 'Save Contact'}
            </button>
          </div>
        </form>
      )}

      {isMounted && contacts.length === 0 && !showForm && (
        <p className="text-sm text-slate-600">
          Add trusted people so you can call, text, or email them in one tap when you need support.
        </p>
      )}

      {isMounted && contacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map((c) => {
            const hasCall1 = c.phone1 && Boolean(c.canCall ?? c.call1);
            const hasText1 = c.phone1 && Boolean(c.canText ?? c.text1);
            const hasCall2 = c.phone2 && Boolean(c.canCall2 ?? c.call2);
            const hasText2 = c.phone2 && Boolean(c.canText2 ?? c.text2);
            const hasEmail = c.email && Boolean(c.canEmail ?? c.emailOn);

            return (
              <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">{c.name}</div>
                    {c.role && <div className="text-xs font-semibold text-emerald-800">{c.role}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="p-2 rounded-lg bg-transparent border-0 shadow-none text-stone-400 hover:bg-stone-100 hover:text-stone-800 transition-colors cursor-pointer"
                      aria-label="Edit contact"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="p-2 rounded-lg bg-transparent border-0 shadow-none text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      aria-label="Delete contact"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {c.notes && <p className="text-xs text-slate-600 italic">{c.notes}</p>}

                <div className="flex flex-wrap gap-2">
                  {hasCall1 && (
                    <a href={`tel:${clean(c.phone1)}`} className={btn}>
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Call</span>
                    </a>
                  )}
                  {hasText1 && (
                    <a href={`sms:${clean(c.phone1)}`} className={btn}>
                      <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Text</span>
                    </a>
                  )}
                  {hasCall2 && (
                    <a href={`tel:${clean(c.phone2!)}`} className={btn}>
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Call (2nd)</span>
                    </a>
                  )}
                  {hasText2 && (
                    <a href={`sms:${clean(c.phone2!)}`} className={btn}>
                      <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Text (2nd)</span>
                    </a>
                  )}
                  {hasEmail && (
                    <a href={`mailto:${c.email!.trim()}`} className={btn}>
                      <Mail className="w-4 h-4 text-violet-600 shrink-0" />
                      <span>Email</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
