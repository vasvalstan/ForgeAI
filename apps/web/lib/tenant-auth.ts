import { auth } from "@/lib/auth";
import { db } from "@forge/db";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

const ROLE_ORDER = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
} as const;

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail",
  "googlemail",
  "outlook",
  "hotmail",
  "icloud",
  "yahoo",
  "proton",
]);

const ACTIVE_MEMBERSHIP_STATUS = "active" as const;

type OrganizationRole = keyof typeof ROLE_ORDER;

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
};

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  credits: number;
};

type MembershipSummary = {
  id: string;
  organizationId: string;
  role: OrganizationRole;
  status: string;
};

type OrganizationWithMembership = OrganizationSummary & {
  memberships: MembershipSummary[];
};

type ResourceWithMembership = {
  user: AuthenticatedUser;
  organization: OrganizationWithMembership;
};

type BoardResource = ResourceWithMembership & {
  id: string;
  title: string;
  liveblocksRoomId: string;
  organizationId: string;
  githubRepo: string | null;
  githubToken: string | null;
  createdById: string | null;
};

type ChildResourceWithBoard = {
  board: {
    organization: OrganizationWithMembership;
  };
};

type GuardFailure = {
  response: NextResponse;
};

export type OrganizationContext = {
  user: AuthenticatedUser;
  organization: OrganizationSummary;
  membership: MembershipSummary;
};

export type BoardAccess = OrganizationContext & {
  board: {
    id: string;
    title: string;
    liveblocksRoomId: string;
    organizationId: string;
    githubRepo: string | null;
    githubToken: string | null;
    createdById: string | null;
  };
};

function fail(status: number, error: string): GuardFailure {
  return {
    response: NextResponse.json({ error }, { status }),
  };
}

function titleCase(value: string) {
  return value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function deriveOrganizationName(user: AuthenticatedUser) {
  const [emailPrefix, rawDomain = ""] = user.email.split("@");
  const domainRoot = rawDomain.split(".")[0]?.toLowerCase() ?? "";

  if (domainRoot && !PERSONAL_EMAIL_DOMAINS.has(domainRoot)) {
    return `${titleCase(domainRoot)} Workspace`;
  }

  if (user.name?.trim()) {
    return `${user.name.trim()}'s Workspace`;
  }

  return `${titleCase(emailPrefix || "ForgeAI")} Workspace`;
}

async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  };
}

async function ensureOrganizationForUser(user: AuthenticatedUser): Promise<OrganizationContext> {
  const existingUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      activeOrganizationId: true,
      organizationMemberships: {
        where: { status: ACTIVE_MEMBERSHIP_STATUS },
        orderBy: { createdAt: "asc" },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              credits: true,
            },
          },
        },
      },
    },
  });

  if (existingUser?.organizationMemberships?.length) {
    const preferred =
      existingUser.organizationMemberships.find(
        (membership) => membership.organizationId === existingUser.activeOrganizationId
      ) ?? existingUser.organizationMemberships[0];

    if (!preferred) {
      throw new Error("Failed to resolve an active organization membership.");
    }

    if (existingUser.activeOrganizationId !== preferred.organizationId) {
      await db.user.update({
        where: { id: user.id },
        data: { activeOrganizationId: preferred.organizationId },
      });
    }

    return {
      user,
      organization: preferred.organization,
      membership: {
        id: preferred.id,
        organizationId: preferred.organizationId,
        role: preferred.role as OrganizationRole,
        status: preferred.status,
      },
    };
  }

  const name = deriveOrganizationName(user);
  const slugBase = slugify(name) || "workspace";
  const slug = `${slugBase}-${nanoid(6).toLowerCase()}`;

  const created = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name,
        slug,
        credits: 100,
        createdByUserId: user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        credits: true,
      },
    });

    const membership = await tx.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
        status: ACTIVE_MEMBERSHIP_STATUS,
      },
      select: {
        id: true,
        organizationId: true,
        role: true,
        status: true,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { activeOrganizationId: organization.id },
    });

    return { organization, membership };
  });

  return {
    user,
    organization: created.organization,
    membership: {
      id: created.membership.id,
      organizationId: created.membership.organizationId,
      role: created.membership.role as OrganizationRole,
      status: created.membership.status,
    },
  };
}

