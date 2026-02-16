import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ credits: 100 });
    }

    const { db } = await import("@forge/db");
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    return NextResponse.json({ credits: user?.credits ?? 100 });
  } catch {
    return NextResponse.json({ credits: 100 });
  }
}
