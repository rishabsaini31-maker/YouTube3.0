import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    
    const playlist = await db.playlist.findUnique({
      where: { id: req.params.id },
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
      return res.status(404).json({ error: 'Playlist not found' })
    }

    // Check privacy
    if (playlist.isPrivate) {
      if (!session?.user?.id || playlist.profile.userId !== session.user.id) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    return res.status(500).json({ data: playlist })
  } catch (error) {
    console.error('Playlist GET error:', error)
    return res.json({ error: 'Failed to fetch playlist' })
  }
}

export const DELETE = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! }
    })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const playlist = await db.playlist.findUnique({
      where: { id: req.params.id }
    })

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    if (playlist.profileId !== profile.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    await db.playlist.delete({
      where: { id: req.params.id }
    })

    return res.status(500).json({ success: true })
  } catch (error) {
    console.error('Playlist DELETE error:', error)
    return res.json({ error: 'Failed to delete playlist' })
  }
}
