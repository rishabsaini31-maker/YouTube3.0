import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const body = await request.json()
    const { profileId } = body

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    const room = await db.watchPartyRoom.findUnique({
      where: { roomId },
    })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'active') {
      return NextResponse.json({ error: 'This watch party has ended' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({
      where: { id: profileId },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
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

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Failed to join watch party' }, { status: 500 })
  }
}