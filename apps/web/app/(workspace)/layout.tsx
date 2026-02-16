"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { PMSidebar } from "./_components/pm-sidebar";
import { CanvasPanel } from "./_components/canvas-panel";
import { AgentPanel } from "./_components/agent-panel";
import { SourceViewer } from "./_components/source-viewer";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
  const agentPanelCollapsed = useWorkspaceStore((s) => s.agentPanelCollapsed);
  const setBoards = useWorkspaceStore((s) => s.setBoards);
  const setCredits = useWorkspaceStore((s) => s.setCredits);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch("/api/boards");
        if (res.ok) {
          const data = await res.json();
          setBoards(data.boards ?? []);
        }
      } catch {
        // Will use empty state
      }
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits ?? 100);
        }
      } catch {
        // Default credits
      }
    }
    loadInitialData();
  }, [setBoards, setCredits]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-forge-bg">
      {/* Left Panel — PM Sidebar */}
      <div
        className="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden border-r"
        style={{ width: sidebarCollapsed ? 48 : 320, borderColor: "rgba(255,255,255,0.1)" }}
      >
        <PMSidebar />
      </div>

      {/* Middle — Canvas */}
      <div className="flex-1 min-w-0 relative">
        <CanvasPanel />
        {children}
      </div>

      {/* Right Panel — AI Agents */}
      <div
        className="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden border-l"
        style={{ width: agentPanelCollapsed ? 48 : 360, borderColor: "rgba(255,255,255,0.1)" }}
      >
        <AgentPanel />
      </div>

      {/* Source Viewer Slide-over */}
      <SourceViewer />
    </div>
  );
}
