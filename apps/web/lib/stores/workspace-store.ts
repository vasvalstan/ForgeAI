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
  status: string;
  updatedAt: string;
}

export interface MeetingNoteItem {
  id: string;
  boardId: string;
  title: string;
  updatedAt: string;
}

export interface SpecItem {
  id: string;
  boardId: string;
  prdId?: string;
  title: string;
  status: string;
  complexity?: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  specId: string;
  title: string;
  status: string;
  complexity?: string;
  githubIssueUrl?: string;
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

  // PRD viewer
  prdViewerOpen: boolean;
  selectedPrdId: string | null;

  // Credits
  credits: number;

  // Canvas selection tracking
  selectedShapeIds: string[];

  // GitHub
  githubConnected: boolean;

  // Extra data
  specs: SpecItem[];
  tasks: TaskItem[];

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
  setSpecs: (specs: SpecItem[]) => void;
  setTasks: (tasks: TaskItem[]) => void;
  setCredits: (credits: number) => void;
  setSelectedShapeIds: (ids: string[]) => void;
  setGithubConnected: (connected: boolean) => void;
  openSourceViewer: (discoveryId: string, start: number, end: number) => void;
  closeSourceViewer: () => void;
  openPrdViewer: (prdId: string) => void;
  closePrdViewer: () => void;
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
  prdViewerOpen: false,
  selectedPrdId: null,
  credits: 100,
  selectedShapeIds: [],
  githubConnected: false,
  specs: [],
  tasks: [],

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
  setSpecs: (specs) => set({ specs }),
  setTasks: (tasks) => set({ tasks }),
  setCredits: (credits) => set({ credits }),
  setSelectedShapeIds: (ids) => set({ selectedShapeIds: ids }),
  setGithubConnected: (connected) => set({ githubConnected: connected }),

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

  openPrdViewer: (prdId) =>
    set({
      prdViewerOpen: true,
      selectedPrdId: prdId,
    }),

  closePrdViewer: () =>
    set({
      prdViewerOpen: false,
      selectedPrdId: null,
    }),
}));
