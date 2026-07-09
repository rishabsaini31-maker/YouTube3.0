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

    const history = await db.watchHistory.findMany({
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
      orderBy: { watchedAt: 'desc' },
      take: 100,
    })

    const data = history.map((h) => ({
      id: h.id,
      videoId: h.videoId,
      watchedAt: h.watchedAt.toISOString(),
      video: {
        id: h.video.id,
        channelId: h.video.channelId,
        title: h.video.title,
        description: h.video.description,
        thumbnailUrl: h.video.thumbnailUrl,
        videoUrl: h.video.videoUrl,
        duration: h.video.duration,
        category: h.video.category,
        tags: JSON.parse(h.video.tags || '[]'),
        viewCount: h.video.viewCount,
        likeCount: h.video.likeCount,
        dislikeCount: h.video.dislikeCount,
        commentCount: h.video.commentCount,
        isPublic: h.video.isPublic,
        createdAt: h.video.createdAt.toISOString(),
        updatedAt: h.video.updatedAt.toISOString(),
        channel: h.video.channel ? {
          id: h.video.channel.id,
          profileId: h.video.channel.profileId,
          name: h.video.channel.name,
          handle: h.video.channel.handle,
          description: h.video.channel.description,
          avatarUrl: h.video.channel.avatarUrl || h.video.channel.profile?.avatarUrl || null,
          bannerUrl: h.video.channel.bannerUrl || null,
          subscriberCount: h.video.channel.subscriberCount,
          videoCount: h.video.channel.videoCount,
          createdAt: h.video.channel.createdAt.toISOString(),
          updatedAt: h.video.channel.updatedAt.toISOString(),
        } : null,
      },
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('History list error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
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

    await db.watchHistory.upsert({
      where: {
        profileId_videoId: { profileId: profile.id, videoId },
      },
      create: { profileId: profile.id, videoId },
      update: { watchedAt: new Date() },
    })

    return NextResponse.json({ message: 'History recorded' })
  } catch (error) {
    console.error('History record error:', error)
    return NextResponse.json({ error: 'Failed to record history' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    await db.watchHistory.deleteMany({ where: { profileId: profile.id } })

    return NextResponse.json({ message: 'History cleared' })
  } catch (error) {
    console.error('History clear error:', error)
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 })
  }
}