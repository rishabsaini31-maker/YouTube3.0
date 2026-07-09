import { Request, Response } from 'express';
import { db } from '../lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    const { id } = await params

    const video = await db.video.findUnique({
      where: { id },
      include: {
        channel: {
          include: { profile: { select: { id: true, avatarUrl: true, name: true, username: true, bio: true } } },
        },
      },
    })

    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    const formatted = {
      id: video.id,
      channelId: video.channelId,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      videoUrl: video.videoUrl,
      duration: video.duration,
      category: video.category,
      tags: JSON.parse(video.tags || '[]'),
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      dislikeCount: video.dislikeCount,
      commentCount: video.commentCount,
      isPublic: video.isPublic,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      channel: video.channel
        ? {
            id: video.channel.id,
            profileId: video.channel.profileId,
            name: video.channel.name,
            handle: video.channel.handle,
            description: video.channel.description,
            avatarUrl: video.channel.avatarUrl || video.channel.profile?.avatarUrl || null,
            bannerUrl: video.channel.bannerUrl || video.channel.profile?.bannerUrl || null,
            subscriberCount: video.channel.subscriberCount,
            videoCount: video.channel.videoCount,
            createdAt: video.channel.createdAt.toISOString(),
            updatedAt: video.channel.updatedAt.toISOString(),
            profile: video.channel.profile
              ? {
                  id: video.channel.profile.id,
                  name: video.channel.profile.name,
                  username: video.channel.profile.username,
                  avatarUrl: video.channel.profile.avatarUrl,
                  bio: video.channel.profile.bio,
                }
              : undefined,
          }
        : null,
    }

    return res.status(500).json({ data: formatted })
  } catch (error) {
    console.error('Video get error:', error)
    return res.json({ error: 'Failed to fetch video' })
  }
}