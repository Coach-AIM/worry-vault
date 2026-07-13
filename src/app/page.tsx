"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ExportPdfButton from "@/components/ExportPdfButton";
import { getRandomQuote, QuoteItem } from "@/utils/perspectiveQuotes";
import { signOut } from "next-auth/react";

type TherapistContact = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const DISTORTION_MAP: Record<string, string> = {
  "all-or-nothing": "All-or-Nothing",
  catastrophizing: "Catastrophizing",
  "should-statements": "Should Statements",
  "mind-reading": "Mind Reading",
  "emotional-reasoning": "Emotional Reasoning",
  overgeneralization: "Overgeneralization",
};

export default function Home() {
  const [contact, setContact] = useState<TherapistContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isNight, setIsNight] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [backingUp, setBackingUp] = useState(false);

  // Dynamic Dashboard Stats
  const [entriesCount, setEntriesCount] = useState<number>(0);
  const [recentTraps, setRecentTraps] = useState<string[]>([]);
  const [quote, setQuote] = useState<QuoteItem | null>(null);

  async function handleDownloadBackup() {
    const password = prompt(
      "Set a local extraction password to encrypt your backup file:",
    );
    if (!password) {
      alert("Password is required to encrypt backup.");
      return;
    }

    setBackingUp(true);
    try {
      const res = await fetch("/api/backup");
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
        ["deriveKey"],
      );

      const key = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"],
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        dataBytes,
      );

      const backupPackage = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(encrypted)),
        hint: "momentum encrypted backup",
      };

      const blob = new Blob([JSON.stringify(backupPackage, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "worry_vault_backup.json";
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
      const res = await fetch("/api/therapist");
      const data = await res.json();
      if (data.contact) {
        setContact(data.contact);
        setName(data.contact.name || "");
        setPhone(data.contact.phone || "");
        setEmail(data.contact.email || "");
        setNotes(data.contact.notes || "");
      } else {
        setContact(null);
      }
    } catch (err) {
      console.error("Failed to fetch therapist details:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchJournalStats() {
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      if (data.entries) {
        setEntriesCount(data.entries.length);

        // Extract cognitive distortions
        const trapsSet = new Set<string>();
        data.entries.forEach((e: any) => {
          if (e.distortionsJson) {
            try {
              const parsed = JSON.parse(e.distortionsJson);
              if (Array.isArray(parsed)) {
                parsed.forEach((t) => {
                  const resolvedName = DISTORTION_MAP[t] || t;
                  trapsSet.add(resolvedName);
                });
              }
            } catch (err) {}
          }
        });
        setRecentTraps(Array.from(trapsSet).slice(0, 3));
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }

  useEffect(() => {
    fetchContact();
    fetchJournalStats();
    const hour = new Date().getHours();
    const evening = hour >= 18 || hour < 6;
    setIsNight(evening);
    setQuote(getRandomQuote(evening));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch("/api/therapist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, notes }),
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
    <div
      className="animate-fade-in"
      style={{
        maxWidth: "650px",
        margin: "0 auto",
        paddingTop: "1.5rem",
        paddingBottom: "3.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <header style={{ marginBottom: "3rem", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "3.5rem",
            color: "var(--sage-green)",
            marginBottom: "0.25rem",
            fontWeight: 700,
            letterSpacing: "-1px",
          }}
        >
          Momentum
        </h1>
        <p
          style={{
            fontSize: "1.15rem",
            color: "hsl(200, 10%, 50%)",
            fontWeight: 500,
          }}
        >
          Small, gentle steps forward.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
        {/* Dynamic Time-Gated Check-in Banner */}
        <div
          className="card-glass"
          style={{
            borderLeft: isNight ? "4px solid var(--accent-gold)" : "4px solid var(--sage-green)",
            borderRadius: "var(--radius)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
            textAlign: "center",
            boxShadow: "0 4px 15px rgba(92, 127, 102, 0.04)",
          }}
        >
          <div>
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>
              {isNight ? "🌙" : "☀️"}
            </span>
            <strong style={{ color: isNight ? "var(--accent-gold-text)" : "var(--sage-green)", fontSize: "1.1rem" }}>
              {isNight ? "Evening Reflection" : "Day Check-In"}
            </strong>{" "}
            <p
              style={{
                color: "var(--foreground)",
                fontSize: "0.95rem",
                opacity: 0.9,
                margin: "0.5rem 0 0 0",
                lineHeight: 1.5,
              }}
            >
              {isNight
                ? "Ready to release today's worries and plan a restful tomorrow?"
                : "Ready to log your focus, check in on your goals, or practice CBT thought reframing?"}
            </p>
          </div>
          <Link
            href={isNight ? "/reflect" : "/journal"}
            className="btn-primary"
            style={{
              backgroundColor: isNight ? "var(--accent-gold)" : "var(--sage-green)",
              color: "#fff",
              padding: "0.65rem 1.5rem",
              borderRadius: "var(--radius)",
              fontSize: "0.95rem",
              fontWeight: 700,
              boxShadow: "none",
              width: "100%",
              maxWidth: "240px",
              textAlign: "center",
            }}
          >
            {isNight ? "Start Reflection" : "Start Guided Journal"}
          </Link>
        </div>

        {/* PRIMARY FUNCTION: CBT Journal Card (Top of the Welcome Page) */}
        <section
          className="card-premium"
          style={{
            borderTop: "4px solid var(--sage-green)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.6rem",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            📝 CBT Journal & Reflections
          </h2>
          <p
            style={{
              color: "var(--foreground)",
              opacity: 0.8,
              lineHeight: 1.6,
              marginBottom: "1.75rem",
              fontSize: "1rem",
              textAlign: "center",
            }}
          >
            Process distressing moments with our guided 5-step CBT Thought
            Record wizard to challenge thinking traps, or log positive victories
            to anchor and savor your strengths.
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", alignItems: "center" }}
          >
            <Link
              href="/journal"
              className="btn-primary"
              style={{
                display: "block",
                textAlign: "center",
                fontSize: "1.05rem",
                padding: "0.85rem 1.5rem",
                width: "100%",
                maxWidth: "320px",
              }}
            >
              ✍️ Open Guided Journal
            </Link>
            <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
              <span style={{ fontSize: "0.9rem", color: "hsl(200, 10%, 50%)" }}>
                Winding down for the day?{" "}
              </span>
              <Link
                href="/reflect"
                style={{
                  fontSize: "0.9rem",
                  color: "var(--sage-green)",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Start End-of-Day Reflection &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Context-Aware Quote Deck */}
        {quote && (
          <section
            className="card-premium"
            style={{
              textAlign: "center",
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "3rem", color: "var(--sage-green)", opacity: 0.3, display: "block", height: "1.5rem", lineHeight: 0.5 }}>“</span>
            <p
              style={{
                fontSize: "1.15rem",
                fontStyle: "italic",
                color: "var(--foreground)",
                opacity: 0.9,
                lineHeight: 1.6,
                margin: "0.5rem 0 1.25rem 0",
                textAlign: "center",
                maxWidth: "500px",
              }}
            >
              {quote.text}
            </p>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "hsl(200, 10%, 45%)" }}>
              — {quote.author}
            </span>
          </section>
        )}

        {/* ACTION PLANNER CARD (Below Quote Deck) */}
        <section
          className="card-premium"
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
            📅 Action Planner
          </h2>
          <p
            style={{
              color: "var(--foreground)",
              opacity: 0.8,
              lineHeight: 1.5,
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
              textAlign: "center",
            }}
          >
            Break down worries and tasks into small, manageable daily
            checklists, schedule recurrences, and track habits.
          </p>
          <Link
            href="/tasks"
            className="btn-secondary"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: "0.95rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "var(--sage-green-light)",
              color: "var(--sage-green)",
              borderColor: "rgba(92,127,102,0.1)",
              width: "100%",
              maxWidth: "320px",
            }}
          >
            📋 Open Action Planner
          </Link>
        </section>

        {/* DECISION ASSISTANT CARD (Below Action Planner) */}
        <section
          className="card-premium"
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
            🤔 Decision Assistant
          </h2>
          <p
            style={{
              color: "var(--foreground)",
              opacity: 0.8,
              lineHeight: 1.5,
              marginBottom: "1.5rem",
              fontSize: "0.95rem",
              textAlign: "center",
            }}
          >
            Facing a tough choice? Use our multi-step wizard to align options
            with your core values, calculate balanced pros/cons, and track
            results.
          </p>
          <Link
            href="/decisions"
            className="btn-secondary"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: "0.95rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "var(--accent-gold-light)",
              color: "var(--accent-gold-text)",
              borderColor: "rgba(217,145,38,0.1)",
              width: "100%",
              maxWidth: "320px",
            }}
          >
            🎯 Open Decision Assistant
          </Link>
        </section>

        {/* Therapist / Support Network Card */}
        <section
          className="card-premium"
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
            📞 My Support Contact
          </h2>

          {loading ? (
            <p style={{ color: "hsl(200, 10%, 50%)", fontSize: "0.95rem" }}>
              Loading support details...
            </p>
          ) : isEditing ? (
            /* Editing form */
            <form
              onSubmit={handleSave}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                width: "100%",
                alignItems: "center",
              }}
            >
              <div style={{ width: "100%", textAlign: "left" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginBottom: "0.4rem",
                    color: "var(--foreground)",
                    opacity: 0.8,
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jordan Robin"
                  required
                  className="form-input"
                />
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", width: "100%" }}>
                <div style={{ flex: 1, minWidth: "140px", textAlign: "left" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "0.4rem",
                      color: "var(--foreground)",
                      opacity: 0.8,
                    }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 019-2834"
                    className="form-input"
                  />
                </div>
                <div style={{ flex: 1, minWidth: "140px", textAlign: "left" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "0.4rem",
                      color: "var(--foreground)",
                      opacity: 0.8,
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jordan@therapy.com"
                    className="form-input"
                  />
                </div>
              </div>
              <div style={{ width: "100%", textAlign: "left" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginBottom: "0.4rem",
                    color: "var(--foreground)",
                    opacity: 0.8,
                  }}
                >
                  Notes / Hours
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Available Mon-Wed. Emergency hours till 8 PM."
                  rows={2}
                  className="form-input"
                  style={{ resize: "vertical" }}
                />
              </div>
              <div
                style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", justifyContent: "center" }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "0.65rem 1.5rem" }}
                >
                  Save Details
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary"
                  style={{ padding: "0.65rem 1.5rem" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : contact ? (
            /* Displaying Details */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
              <p
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  margin: "0 0 0.5rem 0",
                  textAlign: "center",
                }}
              >
                {contact.name}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1.25rem",
                  width: "100%",
                }}
              >
                {contact.phone && (
                  <div
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--foreground)",
                      opacity: 0.9,
                      textAlign: "center",
                    }}
                  >
                    📞 Phone:{" "}
                    <a
                      href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                      style={{ color: "var(--sage-green)", fontWeight: 700 }}
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.email && (
                  <div
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--foreground)",
                      opacity: 0.9,
                      textAlign: "center",
                    }}
                  >
                    ✉️ Email:{" "}
                    <a
                      href={`mailto:${contact.email}`}
                      style={{ color: "var(--sage-green)", fontWeight: 700 }}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.notes && (
                  <div
                    className="badge-sage"
                    style={{
                      fontSize: "0.9rem",
                      fontStyle: "italic",
                      marginTop: "0.5rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      borderLeft: "4px solid var(--sage-green)",
                      textAlign: "center",
                      maxWidth: "400px",
                    }}
                  >
                    {contact.notes}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn-secondary"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", width: "100%", maxWidth: "200px" }}
              >
                ✏️ Edit Contact Info
              </button>
            </div>
          ) : (
            /* Placeholder / No details added */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <p
                style={{
                  color: "var(--foreground)",
                  opacity: 0.8,
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                  marginBottom: "1.25rem",
                  textAlign: "center",
                }}
              >
                Having quick access to your therapist or a trusted support
                person can be grounding during a difficult moment. Add their
                details here so you can reach them in one click.
              </p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn-primary"
                style={{ padding: "0.65rem 1.5rem", fontSize: "0.9rem", width: "100%", maxWidth: "220px" }}
              >
                + Add Support Contact
              </button>
            </div>
          )}
        </section>

        {/* Therapy Integration */}
        <section
          className="card-glass"
          style={{
            padding: "2rem",
            borderRadius: "var(--radius)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              fontSize: "1.3rem",
              color: "var(--foreground)",
              marginBottom: "0.5rem",
              fontWeight: 700,
            }}
          >
            Therapy Integration
          </h3>
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--foreground)",
              opacity: 0.8,
              marginBottom: "1.5rem",
              marginInline: "auto",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            Export your completed grounding steps and CBT insights to review in
            your next session.
          </p>
          <ExportPdfButton />
        </section>

        {/* Encrypted Vault Backup Utility */}
        <section
          className="card-premium"
          style={{
            border: "1px solid var(--accent-gold)",
            backgroundColor: "var(--accent-gold-light)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              fontSize: "1.3rem",
              color: "var(--accent-gold-text)",
              marginBottom: "0.5rem",
              fontWeight: 700,
            }}
          >
            🔒 Secure Vault Backup
          </h3>
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--foreground)",
              opacity: 0.8,
              marginBottom: "1.5rem",
              marginInline: "auto",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            Download an encrypted local backup file of your entire wellness data
            (thought records, victories, tasks).
          </p>
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={backingUp}
            className="btn-primary"
            style={{
              width: "100%",
              maxWidth: "320px",
              fontSize: "1.05rem",
              padding: "0.85rem",
              backgroundColor: "var(--accent-gold)",
              color: "#fff",
              boxShadow: "none",
            }}
          >
            {backingUp
              ? "Creating Encrypted Backup..."
              : "🔐 Create Encrypted Backup"}
          </button>
        </section>

        {/* Sign Out Button (Clean, centered mobile fallback) */}
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-secondary"
            style={{
              padding: "0.6rem 1.5rem",
              fontSize: "0.9rem",
              color: "var(--accent-danger-text)",
              backgroundColor: "var(--accent-danger-bg)",
              borderColor: "rgba(220, 53, 69, 0.1)",
              width: "100%",
              maxWidth: "200px",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
