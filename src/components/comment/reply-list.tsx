'use client'

import { CommentItem, type CommentItemData } from './comment-item'

interface ReplyListProps {
  replies: CommentItemData[]
  currentUserId?: string
  onReply: (commentId: string) => void
  onEdit: (commentId: string, content: string) => void
  onDelete: (commentId: string) => void
}

export function ReplyList({
  replies,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
}: ReplyListProps) {
  if (replies.length === 0) return null

  return (
    <div className="ml-6 sm:ml-12 pl-4 sm:pl-6 border-l-2 border-muted">
      {replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}