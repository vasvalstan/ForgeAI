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
  { params }: { params: Promise<{ specId: string }> }
) {
  const { specId } = await params;

  try {
    const spec = await db.spec.findUnique({
      where: { id: specId },
      include: {
        tasks: { orderBy: { createdAt: "asc" } },
        prd: { select: { id: true, title: true } },
      },
    });

    if (!spec) {
      return NextResponse.json({ error: "Spec not found" }, { status: 404 });
    }

    return NextResponse.json({ spec });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch spec" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ specId: string }> }
) {
  const { specId } = await params;

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
    if (body.complexity !== undefined) data.complexity = body.complexity;

    const spec = await db.spec.update({
      where: { id: specId },
      data,
    });

    return NextResponse.json({ spec });
  } catch {
    return NextResponse.json(
      { error: "Failed to update spec" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ specId: string }> }
) {
  const { specId } = await params;

  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.spec.delete({ where: { id: specId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete spec" },
      { status: 500 }
    );
  }
}
