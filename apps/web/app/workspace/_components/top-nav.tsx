"use client";

import {
  House,
  GearSix,
  Bell,
} from "@phosphor-icons/react";
import Link from "next/link";

export function TopNav() {
  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-5 bg-forge-surface border-b border-forge-border">
      {/* Left — Brand */}
      <Link href="/" className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-400))",
          }}
        >
          <span className="font-bold text-white text-[10px] tracking-tight">F</span>
        </div>
        <span className="font-bold text-base tracking-widest uppercase text-forge-text">
          FORGE AI
        </span>
      </Link>

      {/* Center — Nav Links */}
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0">
        <Link
          href="/workspace"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-forge-text hover:bg-forge-surface-2 transition-colors"
        >
          <House size={16} />
          Home
        </Link>
        <div className="w-px h-4 bg-forge-border mx-1" />
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-forge-text-dim hover:bg-forge-surface-2 hover:text-forge-text transition-colors cursor-pointer">
          <GearSix size={16} />
          Settings
        </button>
      </nav>

      {/* Right — Bell + Avatar */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-forge-text-dim hover:bg-forge-surface-2 hover:text-forge-text transition-colors cursor-pointer relative">
          <Bell size={20} />
        </button>

        <button className="p-0.5 rounded-full hover:ring-2 hover:ring-forge-border transition-all cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center">
            <img
              src="https://api.dicebear.com/9.x/avataaars/svg?seed=forge"
              alt="User"
              className="w-9 h-9 rounded-full"
            />
          </div>
        </button>
      </div>
    </header>
  );
}
