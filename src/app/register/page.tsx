"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { initializeCleanUserState } from "@/utils/storage";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasAcceptedDisclosure, setHasAcceptedDisclosure] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAcceptedDisclosure) {
      setError("Please acknowledge the medical & safety disclosure to proceed.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          disclaimerAccepted: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      // Ensure clean state: wipe prior session leaks, zero habits & metrics, isolate user reflections
      try {
        initializeCleanUserState(username, { disclaimerAccepted: false });
      } catch (_) {}

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f8faf9] px-4 py-8">
      <div className="max-w-md w-full bg-white p-7 sm:p-9 rounded-3xl shadow-xl border border-stone-200/80">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-serif mb-1">
            Momentum
          </h1>
          <p className="text-stone-500 text-sm font-medium">
            Create Private Locker
          </p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-2">
            <div className="text-4xl animate-bounce">🎉</div>
            <h3 className="text-xl font-bold text-emerald-800">
              Account Created!
            </h3>
            <p className="text-stone-600 text-sm">
              Redirecting to sign-in page...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="E.g., jordan"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Minimum 6 characters"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
              />
            </div>

            {/* Medical & Crisis Disclosure Checkbox */}
            <div className="bg-stone-50/90 border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 space-y-2.5 transition-all">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAcceptedDisclosure}
                  onChange={(e) => {
                    setHasAcceptedDisclosure(e.target.checked);
                    if (error) setError(null);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600 accent-emerald-700 shrink-0 cursor-pointer"
                />
                <span className="text-xs text-stone-600 leading-relaxed font-normal">
                  I understand that Momentum is an educational self-help tool, not a substitute for professional clinical advice, psychiatric treatment, or crisis intervention. If I am in crisis, I will contact 988 or 911.
                </span>
              </label>

              <div className="pl-7">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  Read Full Terms &amp; Safety Policy
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center animate-fadeIn"
                role="alert"
              >
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !hasAcceptedDisclosure}
              className={`w-full py-3 px-4 text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer text-white ${
                loading || !hasAcceptedDisclosure
                  ? "bg-emerald-800/50 cursor-not-allowed opacity-60"
                  : "bg-emerald-700 hover:bg-emerald-800 shadow-md"
              }`}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>

            {/* Sign In Link */}
            <div className="text-center pt-2 text-xs text-stone-500 font-medium">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-emerald-700 font-bold hover:underline no-underline"
              >
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>

      {/* Terms & Safety Policy Modal */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 sm:p-7 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 id="terms-modal-title" className="text-base sm:text-lg font-extrabold text-stone-900">
                  Terms &amp; Safety Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-sm font-bold cursor-pointer"
                aria-label="Close Terms modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
              <p>
                <strong>Educational Self-Help Scope:</strong> Momentum is designed to support personal wellness through structured behavioral activation, cognitive reframing, and habit tracking. It is <em>not</em> an authorized medical device, clinical diagnostic tool, or replacement for psychiatric or psychological treatment.
              </p>
              
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <p className="font-bold text-xs uppercase tracking-wider mb-1">
                  🚨 Immediate Crisis Assistance
                </p>
                <p className="text-xs">
                  If you are experiencing thoughts of self-harm, severe distress, or a psychiatric emergency, please stop and contact emergency services immediately:
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <a href="tel:988" className="bg-rose-600 text-white px-2.5 py-1 rounded-md no-underline hover:bg-rose-700">
                    📞 Call / Text 988 (Lifeline)
                  </a>
                  <a href="sms:741741?body=HOME" className="bg-stone-800 text-white px-2.5 py-1 rounded-md no-underline hover:bg-stone-900">
                    💬 Text 741741 (Crisis Line)
                  </a>
                  <a href="tel:911" className="bg-stone-700 text-white px-2.5 py-1 rounded-md no-underline hover:bg-stone-800">
                    🚑 Call 911
                  </a>
                </div>
              </div>

              <p>
                <strong>On-Device Privacy Guarantee:</strong> 100% of your reflections, thoughts, and habit logs are stored locally on your device in browser storage. Your reflections are never shared with advertisers or third parties.
              </p>
            </div>

            <div className="pt-2 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setHasAcceptedDisclosure(true);
                  setShowTermsModal(false);
                }}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                I Understand &amp; Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
