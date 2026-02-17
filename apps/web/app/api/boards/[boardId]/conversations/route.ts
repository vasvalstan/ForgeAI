import { NextRequest, NextResponse } from "next/server";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const conversations = await db.conversation.findMany({
      where: { boardId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
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
    const { title } = await req.json();

    const conversation = await db.conversation.create({
      data: {
        boardId,
        title: title || "New Conversation",
      },
    });

    return NextResponse.json({ conversation });
  } catch {
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
