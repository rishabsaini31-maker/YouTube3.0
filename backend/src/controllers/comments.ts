import { Request, Response } from 'express';
import { db } from '../lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    
    const videoId = (req.query.videoId as string)

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' })
    }

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '10', 10)))
    const skip = (page - 1) * pageSize

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: { videoId, parentId: null },
        include: {
          profile: { select: { id: true, name: true, username: true, avatarUrl: true } },
          replies: {
            include: {
              profile: { select: { id: true, name: true, username: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.comment.count({ where: { videoId, parentId: null } }),
    ])

    const formatted = comments.map((c) => ({
      id: c.id,
      videoId: c.videoId,
      profileId: c.profileId,
      parentId: c.parentId,
      content: c.content,
      likeCount: c.likeCount,
      isEdited: c.isEdited,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      profile: c.profile,
      replies: c.replies.map((r) => ({
        id: r.id,
        videoId: r.videoId,
        profileId: r.profileId,
        parentId: r.parentId,
        content: r.content,
        likeCount: r.likeCount,
        isEdited: r.isEdited,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        profile: r.profile,
      })),
    }))

    return res.status(200).json({ data: formatted, total, page, pageSize, hasMore: skip + pageSize < total })
  } catch (error) {
    console.error('Comments list error:', error)
    return res.status(500).json({ error: 'Failed to fetch comments' })
  }
}

export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const body = req.body
    const { videoId, content, parentId } = body

    if (!videoId || !content?.trim()) {
      return res.status(400).json({ error: 'videoId and content are required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    const comment = await db.comment.create({
      data: {
        videoId,
        profileId: profile.id,
        parentId: parentId || null,
        content: content.trim(),
      },
    })

    await db.video.update({
      where: { id: videoId },
      data: { commentCount: { increment: 1 } },
    })

    return res.status(201).json({
        data: {
          id: comment.id,
          videoId: comment.videoId,
          profileId: comment.profileId,
          parentId: comment.parentId,
          content: comment.content,
          likeCount: 0,
          isEdited: false,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          profile: { id: profile.id, name: profile.name, username: profile.username, avatarUrl: profile.avatarUrl },
          replies: [],
        },
        message: 'Comment added',
      })
  } catch (error) {
    console.error('Comment create error:', error)
    return res.status(500).json({ error: 'Failed to add comment' })
  }
}