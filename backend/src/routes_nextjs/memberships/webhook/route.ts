import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// POST /api/memberships/webhook — Razorpay webhook handler
// Also accepts simulated payments when RAZORPAY_KEY_SECRET is not set
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

    if (RAZORPAY_KEY_SECRET) {
      const signature = request.headers.get('x-razorpay-signature')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
      }

      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = body.event || 'payment.captured'
    const paymentEntity = body.payload?.payment?.entity || body.payment || body

    const razorpayOrderId = paymentEntity.order_id
    const razorpayPaymentId = paymentEntity.id
    const status = paymentEntity.status

    if (!razorpayOrderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    const payment = await db.payment.findFirst({
      where: { razorpayOrderId },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'completed') {
      return NextResponse.json({ data: { received: true, alreadyProcessed: true } })
    }

    if (status === 'captured' || event === 'payment.captured') {
      const plan = await db.plan.findUnique({
        where: { name: payment.planId },
      })

      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }

      // Cancel existing active memberships
      await db.membership.updateMany({
        where: {
          profileId: payment.profileId,
          status: 'active',
        },
        data: { status: 'cancelled', cancelledAt: new Date() },
      })

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      const membership = await db.membership.create({
        data: {
          profileId: payment.profileId,
          planId: plan.name,
          status: 'active',
          startedAt: new Date(),
          expiresAt,
        },
      })

      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          razorpayPaymentId,
          razorpaySignature: body.payload?.payment?.entity?.razorpay_signature || null,
          paidAt: new Date(),
          membershipId: membership.id,
        },
      })

      await db.profile.update({
        where: { id: payment.profileId },
        data: { planId: plan.name },
      })
    } else {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          razorpayPaymentId,
        },
      })
    }

    return NextResponse.json({ data: { received: true } })
  } catch (error) {
    console.error('Webhook POST error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}