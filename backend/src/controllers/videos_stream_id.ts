import { Request, Response } from 'express';
import { db } from '../lib/db'
import { existsSync, createReadStream, statSync } from 'fs'
import path from 'path'

export const GET = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const video = await db.video.findUnique({
      where: { id },
      select: { videoUrl: true, title: true },
    })

    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    if (!video.videoUrl.startsWith('/uploads/')) {
      return res.status(400).json({ error: 'Cannot stream this video' })
    }

    const filePath = path.join(process.cwd(), 'public', video.videoUrl)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' })
    }

    const stat = statSync(filePath)
    const fileSize = stat.size
    const range = req.headers['range']

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      const file = createReadStream(filePath, { start, end })

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable',
      })

      file.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': String(fileSize),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      })

      const file = createReadStream(filePath)
      file.pipe(res)
    }
  } catch (error) {
    console.error('Stream error:', error)
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to stream video' })
    }
  }
}
