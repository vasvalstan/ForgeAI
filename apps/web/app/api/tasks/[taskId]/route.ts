import { NextRequest, NextResponse } from "next/server";
import { requireTaskAccess } from "@/lib/tenant-auth";
import { db } from "@forge/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const access = await requireTaskAccess(taskId, "editor");
    if ("response" in access) {
      return access.response;
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.complexity !== undefined) data.complexity = body.complexity;

    const task = await db.task.update({
      where: { id: taskId },
      data,
    });

    return NextResponse.json({ task });
  } catch {
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const access = await requireTaskAccess(taskId, "editor");
    if ("response" in access) {
      return access.response;
    }

    await db.task.delete({ where: { id: taskId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
