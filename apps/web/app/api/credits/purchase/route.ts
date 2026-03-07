import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationContext } from "@/lib/tenant-auth";
import { db } from "@forge/db";

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN ?? "";
const POLAR_API = "https://api.polar.sh/v1";

// Credit packages
const CREDIT_PACKAGES = [
  { id: "credits-50", amount: 50, price: 499, label: "50 Credits — $4.99" },
  { id: "credits-200", amount: 200, price: 1499, label: "200 Credits — $14.99" },
  { id: "credits-500", amount: 500, price: 2999, label: "500 Credits — $29.99" },
];

export async function GET() {
  return NextResponse.json({ packages: CREDIT_PACKAGES });
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireOrganizationContext("admin");
    if ("response" in access) {
      return access.response;
    }

    const { packageId } = await req.json();
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);

    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      // Fallback: directly add credits for development/demo
      await db.organization.update({
        where: { id: access.organization.id },
        data: { credits: { increment: pkg.amount } },
      });

      return NextResponse.json({
        success: true,
        credits: pkg.amount,
        message: `Added ${pkg.amount} credits (dev mode — no payment required)`,
      });
    }

    // Create a Polar checkout session
    const checkoutRes = await fetch(`${POLAR_API}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: pkg.id,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?credits=success`,
        metadata: {
          organizationId: access.organization.id,
          userId: access.user.id,
          creditAmount: pkg.amount.toString(),
        },
      }),
    });

    if (!checkoutRes.ok) {
      const error = await checkoutRes.text();
      return NextResponse.json(
        { error: `Polar checkout failed: ${error}` },
        { status: 500 }
      );
    }

    const checkout = await checkoutRes.json();
    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch {
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
