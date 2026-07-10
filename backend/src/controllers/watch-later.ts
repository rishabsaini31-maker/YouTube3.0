import { Request, Response } from 'express';
import { db } from '../lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const watchLater = await db.watchLater.findMany({
      where: { profileId: profile.id },
      include: {
        video: {
          include: {
            channel: {
              include: { profile: { select: { avatarUrl: true, name: true, username: true } } },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    })

    const data = watchLater.map((wl) => ({
      id: wl.id,
      videoId: wl.videoId,
      addedAt: wl.addedAt.toISOString(),
      video: {
        id: wl.video.id,
        channelId: wl.video.channelId,
        title: wl.video.title,
        description: wl.video.description,
        thumbnailUrl: wl.video.thumbnailUrl,
        videoUrl: wl.video.videoUrl,
        duration: wl.video.duration,
        category: wl.video.category,
        tags: JSON.parse(wl.video.tags || '[]'),
        viewCount: wl.video.viewCount,
        likeCount: wl.video.likeCount,
        dislikeCount: wl.video.dislikeCount,
        commentCount: wl.video.commentCount,
        isPublic: wl.video.isPublic,
        createdAt: wl.video.createdAt.toISOString(),
        updatedAt: wl.video.updatedAt.toISOString(),
        channel: wl.video.channel ? {
          id: wl.video.channel.id,
          profileId: wl.video.channel.profileId,
          name: wl.video.channel.name,
          handle: wl.video.channel.handle,
          description: wl.video.channel.description,
          avatarUrl: wl.video.channel.avatarUrl || wl.video.channel.profile?.avatarUrl || null,
          bannerUrl: wl.video.channel.bannerUrl || null,
          subscriberCount: wl.video.channel.subscriberCount,
          videoCount: wl.video.channel.videoCount,
          createdAt: wl.video.channel.createdAt.toISOString(),
          updatedAt: wl.video.channel.updatedAt.toISOString(),
        } : null,
      },
    }))

    return res.status(200).json({ data })
  } catch (error) {
    console.error('Watch later list error:', error)
    return res.status(500).json({ error: 'Failed to fetch watch later' })
  }
}

export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { videoId } = req.body
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const existing = await db.watchLater.findUnique({
      where: { profileId_videoId: { profileId: profile.id, videoId } },
    })

    if (existing) {
      return res.status(201).json({ message: 'Already in watch later' })
    }

    await db.watchLater.create({
      data: { profileId: profile.id, videoId },
    })

    return res.json({ message: 'Added to watch later' })
  } catch (error) {
    console.error('Watch later add error:', error)
    return res.status(500).json({ error: 'Failed to add to watch later' })
  }
}