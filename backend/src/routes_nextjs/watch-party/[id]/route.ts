import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const room = await db.watchPartyRoom.findUnique({
      where: { roomId },
      include: {
        host: {
          select: { name: true, username: true, avatarUrl: true },
        },
        video: {
          select: { title: true, thumbnailUrl: true, duration: true, videoUrl: true },
        },
        participants: {
          include: {
            profile: {
              select: { name: true, username: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        id: room.id,
        roomId: room.roomId,
        title: room.title,
        status: room.status,
        host: room.host,
        video: room.video,
        participants: room.participants.map((p) => ({
          id: p.id,
          profileId: p.profileId,
          role: p.role,
          isOnline: p.isOnline,
          profile: p.profile,
          joinedAt: p.joinedAt.toISOString(),
          lastSeenAt: p.lastSeenAt.toISOString(),
        })),
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Get watch party room error:', error)
    return NextResponse.json({ error: 'Failed to fetch watch party room' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params

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

    const room = await db.watchPartyRoom.findUnique({
      where: { roomId },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.hostId !== profile.id) {
      return NextResponse.json({ error: 'Only the host can end the watch party' }, { status: 403 })
    }

    await db.watchPartyRoom.update({
      where: { id: room.id },
      data: { status: 'ended' },
    })

    return NextResponse.json({
      data: { success: true },
      message: 'Watch party ended successfully',
    })
  } catch (error) {
    console.error('Delete watch party room error:', error)
    return NextResponse.json({ error: 'Failed to end watch party room' }, { status: 500 })
  }
}