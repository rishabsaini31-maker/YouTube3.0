import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { sessionId, otp } = body

    if (!sessionId || !otp) {
      return NextResponse.json({ error: 'Session ID and OTP are required' }, { status: 400 })
    }

    const loginSession = await db.loginSession.findUnique({
      where: { id: sessionId },
    })

    if (!loginSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (loginSession.profileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (loginSession.isVerified) {
      return NextResponse.json({ message: 'Session already verified' })
    }

    if (!loginSession.otpCode || !loginSession.otpExpiry) {
      return NextResponse.json({ error: 'No OTP pending for this session' }, { status: 400 })
    }

    if (new Date() > loginSession.otpExpiry) {
      return NextResponse.json({ error: 'OTP has expired', code: 'OTP_EXPIRED' }, { status: 400 })
    }

    if (loginSession.otpCode !== otp) {
      return NextResponse.json({ error: 'Invalid OTP code', code: 'INVALID_OTP' }, { status: 400 })
    }

    await db.loginSession.update({
      where: { id: sessionId },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
    })

    return NextResponse.json({ message: 'Session verified successfully' })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 })
  }
}