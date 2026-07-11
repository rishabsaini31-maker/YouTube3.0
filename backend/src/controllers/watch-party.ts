import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const status = (req.query.status as string) || 'active'
    const skip = (page - 1) * pageSize

    const where: Record<string, string> = { status }

    const [rooms, total] = await Promise.all([
      db.watchPartyRoom.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          host: {
            select: { name: true, username: true, avatarUrl: true },
          },
          video: {
            select: { title: true, thumbnailUrl: true, duration: true },
          },
          _count: {
            select: { participants: true },
          },
        },
      }),
      db.watchPartyRoom.count({ where }),
    ])

    const formattedRooms = rooms.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      title: r.title,
      status: r.status,
      participantCount: r._count.participants,
      host: r.host,
      video: r.video,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

    return res.status(200).json({
      data: formattedRooms,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Watch party list error:', error)
    return res.json({ error: 'Failed to fetch watch party rooms' })
  }
}

export const POST = async (req: Request, res: Response) => {
  try {
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

    const body = req.body
    const { videoId, title } = body

    if (!videoId || !title) {
      return res.status(400).json({ error: 'videoId and title are required' })
    }

    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { title: true, thumbnailUrl: true, duration: true },
    })
    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    const roomId = Math.random().toString(36).substring(2, 10).toUpperCase()

    const room = await db.watchPartyRoom.create({
      data: {
        roomId,
        hostId: profile.id,
        videoId,
        title,
        status: 'active',
        participants: {
          create: {
            profileId: profile.id,
            role: 'host',
            isOnline: true,
          },
        },
      },
      include: {
        host: {
          select: { name: true, username: true, avatarUrl: true },
        },
        video: {
          select: { title: true, thumbnailUrl: true, duration: true },
        },
        participants: {
          include: {
            profile: {
              select: { name: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    })

    return res.status(200).json({
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
      message: 'Watch party room created successfully',
    })
  } catch (error) {
    console.error('Create watch party error:', error)
    return res.json({ error: 'Failed to create watch party room' })
  }
}