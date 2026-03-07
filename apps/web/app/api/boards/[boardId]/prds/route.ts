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

    let prds;
    try {
      prds = await db.pRD.findMany({
        where: { boardId },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { specs: true } },
        },
      });
    } catch {
      // Spec table may not exist yet if migration hasn't run
      prds = await db.pRD.findMany({
        where: { boardId },
        orderBy: { updatedAt: "desc" },
      });
    }

    return NextResponse.json({ prds });
  } catch (err) {
    console.error("Failed to fetch PRDs:", err);
    return NextResponse.json(
      { error: "Failed to fetch PRDs" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const access = await requireBoardAccess(boardId, "editor");
    if ("response" in access) {
      return access.response;
    }

    const { title, content } = await req.json();

    const prd = await db.pRD.create({
      data: {
        boardId,
        title: title || "Untitled PRD",
        content: content || "",
        status: "draft",
      },
    });

    return NextResponse.json({ prd });
  } catch {
    return NextResponse.json(
      { error: "Failed to create PRD" },
      { status: 500 }
    );
  }
}
