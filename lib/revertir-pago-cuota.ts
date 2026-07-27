import type { SupabaseClient } from '@supabase/supabase-js'
import { parseCascadaDesdeNotas, roundMoney } from '@/lib/aplicar-pago-cuotas'
import { isDateOverdue } from '@/lib/utils'

export class RevertirPagoError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message)
    this.name = 'RevertirPagoError'
  }
}

interface CuotaRow {
  id: string
  numero_cuota: number
  monto_cuota: number
  monto_pagado: number
  estado: string
  fecha_vencimiento: string
  fecha_pago: string | null
  prestamo_id: string
}

export interface ResultadoRevertir {
  prestamo_id: string
  prestamo_estado: string
  monto_revertido: number
  capital_recalculado: number | null
}

async function cargarCuotasPrestamo(
  admin: SupabaseClient,
  prestamoId: string
): Promise<CuotaRow[]> {
  const { data, error } = await admin
    .from('cuotas')
    .select(
      'id, numero_cuota, monto_cuota, monto_pagado, estado, fecha_vencimiento, fecha_pago, prestamo_id'
    )
    .eq('prestamo_id', prestamoId)
    .order('numero_cuota', { ascending: true })

  if (error) {
    throw new RevertirPagoError('No se pudieron cargar las cuotas', 500)
  }
  return (data || []) as CuotaRow[]
}

function estadoCuotaTrasRevertir(
  cuota: CuotaRow,
  nuevoMontoPagado: number
): { estado: string; fecha_pago: string | null } {
  const quedaPagada = nuevoMontoPagado >= cuota.monto_cuota - 0.001
  if (quedaPagada) {
    return { estado: 'pagada', fecha_pago: cuota.fecha_pago }
  }
  return {
    estado: isDateOverdue(cuota.fecha_vencimiento) ? 'retrasada' : 'pendiente',
    fecha_pago: null,
  }
}

async function revertirMontoEnCuota(
  admin: SupabaseClient,
  cuota: CuotaRow,
  montoARestar: number
): Promise<void> {
  const nuevoMontoPagado = Math.max(
    0,
    roundMoney((cuota.monto_pagado || 0) - montoARestar)
  )
  const { estado, fecha_pago } = estadoCuotaTrasRevertir(cuota, nuevoMontoPagado)

  const { error } = await admin
    .from('cuotas')
    .update({
      monto_pagado: nuevoMontoPagado,
      estado,
      fecha_pago,
    })
    .eq('id', cuota.id)

  if (error) {
    throw new RevertirPagoError('No se pudo actualizar la cuota', 500)
  }

  cuota.monto_pagado = nuevoMontoPagado
  cuota.estado = estado
  cuota.fecha_pago = fecha_pago
}

/** Si hay cuotas pendientes → activo; si todas pagadas → pagado */
export async function sincronizarEstadoPrestamo(
  admin: SupabaseClient,
  prestamoId: string
): Promise<string> {
  const { data: cuotas, error: cuotasErr } = await admin
    .from('cuotas')
    .select('estado')
    .eq('prestamo_id', prestamoId)

  if (cuotasErr) {
    throw new RevertirPagoError('No se pudo verificar el estado del préstamo', 500)
  }

  const todasPagadas =
    (cuotas?.length ?? 0) > 0 &&
    (cuotas || []).every((c) => c.estado === 'pagada')

  const nuevoEstado = todasPagadas ? 'pagado' : 'activo'

  const { error } = await admin
    .from('prestamos')
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq('id', prestamoId)

  if (error) {
    throw new RevertirPagoError('No se pudo actualizar el estado del préstamo', 500)
  }

  return nuevoEstado
}

async function recalcularCapitalRutaSiAplica(
  admin: SupabaseClient,
  prestamoId: string
): Promise<number | null> {
  const { data: prestamo } = await admin
    .from('prestamos')
    .select('ruta_id')
    .eq('id', prestamoId)
    .maybeSingle()

  if (!prestamo?.ruta_id) return null

  const { data, error } = await admin.rpc('recalcular_capital_ruta', {
    p_ruta_id: prestamo.ruta_id,
  })

  if (error) {
    console.error('[revertir-pago] recalcular_capital_ruta:', error.message)
    return null
  }

  return Number(data) || 0
}

