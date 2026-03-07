import { requireBoardAccess } from "@/lib/tenant-auth";
import { NextRequest, NextResponse } from "next/server";

const MOTIA_BASE_URL =
  process.env.MOTIA_BASE_URL ??
  process.env.NEXT_PUBLIC_MOTIA_BASE_URL ??
  "http://localhost:4111";

const INTERNAL_SECRET = process.env.FORGE_INTERNAL_SECRET ?? "";

type AgentAction =
  | "discovery"
  | "strategy"
  | "redhat"
  | "spec"
  | "engineering"
  | "general"
  | "visualize";

type ProxyPayload = Record<string, unknown>;

function buildActionRequest(action: AgentAction, boardId: string, payload: ProxyPayload, userId: string) {
  switch (action) {
    case "discovery":
      if (typeof payload.content !== "string" || !payload.content.trim()) {
        throw new Error("Discovery requests require content.");
      }

      return {
        path: "/discover",
        body: {
          boardId,
          userId,
          content: payload.content,
          sourceType: typeof payload.sourceType === "string" ? payload.sourceType : "notes",
          fileName: typeof payload.fileName === "string" ? payload.fileName : undefined,
        },
      };
    case "strategy":
      return {
        path: "/generate-prd",
        body: {
          boardId,
          userId,
          insightIds: Array.isArray(payload.insightIds) ? payload.insightIds : undefined,
        },
      };
    case "redhat":
      return {
        path: "/audit",
        body: {
          boardId,
          userId,
          shapes: Array.isArray(payload.shapes) ? payload.shapes : [],
        },
      };
    case "spec":
      return {
        path: "/generate-spec",
        body: {
          boardId,
          userId,
          prdId: typeof payload.prdId === "string" ? payload.prdId : undefined,
          featureTitle:
            typeof payload.featureTitle === "string" ? payload.featureTitle : undefined,
        },
      };
    case "engineering":
      return {
        path: "/break-down",
        body: {
          boardId,
          userId,
          specId: typeof payload.specId === "string" ? payload.specId : undefined,
          specTitle: typeof payload.specTitle === "string" ? payload.specTitle : undefined,
        },
      };
    case "general":
      if (typeof payload.question !== "string" || !payload.question.trim()) {
        throw new Error("General questions require a prompt.");
      }

      return {
        path: "/ask",
        body: {
          boardId,
          userId,
          question: payload.question,
        },
      };
    case "visualize":
      if (typeof payload.description !== "string" || !payload.description.trim()) {
        throw new Error("Visualization requests require a description.");
      }

      return {
        path: "/visualize",
        body: {
          boardId,
          userId,
          shapeId: typeof payload.shapeId === "string" ? payload.shapeId : undefined,
          description: payload.description,
          x: typeof payload.x === "number" ? payload.x : undefined,
          y: typeof payload.y === "number" ? payload.y : undefined,
        },
      };
    default:
      throw new Error("Unsupported agent action.");
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  const access = await requireBoardAccess(boardId, "editor");
  if ("response" in access) {
    return access.response;
  }

  try {
    const { action, payload } = (await req.json()) as {
      action?: AgentAction;
      payload?: ProxyPayload;
    };

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const target = buildActionRequest(action, boardId, payload ?? {}, access.user.id);
    const upstream = await fetch(`${MOTIA_BASE_URL}${target.path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...target.body,
        ...(INTERNAL_SECRET ? { internalSecret: INTERNAL_SECRET } : {}),
      }),
    });

    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach the AI backend.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

