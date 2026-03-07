import { NextResponse } from "next/server";
import { requireOrganizationContext } from "@/lib/tenant-auth";

export async function GET() {
  try {
    const access = await requireOrganizationContext("viewer");
    if ("response" in access) {
      return access.response;
    }

    return NextResponse.json({
      credits: access.organization.credits,
      organization: access.organization,
      membership: access.membership,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}
