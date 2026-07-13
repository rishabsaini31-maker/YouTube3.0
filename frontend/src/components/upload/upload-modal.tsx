'use client'

import { useState, useRef } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { uploadService } from '@/services/upload-service'
import { useAuthStore } from '@/stores/auth-store'
import { VIDEO_CATEGORIES } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { X, Upload, Film, ImageIcon, Loader2 } from 'lucide-react'

export function UploadModal() {
  const { currentView, navigate } = useRouterStore()
  const { user } = useAuthStore()
  const isOpen = currentView.name === 'upload'

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('All')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<'upload' | 'details'>('upload')
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    if (isUploading) return
    setStep('upload')
    setVideoFile(null)
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setTitle('')
    setDescription('')
    setCategory('All')
    setTagInput('')
    setTags([])
    setProgress(0)
    navigate({ name: 'home' })
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['video/mp4', 'video/webm', 'video/ogg'].includes(file.type)) {
      toast.error('Unsupported video format. Use MP4, WebM, or OGG.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be under 50MB.')
      return
    }
    setVideoFile(file)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Unsupported image format. Use JPEG, PNG, WebP, or GIF.')
      return
    }
    setThumbnailFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const handleUpload = async () => {
    if (!videoFile || !title.trim()) return

    setIsUploading(true)
    setProgress(0)

    try {
      await uploadService.uploadVideo(
        {
          video: videoFile,
          thumbnail: thumbnailFile || undefined,
          title: title.trim(),
          description: description.trim(),
          category,
          tags,
          userId: user?.userId || user?.id,
        },
        (percent) => setProgress(percent)
      )

      toast.success('Video uploaded successfully!')
      handleClose()
    } catch {
      toast.error('Failed to upload video. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const isFormValid = videoFile && title.trim().length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Video
          </DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? 'Select a video file to upload'
              : 'Add details about your video'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-6">
          {step === 'upload' && (
            <>
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => videoInputRef.current?.click()}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Film className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Select a video file to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP4, WebM, or OGG up to 50MB
                  </p>
                </div>
                <Button variant="outline" size="sm" type="button">
                  Select Files
                </Button>
              </div>

              {videoFile && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Film className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setVideoFile(null); if (videoInputRef.current) videoInputRef.current.value = '' }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => setStep('details')}
                disabled={!videoFile}
              >
                Next
              </Button>
            </>
          )}

          {step === 'details' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="upload-title">Title *</Label>
                  <Input
                    id="upload-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a title that describes your video"
                    maxLength={100}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {title.length}/100
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="upload-desc">Description</Label>
                  <Textarea
                    id="upload-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers about your video"
                    rows={4}
                    className="mt-1.5"
                    maxLength={5000}
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Thumbnail</Label>
                  <div
                    className="mt-1.5 border rounded-lg overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleThumbnailSelect}
                    />
                    {thumbnailPreview ? (
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="h-24 flex flex-col items-center justify-center gap-1">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Upload thumbnail</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="upload-tags">Tags</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="upload-tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      className="flex-1"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                      maxLength={30}
                    />
                    <Button variant="secondary" onClick={addTag} type="button">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('upload')}
                  disabled={isUploading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!isFormValid || isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
