import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id } = await params

    const loginSession = await db.loginSession.findUnique({
      where: { id },
    })

    if (!loginSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (loginSession.profileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.loginSession.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Session revoked' })
  } catch (error) {
    console.error('Revoke session error:', error)
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
  }
}