"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, Send, MoreVertical, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatPostDate } from "@/lib/utils/feed"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  userId: string
  content: string
  parentCommentId: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    image: string | null
  } | null
  replies: Comment[]
}

interface CommentsSectionProps {
  postId: string
  initialCount: number
  currentUserId: string | null
  onCountChange?: (count: number) => void
}

export function CommentsSection({
  postId,
  initialCount,
  currentUserId,
  onCountChange,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isExpanded) {
      fetchComments()
    }
  }, [isExpanded, postId])

  const fetchComments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments)
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async (parentCommentId?: string) => {
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          parentCommentId,
        }),
      })

      if (response.ok) {
        const newCommentData = await response.json()
        if (parentCommentId) {
          // Add reply to parent comment
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === parentCommentId
                ? { ...comment, replies: [...comment.replies, newCommentData] }
                : comment
            )
          )
        } else {
          // Add as root comment
          setComments((prev) => [...prev, newCommentData])
        }
        setNewComment("")
        onCountChange?.(initialCount + 1)
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(
        `/api/posts/${postId}/comments/${commentId}`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        // Remove comment from state
        setComments((prev) => {
          const removeFromTree = (comments: Comment[]): Comment[] => {
            return comments
              .filter((c) => c.id !== commentId)
              .map((c) => ({
                ...c,
                replies: removeFromTree(c.replies),
              }))
          }
          return removeFromTree(prev)
        })
        onCountChange?.(Math.max(0, initialCount - 1))
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const response = await fetch(
        `/api/posts/${postId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent.trim() }),
        }
      )

      if (response.ok) {
        const updated = await response.json()
        setComments((prev) => {
          const updateInTree = (comments: Comment[]): Comment[] => {
            return comments.map((c) =>
              c.id === commentId
                ? { ...c, ...updated }
                : { ...c, replies: updateInTree(c.replies) }
            )
          }
          return updateInTree(prev)
        })
        setEditingCommentId(null)
        setEditContent("")
      }
    } catch (error) {
      console.error("Error updating comment:", error)
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditContent(comment.content)
  }

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const isOwner = currentUserId === comment.userId
    const isEditing = editingCommentId === comment.id

    return (
      <div className={cn("space-y-2 w-full", depth > 0 && "ml-6 border-l-2 pl-4")}>
        <div className="flex items-start gap-3 w-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.user?.image || undefined} />
            <AvatarFallback>
              {comment.user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {comment.user?.name || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatPostDate(comment.createdAt)}
              </span>
            </div>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px]"
                  maxLength={50}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditComment(comment.id)}
                    disabled={!editContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingCommentId(null)
                      setEditContent("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>
          {isOwner && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startEdit(comment)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {comment.replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{initialCount} {initialCount === 1 ? "comment" : "comments"}</span>
      </Button>

      {isExpanded && (
        <div className="space-y-4 border-t pt-4 w-full">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Loading comments...
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[400px] overflow-y-auto w-full">
                {comments.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))
                )}
              </div>

              <div className="space-y-2 w-full">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[80px]"
                  maxLength={50}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSubmitComment()
                    }
                  }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/50
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitComment()}
                    disabled={!newComment.trim() || isSubmitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Comment
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

