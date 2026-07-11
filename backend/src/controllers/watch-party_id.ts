import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params

    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
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
      return res.status(404).json({ error: 'Room not found' })
    }

    return res.status(500).json({
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
    return res.json({ error: 'Failed to fetch watch party room' })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params

    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const room = await db.watchPartyRoom.findUnique({
      where: { roomId },
    })

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    if (room.hostId !== profile.id) {
      return res.status(403).json({ error: 'Only the host can end the watch party' })
    }

    await db.watchPartyRoom.update({
      where: { id: room.id },
      data: { status: 'ended' },
    })

    return res.status(500).json({
      data: { success: true },
      message: 'Watch party ended successfully',
    })
  } catch (error) {
    console.error('Delete watch party room error:', error)
    return res.json({ error: 'Failed to end watch party room' })
  }
}