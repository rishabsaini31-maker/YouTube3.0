import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    const { id: roomId } = req.params

    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const skip = (page - 1) * pageSize

    const room = await db.watchPartyRoom.findUnique({
      where: { roomId },
    })
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
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

    return res.status(500).json({
      data: formattedMessages,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Get watch party messages error:', error)
    return res.json({ error: 'Failed to fetch messages' })
  }
}

export const POST = async (req: Request, res: Response) => {
  try {
    const { id: roomId } = req.params

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

    const participant = await db.watchPartyParticipant.findUnique({
      where: {
        roomId_profileId: {
          roomId: room.id,
          profileId: profile.id,
        },
      },
    })
    if (!participant) {
      return res.status(403).json({ error: 'You must be a participant to send messages' })
    }

    const body = req.body
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' })
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

    return res.status(500).json({
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
    return res.json({ error: 'Failed to send message' })
  }
}