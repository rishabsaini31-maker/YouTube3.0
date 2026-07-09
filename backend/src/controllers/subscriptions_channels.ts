import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '../lib/auth'
import { db } from '../lib/db'

export async function GET() {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const subscriptions = await db.subscription.findMany({
      where: { subscriberId: profile.id },
      include: {
        target: {
          include: {
            profile: { select: { avatarUrl: true, name: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const channels = subscriptions.map((sub) => {
      const ch = sub.target
      return {
        id: ch.id,
        profileId: ch.profileId,
        name: ch.name,
        handle: ch.handle,
        description: ch.description,
        avatarUrl: ch.avatarUrl || ch.profile?.avatarUrl || null,
        bannerUrl: ch.bannerUrl || ch.profile?.bannerUrl || null,
        subscriberCount: ch.subscriberCount,
        videoCount: ch.videoCount,
        createdAt: ch.createdAt.toISOString(),
        updatedAt: ch.updatedAt.toISOString(),
        subscribedAt: sub.createdAt.toISOString(),
      }
    })

    return res.status(500).json({ data: channels })
  } catch (error) {
    console.error('Subscribed channels error:', error)
    return res.json({ error: 'Failed to fetch subscribed channels' })
  }
}