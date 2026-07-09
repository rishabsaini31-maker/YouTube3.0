import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))
    const skip = (page - 1) * pageSize

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: { videoId, parentId: null },
        include: {
          profile: { select: { id: true, name: true, username: true, avatarUrl: true } },
          replies: {
            include: {
              profile: { select: { id: true, name: true, username: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.comment.count({ where: { videoId, parentId: null } }),
    ])

    const formatted = comments.map((c) => ({
      id: c.id,
      videoId: c.videoId,
      profileId: c.profileId,
      parentId: c.parentId,
      content: c.content,
      likeCount: c.likeCount,
      isEdited: c.isEdited,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      profile: c.profile,
      replies: c.replies.map((r) => ({
        id: r.id,
        videoId: r.videoId,
        profileId: r.profileId,
        parentId: r.parentId,
        content: r.content,
        likeCount: r.likeCount,
        isEdited: r.isEdited,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        profile: r.profile,
      })),
    }))

    return NextResponse.json({ data: formatted, total, page, pageSize, hasMore: skip + pageSize < total })
  } catch (error) {
    console.error('Comments list error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, content, parentId } = body

    if (!videoId || !content?.trim()) {
      return NextResponse.json({ error: 'videoId and content are required' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const comment = await db.comment.create({
      data: {
        videoId,
        profileId: profile.id,
        parentId: parentId || null,
        content: content.trim(),
      },
    })

    await db.video.update({
      where: { id: videoId },
      data: { commentCount: { increment: 1 } },
    })

    return NextResponse.json(
      {
        data: {
          id: comment.id,
          videoId: comment.videoId,
          profileId: comment.profileId,
          parentId: comment.parentId,
          content: comment.content,
          likeCount: 0,
          isEdited: false,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          profile: { id: profile.id, name: profile.name, username: profile.username, avatarUrl: profile.avatarUrl },
          replies: [],
        },
        message: 'Comment added',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Comment create error:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}