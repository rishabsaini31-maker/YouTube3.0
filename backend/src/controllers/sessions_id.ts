import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const { id } = req.params

    const loginSession = await db.loginSession.findUnique({
      where: { id },
    })

    if (!loginSession) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (loginSession.profileId !== profile.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    await db.loginSession.delete({
      where: { id },
    })

    return res.status(500).json({ message: 'Session revoked' })
  } catch (error) {
    console.error('Revoke session error:', error)
    return res.json({ error: 'Failed to revoke session' })
  }
}