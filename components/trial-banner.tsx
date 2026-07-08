'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Clock, Zap, X } from 'lucide-react'
import { getTrialDaysRemaining, trialUrgencyLevel } from '@/lib/trial-helpers'
import { PLAN_PRICES } from '@/lib/plan-offers'
import type { PlanSlug } from '@/lib/plan-offers'

interface TrialBannerProps {
  trialEndsAt: string | null | undefined
  planSlug?: string
}

export function TrialBanner({ trialEndsAt, planSlug = 'pro' }: TrialBannerProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(0)

  useEffect(() => {
    setDaysRemaining(getTrialDaysRemaining(trialEndsAt))
    const interval = setInterval(() => {
      setDaysRemaining(getTrialDaysRemaining(trialEndsAt))
    }, 60_000)
    return () => clearInterval(interval)
  }, [trialEndsAt])

  if (!trialEndsAt || dismissed) return null
  if (!getTrialDaysRemaining(trialEndsAt) && new Date(trialEndsAt) < new Date()) return null

  const urgency = trialUrgencyLevel(daysRemaining)
  const slug = (planSlug || 'pro') as Exclude<PlanSlug, 'free'>
  const planLabel = PLAN_PRICES[slug]?.label ?? planSlug
  const monthlyPrice = PLAN_PRICES[slug]?.monthly ?? 19

  const bannerClass =
    urgency === 'critical'
      ? 'bg-red-600'
      : urgency === 'warning'
      ? 'bg-orange-500'
      : 'bg-gradient-to-r from-blue-600 to-indigo-600'

  const dayLabel = daysRemaining === 1 ? 'día' : 'días'

  return (
    <div className={`${bannerClass} text-white px-4 py-3 flex items-center justify-between gap-4 rounded-lg mb-4`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          {urgency === 'critical' ? (
            <Clock className="w-5 h-5 text-red-200 animate-pulse" />
          ) : (
            <Zap className="w-5 h-5 text-yellow-300" />
          )}
        </div>
        <div className="min-w-0">
          {urgency === 'critical' ? (
            <p className="font-bold text-sm">
              ¡Tu trial {planLabel} termina hoy!{' '}
              <span className="font-normal text-red-100">No pierdas acceso a tus datos.</span>
            </p>
          ) : urgency === 'warning' ? (
            <p className="font-bold text-sm">
              Tu prueba Plan {planLabel} termina en{' '}
              <span className="bg-orange-600 px-1.5 py-0.5 rounded font-bold">{daysRemaining} {dayLabel}</span>
              {' '}— activa tu plan para continuar.
            </p>
          ) : (
            <p className="font-bold text-sm">
              Trial Plan {planLabel} activo:{' '}
              <span className="bg-blue-700 px-1.5 py-0.5 rounded font-bold">{daysRemaining} {dayLabel} restantes</span>
              {' '}— sin interrupciones.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs h-8 px-3"
          onClick={() => router.push('/dashboard/subscription')}
        >
          Activar plan ${monthlyPrice}/mes
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
