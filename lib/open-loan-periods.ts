import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  isAfter,
  isBefore,
} from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  calcularInteresAbierto,
  calcularSiguienteFechaPago,
  diasReferenciaPeriodo,
  type FrecuenciaPago,
  type PeriodoTasa,
} from '@/lib/loan-calculations'
import type { Prestamo } from '@/lib/store'
import { isDateOverdue } from '@/lib/utils'

export type SyncModoAbierto = 'nuevo' | 'legacy_forward'

export interface ConfigAbierto {
  frecuenciaPago: FrecuenciaPago
  frecuenciaCobroDias: number | null
  periodoTasa: PeriodoTasa | null
  periodoTasaDias: number | null
  interesPorcentaje: number
  excluirDomingos: boolean
  excluirFinesSemana: boolean
}

export interface PeriodoAbierto {
  numero: number
  desde: Date
  hasta: Date
  vencimiento: Date
}

export function getConfigAbierto(prestamo: Pick<
  Prestamo,
  | 'frecuencia_pago'
  | 'frecuencia_cobro_dias'
  | 'periodo_tasa'
  | 'periodo_tasa_dias'
  | 'interes_porcentaje'
  | 'excluir_domingos'
  | 'excluir_fines_semana'
>): ConfigAbierto {
  return {
    frecuenciaPago: prestamo.frecuencia_pago ?? 'mensual',
    frecuenciaCobroDias: prestamo.frecuencia_cobro_dias ?? null,
    periodoTasa: (prestamo.periodo_tasa as PeriodoTasa | null) ?? null,
    periodoTasaDias: prestamo.periodo_tasa_dias ?? null,
    interesPorcentaje: prestamo.interes_porcentaje,
    excluirDomingos: prestamo.excluir_domingos ?? false,
    excluirFinesSemana: prestamo.excluir_fines_semana ?? false,
  }
}

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return startOfDay(value)
  const s = value.includes('T') ? value.split('T')[0] : value
  return startOfDay(parseISO(s))
}

function fechaToIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function vencimientoPeriodoN(
  fechaInicio: Date,
  numeroPeriodo: number,
  config: ConfigAbierto
): Date {
  if (config.frecuenciaPago === 'personalizado') {
    const step = config.frecuenciaCobroDias ?? 30
    return startOfDay(
      calcularSiguienteFechaPago(
        fechaInicio,
        numeroPeriodo * step,
        'personalizado',
        config.excluirDomingos,
        config.excluirFinesSemana
      )
    )
  }
  return startOfDay(
    calcularSiguienteFechaPago(
      fechaInicio,
      numeroPeriodo,
      config.frecuenciaPago,
      config.excluirDomingos,
      config.excluirFinesSemana
    )
  )
}

export function diasNominalesCobro(config: ConfigAbierto): number {
  const tipo =
    config.frecuenciaPago === 'personalizado'
      ? 'personalizado'
      : config.frecuenciaPago
  return diasReferenciaPeriodo(tipo, config.frecuenciaCobroDias)
}

export function unidadesCobroYTasaAlineadas(config: ConfigAbierto): boolean {
  if (config.periodoTasa === null) return false
  if (config.frecuenciaPago !== config.periodoTasa) return false
  if (config.frecuenciaPago === 'personalizado') {
    return (
      (config.frecuenciaCobroDias ?? 30) === (config.periodoTasaDias ?? 30)
    )
  }
  return true
}

function diasCalendarioInclusivos(desde: Date, hasta: Date): number {
  return Math.max(1, differenceInCalendarDays(hasta, desde) + 1)
}

/** Período de cobro completo (no un rango manual parcial). */
export function esPeriodoCobroCompleto(
  desde: Date,
  hasta: Date,
  config: ConfigAbierto
): boolean {
  const nominal = diasNominalesCobro(config)
  const cal = diasCalendarioInclusivos(desde, hasta)
  if (cal === nominal || cal === nominal + 1) return true
  if (config.frecuenciaPago === 'mensual' && cal >= 28 && cal <= 31) {
    return true
  }
  return false
}

