import { NextRequest, NextResponse } from "next/server";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const specs = await db.spec.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json({ specs });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch specs" },
      { status: 500 }
    );
  }
}
