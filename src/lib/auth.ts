import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const profile = await db.profile.findUnique({
          where: { email: credentials.email },
        })

        if (!profile) {
          throw new Error('No account found with this email')
        }

        const isValid = await verifyPassword(credentials.password, profile.id)

        if (!isValid) {
          throw new Error('Invalid password')
        }

        return {
          id: profile.userId,
          email: profile.email,
          name: profile.name,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const profile = await db.profile.findUnique({
          where: { userId: user.id! },
          include: { channel: true },
        })
        if (profile) {
          token.profileId = profile.id
          token.username = profile.username
          token.avatarUrl = profile.avatarUrl
          token.channelId = profile.channel?.id
          token.channelHandle = profile.channel?.handle
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub!
        session.user.image = (token.avatarUrl as string) || null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'viewtube-dev-secret-change-in-production',
}

async function verifyPassword(password: string, profileId: string): Promise<boolean> {
  const crypto = await import('crypto')
  const record = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  })
  if (!record) return false

  const storedHash = await getPasswordHash(profileId)
  if (!storedHash) return false

  const salt = storedHash.split(':')[0]
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex')
  return hash === storedHash.split(':')[1]
}

async function getPasswordHash(profileId: string): Promise<string | null> {
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  })
  if (!profile) return null
  const crypto = await import('crypto')
  const fs = await import('fs')
  const path = await import('path')
  const hashPath = path.join(process.cwd(), 'db', 'passwords', `${profileId}.hash`)
  try {
    return fs.readFileSync(hashPath, 'utf-8').trim()
  } catch {
    return null
  }
}

export async function hashPassword(password: string, profileId: string): Promise<string> {
  const crypto = await import('crypto')
  const fs = await import('fs')
  const path = await import('path')

  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex')
  const storedHash = `${salt}:${hash}`

  const hashDir = path.join(process.cwd(), 'db', 'passwords')
  if (!fs.existsSync(hashDir)) {
    fs.mkdirSync(hashDir, { recursive: true })
  }
  fs.writeFileSync(path.join(hashDir, `${profileId}.hash`), storedHash)

  return storedHash
}