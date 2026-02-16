import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Dev-mode JSON file store (survives HMR, deleted on restart)
const DEV_STORE = join(process.cwd(), ".dev-boards.json");

type DevBoard = {
  id: string;
  title: string;
  liveblocksRoomId: string;
  ownerId: string;
  updatedAt: string;
  createdAt: string;
  _count: { discoveries: number };
};

function readDevBoards(): DevBoard[] {
  try {
    if (existsSync(DEV_STORE)) {
      return JSON.parse(readFileSync(DEV_STORE, "utf-8"));
    }
  } catch {}
  return [];
}

function writeDevBoards(boards: DevBoard[]) {
  try {
    writeFileSync(DEV_STORE, JSON.stringify(boards, null, 2));
  } catch {}
}

async function getDbSafe() {
  try {
    const { db } = await import("@forge/db");
    await db.$queryRaw`SELECT 1`;
    return db;
  } catch {
    return null;
  }
}

async function getSessionSafe() {
  try {
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const db = await getDbSafe();

    if (db) {
      const session = await getSessionSafe();
      const userId = session?.user?.id;
      const boards = await db.board.findMany({
        where: userId ? { ownerId: userId } : undefined,
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { discoveries: true } } },
      });
      return NextResponse.json({ boards });
    }

    return NextResponse.json({ boards: readDevBoards() });
  } catch {
    return NextResponse.json({ boards: readDevBoards() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const db = await getDbSafe();

    if (db) {
      const session = await getSessionSafe();
      const ownerId = session?.user?.id ?? "dev-user";
      const board = await db.board.create({
        data: {
          title: title.trim(),
          ownerId,
          liveblocksRoomId: `forge-room-${nanoid(12)}`,
        },
      });
      return NextResponse.json({ board }, { status: 201 });
    }

    // Dev fallback: persist to JSON file
    const board: DevBoard = {
      id: `dev-${nanoid(8)}`,
      title: title.trim(),
      liveblocksRoomId: `forge-room-${nanoid(12)}`,
      ownerId: "dev-user",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      _count: { discoveries: 0 },
    };

    const boards = readDevBoards();
    boards.unshift(board);
    writeDevBoards(boards);

    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}
