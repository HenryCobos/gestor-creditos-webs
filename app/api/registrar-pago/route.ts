import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isDev = process.env.NODE_ENV === 'development'

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: 'Configuración del servidor incompleta',
          details: 'Falta SUPABASE_SERVICE_ROLE_KEY en el entorno local',
        },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { cuota_id, prestamo_id, monto_pagado, metodo_pago, notas } = body

    if (!cuota_id || !prestamo_id || !monto_pagado || monto_pagado <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    if (!UUID_RE.test(String(prestamo_id)) || !UUID_RE.test(String(cuota_id))) {
      return NextResponse.json({ error: 'ID de préstamo o cuota inválido' }, { status: 400 })
    }

    // Consultas en paralelo (antes eran ~8 secuenciales)
    const [profileRes, prestamoRes, cuotaRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('prestamos')
        .select('id, user_id, ruta_id, cliente_id')
        .eq('id', prestamo_id)
        .maybeSingle(),
      supabaseAdmin
        .from('cuotas')
        .select('monto_cuota, monto_pagado, estado, prestamo_id')
        .eq('id', cuota_id)
        .maybeSingle(),
    ])

    if (prestamoRes.error) {
      return NextResponse.json(
        {
          error: 'Error al buscar préstamo',
          details: prestamoRes.error.message,
          code: prestamoRes.error.code,
        },
        { status: 500 }
      )
    }

    const prestamo = prestamoRes.data
    if (!prestamo) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
    }

    if (cuotaRes.error || !cuotaRes.data) {
      return NextResponse.json({ error: 'Cuota no encontrada' }, { status: 404 })
    }

    const cuotaActual = cuotaRes.data
    if (cuotaActual.prestamo_id !== prestamo_id) {
      return NextResponse.json(
        { error: 'La cuota no pertenece al préstamo indicado' },
        { status: 400 }
      )
    }

    const profile = profileRes.data
    const esDuenoPrestamo = prestamo.user_id === user.id
    let organizationId = profile?.organization_id ?? null

    if (!organizationId) {
      const [ownedOrgsRes, roleRowRes, ownerProfileRes] = await Promise.all([
        supabaseAdmin.from('organizations').select('id').eq('owner_id', user.id).limit(1),
        supabaseAdmin
          .from('user_roles')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1),
        supabaseAdmin
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

    const prestamoOrgId =
      organizationId && esDuenoPrestamo
        ? organizationId
        : (
            await supabaseAdmin
              .from('profiles')
              .select('organization_id')
              .eq('id', prestamo.user_id)
              .maybeSingle()
          ).data?.organization_id ?? organizationId

    if (organizationId && !profile?.organization_id) {
      void supabaseAdmin
        .from('profiles')
        .update({
          organization_id: organizationId,
          role: profile?.role || 'admin',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    if (!organizationId && !esDuenoPrestamo) {
      return NextResponse.json(
        { error: 'Usuario sin organización. Contacta soporte para vincular tu cuenta.' },
        { status: 403 }
      )
    }

    if (
      prestamoOrgId &&
      organizationId &&
      prestamoOrgId !== organizationId
    ) {
      return NextResponse.json(
        { error: 'No tienes permiso para registrar pagos en este préstamo' },
        { status: 403 }
      )
    }

    let userRole: 'admin' | 'cobrador' =
      profile?.role === 'admin' ? 'admin' : esDuenoPrestamo ? 'admin' : 'cobrador'

    if (organizationId && userRole !== 'admin') {
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
        userRole = roleData.role
      }
    }

    if (userRole === 'cobrador') {
      let tienePermisoCobrador = esDuenoPrestamo

      if (!tienePermisoCobrador && prestamo.ruta_id) {
        const { data: rutaAsignada } = await supabaseAdmin
          .from('rutas')
          .select('id')
          .eq('id', prestamo.ruta_id)
          .eq('cobrador_id', user.id)
          .maybeSingle()

        tienePermisoCobrador = !!rutaAsignada
      }

      if (!tienePermisoCobrador && prestamo.cliente_id) {
        const { data: clienteEnRuta } = await supabaseAdmin
          .from('ruta_clientes')
          .select('id, rutas!inner(cobrador_id)')
          .eq('cliente_id', prestamo.cliente_id)
          .eq('activo', true)
          .eq('rutas.cobrador_id', user.id)
          .limit(1)

        tienePermisoCobrador = !!clienteEnRuta?.length
      }

      if (!tienePermisoCobrador) {
        return NextResponse.json(
          { error: 'No tienes permiso para registrar pagos en este préstamo' },
          { status: 403 }
        )
      }
    }

    const nuevoMontoPagado = cuotaActual.monto_pagado + parseFloat(monto_pagado)
    const esPagoCompleto = nuevoMontoPagado >= cuotaActual.monto_cuota

    const { data: pagoInsertado, error: pagoError } = await supabaseAdmin
      .from('pagos')
      .insert({
        user_id: prestamo.user_id,
        cuota_id,
        prestamo_id,
        monto_pagado: parseFloat(monto_pagado),
        metodo_pago: metodo_pago || null,
        notas: notas || null,
        fecha_pago: new Date().toISOString(),
      })
      .select()
      .single()

    if (pagoError) {
      return NextResponse.json(
        { error: 'No se pudo registrar el pago', details: pagoError.message },
        { status: 500 }
      )
    }

    const { error: cuotaError } = await supabaseAdmin
      .from('cuotas')
      .update({
        monto_pagado: nuevoMontoPagado,
        estado: esPagoCompleto ? 'pagada' : cuotaActual.estado,
        fecha_pago: esPagoCompleto ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', cuota_id)

    if (cuotaError) {
      await supabaseAdmin.from('pagos').delete().eq('id', pagoInsertado.id)
      return NextResponse.json(
        { error: 'No se pudo actualizar la cuota', details: cuotaError.message },
        { status: 500 }
      )
    }

    if (esPagoCompleto) {
      const { data: cuotaPendiente } = await supabaseAdmin
        .from('cuotas')
        .select('id')
        .eq('prestamo_id', prestamo_id)
        .neq('estado', 'pagada')
        .neq('id', cuota_id)
        .limit(1)

      if (!cuotaPendiente?.length) {
        await supabaseAdmin
          .from('prestamos')
          .update({ estado: 'pagado' })
          .eq('id', prestamo_id)
      }
    }

    if (isDev) {
      console.log('[API registrar-pago] OK', { userId: user.id, prestamo_id, esPagoCompleto })
    }

    return NextResponse.json({
      success: true,
      pago: pagoInsertado,
      esPagoCompleto,
      message: esPagoCompleto
        ? 'Cuota pagada completamente'
        : 'Pago parcial registrado',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API registrar-pago]', message)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: message },
      { status: 500 }
    )
  }
}
