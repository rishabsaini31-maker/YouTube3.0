import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const entry = await db.watchLater.findUnique({ where: { id } })
    if (!entry || entry.profileId !== profile.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.watchLater.delete({ where: { id } })

    return NextResponse.json({ message: 'Removed from watch later' })
  } catch (error) {
    console.error('Watch later remove error:', error)
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
  }
}