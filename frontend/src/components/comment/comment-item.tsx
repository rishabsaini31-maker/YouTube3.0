'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  MessageSquare,
  Pencil,
  Trash2,
  Flag,
  Languages,
  Loader2,
  Pin,
} from 'lucide-react'
import { formatTimeAgo } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'
import { commentService } from '@/services/comment-service'
import { CommentReportDialog } from './comment-report-dialog'

export interface CommentItemData {
  id: string
  content: string
  likeCount: number
  dislikeCount: number
  isEdited: boolean
  isPinned: boolean
  createdAt: string
  profile: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  replies?: CommentItemData[]
  isLikedByUser?: boolean
  isDislikedByUser?: boolean
}

interface CommentItemProps {
  comment: CommentItemData
  currentUserId?: string
  onReply: (commentId: string) => void
  onEdit: (commentId: string, content: string) => void
  onDelete: (commentId: string) => void
  onLike?: (commentId: string, data: { likeCount: number; dislikeCount: number; isLikedByUser: boolean; isDislikedByUser: boolean }) => void
  onDislike?: (commentId: string, data: { likeCount: number; dislikeCount: number; isLikedByUser: boolean; isDislikedByUser: boolean }) => void
  onTranslate?: (commentId: string, translatedContent: string) => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onDislike,
  onTranslate,
}: CommentItemProps) {
  const isOwner = currentUserId === comment.profile.id
  const { isAuthenticated, openLogin } = useAuthStore()

  // Local optimistic state
  const [likeState, setLikeState] = useState({
    likeCount: comment.likeCount,
    dislikeCount: comment.dislikeCount,
    isLikedByUser: comment.isLikedByUser ?? false,
    isDislikedByUser: comment.isDislikedByUser ?? false,
  })

  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const [isTogglingDislike, setIsTogglingDislike] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatedContent, setTranslatedContent] = useState<string | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const handleLike = useCallback(async () => {
    if (!isAuthenticated) {
      openLogin()
      return
    }
    if (isTogglingLike) return

    // Optimistic update
    const prev = { ...likeState }
    const optimistic = { ...likeState }
    if (optimistic.isLikedByUser) {
      optimistic.likeCount = Math.max(0, optimistic.likeCount - 1)
      optimistic.isLikedByUser = false
    } else {
      if (optimistic.isDislikedByUser) {
        optimistic.dislikeCount = Math.max(0, optimistic.dislikeCount - 1)
        optimistic.isDislikedByUser = false
      }
      optimistic.likeCount += 1
      optimistic.isLikedByUser = true
    }
    setLikeState(optimistic)
    onLike?.(comment.id, optimistic)

    try {
      setIsTogglingLike(true)
      const res = await commentService.toggleLike(comment.id)
      if (res.data) {
        setLikeState(res.data)
        onLike?.(comment.id, res.data)
      }
    } catch {
      // Rollback
      setLikeState(prev)
      onLike?.(comment.id, prev)
      toast.error('Failed to update like')
    } finally {
      setIsTogglingLike(false)
    }
  }, [isAuthenticated, isTogglingLike, likeState, comment.id, onLike, openLogin])

  const handleDislike = useCallback(async () => {
    if (!isAuthenticated) {
      openLogin()
      return
    }
    if (isTogglingDislike) return

    // Optimistic update
    const prev = { ...likeState }
    const optimistic = { ...likeState }
    if (optimistic.isDislikedByUser) {
      optimistic.dislikeCount = Math.max(0, optimistic.dislikeCount - 1)
      optimistic.isDislikedByUser = false
    } else {
      if (optimistic.isLikedByUser) {
        optimistic.likeCount = Math.max(0, optimistic.likeCount - 1)
        optimistic.isLikedByUser = false
      }
      optimistic.dislikeCount += 1
      optimistic.isDislikedByUser = true
    }
    setLikeState(optimistic)
    onDislike?.(comment.id, optimistic)

    try {
      setIsTogglingDislike(true)
      const res = await commentService.toggleDislike(comment.id)
      if (res.data) {
        setLikeState(res.data)
        onDislike?.(comment.id, res.data)
      }
    } catch {
      // Rollback
      setLikeState(prev)
      onDislike?.(comment.id, prev)
      toast.error('Failed to update dislike')
    } finally {
      setIsTogglingDislike(false)
    }
  }, [isAuthenticated, isTogglingDislike, likeState, comment.id, onDislike, openLogin])

  const handleTranslate = useCallback(async () => {
    if (showTranslation) {
      setShowTranslation(false)
      return
    }
    if (translatedContent) {
      setShowTranslation(true)
      return
    }
    setIsTranslating(true)
    try {
      const res = await commentService.translateComment(comment.id)
      if (res.data) {
        setTranslatedContent(res.data.translatedContent)
        setShowTranslation(true)
        onTranslate?.(comment.id, res.data.translatedContent)
      }
    } catch {
      toast.error('Failed to translate comment')
    } finally {
      setIsTranslating(false)
    }
  }, [showTranslation, translatedContent, comment.id, onTranslate])

  return (
    <>
      <div className="flex gap-3 py-3 group">
        <Avatar className="size-10 shrink-0 mt-0.5">
          {comment.profile.avatarUrl ? (
            <AvatarImage src={comment.profile.avatarUrl} alt={comment.profile.name} />
          ) : null}
          <AvatarFallback className="text-xs font-medium">
            {getInitials(comment.profile.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium leading-none">
              @{comment.profile.username}
            </span>
            {comment.isPinned && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Pin className="size-3" />
                Pinned
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {showTranslation && translatedContent && (
            <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 border border-muted">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Languages className="size-3" />
                Translated
              </p>
              <p className="text-sm leading-relaxed">{translatedContent}</p>
            </div>
          )}

          <div className="mt-2 flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-1.5 rounded-full px-2.5 text-xs transition-colors ${
                likeState.isLikedByUser
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={handleLike}
              disabled={isTogglingLike}
            >
              <ThumbsUp
                className={`size-3.5 ${likeState.isLikedByUser ? 'fill-current' : ''}`}
              />
              <span>{likeState.likeCount > 0 ? likeState.likeCount : ''}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-1.5 rounded-full px-2.5 text-xs transition-colors ${
                likeState.isDislikedByUser
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={handleDislike}
              disabled={isTogglingDislike}
            >
              <ThumbsDown
                className={`size-3.5 ${likeState.isDislikedByUser ? 'fill-current' : ''}`}
              />
              <span>{likeState.dislikeCount > 0 ? likeState.dislikeCount : ''}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onReply(comment.id)}
            >
              <MessageSquare className="size-3.5" />
              Reply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleTranslate}
              disabled={isTranslating}
            >
              {isTranslating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Languages className="size-3.5" />
              )}
              Translate
            </Button>
          </div>
        </div>

        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {isOwner ? (
                <>
                  <DropdownMenuItem
                    onClick={() => onEdit(comment.id, comment.content)}
                    className="gap-2 cursor-pointer"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(comment.id)}
                    variant="destructive"
                    className="gap-2 cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={() => setReportOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Flag className="size-4" />
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CommentReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        commentId={comment.id}
        commentContent={comment.content}
      />
    </>
  )
}