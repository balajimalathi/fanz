"use client"

import { useMemo, useState } from "react"
import { useQueryState, parseAsString } from "nuqs"
import { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Loader2, Image as ImageIcon } from "lucide-react"
import toast from "react-hot-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { AdminDataTable } from "./table/admin-data-table"
import { formatDateLocal } from "@/lib/utils/date-formatting"

interface Post {
  id: string
  creatorId: string
  creatorName: string
  creatorUsername: string | null
  caption: string | null
  postType: string
  price: number | null
  media: Array<{ url: string; mediaType: string }>
  createdAt: string
}

interface Comment {
  id: string
  postId: string
  userId: string
  userName: string
  userEmail: string
  content: string
  createdAt: string
}

export function ContentModerationTable() {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsString.withDefault("posts")
  )
  const [processing, setProcessing] = useState<string | null>(null)

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return

    setProcessing(postId)
    try {
      const response = await fetch(`/api/admin/content/posts?postId=${postId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete post")
      }

      toast.success("Post deleted successfully")
      // Trigger a page refresh by changing a dummy query param
      window.location.reload()
    } catch (error) {
      console.error("Error deleting post:", error)
      toast.error("Failed to delete post")
    } finally {
      setProcessing(null)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return

    setProcessing(commentId)
    try {
      const response = await fetch(
        `/api/admin/content/comments?commentId=${commentId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to delete comment")
      }

      toast.success("Comment deleted successfully")
      window.location.reload()
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast.error("Failed to delete comment")
    } finally {
      setProcessing(null)
    }
  }

  // Post columns
  const postColumns: ColumnDef<Post>[] = useMemo(
    () => [
      // {
      //   id: "select",
      //   header: ({ table }) => (
      //     <Checkbox
      //       checked={table.getIsAllPageRowsSelected()}
      //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      //       aria-label="Select all"
      //     />
      //   ),
      //   cell: ({ row }) => (
      //     <Checkbox
      //       checked={row.getIsSelected()}
      //       onCheckedChange={(value) => row.toggleSelected(!!value)}
      //       aria-label="Select row"
      //     />
      //   ),
      //   enableSorting: false,
      //   enableHiding: false,
      // },
      {
        accessorKey: "creatorName",
        header: "Creator",
        cell: ({ row }) => {
          const post = row.original
          return (
            <div className="text-sm">
              <div>{post.creatorName}</div>
              {post.creatorUsername && (
                <div className="text-xs text-muted-foreground">
                  @{post.creatorUsername}
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "caption",
        header: "Post",
        cell: ({ row }) => {
          const post = row.original
          return (
            <div className="max-w-md">
              <div className="text-sm font-medium line-clamp-2">
                {post.caption || "No caption"}
              </div>
              {post.media.length > 0 && (
                <div className="flex gap-1 mt-1">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {post.media.length} media
                  </span>
                </div>
              )}
            </div>
          )
        },
      }, 
      {
        accessorKey: "postType",
        header: "Pricing",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.postType.toUpperCase()}</Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDateLocal(row.original.createdAt)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const post = row.original
          return (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeletePost(post.id)}
                disabled={processing === post.id}
              >
                {processing === post.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          )
        },
      },
    ],
    [processing]
  )

  // Comment columns
  const commentColumns: ColumnDef<Comment>[] = useMemo(
    () => [
      // {
      //   id: "select",
      //   header: ({ table }) => (
      //     <Checkbox
      //       checked={table.getIsAllPageRowsSelected()}
      //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      //       aria-label="Select all"
      //     />
      //   ),
      //   cell: ({ row }) => (
      //     <Checkbox
      //       checked={row.getIsSelected()}
      //       onCheckedChange={(value) => row.toggleSelected(!!value)}
      //       aria-label="Select row"
      //     />
      //   ),
      //   enableSorting: false,
      //   enableHiding: false,
      // },
      {
        accessorKey: "content",
        header: "Comment",
        cell: ({ row }) => (
          <div className="max-w-md text-sm">{row.original.content}</div>
        ),
      },
      {
        accessorKey: "userName",
        header: "User",
        cell: ({ row }) => {
          const comment = row.original
          return (
            <div className="text-sm">
              <div>{comment.userName}</div>
              <div className="text-xs text-muted-foreground">
                {comment.userEmail}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDateLocal(row.original.createdAt)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const comment = row.original
          return (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteComment(comment.id)}
                disabled={processing === comment.id}
              >
                {processing === comment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          )
        },
      },
    ],
    [processing]
  )

  // Get post types for filter - we'll need to fetch this separately or make it static
  // For now, using common post types
  const postTypeOptions = [
    // { label: "Image", value: "image" },
    { label: "Free", value: "free" },
    { label: "Subscription", value: "subscription" },
    { label: "Exclusive", value: "exclusive" },
    // { label: "Image", value: "image" },
    // { label: "Video", value: "video" },
    // { label: "Text", value: "text" },
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            <AdminDataTable<Post>
              columns={postColumns}
              endpoint="/api/admin/content/posts"
              searchKey="caption"
              searchPlaceholder="Search posts..."
              stateKey="content_posts"
              filterConfigs={[
                {
                  param: "postType",
                  column: "postType",
                  title: "Post Type",
                  options: postTypeOptions,
                },
              ]}
              emptyStateText="No posts found"
            />
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <AdminDataTable<Comment>
              columns={commentColumns}
              endpoint="/api/admin/content/comments"
              searchKey="content"
              searchPlaceholder="Search comments..."
              stateKey="content_comments"
              emptyStateText="No comments found"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
