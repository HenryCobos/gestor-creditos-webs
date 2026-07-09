import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  buildLimitesOrganizacion,
  normalizePlanFromJoin,
  type LimitesOrganizacion,
} from '@/lib/limites-organizacion-shared'

/**
 * Conteo de límites a nivel organización (bypass RLS).
 * Mismo criterio para admin y cobrador.
 */
export async function getLimitesOrganizacionForOrg(
  organizationId: string
): Promise<LimitesOrganizacion | null> {
  const admin = getSupabaseAdmin()

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .select(
      `
      id,
      plan_id,
      plan:planes(nombre, slug, limite_clientes, limite_prestamos, limite_usuarios)
    `
    )
    .eq('id', organizationId)
    .single()

  if (orgError) {
    console.warn('[getLimitesOrganizacionForOrg] Error org:', orgError.message)
    return null
  }

  let planRaw = normalizePlanFromJoin(org?.plan)

  if (!planRaw?.limite_clientes && org?.plan_id) {
    const { data: planById } = await admin
      .from('planes')
      .select('nombre, slug, limite_clientes, limite_prestamos, limite_usuarios')
      .eq('id', org.plan_id)
      .maybeSingle()
    if (planById) planRaw = planById
  }

  if (!planRaw) {
    console.warn('[getLimitesOrganizacionForOrg] Org sin plan')
    return null
  }

  const { data: orgUsers, error: usersError } = await admin
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)

  if (usersError || !orgUsers?.length) {
    console.warn('[getLimitesOrganizacionForOrg] Sin usuarios en org:', usersError?.message)
    return null
  }

  const userIds = orgUsers.map((u) => u.id)
  const usuariosUsados = orgUsers.length

  const [clientesAgg, prestamosAgg] = await Promise.all([
    admin
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .in('user_id', userIds),
    admin
      .from('prestamos')
      .select('id', { count: 'exact', head: true })
      .in('user_id', userIds),
  ])

  return buildLimitesOrganizacion(
    organizationId,
    {
      nombre: planRaw.nombre ?? 'Plan',
      slug: planRaw.slug ?? 'free',
      limite_clientes: planRaw.limite_clientes ?? 0,
      limite_prestamos: planRaw.limite_prestamos ?? 0,
      limite_usuarios: planRaw.limite_usuarios ?? 1,
    },
    {
      clientesUsados: clientesAgg.count ?? 0,
      prestamosUsados: prestamosAgg.count ?? 0,
      usuariosUsados,
    }
  )
}