export function diasEnRangoCobro(
  desde: Date,
  hasta: Date,
  config: ConfigAbierto
): number {
  const cal = diasCalendarioInclusivos(desde, hasta)
  if (esPeriodoCobroCompleto(desde, hasta, config)) {
    return diasNominalesCobro(config)
  }
  return cal
}

export function periodoPorNumero(
  fechaInicio: Date,
  numeroPeriodo: number,
  config: ConfigAbierto
): PeriodoAbierto {
  const vencimiento = vencimientoPeriodoN(fechaInicio, numeroPeriodo, config)
  const desde =
    numeroPeriodo === 1
      ? startOfDay(fechaInicio)
      : startOfDay(vencimientoPeriodoN(fechaInicio, numeroPeriodo - 1, config))
  const hasta = addDays(vencimiento, -1)
  return {
    numero: numeroPeriodo,
    desde: startOfDay(desde),
    hasta: startOfDay(hasta),
    vencimiento,
  }
}

/** Períodos con vencimiento <= limite (típicamente hoy). */
export function listarPeriodosHasta(
  fechaInicio: Date,
  config: ConfigAbierto,
  limite: Date,
  desdeNumero: number = 1
): PeriodoAbierto[] {
  const out: PeriodoAbierto[] = []
  const lim = startOfDay(limite)
  for (let n = desdeNumero; n <= 5000; n++) {
    const p = periodoPorNumero(fechaInicio, n, config)
    if (isAfter(p.desde, lim) && n > desdeNumero) break
    out.push(p)
    if (!isBefore(p.vencimiento, lim)) break
  }
  return out
}

export function calcularInteresAbiertoPeriodo(
  capitalSaldo: number,
  desde: Date,
  hasta: Date,
  config: ConfigAbierto
): number {
  const d = startOfDay(desde)
  const h = startOfDay(hasta)
  const diasCalendario = diasCalendarioInclusivos(d, h)

  if (config.periodoTasa === null) {
    return calcularInteresAbierto(
      capitalSaldo,
      config.interesPorcentaje,
      diasCalendario
    )
  }

  const diasTasa = diasReferenciaPeriodo(
    config.periodoTasa,
    config.periodoTasaDias
  )
  const tasa = config.interesPorcentaje / 100
  const completo = esPeriodoCobroCompleto(d, h, config)

  if (unidadesCobroYTasaAlineadas(config) && completo) {
    return Number((capitalSaldo * tasa).toFixed(2))
  }

  const diasCobro = completo
    ? diasNominalesCobro(config)
    : diasCalendario

  return Number((capitalSaldo * tasa * (diasCobro / diasTasa)).toFixed(2))
}

export function formatRangoPeriodo(desde: Date | string, hasta: Date | string): string {
  const d = typeof desde === 'string' ? parseDateOnly(desde) : desde
  const h = typeof hasta === 'string' ? parseDateOnly(hasta) : hasta
  return `${format(d, 'dd/MM/yyyy')} – ${format(h, 'dd/MM/yyyy')}`
}

export interface SyncPeriodosResult {
  insertadas: number
  omitidas: number
}

type CuotaRow = {
  id?: string
  numero_cuota: number
  estado: string
  periodo_desde?: string | null
  periodo_hasta?: string | null
  fecha_pago?: string | null
  monto_pagado?: number | null
}

export interface RepararCuotasPendientesResult {
  actualizadas: number
  omitidas: number
}

export interface RepararCuotasOpciones {
  /** ISO date: cuotas con periodo_desde <= esta fecha conservan su interés (abono a capital). Si no se pasa, se usa hoy. */
  fechaCortePreservarInteres?: string
}

export function isoDateOnlyCuota(value: string): string {
  return value.includes('T') ? value.split('T')[0]! : value
}

/** true = no recalcular interés (período ya iniciado respecto al corte). */
export function debeOmitirRecalculoInteresCuota(
  periodoDesde: string | null | undefined,
  fechaCorteEfectiva: string
): boolean {
  if (!periodoDesde) return false
  return isoDateOnlyCuota(periodoDesde) <= isoDateOnlyCuota(fechaCorteEfectiva)
}

