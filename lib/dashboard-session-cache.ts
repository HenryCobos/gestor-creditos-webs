import type { SupabaseClient } from '@supabase/supabase-js'

export type DashboardSession = {
  userId: string
  organizationId: string | null
  role: 'admin' | 'cobrador'
}

const SESSION_TTL_MS = 90_000

let cached: { session: DashboardSession; fetchedAt: number } | null = null
let inFlight: Promise<DashboardSession | null> | null = null

export function invalidateDashboardSessionCache() {
  cached = null
  inFlight = null
}

async function fetchDashboardSession(
  supabase: SupabaseClient
): Promise<DashboardSession | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  let role: 'admin' | 'cobrador' = profile?.role === 'admin' ? 'admin' : 'cobrador'

  if (profile?.organization_id) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
      role = roleData.role
    }
  }

  return {
    userId: user.id,
    organizationId: profile?.organization_id ?? null,
    role,
  }
}

/** Perfil + rol con TTL en memoria (evita repetir queries en cada página). */
export async function getDashboardSession(
  supabase: SupabaseClient
): Promise<DashboardSession | null> {
  if (cached && Date.now() - cached.fetchedAt < SESSION_TTL_MS) {
    return cached.session
  }

  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const session = await fetchDashboardSession(supabase)
      if (session) {
        cached = { session, fetchedAt: Date.now() }
      }
      return session
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
