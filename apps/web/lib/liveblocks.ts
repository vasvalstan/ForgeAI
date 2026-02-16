import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export const liveblocksClient = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
});

// Presence: cursor position & selected shape IDs
type Presence = {
  cursor: { x: number; y: number } | null;
  selection: string[];
  name: string;
  color: string;
};

type Storage = {
  // tldraw handles its own storage via @tldraw/sync
  // Liveblocks is used only for presence here
};

type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    picture?: string;
    color: string;
  };
};

type RoomEvent = {
  type: "canvas-update";
  boardId: string;
  shapeCount: number;
};

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useOthersMapped,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(liveblocksClient);

// User color palette for presence cursors
const PRESENCE_COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#9575CD",
  "#7986CB", "#64B5F6", "#4FC3F7", "#4DD0E1",
  "#4DB6AC", "#81C784", "#AED581", "#DCE775",
  "#FFD54F", "#FFB74D", "#FF8A65", "#A1887F",
];

export function getPresenceColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = Math.trunc((hash << 5) - hash + (userId.codePointAt(i) ?? 0));
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]!;
}
