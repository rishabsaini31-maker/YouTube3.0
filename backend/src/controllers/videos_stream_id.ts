import { Request, Response } from 'express';
import { db } from '@/lib/db'
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
    const range = request.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      const file = createReadStream(filePath, { start, end })
      const readableStream = new ReadableStream({
        start(controller) {
          file.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)))
          file.on('end', () => controller.close())
          file.on('error', (err) => controller.error(err))
        },
      })

      return new Response(readableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    const file = createReadStream(filePath)
    const readableStream = new ReadableStream({
      start(controller) {
        file.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)))
        file.on('end', () => controller.close())
        file.on('error', (err) => controller.error(err))
      },
    })

    return new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Stream error:', error)
    return res.status(500).json({ error: 'Failed to stream video' })
  }
}