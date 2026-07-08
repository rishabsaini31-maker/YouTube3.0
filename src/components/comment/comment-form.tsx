'use client'

import { useState, useRef, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

const MAX_CHARS = 1000

interface CommentFormProps {
  onSubmit: (content: string) => void
  placeholder?: string
  initialValue?: string
  onCancel?: () => void
  isLoading?: boolean
}

export function CommentForm({
  onSubmit,
  placeholder = 'Add a comment...',
  initialValue = '',
  onCancel,
  isLoading = false,
}: CommentFormProps) {
  const [content, setContent] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { user } = useAuthStore()

  const isOverLimit = content.length > MAX_CHARS
  const isEmpty = content.trim().length === 0
  const isDisabled = isEmpty || isOverLimit || isLoading

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value)
    },
    []
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (isDisabled) return
      onSubmit(content.trim())
      if (!initialValue) {
        setContent('')
      }
    },
    [content, isDisabled, onSubmit, initialValue]
  )

  const handleCancel = useCallback(() => {
    setContent(initialValue)
    onCancel?.()
  }, [initialValue, onCancel])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Avatar className="size-10 shrink-0">
        {user?.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={user.name} />
        ) : null}
        <AvatarFallback className="text-xs font-medium">
          {user?.name ? getInitials(user.name) : '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={MAX_CHARS + 100}
            rows={1}
            className="min-h-[40px] max-h-[120px] resize-none rounded-lg border-muted-foreground/30 bg-transparent px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-ring/50"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span
            className={`text-xs transition-colors ${
              isOverLimit
                ? 'text-destructive'
                : content.length === 0
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/70'
            }`}
          >
            {!isEmpty && (
              <>
                {content.length}/{MAX_CHARS}
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
                className="rounded-full text-sm"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isDisabled}
              className="rounded-full bg-primary text-sm font-medium hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span className="hidden sm:inline">Commenting...</span>
                </>
              ) : (
                'Comment'
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}