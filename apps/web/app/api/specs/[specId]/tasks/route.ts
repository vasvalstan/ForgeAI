import { NextRequest, NextResponse } from "next/server";
import { requireTaskListAccess } from "@/lib/tenant-auth";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ specId: string }> }
) {
  const { specId } = await params;

  try {
    const access = await requireTaskListAccess(specId, "viewer");
    if ("response" in access) {
      return access.response;
    }

    const tasks = await db.task.findMany({
      where: { specId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ specId: string }> }
) {
  const { specId } = await params;

  try {
    const access = await requireTaskListAccess(specId, "editor");
    if ("response" in access) {
      return access.response;
    }

    const { title, description, complexity } = await req.json();

    const task = await db.task.create({
      data: {
        specId,
        title: title || "New Task",
        description: description || "",
        complexity: complexity ?? null,
        status: "todo",
      },
    });

    return NextResponse.json({ task });
  } catch {
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
