import { NextRequest, NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/utils/admin-auth"
import { db } from "@/lib/db/client"
import { post, postComment } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const authError = await checkAdminAccess()
    if (authError) return authError

    const { type, id } = await params
    const body = await request.json()
    const { action } = body // "hide" or "delete"

    if (!["hide", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'hide' or 'delete'" },
        { status: 400 }
      )
    }

    if (type === "post") {
      if (action === "delete") {
        await db.delete(post).where(eq(post.id, id))
        return NextResponse.json({ success: true, message: "Post deleted" })
      } else {
        // For hide, we could add a hidden field to the schema
        // For now, we'll just return an error
        return NextResponse.json(
          { error: "Hide action not yet implemented for posts" },
          { status: 400 }
        )
      }
    } else if (type === "comment") {
      if (action === "delete") {
        await db.delete(postComment).where(eq(postComment.id, id))
        return NextResponse.json({ success: true, message: "Comment deleted" })
      } else {
        return NextResponse.json(
          { error: "Hide action not yet implemented for comments" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'post' or 'comment'" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error moderating content:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