function hasRequiredRole(role: OrganizationRole, minimumRole: OrganizationRole) {
  return ROLE_ORDER[role] >= ROLE_ORDER[minimumRole];
}

function extractMembership(resource: ResourceWithMembership): OrganizationContext {
  const membership = resource.organization.memberships[0];
  if (!membership) {
    throw new Error("Missing organization membership.");
  }

  return {
    user: resource.user,
    organization: {
      id: resource.organization.id,
      name: resource.organization.name,
      slug: resource.organization.slug,
      credits: resource.organization.credits,
    },
    membership: {
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role as OrganizationRole,
      status: membership.status,
    },
  };
}

function buildBoardAccess(resource: BoardResource): BoardAccess {
  const base = extractMembership(resource);

  return {
    ...base,
    board: {
      id: resource.id,
      title: resource.title,
      liveblocksRoomId: resource.liveblocksRoomId,
      organizationId: resource.organizationId,
      githubRepo: resource.githubRepo ?? null,
      githubToken: resource.githubToken ?? null,
      createdById: resource.createdById ?? null,
    },
  };
}

export async function requireOrganizationContext(
  minimumRole: OrganizationRole = "viewer"
): Promise<OrganizationContext | GuardFailure> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return fail(401, "Unauthorized");
  }

  const context = await ensureOrganizationForUser(user);
  if (!hasRequiredRole(context.membership.role, minimumRole)) {
    return fail(403, "Forbidden");
  }

  return context;
}

async function loadBoardResource(where: { id?: string; liveblocksRoomId?: string }, userId: string) {
  return db.board.findFirst({
    where: {
      ...where,
      organization: {
        memberships: {
          some: {
            userId,
            status: ACTIVE_MEMBERSHIP_STATUS,
          },
        },
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          credits: true,
          memberships: {
            where: {
              userId,
              status: ACTIVE_MEMBERSHIP_STATUS,
            },
            take: 1,
            select: {
              id: true,
              organizationId: true,
              role: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export async function requireBoardAccess(
  boardId: string,
  minimumRole: OrganizationRole = "viewer"
): Promise<BoardAccess | GuardFailure> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return fail(401, "Unauthorized");
  }

  await ensureOrganizationForUser(user);

  const board = await loadBoardResource({ id: boardId }, user.id);
  if (!board || board.organization.memberships.length === 0) {
    return fail(404, "Board not found");
  }

  const access = buildBoardAccess({ ...board, user });
  if (!hasRequiredRole(access.membership.role, minimumRole)) {
    return fail(403, "Forbidden");
  }

  return access;
}

export async function requireBoardAccessByRoom(
  liveblocksRoomId: string,
  minimumRole: OrganizationRole = "viewer"
): Promise<BoardAccess | GuardFailure> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return fail(401, "Unauthorized");
  }

  await ensureOrganizationForUser(user);

  const board = await loadBoardResource({ liveblocksRoomId }, user.id);
  if (!board || board.organization.memberships.length === 0) {
    return fail(404, "Board not found");
  }

  const access = buildBoardAccess({ ...board, user });
  if (!hasRequiredRole(access.membership.role, minimumRole)) {
    return fail(403, "Forbidden");
  }

  return access;
}

async function requireChildResourceAccess<T>(
  loadResource: (userId: string) => Promise<(T & ChildResourceWithBoard) | null>,
  minimumRole: OrganizationRole
): Promise<(OrganizationContext & { resource: T }) | GuardFailure> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return fail(401, "Unauthorized");
  }

  await ensureOrganizationForUser(user);

  const resource = await loadResource(user.id);
  if (!resource || resource.board.organization.memberships.length === 0) {
    return fail(404, "Resource not found");
  }

  const organization = resource.board.organization;
  const membership = organization.memberships[0];
  if (!membership) {
    throw new Error("Missing organization membership.");
  }
  if (!hasRequiredRole(membership.role as OrganizationRole, minimumRole)) {
    return fail(403, "Forbidden");
  }

  return {
    user,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      credits: organization.credits,
    },
    membership: {
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role as OrganizationRole,
      status: membership.status,
    },
    resource,
  };
}

