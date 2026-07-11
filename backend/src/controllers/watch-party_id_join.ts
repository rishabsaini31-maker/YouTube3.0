import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const POST = async (req: Request, res: Response) => {
  try {
    const { id: roomId } = req.params

    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const body = req.body
    const { profileId } = body

    if (!profileId) {
      return res.status(400).json({ error: 'profileId is required' })
    }

    const room = await db.watchPartyRoom.findUnique({
      where: { roomId },
    })
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    if (room.status !== 'active') {
      return res.status(400).json({ error: 'This watch party has ended' })
    }

    const profile = await db.profile.findUnique({
      where: { id: profileId },
    })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const existingParticipant = await db.watchPartyParticipant.findUnique({
      where: {
        roomId_profileId: {
          roomId: room.id,
          profileId,
        },
      },
    })

    if (existingParticipant) {
      await db.watchPartyParticipant.update({
        where: { id: existingParticipant.id },
        data: {
          isOnline: true,
          lastSeenAt: new Date(),
        },
      })
    } else {
      await db.watchPartyParticipant.create({
        data: {
          roomId: room.id,
          profileId,
          role: 'member',
          isOnline: true,
        },
      })
    }

    const participants = await db.watchPartyParticipant.findMany({
      where: { roomId: room.id },
      include: {
        profile: {
          select: { name: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return res.status(200).json({
      data: participants.map((p) => ({
        id: p.id,
        profileId: p.profileId,
        role: p.role,
        isOnline: p.isOnline,
        profile: p.profile,
        joinedAt: p.joinedAt.toISOString(),
        lastSeenAt: p.lastSeenAt.toISOString(),
      })),
      message: existingParticipant ? 'Welcome back!' : 'Joined watch party successfully',
    })
  } catch (error) {
    console.error('Join watch party error:', error)
    return res.json({ error: 'Failed to join watch party' })
  }
}