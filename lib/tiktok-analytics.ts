'use client'

import type { BillingPeriod, PlanSlug } from '@/lib/plan-offers'
import { PLAN_PRICES } from '@/lib/plan-offers'

type DataLayerEvent = Record<string, unknown>

function pushToDataLayer(payload: DataLayerEvent) {
  if (typeof window === 'undefined') return
  const w = window as Window & { dataLayer?: DataLayerEvent[] }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push(payload)
}

/** Registro exitoso de usuario */
export function trackTikTokCompleteRegistration(userId?: string, email?: string) {
  pushToDataLayer({
    event: 'CompleteRegistration',
    user_id: userId,
    user_email: email,
  })
}

/** Click en botón que redirige a Hotmart */
export function trackTikTokInitiateCheckout(
  planSlug: Exclude<PlanSlug, 'free'>,
  period: BillingPeriod
) {
  const prices = PLAN_PRICES[planSlug]
  const value = period === 'monthly' ? prices.monthly : prices.yearly

  pushToDataLayer({
    event: 'InitiateCheckout',
    value,
    currency: 'USD',
    content_id: planSlug,
    content_name: prices.label,
    content_type: 'product',
    billing_period: period,
  })
}

/** Compra confirmada en página de éxito (backup browser) */
export function trackTikTokPurchase(
  planSlug: string,
  value: number,
  transactionId?: string
) {
  pushToDataLayer({
    event: 'Purchase',
    value,
    currency: 'USD',
    content_id: planSlug,
    content_name: `Plan ${planSlug}`,
    content_type: 'product',
    transaction_id: transactionId,
  })
}

/** Vista de pricing u oferta de plan */
export function trackTikTokViewContent(contentId: string, contentName?: string) {
  pushToDataLayer({
    event: 'ViewContent',
    content_id: contentId,
    content_name: contentName || contentId,
    content_type: 'product',
  })
}
