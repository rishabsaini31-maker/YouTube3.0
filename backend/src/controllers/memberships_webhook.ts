import { Request, Response } from 'express';
import { db } from '@/lib/db'
import crypto from 'crypto'

// POST /api/memberships/webhook — Razorpay webhook handler
// Also accepts simulated payments when RAZORPAY_KEY_SECRET is not set
export const POST = async (req: Request, res: Response) => {
  try {
    const body = req.body

    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

    if (RAZORPAY_KEY_SECRET) {
      const signature = request.headers.get('x-razorpay-signature')
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' })
      }

      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }

    const event = body.event || 'payment.captured'
    const paymentEntity = body.payload?.payment?.entity || body.payment || body

    const razorpayOrderId = paymentEntity.order_id
    const razorpayPaymentId = paymentEntity.id
    const status = paymentEntity.status

    if (!razorpayOrderId) {
      return res.status(400).json({ error: 'Missing order_id' })
    }

    const payment = await db.payment.findFirst({
      where: { razorpayOrderId },
    })

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    if (payment.status === 'completed') {
      return res.status(404).json({ data: { received: true, alreadyProcessed: true } })
    }

    if (status === 'captured' || event === 'payment.captured') {
      const plan = await db.plan.findUnique({
        where: { name: payment.planId },
      })

      if (!plan) {
        return res.json({ error: 'Plan not found' })
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

    return res.status(500).json({ data: { received: true } })
  } catch (error) {
    console.error('Webhook POST error:', error)
    return res.json({ error: 'Webhook processing failed' })
  }
}