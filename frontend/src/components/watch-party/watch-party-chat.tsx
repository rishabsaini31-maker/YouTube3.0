'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useWatchPartyStore } from '@/stores/watch-party-store'
import { useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeAgo } from '@/lib/format'
import type { WatchPartyChatMessage } from '@/types'

interface WatchPartyChatProps {
  roomId: string
  emit: (event: string, data?: unknown) => void
}

export function WatchPartyChat({ roomId, emit }: WatchPartyChatProps) {
  const { messages, addMessage } = useWatchPartyStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [showScrollDown, setShowScrollDown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Auto-scroll on new messages if near bottom
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  // Initial scroll
  useEffect(() => {
    scrollToBottom(false)
  }, [scrollToBottom])

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setShowScrollDown(!isNearBottom)
  }

  const sendMessage = () => {
    const content = input.trim()
    if (!content || !user) return

    emit('wp:chat-message', {
      content,
      profileId: user.profileId,
      username: user.username,
      avatarUrl: user.avatarUrl,
    })

    // Optimistically add to store (will be replaced by socket echo)
    // Actually the server broadcasts back to all including sender, so we don't need to add here

    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b flex-shrink-0">
        <h3 className="text-sm font-semibold">Live Chat</h3>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">No messages yet. Say hi! 👋</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} isOwn={msg.profileId === user?.profileId} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <div className="absolute bottom-20 right-4">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full shadow-md"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            className="h-9 text-sm"
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            disabled={!input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function ChatMessageBubble({ message, isOwn }: { message: WatchPartyChatMessage; isOwn: boolean }) {
  const isSystem = message.type === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  const initials = message.username?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
        <AvatarImage src={message.avatarUrl || undefined} alt={message.username} />
        <AvatarFallback className="bg-zinc-700 text-white text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className={cn('flex flex-col max-w-[75%]', isOwn && 'items-end')}>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={cn('text-xs font-medium', isOwn ? 'text-primary' : '')}>
            {message.username}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTimeAgo(message.createdAt)}
          </span>
        </div>
        <div
          className={cn(
            'px-3 py-1.5 rounded-2xl text-sm break-words',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}