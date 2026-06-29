"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ExportPdfButton from '@/components/ExportPdfButton';

type TherapistContact = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

export default function Home() {
  const [contact, setContact] = useState<TherapistContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isNight, setIsNight] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [backingUp, setBackingUp] = useState(false);

  async function handleDownloadBackup() {
    const password = prompt("Set a local extraction password to encrypt your backup file:");
    if (!password) {
      alert("Password is required to encrypt backup.");
      return;
    }
    
    setBackingUp(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error("Failed to fetch backup data");
      const data = await res.json();
      
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      const dataBytes = encoder.encode(dataString);
      
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const passwordKey = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
      
      const key = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        dataBytes
      );
      
      const backupPackage = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(encrypted)),
        hint: "momentum encrypted backup"
      };

      const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'worry_vault_backup.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert("Encrypted backup downloaded successfully!");
    } catch (err) {
      console.error("Backup failed:", err);
      alert("Failed to create encrypted backup.");
    } finally {
      setBackingUp(false);
    }
  }

  async function fetchContact() {
    setLoading(true);
    try {
      const res = await fetch('/api/therapist');
      const data = await res.json();
      if (data.contact) {
        setContact(data.contact);
        setName(data.contact.name || '');
        setPhone(data.contact.phone || '');
        setEmail(data.contact.email || '');
        setNotes(data.contact.notes || '');
      } else {
        setContact(null);
      }
    } catch (err) {
      console.error("Failed to fetch therapist details:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContact();
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 6) {
      setIsNight(true);
    }
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/therapist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, notes })
      });
      if (res.ok) {
        setIsEditing(false);
        fetchContact();
      }
    } catch (err) {
      console.error("Failed to save therapist details:", err);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '1rem', paddingBottom: '2rem' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--sage-green)', fontFamily: 'serif', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '-0.5px' }}>Momentum</h1>
        <p style={{ fontSize: '1.1rem', color: '#666', fontWeight: 400 }}>Small, gentle steps forward.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Evening Check-in Banner */}
        {isNight && (
          <div style={{
            backgroundColor: '#fdfbf7',
            border: '1px solid #f1e9db',
            borderRadius: 'var(--radius)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(143, 188, 143, 0.05)',
            animation: 'fadeIn 0.4s ease'
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🌙</span>
              <strong style={{ color: '#4a5d4e' }}>Evening Check-in:</strong>{" "}
              <span style={{ color: '#555', fontSize: '0.95rem' }}>Ready to release today's worries and plan a restful tomorrow?</span>
            </div>
            <Link href="/reflect" style={{
              backgroundColor: '#7da084',
              color: '#fff',
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.9rem',
              fontWeight: 500,
              textDecoration: 'none'
            }}>
              Start Reflection
            </Link>
          </div>
        )}

        {/* Welcome / Insight Card */}
        <section style={{ 
          padding: '2rem', 
          backgroundColor: '#fff', 
          borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--foreground)' }}>Welcome back.</h2>
          <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Check your Worry Vault to offload your thoughts, or review your Action Planner for gentle steps forward today. 
            Remember to take things one moment at a time.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/vault" style={{
              display: 'inline-block',
              backgroundColor: 'var(--sage-green)',
              color: '#fff',
              padding: '0.6rem 1.2rem',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 500,
              flex: '1',
              minWidth: '120px',
              textAlign: 'center'
            }}>
              Open Vaults
            </Link>
            <Link href="/tasks" style={{
              display: 'inline-block',
              backgroundColor: 'var(--soft-blue)',
              color: 'var(--foreground)',
              padding: '0.6rem 1.2rem',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 500,
              flex: '1',
              minWidth: '120px',
              textAlign: 'center'
            }}>
              Action Planner
            </Link>
            <Link href="/journal" style={{
              display: 'inline-block',
              backgroundColor: 'transparent',
              border: '1px solid var(--sage-green)',
              color: 'var(--sage-green)',
              padding: '0.6rem 1.2rem',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 500,
              flex: '1',
              minWidth: '120px',
              textAlign: 'center'
            }}>
              Write Journal
            </Link>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>Winding down for the day?</span>
            <Link href="/reflect" style={{ fontSize: '0.85rem', color: '#7da084', fontWeight: 600, textDecoration: 'none' }}>
              Start End-of-Day Reflection &rarr;
            </Link>
          </div>
        </section>

        {/* Therapist / Support Network Card */}
        <section style={{
          padding: '2rem',
          backgroundColor: '#fff',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--foreground)' }}>📞 My Support Contact</h2>
          
          {loading ? (
            <p style={{ color: '#666', fontSize: '0.95rem' }}>Loading support details...</p>
          ) : isEditing ? (
            /* Editing form */
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#555' }}>Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Dr. Jordan Robin" 
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#555' }}>Phone</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="(555) 019-2834" 
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#555' }}>Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="jordan@therapy.com" 
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#555' }}>Notes / Hours</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="E.g., Available Mon-Wed. Emergency hours till 8 PM." 
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" style={{ padding: '0.5rem 1.25rem' }}>Save Details</button>
                <button type="button" onClick={() => setIsEditing(false)} className="secondary" style={{ padding: '0.5rem 1.25rem' }}>Cancel</button>
              </div>
            </form>
          ) : contact ? (
            /* Displaying Details */
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>{contact.name}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {contact.phone && (
                  <div style={{ fontSize: '0.95rem', color: '#444' }}>
                    📞 Phone: <a href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`} style={{ color: 'var(--sage-green)', fontWeight: 600 }}>{contact.phone}</a>
                  </div>
                )}
                {contact.email && (
                  <div style={{ fontSize: '0.95rem', color: '#444' }}>
                    ✉️ Email: <a href={`mailto:${contact.email}`} style={{ color: 'var(--sage-green)', fontWeight: 600 }}>{contact.email}</a>
                  </div>
                )}
                {contact.notes && (
                  <div style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic', marginTop: '0.25rem', backgroundColor: '#fcfcfc', padding: '0.5rem 0.75rem', borderRadius: '4px', borderLeft: '3px solid var(--border)' }}>
                    {contact.notes}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setIsEditing(true)} className="secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                ✏️ Edit Contact Info
              </button>
            </div>
          ) : (
            /* Placeholder / No details added */
            <div>
              <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Having quick access to your therapist or a trusted support person can be grounding during a difficult moment. Add their details here so you can reach them in one click.
              </p>
              <button type="button" onClick={() => setIsEditing(true)} style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                + Add Support Contact
              </button>
            </div>
          )}
        </section>

        {/* Therapy Integration */}
        <section style={{ padding: '2rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', marginBottom: '0.5rem', fontWeight: 600 }}>Therapy Integration</h3>
          <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '1.5rem', marginInline: 'auto', maxWidth: '400px' }}>
            Export your completed grounding steps and CBT insights to review in your next session.
          </p>
          <ExportPdfButton />
        </section>

        {/* Encrypted Vault Backup Utility */}
        <section style={{ padding: '2rem', backgroundColor: '#fffdf5', borderRadius: 'var(--radius)', border: '1px solid #fde68a', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#78350f', marginBottom: '0.5rem', fontWeight: 600 }}>🔒 Secure Vault Backup</h3>
          <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '1.5rem', marginInline: 'auto', maxWidth: '400px' }}>
            Download an encrypted local backup file of your entire wellness data (thought records, victories, tasks).
          </p>
          <button 
            type="button" 
            onClick={handleDownloadBackup} 
            disabled={backingUp}
            style={{ 
              width: '100%', 
              fontSize: '1.05rem', 
              padding: '0.875rem', 
              backgroundColor: '#e9c46a', 
              color: '#264653', 
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer'
            }}
          >
            {backingUp ? 'Creating Encrypted Backup...' : '🔐 Create Encrypted Backup'}
          </button>
        </section>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
