import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { getPresenceColor } from "@/lib/liveblocks-client";
import { requireBoardAccess, requireBoardAccessByRoom } from "@/lib/tenant-auth";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { room, boardId } = await req.json();
    if (typeof room !== "string" && typeof boardId !== "string") {
      return NextResponse.json({ error: "room or boardId is required" }, { status: 400 });
    }

    const access =
      typeof room === "string" && room
        ? await requireBoardAccessByRoom(room, "viewer")
        : await requireBoardAccess(boardId as string, "viewer");

    if ("response" in access) {
      return access.response;
    }

    const userId = access.user.id;
    const userName = access.user.name ?? "Anonymous";
    const userEmail = access.user.email;

    const lbSession = liveblocks.prepareSession(userId, {
      userInfo: {
        name: userName,
        email: userEmail,
        color: getPresenceColor(userId),
      },
    });

    const grantedRoom = access.board.liveblocksRoomId;
    const permission =
      access.membership.role === "viewer"
        ? lbSession.READ_ACCESS
        : lbSession.FULL_ACCESS;

    lbSession.allow(grantedRoom, permission);

    const { status, body } = await lbSession.authorize();
    return new NextResponse(body, { status });
  } catch {
    return NextResponse.json(
      { error: "Failed to authenticate with Liveblocks" },
      { status: 500 }
    );
  }
}
