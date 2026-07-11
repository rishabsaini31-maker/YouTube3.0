import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const notification = await db.notification.findUnique({
      where: { id: params.id },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.profileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.notification.update({
      where: { id: params.id },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification read PUT error:', error)
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }
}
