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
  { params }: { params: Promise<{ prdId: string }> }
) {
  const { prdId } = await params;

  try {
    let prd;
    try {
      prd = await db.pRD.findUnique({
        where: { id: prdId },
        include: {
          specs: {
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { tasks: true } } },
          },
        },
      });
    } catch {
      // Spec/Task tables may not exist yet pre-migration
      prd = await db.pRD.findUnique({
        where: { id: prdId },
      });
    }

    if (!prd) {
      return NextResponse.json({ error: "PRD not found" }, { status: 404 });
    }

    return NextResponse.json({ prd });
  } catch (err) {
    console.error("Failed to fetch PRD:", err);
    return NextResponse.json(
      { error: "Failed to fetch PRD" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ prdId: string }> }
) {
  const { prdId } = await params;

  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.content !== undefined) data.content = body.content;
    if (body.status !== undefined) data.status = body.status;

    const prd = await db.pRD.update({
      where: { id: prdId },
      data,
    });

    return NextResponse.json({ prd });
  } catch {
    return NextResponse.json(
      { error: "Failed to update PRD" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ prdId: string }> }
) {
  const { prdId } = await params;

  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.pRD.delete({ where: { id: prdId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete PRD" },
      { status: 500 }
    );
  }
}
