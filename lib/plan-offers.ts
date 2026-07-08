export type PlanSlug = 'free' | 'pro' | 'business' | 'enterprise'
export type BillingPeriod = 'monthly' | 'yearly'

/** Trial 7 días vía Hotmart: anuales (todos) + Business/Enterprise mensual. Pro mensual NO tiene trial. */
export function planHasTrial(slug: PlanSlug, period: BillingPeriod): boolean {
  if (slug === 'free') return false
  if (period === 'yearly') return true
  return slug === 'business' || slug === 'enterprise'
}

export const PLAN_PRICES: Record<
  Exclude<PlanSlug, 'free'>,
  { monthly: number; yearly: number; label: string }
> = {
  pro: { monthly: 19, yearly: 190, label: 'Profesional' },
  business: { monthly: 49, yearly: 490, label: 'Business' },
  enterprise: { monthly: 179, yearly: 1790, label: 'Enterprise' },
}

export const BUSINESS_BENEFITS = [
  'Hasta 200 clientes y 200 préstamos',
  'Multi-usuario: hasta 5 usuarios',
  'Gestión de rutas y cobradores',
  'Exportación ilimitada de reportes',
  'Recordatorios por email y WhatsApp',
]

export const PRO_BENEFITS = [
  'Hasta 50 clientes y 50 préstamos',
  'PDFs sin marca de agua',
  'Soporte prioritario por email',
  'Reportes avanzados e historial 90 días',
]
