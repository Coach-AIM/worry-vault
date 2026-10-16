"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const isRegister = pathname === "/register" || pathname === "/register/";

  if (isRegister) {
    return null;
  }

  return (
    <footer
      className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto"
      style={{
        textAlign: "center",
        padding: "2rem 1rem",
        marginTop: "auto",
        fontSize: "0.85rem",
        color: "var(--foreground)",
        borderTop: "1px solid var(--border)",
        opacity: 0.8,
      }}
    >
      <p style={{ margin: 0, maxWidth: "600px", marginInline: "auto" }}>
        Momentum is a self-help tool and not a substitute for professional
        medical advice, diagnosis, or treatment.
        <br />
        <strong>
          If in crisis, call 988 (Suicide & Crisis Lifeline) or 911.
        </strong>
      </p>
    </footer>
  );
}
