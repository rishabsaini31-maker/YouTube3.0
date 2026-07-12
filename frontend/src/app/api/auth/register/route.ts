import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, username } = body

    if (!email || !password || !name || !username) {
      return NextResponse.json(
        { error: 'Email, password, name, and username are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters (letters, numbers, _-)' },
        { status: 400 }
      )
    }

    const existingEmail = await db.profile.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const existingUsername = await db.profile.findUnique({ where: { username } })
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    const crypto = await import('crypto')
    const userId = crypto.randomUUID()

    const profile = await db.profile.create({
      data: {
        userId,
        name,
        username,
        email: email.toLowerCase(),
      },
    })

    const handle = username.toLowerCase()

    await db.channel.create({
      data: {
        profileId: profile.id,
        name,
        handle,
      },
    })

    return NextResponse.json(
      {
        data: {
          id: profile.id,
          userId: profile.userId,
          name: profile.name,
          username: profile.username,
          email: profile.email,
        },
        message: 'Account created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}