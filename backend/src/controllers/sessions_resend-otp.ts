import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const body = req.body
    const { sessionId } = body

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' })
    }

    const loginSession = await db.loginSession.findUnique({
      where: { id: sessionId },
    })

    if (!loginSession) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (loginSession.profileId !== profile.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    if (loginSession.isVerified) {
      return res.status(400).json({ error: 'Session already verified' })
    }

    const otpCode = String(crypto.randomInt(100000, 999999))

    await db.loginSession.update({
      where: { id: sessionId },
      data: {
        otpCode,
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    return res.status(500).json({ message: 'OTP resent successfully' })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return res.json({ error: 'Failed to resend OTP' })
  }
}