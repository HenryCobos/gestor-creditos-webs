import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type DashboardPlanInfo = {
  id: string
  nombre: string
  slug: string
}

export type DashboardShell = {
  user: { id: string; email?: string }
  profile: {
    id: string
    email: string | null
    full_name: string | null
    role: string | null
    organization_id: string | null
    activo: boolean | null
  } | null
  userRole: 'admin' | 'cobrador'
  planInfo: DashboardPlanInfo
}

const DEFAULT_PLAN: DashboardPlanInfo = {
  id: '',
  nombre: 'Gratuito',
  slug: 'free',
}

/** Datos del sidebar/layout — una sola ronda de consultas en paralelo */
export const getDashboardShell = cache(async (): Promise<DashboardShell | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, organization_id, activo')
    .eq('id', user.id)
    .maybeSingle()

  let userRole: 'admin' | 'cobrador' =
    profile?.role === 'cobrador' ? 'cobrador' : 'admin'
  let planInfo: DashboardPlanInfo = DEFAULT_PLAN

  if (profile?.organization_id) {
    const [roleRes, orgRes] = await Promise.all([
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .maybeSingle(),
      supabase
        .from('organizations')
        .select('plan_id, plan:planes(id, nombre, slug)')
        .eq('id', profile.organization_id)
        .maybeSingle(),
    ])

    if (roleRes.data?.role === 'admin' || roleRes.data?.role === 'cobrador') {
      userRole = roleRes.data.role
    }

    const orgPlan = Array.isArray(orgRes.data?.plan)
      ? orgRes.data?.plan[0]
      : orgRes.data?.plan

    if (orgPlan?.nombre) {
      planInfo = {
        id: orgPlan.id || '',
        nombre: orgPlan.nombre,
        slug: orgPlan.slug || 'custom',
      }
    } else if (orgRes.data?.plan_id) {
      const { data: planById } = await supabase
        .from('planes')
        .select('id, nombre, slug')
        .eq('id', orgRes.data.plan_id)
        .maybeSingle()

      if (planById) {
        planInfo = planById
      }
    }
  } else {
    const { data: freePlan } = await supabase
      .from('planes')
      .select('id, nombre, slug')
      .eq('slug', 'free')
      .maybeSingle()

    if (freePlan) planInfo = freePlan
  }

  return {
    user: { id: user.id, email: user.email },
    profile: profile
      ? {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          organization_id: profile.organization_id,
          activo: profile.activo,
        }
      : null,
    userRole,
    planInfo,
  }
})
