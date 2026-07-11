import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/downloads — download history + limit info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get the user's plan
    const plan = await db.plan.findUnique({
      where: { name: profile.planId },
    })

    const downloadLimit = plan?.downloadLimit ?? 1
    const downloadWindow = plan?.downloadWindow ?? 'day'
    const isUnlimited = downloadLimit === -1

    // Calculate window start
    const now = new Date()
    let windowStart: Date
    if (downloadWindow === 'week') {
      windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (downloadWindow === 'month') {
      windowStart = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }

    // Count downloads in current window
    const downloadsInWindow = await db.download.count({
      where: {
        profileId: profile.id,
        downloadedAt: { gte: windowStart },
        status: 'completed',
      },
    })

    const remainingDownloads = isUnlimited
      ? -1
      : Math.max(0, downloadLimit - downloadsInWindow)

    // Get plan info
    const planInfo = plan
      ? {
          name: plan.name,
          displayName: plan.displayName,
          downloadLimit: plan.downloadLimit,
          downloadWindow: plan.downloadWindow,
          price: plan.price,
          features: JSON.parse(plan.features || '[]'),
        }
      : {
          name: 'free',
          displayName: 'Free',
          downloadLimit: 1,
          downloadWindow: 'day',
          price: 0,
          features: [],
        }

    // Fetch download history with pagination
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const skip = (page - 1) * pageSize

    const [downloads, total] = await Promise.all([
      db.download.findMany({
        where: { profileId: profile.id },
        orderBy: { downloadedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          videoId: true,
          videoTitle: true,
          channelName: true,
          thumbnailUrl: true,
          videoUrl: true,
          fileSize: true,
          quality: true,
          status: true,
          downloadedAt: true,
        },
      }),
      db.download.count({
        where: { profileId: profile.id },
      }),
    ])

    const formattedDownloads = downloads.map((d) => ({
      id: d.id,
      videoId: d.videoId,
      videoTitle: d.videoTitle,
      channelName: d.channelName,
      thumbnailUrl: d.thumbnailUrl,
      videoUrl: d.videoUrl,
      fileSize: d.fileSize,
      quality: d.quality,
      status: d.status,
      downloadedAt: d.downloadedAt.toISOString(),
    }))

    return NextResponse.json({
      data: formattedDownloads,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
      limits: {
        plan: planInfo,
        downloadsUsed: downloadsInWindow,
        downloadsRemaining: remainingDownloads,
        isUnlimited,
        windowStart: windowStart.toISOString(),
        windowEnd: downloadWindow === 'day'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
          : downloadWindow === 'week'
            ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
        windowResetLabel: downloadWindow === 'day'
          ? 'resets tomorrow'
          : downloadWindow === 'week'
            ? `resets in ${7 - now.getDay()} days`
            : `resets on ${new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
      },
    })
  } catch (error) {
    console.error('Downloads GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch downloads' }, { status: 500 })
  }
}

// POST /api/downloads — initiate a download
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { videoId, quality } = body

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    // Fetch video with channel info
    const video = await db.video.findUnique({
      where: { id: videoId },
      include: { channel: true },
    })

    if (!video || !video.isPublic) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Check download limit
    const plan = await db.plan.findUnique({
      where: { name: profile.planId },
    })

    const downloadLimit = plan?.downloadLimit ?? 1
    const downloadWindow = plan?.downloadWindow ?? 'day'
    const isUnlimited = downloadLimit === -1

    if (!isUnlimited) {
      const now = new Date()
      let windowStart: Date
      if (downloadWindow === 'week') {
        windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (downloadWindow === 'month') {
        windowStart = new Date(now.getFullYear(), now.getMonth(), 1)
      } else {
        windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      }

      const downloadsInWindow = await db.download.count({
        where: {
          profileId: profile.id,
          downloadedAt: { gte: windowStart },
          status: 'completed',
        },
      })

      if (downloadsInWindow >= downloadLimit) {
        return NextResponse.json({
          error: 'Download limit reached',
          code: 'LIMIT_REACHED',
          limits: {
            plan: plan?.displayName ?? 'Free',
            downloadLimit,
            downloadWindow,
            downloadsUsed: downloadsInWindow,
            downloadsRemaining: 0,
            isUnlimited: false,
          },
        }, { status: 429 })
      }
    }

    // Create download record
    const download = await db.download.create({
      data: {
        profileId: profile.id,
        videoId: video.id,
        videoTitle: video.title,
        channelName: video.channel?.name ?? null,
        thumbnailUrl: video.thumbnailUrl,
        videoUrl: video.videoUrl,
        quality: quality || 'original',
        status: 'completed',
      },
    })

    return NextResponse.json({
      data: {
        id: download.id,
        videoUrl: video.videoUrl,
        videoTitle: video.title,
        quality: quality || 'original',
        status: 'completed',
      },
    })
  } catch (error) {
    console.error('Download POST error:', error)
    return NextResponse.json({ error: 'Failed to create download' }, { status: 500 })
  }
}

// DELETE /api/downloads — delete a download record from history
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { downloadId } = body

    if (!downloadId) {
      return NextResponse.json({ error: 'downloadId is required' }, { status: 400 })
    }

    const download = await db.download.findUnique({
      where: { id: downloadId },
    })

    if (!download || download.profileId !== profile.id) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 })
    }

    await db.download.delete({ where: { id: downloadId } })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Download DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete download' }, { status: 500 })
  }
}