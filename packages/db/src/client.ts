import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env files from multiple locations to support both Next.js and Motia contexts
if (!process.env.DATABASE_URL) {
  for (const envPath of [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(__dirname, "../../.env"),
    resolve(__dirname, "../../../.env"),
  ]) {
    config({ path: envPath });
    if (process.env.DATABASE_URL) break;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
      "Ensure a .env file exists with DATABASE_URL defined."
    );
  }
  // PrismaNeon v6+ is a factory: pass config directly, it creates its own Pool
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter } as any);
}

function getDb(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export type { PrismaClient };
