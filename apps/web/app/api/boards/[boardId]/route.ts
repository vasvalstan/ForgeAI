import { NextRequest, NextResponse } from "next/server";
import { requireBoardAccess } from "@/lib/tenant-auth";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const access = await requireBoardAccess(boardId, "viewer");
    if ("response" in access) {
      return access.response;
    }

    const board = await db.board.findFirst({
      where: {
        id: boardId,
        organizationId: access.organization.id,
      },
      include: {
        discoveries: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { insights: true } } },
        },
        prds: { orderBy: { updatedAt: "desc" } },
        meetingNotes: { orderBy: { updatedAt: "desc" } },
        _count: { select: { discoveries: true, conversations: true } },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            credits: true,
          },
        },
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
    const access = await requireBoardAccess(boardId, "editor");
    if ("response" in access) {
      return access.response;
    }

    const { title } = await req.json();

    const board = await db.board.update({
      where: { id: boardId },
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
    const access = await requireBoardAccess(boardId, "admin");
    if ("response" in access) {
      return access.response;
    }

    await db.board.delete({
      where: { id: boardId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}
