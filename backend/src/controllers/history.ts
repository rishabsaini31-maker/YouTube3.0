import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request, res: Response) {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const history = await db.watchHistory.findMany({
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
      orderBy: { watchedAt: 'desc' },
      take: 100,
    })

    const data = history.map((h) => ({
      id: h.id,
      videoId: h.videoId,
      watchedAt: h.watchedAt.toISOString(),
      video: {
        id: h.video.id,
        channelId: h.video.channelId,
        title: h.video.title,
        description: h.video.description,
        thumbnailUrl: h.video.thumbnailUrl,
        videoUrl: h.video.videoUrl,
        duration: h.video.duration,
        category: h.video.category,
        tags: JSON.parse(h.video.tags || '[]'),
        viewCount: h.video.viewCount,
        likeCount: h.video.likeCount,
        dislikeCount: h.video.dislikeCount,
        commentCount: h.video.commentCount,
        isPublic: h.video.isPublic,
        createdAt: h.video.createdAt.toISOString(),
        updatedAt: h.video.updatedAt.toISOString(),
        channel: h.video.channel ? {
          id: h.video.channel.id,
          profileId: h.video.channel.profileId,
          name: h.video.channel.name,
          handle: h.video.channel.handle,
          description: h.video.channel.description,
          avatarUrl: h.video.channel.avatarUrl || h.video.channel.profile?.avatarUrl || null,
          bannerUrl: h.video.channel.bannerUrl || null,
          subscriberCount: h.video.channel.subscriberCount,
          videoCount: h.video.channel.videoCount,
          createdAt: h.video.channel.createdAt.toISOString(),
          updatedAt: h.video.channel.updatedAt.toISOString(),
        } : null,
      },
    }))

    return res.status(200).json({ data })
  } catch (error) {
    console.error('History list error:', error)
    return res.json({ error: 'Failed to fetch history' })
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

    await db.watchHistory.upsert({
      where: {
        profileId_videoId: { profileId: profile.id, videoId },
      },
      create: { profileId: profile.id, videoId },
      update: { watchedAt: new Date() },
    })

    return res.status(200).json({ message: 'History recorded' })
  } catch (error) {
    console.error('History record error:', error)
    return res.json({ error: 'Failed to record history' })
  }
}

export async function DELETE(req: Request, res: Response) {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    await db.watchHistory.deleteMany({ where: { profileId: profile.id } })

    return res.status(200).json({ message: 'History cleared' })
  } catch (error) {
    console.error('History clear error:', error)
    return res.json({ error: 'Failed to clear history' })
  }
}