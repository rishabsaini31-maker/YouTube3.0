import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/memberships — current membership + payment history
export const GET = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      include: { plan: true },
    })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    // Get current active membership
    const activeMembership = await db.membership.findFirst({
      where: {
        profileId: profile.id,
        status: 'active',
      },
      orderBy: { startedAt: 'desc' },
    })

    // If membership expired, update it
    if (activeMembership && activeMembership.expiresAt && activeMembership.expiresAt < new Date()) {
      await db.membership.update({
        where: { id: activeMembership.id },
        data: { status: 'expired' },
      })
      // Downgrade plan to free
      await db.profile.update({
        where: { id: profile.id },
        data: { planId: 'free' },
      })
    }

    // Payment history with pagination
    
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const skip = (page - 1) * pageSize

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where: { profileId: profile.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.payment.count({
        where: { profileId: profile.id },
      }),
    ])

    // Refresh profile after potential expiry update
    const freshProfile = await db.profile.findUnique({
      where: { id: profile.id },
      include: { plan: true },
    })

    const planInfo = freshProfile?.plan
      ? {
          name: freshProfile.plan.name,
          displayName: freshProfile.plan.displayName,
          downloadLimit: freshProfile.plan.downloadLimit,
          downloadWindow: freshProfile.plan.downloadWindow,
          price: freshProfile.plan.price,
          features: JSON.parse(freshProfile.plan.features || '[]'),
        }
      : { name: 'free', displayName: 'Free', downloadLimit: 1, downloadWindow: 'day', price: 0, features: [] }

    return res.status(200).json({
      data: {
        currentPlan: planInfo,
        membership: activeMembership
          ? {
              id: activeMembership.id,
              planId: activeMembership.planId,
              status: activeMembership.expiresAt && activeMembership.expiresAt < new Date() ? 'expired' : activeMembership.status,
              startedAt: activeMembership.startedAt.toISOString(),
              expiresAt: activeMembership.expiresAt?.toISOString() ?? null,
            }
          : null,
        payments: payments.map((p) => ({
          id: p.id,
          planId: p.planId,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          paidAt: p.paidAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        })),
        paymentsTotal: total,
        paymentsPage: page,
        paymentsPageSize: pageSize,
        paymentsHasMore: skip + pageSize < total,
      },
    })
  } catch (error) {
    console.error('Memberships GET error:', error)
    return res.json({ error: 'Failed to fetch membership' })
  }
}

// POST /api/memberships/checkout — create a checkout order
export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const body = req.body
    const { planId } = body

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' })
    }

    // Validate plan exists and is not free
    const plan = await db.plan.findUnique({
      where: { name: planId },
    })

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    if (plan.name === 'free') {
      return res.status(400).json({ error: 'Cannot subscribe to free plan via checkout' })
    }

    if (plan.price <= 0) {
      return res.status(400).json({ error: 'Invalid plan price' })
    }

    // Check if user already has an active membership for this plan
    const existingMembership = await db.membership.findFirst({
      where: {
        profileId: profile.id,
        planId: plan.name,
        status: 'active',
      },
    })
    if (existingMembership) {
      return res.status(409).json({ error: 'You already have an active subscription to this plan' })
    }

    // Create Razorpay order (or simulate in test mode)
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
    const isTestMode = !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET

    let orderId: string
    let amount = Math.round(plan.price * 100) // Razorpay expects paise

    if (isTestMode) {
      // Simulated mode — generate a test order ID
      orderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    } else {
      // Real Razorpay integration
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
      const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: { profileId: profile.id, planId: plan.name }
      });
      orderId = order.id;
    }

    // Create a pending payment record
    await db.payment.create({
      data: {
        profileId: profile.id,
        planId: plan.name,
        amount: plan.price,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: orderId,
      },
    })

    return res.status(200).json({
      data: {
        orderId,
        amount,
        currency: 'INR',
        planId: plan.name,
        planDisplayName: plan.displayName,
        keyId: RAZORPAY_KEY_ID || 'test_key_id',
        isTestMode,
        profileName: profile.name,
        profileEmail: profile.email,
      },
    })
  } catch (error) {
    console.error('Checkout POST error:', error)
    return res.json({ error: 'Failed to create checkout' })
  }
}