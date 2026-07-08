import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (query.length < 2) {
      return NextResponse.json({ data: [] })
    }

    const videos = await db.video.findMany({
      where: {
        isPublic: true,
        OR: [
          { title: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      take: 5,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
      },
      orderBy: { viewCount: 'desc' },
    })

    const channels = await db.channel.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { handle: { contains: query } },
        ],
      },
      take: 3,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
      orderBy: { subscriberCount: 'desc' },
    })

    const suggestions = [
      ...videos.map((v) => ({
        id: v.id,
        type: 'video' as const,
        title: v.title,
        thumbnail: v.thumbnailUrl,
      })),
      ...channels.map((c) => ({
        id: c.id,
        type: 'channel' as const,
        title: c.name,
        avatar: c.avatarUrl,
      })),
    ].slice(0, 8)

    return NextResponse.json({ data: suggestions })
  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}