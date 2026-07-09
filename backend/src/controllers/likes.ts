import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const body = req.body
    const { videoId, type } = body

    if (!videoId || !type) {
      return res.status(400).json({ error: 'videoId and type are required' })
    }

    if (type !== 'LIKE' && type !== 'DISLIKE') {
      return res.status(400).json({ error: 'type must be LIKE or DISLIKE' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
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
        return res.status(500).json({ data: { reaction: null, likeCount: video[field] - 1, dislikeCount: video[type === 'LIKE' ? 'dislikeCount' : 'likeCount'] } })
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
        return res.json({
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
      return res.json({
        data: { reaction: type, likeCount: video.likeCount + (type === 'LIKE' ? 1 : 0), dislikeCount: video.dislikeCount + (type === 'DISLIKE' ? 1 : 0) },
      })
    }
  } catch (error) {
    console.error('Like error:', error)
    return res.json({ error: 'Failed to process reaction' })
  }
}