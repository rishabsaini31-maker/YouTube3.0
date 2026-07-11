import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const channel = await db.channel.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bannerUrl: true,
          },
        },
      },
    })

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    // Check subscription status if user is authenticated
    let isSubscribed = false
    const session = { user: (req as any).user };
    if (session?.user?.id) {
      const profile = await db.profile.findUnique({
        where: { userId: session.user.id },
      })
      if (profile) {
        const sub = await db.subscription.findUnique({
          where: { subscriberId_targetId: { subscriberId: profile.id, targetId: id } },
        })
        isSubscribed = !!sub
      }
    }

    const channelData = {
      id: channel.id,
      profileId: channel.profileId,
      name: channel.name,
      handle: channel.handle,
      description: channel.description,
      avatarUrl: channel.avatarUrl || channel.profile?.avatarUrl || null,
      bannerUrl: channel.bannerUrl || channel.profile?.bannerUrl || null,
      subscriberCount: channel.subscriberCount,
      videoCount: channel.videoCount,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
      profile: channel.profile,
      isSubscribed,
    }

    return res.status(500).json({ data: channelData })
  } catch (error) {
    console.error('Channel fetch error:', error)
    return res.json({ error: 'Failed to fetch channel' })
  }
}