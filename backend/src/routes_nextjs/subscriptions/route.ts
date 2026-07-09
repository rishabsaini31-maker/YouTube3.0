import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { channelId } = body

    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const channel = await db.channel.findUnique({ where: { id: channelId } })
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (channel.profileId === profile.id) {
      return NextResponse.json({ error: 'Cannot subscribe to your own channel' }, { status: 400 })
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
      return NextResponse.json({ data: { subscribed: false, subscriberCount: channel.subscriberCount - 1 } })
    } else {
      await db.subscription.create({
        data: { subscriberId: profile.id, targetId: channelId },
      })
      await db.channel.update({
        where: { id: channelId },
        data: { subscriberCount: { increment: 1 } },
      })
      return NextResponse.json({ data: { subscribed: true, subscriberCount: channel.subscriberCount + 1 } })
    }
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ data: { subscribed: false } })
    }

    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return NextResponse.json({ data: { subscribed: false } })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ data: { subscribed: false } })
    }

    const sub = await db.subscription.findUnique({
      where: { subscriberId_targetId: { subscriberId: profile.id, targetId: channelId } },
    })

    return NextResponse.json({ data: { subscribed: !!sub } })
  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 })
  }
}