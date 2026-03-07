import { NextRequest, NextResponse } from "next/server";
import { requireDiscoveryAccess } from "@/lib/tenant-auth";
import { db } from "@forge/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ discoveryId: string }> }
) {
  const { discoveryId } = await params;

  try {
    const access = await requireDiscoveryAccess(discoveryId, "viewer");
    if ("response" in access) {
      return access.response;
    }

    const discovery = await db.discovery.findFirst({
      where: {
        id: discoveryId,
        board: {
          organizationId: access.organization.id,
        },
      },
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
