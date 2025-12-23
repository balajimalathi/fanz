import { NextRequest, NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { env } from "@/env";
import {
  getCurrentAppUser,
  getOrCreateDefaultWorkspaceForUser,
} from "@/lib/auth/user";
import { db } from "@/lib/db/client";
import { mindmaps, mindmapNodes } from "@/lib/db/schema";
import { buildRagContext } from "@/lib/rag/context";
import { chatComplete } from "@/lib/llm/openrouter";

type MindmapNodeInput = {
  id: string;
  label: string;
  parentId: string | null;
  materialId?: string | null;
  materialChunkId?: string | null;
};

type RequestBody = {
  title: string;
  topic?: string;
  notebookId?: string | null;
  materialIds?: string[] | null;
};

function extractJsonArray(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Mindmap response did not contain a JSON array");
  }
  return text.slice(start, end + 1);
}

export async function POST(req: NextRequest) {
  try {
    const appUser = await getCurrentAppUser();
    const workspace = await getOrCreateDefaultWorkspaceForUser(appUser);

    const body = (await req.json()) as RequestBody;

    if (!body.title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const topic = body.topic ?? body.title;

    const ragContext = await buildRagContext({
      workspaceId: workspace.id,
      notebookId: body.notebookId ?? null,
      materialIds: body.materialIds ?? null,
      question: topic,
      limit: 12,
    });

    const contextMarkdown = ragContext
      .map(
        (chunk, idx) =>
          `Source ${idx + 1} [${chunk.materialTitle}]:\n${chunk.content}`
      )
      .join("\n\n");

    const systemPrompt =
      "You are an expert at turning study materials into clear hierarchical mindmaps.\n" +
      "Return ONLY valid JSON, with no extra commentary.\n" +
      "The JSON must be an array of nodes, each like:\n" +
      '{ "id": "string", "label": "string", "parentId": "string | null" }\n' +
      "Use a single root node representing the overall topic, and 2-3 levels of depth where appropriate.";

    const userPrompt =
      `Create a mindmap for topic: "${topic}".\n\n` +
      "Base it solely on the following context snippets from the user's materials:\n\n" +
      contextMarkdown;

    const raw = await chatComplete({
      model: env.OPENROUTER_CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 2048,
      temperature: 0.3,
    });

    const jsonArray = extractJsonArray(raw);
    const nodes = JSON.parse(jsonArray) as MindmapNodeInput[];

    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error("Mindmap JSON was empty");
    }

    const [mindmap] = await db
      .insert(mindmaps)
      .values({
        workspaceId: workspace.id,
        notebookId: body.notebookId ?? null,
        title: body.title,
        createdByUserId: appUser.id,
      })
      .returning();

    if (!mindmap) {
      throw new Error("Failed to create mindmap record");
    }

    const idMap = new Map<string, string>();
    const rows: (typeof mindmapNodes.$inferInsert)[] = [];

    for (const node of nodes) {
      if (!node.id || !node.label) continue;
      const dbId = crypto.randomUUID();
      idMap.set(node.id, dbId);
      rows.push({
        id: dbId,
        mindmapId: mindmap.id,
        parentId: null,
        label: node.label,
        depth: 0,
        materialId: (node.materialId as string | undefined) ?? null,
        materialChunkId: (node.materialChunkId as string | undefined) ?? null,
        orderIndex: rows.length,
      });
    }

    // Second pass to wire parent relationships & depths
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      if (!node.parentId) continue;

      const dbId = idMap.get(node.id);
      const parentDbId = idMap.get(node.parentId);
      if (!dbId || !parentDbId) continue;

      const rowIndex = rows.findIndex((r) => r.id === dbId);
      if (rowIndex === -1) continue;

      rows[rowIndex] = {
        ...rows[rowIndex],
        parentId: parentDbId,
      };
    }

    if (rows.length > 0) {
      await db.insert(mindmapNodes).values(rows);
    }

    const fullMindmap = await db.query.mindmaps.findFirst({
      where: (m, { eq: eqOp }) => eqOp(m.id, mindmap.id),
    });

    return NextResponse.json(
      {
        mindmap: fullMindmap,
        nodeCount: rows.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Mindmap generation failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error generating mindmap",
      },
      { status: 500 }
    );
  }
}


