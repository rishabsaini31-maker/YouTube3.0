import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, type } = body

    if (!videoId || !type) {
      return NextResponse.json({ error: 'videoId and type are required' }, { status: 400 })
    }

    if (type !== 'LIKE' && type !== 'DISLIKE') {
      return NextResponse.json({ error: 'type must be LIKE or DISLIKE' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const existing = await db.like.findUnique({
      where: { profileId_videoId: { profileId: profile.id, videoId } },
    })

    if (existing) {
      if (existing.type === type) {
        // Remove reaction
        await db.like.delete({ where: { id: existing.id } })
        const field = type === 'LIKE' ? 'likeCount' : 'dislikeCount'
        await db.video.update({
          where: { id: videoId },
          data: { [field]: { decrement: 1 } },
        })
        return NextResponse.json({ data: { reaction: null, likeCount: video[field] - 1, dislikeCount: video[type === 'LIKE' ? 'dislikeCount' : 'likeCount'] } })
      } else {
        // Switch reaction
        const oldField = existing.type === 'LIKE' ? 'likeCount' : 'dislikeCount'
        const newField = type === 'LIKE' ? 'likeCount' : 'dislikeCount'
        await db.like.update({
          where: { id: existing.id },
          data: { type },
        })
        await db.video.update({
          where: { id: videoId },
          data: { [oldField]: { decrement: 1 }, [newField]: { increment: 1 } },
        })
        return NextResponse.json({
          data: { reaction: type, likeCount: video.likeCount + (type === 'LIKE' ? 1 : -1), dislikeCount: video.dislikeCount + (type === 'DISLIKE' ? 1 : -1) },
        })
      }
    } else {
      // New reaction
      await db.like.create({
        data: { profileId: profile.id, videoId, type },
      })
      const field = type === 'LIKE' ? 'likeCount' : 'dislikeCount'
      await db.video.update({
        where: { id: videoId },
        data: { [field]: { increment: 1 } },
      })
      return NextResponse.json({
        data: { reaction: type, likeCount: video.likeCount + (type === 'LIKE' ? 1 : 0), dislikeCount: video.dislikeCount + (type === 'DISLIKE' ? 1 : 0) },
      })
    }
  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json({ error: 'Failed to process reaction' }, { status: 500 })
  }
}