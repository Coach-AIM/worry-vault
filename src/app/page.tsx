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
        paddingBottom: "1rem",
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
            {/* Perspective Header */}
            <h4 className="text-lg font-bold text-slate-800 mb-2">Perspective</h4>
            
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

        {/* Centered Mini-Planner Card */}
        <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center mt-6">
          {/* Centered Title */}
          <h4 className="text-lg font-bold text-slate-800 mb-2">Today's Focus</h4>
          <p className="text-sm text-slate-500 mb-4">Small daily habits build long-term momentum.</p>

          {/* Compact Tasks Grid/Flex */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full my-2 text-slate-700">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-700">
              <span className="font-semibold text-slate-900">Today:</span>
              <div className="flex items-center gap-1.5">
                <input type="checkbox" checked readOnly className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
                <span>Meditate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="checkbox" disabled className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
                <span>Read</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="checkbox" disabled className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
                <span>Walk</span>
              </div>
            </div>
            <div className="text-slate-400 hidden sm:block">|</div>
            <div className="text-sm font-medium">
              <span className="font-semibold text-slate-900">Tomorrow:</span> • Therapy Prep
            </div>
          </div>

          {/* Centered Primary Action Button */}
          <Link href="/tasks" className="mt-4 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 rounded-xl transition-colors">
            Open Full Action Planner
          </Link>
        </div>
      </div>
    </div>
  );
}
