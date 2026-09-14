'use client'

import { useEffect } from 'react'
import {
  ensureOrganizationContext,
  mapLimitesToUsageLimits,
} from '@/lib/subscription-helpers'
import {
  getCachedLimitesOrganizacion,
  getCachedOrganizationSubscription,
} from '@/lib/org-data-cache'
import { useSubscriptionStore } from '@/lib/subscription-store'

/** Bootstrap de suscripción/límites en el dashboard (cache TTL + SWR). */
export function DashboardOrgProvider({ children }: { children: React.ReactNode }) {
  const {
    setUserSubscription,
    setUsageLimits,
    setLimitesOrganizacion,
    setOrgBootstrapLoading,
  } = useSubscriptionStore()

  useEffect(() => {
    let cancelled = false

    const state = useSubscriptionStore.getState()
    const cachedLim = getCachedLimitesOrganizacion()
    const cachedSub = getCachedOrganizationSubscription()
    const limitesVisible = state.limitesOrganizacion ?? cachedLim

    if (cachedSub && !state.userSubscription) {
      setUserSubscription(cachedSub)
    }
    if (cachedLim && !state.limitesOrganizacion) {
      setLimitesOrganizacion(cachedLim)
      setUsageLimits(mapLimitesToUsageLimits(cachedLim))
    }

    if (limitesVisible) {
      setOrgBootstrapLoading(false)
    } else {
      setOrgBootstrapLoading(true)
    }

    ;(async () => {
      try {
        const { subscription, limites } = await ensureOrganizationContext({
          skipIfFresh: true,
        })
        if (cancelled) return
        if (subscription) setUserSubscription(subscription)
        if (limites) {
          setLimitesOrganizacion(limites)
          setUsageLimits(mapLimitesToUsageLimits(limites))
        }
      } catch (e) {
        console.error('[DashboardOrgProvider]', e)
      } finally {
        setOrgBootstrapLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [setLimitesOrganizacion, setOrgBootstrapLoading, setUsageLimits, setUserSubscription])

  return <>{children}</>
}
