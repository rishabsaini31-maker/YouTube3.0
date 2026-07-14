import { Request, Response } from 'express';
import { db } from '@/lib/db';

export const PUT = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const body = req.body;
    const { action } = body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const comment = await db.comment.findUnique({
      where: { id },
      include: { video: true },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Ensure the user owns the video the comment is posted on
    if (comment.video.profileId !== profile.id) {
      return res.status(403).json({ error: 'You do not have permission to moderate this comment' });
    }

    switch (action) {
      case 'hide':
        await db.comment.update({ where: { id }, data: { isHidden: true } });
        break;
      case 'unhide':
        await db.comment.update({ where: { id }, data: { isHidden: false } });
        break;
      case 'mark_spam':
        await db.comment.update({ where: { id }, data: { isSpam: true } });
        break;
      case 'mark_not_spam':
        await db.comment.update({ where: { id }, data: { isSpam: false } });
        break;
      case 'dismiss_reports':
        await db.commentReport.deleteMany({ where: { commentId: id } });
        break;
      case 'pin':
        await db.comment.update({ where: { id }, data: { isPinned: true } });
        break;
      case 'unpin':
        await db.comment.update({ where: { id }, data: { isPinned: false } });
        break;
      default:
        return res.status(400).json({ error: 'Invalid moderation action' });
    }

    return res.status(200).json({ message: 'Comment moderated successfully' });
  } catch (error) {
    console.error('Moderation PUT error:', error);
    return res.status(500).json({ error: 'Failed to moderate comment' });
  }
};
