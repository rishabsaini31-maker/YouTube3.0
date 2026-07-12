import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, username: true },
    })

    if (!profile) {
      return NextResponse.json({ error: 'User not found', step: 'profile_lookup' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        username: profile.username,
      },
    })
  } catch (error) {
    console.error('Auth debug error:', error)
    return NextResponse.json({
      error: 'Authentication service error',
      message: (error as Error)?.message || 'Unknown error',
      step: 'database_or_server',
    }, { status: 500 })
  }
}
