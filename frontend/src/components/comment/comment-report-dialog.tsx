'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { commentService } from '@/services/comment-service'

interface CommentReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commentId: string
  commentContent: string
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Misleading or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying or threatening behavior' },
  { value: 'inappropriate', label: 'Inappropriate content', description: 'Offensive or explicit material' },
  { value: 'other', label: 'Other', description: 'Something else that needs attention' },
]

export function CommentReportDialog({
  open,
  onOpenChange,
  commentId,
  commentContent,
}: CommentReportDialogProps) {
  const [reason, setReason] = useState('spam')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await commentService.reportComment(commentId, reason, description || undefined)
      toast.success('Report submitted. Thank you for helping keep the community safe.')
      onOpenChange(false)
      setReason('spam')
      setDescription('')
    } catch {
      toast.error('Failed to report comment')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('spam')
      setDescription('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report comment</DialogTitle>
          <DialogDescription>
            Help us understand the problem with this comment.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-3 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Comment being reported:</p>
          <p className="text-sm line-clamp-2">{commentContent}</p>
        </div>

        <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <div key={r.value} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value={r.value} id={r.value} className="mt-0.5" />
              <Label htmlFor={r.value} className="cursor-pointer flex-1">
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="space-y-2">
          <Label htmlFor="report-desc" className="text-sm font-medium">
            Additional details <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="report-desc"
            placeholder="Provide any additional context..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Reporting...
              </>
            ) : (
              'Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}