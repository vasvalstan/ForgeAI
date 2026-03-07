import { NextRequest, NextResponse } from "next/server";
import { requireConversationAccess } from "@/lib/tenant-auth";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  try {
    const access = await requireConversationAccess(conversationId, "viewer");
    if ("response" in access) {
      return access.response;
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  try {
    const access = await requireConversationAccess(conversationId, "editor");
    if ("response" in access) {
      return access.response;
    }

    const { role, content, status } = await req.json();

    const message = await db.message.create({
      data: {
        conversationId,
        role,
        content,
        status: status ?? null,
      },
    });

    // Touch the conversation's updatedAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
