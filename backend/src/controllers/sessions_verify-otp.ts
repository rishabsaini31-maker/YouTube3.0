import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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
    const { sessionId, otp } = body

    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Session ID and OTP are required' })
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
      return res.status(400).json({ message: 'Session already verified' })
    }

    if (!loginSession.otpCode || !loginSession.otpExpiry) {
      return res.json({ error: 'No OTP pending for this session' })
    }

    if (new Date() > loginSession.otpExpiry) {
      return res.status(400).json({ error: 'OTP has expired', code: 'OTP_EXPIRED' })
    }

    if (loginSession.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP code', code: 'INVALID_OTP' })
    }

    await db.loginSession.update({
      where: { id: sessionId },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
    })

    return res.status(200).json({ message: 'Session verified successfully' })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return res.json({ error: 'Failed to verify OTP' })
  }
}