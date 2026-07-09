import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { existsSync, createReadStream, statSync } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const video = await db.video.findUnique({
      where: { id },
      select: { videoUrl: true, title: true },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (!video.videoUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'Cannot stream this video' }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'public', video.videoUrl)

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
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
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 })
  }
}