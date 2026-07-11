import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const playlist = await db.playlist.findUnique({
      where: { id: params.id }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    if (playlist.profileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { videoId } = body

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Check if video exists
    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) {
       return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Add video to playlist
    try {
      await db.playlistVideo.create({
        data: {
          playlistId: params.id,
          videoId,
        }
      })
    } catch (e: any) {
      // Ignore unique constraint violation (already in playlist)
      if (e.code !== 'P2002') throw e
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Playlist add video error:', error)
    return NextResponse.json({ error: 'Failed to add video to playlist' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const playlist = await db.playlist.findUnique({
      where: { id: params.id }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    if (playlist.profileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    await db.playlistVideo.delete({
      where: {
        playlistId_videoId: {
          playlistId: params.id,
          videoId,
        }
      }
    }).catch(() => {}) // Ignore if not found

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Playlist remove video error:', error)
    return NextResponse.json({ error: 'Failed to remove video from playlist' }, { status: 500 })
  }
}
