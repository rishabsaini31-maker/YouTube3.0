import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const POST = async (req: Request, res: Response) => {
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

    const body = req.body
    const { videoId } = body

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' })
    }

    // Check if video exists
    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) {
       return res.status(404).json({ error: 'Video not found' })
    }

    // Add video to playlist
    try {
      await db.playlistVideo.create({
        data: {
          playlistId: req.params.id,
          videoId,
        }
      })
    } catch (e: any) {
      // Ignore unique constraint violation (already in playlist)
      if (e.code !== 'P2002') throw e
    }

    return res.status(500).json({ success: true })
  } catch (error) {
    console.error('Playlist add video error:', error)
    return res.json({ error: 'Failed to add video to playlist' })
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

    
    const videoId = (req.query.videoId as string)

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' })
    }

    await db.playlistVideo.delete({
      where: {
        playlistId_videoId: {
          playlistId: req.params.id,
          videoId,
        }
      }
    }).catch(() => {}) // Ignore if not found

    return res.status(500).json({ success: true })
  } catch (error) {
    console.error('Playlist remove video error:', error)
    return res.json({ error: 'Failed to remove video from playlist' })
  }
}
