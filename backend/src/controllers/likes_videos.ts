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

    const likes = await db.like.findMany({
      where: {
        profileId: profile.id,
        type: 'LIKE',
        videoId: { not: null },
      },
      include: {
        video: {
          include: {
            channel: {
              include: { profile: { select: { avatarUrl: true, name: true, username: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = likes
      .filter((l) => l.video && l.video.isPublic)
      .map((l) => ({
        id: l.id,
        videoId: l.video!.id,
        likedAt: l.createdAt.toISOString(),
        video: {
          id: l.video!.id,
          channelId: l.video!.channelId,
          title: l.video!.title,
          description: l.video!.description,
          thumbnailUrl: l.video!.thumbnailUrl,
          videoUrl: l.video!.videoUrl,
          duration: l.video!.duration,
          category: l.video!.category,
          tags: JSON.parse(l.video!.tags || '[]'),
          viewCount: l.video!.viewCount,
          likeCount: l.video!.likeCount,
          dislikeCount: l.video!.dislikeCount,
          commentCount: l.video!.commentCount,
          isPublic: l.video!.isPublic,
          createdAt: l.video!.createdAt.toISOString(),
          updatedAt: l.video!.updatedAt.toISOString(),
          channel: l.video!.channel ? {
            id: l.video!.channel.id,
            profileId: l.video!.channel.profileId,
            name: l.video!.channel.name,
            handle: l.video!.channel.handle,
            description: l.video!.channel.description,
            avatarUrl: l.video!.channel.avatarUrl || l.video!.channel.profile?.avatarUrl || null,
            bannerUrl: l.video!.channel.bannerUrl || null,
            subscriberCount: l.video!.channel.subscriberCount,
            videoCount: l.video!.channel.videoCount,
            createdAt: l.video!.channel.createdAt.toISOString(),
            updatedAt: l.video!.channel.updatedAt.toISOString(),
          } : null,
        },
      }))

    return res.status(200).json({ data })
  } catch (error) {
    console.error('Liked videos error:', error)
    return res.status(500).json({ error: 'Failed to fetch liked videos' })
  }
}