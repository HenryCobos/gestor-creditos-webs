import { NextResponse } from 'next/server'
import { AdminAuthError, assertValidUuid, requireAdminForPrestamo } from '@/lib/api-admin-auth'
import {
  RevertirPagoError,
  desmarcarCuotaCompleta,
} from '@/lib/revertir-pago-cuota'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cuota_id, prestamo_id } = body

    if (!cuota_id || !prestamo_id) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    assertValidUuid(cuota_id, 'ID de cuota')
    assertValidUuid(prestamo_id, 'ID de préstamo')

    const { admin } = await requireAdminForPrestamo(prestamo_id)
    const resultado = await desmarcarCuotaCompleta(admin, cuota_id, prestamo_id)

    return NextResponse.json({
      success: true,
      message: 'Cuota desmarcada correctamente',
      ...resultado,
    })
  } catch (error) {
    if (error instanceof AdminAuthError || error instanceof RevertirPagoError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API desmarcar-cuota]', message)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: message },
      { status: 500 }
    )
  }
}
