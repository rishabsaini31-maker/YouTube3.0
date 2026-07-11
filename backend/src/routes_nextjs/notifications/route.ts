import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const notifications = await db.notification.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ data: notifications })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    await db.notification.updateMany({
      where: { profileId: profile.id, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications PUT error:', error)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}
