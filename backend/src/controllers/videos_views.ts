import { Request, Response } from 'express';
import { db } from '@/lib/db'

export const POST = async (req: Request, res: Response) => {
  try {
    const { videoId, profileId } = req.body

    if (!videoId || !profileId) {
      return res.status(400).json({ error: 'videoId and profileId are required' })
    }

    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
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
      return res.status(200).json({ message: 'Already viewed today' })
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

    return res.json({ message: 'View recorded' })
  } catch (error) {
    console.error('View increment error:', error)
    return res.json({ error: 'Failed to record view' })
  }
}