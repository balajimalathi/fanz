import { NextRequest, NextResponse } from "next/server";

import { env } from "@/env"; 
import { getCurrentAppUser, getOrCreateDefaultWorkspaceForUser } from "@/lib/auth/user";
import { db } from "@/lib/db/client";
import { quizOptions, quizQuestions, quizzes } from "@/lib/db/schema";
import { buildRagContext } from "@/lib/rag/context";
import { chatComplete } from "@/lib/llm/openrouter";

type RequestBody = {
  title: string;
  notebookId?: string | null;
  materialIds?: string[] | null;
  numQuestions?: number;
};

type QuizJson = {
  title?: string;
  questions: {
    id?: string;
    question: string;
    options: {
      id?: string;
      text: string;
      isCorrect: boolean;
    }[];
    explanation?: string;
  }[];
};

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Quiz response did not contain a JSON object");
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

    const numQuestions = body.numQuestions ?? 8;

    const ragContext = await buildRagContext({
      workspaceId: workspace.id,
      notebookId: body.notebookId ?? null,
      materialIds: body.materialIds ?? null,
      question: `Generate a quiz of ${numQuestions} questions about: ${body.title}`,
      limit: 12,
    });

    const contextMarkdown = ragContext
      .map(
        (chunk, idx) =>
          `Source ${idx + 1} [${chunk.materialTitle}]:\n${chunk.content}`
      )
      .join("\n\n");

    const systemPrompt =
      "You are a quiz generation assistant for exam preparation.\n" +
      "Return ONLY valid JSON, no extra commentary.\n" +
      "The JSON must match this shape exactly:\n" +
      '{ "title": "string", "questions": [ { "question": "string", "options": [ { "text": "string", "isCorrect": true | false } ], "explanation": "string" } ] }.\n' +
      "Generate only single-correct multiple-choice questions.";

    const userPrompt =
      `Generate ${numQuestions} MCQ questions for a quiz titled "${body.title}".\n\n` +
      "Use only the following context snippets from the user's materials:\n\n" +
      contextMarkdown;

    const raw = await chatComplete({
      model: env.OPENROUTER_CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 2048,
      temperature: 0.5,
    });

    const jsonText = extractJsonObject(raw);
    const parsed = JSON.parse(jsonText) as QuizJson;

    if (!parsed.questions || parsed.questions.length === 0) {
      throw new Error("Quiz JSON did not contain any questions");
    }

    const [quiz] = await db
      .insert(quizzes)
      .values({
        workspaceId: workspace.id,
        notebookId: body.notebookId ?? null,
        materialId: body.materialIds?.[0] ?? null,
        title: parsed.title ?? body.title,
        type: "generated",
        createdByUserId: appUser.id,
      })
      .returning();

    if (!quiz) {
      throw new Error("Failed to create quiz record");
    }

    const questionRows: (typeof quizQuestions.$inferInsert)[] = [];
    const optionRows: (typeof quizOptions.$inferInsert)[] = [];

    parsed.questions.forEach((q, qIndex) => {
      const questionId = crypto.randomUUID();
      questionRows.push({
        id: questionId,
        quizId: quiz.id,
        questionText: q.question,
        explanation: q.explanation ?? null,
        materialId: null,
        materialChunkId: null,
        orderIndex: qIndex,
      });

      q.options.forEach((opt, oIndex) => {
        optionRows.push({
          id: crypto.randomUUID(),
          questionId,
          text: opt.text,
          isCorrect: opt.isCorrect,
          orderIndex: oIndex,
        });
      });
    });

    if (questionRows.length > 0) {
      await db.insert(quizQuestions).values(questionRows);
    }
    if (optionRows.length > 0) {
      await db.insert(quizOptions).values(optionRows);
    }

    return NextResponse.json(
      {
        quizId: quiz.id,
        questionCount: questionRows.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Quiz generation failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error generating quiz",
      },
      { status: 500 }
    );
  }
}


