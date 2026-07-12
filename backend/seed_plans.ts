import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      downloadLimit: 1,
      downloadWindow: 'day',
      price: 0,
      features: JSON.stringify(['1 download per day', 'HD Streaming']),
    },
    {
      name: 'bronze',
      displayName: 'Bronze',
      downloadLimit: 5,
      downloadWindow: 'week',
      price: 99,
      features: JSON.stringify(['5 downloads per week', 'HD Streaming', 'Ad-Free Experience']),
    },
    {
      name: 'silver',
      displayName: 'Silver',
      downloadLimit: 20,
      downloadWindow: 'month',
      price: 199,
      features: JSON.stringify(['20 downloads per month', 'HD Streaming', 'Ad-Free Experience', 'Premium Content Access']),
    },
    {
      name: 'gold',
      displayName: 'Gold',
      downloadLimit: -1,
      downloadWindow: 'month',
      price: 299,
      features: JSON.stringify(['Unlimited downloads', 'HD Streaming', 'Ad-Free Experience', 'Premium Content Access', 'Early Access to Videos', 'Priority Support']),
    },
  ]

  console.log('Seeding plans...')
  
  for (const plan of plans) {
    await db.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    })
    console.log(`Upserted plan: ${plan.name}`)
  }
  
  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
