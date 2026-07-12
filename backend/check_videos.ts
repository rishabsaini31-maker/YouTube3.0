import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const videos = await db.video.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, videoUrl: true, createdAt: true }
  })

  console.log('Latest 5 videos:')
  console.log(JSON.stringify(videos, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
