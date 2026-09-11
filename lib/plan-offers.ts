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
  'Hasta 3 usuarios en tu equipo',
  'PDFs sin marca de agua',
  'Soporte prioritario por email',
  'Reportes avanzados e historial 90 días',
]

const PLAN_ORDER: PlanSlug[] = ['free', 'pro', 'business', 'enterprise']

/** Normaliza slugs de BD/UI a PlanSlug conocido. */
export function normalizePlanSlug(slug: string | null | undefined): PlanSlug {
  const s = (slug || 'free').toLowerCase()
  if (s === 'pro' || s === 'profesional') return 'pro'
  if (s === 'business') return 'business'
  if (s === 'enterprise') return 'enterprise'
  return 'free'
}

/** Plan inmediatamente superior al actual, o null si ya está en Enterprise. */
export function getNextPlanSlug(
  current: PlanSlug | string
): Exclude<PlanSlug, 'free'> | null {
  const normalized = typeof current === 'string' ? normalizePlanSlug(current) : current
  const idx = PLAN_ORDER.indexOf(normalized)
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null
  const next = PLAN_ORDER[idx + 1]
  if (next === 'free') return null
  return next as Exclude<PlanSlug, 'free'>
}

export interface UpgradeOffer {
  slug: Exclude<PlanSlug, 'free'>
  label: string
  price: number
  ctaText: string
}

/** Textos dinámicos para CTA de upgrade según plan actual. */
export function getUpgradeOffer(current: PlanSlug | string): UpgradeOffer | null {
  const next = getNextPlanSlug(current)
  if (!next) return null
  const pricing = PLAN_PRICES[next]
  return {
    slug: next,
    label: pricing.label,
    price: pricing.monthly,
    ctaText: `Subir a ${pricing.label} — $${pricing.monthly}/mes`,
  }
}
