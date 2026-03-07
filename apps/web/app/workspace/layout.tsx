"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { PMSidebar } from "./_components/pm-sidebar";
import { CanvasPanel } from "./_components/canvas-panel";
import { AgentPanel } from "./_components/agent-panel";
import { SourceViewer } from "./_components/source-viewer";
import { PRDPanel } from "./_components/prd-panel";
import { TopNav } from "./_components/top-nav";
import { BottomToolbar } from "./_components/bottom-toolbar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
  const agentPanelCollapsed = useWorkspaceStore((s) => s.agentPanelCollapsed);
  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);
  const agentPanelWidth = useWorkspaceStore((s) => s.agentPanelWidth);
  const setSidebarWidth = useWorkspaceStore((s) => s.setSidebarWidth);
  const setAgentPanelWidth = useWorkspaceStore((s) => s.setAgentPanelWidth);
  const setBoards = useWorkspaceStore((s) => s.setBoards);
  const setCredits = useWorkspaceStore((s) => s.setCredits);

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 600) newWidth = 600;
        setSidebarWidth(newWidth);
      } else if (isDraggingRight) {
        let newWidth = window.innerWidth - e.clientX;
        if (newWidth < 250) newWidth = 250;
        if (newWidth > 800) newWidth = 800;
        setAgentPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDraggingLeft, isDraggingRight, setSidebarWidth, setAgentPanelWidth]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-forge-bg">
      {/* Top Navigation Bar */}
      <TopNav />

      {/* Main 3-panel area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel — PM Sidebar */}
        <div
          className={`flex-shrink-0 overflow-hidden border-r relative group ${!isDraggingLeft ? "transition-all duration-300 ease-in-out" : ""}`}
          style={{ width: sidebarCollapsed ? 48 : sidebarWidth, borderColor: "var(--color-forge-border-subtle)" }}
        >
          <PMSidebar />
          {!sidebarCollapsed && (
            <div 
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-50"
              onMouseDown={(e) => { e.preventDefault(); setIsDraggingLeft(true); }}
            />
          )}
        </div>

        {/* Middle — Canvas */}
        <div className="flex-1 min-w-0 relative">
          <CanvasPanel />
          {children}
        </div>

        {/* Right Panel — AI Agents */}
        <div
          className={`flex-shrink-0 overflow-hidden border-l relative group ${!isDraggingRight ? "transition-all duration-300 ease-in-out" : ""}`}
          style={{ width: agentPanelCollapsed ? 48 : agentPanelWidth, borderColor: "var(--color-forge-border-subtle)" }}
        >
          {!agentPanelCollapsed && (
            <div 
              className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-50"
              onMouseDown={(e) => { e.preventDefault(); setIsDraggingRight(true); }}
            />
          )}
          <AgentPanel />
        </div>
      </div>

      {/* Bottom Floating Toolbar */}
      <BottomToolbar />

      {/* Slide-over Panels */}
      <SourceViewer />
      <PRDPanel />
    </div>
  );
}
