import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const comment = await db.comment.findUnique({ where: { id } })
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.profileId !== profile.id) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 })
    }

    const updated = await db.comment.update({
      where: { id },
      data: { content: content.trim(), isEdited: true },
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        content: updated.content,
        isEdited: updated.isEdited,
        updatedAt: updated.updatedAt.toISOString(),
      },
      message: 'Comment updated',
    })
  } catch (error) {
    console.error('Comment update error:', error)
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const profile = await db.profile.findUnique({ where: { userId: session.user.id! } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const comment = await db.comment.findUnique({
      where: { id },
      include: { replies: true },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.profileId !== profile.id) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 })
    }

    const replyCount = comment.replies.length + 1

    await db.comment.delete({ where: { id } })

    await db.video.update({
      where: { id: comment.videoId },
      data: { commentCount: { decrement: replyCount } },
    })

    return NextResponse.json({ message: 'Comment deleted' })
  } catch (error) {
    console.error('Comment delete error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}