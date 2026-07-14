import { Request, Response } from 'express';
import { db } from '@/lib/db';

export const GET = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Only fetch comments on videos owned by this user
    // Also include those reported or flagged as spam
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const whereClause = {
      video: { profileId: profile.id }, // Video belongs to current user
      OR: [
        { isSpam: true },
        { isHidden: true },
        { reports: { some: {} } }
      ]
    };

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: whereClause,
        include: {
          profile: true,
          video: true,
          reports: {
            include: { reporter: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.comment.count({ where: whereClause }),
    ]);

    const formatted = comments.map((c) => ({
      id: c.id,
      videoId: c.videoId,
      content: c.content,
      profileId: c.profileId,
      profileName: c.profile.name,
      profileImage: c.profile.avatarUrl,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      likeCount: c.likeCount,
      dislikeCount: c.dislikeCount,
      isEdited: c.isEdited,
      isHidden: c.isHidden,
      isPinned: c.isPinned,
      isSpam: c.isSpam,
      replyCount: c.replyCount,
      video: c.video ? { id: c.video.id, title: c.video.title } : undefined,
      reports: c.reports.map((r) => ({
        id: r.id,
        commentId: r.commentId,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter ? {
          id: r.reporter.id,
          name: r.reporter.name,
          username: r.reporter.username
        } : undefined
      }))
    }));

    return res.json({
      data: formatted,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    });
  } catch (error) {
    console.error('Moderation GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch reported comments' });
  }
};
