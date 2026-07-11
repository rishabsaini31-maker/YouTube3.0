import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/plans — list all available plans
export async function GET() {
  try {
    const plans = await db.plan.findMany({
      orderBy: { price: 'asc' },
    })

    const formattedPlans = plans.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      downloadLimit: p.downloadLimit,
      downloadWindow: p.downloadWindow,
      price: p.price,
      features: JSON.parse(p.features || '[]'),
    }))

    return NextResponse.json({ data: formattedPlans })
  } catch (error) {
    console.error('Plans GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}