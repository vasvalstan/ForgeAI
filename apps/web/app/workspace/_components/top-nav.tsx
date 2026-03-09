"use client";

import {
  House,
  GearSix,
  Bell,
  CaretDown,
  MagnifyingGlass,
  ShareNetwork,
} from "@phosphor-icons/react";
import Link from "next/link";

export function TopNav() {
  return (
    <header className="flex-shrink-0 px-4 pt-4">
      <div className="flex h-[60px] items-center justify-between rounded-[28px] border border-forge-border bg-forge-surface px-3 shadow-card">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 items-center gap-3 rounded-[20px] border border-forge-border bg-forge-surface-2 px-4 text-forge-text"
          >
            <span className="text-base font-bold tracking-[0.08em] uppercase">
              Forge AI
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/workspace"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-forge-text transition-colors hover:bg-forge-surface-2"
            >
              <House size={16} />
              Home
            </Link>
            <button className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-forge-text-secondary transition-colors hover:bg-forge-surface-2 hover:text-forge-text">
              <GearSix size={16} />
              Settings
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex h-10 items-center gap-3 rounded-full border border-forge-border bg-forge-surface px-4 shadow-card">
              <MagnifyingGlass size={16} className="text-forge-text-secondary" />
              <div className="flex items-center -space-x-2">
                {["A", "D", "K"].map((initial, index) => (
                  <div
                    key={initial}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-forge-surface text-[10px] font-semibold text-white"
                    style={{
                      background:
                        index === 0
                          ? "#111827"
                          : index === 1
                            ? "#0f766e"
                            : "#7c3aed",
                    }}
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <CaretDown size={14} className="text-forge-text-dim" />
            </div>

            <button className="flex h-10 items-center gap-2 rounded-xl border border-forge-border bg-forge-surface px-3 text-sm font-medium text-forge-text shadow-card transition-colors hover:bg-forge-surface-2">
              <ShareNetwork size={16} />
              Share
            </button>
          </div>

          <button className="rounded-xl p-2 text-forge-text-dim transition-colors hover:bg-forge-surface-2 hover:text-forge-text">
            <Bell size={18} />
          </button>

          <button className="rounded-full border border-forge-border bg-forge-surface p-1 shadow-card transition-all hover:scale-[1.02]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400">
              <img
                src="https://api.dicebear.com/9.x/avataaars/svg?seed=forge"
                alt="User"
                className="h-9 w-9 rounded-full"
              />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
