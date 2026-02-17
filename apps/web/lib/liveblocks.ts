import { createRoomContext } from "@liveblocks/react";
import { liveblocksClient, getPresenceColor } from "./liveblocks-client";

// Re-export server-safe items for backwards compatibility
export { liveblocksClient, getPresenceColor };

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
