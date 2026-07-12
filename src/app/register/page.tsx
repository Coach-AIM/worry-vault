"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

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
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f4f6f4",
        padding: "1rem",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          backgroundColor: "#fff",
          padding: "2.5rem",
          borderRadius: "var(--radius)",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "2.5rem",
              color: "var(--sage-green)",
              fontFamily: "serif",
              margin: "0 0 0.5rem 0",
              fontWeight: 600,
            }}
          >
            Momentum
          </h1>
          <p style={{ color: "#777", margin: 0, fontSize: "0.95rem" }}>
            Create Private Locker
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <h3 style={{ color: "var(--sage-green)", margin: "0 0 0.5rem 0" }}>
              Account Created!
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              Redirecting to sign-in page...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "0.4rem",
                  color: "#555",
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="E.g., jordan"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "0.4rem",
                  color: "#555",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  color: "#b45309",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  textAlign: "center",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.85rem",
                fontSize: "1rem",
                fontWeight: 600,
                backgroundColor: "var(--sage-green)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius)",
                cursor: "pointer",
                marginTop: "0.5rem",
              }}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>

            <div
              style={{
                textAlign: "center",
                marginTop: "1rem",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "#777" }}>Already have an account? </span>
              <Link
                href="/login"
                style={{
                  color: "var(--sage-green)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
