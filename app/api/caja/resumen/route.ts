import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  fetchResumenCajaRuta,
  fetchResumenTodasRutas,
  loadRutasCaja,
} from '@/lib/caja-movimientos'

async function resolverRol(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  organizationId: string
): Promise<'admin' | 'cobrador'> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  let role: 'admin' | 'cobrador' =
    profile?.role === 'cobrador' ? 'cobrador' : 'admin'

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
    role = roleData.role
  }

  return role
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get('rutaId')
    const fechaDesde = searchParams.get('desde')
    const fechaHasta = searchParams.get('hasta')
    const todas = searchParams.get('todas') === '1'

    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: 'Parámetros desde y hasta requeridos' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Usuario sin organización' },
        { status: 403 }
      )
    }

    const role = await resolverRol(supabase, user.id, profile.organization_id)
    const admin = getSupabaseAdmin()

    const rutas = await loadRutasCaja(
      admin,
      profile.organization_id,
      role,
      user.id
    )

    if (todas) {
      if (role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
      const resumenTodas = await fetchResumenTodasRutas(
        admin,
        rutas,
        fechaDesde,
        fechaHasta,
        { preferRpc: false }
      )
      return NextResponse.json({ resumenTodas, rutas })
    }

    if (!rutaId) {
      return NextResponse.json({ error: 'rutaId requerido' }, { status: 400 })
    }

    const rutaPermitida = rutas.find((r) => r.id === rutaId)
    if (!rutaPermitida) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta ruta' },
        { status: 403 }
      )
    }

    const resumen = await fetchResumenCajaRuta(
      admin,
      rutaId,
      fechaDesde,
      fechaHasta,
      rutaPermitida,
      { preferRpc: false }
    )

    return NextResponse.json({ resumen, rutas })
  } catch (e) {
    console.error('[api/caja/resumen]', e)
    return NextResponse.json(
      { error: 'Error al cargar resumen de caja' },
      { status: 500 }
    )
  }
}
