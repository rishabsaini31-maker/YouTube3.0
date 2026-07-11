import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })
    
    if (!profile) {
       return res.status(404).json({ error: 'Profile not found' })
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

    return res.status(500).json({ data: playlists })
  } catch (error) {
    console.error('Playlists GET error:', error)
    return res.json({ error: 'Failed to fetch playlists' })
  }
}

export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })

    if (!profile) {
       return res.status(404).json({ error: 'Profile not found' })
    }

    const body = req.body
    const { name, description, isPrivate } = body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const playlist = await db.playlist.create({
      data: {
        profileId: profile.id,
        name,
        description: description || null,
        isPrivate: isPrivate ?? false,
      },
    })

    return res.status(500).json({ data: playlist })
  } catch (error) {
    console.error('Playlist POST error:', error)
    return res.json({ error: 'Failed to create playlist' })
  }
}
