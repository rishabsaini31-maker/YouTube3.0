import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { saveFile } from '@/lib/storage'
import path from 'path'
import fs from 'fs/promises'

export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
      include: { channel: true },
    })

    if (!profile?.channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null
    const thumbnailFile = formData.get('thumbnail') as File | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string || ''
    const category = formData.get('category') as string || 'All'
    const tagsRaw = formData.get('tags') as string || '[]'

    if (!videoFile) {
      return res.status(400).json({ error: 'Video file is required' })
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']
    if (videoFile.size > 500 * 1024 * 1024) {
      return res.status(400).json({ error: 'Video must be under 500MB' })
    }

    let videoUrl = ''
    let thumbnailUrl = ''
    let duration = 0

    if (videoFile && validVideoTypes.includes(videoFile.type)) {
      videoUrl = await saveFile(videoFile, 'videos')
    } else if (videoFile) {
      return res.status(400).json({ error: 'Unsupported video format. Use MP4, WebM, or OGG' })
    }

    if (thumbnailFile) {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!validImageTypes.includes(thumbnailFile.type)) {
        return res.status(400).json({ error: 'Unsupported image format. Use JPEG, PNG, WebP, or GIF' })
      }
      if (thumbnailFile.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'Thumbnail must be under 10MB' })
      }
      thumbnailUrl = await saveFile(thumbnailFile, 'thumbnails')
    } else {
      const colors = ['#1a1a2e,#16213e', '#ee0979,#ff6a00', '#2c3e50,#3498db', '#27ae60,#2ecc71']
      const pair = colors[Math.floor(Math.random() * colors.length)]
      const [c1, c2] = pair.split(',')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:${c1}"/><stop offset="100%" style="stop-color:${c2}"/>
  </linearGradient></defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="320" cy="160" r="45" fill="rgba(255,255,255,0.15)"/>
  <polygon points="305,140 340,160 305,180" fill="white" opacity="0.8"/>
  <text x="320" y="240" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="middle">${title.substring(0, 40).replace(/&/g, '&amp;')}</text>
</svg>`
      thumbnailUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    }

    duration = Math.floor(Math.random() * 1800) + 60

    let tags: string[]
    try {
      tags = JSON.parse(tagsRaw)
      if (!Array.isArray(tags)) tags = []
    } catch {
      tags = tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
    }

    const video = await db.video.create({
      data: {
        channelId: profile.channel.id,
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl,
        videoUrl,
        duration,
        category,
        tags: JSON.stringify(tags),
        isPublic: true,
      },
    })

    await db.channel.update({
      where: { id: profile.channel.id },
      data: { videoCount: { increment: 1 } },
    })

    return res.status(201).json({ data: { id: video.id, title: video.title }, message: 'Video uploaded successfully' })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Failed to upload video' })
  }
}