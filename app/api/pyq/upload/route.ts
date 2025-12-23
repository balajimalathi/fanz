import { NextRequest, NextResponse } from "next/server";

import { env } from "@/env";
import {
  getCurrentAppUser,
  getOrCreateDefaultWorkspaceForUser,
} from "@/lib/auth/user";
import { db } from "@/lib/db/client";
import {
  pyqPapers,
  pyqQuestions,
  quizOptions,
  quizQuestions,
  quizzes,
} from "@/lib/db/schema";
import { chatComplete } from "@/lib/llm/openrouter";

type RequestBody = {
  title: string;
  examName?: string;
  year?: number;
  text: string;
};

type PyqQuizJson = {
  questions: {
    question: string;
    options: {
      text: string;
      isCorrect: boolean;
    }[];
    explanation?: string;
    topic?: string;
    difficulty?: string;
  }[];
};

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("PYQ response did not contain a JSON object");
  }
  return text.slice(start, end + 1);
}

export async function POST(req: NextRequest) {
  try {
    const appUser = await getCurrentAppUser();
    const workspace = await getOrCreateDefaultWorkspaceForUser(appUser);

    const body = (await req.json()) as RequestBody;

    if (!body.title || !body.text) {
      return NextResponse.json(
        { error: "title and text are required" },
        { status: 400 }
      );
    }

    const [paper] = await db
      .insert(pyqPapers)
      .values({
        workspaceId: workspace.id,
        title: body.title,
        year: body.year ?? null,
        examName: body.examName ?? null,
        rustFsKey: null,
        metadata: {
          rawText: body.text,
        },
        createdByUserId: appUser.id,
      })
      .returning();

    if (!paper) {
      throw new Error("Failed to create PYQ paper record");
    }

    const systemPrompt =
      "You are analysing a previous year exam question paper.\n" +
      "Turn the paper into a multiple-choice practice quiz.\n" +
      "Return ONLY valid JSON with this shape:\n" +
      '{ "questions": [ { "question": "string", "options": [ { "text": "string", "isCorrect": true|false } ], "explanation": "string", "topic": "string", "difficulty": "easy|medium|hard" } ] }.\n' +
      "Every question must have exactly one correct option (isCorrect: true).";

    const userPrompt =
      `Convert the following previous year question paper into a practice quiz.\n\n` +
      body.text;

    const raw = await chatComplete({
      model: env.OPENROUTER_CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 4096,
      temperature: 0.4,
    });

    const jsonText = extractJsonObject(raw);
    const parsed = JSON.parse(jsonText) as PyqQuizJson;

    if (!parsed.questions || parsed.questions.length === 0) {
      throw new Error("PYQ quiz JSON did not contain any questions");
    }

    const [quiz] = await db
      .insert(quizzes)
      .values({
        workspaceId: workspace.id,
        notebookId: null,
        materialId: null,
        title: `${body.title} (PYQ)`,
        type: "pyq",
        createdByUserId: appUser.id,
      })
      .returning();

    if (!quiz) {
      throw new Error("Failed to create quiz record for PYQ");
    }

    const quizQuestionRows: (typeof quizQuestions.$inferInsert)[] = [];
    const quizOptionRows: (typeof quizOptions.$inferInsert)[] = [];
    const pyqQuestionRows: (typeof pyqQuestions.$inferInsert)[] = [];

    parsed.questions.forEach((q, qIndex) => {
      const quizQuestionId = crypto.randomUUID();

      quizQuestionRows.push({
        id: quizQuestionId,
        quizId: quiz.id,
        questionText: q.question,
        explanation: q.explanation ?? null,
        materialId: null,
        materialChunkId: null,
        orderIndex: qIndex,
      });

      q.options.forEach((opt, oIndex) => {
        quizOptionRows.push({
          id: crypto.randomUUID(),
          questionId: quizQuestionId,
          text: opt.text,
          isCorrect: opt.isCorrect,
          orderIndex: oIndex,
        });
      });

      pyqQuestionRows.push({
        id: crypto.randomUUID(),
        paperId: paper.id,
        questionText: q.question,
        answerText:
          q.options.find((o) => o.isCorrect)?.text ?? q.explanation ?? null,
        topic: q.topic ?? null,
        difficulty: q.difficulty ?? null,
        orderIndex: qIndex,
        quizQuestionId,
      });
    });

    if (quizQuestionRows.length > 0) {
      await db.insert(quizQuestions).values(quizQuestionRows);
    }
    if (quizOptionRows.length > 0) {
      await db.insert(quizOptions).values(quizOptionRows);
    }
    if (pyqQuestionRows.length > 0) {
      await db.insert(pyqQuestions).values(pyqQuestionRows);
    }

    return NextResponse.json(
      {
        paperId: paper.id,
        quizId: quiz.id,
        questionCount: quizQuestionRows.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PYQ upload failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error uploading PYQ",
      },
      { status: 500 }
    );
  }
}


