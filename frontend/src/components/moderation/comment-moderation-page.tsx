'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Shield,
  EyeOff,
  Eye,
  Ban,
  CheckCircle2,
  XCircle,
  Pin,
  PinOff,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { commentService } from '@/services/comment-service'
import { useRouterStore } from '@/stores/router-store'
import type { ReportedComment } from '@/types'

type ModerationAction = 'hide' | 'unhide' | 'mark_spam' | 'mark_not_spam' | 'dismiss_reports' | 'pin' | 'unpin'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const REASON_COLORS: Record<string, string> = {
  spam: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  harassment: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  inappropriate: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

export function CommentModerationPage() {
  const { navigate } = useRouterStore()
  const [comments, setComments] = useState<ReportedComment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    commentId: string
    action: ModerationAction
    label: string
  } | null>(null)

  const fetchComments = useCallback(async (pageNum: number, reset = false) => {
    try {
      const res = await commentService.getReportedComments(pageNum)
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
      toast.error('Failed to load reported comments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchComments(1, true)
  }, [fetchComments])

  const handleModerate = async () => {
    if (!confirmAction) return
    setActionLoading(confirmAction.commentId)
    try {
      await commentService.moderateComment(confirmAction.commentId, confirmAction.action)
      toast.success(`Comment ${confirmAction.label.toLowerCase()}`)
      // Refresh the list
      fetchComments(1, true)
    } catch {
      toast.error('Failed to moderate comment')
    } finally {
      setActionLoading(null)
      setConfirmAction(null)
    }
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchComments(page + 1, false)
    }
  }

  const getActionButtons = (comment: ReportedComment) => {
    const buttons: { action: ModerationAction; label: string; icon: React.ElementType; variant: 'default' | 'outline' | 'destructive' | 'ghost'; confirm?: boolean }[] = []

    if (comment.isHidden) {
      buttons.push({ action: 'unhide', label: 'Unhide', icon: Eye, variant: 'outline' })
    } else {
      buttons.push({ action: 'hide', label: 'Hide', icon: EyeOff, variant: 'outline', confirm: true })
    }

    if (comment.isSpam) {
      buttons.push({ action: 'mark_not_spam', label: 'Not Spam', icon: CheckCircle2, variant: 'outline' })
    } else {
      buttons.push({ action: 'mark_spam', label: 'Mark Spam', icon: Ban, variant: 'outline', confirm: true })
    }

    if (comment.isPinned) {
      buttons.push({ action: 'unpin', label: 'Unpin', icon: PinOff, variant: 'ghost' })
    } else {
      buttons.push({ action: 'pin', label: 'Pin', icon: Pin, variant: 'ghost' })
    }

    buttons.push({
      action: 'dismiss_reports',
      label: 'Dismiss Reports',
      icon: XCircle,
      variant: 'ghost',
      confirm: true,
    })

    return buttons
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Shield className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Comment Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage reported comments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground mt-1">Reported Comments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {comments.filter((c) => c.isHidden).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Hidden</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {comments.filter((c) => c.isSpam).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Flagged Spam</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {loading && comments.length === 0 && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && comments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reported comments</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              When comments are reported, they will appear here for review
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comment list */}
      <div className="space-y-3">
        {comments.map((comment) => {
          const isLoading = actionLoading === comment.id
          const actionButtons = getActionButtons(comment)

          return (
            <Card key={comment.id} className={comment.isHidden ? 'opacity-75' : ''}>
              <CardContent className="p-4">
                {/* Comment header */}
                <div className="flex items-start gap-3">
                  <Avatar className="size-9 shrink-0">
                    {comment.profile?.avatarUrl ? (
                      <AvatarImage src={comment.profile.avatarUrl} alt={comment.profile.name} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {comment.profile ? getInitials(comment.profile.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        @{comment.profile?.username || 'Unknown'}
                      </span>
                      {comment.isHidden && (
                        <Badge variant="secondary" className="text-xs bg-muted">
                          <EyeOff className="size-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                      {comment.isSpam && (
                        <Badge variant="secondary" className="text-xs bg-destructive/10 text-destructive">
                          <Ban className="size-3 mr-1" />
                          Spam
                        </Badge>
                      )}
                      {comment.isPinned && (
                        <Badge variant="secondary" className="text-xs">
                          <Pin className="size-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                    </div>

                    {/* Comment content */}
                    <p className="mt-1 text-sm leading-relaxed line-clamp-3">
                      {comment.content}
                    </p>

                    {/* Video context */}
                    {comment.video && (
                      <button
                        onClick={() => navigate({ name: 'video', params: { id: comment.video!.id } })}
                        className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="size-3" />
                        <span className="truncate max-w-[300px]">{comment.video.title}</span>
                      </button>
                    )}

                    {/* Reports */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">
                        {comment.reports.length} report{comment.reports.length !== 1 ? 's' : ''}:
                      </span>
                      {comment.reports.map((report, i) => (
                        <Badge
                          key={report.id}
                          variant="secondary"
                          className={`text-xs ${REASON_COLORS[report.reason] || ''}`}
                        >
                          {report.reason}
                          {report.reporter && (
                            <span className="ml-1 opacity-70">by @{report.reporter.username}</span>
                          )}
                        </Badge>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {actionButtons.map((btn) => {
                        const Icon = btn.icon
                        const needsConfirm = 'confirm' in btn && btn.confirm
                        return (
                          <Button
                            key={btn.action}
                            variant={btn.variant}
                            size="sm"
                            className="h-7 gap-1.5 text-xs rounded-full"
                            disabled={isLoading}
                            onClick={() => {
                              if (needsConfirm) {
                                setConfirmAction({
                                  commentId: comment.id,
                                  action: btn.action,
                                  label: btn.label,
                                })
                              } else {
                                setActionLoading(comment.id)
                                commentService
                                  .moderateComment(comment.id, btn.action)
                                  .then(() => {
                                    toast.success(`Comment ${btn.label.toLowerCase()}`)
                                    fetchComments(1, true)
                                  })
                                  .catch(() => {
                                    toast.error('Failed to moderate comment')
                                  })
                                  .finally(() => setActionLoading(null))
                              }
                            }}
                          >
                            {isLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Icon className="size-3.5" />
                            )}
                            <span className="hidden sm:inline">{btn.label}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full rounded-full text-sm"
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        </div>
      )}

      {/* Loading more */}
      {loading && comments.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction?.label.toLowerCase()} this comment? This action can be reversed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleModerate}
              className="rounded-full"
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmAction?.label || 'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}