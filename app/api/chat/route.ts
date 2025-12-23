import { NextRequest, NextResponse } from "next/server";

import { type CoreMessage, LanguageModelV1, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { env } from "@/env"; 
import { buildRagContext } from "@/lib/rag/context";

const openrouter = createOpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

type ChatRequestBody = {
  messages: { id?: string; role: string; content: string }[];
  data?: {
    notebookId?: string | null;
    materialIds?: string[] | null;
    mode?: "qa" | "summary" | "key-points" | "simplify";
  };
};

export async function POST(req: NextRequest) {
  try {
    // const appUser = await getCurrentAppUser();
    // const workspace = await getOrCreateDefaultWorkspaceForUser(appUser);

    const body = (await req.json()) as ChatRequestBody;
    const messages = body.messages ?? [];

    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    if (!lastUser) {
      return NextResponse.json(
        { error: "No user message provided" },
        { status: 400 }
      );
    }

    const question = lastUser.content;
    const mode = body.data?.mode ?? "qa";

    const ragContext = await buildRagContext({
      workspaceId: "workspace.id",
      notebookId: body.data?.notebookId ?? null,
      materialIds: body.data?.materialIds ?? null,
      question,
      limit: 8,
    });

    const contextMarkdown = ragContext
      .map((chunk, idx) => {
        const header = `Source ${idx + 1} [${chunk.materialTitle}]`;
        return `${header}\n${chunk.content}`;
      })
      .join("\n\n");

    let systemInstruction =
      "You are a helpful study assistant that answers questions based only on the provided context from the user's study materials.\n" +
      "If the context is insufficient, clearly say that you don't have enough information.\n" +
      "Always cite sources in square brackets like [source 1] where the number matches the source index.\n";

    switch (mode) {
      case "summary":
        systemInstruction +=
          "The user is asking for a concise summary of the relevant materials.";
        break;
      case "key-points":
        systemInstruction +=
          "The user wants key bullet-point takeaways from the relevant materials.";
        break;
      case "simplify":
        systemInstruction +=
          "The user wants a simplified explanation suitable for a beginner.";
        break;
      default:
        // qa
        systemInstruction +=
          "The user is asking questions and expects detailed, well-structured answers.";
    }

    const userPromptParts: string[] = [`Question:\n${question}`];

    if (contextMarkdown) {
      userPromptParts.push(`Context:\n${contextMarkdown}`);
    } else {
      userPromptParts.push(
        "Context:\n(no relevant snippets found - answer in general terms if possible, and be explicit that you are not using their uploaded materials)."
      );
    }

    const coreMessages: CoreMessage[] = [
      {
        role: "system",
        content: systemInstruction,
      },
      {
        role: "user",
        content: userPromptParts.join("\n\n"),
      },
    ];

    const result = await streamText({
      model: openrouter(env.OPENROUTER_CHAT_MODEL) as LanguageModelV1,
      messages: coreMessages,
    });

    return result.toAIStreamResponse();
  } catch (error) {
    console.error("Chat handler failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error in chat handler",
      },
      { status: 500 }
    );
  }
}


