'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThumbsUp, MoreHorizontal, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { formatTimeAgo } from '@/lib/format'

export interface CommentItemData {
  id: string
  content: string
  likeCount: number
  isEdited: boolean
  createdAt: string
  profile: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  replies?: CommentItemData[]
}

interface CommentItemProps {
  comment: CommentItemData
  currentUserId?: string
  onReply: (commentId: string) => void
  onEdit: (commentId: string, content: string) => void
  onDelete: (commentId: string) => void
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
}: CommentItemProps) {
  const isOwner = currentUserId === comment.profile.id

  return (
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium leading-none">
            @{comment.profile.username}
          </span>
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

        <div className="mt-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onReply(comment.id)}
          >
            <ThumbsUp className="size-3.5" />
            <span>{comment.likeCount > 0 ? comment.likeCount : ''}</span>
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
        </div>
      </div>

      {isOwner && (
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}