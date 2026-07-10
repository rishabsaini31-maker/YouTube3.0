import { Request, Response } from 'express';
import { db } from '../lib/db'

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

    const entry = await db.watchLater.findUnique({ where: { id } })
    if (!entry || entry.profileId !== profile.id) {
      return res.status(404).json({ error: 'Not found' })
    }

    await db.watchLater.delete({ where: { id } })

    return res.status(200).json({ message: 'Removed from watch later' })
  } catch (error) {
    console.error('Watch later remove error:', error)
    return res.status(500).json({ error: 'Failed to remove' })
  }
}