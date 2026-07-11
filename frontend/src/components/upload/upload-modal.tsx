'use client'

import { useState } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Upload } from 'lucide-react'
import { toast } from 'sonner'

export function UploadModal() {
  const { navigate } = useRouterStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('All')

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-xl shadow-lg w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Upload Video</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate({ name: 'home' })}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-6 space-y-4">
          <div className="border-2 border-dashed rounded-xl p-12 text-center">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Drag and drop video files to upload</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your videos will be private until you publish them</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a title that describes your video" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your video (type @ to mention a channel)"
              className="w-full min-h-[80px] rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <Button
            className="w-full"
            disabled={!title.trim()}
            onClick={() => {
              toast.info('Upload feature coming soon!')
              navigate({ name: 'home' })
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}