import { NextRequest, NextResponse } from "next/server";
import { requireBoardAccess } from "@/lib/tenant-auth";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const access = await requireBoardAccess(boardId, "viewer");
    if ("response" in access) {
      return access.response;
    }

    const board = await db.board.findFirst({
      where: {
        id: boardId,
        organizationId: access.organization.id,
      },
      select: { githubRepo: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({
      connected: !!board.githubRepo,
      repo: board.githubRepo ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch GitHub status" },
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
    const access = await requireBoardAccess(boardId, "admin");
    if ("response" in access) {
      return access.response;
    }

    const { repo, token } = await req.json();

    if (!repo || !token) {
      return NextResponse.json(
        { error: "Both repo (owner/name) and token are required" },
        { status: 400 }
      );
    }

    // Validate the token works by testing the GitHub API
    const testRes = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!testRes.ok) {
      return NextResponse.json(
        { error: "Invalid GitHub token or repository. Check your credentials." },
        { status: 400 }
      );
    }

    await db.board.update({
      where: { id: boardId },
      data: { githubRepo: repo, githubToken: token },
    });

    return NextResponse.json({ connected: true, repo });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect GitHub" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const access = await requireBoardAccess(boardId, "admin");
    if ("response" in access) {
      return access.response;
    }

    await db.board.update({
      where: { id: boardId },
      data: { githubRepo: null, githubToken: null },
    });

    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect GitHub" },
      { status: 500 }
    );
  }
}
