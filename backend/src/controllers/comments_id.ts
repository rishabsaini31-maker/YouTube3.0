import { Request, Response } from 'express';
import { db } from '../lib/db'

export const PUT = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { id } = req.params
    const body = req.body
    const { content } = body

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const comment = await db.comment.findUnique({ where: { id } })
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    if (comment.profileId !== profile.id) {
      return res.status(403).json({ error: 'You can only edit your own comments' })
    }

    const updated = await db.comment.update({
      where: { id },
      data: { content: content.trim(), isEdited: true },
    })

    return res.status(200).json({
      data: {
        id: updated.id,
        content: updated.content,
        isEdited: updated.isEdited,
        updatedAt: updated.updatedAt.toISOString(),
      },
      message: 'Comment updated',
    })
  } catch (error) {
    console.error('Comment update error:', error)
    return res.status(500).json({ error: 'Failed to update comment' })
  }
}

export const DELETE = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { id } = req.params

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const comment = await db.comment.findUnique({
      where: { id },
      include: { replies: true },
    })

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    if (comment.profileId !== profile.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' })
    }

    const replyCount = comment.replies.length + 1

    await db.comment.delete({ where: { id } })

    await db.video.update({
      where: { id: comment.videoId },
      data: { commentCount: { decrement: replyCount } },
    })

    return res.status(200).json({ message: 'Comment deleted' })
  } catch (error) {
    console.error('Comment delete error:', error)
    return res.status(500).json({ error: 'Failed to delete comment' })
  }
}