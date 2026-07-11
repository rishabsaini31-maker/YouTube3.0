import { Request, Response } from 'express';
import { db } from '@/lib/db'

// GET /api/plans — list all available plans
export async function GET(_req: Request, res: Response) {
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

    return res.status(200).json({ data: formattedPlans })
  } catch (error) {
    console.error('Plans GET error:', error)
    return res.json({ error: 'Failed to fetch plans' })
  }
}