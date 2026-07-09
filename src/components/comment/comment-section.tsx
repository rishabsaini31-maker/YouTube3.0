'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { commentService } from '@/services/comment-service'
import { useAuthStore } from '@/stores/auth-store'
import { formatViewCount } from '@/lib/format'
import { CommentForm } from './comment-form'
import { CommentItem, type CommentItemData } from './comment-item'
import { ReplyList } from './reply-list'

interface CommentSectionProps {
  videoId: string
}

type SortOption = 'top' | 'newest'

export function CommentSection({ videoId }: CommentSectionProps) {
  const { user, isAuthenticated, openLogin } = useAuthStore()

  const [comments, setComments] = useState<CommentItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('top')
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [isAddingComment, setIsAddingComment] = useState(false)

  const fetchComments = useCallback(
    async (pageNum: number, reset = false) => {
      try {
        const res = await commentService.getComments(videoId, pageNum)
        if (res.data) {
          if (reset) {
            setComments(res.data)
          } else {
            setComments((prev) => [...prev, ...res.data])
          }
          setTotal(res.total)
          setHasMore(res.hasMore)
          setPage(pageNum)
        }
      } catch {
        toast.error('Failed to load comments')
      } finally {
        setLoading(false)
      }
    },
    [videoId]
  )

  useEffect(() => {
    setLoading(true)
    fetchComments(1, true)
  }, [fetchComments])

  const refreshComments = useCallback(() => {
    fetchComments(1, true)
  }, [fetchComments])

  const handleAddComment = useCallback(
    async (content: string) => {
      setIsAddingComment(true)
      try {
        await commentService.addComment(videoId, content)
        toast.success('Comment added')
        setReplyingTo(null)
        refreshComments()
      } catch {
        toast.error('Failed to add comment')
      } finally {
        setIsAddingComment(false)
      }
    },
    [videoId, refreshComments]
  )

  const handleReply = useCallback(
    async (content: string) => {
      if (!replyingTo) return
      setSubmittingId(replyingTo)
      try {
        await commentService.addComment(videoId, content, replyingTo)
        toast.success('Reply added')
        setReplyingTo(null)
        refreshComments()
      } catch {
        toast.error('Failed to add reply')
      } finally {
        setSubmittingId(null)
      }
    },
    [videoId, replyingTo, refreshComments]
  )

  const handleEdit = useCallback(
    async (content: string) => {
      if (!editingId) return
      setSubmittingId(editingId)
      try {
        await commentService.updateComment(editingId, content)
        toast.success('Comment updated')
        setEditingId(null)
        setEditContent('')
        refreshComments()
      } catch {
        toast.error('Failed to update comment')
      } finally {
        setSubmittingId(null)
      }
    },
    [editingId, refreshComments]
  )

  const handleDelete = useCallback(
    async (commentId: string) => {
      try {
        await commentService.deleteComment(commentId)
        toast.success('Comment deleted')
        refreshComments()
      } catch {
        toast.error('Failed to delete comment')
      }
    },
    [refreshComments]
  )

  const handleReplyClick = useCallback((commentId: string) => {
    setReplyingTo((prev) => (prev === commentId ? null : commentId))
    setEditingId(null)
  }, [])

  const handleEditClick = useCallback((commentId: string, content: string) => {
    setEditingId(commentId)
    setEditContent(content)
    setReplyingTo(null)
  }, [])

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchComments(page + 1, false)
    }
  }, [hasMore, loading, page, fetchComments])

  return (
    <section className="mt-6" aria-label="Comments">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          {total > 0 ? formatViewCount(total) : '0'} Comments
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground"
            >
              Sort by
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(val) => setSortBy(val as SortOption)}
            >
              <DropdownMenuRadioItem value="top">
                Top comments
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="newest">
                Newest first
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add comment form */}
      {isAuthenticated ? (
        <div className="mb-6">
          <CommentForm
            onSubmit={handleAddComment}
            isLoading={isAddingComment}
            placeholder="Add a comment..."
          />
        </div>
      ) : (
        <button
          onClick={openLogin}
          className="mb-6 flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground hover:bg-accent/50 transition-colors w-full text-left"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="size-4" />
          </div>
          Sign in to add a comment
        </button>
      )}

      {/* Loading skeleton */}
      {loading && comments.length === 0 && (
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-3">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments list */}
      {!loading && comments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Be the first to share your thoughts
          </p>
        </div>
      )}

      <div className="divide-y divide-border">
        {comments.map((comment) => (
          <div key={comment.id}>
            {editingId === comment.id ? (
              <div className="flex gap-3 py-3">
                <div className="size-10 shrink-0" />
                <div className="flex-1">
                  <CommentForm
                    onSubmit={handleEdit}
                    onCancel={() => {
                      setEditingId(null)
                      setEditContent('')
                    }}
                    initialValue={editContent}
                    isLoading={submittingId === comment.id}
                    placeholder="Edit your comment..."
                  />
                </div>
              </div>
            ) : (
              <CommentItem
                comment={comment}
                currentUserId={user?.profileId}
                onReply={handleReplyClick}
                onEdit={handleEditClick}
                onDelete={handleDelete}
              />
            )}

            {/* Inline reply form */}
            {replyingTo === comment.id && editingId !== comment.id && (
              <div className="ml-6 sm:ml-12 pl-4 sm:pl-6 border-l-2 border-muted pb-3">
                <CommentForm
                  onSubmit={handleReply}
                  onCancel={() => setReplyingTo(null)}
                  isLoading={submittingId === comment.id}
                  placeholder={`Reply to @${comment.profile.username}...`}
                />
              </div>
            )}

            {/* Nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <ReplyList
                replies={comment.replies}
                currentUserId={user?.profileId}
                onReply={handleReplyClick}
                onEdit={handleEditClick}
                onDelete={handleDelete}
              />
            )}
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full rounded-full text-sm"
            onClick={handleLoadMore}
          >
            Show more comments
          </Button>
        </div>
      )}

      {/* Loading more indicator */}
      {loading && comments.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <div className="size-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          Loading more comments...
        </div>
      )}
    </section>
  )
}