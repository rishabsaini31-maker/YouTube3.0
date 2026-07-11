import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

    
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const skip = (page - 1) * pageSize

    const subscriptions = await db.subscription.findMany({
      where: { subscriberId: profile.id },
      select: { targetId: true },
    })

    const channelIds = subscriptions.map((s) => s.targetId)

    if (channelIds.length === 0) {
      return res.status(500).json({
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      })
    }

    const where = {
      channelId: { in: channelIds },
      isPublic: true,
    }

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        include: {
          channel: {
            include: { profile: { select: { avatarUrl: true, name: true, username: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.video.count({ where }),
    ])

    const formattedVideos = videos.map((v) => ({
      id: v.id,
      channelId: v.channelId,
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      videoUrl: v.videoUrl,
      duration: v.duration,
      category: v.category,
      tags: JSON.parse(v.tags || '[]'),
      viewCount: v.viewCount,
      likeCount: v.likeCount,
      dislikeCount: v.dislikeCount,
      commentCount: v.commentCount,
      isPublic: v.isPublic,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      channel: v.channel
        ? {
            id: v.channel.id,
            profileId: v.channel.profileId,
            name: v.channel.name,
            handle: v.channel.handle,
            description: v.channel.description,
            avatarUrl: v.channel.avatarUrl || v.channel.profile?.avatarUrl || null,
            bannerUrl: v.channel.bannerUrl || v.channel.profile?.bannerUrl || null,
            subscriberCount: v.channel.subscriberCount,
            videoCount: v.channel.videoCount,
            createdAt: v.channel.createdAt.toISOString(),
            updatedAt: v.channel.updatedAt.toISOString(),
          }
        : null,
    }))

    return res.json({
      data: formattedVideos,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Subscription videos error:', error)
    return res.json({ error: 'Failed to fetch subscription videos' })
  }
}