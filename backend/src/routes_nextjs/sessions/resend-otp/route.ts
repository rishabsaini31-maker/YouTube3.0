import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

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
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Session already verified' }, { status: 400 })
    }

    const otpCode = String(crypto.randomInt(100000, 999999))

    await db.loginSession.update({
      where: { id: sessionId },
      data: {
        otpCode,
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    return NextResponse.json({ message: 'OTP resent successfully' })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return NextResponse.json({ error: 'Failed to resend OTP' }, { status: 500 })
  }
}