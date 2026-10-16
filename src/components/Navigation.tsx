"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsDrawer from "./SettingsDrawer";
import { useResiliencePoints } from "@/lib/points";
import { useAuth } from "@/context/AuthContext";

export default function Navigation() {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { points } = useResiliencePoints();
  const [closedLoops, setClosedLoops] = useState(0);
  const { pinLockEnabled, lockNow, handleSignOut } = useAuth();
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/login/" ||
    pathname === "/register" ||
    pathname === "/register/";

  // Closed-loop count is published by the Home page; read it on mount and on updates
  useEffect(() => {
    const readStats = () => {
      try {
        const raw = localStorage.getItem("momentum_closed_loops_count");
        setClosedLoops(raw ? Number(raw) || 0 : 0);
      } catch (_) {}
    };
    readStats();
    window.addEventListener("momentum:stats", readStats);
    window.addEventListener("storage", readStats);
    return () => {
      window.removeEventListener("momentum:stats", readStats);
      window.removeEventListener("storage", readStats);
    };
  }, []);

  if (isAuthPage) {
    return null;
  }

  const tabs = [
    {
      name: "Home",
      href: "/",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
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
          width="20"
          height="20"
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
          width="20"
          height="20"
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
          width="20"
          height="20"
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


  const settingsIcon = (size: number, color?: string) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );

  const isTabActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname ? pathname.startsWith(href) : false;

  const openRoadmap = () => {
    window.dispatchEvent(new Event("momentum:open-roadmap"));
  };

  return (
    <>
      {/* TOP HEADER: 3-zone layout */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-3 w-full flex items-center justify-between">

          {/* Left Zone: Brand lockup */}
          <div className="flex-shrink-0 pr-6">
            <Link
              href="/"
              className="flex flex-col justify-center hover:opacity-90 transition-opacity no-underline"
            >
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900 leading-none">
                Momentum
              </span>
              <span className="text-xs md:text-sm text-stone-500 font-normal leading-tight mt-0.5 whitespace-nowrap">
                Small, gentle steps forward.
              </span>
            </Link>
          </div>

          {/* Center Zone: Navigation pills (desktop only) */}
          <nav className="hidden md:flex items-center justify-center gap-1 flex-1" aria-label="Desktop primary navigation">
            {tabs.map((tab) => {
              const isActive = isTabActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 no-underline whitespace-nowrap ${
                    isActive
                      ? "text-emerald-800 bg-emerald-50/80 border border-emerald-200/70 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-stone-100/70 border border-transparent"
                  }`}
                >
                  <span className="text-current opacity-80">{tab.icon}</span>
                  <span>{tab.name}</span>
                </Link>
              );
            })}

            {/* Settings */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer border whitespace-nowrap ${
                isSettingsOpen
                  ? "text-emerald-800 bg-emerald-50/80 border-emerald-200/70 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-stone-100/70 border-transparent bg-transparent"
              }`}
              aria-label="Settings"
            >
              <span className="text-current opacity-80">{settingsIcon(18)}</span>
              <span>Settings</span>
            </button>
          </nav>

          {/* Right Zone: Unified Points Pill + Lock Now & Sign Out */}
          <div className="flex-shrink-0 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={openRoadmap}
              title="View Mastery Roadmap"
              aria-label="View Mastery Roadmap"
              className="cursor-pointer flex items-center px-4 py-2 gap-3 text-sm md:text-base font-semibold rounded-full border border-stone-200 bg-stone-50 hover:bg-stone-100/80 shadow-sm transition-all text-stone-700 select-none"
            >
              <span className="flex items-center gap-1.5 font-semibold text-stone-800 text-sm md:text-base">
                <span className="text-base leading-none" aria-hidden="true">🛡️</span>
                <span className="text-sm md:text-base">{points}</span>
              </span>
              <span className="h-3.5 w-px bg-stone-300" aria-hidden="true" />
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 text-sm md:text-base">
                <span className="text-base leading-none" aria-hidden="true">🔄</span>
                <span className="text-sm md:text-base">{closedLoops}</span>
              </span>
            </button>

            {!isAuthPage && pinLockEnabled && (
              <button
                type="button"
                onClick={lockNow}
                title="Lock App Now"
                aria-label="Lock Now"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 shadow-2xs transition-all whitespace-nowrap"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span className="hidden sm:inline">Lock Now</span>
              </button>
            )}

            {!isAuthPage && (
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 bg-transparent hover:bg-stone-100/80 border border-stone-200/80 transition-all whitespace-nowrap"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (< md) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-200 z-50 px-2 py-2 flex justify-around items-center font-sans"
        aria-label="Mobile bottom navigation"
      >
        {tabs.map((tab) => {
          const isActive = isTabActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors no-underline ${
                isActive ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              {tab.icon}
              <span className="text-[11px] tracking-tight whitespace-nowrap">
                {tab.name === "Action Planner" ? "Planner" : tab.name}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors cursor-pointer bg-transparent border-0 ${
            isSettingsOpen ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-900 font-medium"
          }`}
          aria-label="Settings"
        >
          {settingsIcon(20)}
          <span className="text-[11px] tracking-tight whitespace-nowrap">Settings</span>
        </button>
      </nav>

      {/* Slide-over Settings Drawer */}
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