async function aplicarRevertirCascadaOSimple(
  admin: SupabaseClient,
  cuotas: CuotaRow[],
  cuotaPrincipalId: string,
  cascada: { cuota_id: string; monto: number }[] | null,
  montoTotalPagos: number
): Promise<void> {
  const cuotaMap = new Map(cuotas.map((c) => [c.id, c]))

  if (cascada?.length) {
    for (const item of cascada) {
      const cuota = cuotaMap.get(item.cuota_id)
      if (!cuota) {
        throw new RevertirPagoError('Cuota de cascada no encontrada', 500)
      }
      await revertirMontoEnCuota(admin, cuota, item.monto)
    }
    return
  }

  const cuota = cuotaMap.get(cuotaPrincipalId)
  if (!cuota) {
    throw new RevertirPagoError('Cuota no encontrada', 404)
  }
  await revertirMontoEnCuota(admin, cuota, montoTotalPagos)
}

/** Elimina todos los pagos de la cuota y revierte montos (con cascada si aplica). */
export async function desmarcarCuotaCompleta(
  admin: SupabaseClient,
  cuotaId: string,
  prestamoId: string
): Promise<ResultadoRevertir> {
  const { data: cuotaCheck } = await admin
    .from('cuotas')
    .select('id, prestamo_id')
    .eq('id', cuotaId)
    .maybeSingle()

  if (!cuotaCheck || cuotaCheck.prestamo_id !== prestamoId) {
    throw new RevertirPagoError('La cuota no pertenece al préstamo indicado', 400)
  }

  const { data: pagosCuota, error: pagosFetchError } = await admin
    .from('pagos')
    .select('id, notas, monto_pagado')
    .eq('cuota_id', cuotaId)

  if (pagosFetchError) {
    throw new RevertirPagoError('No se pudieron cargar los pagos', 500)
  }

  const montoRevertido = (pagosCuota || []).reduce(
    (s, p) => s + (Number(p.monto_pagado) || 0),
    0
  )

  const cascada =
    (pagosCuota || [])
      .map((p) => parseCascadaDesdeNotas(p.notas))
      .find((c) => c && c.length > 0) ?? null

  const { error: deletePagosError } = await admin
    .from('pagos')
    .delete()
    .eq('cuota_id', cuotaId)

  if (deletePagosError) {
    throw new RevertirPagoError('No se pudieron eliminar los pagos', 500)
  }

  const cuotas = await cargarCuotasPrestamo(admin, prestamoId)
  await aplicarRevertirCascadaOSimple(
    admin,
    cuotas,
    cuotaId,
    cascada,
    montoRevertido
  )

  const prestamoEstado = await sincronizarEstadoPrestamo(admin, prestamoId)
  const capitalRecalculado = await recalcularCapitalRutaSiAplica(admin, prestamoId)

  return {
    prestamo_id: prestamoId,
    prestamo_estado: prestamoEstado,
    monto_revertido: montoRevertido,
    capital_recalculado: capitalRecalculado,
  }
}

/** Elimina un pago individual y revierte cuotas (con cascada si aplica). */
export async function revertirPagoPorId(
  admin: SupabaseClient,
  pagoId: string
): Promise<ResultadoRevertir> {
  const { data: pago, error: pagoErr } = await admin
    .from('pagos')
    .select('id, cuota_id, prestamo_id, notas, monto_pagado')
    .eq('id', pagoId)
    .maybeSingle()

  if (pagoErr || !pago) {
    throw new RevertirPagoError('Pago no encontrado', 404)
  }

  const prestamoId = pago.prestamo_id
  const cuotaId = pago.cuota_id
  const montoRevertido = Number(pago.monto_pagado) || 0
  const cascada = parseCascadaDesdeNotas(pago.notas)

  const { error: deleteError } = await admin.from('pagos').delete().eq('id', pagoId)

  if (deleteError) {
    throw new RevertirPagoError('No se pudo eliminar el pago', 500)
  }

  const cuotas = await cargarCuotasPrestamo(admin, prestamoId)
  await aplicarRevertirCascadaOSimple(
    admin,
    cuotas,
    cuotaId,
    cascada,
    montoRevertido
  )

  const prestamoEstado = await sincronizarEstadoPrestamo(admin, prestamoId)
  const capitalRecalculado = await recalcularCapitalRutaSiAplica(admin, prestamoId)

  return {
    prestamo_id: prestamoId,
    prestamo_estado: prestamoEstado,
    monto_revertido: montoRevertido,
    capital_recalculado: capitalRecalculado,
  }
}
