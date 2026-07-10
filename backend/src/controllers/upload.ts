import { Request, Response } from 'express'
import Busboy from 'busboy'
import { db } from '../lib/db'
import { saveFile } from '../lib/storage'
import type { IncomingMessage } from 'node:http'

export const POST = (req: Request, res: Response) => {
  return new Promise<void>((resolve) => {
    const busboy = Busboy({ headers: req.headers })
    const fields: Record<string, string> = {}
    const files: { video?: { buffer: Buffer; mimetype: string; size: number }; thumbnail?: { buffer: Buffer; mimetype: string; size: number } } = {}

    busboy.on('file', (fieldname: string, stream: any, fileInfo: { filename: string; encoding: string; mimeType: string }) => {
      const { filename, mimeType } = fileInfo
      const chunks: Buffer[] = []
      stream.on('data', (data: Buffer) => chunks.push(data))
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks)
        if (fieldname === 'video' && !files.video) {
          files.video = { buffer, mimetype: mimeType || '', size: buffer.length }
        } else if (fieldname === 'thumbnail' && !files.thumbnail) {
          files.thumbnail = { buffer, mimetype: mimeType || '', size: buffer.length }
        }
      })
    })

    busboy.on('field', (fieldname: string, value: string) => {
      fields[fieldname] = value
    })

    busboy.on('finish', async () => {
      try {
        const session = { user: (req as any).user }
        if (!session?.user?.id) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const profile = await db.profile.findUnique({
          where: { userId: session.user.id! },
          include: { channel: true },
        })

        if (!profile) {
          return res.status(404).json({ error: 'Profile not found' })
        }

        let channel = profile.channel
        if (!channel) {
          channel = await db.channel.create({
            data: {
              profileId: profile.id,
              name: profile.name || profile.username || 'My Channel',
              handle: `@${profile.username || profile.id}`,
            },
          })
        }

        const videoFile = files.video
        const thumbnailFile = files.thumbnail
        const title = typeof fields.title === 'string' ? fields.title : ''
        const description = typeof fields.description === 'string' ? fields.description : ''
        const category = typeof fields.category === 'string' ? fields.category : 'All'
        const tagsRaw = typeof fields.tags === 'string' ? fields.tags : '[]'

        let tags: string[]
        try {
          tags = JSON.parse(tagsRaw)
          if (!Array.isArray(tags)) tags = []
        } catch {
          tags = tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
        }

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

        if (videoFile && validVideoTypes.includes(videoFile.mimetype)) {
          videoUrl = await saveFile(videoFile.buffer, 'videos', videoFile.mimetype)
        } else if (videoFile) {
          return res.status(400).json({ error: 'Unsupported video format. Use MP4, WebM, or OGG' })
        }

        if (thumbnailFile) {
          const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
          if (!validImageTypes.includes(thumbnailFile.mimetype)) {
            return res.status(400).json({ error: 'Unsupported image format. Use JPEG, PNG, WebP, or GIF' })
          }
          if (thumbnailFile.size > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'Thumbnail must be under 10MB' })
          }
          thumbnailUrl = await saveFile(thumbnailFile.buffer, 'thumbnails', thumbnailFile.mimetype)
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

        const video = await db.video.create({
          data: {
            channelId: channel.id,
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
          where: { id: channel.id },
          data: { videoCount: { increment: 1 } },
        })

        return res.status(201).json({ data: { id: video.id, title: video.title }, message: 'Video uploaded successfully' })
      } catch (error) {
        console.error('Upload error:', error)
        return res.status(500).json({ error: 'Failed to upload video' })
      }
    })

    busboy.on('error', () => {
      return res.status(500).json({ error: 'Failed to parse upload' })
    })

    req.pipe(busboy)
    resolve()
  }) as unknown as Promise<void>
}
