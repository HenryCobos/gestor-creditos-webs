'use client'

import type { LimitesOrganizacion } from '@/lib/limites-organizacion-shared'
import { getNextPlanSlug, getUpgradeOffer, normalizePlanSlug } from '@/lib/plan-offers'
import { Button } from '@/components/ui/button'
import { Crown, FileText, RefreshCw, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'
import { shouldBlockListLoader } from '@/lib/should-block-list-loader'

type Props = {
  limites: LimitesOrganizacion | null
  loading: boolean
  onRetry?: () => void
  onUpgrade?: () => void
  upgrading?: boolean
}

type Urgency = 'low' | 'medium' | 'high' | 'critical'

function getUrgencyLevel(pct: number): Urgency {
  if (pct >= 100) return 'critical'
  if (pct >= 90) return 'high'
  if (pct >= 80) return 'medium'
  return 'low'
}

function urgencyBarClass(urgency: Urgency): string {
  if (urgency === 'critical' || urgency === 'high') return 'bg-red-500'
  if (urgency === 'medium') return 'bg-amber-500'
  return 'bg-blue-500'
}

function urgencyTextClass(urgency: Urgency): string {
  if (urgency === 'critical' || urgency === 'high') return 'text-red-700'
  if (urgency === 'medium') return 'text-amber-700'
  return 'text-muted-foreground'
}

function MiniMeter({
  label,
  used,
  limit,
  pct,
  icon: Icon,
  showWhenZeroLimit = false,
}: {
  label: string
  used: number
  limit: number
  pct: number
  icon: typeof Users
  showWhenZeroLimit?: boolean
}) {
  if (limit === 0 && !showWhenZeroLimit) return null

  const limitLabel = limit === 0 ? '∞' : String(limit)
  const urgency = getUrgencyLevel(pct)

  return (
    <div className="flex-shrink-0 min-w-[140px] sm:min-w-[160px] px-3 py-1">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className={`text-xs font-semibold tabular-nums ${urgencyTextClass(urgency)}`}>
          {used}/{limitLabel}
        </span>
      </div>
      {limit > 0 && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${urgencyBarClass(urgency)}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function PlanUsageStrip({
  limites,
  loading,
  onRetry,
  onUpgrade,
  upgrading = false,
}: Props) {
  const blockLoader = shouldBlockListLoader(loading, limites ? 1 : 0)

  if (blockLoader) {
    return (
      <div className="rounded-lg border bg-card px-4 py-3 animate-pulse">
        <div className="h-5 bg-muted rounded w-48" />
      </div>
    )
  }

  if (!limites) {
    return (
      <div className="rounded-lg border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">No se pudieron cargar los límites del plan.</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  const planSlug = normalizePlanSlug(limites.plan_slug)
  const upgradeOffer = getUpgradeOffer(planSlug)
  const hasNextPlan = getNextPlanSlug(planSlug) !== null

  const urgencias = [
    getUrgencyLevel(limites.porcentaje_usuarios),
    getUrgencyLevel(limites.porcentaje_clientes),
    getUrgencyLevel(limites.porcentaje_prestamos),
  ]
  const hayAlertaAlta = urgencias.some((u) => u === 'high' || u === 'critical')
  const hayAlertaMedia = urgencias.some((u) => u === 'medium')
  const mostrarCtaUpgrade =
    hasNextPlan && upgradeOffer && onUpgrade && (hayAlertaAlta || hayAlertaMedia)

  const planBadgeClass =
    planSlug === 'free'
      ? 'bg-muted text-muted-foreground'
      : planSlug === 'pro'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : planSlug === 'business'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-amber-50 text-amber-800 border-amber-200'

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {loading && (
        <p className="text-xs text-muted-foreground px-3 pt-2 sm:px-4">
          Actualizando límites…
        </p>
      )}
      {/* Fila 1: plan + acciones (móvil y desktop) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 border-b border-border/60">
        <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium ${planBadgeClass}`}>
          <Crown className="h-3.5 w-3.5 shrink-0" />
          <span>{limites.plan_nombre}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {mostrarCtaUpgrade && upgradeOffer && (
            <Button
              size="sm"
              className="h-8 text-xs sm:text-sm"
              onClick={onUpgrade}
              disabled={upgrading}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <span className="hidden sm:inline">{upgrading ? 'Redirigiendo...' : upgradeOffer.ctaText}</span>
              <span className="sm:hidden">{upgrading ? '...' : upgradeOffer.label}</span>
            </Button>
          )}
          <Link
            href="/dashboard/subscription"
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline whitespace-nowrap"
          >
            Ver plan
          </Link>
        </div>
      </div>

      {/* Fila 2: contadores (scroll horizontal en móvil) */}
      <div className="flex overflow-x-auto scrollbar-thin py-1.5 sm:py-2 divide-x divide-border/60">
        {limites.limite_usuarios > 0 && (
          <MiniMeter
            label="Usuarios"
            used={limites.usuarios_usados}
            limit={limites.limite_usuarios}
            pct={limites.porcentaje_usuarios}
            icon={Users}
          />
        )}
        <MiniMeter
          label="Clientes"
          used={limites.clientes_usados}
          limit={limites.limite_clientes}
          pct={limites.porcentaje_clientes}
          icon={Users}
        />
        <MiniMeter
          label="Préstamos"
          used={limites.prestamos_usados}
          limit={limites.limite_prestamos}
          pct={limites.porcentaje_prestamos}
          icon={FileText}
        />
      </div>
    </div>
  )
}
