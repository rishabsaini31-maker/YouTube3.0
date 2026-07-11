import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    const playlist = await db.playlist.findUnique({
      where: { id: params.id },
      include: {
        profile: true,
        videos: {
          orderBy: { addedAt: 'desc' },
          include: {
            video: {
              include: { channel: true }
            }
          }
        }
      }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Check privacy
    if (playlist.isPrivate) {
      if (!session?.user?.id || playlist.profile.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    return NextResponse.json({ data: playlist })
  } catch (error) {
    console.error('Playlist GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 })
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

    await db.playlist.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Playlist DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 })
  }
}
