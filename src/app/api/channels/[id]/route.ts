import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Check subscription status if user is authenticated
    let isSubscribed = false
    const session = await getServerSession(authOptions)
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

    return NextResponse.json({ data: channelData })
  } catch (error) {
    console.error('Channel fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch channel' }, { status: 500 })
  }
}