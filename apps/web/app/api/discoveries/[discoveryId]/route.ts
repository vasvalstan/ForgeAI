import { NextRequest, NextResponse } from "next/server";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ discoveryId: string }> }
) {
  const { discoveryId } = await params;

  try {
    const discovery = await db.discovery.findUnique({
      where: { id: discoveryId },
      select: {
        id: true,
        boardId: true,
        sourceType: true,
        rawContent: true,
        status: true,
        createdAt: true,
      },
    });

    if (!discovery) {
      return NextResponse.json(
        { error: "Discovery not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ discovery });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch discovery" },
      { status: 500 }
    );
  }
}
