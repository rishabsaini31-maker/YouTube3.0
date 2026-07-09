import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const body = req.body
    const { channelId } = body

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const channel = await db.channel.findUnique({ where: { id: channelId } })
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    if (channel.profileId === profile.id) {
      return res.status(400).json({ error: 'Cannot subscribe to your own channel' })
    }

    const existing = await db.subscription.findUnique({
      where: { subscriberId_targetId: { subscriberId: profile.id, targetId: channelId } },
    })

    if (existing) {
      await db.subscription.delete({ where: { id: existing.id } })
      await db.channel.update({
        where: { id: channelId },
        data: { subscriberCount: { decrement: 1 } },
      })
      return res.status(500).json({ data: { subscribed: false, subscriberCount: channel.subscriberCount - 1 } })
    } else {
      await db.subscription.create({
        data: { subscriberId: profile.id, targetId: channelId },
      })
      await db.channel.update({
        where: { id: channelId },
        data: { subscriberCount: { increment: 1 } },
      })
      return res.json({ data: { subscribed: true, subscriberCount: channel.subscriberCount + 1 } })
    }
  } catch (error) {
    console.error('Subscription error:', error)
    return res.json({ error: 'Failed to process subscription' })
  }
}

export const GET = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(500).json({ data: { subscribed: false } })
    }

    
    const channelId = (req.query.channelId as string)

    if (!channelId) {
      return res.json({ data: { subscribed: false } })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return res.json({ data: { subscribed: false } })
    }

    const sub = await db.subscription.findUnique({
      where: { subscriberId_targetId: { subscriberId: profile.id, targetId: channelId } },
    })

    return res.json({ data: { subscribed: !!sub } })
  } catch (error) {
    console.error('Subscription check error:', error)
    return res.json({ error: 'Failed to check subscription' })
  }
}