import { Request, Response } from 'express';
import { db } from '@/lib/db'

export const GET = async (req: Request, res: Response) => {
  try {
    
    const query = (req.query.q as string) || ''
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10) || 20))
    const filter = (req.query.filter as string) || 'all' // all | videos | channels

    if (!query.trim()) {
      return res.status(500).json({ videos: [], channels: [], total: 0, page, pageSize, totalVideos: 0, totalChannels: 0 })
    }

    const q = query.trim()

    // Search videos: title match priority, then tags, then description
    // SQLite is case-insensitive by default for ASCII
    const titleVideos = await db.video.findMany({
      where: { isPublic: true, title: { contains: q } },
      include: { channel: true },
      orderBy: { viewCount: 'desc' },
    })

    const tagVideos = await db.video.findMany({
      where: {
        isPublic: true,
        tags: { contains: q },
        id: { notIn: titleVideos.map((v) => v.id) },
      },
      include: { channel: true },
      orderBy: { viewCount: 'desc' },
    })

    const descVideos = await db.video.findMany({
      where: {
        isPublic: true,
        description: { contains: q },
        id: { notIn: [...titleVideos, ...tagVideos].map((v) => v.id) },
      },
      include: { channel: true },
      orderBy: { viewCount: 'desc' },
    })

    const allVideos = [...titleVideos, ...tagVideos, ...descVideos]

    // Search channels by name and handle
    const channels = await db.channel.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { handle: { contains: q } },
        ],
      },
      include: { profile: true },
      orderBy: { subscriberCount: 'desc' },
    })

    const totalVideos = allVideos.length
    const totalChannels = channels.length

    if (filter === 'videos') {
      const paged = allVideos.slice((page - 1) * pageSize, page * pageSize)
      return res.json({
        videos: paged.map((v) => ({ ...v, tags: JSON.parse(v.tags || '[]') })),
        channels: [],
        total: totalVideos,
        page,
        pageSize,
        totalVideos,
        totalChannels,
      })
    }

    if (filter === 'channels') {
      const paged = channels.slice((page - 1) * pageSize, page * pageSize)
      return res.json({
        videos: [],
        channels: paged,
        total: totalChannels,
        page,
        pageSize,
        totalVideos,
        totalChannels,
      })
    }

    // "all" filter: interleave channels first, then videos
    const merged = [
      ...channels.map((c) => ({ type: 'channel' as const, data: c })),
      ...allVideos.map((v) => ({ type: 'video' as const, data: v })),
    ]

    const total = merged.length
    const paged = merged.slice((page - 1) * pageSize, page * pageSize)

    const videos = paged.filter((item) => item.type === 'video').map((item) => item.data)
    const pagedChannels = paged.filter((item) => item.type === 'channel').map((item) => item.data)

    return res.json({
      videos: videos.map((v) => ({ ...v, tags: JSON.parse(v.tags || '[]') })),
      channels: pagedChannels,
      total,
      page,
      pageSize,
      totalVideos,
      totalChannels,
    })
  } catch (error) {
    console.error('Search error:', error)
    return res.json({ error: 'Search failed' })
  }
}