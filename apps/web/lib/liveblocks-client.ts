import { createClient } from "@liveblocks/client";

export const liveblocksClient = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
});

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
