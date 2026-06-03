import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  buildLimitesOrganizacion,
  type LimitesOrganizacion,
} from '@/lib/subscription-helpers'

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
      plan:planes(nombre, slug, limite_clientes, limite_prestamos)
    `
    )
    .eq('id', organizationId)
    .single()

  const planRaw = org?.plan as
    | {
        nombre?: string
        slug?: string
        limite_clientes?: number
        limite_prestamos?: number
      }
    | null
    | undefined

  if (orgError || !planRaw) {
    console.warn('[getLimitesOrganizacionForOrg] Org sin plan:', orgError?.message)
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
    },
    clientesAgg.count ?? 0,
    prestamosAgg.count ?? 0
  )
}