/** Corrige rangos/montos de cuotas pendientes sin pago (préstamo abierto). No toca pagadas ni crea pagos. */
export async function repararCuotasPendientesAbiertas(
  supabase: SupabaseClient,
  prestamoId: string,
  prestamo: Prestamo,
  interesArrastre: number = 0,
  opciones?: RepararCuotasOpciones
): Promise<RepararCuotasPendientesResult> {
  if (prestamo.tipo_prestamo !== 'abierto' || prestamo.estado === 'pagado') {
    return { actualizadas: 0, omitidas: 0 }
  }

  const config = getConfigAbierto(prestamo)
  const fechaInicio = parseDateOnly(prestamo.fecha_inicio)
  const capitalSaldo = prestamo.capital_saldo ?? prestamo.monto_prestado

  const { data: cuotasDb, error } = await supabase
    .from('cuotas')
    .select(
      'id, numero_cuota, estado, periodo_desde, periodo_hasta, monto_pagado, monto_cuota, monto_interes, fecha_vencimiento'
    )
    .eq('prestamo_id', prestamoId)
    .in('estado', ['pendiente', 'retrasada'])
    .order('numero_cuota', { ascending: true })

  if (error || !cuotasDb?.length) {
    if (error) console.error('[repararCuotasPendientesAbiertas]', error)
    return { actualizadas: 0, omitidas: 0 }
  }

  let actualizadas = 0
  let omitidas = 0
  let arrastreAplicado = false
  const fechaCorteEfectiva =
    opciones?.fechaCortePreservarInteres != null &&
    opciones.fechaCortePreservarInteres !== ''
      ? isoDateOnlyCuota(opciones.fechaCortePreservarInteres)
      : format(startOfDay(new Date()), 'yyyy-MM-dd')

  for (const c of cuotasDb) {
    const pagado = Number(c.monto_pagado ?? 0)
    if (pagado > 0) {
      omitidas++
      continue
    }

    const p = periodoPorNumero(fechaInicio, c.numero_cuota, config)
    const keyDesde = fechaToIsoDate(p.desde)
    const periodoDesdeCuota =
      c.periodo_desde != null && c.periodo_desde !== ''
        ? isoDateOnlyCuota(c.periodo_desde)
        : null
    const desdeParaPreservar = periodoDesdeCuota ?? keyDesde
    if (debeOmitirRecalculoInteresCuota(desdeParaPreservar, fechaCorteEfectiva)) {
      omitidas++
      continue
    }
    const keyHasta = fechaToIsoDate(p.hasta)
    const interesEst = calcularInteresAbiertoPeriodo(
      capitalSaldo,
      p.desde,
      p.hasta,
      config
    )
    const extraArrastre = !arrastreAplicado ? interesArrastre : 0
    arrastreAplicado = true
    const montoCuota = Number((interesEst + extraArrastre).toFixed(2))
    const vencIso = `${fechaToIsoDate(p.vencimiento)}T12:00:00`
    const nuevoEstado = isDateOverdue(vencIso) ? 'retrasada' : 'pendiente'

    const sinCambio =
      c.periodo_desde === keyDesde &&
      c.periodo_hasta === keyHasta &&
      Number(c.monto_cuota) === montoCuota &&
      c.estado === nuevoEstado

    if (sinCambio) {
      omitidas++
      continue
    }

    const { error: upErr } = await supabase
      .from('cuotas')
      .update({
        periodo_desde: keyDesde,
        periodo_hasta: keyHasta,
        monto_cuota: montoCuota,
        monto_interes: montoCuota,
        monto_capital: 0,
        fecha_vencimiento: vencIso,
        estado: nuevoEstado,
      })
      .eq('id', c.id)
      .eq('prestamo_id', prestamoId)

    if (upErr) {
      console.error('[repararCuotasPendientesAbiertas] update', upErr)
      omitidas++
    } else {
      actualizadas++
    }
  }

  return { actualizadas, omitidas }
}

function periodoYaCubierto(
  cuotas: CuotaRow[],
  desde: string,
  hasta: string,
  numero: number
): boolean {
  return cuotas.some(
    (c) =>
      (c.periodo_desde === desde && c.periodo_hasta === hasta) ||
      c.numero_cuota === numero
  )
}

