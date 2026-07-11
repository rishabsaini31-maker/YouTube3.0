import { api } from './api'
import type { PlanInfo, MembershipData, ApiResponse } from '@/types'

export const subscriptionService = {
  async getPlans(): Promise<ApiResponse<PlanInfo[]>> {
    return api.get<ApiResponse<PlanInfo[]>>('/api/plans')
  },

  async getMembership(): Promise<ApiResponse<MembershipData>> {
    return api.get<ApiResponse<MembershipData>>('/api/memberships')
  },

  async createCheckout(planId: string): Promise<ApiResponse<CheckoutData>> {
    return api.post<ApiResponse<CheckoutData>>('/api/memberships', { planId })
  },

  async confirmSimulatedPayment(orderId: string): Promise<ApiResponse<{ received: boolean }>> {
    return api.post<ApiResponse<{ received: boolean }>>('/api/memberships/webhook', {
      event: 'payment.captured',
      payment: {
        order_id: orderId,
        id: `pay_test_${Date.now()}`,
        status: 'captured',
      },
    })
  },
}

export interface CheckoutData {
  orderId: string
  amount: number
  currency: string
  planId: string
  planDisplayName: string
  keyId: string
  isTestMode: boolean
  profileName: string
  profileEmail: string
}