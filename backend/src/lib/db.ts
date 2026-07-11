import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    __internal: {
      engine: {
        connectionTimeout: 30000,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export async function connectDb(retries = 5, delayMs = 2000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      await db.$connect()
      console.log('✅ Database connected successfully')
      return
    } catch (error) {
      console.error(`❌ Database connection failed (attempt ${i}/${retries}):`, error instanceof Error ? error.message : error)
      if (i === retries) {
        console.error('⚠️ Server will continue without database connection. Requests requiring DB may fail until connection is established.')
      }
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
}