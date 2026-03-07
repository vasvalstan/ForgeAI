import { db } from "@forge/db";

const INTERNAL_SECRET = process.env.FORGE_INTERNAL_SECRET ?? "";

export function hasValidInternalSecret(secret?: string) {
  if (!INTERNAL_SECRET) {
    return true;
  }

  return secret === INTERNAL_SECRET;
}

export async function getBoardTenantContext(boardId: string) {
  return db.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      organizationId: true,
      githubRepo: true,
      githubToken: true,
      liveblocksRoomId: true,
    },
  });
}

export async function deductOrganizationCredits(organizationId: string, amount: number) {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { credits: true },
  });

  if (!organization) {
    return { ok: false as const, credits: 0 };
  }

  if (organization.credits < amount) {
    return { ok: false as const, credits: organization.credits };
  }

  const updated = await db.organization.update({
    where: { id: organizationId },
    data: {
      credits: {
        decrement: amount,
      },
    },
    select: { credits: true },
  });

  return {
    ok: true as const,
    credits: updated.credits,
  };
}