function siguienteNumeroCuota(cuotas: CuotaRow[]): number {
  if (cuotas.length === 0) return 1
  return Math.max(...cuotas.map((c) => c.numero_cuota)) + 1
}

export async function syncPeriodosAbiertos(
  supabase: SupabaseClient,
  prestamoId: string,
  prestamo: Prestamo,
  userId: string,
  modo: SyncModoAbierto,
  opcionesReparar?: RepararCuotasOpciones
): Promise<SyncPeriodosResult> {
  if (prestamo.tipo_prestamo !== 'abierto' || prestamo.estado === 'pagado') {
    return { insertadas: 0, omitidas: 0 }
  }

  const { data: rowDb } = await supabase
    .from('prestamos')
    .select(
      'capital_saldo, interes_pendiente, periodo_tasa, periodo_tasa_dias, frecuencia_cobro_dias, frecuencia_pago, interes_porcentaje, excluir_domingos, excluir_fines_semana, fecha_inicio, monto_prestado, estado, tipo_prestamo'
    )
    .eq('id', prestamoId)
    .maybeSingle()

  const prestamoEfectivo: Prestamo = rowDb
    ? {
        ...prestamo,
        ...rowDb,
        capital_saldo:
          rowDb.capital_saldo != null
            ? Number(rowDb.capital_saldo)
            : prestamo.capital_saldo,
        interes_pendiente:
          rowDb.interes_pendiente != null
            ? Number(rowDb.interes_pendiente)
            : prestamo.interes_pendiente ?? 0,
      }
    : prestamo

  if (prestamoEfectivo.estado === 'pagado') {
    return { insertadas: 0, omitidas: 0 }
  }

  const config = getConfigAbierto(prestamoEfectivo)
  const fechaInicio = parseDateOnly(prestamoEfectivo.fecha_inicio)
  const hoy = startOfDay(new Date())
  const capitalSaldo =
    prestamoEfectivo.capital_saldo ?? prestamoEfectivo.monto_prestado
  const interesArrastre = prestamoEfectivo.interes_pendiente ?? 0

  const { data: cuotasExistentes, error: loadErr } = await supabase
    .from('cuotas')
    .select(
      'id, numero_cuota, estado, periodo_desde, periodo_hasta, fecha_pago, monto_pagado'
    )
    .eq('prestamo_id', prestamoId)
    .order('numero_cuota', { ascending: true })

  if (loadErr) {
    console.error('[syncPeriodosAbiertos] load cuotas', loadErr)
    return { insertadas: 0, omitidas: 0 }
  }

  const cuotas: CuotaRow[] = cuotasExistentes ?? []

  await repararCuotasPendientesAbiertas(
    supabase,
    prestamoId,
    prestamoEfectivo,
    interesArrastre,
    opcionesReparar
  )

  const { data: cuotasTrasReparo } = await supabase
    .from('cuotas')
    .select('numero_cuota, estado, periodo_desde, periodo_hasta, fecha_pago, monto_pagado')
    .eq('prestamo_id', prestamoId)
    .order('numero_cuota', { ascending: true })

  const cuotasActualizadas: CuotaRow[] = cuotasTrasReparo ?? cuotas

  const pendientes = cuotasActualizadas.filter(
    (c) => c.estado === 'pendiente' || c.estado === 'retrasada'
  )
  if (pendientes.length > 0) {
    return { insertadas: 0, omitidas: pendientes.length }
  }

  let periodos: PeriodoAbierto[] = []

  if (modo === 'nuevo') {
    const desdeN =
      cuotasActualizadas.length === 0 ? 1 : siguienteNumeroCuota(cuotasActualizadas)
    periodos = listarPeriodosHasta(fechaInicio, config, hoy, desdeN)
  } else {
    const pagadas = cuotasActualizadas.filter((c) => c.estado === 'pagada')
    const conRango = pagadas.filter((c) => c.periodo_hasta)

    if (pagadas.length > 0 && conRango.length === 0) {
      const n = siguienteNumeroCuota(cuotasActualizadas)
      periodos = [periodoPorNumero(fechaInicio, n, config)]
    } else if (pagadas.length > 0 && conRango.length > 0) {
      const ult = conRango.sort((a, b) => b.numero_cuota - a.numero_cuota)[0]
      const n = ult.numero_cuota + 1
      periodos = listarPeriodosHasta(fechaInicio, config, hoy, n)
    } else {
      const n = 1
      periodos = [periodoPorNumero(fechaInicio, n, config)]
      if (isBefore(periodos[0].vencimiento, hoy)) {
        periodos = listarPeriodosHasta(fechaInicio, config, hoy, 1)
      }
    }
  }

  return insertarPeriodosPendientes(
    supabase,
    prestamoId,
    userId,
    periodos,
    capitalSaldo,
    interesArrastre,
    config,
    cuotasActualizadas
  )
}

