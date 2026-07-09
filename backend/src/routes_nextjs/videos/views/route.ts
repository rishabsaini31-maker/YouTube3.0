import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { videoId, profileId } = await request.json()

    if (!videoId || !profileId) {
      return NextResponse.json({ error: 'videoId and profileId are required' }, { status: 400 })
    }

    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const existingView = await db.watchHistory.findFirst({
      where: {
        profileId,
        videoId,
        watchedAt: { gte: oneDayAgo },
      },
    })

    if (existingView) {
      return NextResponse.json({ message: 'Already viewed today' })
    }

    await db.$transaction([
      db.video.update({
        where: { id: videoId },
        data: { viewCount: { increment: 1 } },
      }),
      db.watchHistory.create({
        data: { profileId, videoId },
      }),
    ])

    return NextResponse.json({ message: 'View recorded' })
  } catch (error) {
    console.error('View increment error:', error)
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 })
  }
}