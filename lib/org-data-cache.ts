import type { LimitesOrganizacion } from '@/lib/limites-organizacion-shared'
import type { UserSubscription } from '@/lib/subscription-store'

/** TTL en memoria para límites/suscripción (navegación entre secciones). */
export const ORG_DATA_CACHE_TTL_MS = 90_000

type CacheEntry<T> = {
  data: T
  fetchedAt: number
}

let limitesCache: CacheEntry<LimitesOrganizacion> | null = null
let subscriptionCache: CacheEntry<UserSubscription> | null = null
let inFlightLimites: Promise<LimitesOrganizacion | null> | null = null
let inFlightSubscription: Promise<UserSubscription | null> | null = null

function isFresh<T>(entry: CacheEntry<T> | null, ttlMs: number): entry is CacheEntry<T> {
  if (!entry) return false
  return Date.now() - entry.fetchedAt < ttlMs
}

export function getCachedLimitesOrganizacion(): LimitesOrganizacion | null {
  return isFresh(limitesCache, ORG_DATA_CACHE_TTL_MS) ? limitesCache.data : null
}

export function getCachedOrganizationSubscription(): UserSubscription | null {
  return isFresh(subscriptionCache, ORG_DATA_CACHE_TTL_MS)
    ? subscriptionCache.data
    : null
}

export function setCachedLimitesOrganizacion(data: LimitesOrganizacion | null) {
  if (data) {
    limitesCache = { data, fetchedAt: Date.now() }
  } else {
    limitesCache = null
  }
}

export function setCachedOrganizationSubscription(data: UserSubscription | null) {
  if (data) {
    subscriptionCache = { data, fetchedAt: Date.now() }
  } else {
    subscriptionCache = null
  }
}

export function invalidateOrgDataCache() {
  limitesCache = null
  subscriptionCache = null
}

export async function dedupeLimitesFetch(
  fetcher: () => Promise<LimitesOrganizacion | null>
): Promise<LimitesOrganizacion | null> {
  const cached = getCachedLimitesOrganizacion()
  if (cached) return cached

  if (inFlightLimites) return inFlightLimites

  inFlightLimites = (async () => {
    try {
      const data = await fetcher()
      setCachedLimitesOrganizacion(data)
      return data
    } finally {
      inFlightLimites = null
    }
  })()

  return inFlightLimites
}

export async function dedupeSubscriptionFetch(
  fetcher: () => Promise<UserSubscription | null>
): Promise<UserSubscription | null> {
  const cached = getCachedOrganizationSubscription()
  if (cached) return cached

  if (inFlightSubscription) return inFlightSubscription

  inFlightSubscription = (async () => {
    try {
      const data = await fetcher()
      setCachedOrganizationSubscription(data)
      return data
    } finally {
      inFlightSubscription = null
    }
  })()

  return inFlightSubscription
}

export type EnsureOrganizationContextOptions = {
  skipIfFresh?: boolean
  force?: boolean
}
