'use client'

import { createClient } from '@/lib/supabase/client'

const TRIAL_CACHE_KEY = 'gestor_trial_info_v1'
const TRIAL_CACHE_TTL_MS = 5 * 60 * 1000

export type TrialInfo = {
  trialEndsAt: string | null
  planSlug: string
}

type TrialCachePayload = TrialInfo & { cachedAt: number }

export async function loadTrialInfoCached(): Promise<TrialInfo> {
  const fallback: TrialInfo = { trialEndsAt: null, planSlug: 'pro' }

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(TRIAL_CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as TrialCachePayload
        if (Date.now() - parsed.cachedAt < TRIAL_CACHE_TTL_MS) {
          return {
            trialEndsAt: parsed.trialEndsAt,
            planSlug: parsed.planSlug || 'pro',
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fallback

  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_ends_at, trial_plan_slug')
    .eq('id', user.id)
    .maybeSingle()

  const info: TrialInfo = {
    trialEndsAt: profile?.trial_ends_at ?? null,
    planSlug: profile?.trial_plan_slug || 'pro',
  }

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(
        TRIAL_CACHE_KEY,
        JSON.stringify({ ...info, cachedAt: Date.now() })
      )
    } catch {
      /* ignore */
    }
  }

  return info
}
