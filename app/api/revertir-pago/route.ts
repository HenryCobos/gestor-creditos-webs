import { NextResponse } from 'next/server'
import { AdminAuthError, assertValidUuid, requireAdminForPago } from '@/lib/api-admin-auth'
import { RevertirPagoError, revertirPagoPorId } from '@/lib/revertir-pago-cuota'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pago_id } = body

    if (!pago_id) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    assertValidUuid(pago_id, 'ID de pago')

    const { admin } = await requireAdminForPago(pago_id)
    const resultado = await revertirPagoPorId(admin, pago_id)

    return NextResponse.json({
      success: true,
      message: 'Pago revertido correctamente',
      ...resultado,
    })
  } catch (error) {
    if (error instanceof AdminAuthError || error instanceof RevertirPagoError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API revertir-pago]', message)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: message },
      { status: 500 }
    )
  }
}
