import { NextRequest, NextResponse } from "next/server";
import { db } from "@forge/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        discoveries: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { insights: true } } },
        },
        prds: { orderBy: { updatedAt: "desc" } },
        meetingNotes: { orderBy: { updatedAt: "desc" } },
        _count: { select: { discoveries: true, conversations: true } },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({ board });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();

    const board = await db.board.update({
      where: { id: boardId, ownerId: session.user.id },
      data: { title },
    });

    return NextResponse.json({ board });
  } catch {
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.board.delete({
      where: { id: boardId, ownerId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}
