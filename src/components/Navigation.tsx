"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsDrawer from "./SettingsDrawer";

export default function Navigation() {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const tabs = [
    {
      name: "Home",
      href: "/",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
    },
    {
      name: "Journal",
      href: "/journal",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      ),
    },
    {
      name: "Action Planner",
      href: "/tasks",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      ),
    },
    {
      name: "Toolkit",
      href: "/toolkit",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] h-[68px] flex items-center justify-center font-sans transition-all duration-200">
      <ul className="flex flex-row w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto justify-around items-center list-none m-0 p-0 px-3 h-full">
        {tabs.map((tab) => {
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname ? pathname.startsWith(tab.href) : false;
          return (
            <li key={tab.href} className="flex-1 flex justify-center items-center">
              <Link
                href={tab.href}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 w-full ${
                  isActive
                    ? "active text-emerald-700 bg-emerald-50 font-bold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="mb-0.5 transition-transform duration-200">{tab.icon}</div>
                <span className="text-[11px] sm:text-xs tracking-tight whitespace-nowrap">{tab.name}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1 flex justify-center items-center">
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 w-full cursor-pointer ${
              isSettingsOpen
                ? "active text-emerald-700 bg-emerald-50 font-bold"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
            }`}
            style={{
              backgroundColor: isSettingsOpen ? "#ecfdf5" : "transparent",
              border: "none",
              boxShadow: "none",
              transform: "none",
              cursor: "pointer",
            }}
            aria-label="Settings"
          >
            <div className="mb-0.5 transition-transform duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isSettingsOpen ? "#047857" : "#64748b"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <span
              className="tracking-tight whitespace-nowrap"
              style={{
                fontSize: "0.75rem",
                color: isSettingsOpen ? "#047857" : "#64748b",
              }}
            >
              Settings
            </span>
          </button>
        </li>
      </ul>
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </nav>
  );
}
