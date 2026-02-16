import { PrismaClient } from "@prisma/client";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // @ts-expect-error — Neon Pool is compatible with PrismaNeon but types diverge between pg/neon
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter } as any);
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type { PrismaClient };
export * from "@prisma/client";
