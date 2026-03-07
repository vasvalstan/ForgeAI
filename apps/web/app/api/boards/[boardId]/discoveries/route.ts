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

    const discoveries = await db.discovery.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { insights: true } },
      },
    });

    return NextResponse.json({ discoveries });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch discoveries" },
      { status: 500 }
    );
  }
}
