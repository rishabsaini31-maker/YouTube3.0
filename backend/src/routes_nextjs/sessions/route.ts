import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

interface SessionBody {
  device: string
  browser: string
  os: string
  userAgent?: string
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const loginSessions = await db.loginSession.findMany({
      where: { profileId: profile.id },
      orderBy: { lastActive: 'desc' },
    })

    const data = loginSessions.map((s) => ({
      id: s.id,
      device: s.device,
      browser: s.browser,
      os: s.os,
      ip: s.ip,
      location: s.location,
      isVerified: s.isVerified,
      lastActive: s.lastActive.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Fetch sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

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

    const body: SessionBody = await request.json()
    const { device, browser, os } = body

    // Check if this browser+os combo already exists for this user
    const existingSession = await db.loginSession.findFirst({
      where: {
        profileId: profile.id,
        browser,
        os,
        isVerified: true,
      },
    })

    let isNewDevice = false
    let requiresOtp = false
    let loginSession

    if (existingSession) {
      // Update last active for existing session
      loginSession = await db.loginSession.update({
        where: { id: existingSession.id },
        data: {
          lastActive: new Date(),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown',
          device,
        },
      })
    } else {
      // New device - create session and generate OTP
      isNewDevice = true
      requiresOtp = true
      const otpCode = String(crypto.randomInt(100000, 999999))

      loginSession = await db.loginSession.create({
        data: {
          profileId: profile.id,
          device,
          browser,
          os,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown',
          location: 'Unknown',
          isVerified: false,
          otpCode,
          otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
        },
      })
    }

    return NextResponse.json({
      data: {
        sessionId: loginSession.id,
        isNewDevice,
        requiresOtp,
      },
    })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}