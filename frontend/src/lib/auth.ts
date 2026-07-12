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
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const profile = await db.profile.findUnique({
            where: { email: credentials.email.toLowerCase() },
          })

          if (!profile) {
            return null
          }

          const isValid = await verifyPassword(credentials.password, profile.id)

          if (!isValid) {
            return null
          }

          return {
            id: profile.userId,
            email: profile.email,
            name: profile.name,
          }
        } catch (error) {
          console.error('Auth authorize error:', error)
          throw new Error((error as Error)?.message || 'Authentication service unavailable')
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
    async signIn({ user, account, profile, email, credentials }) {
      if (!user) {
        console.log('Sign in failed: no user returned from authorize')
        return false
      }
      console.log('Sign in successful for:', user.email)
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        try {
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
        } catch (error) {
          console.error('JWT callback error:', error)
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
  events: {
    async signOut() {
      try {
        const session = await getServerSession(authOptions)
        if (session?.user?.email) {
          const profile = await db.profile.findUnique({
            where: { email: session.user.email },
          })
          if (profile) {
            await db.profile.update({
              where: { id: profile.id },
              data: { passwordHash: null },
            })
          }
        }
      } catch (error) {
        console.error('Signout cleanup error:', error)
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'viewtube-dev-secret-change-in-production',
}

async function verifyPassword(password: string, profileId: string): Promise<boolean> {
  try {
    const crypto = await import('crypto')
    const profile = await db.profile.findUnique({
      where: { id: profileId },
      select: { id: true, passwordHash: true },
    })
    if (!profile?.passwordHash) return false

    const salt = profile.passwordHash.split(':')[0]
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex')
    return hash === profile.passwordHash.split(':')[1]
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

async function getPasswordHash(profileId: string): Promise<string | null> {
  try {
    const profile = await db.profile.findUnique({
      where: { id: profileId },
      select: { passwordHash: true },
    })
    return profile?.passwordHash || null
  } catch (error) {
    console.error('Get password hash error:', error)
    return null
  }
}

export async function hashPassword(password: string, profileId: string): Promise<string> {
  const crypto = await import('crypto')
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex')
  const storedHash = `${salt}:${hash}`

  await db.profile.update({
    where: { id: profileId },
    data: { passwordHash: storedHash },
  })

  return storedHash
}
