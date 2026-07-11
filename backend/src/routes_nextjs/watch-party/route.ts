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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const status = searchParams.get('status') || 'active'
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

    return NextResponse.json({
      data: formattedRooms,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Watch party list error:', error)
    return NextResponse.json({ error: 'Failed to fetch watch party rooms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { videoId, title } = body

    if (!videoId || !title) {
      return NextResponse.json({ error: 'videoId and title are required' }, { status: 400 })
    }

    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { title: true, thumbnailUrl: true, duration: true },
    })
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
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
      message: 'Watch party room created successfully',
    })
  } catch (error) {
    console.error('Create watch party error:', error)
    return NextResponse.json({ error: 'Failed to create watch party room' }, { status: 500 })
  }
}