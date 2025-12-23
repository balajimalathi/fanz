import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser, getOrCreateDefaultWorkspaceForUser } from "@/lib/auth/user";
import { db } from "@/lib/db/client";
import { materials, materialTypeEnum } from "@/lib/db/schema";
import { processMaterial } from "@/lib/materials/pipeline";
import { uploadToRustFs } from "@/lib/storage/rustfs";

type MaterialInsert = typeof materials.$inferInsert;

const ALLOWED_TYPES = materialTypeEnum.enumValues;

function parseMaterialType(value: unknown): MaterialInsert["type"] {
  if (typeof value !== "string" || !ALLOWED_TYPES.includes(value as any)) {
    throw new Error(
      `Invalid material type "${String(
        value
      )}". Expected one of: ${ALLOWED_TYPES.join(", ")}`
    );
  }
  return value as MaterialInsert["type"];
}

export async function POST(req: NextRequest) {
  try {
    const appUser = await getCurrentAppUser();
    const workspace = await getOrCreateDefaultWorkspaceForUser(appUser);

    const contentType = req.headers.get("content-type") ?? "";
    let created: MaterialInsert & { id: string };

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const typeRaw = formData.get("type");
      const titleRaw = formData.get("title");
      const notebookIdRaw = formData.get("notebookId");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Missing file in form-data (field: file)" },
          { status: 400 }
        );
      }

      if (typeof typeRaw !== "string") {
        return NextResponse.json(
          { error: "Missing material type in form-data (field: type)" },
          { status: 400 }
        );
      }

      const type = parseMaterialType(typeRaw);
      const title =
        typeof titleRaw === "string" && titleRaw.trim().length > 0
          ? titleRaw
          : file.name;
      const notebookId =
        typeof notebookIdRaw === "string" && notebookIdRaw.length > 0
          ? notebookIdRaw
          : null;

      const { key } = await uploadToRustFs({
        file,
        filename: file.name,
        contentType: file.type,
        folder: "materials",
      });

      const [inserted] = await db
        .insert(materials)
        .values({
          workspaceid: workspace.id,
          notebookId,
          type,
          title,
          rustFsKey: key,
          sourceUrl: null,
          language: null,
          status: "uploaded",
          createdByUserId: appUser.id,
          metadata: {},
        })
        .returning();

      if (!inserted) {
        throw new Error("Failed to insert material record");
      }

      created = inserted as MaterialInsert & { id: string };
    } else {
      const body = (await req.json()) as {
        title: string;
        type: string;
        sourceUrl?: string | null;
        text?: string | null;
        notebookId?: string | null;
      };

      if (!body.title || !body.type) {
        return NextResponse.json(
          { error: "Both title and type are required" },
          { status: 400 }
        );
      }

      const type = parseMaterialType(body.type);
      const metadata: Record<string, unknown> = {};
      if (body.text && body.text.trim().length > 0) {
        metadata.text = body.text;
      }

      const [inserted] = await db
        .insert(materials)
        .values({
          workspaceId: workspace.id,
          notebookId: body.notebookId ?? null,
          type,
          title: body.title,
          sourceUrl: body.sourceUrl ?? null,
          rustFsKey: null,
          language: null,
          status: metadata.text ? "processing" : "uploaded",
          createdByUserId: appUser.id,
          metadata,
        })
        .returning();

      if (!inserted) {
        throw new Error("Failed to insert material record");
      }

      created = inserted as MaterialInsert & { id: string };
    }

    let processingStarted = false;

    // For materials where we already have text (metadata.text) or web URLs,
    // we can immediately kick off processing.
    if (
      (created.metadata as any)?.text ||
      created.type === "web" ||
      created.type === "pyq"
    ) {
      await processMaterial(created.id);
      processingStarted = true;
    }

    return NextResponse.json(
      {
        material: created,
        processingStarted,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Material upload failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error uploading material",
      },
      { status: 500 }
    );
  }
}


