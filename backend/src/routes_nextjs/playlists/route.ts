import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })
    
    if (!profile) {
       return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const playlists = await db.playlist.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
         _count: {
            select: { videos: true }
         },
         videos: {
            take: 1,
            orderBy: { addedAt: 'desc' },
            include: { video: true }
         }
      }
    })

    return NextResponse.json({ data: playlists })
  } catch (error) {
    console.error('Playlists GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })

    if (!profile) {
       return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, isPrivate } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const playlist = await db.playlist.create({
      data: {
        profileId: profile.id,
        name,
        description: description || null,
        isPrivate: isPrivate ?? false,
      },
    })

    return NextResponse.json({ data: playlist })
  } catch (error) {
    console.error('Playlist POST error:', error)
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
  }
}
