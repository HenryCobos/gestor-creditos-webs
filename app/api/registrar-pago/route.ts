import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Cliente con Service Role Key para operaciones privilegiadas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    // 1. Verificar autenticación usando el cliente del servidor
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[API registrar-pago] Error de autenticación:', authError)
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    console.log('[API registrar-pago] Usuario autenticado:', user.id)

    // 2. Obtener datos del request
    const body = await request.json()
    const {
      cuota_id,
      prestamo_id,
      monto_pagado,
      metodo_pago,
      notas
    } = body

    // 3. Validar datos requeridos
    if (!cuota_id || !prestamo_id || !monto_pagado || monto_pagado <= 0) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      )
    }

    // 4. Obtener información del usuario (rol y organización)
    const { data: profile } = await supabaseAdmin
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

    // 5. Obtener información del préstamo para validar permisos
    const { data: prestamo } = await supabaseAdmin
      .from('prestamos')
      .select('id, user_id, organization_id, ruta_id')
      .eq('id', prestamo_id)
      .single()

    if (!prestamo) {
      return NextResponse.json(
        { error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    // 6. Verificar que el préstamo pertenece a la organización del usuario
    if (prestamo.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'No tienes permiso para registrar pagos en este préstamo' },
        { status: 403 }
      )
    }

    // 7. Obtener rol del usuario
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    const userRole = roleData?.role || 'cobrador'

    // 8. Si es cobrador, verificar que el préstamo le pertenece o está en su ruta
    if (userRole === 'cobrador') {
      const perteneceAlCobrador = prestamo.user_id === user.id
      
      if (!perteneceAlCobrador) {
        // Verificar si está en una ruta del cobrador
        const { data: ruta } = await supabaseAdmin
          .from('rutas')
          .select('id')
          .eq('cobrador_id', user.id)
          .eq('id', prestamo.ruta_id)
          .maybeSingle()

        if (!ruta) {
          return NextResponse.json(
            { error: 'No tienes permiso para registrar pagos en este préstamo' },
            { status: 403 }
          )
        }
      }
    }

    // 9. Obtener información de la cuota actual
    const { data: cuotaActual } = await supabaseAdmin
      .from('cuotas')
      .select('monto_cuota, monto_pagado, estado')
      .eq('id', cuota_id)
      .single()

    if (!cuotaActual) {
      return NextResponse.json(
        { error: 'Cuota no encontrada' },
        { status: 404 }
      )
    }

    const nuevoMontoPagado = cuotaActual.monto_pagado + parseFloat(monto_pagado)
    const esPagoCompleto = nuevoMontoPagado >= cuotaActual.monto_cuota

    // 10. Registrar el pago usando el user_id del DUEÑO del préstamo (no el que registra)
    const { data: pagoInsertado, error: pagoError } = await supabaseAdmin
      .from('pagos')
      .insert([{
        user_id: prestamo.user_id, // Usar el user_id del dueño del préstamo
        cuota_id,
        prestamo_id,
        monto_pagado: parseFloat(monto_pagado),
        metodo_pago: metodo_pago || null,
        notas: notas || null,
        fecha_pago: new Date().toISOString()
      }])
      .select()
      .single()

    if (pagoError) {
      console.error('Error al insertar pago:', pagoError)
      return NextResponse.json(
        { error: 'No se pudo registrar el pago', details: pagoError.message },
        { status: 500 }
      )
    }

    // 11. Actualizar la cuota
    const { error: cuotaError } = await supabaseAdmin
      .from('cuotas')
      .update({
        monto_pagado: nuevoMontoPagado,
        estado: esPagoCompleto ? 'pagada' : cuotaActual.estado,
        fecha_pago: esPagoCompleto ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', cuota_id)

    if (cuotaError) {
      console.error('Error al actualizar cuota:', cuotaError)
      // Intentar revertir el pago insertado
      await supabaseAdmin
        .from('pagos')
        .delete()
        .eq('id', pagoInsertado.id)

      return NextResponse.json(
        { error: 'No se pudo actualizar la cuota', details: cuotaError.message },
        { status: 500 }
      )
    }

    // 12. Si es pago completo, verificar si todas las cuotas del préstamo están pagadas
    if (esPagoCompleto) {
      const { data: cuotasPrestamo } = await supabaseAdmin
        .from('cuotas')
        .select('id, estado')
        .eq('prestamo_id', prestamo_id)

      const todasPagadas = cuotasPrestamo?.every(
        c => c.estado === 'pagada' || c.id === cuota_id
      )

      if (todasPagadas) {
        await supabaseAdmin
          .from('prestamos')
          .update({ estado: 'pagado' })
          .eq('id', prestamo_id)
      }
    }

    // 13. Responder con éxito
    return NextResponse.json({
      success: true,
      pago: pagoInsertado,
      esPagoCompleto,
      message: esPagoCompleto 
        ? 'Cuota pagada completamente' 
        : 'Pago parcial registrado'
    })

  } catch (error: any) {
    console.error('Error en registrar-pago:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}
