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
  'min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer no-underline';

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
            Call or text 988, or text HOME to 741741 for free, 24/7 crisis support.
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
          >
            Text HOME
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
                      className="min-w-[36px] min-h-[36px] rounded-lg hover:bg-white text-sm cursor-pointer"
                      aria-label="Edit contact"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="min-w-[36px] min-h-[36px] rounded-lg hover:bg-white text-sm cursor-pointer"
                      aria-label="Delete contact"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {c.notes && <p className="text-xs text-slate-600 italic">{c.notes}</p>}

                <div className="flex flex-wrap gap-2">
                  {hasCall1 && (
                    <a href={`tel:${clean(c.phone1)}`} className={`${btn} bg-slate-900 hover:bg-slate-800 text-white`}>
                      📞 Call
                    </a>
                  )}
                  {hasText1 && (
                    <a href={`sms:${clean(c.phone1)}`} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}>
                      💬 Text
                    </a>
                  )}
                  {hasCall2 && (
                    <a href={`tel:${clean(c.phone2!)}`} className={`${btn} bg-slate-700 hover:bg-slate-800 text-white`}>
                      📞 Call (2nd)
                    </a>
                  )}
                  {hasText2 && (
                    <a href={`sms:${clean(c.phone2!)}`} className={`${btn} bg-blue-500 hover:bg-blue-600 text-white`}>
                      💬 Text (2nd)
                    </a>
                  )}
                  {hasEmail && (
                    <a href={`mailto:${c.email!.trim()}`} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                      ✉️ Email
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