function boardMembershipInclude(userId: string) {
  return {
    board: {
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            credits: true,
            memberships: {
              where: {
                userId,
                status: ACTIVE_MEMBERSHIP_STATUS,
              },
              take: 1,
              select: {
                id: true,
                organizationId: true,
                role: true,
                status: true,
              },
            },
          },
        },
      },
    },
  };
}

export async function requireConversationAccess(
  conversationId: string,
  minimumRole: OrganizationRole = "viewer"
) {
  return requireChildResourceAccess(
    (userId) =>
      db.conversation.findFirst({
        where: {
          id: conversationId,
          board: {
            organization: {
              memberships: {
                some: {
                  userId,
                  status: ACTIVE_MEMBERSHIP_STATUS,
                },
              },
            },
          },
        },
        include: boardMembershipInclude(userId),
      }),
    minimumRole
  );
}

export async function requirePRDAccess(prdId: string, minimumRole: OrganizationRole = "viewer") {
  return requireChildResourceAccess(
    (userId) =>
      db.pRD.findFirst({
        where: {
          id: prdId,
          board: {
            organization: {
              memberships: {
                some: {
                  userId,
                  status: ACTIVE_MEMBERSHIP_STATUS,
                },
              },
            },
          },
        },
        include: boardMembershipInclude(userId),
      }),
    minimumRole
  );
}

export async function requireSpecAccess(specId: string, minimumRole: OrganizationRole = "viewer") {
  return requireChildResourceAccess(
    (userId) =>
      db.spec.findFirst({
        where: {
          id: specId,
          board: {
            organization: {
              memberships: {
                some: {
                  userId,
                  status: ACTIVE_MEMBERSHIP_STATUS,
                },
              },
            },
          },
        },
        include: boardMembershipInclude(userId),
      }),
    minimumRole
  );
}

export async function requireTaskAccess(taskId: string, minimumRole: OrganizationRole = "viewer") {
  return requireChildResourceAccess(
    (userId) =>
      db.task.findFirst({
        where: {
          id: taskId,
          spec: {
            board: {
              organization: {
                memberships: {
                  some: {
                    userId,
                    status: ACTIVE_MEMBERSHIP_STATUS,
                  },
                },
              },
            },
          },
        },
        include: {
          spec: {
            include: {
              board: {
                include: {
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      credits: true,
                      memberships: {
                        where: {
                          userId,
                          status: ACTIVE_MEMBERSHIP_STATUS,
                        },
                        take: 1,
                        select: {
                          id: true,
                          organizationId: true,
                          role: true,
                          status: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }).then((task) => {
        if (!task) return null;
        return {
          ...task,
          board: task.spec.board,
        };
      }),
    minimumRole
  );
}

export async function requireDiscoveryAccess(
  discoveryId: string,
  minimumRole: OrganizationRole = "viewer"
) {
  return requireChildResourceAccess(
    (userId) =>
      db.discovery.findFirst({
        where: {
          id: discoveryId,
          board: {
            organization: {
              memberships: {
                some: {
                  userId,
                  status: ACTIVE_MEMBERSHIP_STATUS,
                },
              },
            },
          },
        },
        include: boardMembershipInclude(userId),
      }),
    minimumRole
  );
}

export async function requireTaskListAccess(
  specId: string,
  minimumRole: OrganizationRole = "viewer"
) {
  return requireSpecAccess(specId, minimumRole);
}

export async function requireBoardCreditsAccess(boardId: string) {
  return requireBoardAccess(boardId, "viewer");
}

