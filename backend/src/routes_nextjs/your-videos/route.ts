import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { deleteFile } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
      include: { channel: true },
    })
    if (!profile?.channel) {
      return NextResponse.json({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const sortBy = searchParams.get('sortBy') || 'newest'
    const skip = (page - 1) * pageSize

    let orderBy: Record<string, string> = { createdAt: 'desc' }
    if (sortBy === 'popular') orderBy = { viewCount: 'desc' }
    else if (sortBy === 'oldest') orderBy = { createdAt: 'asc' }

    const where = { channelId: profile.channel.id }

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      db.video.count({ where }),
    ])

    const formattedVideos = videos.map((v) => ({
      id: v.id,
      channelId: v.channelId,
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      videoUrl: v.videoUrl,
      duration: v.duration,
      category: v.category,
      tags: JSON.parse(v.tags || '[]'),
      viewCount: v.viewCount,
      likeCount: v.likeCount,
      dislikeCount: v.dislikeCount,
      commentCount: v.commentCount,
      isPublic: v.isPublic,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      data: formattedVideos,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Your videos error:', error)
    return NextResponse.json({ error: 'Failed to fetch your videos' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
      include: { channel: true },
    })
    if (!profile?.channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const body = await request.json()
    const { videoId } = body

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const video = await db.video.findUnique({
      where: { id: videoId },
    })

    if (!video || video.channelId !== profile.channel.id) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      await tx.like.deleteMany({ where: { videoId } })
      await tx.comment.deleteMany({ where: { videoId } })
      await tx.watchHistory.deleteMany({ where: { videoId } })
      await tx.watchLater.deleteMany({ where: { videoId } })
      await tx.video.delete({ where: { id: videoId } })
      await tx.channel.update({
        where: { id: profile.channel.id },
        data: { videoCount: { decrement: 1 } },
      })
    })

    try {
      await deleteFile(video.thumbnailUrl)
      await deleteFile(video.videoUrl)
    } catch {
      // Ignore file deletion errors
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Delete video error:', error)
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
  }
}