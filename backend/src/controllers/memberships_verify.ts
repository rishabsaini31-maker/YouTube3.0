import { Request, Response } from 'express';
import { db } from '@/lib/db';
import crypto from 'crypto';

// POST /api/memberships/verify — Verify Razorpay client-side success callback
export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (RAZORPAY_KEY_SECRET) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const payment = await db.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.status(200).json({ data: { received: true, alreadyProcessed: true } });
    }

    const plan = await db.plan.findUnique({
      where: { name: payment.planId },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Cancel existing active memberships
    await db.membership.updateMany({
      where: {
        profileId: payment.profileId,
        status: 'active',
      },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const membership = await db.membership.create({
      data: {
        profileId: payment.profileId,
        planId: plan.name,
        status: 'active',
        startedAt: new Date(),
        expiresAt,
      },
    });

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
        membershipId: membership.id,
      },
    });

    await db.profile.update({
      where: { id: payment.profileId },
      data: { planId: plan.name },
    });

    return res.status(200).json({ data: { received: true } });
  } catch (error) {
    console.error('Verify POST error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
};
