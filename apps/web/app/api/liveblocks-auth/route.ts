import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPresenceColor } from "@/lib/liveblocks-client";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id ?? `anon-${Date.now()}`;
    const userName = session?.user?.name ?? "Anonymous";
    const userEmail = session?.user?.email ?? "";
    const userPicture = session?.user?.image ?? undefined;

    const lbSession = liveblocks.prepareSession(userId, {
      userInfo: {
        name: userName,
        email: userEmail,
        picture: userPicture,
        color: getPresenceColor(userId),
      },
    });

    // Parse the room from the request body
    const { room } = await req.json();

    if (room) {
      lbSession.allow(room, lbSession.FULL_ACCESS);
    } else {
      // Allow access to all forge rooms
      lbSession.allow("forge-room-*", lbSession.FULL_ACCESS);
    }

    const { status, body } = await lbSession.authorize();
    return new NextResponse(body, { status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to authenticate with Liveblocks" },
      { status: 500 }
    );
  }
}
