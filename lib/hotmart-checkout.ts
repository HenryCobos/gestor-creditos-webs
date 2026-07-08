'use client'

import { createClient } from '@/lib/supabase/client'
import { getHotmartCheckoutUrl } from '@/lib/hotmart'
import type { BillingPeriod, PlanSlug } from '@/lib/plan-offers'

export async function redirectToHotmartCheckout(
  planSlug: Exclude<PlanSlug, 'free'>,
  period: BillingPeriod,
  options?: { useTrial?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { ok: false, error: 'Debes iniciar sesión para continuar al pago.' }
  }

  const url = getHotmartCheckoutUrl(
    planSlug,
    period,
    user.email,
    user.id,
    options
  )

  if (!url) {
    return { ok: false, error: 'No se pudo generar el enlace de pago. Contacta a soporte.' }
  }

  window.location.href = url
  return { ok: true }
}
