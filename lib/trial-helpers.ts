'use client'

import { createClient } from '@/lib/supabase/client'

export interface TrialInfo {
  isActive: boolean
  daysRemaining: number
  trialEndsAt: Date | null
  planSlug: string
  trialUsed: boolean
}

export async function getTrialInfo(): Promise<TrialInfo> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { isActive: false, daysRemaining: 0, trialEndsAt: null, planSlug: 'pro', trialUsed: false }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_start_at, trial_ends_at, trial_plan_slug, trial_used')
    .eq('id', user.id)
    .single()

  if (!profile?.trial_ends_at) {
    return {
      isActive: false,
      daysRemaining: 0,
      trialEndsAt: null,
      planSlug: profile?.trial_plan_slug || 'pro',
      trialUsed: profile?.trial_used || false,
    }
  }

  const endsAt = new Date(profile.trial_ends_at)
  const now = new Date()
  const isActive = endsAt > now
  const msRemaining = endsAt.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))

  return {
    isActive,
    daysRemaining,
    trialEndsAt: endsAt,
    planSlug: profile.trial_plan_slug || 'pro',
    trialUsed: profile.trial_used || false,
  }
}

export function isTrialActive(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) > new Date()
}

export function getTrialDaysRemaining(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0
  const endsAt = new Date(trialEndsAt)
  const now = new Date()
  if (endsAt <= now) return 0
  return Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function trialUrgencyLevel(daysRemaining: number): 'normal' | 'warning' | 'critical' {
  if (daysRemaining <= 1) return 'critical'
  if (daysRemaining <= 3) return 'warning'
  return 'normal'
}
