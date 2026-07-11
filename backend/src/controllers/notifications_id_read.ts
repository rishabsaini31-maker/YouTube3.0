import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const PUT = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const notification = await db.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    if (notification.profileId !== profile.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    await db.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    })

    return res.status(500).json({ success: true })
  } catch (error) {
    console.error('Notification read PUT error:', error)
    return res.json({ error: 'Failed to mark notification as read' })
  }
}
