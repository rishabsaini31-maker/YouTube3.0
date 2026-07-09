import { Request, Response } from 'express';
import { db } from '../lib/db'
import { PAGINATION } from '../types'

export const GET = async (req: Request, res: Response) => {
  try {
    
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt((req.query.pageSize as string) || String(PAGINATION.videosPerPage), 10))
    )
    const category = (req.query.category as string) || 'All'
    const channelId = (req.query.channelId as string) || null
    const sortBy = (req.query.sortBy as string) || 'newest'

    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = { isPublic: true }

    if (category && category !== 'All') {
      where.category = category
    }

    if (channelId) {
      where.channelId = channelId
    }

    type OrderBy = Record<string, string>
    let orderBy: OrderBy = { createdAt: 'desc' }
    if (sortBy === 'popular') orderBy = { viewCount: 'desc' }
    else if (sortBy === 'oldest') orderBy = { createdAt: 'asc' }

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        include: {
          channel: {
            include: { profile: { select: { avatarUrl: true, name: true, username: true } } },
          },
        },
        orderBy,
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
            profile: v.channel.profile
              ? {
                  id: v.channel.profile.id || '',
                  name: v.channel.profile.name,
                  username: v.channel.profile.username,
                  avatarUrl: v.channel.profile.avatarUrl,
                }
              : undefined,
          }
        : null,
    }))

    return res.status(500).json({
      data: formattedVideos,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Videos list error:', error)
    return res.json({ error: 'Failed to fetch videos' })
  }
}