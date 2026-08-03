import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildNotasConCascada,
  CASCADA_META_PREFIX,
  parseCascadaDesdeNotas,
  roundMoney,
} from '@/lib/aplicar-pago-cuotas'
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

interface PagoRow {
  id: string
  cuota_id: string
  prestamo_id: string
  notas: string | null
  monto_pagado: number
  fecha_pago?: string | null
  metodo_pago?: string | null
}

const PAGO_SELECT =
  'id, cuota_id, prestamo_id, notas, monto_pagado, fecha_pago, metodo_pago'

interface TotalesPrestamo {
  sumPagos: number
  sumCuotas: number
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

/** Fuerza la cuota a desmarcada (monto 0 + pendiente/retrasada). */
async function forzarDesmarcarCuota(
  admin: SupabaseClient,
  cuota: CuotaRow
): Promise<number> {
  const montoAntes = roundMoney(cuota.monto_pagado || 0)
  const estado = isDateOverdue(cuota.fecha_vencimiento) ? 'retrasada' : 'pendiente'

  const { error } = await admin
    .from('cuotas')
    .update({
      monto_pagado: 0,
      estado,
      fecha_pago: null,
    })
    .eq('id', cuota.id)

  if (error) {
    throw new RevertirPagoError('No se pudo desmarcar la cuota', 500)
  }

  cuota.monto_pagado = 0
  cuota.estado = estado
  cuota.fecha_pago = null
  return montoAntes
}

function notasUsuarioSinCascada(notas: string | null | undefined): string | null {
  if (!notas?.trim()) return null
  const lines = notas
    .split('\n')
    .filter((l) => !l.startsWith(CASCADA_META_PREFIX))
  const base = lines.join('\n').trim()
  return base || null
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

async function obtenerTotalesPrestamo(
  admin: SupabaseClient,
  prestamoId: string
): Promise<TotalesPrestamo> {
  const [{ data: pagos, error: pagosErr }, { data: cuotas, error: cuotasErr }] =
    await Promise.all([
      admin.from('pagos').select('monto_pagado').eq('prestamo_id', prestamoId),
      admin.from('cuotas').select('monto_pagado').eq('prestamo_id', prestamoId),
    ])

  if (pagosErr || cuotasErr) {
    throw new RevertirPagoError('No se pudieron verificar los totales del préstamo', 500)
  }

  const sumPagos = roundMoney(
    (pagos || []).reduce((s, p) => s + (Number(p.monto_pagado) || 0), 0)
  )
  const sumCuotas = roundMoney(
    (cuotas || []).reduce((s, c) => s + (Number(c.monto_pagado) || 0), 0)
  )

  return { sumPagos, sumCuotas }
}

async function validarConsistenciaPrestamo(
  admin: SupabaseClient,
  prestamoId: string
): Promise<void> {
  const { sumPagos, sumCuotas } = await obtenerTotalesPrestamo(admin, prestamoId)
  if (Math.abs(sumPagos - sumCuotas) > 0.01) {
    throw new RevertirPagoError(
      `Inconsistencia contable tras desmarcar: pagos (${sumPagos}) ≠ cuotas (${sumCuotas}). Revisa movimientos del préstamo.`,
      500
    )
  }
}

async function cargarPagosPrestamo(
  admin: SupabaseClient,
  prestamoId: string
): Promise<PagoRow[]> {
  const { data, error } = await admin
    .from('pagos')
    .select(PAGO_SELECT)
    .eq('prestamo_id', prestamoId)
    .order('fecha_pago', { ascending: false })

  if (error) {
    throw new RevertirPagoError('No se pudieron cargar los pagos del préstamo', 500)
  }
  return (data || []) as PagoRow[]
}

/** Elimina el pago si el monto a restar cubre todo; si no, reduce monto_pagado. */
async function reducirOEliminarPago(
  admin: SupabaseClient,
  pago: PagoRow,
  montoARestar: number
): Promise<number> {
  const montoPago = roundMoney(Number(pago.monto_pagado) || 0)
  const aRestar = roundMoney(Math.min(montoARestar, montoPago))
  if (aRestar <= 0.001) return 0

  if (montoPago <= aRestar + 0.001) {
    const { error } = await admin.from('pagos').delete().eq('id', pago.id)
    if (error) {
      throw new RevertirPagoError('No se pudo eliminar el pago huérfano', 500)
    }
    return montoPago
  }

  const nuevoMonto = roundMoney(montoPago - aRestar)
  const { error } = await admin
    .from('pagos')
    .update({ monto_pagado: nuevoMonto })
    .eq('id', pago.id)

  if (error) {
    throw new RevertirPagoError('No se pudo reducir el pago huérfano', 500)
  }

  pago.monto_pagado = nuevoMonto
  return aRestar
}

/**
 * Busca pagos no vinculados por pasos 1–2 y los ajusta para que la caja cuadre
 * al desmarcar cuotas huérfanas, legacy o duplicadas.
 */
async function reconciliarPagosAlDesmarcar(
  admin: SupabaseClient,
  prestamoId: string,
  cuotaObjetivo: CuotaRow,
  cuotas: CuotaRow[],
  pagosPrestamo: PagoRow[],
  idsYaProcesados: Set<string>
): Promise<number> {
  let montoRevertido = 0
  let montoPendiente = roundMoney(
    cuotaObjetivo.monto_pagado > 0.001
      ? cuotaObjetivo.monto_pagado
      : cuotaObjetivo.estado === 'pagada'
        ? cuotaObjetivo.monto_cuota
        : 0
  )
  if (montoPendiente <= 0.001) return 0

  const cuotaMap = new Map(cuotas.map((c) => [c.id, c]))
  const cuotaObjetivoId = cuotaObjetivo.id

  const pagosSinProcesar = () =>
    pagosPrestamo.filter((p) => !idsYaProcesados.has(p.id))

  // B: fallback pagos directos en la cuota objetivo
  for (const pago of pagosSinProcesar().filter((p) => p.cuota_id === cuotaObjetivoId)) {
    if (montoPendiente <= 0.001) break
    const rev = await reducirOEliminarPago(admin, pago, montoPendiente)
    if (rev > 0) {
      await revertirMontoEnCuota(admin, cuotaObjetivo, rev)
      montoRevertido = roundMoney(montoRevertido + rev)
      montoPendiente = roundMoney(montoPendiente - rev)
    }
    idsYaProcesados.add(pago.id)
  }

  // C: fallback cascada no detectada en paso 2
  for (const pago of pagosSinProcesar()) {
    if (montoPendiente <= 0.001) break
    const cascada = parseCascadaDesdeNotas(pago.notas)
    if (!cascada?.some((a) => a.cuota_id === cuotaObjetivoId)) continue

    const rev = await ajustarPagoCascadaParcial(admin, pago, cuotaObjetivoId, cuotas)
    if (rev > 0) {
      montoRevertido = roundMoney(montoRevertido + rev)
      montoPendiente = roundMoney(montoPendiente - rev)
    }
    idsYaProcesados.add(pago.id)
  }

  // D: pagos legacy sin cascada que cubren cuotas consecutivas
  for (const pago of pagosSinProcesar()) {
    if (montoPendiente <= 0.001) break
    if (parseCascadaDesdeNotas(pago.notas)?.length) continue

    const cuotaOrigen = cuotaMap.get(pago.cuota_id)
    if (!cuotaOrigen) continue

    const montoPago = roundMoney(Number(pago.monto_pagado) || 0)
    if (montoPago <= cuotaOrigen.monto_cuota + 0.001) continue
    if (cuotaOrigen.numero_cuota > cuotaObjetivo.numero_cuota) continue

    const montoTarget = roundMoney(
      Math.min(montoPendiente, cuotaObjetivo.monto_cuota)
    )
    const rev = await reducirOEliminarPago(admin, pago, montoTarget)
    if (rev > 0) {
      await revertirMontoEnCuota(admin, cuotaObjetivo, rev)
      montoRevertido = roundMoney(montoRevertido + rev)
      montoPendiente = roundMoney(montoPendiente - rev)
      idsYaProcesados.add(pago.id)
    }
  }

  // E: pago con monto ≈ cuota objetivo (duplicados / sin cascada)
  if (montoPendiente > 0.001) {
    const candidatos = pagosSinProcesar()
      .filter((p) => {
        const m = roundMoney(Number(p.monto_pagado) || 0)
        return (
          Math.abs(m - montoPendiente) < 0.01 ||
          Math.abs(m - cuotaObjetivo.monto_cuota) < 0.01
        )
      })
      .sort(
        (a, b) =>
          new Date(b.fecha_pago || 0).getTime() -
          new Date(a.fecha_pago || 0).getTime()
      )

    for (const pago of candidatos) {
      if (montoPendiente <= 0.001) break
      const rev = await reducirOEliminarPago(admin, pago, montoPendiente)
      if (rev > 0) {
        await revertirMontoEnCuota(admin, cuotaObjetivo, rev)
        montoRevertido = roundMoney(montoRevertido + rev)
        montoPendiente = roundMoney(montoPendiente - rev)
      }
      idsYaProcesados.add(pago.id)
    }
  }

  // F: excedente global SUM(pagos) > SUM(cuotas)
  if (montoPendiente > 0.001) {
    const { sumPagos, sumCuotas } = await obtenerTotalesPrestamo(admin, prestamoId)
    const excedente = roundMoney(sumPagos - sumCuotas)
    if (excedente >= montoPendiente - 0.01) {
      const pagosActuales = await cargarPagosPrestamo(admin, prestamoId)
      for (const pago of pagosActuales) {
        if (idsYaProcesados.has(pago.id)) continue
        if (montoPendiente <= 0.001) break
        const rev = await reducirOEliminarPago(
          admin,
          pago,
          Math.min(montoPendiente, roundMoney(Number(pago.monto_pagado) || 0))
        )
        if (rev > 0) {
          montoRevertido = roundMoney(montoRevertido + rev)
          montoPendiente = roundMoney(montoPendiente - rev)
        }
        idsYaProcesados.add(pago.id)
      }
    }
  }

  return montoRevertido
}

/** Segunda pasada: elimina excedente global si pagos > cuotas tras desmarcar. */
async function intentarReconciliarExcedenteGlobal(
  admin: SupabaseClient,
  prestamoId: string
): Promise<void> {
  const { sumPagos, sumCuotas } = await obtenerTotalesPrestamo(admin, prestamoId)
  let excedente = roundMoney(sumPagos - sumCuotas)
  if (excedente <= 0.01) return

  const pagos = await cargarPagosPrestamo(admin, prestamoId)
  for (const pago of pagos) {
    if (excedente <= 0.01) break
    const rev = await reducirOEliminarPago(admin, pago, excedente)
    excedente = roundMoney(excedente - rev)
  }
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
    throw new RevertirPagoError(
      `No se pudo recalcular la caja: ${error.message}`,
      500
    )
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

/**
 * Ajusta un pago en cascada registrado en otra cuota: quita la aplicación
 * de cuotaObjetivo, reduce el monto del pago o lo elimina.
 */
async function ajustarPagoCascadaParcial(
  admin: SupabaseClient,
  pago: PagoRow,
  cuotaObjetivoId: string,
  cuotas: CuotaRow[]
): Promise<number> {
  const cascada = parseCascadaDesdeNotas(pago.notas)
  if (!cascada?.length) return 0

  const aplicacion = cascada.find((a) => a.cuota_id === cuotaObjetivoId)
  if (!aplicacion) return 0

  const montoEstaCuota = roundMoney(aplicacion.monto)
  const cuotaMap = new Map(cuotas.map((c) => [c.id, c]))
  const cuotaObj = cuotaMap.get(cuotaObjetivoId)
  if (cuotaObj) {
    await revertirMontoEnCuota(admin, cuotaObj, montoEstaCuota)
  }

  const restantes = cascada.filter((a) => a.cuota_id !== cuotaObjetivoId)
  const nuevoMontoPago = roundMoney(
    Math.max(0, (Number(pago.monto_pagado) || 0) - montoEstaCuota)
  )

  if (restantes.length === 0 || nuevoMontoPago <= 0.001) {
    const { error } = await admin.from('pagos').delete().eq('id', pago.id)
    if (error) {
      throw new RevertirPagoError('No se pudo eliminar el pago en cascada', 500)
    }
    // Si el pago era solo de esta cuota en cascada, también revertir otras apps ya hechas arriba
    // (restantes vacío → solo esta cuota). Si nuevoMontoPago≈0 con restantes, borrar todo y
    // revertir las restantes para no dejar pagos fantasma.
    if (restantes.length > 0) {
      for (const item of restantes) {
        const c = cuotaMap.get(item.cuota_id)
        if (c) await revertirMontoEnCuota(admin, c, item.monto)
      }
    }
    return montoEstaCuota
  }

  const notasUsuario = notasUsuarioSinCascada(pago.notas)
  const aplicacionesParaNotas = restantes.map((a) => {
    const c = cuotaMap.get(a.cuota_id)
    return {
      cuota_id: a.cuota_id,
      numero_cuota: c?.numero_cuota ?? 0,
      monto_aplicado: a.monto,
      nuevo_monto_pagado: c?.monto_pagado ?? 0,
      queda_pagada: (c?.monto_pagado ?? 0) >= (c?.monto_cuota ?? 0) - 0.001,
    }
  })
  const nuevasNotas = buildNotasConCascada(notasUsuario, aplicacionesParaNotas)

  const { error: updateErr } = await admin
    .from('pagos')
    .update({
      monto_pagado: nuevoMontoPago,
      notas: nuevasNotas,
    })
    .eq('id', pago.id)

  if (updateErr) {
    throw new RevertirPagoError('No se pudo actualizar el pago en cascada', 500)
  }

  return montoEstaCuota
}

/** Elimina pagos que afectan la cuota y la deja en 0 / pendiente (con cascada). */
export async function desmarcarCuotaCompleta(
  admin: SupabaseClient,
  cuotaId: string,
  prestamoId: string
): Promise<ResultadoRevertir> {
  const { data: cuotaCheck } = await admin
    .from('cuotas')
    .select(
      'id, prestamo_id, numero_cuota, monto_cuota, monto_pagado, estado, fecha_vencimiento, fecha_pago'
    )
    .eq('id', cuotaId)
    .maybeSingle()

  if (!cuotaCheck || cuotaCheck.prestamo_id !== prestamoId) {
    throw new RevertirPagoError('La cuota no pertenece al préstamo indicado', 400)
  }

  const { data: pagosDirectos, error: pagosFetchError } = await admin
    .from('pagos')
    .select(PAGO_SELECT)
    .eq('cuota_id', cuotaId)

  if (pagosFetchError) {
    throw new RevertirPagoError('No se pudieron cargar los pagos', 500)
  }

  const { data: pagosPrestamoRaw, error: pagosPrestamoErr } = await admin
    .from('pagos')
    .select(PAGO_SELECT)
    .eq('prestamo_id', prestamoId)

  if (pagosPrestamoErr) {
    throw new RevertirPagoError('No se pudieron cargar los pagos del préstamo', 500)
  }

  const pagosPrestamo = (pagosPrestamoRaw || []) as PagoRow[]
  const idsProcesados = new Set<string>()

  const idsDirectos = new Set((pagosDirectos || []).map((p) => p.id))
  const pagosCascadaOtros = pagosPrestamo.filter((p) => {
    if (idsDirectos.has(p.id)) return false
    const cascada = parseCascadaDesdeNotas(p.notas)
    return !!cascada?.some((a) => a.cuota_id === cuotaId)
  })

  let montoRevertido = 0
  const cuotas = await cargarCuotasPrestamo(admin, prestamoId)
  const cuotaMap = new Map(cuotas.map((c) => [c.id, c]))

  // 1) Pagos registrados directamente en esta cuota
  for (const pago of (pagosDirectos || []) as PagoRow[]) {
    const cascada = parseCascadaDesdeNotas(pago.notas)
    const montoPago = Number(pago.monto_pagado) || 0

    const { error: deleteError } = await admin
      .from('pagos')
      .delete()
      .eq('id', pago.id)

    if (deleteError) {
      throw new RevertirPagoError('No se pudieron eliminar los pagos', 500)
    }
    idsProcesados.add(pago.id)

    if (cascada?.length) {
      for (const item of cascada) {
        const c = cuotaMap.get(item.cuota_id)
        if (c) await revertirMontoEnCuota(admin, c, item.monto)
      }
      montoRevertido = roundMoney(montoRevertido + montoPago)
    } else {
      const c = cuotaMap.get(cuotaId)
      if (c) await revertirMontoEnCuota(admin, c, montoPago)
      montoRevertido = roundMoney(montoRevertido + montoPago)
    }
  }

  // 2) Pagos en cascada registrados en otra cuota que incluyen esta
  for (const pago of pagosCascadaOtros) {
    const monto = await ajustarPagoCascadaParcial(admin, pago, cuotaId, cuotas)
    montoRevertido = roundMoney(montoRevertido + monto)
    idsProcesados.add(pago.id)
  }

  // 2b) Reconciliar pagos huérfanos / legacy / duplicados antes del force-reset
  let cuotaObjetivo = cuotaMap.get(cuotaId)
  if (!cuotaObjetivo) {
    const refreshed = await cargarCuotasPrestamo(admin, prestamoId)
    cuotaObjetivo = refreshed.find((c) => c.id === cuotaId)
    if (cuotaObjetivo) cuotaMap.set(cuotaId, cuotaObjetivo)
  }
  if (!cuotaObjetivo) {
    throw new RevertirPagoError('Cuota no encontrada tras revertir', 404)
  }

  const cuotaAunPagada =
    cuotaObjetivo.monto_pagado > 0.001 || cuotaObjetivo.estado === 'pagada'

  if (cuotaAunPagada) {
    const pagosActualizados = await cargarPagosPrestamo(admin, prestamoId)
    const extra = await reconciliarPagosAlDesmarcar(
      admin,
      prestamoId,
      cuotaObjetivo,
      cuotas,
      pagosActualizados,
      idsProcesados
    )
    montoRevertido = roundMoney(montoRevertido + extra)
  }

  // 3) Forzar desmarcado si la cuota sigue con saldo (huérfanos residuales)
  if (cuotaObjetivo.monto_pagado > 0.001 || cuotaObjetivo.estado === 'pagada') {
    const forzado = await forzarDesmarcarCuota(admin, cuotaObjetivo)
    if (montoRevertido < 0.001 && forzado > 0.001) {
      montoRevertido = forzado
    }
  }

  // 4) Verificar que realmente quedó desmarcada
  const { data: cuotaFinal, error: verifyErr } = await admin
    .from('cuotas')
    .select('monto_pagado, estado')
    .eq('id', cuotaId)
    .maybeSingle()

  if (verifyErr || !cuotaFinal) {
    throw new RevertirPagoError('No se pudo verificar el desmarcado', 500)
  }

  if (
    Number(cuotaFinal.monto_pagado) > 0.001 ||
    cuotaFinal.estado === 'pagada'
  ) {
    throw new RevertirPagoError(
      'La cuota no pudo desmarcarse. Revisa si hay pagos asociados o intenta de nuevo.',
      500
    )
  }

  // 5) Validar consistencia pagos ↔ cuotas; intentar reconciliar excedente global
  try {
    await validarConsistenciaPrestamo(admin, prestamoId)
  } catch (err) {
    if (err instanceof RevertirPagoError) {
      await intentarReconciliarExcedenteGlobal(admin, prestamoId)
      await validarConsistenciaPrestamo(admin, prestamoId)
    } else {
      throw err
    }
  }

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