async function insertarPeriodosPendientes(
  supabase: SupabaseClient,
  prestamoId: string,
  userId: string,
  periodos: PeriodoAbierto[],
  capitalSaldo: number,
  interesArrastre: number,
  config: ConfigAbierto,
  cuotasExistentes: CuotaRow[]
): Promise<SyncPeriodosResult> {
  let insertadas = 0
  let omitidas = 0
  let first = true

  for (const p of periodos) {
    const keyDesde = fechaToIsoDate(p.desde)
    const keyHasta = fechaToIsoDate(p.hasta)

    if (periodoYaCubierto(cuotasExistentes, keyDesde, keyHasta, p.numero)) {
      omitidas++
      continue
    }

    const interesEst = calcularInteresAbiertoPeriodo(
      capitalSaldo,
      p.desde,
      p.hasta,
      config
    )
    const extraArrastre = first ? interesArrastre : 0
    first = false
    const montoCuota = Number((interesEst + extraArrastre).toFixed(2))

    const { error } = await supabase.from('cuotas').insert([
      {
        user_id: userId,
        prestamo_id: prestamoId,
        numero_cuota: p.numero,
        monto_cuota: montoCuota,
        monto_interes: montoCuota,
        monto_capital: 0,
        monto_pagado: 0,
        fecha_vencimiento: `${fechaToIsoDate(p.vencimiento)}T12:00:00`,
        periodo_desde: keyDesde,
        periodo_hasta: keyHasta,
        estado: isDateOverdue(`${fechaToIsoDate(p.vencimiento)}T12:00:00`)
          ? 'retrasada'
          : 'pendiente',
      },
    ])

    if (error) {
      console.error('[syncPeriodosAbiertos] insert', error)
      omitidas++
    } else {
      insertadas++
      const estadoInsert = isDateOverdue(`${fechaToIsoDate(p.vencimiento)}T12:00:00`)
        ? 'retrasada'
        : 'pendiente'
      cuotasExistentes.push({
        numero_cuota: p.numero,
        estado: estadoInsert,
        periodo_desde: keyDesde,
        periodo_hasta: keyHasta,
      })
    }
  }

  return { insertadas, omitidas }
}

export function sugerirRangoProximoPeriodo(
  prestamo: Prestamo,
  cuotas: CuotaRow[]
): { desde: string; hasta: string } {
  const config = getConfigAbierto(prestamo)
  const fechaInicio = parseDateOnly(prestamo.fecha_inicio)

  const pendientes = cuotas
    .filter((c) => c.estado === 'pendiente' || c.estado === 'retrasada')
    .sort((a, b) => a.numero_cuota - b.numero_cuota)

  if (pendientes[0]?.periodo_desde && pendientes[0]?.periodo_hasta) {
    return {
      desde: pendientes[0].periodo_desde,
      hasta: pendientes[0].periodo_hasta,
    }
  }

  const pagadas = cuotas.filter((c) => c.estado === 'pagada')
  const n =
    pagadas.length === 0
      ? 1
      : Math.max(...pagadas.map((c) => c.numero_cuota)) + 1

  const p = periodoPorNumero(fechaInicio, n, config)
  return {
    desde: fechaToIsoDate(p.desde),
    hasta: fechaToIsoDate(p.hasta),
  }
}
