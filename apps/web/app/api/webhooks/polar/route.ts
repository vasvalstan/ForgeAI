import { NextRequest, NextResponse } from "next/server";
import { db } from "@forge/db";
import crypto from "crypto";

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET ?? "";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return true; // Skip verification in dev mode
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("webhook-signature") ?? "";

    // Verify webhook signature
    if (POLAR_WEBHOOK_SECRET && !verifyWebhookSignature(body, signature, POLAR_WEBHOOK_SECRET)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);

    // Handle checkout.completed events
    if (event.type === "checkout.completed" || event.type === "order.created") {
      const metadata = event.data?.metadata ?? {};
      const userId = metadata.userId;
      const creditAmount = parseInt(metadata.creditAmount ?? "0", 10);

      if (userId && creditAmount > 0) {
        await db.user.update({
          where: { id: userId },
          data: { credits: { increment: creditAmount } },
        });

        console.log(
          `[Polar Webhook] Added ${creditAmount} credits to user ${userId}`
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Polar Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
