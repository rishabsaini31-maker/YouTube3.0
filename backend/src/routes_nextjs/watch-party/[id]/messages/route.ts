import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const skip = (page - 1) * pageSize

    const room = await db.watchPartyRoom.findUnique({
      where: { roomId },
    })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const where = { roomId: room.id }

    const [messages, total] = await Promise.all([
      db.watchPartyMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
        include: {
          profile: {
            select: { username: true, avatarUrl: true },
          },
        },
      }),
      db.watchPartyMessage.count({ where }),
    ])

    const formattedMessages = messages.map((m) => ({
      id: m.id,
      roomId: m.roomId,
      profileId: m.profileId,
      content: m.content,
      type: m.type,
      profile: m.profile,
      createdAt: m.createdAt.toISOString(),
    }))

    return NextResponse.json({
      data: formattedMessages,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Get watch party messages error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
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

    const participant = await db.watchPartyParticipant.findUnique({
      where: {
        roomId_profileId: {
          roomId: room.id,
          profileId: profile.id,
        },
      },
    })
    if (!participant) {
      return NextResponse.json(
        { error: 'You must be a participant to send messages' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const message = await db.watchPartyMessage.create({
      data: {
        roomId: room.id,
        profileId: profile.id,
        content: content.trim(),
        type: 'text',
      },
      include: {
        profile: {
          select: { username: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({
      data: {
        id: message.id,
        content: message.content,
        type: message.type,
        profile: message.profile,
        createdAt: message.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Create watch party message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}