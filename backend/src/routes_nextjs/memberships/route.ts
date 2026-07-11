import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/memberships — current membership + payment history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      include: { plan: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
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
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
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

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Failed to fetch membership' }, { status: 500 })
  }
}

// POST /api/memberships/checkout — create a checkout order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    // Validate plan exists and is not free
    const plan = await db.plan.findUnique({
      where: { name: planId },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (plan.name === 'free') {
      return NextResponse.json({ error: 'Cannot subscribe to free plan via checkout' }, { status: 400 })
    }

    if (plan.price <= 0) {
      return NextResponse.json({ error: 'Invalid plan price' }, { status: 400 })
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
      return NextResponse.json({ error: 'You already have an active subscription to this plan' }, { status: 409 })
    }

    // Create Razorpay order (or simulate in test mode)
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
    const isTestMode = !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET

    let orderId: string
    let amount = Math.round(plan.price * 100) // Razorpay expects paise

    if (isTestMode) {
      // Simulated mode — generate a test order ID
      // In production with RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET set,
      // integrate Razorpay SDK here to create a real order
      orderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    } else {
      // Real Razorpay integration
      // Install: npm install razorpay
      // const Razorpay = require('razorpay')
      // const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
      // const order = await razorpay.orders.create({ amount, currency: 'INR', receipt: `...`, notes: { profileId, planId, planName } })
      // orderId = order.id
      return NextResponse.json({ error: 'Razorpay package not installed. Run: npm install razorpay' }, { status: 500 })
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

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}