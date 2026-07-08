'use client'

import { Check, Crown, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BUSINESS_BENEFITS,
  PLAN_PRICES,
  PRO_BENEFITS,
  planHasTrial,
  type BillingPeriod,
  type PlanSlug,
} from '@/lib/plan-offers'

type PlanOfferCardProps = {
  slug: Exclude<PlanSlug, 'free'>
  period: BillingPeriod
  highlighted?: boolean
  loading?: boolean
  onSelect: () => void
}

export function PlanOfferCard({
  slug,
  period,
  highlighted = false,
  loading = false,
  onSelect,
}: PlanOfferCardProps) {
  const prices = PLAN_PRICES[slug]
  const price = period === 'monthly' ? prices.monthly : prices.yearly
  const hasTrial = planHasTrial(slug, period)
  const periodLabel = period === 'monthly' ? 'mes' : 'año'

  const highlightClass =
    highlighted && slug === 'pro'
      ? 'border-blue-400 bg-blue-50/80 shadow-md'
      : highlighted
      ? 'border-purple-400 bg-purple-50/80 shadow-md'
      : 'border-gray-200 bg-white'

  return (
    <div className={`rounded-xl border-2 p-4 flex flex-col h-full ${highlightClass}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-bold text-gray-900">{prices.label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${price}
            <span className="text-sm font-normal text-gray-500">/{periodLabel}</span>
          </p>
        </div>
        {highlighted && (
          <Badge
            className={`text-white shrink-0 ${
              slug === 'pro' ? 'bg-blue-600' : 'bg-purple-600'
            }`}
          >
            Recomendado
          </Badge>
        )}
      </div>

      {hasTrial && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5 mb-3">
          <Gift className="w-3.5 h-3.5 shrink-0" />
          7 días de prueba gratis
        </div>
      )}

      <ul className="space-y-1.5 mb-4 flex-1">
        {(slug === 'business' ? BUSINESS_BENEFITS : PRO_BENEFITS).slice(0, 4).map((b) => (
          <li key={b} className="flex items-start gap-2 text-xs text-gray-600">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
            {b}
          </li>
        ))}
      </ul>

      <Button
        className={`w-full font-semibold ${
          highlighted && slug === 'business'
            ? 'bg-purple-600 hover:bg-purple-700'
            : slug === 'pro' || (highlighted && slug === 'pro')
            ? 'bg-blue-600 hover:bg-blue-700'
            : highlighted
            ? 'bg-purple-600 hover:bg-purple-700'
            : ''
        }`}
        variant={highlighted || slug === 'pro' ? 'default' : 'outline'}
        onClick={onSelect}
        disabled={loading}
      >
        {loading
          ? 'Redirigiendo...'
          : hasTrial
          ? 'Probar 7 días gratis →'
          : `Activar plan — $${price}/${periodLabel}`}
      </Button>
      <p className="text-[10px] text-center text-gray-400 mt-2">
        Pago seguro en Hotmart
      </p>
    </div>
  )
}

/** Dos opciones Pro (mensual sin trial + anual con trial) */
export function ProPlanOffers({
  loading,
  loadingOption,
  onSelect,
}: {
  loading?: boolean
  loadingOption?: string | null
  onSelect: (period: BillingPeriod) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 text-blue-600" />
        <p className="font-bold text-gray-900">Plan Profesional — el más económico para crecer</p>
      </div>
      <p className="text-sm text-gray-600">
        50 clientes, PDFs sin marca de agua y soporte prioritario. Prueba el plan anual 7 días gratis.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlanOfferCard
          slug="pro"
          period="monthly"
          loading={loading && loadingOption === 'pro-monthly'}
          onSelect={() => onSelect('monthly')}
        />
        <PlanOfferCard
          slug="pro"
          period="yearly"
          highlighted
          loading={loading && loadingOption === 'pro-yearly'}
          onSelect={() => onSelect('yearly')}
        />
      </div>
    </div>
  )
}

/** Dos opciones Business (mensual + anual) con trial */
export function BusinessPlanOffers({
  loading,
  loadingOption,
  onSelect,
}: {
  loading?: boolean
  loadingOption?: string | null
  onSelect: (period: BillingPeriod) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-purple-600" />
        <p className="font-bold text-gray-900">Plan Business — prueba 7 días gratis</p>
      </div>
      <p className="text-sm text-gray-600">
        Gestionas muchos clientes. Business te da 200 clientes, multi-usuario y rutas de cobranza.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlanOfferCard
          slug="business"
          period="monthly"
          highlighted
          loading={loading && loadingOption === 'business-monthly'}
          onSelect={() => onSelect('monthly')}
        />
        <PlanOfferCard
          slug="business"
          period="yearly"
          loading={loading && loadingOption === 'business-yearly'}
          onSelect={() => onSelect('yearly')}
        />
      </div>
    </div>
  )
}
