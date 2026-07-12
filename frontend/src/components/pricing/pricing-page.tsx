'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouterStore } from '@/stores/router-store'
import { subscriptionService, type CheckoutData } from '@/services/subscription-plan-service'
import type { PlanInfo, MembershipData, PaymentEntry } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Check,
  Crown,
  Loader2,
  Zap,
  Sparkles,
  Shield,
  Receipt,
  ChevronDown,
  AlertTriangle,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

const planIcons: Record<string, React.ElementType> = {
  free: Shield,
  bronze: Zap,
  silver: Sparkles,
  gold: Crown,
}

const planColors: Record<string, string> = {
  free: 'border-border',
  bronze: 'border-amber-400/50',
  silver: 'border-slate-400/50',
  gold: 'border-amber-300/60 shadow-amber-100 dark:shadow-amber-900/20',
}

const planBadgeVariants: Record<string, 'outline' | 'secondary' | 'default'> = {
  free: 'outline',
  bronze: 'secondary',
  silver: 'secondary',
  gold: 'default',
}

export function PricingPage() {
  const { isAuthenticated, openLogin } = useAuthStore()
  const { navigate } = useRouterStore()
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [membership, setMembership] = useState<MembershipData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [showPayments, setShowPayments] = useState(false)
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const fetchPlans = useCallback(async () => {
    try {
      const res = await subscriptionService.getPlans()
      if (res.data) setPlans(res.data)
    } catch {
      toast.error('Failed to load plans')
    }
  }, [])

  const fetchMembership = useCallback(async () => {
    try {
      const res = await subscriptionService.getMembership()
      if (res.data) {
        setMembership(res.data)
        setPayments(res.data.payments)
      }
    } catch {
      // Ignore if not authenticated
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchPlans()
      if (isAuthenticated) await fetchMembership()
      setLoading(false)
    }
    load()
  }, [isAuthenticated, fetchPlans, fetchMembership])

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      openLogin()
      return
    }

    if (planId === 'free') {
      toast.info('You are already on the Free plan')
      return
    }

    setCheckoutLoading(planId)
    try {
      const res = await subscriptionService.createCheckout(planId)
      const checkout = res.data as CheckoutData

      if (checkout.isTestMode) {
        // Simulated payment — skip Razorpay, call webhook directly
        await subscriptionService.confirmSimulatedPayment(checkout.orderId)
        toast.success(`Subscribed to ${checkout.planDisplayName}!`, {
          description: 'Your plan has been upgraded.',
        })
        await fetchMembership()
        // Refresh auth store to pick up new plan
        const { fetchSession } = useAuthStore.getState()
        await fetchSession()
      } else {
        // Real Razorpay checkout
        await openRazorpayCheckout(checkout)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout'
      if (message.includes('409') || message.includes('already')) {
        toast.info('You already have an active subscription to this plan')
      } else {
        toast.error('Checkout failed', { description: message })
      }
    } finally {
      setCheckoutLoading(null)
    }
  }

  const openRazorpayCheckout = (checkout: CheckoutData): Promise<void> => {
    return new Promise((resolve, reject) => {
      const options = {
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'ViewTube',
        description: `${checkout.planDisplayName} Plan`,
        order_id: checkout.orderId,
        prefill: {
          name: checkout.profileName,
          email: checkout.profileEmail,
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await subscriptionService.confirmSimulatedPayment(checkout.orderId)
            toast.success(`Subscribed to ${checkout.planDisplayName}!`)
            await fetchMembership()
            const { fetchSession } = useAuthStore.getState()
            await fetchSession()
            resolve()
          } catch {
            toast.error('Payment verification failed')
            reject(new Error('Verification failed'))
          }
        },
        theme: {
          color: '#0a0a0a',
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', () => {
        toast.error('Payment failed', { description: 'Your payment was not processed. Please try again.' })
        reject(new Error('Payment failed'))
      })
      rzp.open()
    })
  }

  const currentPlanId = membership?.currentPlan?.name || 'free'

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-5 w-72 mx-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-6" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-5 w-full mb-2" />
              ))}
              <Skeleton className="h-10 w-full mt-6" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Unlock more downloads and premium features. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {plans.map((plan) => {
          const Icon = planIcons[plan.name] || Shield
          const isCurrent = currentPlanId === plan.name
          const isLoading = checkoutLoading === plan.name
          const isGold = plan.name === 'gold'

          return (
            <Card
              key={plan.name}
              className={cn(
                'relative flex flex-col',
                planColors[plan.name],
                isGold && 'shadow-lg',
                isCurrent && 'ring-2 ring-primary'
              )}
            >
              {isGold && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-amber-500 text-white text-xs px-3">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn('w-5 h-5', isGold ? 'text-amber-500' : 'text-muted-foreground')} />
                  <CardTitle className="text-base">{plan.displayName}</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="flex items-baseline gap-1 mb-1">
                  {plan.price > 0 ? (
                    <>
                      <span className="text-3xl font-bold">₹{Math.round(plan.price)}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold">Free</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {plan.downloadLimit === -1
                    ? 'Unlimited downloads'
                    : `${plan.downloadLimit} downloads per ${plan.downloadWindow}`}
                </p>

                <Separator className="mb-4" />

                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className={cn('w-4 h-4 mt-0.5 flex-shrink-0', isGold ? 'text-amber-500' : 'text-emerald-500')} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : isGold ? 'default' : 'secondary'}
                  disabled={isLoading || isCurrent}
                  onClick={() => handleSubscribe(plan.name)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : plan.price > 0 ? (
                    `Upgrade to ${plan.displayName}`
                  ) : (
                    'Downgrade to Free'
                  )}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Comparison Table */}
      <div className="mt-16 max-w-4xl mx-auto hidden md:block">
        <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold w-1/3">Features</th>
                <th className="px-6 py-4 font-semibold text-center">Free</th>
                <th className="px-6 py-4 font-semibold text-center text-amber-500">Bronze</th>
                <th className="px-6 py-4 font-semibold text-center text-slate-400">Silver</th>
                <th className="px-6 py-4 font-semibold text-center text-amber-500">Gold</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">Video Downloads</td>
                <td className="px-6 py-4 text-center">1 / day</td>
                <td className="px-6 py-4 text-center">5 / week</td>
                <td className="px-6 py-4 text-center">20 / month</td>
                <td className="px-6 py-4 text-center font-semibold">Unlimited</td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">HD Streaming</td>
                <td className="px-6 py-4 text-center text-muted-foreground"><Check className="w-4 h-4 mx-auto opacity-50" /></td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">Ad-Free Experience</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">Premium Content Access</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">Early Access to Videos</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">Priority Support</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-muted-foreground">-</td>
                <td className="px-6 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Mode Notice */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Test Mode — Payments are simulated. No real charges will be made.
        </p>
      </div>
    </div>
  )
}