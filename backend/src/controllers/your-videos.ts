import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { deleteFile } from '@/lib/storage'

export const GET = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
      include: { channel: true },
    })
    if (!profile?.channel) {
      return res.status(500).json({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      })
    }

    
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const sortBy = (req.query.sortBy as string) || 'newest'
    const skip = (page - 1) * pageSize

    let orderBy: Record<string, string> = { createdAt: 'desc' }
    if (sortBy === 'popular') orderBy = { viewCount: 'desc' }
    else if (sortBy === 'oldest') orderBy = { createdAt: 'asc' }

    const where = { channelId: profile.channel.id }

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
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
    }))

    return res.json({
      data: formattedVideos,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Your videos error:', error)
    return res.json({ error: 'Failed to fetch your videos' })
  }
}

export const DELETE = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
      include: { channel: true },
    })
    if (!profile?.channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    const body = req.body
    const { videoId } = body

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' })
    }

    const video = await db.video.findUnique({
      where: { id: videoId },
    })

    if (!video || video.channelId !== profile.channel.id) {
      return res.status(404).json({ error: 'Video not found' })
    }

    await db.$transaction(async (tx) => {
      await tx.like.deleteMany({ where: { videoId } })
      await tx.comment.deleteMany({ where: { videoId } })
      await tx.watchHistory.deleteMany({ where: { videoId } })
      await tx.watchLater.deleteMany({ where: { videoId } })
      await tx.video.delete({ where: { id: videoId } })
      await tx.channel.update({
        where: { id: profile.channel.id },
        data: { videoCount: { decrement: 1 } },
      })
    })

    try {
      await deleteFile(video.thumbnailUrl)
      await deleteFile(video.videoUrl)
    } catch {
      // Ignore file deletion errors
    }

    return res.status(200).json({ data: { success: true } })
  } catch (error) {
    console.error('Delete video error:', error)
    return res.json({ error: 'Failed to delete video' })
  }
}