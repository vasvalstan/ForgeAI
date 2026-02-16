import { create } from "zustand";

export interface BoardItem {
  id: string;
  title: string;
  liveblocksRoomId: string;
  updatedAt: string;
  _count?: { discoveries: number; insights: number };
}

export interface DiscoveryItem {
  id: string;
  boardId: string;
  sourceType: string;
  status: string;
  createdAt: string;
  _count?: { insights: number };
}

export interface InsightItem {
  id: string;
  discoveryId: string;
  category: string;
  content: string;
  quote?: string;
  sentiment?: number;
}

export interface PRDItem {
  id: string;
  boardId: string;
  title: string;
  updatedAt: string;
}

export interface MeetingNoteItem {
  id: string;
  boardId: string;
  title: string;
  updatedAt: string;
}

type TreeSection = "boards" | "prds" | "transcripts" | "notes" | "insights";

interface WorkspaceState {
  // Selection
  selectedBoardId: string | null;
  selectedDiscoveryId: string | null;

  // Panel visibility
  sidebarCollapsed: boolean;
  agentPanelCollapsed: boolean;

  // Tree state
  expandedSections: Set<TreeSection>;
  expandedBoardIds: Set<string>;

  // Data
  boards: BoardItem[];
  discoveries: DiscoveryItem[];
  insights: InsightItem[];
  prds: PRDItem[];
  meetingNotes: MeetingNoteItem[];

  // Source viewer
  sourceViewerOpen: boolean;
  sourceDiscoveryId: string | null;
  sourceHighlight: { start: number; end: number } | null;

  // Credits
  credits: number;

  // Actions
  selectBoard: (boardId: string | null) => void;
  selectDiscovery: (discoveryId: string | null) => void;
  toggleSidebar: () => void;
  toggleAgentPanel: () => void;
  toggleSection: (section: TreeSection) => void;
  toggleBoardExpanded: (boardId: string) => void;
  setBoards: (boards: BoardItem[]) => void;
  setDiscoveries: (discoveries: DiscoveryItem[]) => void;
  setInsights: (insights: InsightItem[]) => void;
  setPRDs: (prds: PRDItem[]) => void;
  setMeetingNotes: (notes: MeetingNoteItem[]) => void;
  setCredits: (credits: number) => void;
  openSourceViewer: (discoveryId: string, start: number, end: number) => void;
  closeSourceViewer: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedBoardId: null,
  selectedDiscoveryId: null,
  sidebarCollapsed: false,
  agentPanelCollapsed: false,
  expandedSections: new Set<TreeSection>(["boards"]),
  expandedBoardIds: new Set<string>(),
  boards: [],
  discoveries: [],
  insights: [],
  prds: [],
  meetingNotes: [],
  sourceViewerOpen: false,
  sourceDiscoveryId: null,
  sourceHighlight: null,
  credits: 100,

  selectBoard: (boardId) =>
    set({ selectedBoardId: boardId, selectedDiscoveryId: null }),

  selectDiscovery: (discoveryId) =>
    set({ selectedDiscoveryId: discoveryId }),

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  toggleAgentPanel: () =>
    set((s) => ({ agentPanelCollapsed: !s.agentPanelCollapsed })),

  toggleSection: (section) =>
    set((s) => {
      const next = new Set(s.expandedSections);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return { expandedSections: next };
    }),

  toggleBoardExpanded: (boardId) =>
    set((s) => {
      const next = new Set(s.expandedBoardIds);
      if (next.has(boardId)) next.delete(boardId);
      else next.add(boardId);
      return { expandedBoardIds: next };
    }),

  setBoards: (boards) => set({ boards }),
  setDiscoveries: (discoveries) => set({ discoveries }),
  setInsights: (insights) => set({ insights }),
  setPRDs: (prds) => set({ prds }),
  setMeetingNotes: (notes) => set({ meetingNotes: notes }),
  setCredits: (credits) => set({ credits }),

  openSourceViewer: (discoveryId, start, end) =>
    set({
      sourceViewerOpen: true,
      sourceDiscoveryId: discoveryId,
      sourceHighlight: { start, end },
    }),

  closeSourceViewer: () =>
    set({
      sourceViewerOpen: false,
      sourceDiscoveryId: null,
      sourceHighlight: null,
    }),
}));
