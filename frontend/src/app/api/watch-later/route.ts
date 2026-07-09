import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const watchLater = await db.watchLater.findMany({
      where: { profileId: profile.id },
      include: {
        video: {
          include: {
            channel: {
              include: { profile: { select: { avatarUrl: true, name: true, username: true } } },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    })

    const data = watchLater.map((wl) => ({
      id: wl.id,
      videoId: wl.videoId,
      addedAt: wl.addedAt.toISOString(),
      video: {
        id: wl.video.id,
        channelId: wl.video.channelId,
        title: wl.video.title,
        description: wl.video.description,
        thumbnailUrl: wl.video.thumbnailUrl,
        videoUrl: wl.video.videoUrl,
        duration: wl.video.duration,
        category: wl.video.category,
        tags: JSON.parse(wl.video.tags || '[]'),
        viewCount: wl.video.viewCount,
        likeCount: wl.video.likeCount,
        dislikeCount: wl.video.dislikeCount,
        commentCount: wl.video.commentCount,
        isPublic: wl.video.isPublic,
        createdAt: wl.video.createdAt.toISOString(),
        updatedAt: wl.video.updatedAt.toISOString(),
        channel: wl.video.channel ? {
          id: wl.video.channel.id,
          profileId: wl.video.channel.profileId,
          name: wl.video.channel.name,
          handle: wl.video.channel.handle,
          description: wl.video.channel.description,
          avatarUrl: wl.video.channel.avatarUrl || wl.video.channel.profile?.avatarUrl || null,
          bannerUrl: wl.video.channel.bannerUrl || null,
          subscriberCount: wl.video.channel.subscriberCount,
          videoCount: wl.video.channel.videoCount,
          createdAt: wl.video.channel.createdAt.toISOString(),
          updatedAt: wl.video.channel.updatedAt.toISOString(),
        } : null,
      },
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Watch later list error:', error)
    return NextResponse.json({ error: 'Failed to fetch watch later' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { videoId } = await request.json()
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const existing = await db.watchLater.findUnique({
      where: { profileId_videoId: { profileId: profile.id, videoId } },
    })

    if (existing) {
      return NextResponse.json({ message: 'Already in watch later' })
    }

    await db.watchLater.create({
      data: { profileId: profile.id, videoId },
    })

    return NextResponse.json({ message: 'Added to watch later' }, { status: 201 })
  } catch (error) {
    console.error('Watch later add error:', error)
    return NextResponse.json({ error: 'Failed to add to watch later' }, { status: 500 })
  }
}