import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ data: null }, { status: 200 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
      include: { channel: true },
    })

    if (!profile) {
      return NextResponse.json({ data: null }, { status: 200 })
    }

    return NextResponse.json({
      data: {
        id: profile.id,
        userId: profile.userId,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
        bio: profile.bio,
        channelId: profile.channel?.id,
        channelHandle: profile.channel?.handle,
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}