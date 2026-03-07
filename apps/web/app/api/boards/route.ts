import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationContext } from "@/lib/tenant-auth";
import { db } from "@forge/db";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const access = await requireOrganizationContext("viewer");
    if ("response" in access) {
      return access.response;
    }

    const boards = await db.board.findMany({
      where: { organizationId: access.organization.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { discoveries: true } } },
    });

    return NextResponse.json({
      boards,
      organization: access.organization,
      membership: access.membership,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch boards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const access = await requireOrganizationContext("editor");
    if ("response" in access) {
      return access.response;
    }

    const board = await db.board.create({
      data: {
        title: title.trim(),
        organizationId: access.organization.id,
        createdById: access.user.id,
        liveblocksRoomId: `forge-room-${nanoid(12)}`,
      },
    });

    return NextResponse.json(
      {
        board,
        organization: access.organization,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}
