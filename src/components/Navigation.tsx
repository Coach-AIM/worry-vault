"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Navigation() {
  const pathname = usePathname();

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
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl bg-white/95 backdrop-blur-md border border-slate-150 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] h-[68px] flex items-center justify-center">
      <ul className="flex flex-row w-full max-w-2xl mx-auto justify-around items-center list-none m-0 p-0 px-4 h-full">
        {tabs.map((tab) => {
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname ? pathname.startsWith(tab.href) : false;
          return (
            <li key={tab.href} className="flex-1 flex justify-center items-center">
              <Link
                href={tab.href}
                className={`flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 p-2 rounded-xl transition-all duration-300 w-full ${
                  isActive ? "active text-emerald-600 bg-emerald-50/50 font-semibold" : ""
                }`}
              >
                <div className="mb-0.5 transition-transform duration-300">{tab.icon}</div>
                <span className="text-[11px] sm:text-xs font-medium tracking-tight whitespace-nowrap">{tab.name}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1 flex justify-center items-center hidden md:flex">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-col items-center justify-center text-slate-400 hover:text-red-600 p-2 rounded-xl transition-all duration-300 w-full"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              boxShadow: "none",
              transform: "none",
            }}
          >
            <div className="mb-0.5">
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </div>
            <span className="text-[11px] sm:text-xs font-medium tracking-tight whitespace-nowrap">Sign Out</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
