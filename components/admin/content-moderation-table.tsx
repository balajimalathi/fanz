"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Search, Loader2, MessageSquare, Image } from "lucide-react"
import toast from "react-hot-toast"

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
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("posts")
  const [search, setSearch] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams()
      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/admin/content/posts?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch posts")
      }

      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error("Error fetching posts:", error)
      toast.error("Failed to load posts")
    }
  }

  const fetchComments = async () => {
    try {
      const params = new URLSearchParams()
      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/admin/content/comments?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch comments")
      }

      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error("Error fetching comments:", error)
      toast.error("Failed to load comments")
    }
  }

  useEffect(() => {
    setLoading(true)
    if (activeTab === "posts") {
      fetchPosts().finally(() => setLoading(false))
    } else {
      fetchComments().finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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
      fetchPosts()
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
      fetchComments()
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast.error("Failed to delete comment")
    } finally {
      setProcessing(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === "posts") {
      fetchPosts()
    } else {
      fetchComments()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Moderation</CardTitle>
        <CardDescription>Review and moderate posts and comments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <div className="mb-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
          </div>

          <TabsContent value="posts">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No posts found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Post</th>
                      <th className="text-left p-3 font-medium">Creator</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Created</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="max-w-md">
                            <div className="text-sm font-medium line-clamp-2">
                              {post.caption || "No caption"}
                            </div>
                            {post.media.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                <Image className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {post.media.length} media
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div>{post.creatorName}</div>
                          {post.creatorUsername && (
                            <div className="text-xs text-muted-foreground">
                              @{post.creatorUsername}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{post.postType}</Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No comments found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Comment</th>
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Created</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comments.map((comment) => (
                      <tr key={comment.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="max-w-md text-sm">{comment.content}</div>
                        </td>
                        <td className="p-3 text-sm">
                          <div>{comment.userName}</div>
                          <div className="text-xs text-muted-foreground">
                            {comment.userEmail}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

