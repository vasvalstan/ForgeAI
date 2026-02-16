import { NextRequest, NextResponse } from "next/server";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const insights = await db.insight.findMany({
      where: {
        discovery: { boardId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        discoveryId: true,
        category: true,
        content: true,
        quote: true,
        sentiment: true,
        layerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ insights });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
