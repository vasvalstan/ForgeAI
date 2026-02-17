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
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
