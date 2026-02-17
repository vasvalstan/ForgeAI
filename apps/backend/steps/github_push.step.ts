import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { db } from "@forge/db";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GitHubPush",
  description:
    "Pushes tasks from a spec to GitHub as Issues with labels and descriptions.",
  path: "/push-to-github",
  method: "POST",
  emits: [],
  flows: ["task-flow"],
  bodySchema: z.object({
    specId: z.string(),
    userId: z.string().optional(),
  }),
  responseSchema: {
    200: z.object({
      status: z.string(),
      message: z.string(),
      issuesCreated: z.number(),
    }),
    400: z.object({
      error: z.string(),
    }),
  },
};

const COMPLEXITY_LABELS: Record<string, string> = {
  xs: "size:xs",
  s: "size:s",
  m: "size:m",
  l: "size:l",
  xl: "size:xl",
};

export const handler: Handlers['GitHubPush'] = async (req, { logger }) => {
  const { specId } = req.body;

  logger.info("GitHub push requested", { specId });

  const spec = await db.spec.findUnique({
    where: { id: specId },
    include: {
      tasks: true,
      board: { select: { githubRepo: true, githubToken: true } },
    },
  });

  if (!spec) {
    return {
      status: 400 as const,
      body: { error: "Spec not found" },
    };
  }

  if (!spec.board.githubRepo || !spec.board.githubToken) {
    return {
      status: 400 as const,
      body: { error: "GitHub is not connected for this board. Connect a repository first." },
    };
  }

  const { githubRepo, githubToken } = spec.board;
  const [owner, repo] = githubRepo.split("/");

  if (!owner || !repo) {
    return {
      status: 400 as const,
      body: { error: "Invalid GitHub repository format. Expected owner/repo." },
    };
  }

  // Ensure the "forgeai" label exists
  try {
    await fetch(`https://api.github.com/repos/${owner}/${repo}/labels`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "forgeai",
        color: "2563EB",
        description: "Created by ForgeAI",
      }),
    });
  } catch {
    // Label might already exist
  }

  let issuesCreated = 0;

  for (const task of spec.tasks) {
    // Skip tasks that already have a GitHub issue
    if (task.githubIssueUrl) {
      logger.info(`Task ${task.id} already has GitHub issue, skipping`);
      continue;
    }

    const labels = ["forgeai"];
    if (task.complexity && COMPLEXITY_LABELS[task.complexity]) {
      labels.push(COMPLEXITY_LABELS[task.complexity]);
    }

    const body = [
      task.description,
      "",
      "---",
      `**Spec:** ${spec.title}`,
      `**Complexity:** ${task.complexity ?? "unestimated"}`,
      `**Created by:** [ForgeAI](https://forgeai.dev)`,
    ].join("\n");

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: task.title,
            body,
            labels,
          }),
        }
      );

      if (res.ok) {
        const issueData = await res.json();
        const issueUrl = issueData.html_url;
        const issueNumber = issueData.number;

        await db.task.update({
          where: { id: task.id },
          data: {
            githubIssueUrl: issueUrl,
            githubIssueId: issueNumber,
          },
        });

        issuesCreated++;
        logger.info(`Created GitHub issue #${issueNumber} for task ${task.id}`);
      } else {
        const errText = await res.text();
        logger.warn(`Failed to create issue for task ${task.id}: ${res.status} ${errText}`);
      }
    } catch (err: any) {
      logger.error(`GitHub API error for task ${task.id}: ${err.message}`);
    }
  }

  return {
    status: 200 as const,
    body: {
      status: "complete",
      message: `Pushed ${issuesCreated} tasks as GitHub Issues to ${githubRepo}.`,
      issuesCreated,
    },
  };
};
