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
        }
      } catch (error) {
        console.error('Signout cleanup error:', error)
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'viewtube-dev-secret-change-in-production',
}

