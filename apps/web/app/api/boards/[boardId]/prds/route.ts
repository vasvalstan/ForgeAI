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
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
