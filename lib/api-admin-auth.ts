import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'

export class AdminAuthError extends Error {
  constructor(
    message: string,
    readonly status: number = 403
  ) {
    super(message)
    this.name = 'AdminAuthError'
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function assertValidUuid(id: string, label: string): void {
  if (!UUID_RE.test(String(id))) {
    throw new AdminAuthError(`${label} inválido`, 400)
  }
}

/** Verifica sesión y que el usuario sea admin de la org del préstamo. */
export async function requireAdminForPrestamo(
  prestamoId: string
): Promise<{ userId: string; admin: SupabaseClient }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AdminAuthError('Configuración del servidor incompleta', 500)
  }

  assertValidUuid(prestamoId, 'ID de préstamo')

  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AdminAuthError('No autenticado', 401)
  }

  const admin = getSupabaseAdmin()

  const [profileRes, prestamoRes] = await Promise.all([
    admin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('prestamos')
      .select('id, user_id, cliente_id')
      .eq('id', prestamoId)
      .maybeSingle(),
  ])

  const prestamo = prestamoRes.data
  if (!prestamo) {
    throw new AdminAuthError('Préstamo no encontrado', 404)
  }

  let organizationId = profileRes.data?.organization_id ?? null

  if (!organizationId) {
    const [ownedOrgsRes, roleRowRes, ownerProfileRes] = await Promise.all([
      admin.from('organizations').select('id').eq('owner_id', user.id).limit(1),
      admin
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1),
      admin
        .from('profiles')
        .select('organization_id')
        .eq('id', prestamo.user_id)
        .maybeSingle(),
    ])

    organizationId =
      ownedOrgsRes.data?.[0]?.id ??
      roleRowRes.data?.[0]?.organization_id ??
      ownerProfileRes.data?.organization_id ??
      null
  }

  let userRole: 'admin' | 'cobrador' =
    profileRes.data?.role === 'admin' ? 'admin' : 'cobrador'

  if (organizationId && userRole !== 'admin') {
    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
      userRole = roleData.role
    }
  }

  if (userRole !== 'admin') {
    throw new AdminAuthError(
      'Solo administradores pueden desmarcar cuotas o revertir pagos',
      403
    )
  }

  const { data: prestamoOwnerProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', prestamo.user_id)
    .maybeSingle()

  const prestamoOrgId = prestamoOwnerProfile?.organization_id ?? null

  if (
    organizationId &&
    prestamoOrgId &&
    prestamoOrgId !== organizationId
  ) {
    throw new AdminAuthError('No tienes permiso sobre este préstamo', 403)
  }

  return { userId: user.id, admin }
}

/** Resuelve prestamo_id desde pago_id y verifica admin. */
export async function requireAdminForPago(
  pagoId: string
): Promise<{ userId: string; admin: SupabaseClient; prestamoId: string }> {
  assertValidUuid(pagoId, 'ID de pago')

  const admin = getSupabaseAdmin()
  const { data: pago, error } = await admin
    .from('pagos')
    .select('prestamo_id')
    .eq('id', pagoId)
    .maybeSingle()

  if (error || !pago?.prestamo_id) {
    throw new AdminAuthError('Pago no encontrado', 404)
  }

  const { userId, admin: adminClient } = await requireAdminForPrestamo(pago.prestamo_id)
  return { userId, admin: adminClient, prestamoId: pago.prestamo_id }
}
