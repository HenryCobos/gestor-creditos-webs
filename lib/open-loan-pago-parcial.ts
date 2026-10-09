/**
 * Lógica de pagos parciales al interés en préstamos abiertos (misma cuota / período).
 */

import {
  calcularInteresAbiertoPeriodo,
  type ConfigAbierto,
} from './open-loan-periods'

export interface CuotaAbiertaSnapshot {
  monto_cuota: number
  monto_pagado: number
  monto_capital?: number | null
  monto_interes?: number | null
}

export interface ResolverInteresPeriodoAbiertoInput {
  capitalSaldo: number
  periodoDesde: Date
  periodoHasta: Date
  config: ConfigAbierto
  interesArrastrePrestamo: number
  cuotaExistente: CuotaAbiertaSnapshot | null
  esCuotaManual: boolean
}

export interface ResolverInteresPeriodoAbiertoResult {
  interesCalculadoPeriodo: number
  interesArrastrePrestamo: number
}

/** Interés del período para UI/pago: respeta monto en cuota pendiente; dinámico si manual o pago parcial. */
export function resolverInteresCalculadoPeriodoAbierto(
  input: ResolverInteresPeriodoAbiertoInput
): ResolverInteresPeriodoAbiertoResult {
  const {
    capitalSaldo,
    periodoDesde,
    periodoHasta,
    config,
    interesArrastrePrestamo,
    cuotaExistente,
    esCuotaManual,
  } = input

  const calcDinamico = (): ResolverInteresPeriodoAbiertoResult => ({
    interesCalculadoPeriodo: calcularInteresAbiertoPeriodo(
      capitalSaldo,
      periodoDesde,
      periodoHasta,
      config
    ),
    interesArrastrePrestamo,
  })

  if (esCuotaManual || !cuotaExistente) {
    return calcDinamico()
  }

  const pagadoPrevio = toNum(cuotaExistente.monto_pagado)
  if (pagadoPrevio > 0) {
    return calcDinamico()
  }

  const capitalEnCuota = toNum(cuotaExistente.monto_capital)
  const montoInteresRaw = cuotaExistente.monto_interes
  const montoInteres =
    montoInteresRaw != null ? toNum(montoInteresRaw) : null
  const obligacion = round2(
    montoInteres != null && montoInteres > 0
      ? montoInteres
      : toNum(cuotaExistente.monto_cuota) - capitalEnCuota
  )

  if (obligacion > 0) {
    return {
      interesCalculadoPeriodo: obligacion,
      interesArrastrePrestamo: 0,
    }
  }

  return calcDinamico()
}

export interface CalcularInteresDebidoInput {
  interesCalculadoPeriodo: number
  interesArrastrePrestamo: number
  cuotaExistente: CuotaAbiertaSnapshot | null
  esCuotaManual: boolean
}

/** Total de interés exigible del período (sin doble contar arrastre del mismo período). */
export function totalInteresObligacionPeriodo(
  input: CalcularInteresDebidoInput
): number {
  const { interesCalculadoPeriodo, interesArrastrePrestamo, cuotaExistente } = input
  const pagadoPrevio = cuotaExistente ? toNum(cuotaExistente.monto_pagado) : 0

  if (cuotaExistente && pagadoPrevio > 0) {
    return round2(interesCalculadoPeriodo)
  }

  return round2(interesCalculadoPeriodo + interesArrastrePrestamo)
}

/** Interés aún pendiente (UI y validación de pago). */
export function calcularInteresDebido(input: CalcularInteresDebidoInput): number {
  const { cuotaExistente } = input
  const totalInteres = totalInteresObligacionPeriodo(input)

  if (cuotaExistente) {
    const pagadoPrevio = toNum(cuotaExistente.monto_pagado)
    const capitalPrevio = toNum(cuotaExistente.monto_capital)
    const interesYaPagado = Math.max(0, pagadoPrevio - capitalPrevio)
    return round2(Math.max(0, totalInteres - interesYaPagado))
  }

  return totalInteres
}

export interface AplicarPagoCuotaAbiertaInput {
  interesCalculadoPeriodo: number
  interesArrastrePrestamo: number
  cuotaExistente: CuotaAbiertaSnapshot | null
  pagadoInteresEstePago: number
  abonoCapital: number
}

export interface AplicarPagoCuotaAbiertaResult {
  montoCuota: number
  montoPagadoNuevo: number
  montoInteresAcumulado: number
  montoCapital: number
  interesPendientePrestamo: number
  cuotaPagada: boolean
}

export function aplicarPagoCuotaAbierta(
  input: AplicarPagoCuotaAbiertaInput
): AplicarPagoCuotaAbiertaResult {
  const {
    interesCalculadoPeriodo,
    interesArrastrePrestamo,
    cuotaExistente,
    pagadoInteresEstePago,
    abonoCapital,
  } = input

  const pagadoPrevio = cuotaExistente ? toNum(cuotaExistente.monto_pagado) : 0
  const capitalPrevio = cuotaExistente ? toNum(cuotaExistente.monto_capital) : 0
  const interesYaPagado = Math.max(0, pagadoPrevio - capitalPrevio)

  const totalInteres = totalInteresObligacionPeriodo({
    interesCalculadoPeriodo,
    interesArrastrePrestamo,
    cuotaExistente,
    esCuotaManual: !cuotaExistente,
  })

  const montoCuota = round2(totalInteres + abonoCapital)
  const totalPago = round2(pagadoInteresEstePago + abonoCapital)
  const montoPagadoNuevo = round2(pagadoPrevio + totalPago)
  const montoInteresAcumulado = round2(interesYaPagado + pagadoInteresEstePago)

  const interesPendientePrestamo = round2(
    Math.max(0, totalInteres - montoInteresAcumulado)
  )

  const cuotaPagada =
    montoInteresAcumulado >= totalInteres - 0.001 &&
    montoPagadoNuevo >= montoCuota - 0.001

  return {
    montoCuota,
    montoPagadoNuevo,
    montoInteresAcumulado,
    montoCapital: abonoCapital,
    interesPendientePrestamo,
    cuotaPagada,
  }
}

/** Simula dos pagos parciales consecutivos (tests). */
export function simularPagosParcialesInteres(
  interesPeriodo: number,
  pagos: number[]
): {
  despuesDeCadaPago: AplicarPagoCuotaAbiertaResult[]
  cuotaFinal: { monto_cuota: number; monto_pagado: number }
} {
  let cuota: CuotaAbiertaSnapshot | null = null
  let arrastre = 0
  const despuesDeCadaPago: AplicarPagoCuotaAbiertaResult[] = []

  for (const pago of pagos) {
    const r = aplicarPagoCuotaAbierta({
      interesCalculadoPeriodo: interesPeriodo,
      interesArrastrePrestamo: arrastre,
      cuotaExistente: cuota,
      pagadoInteresEstePago: pago,
      abonoCapital: 0,
    })
    despuesDeCadaPago.push(r)
    arrastre = r.interesPendientePrestamo
    cuota = {
      monto_cuota: r.montoCuota,
      monto_pagado: r.montoPagadoNuevo,
      monto_capital: r.montoCapital,
    }
  }

  const last = despuesDeCadaPago[despuesDeCadaPago.length - 1]
  return {
    despuesDeCadaPago,
    cuotaFinal: {
      monto_cuota: last.montoCuota,
      monto_pagado: last.montoPagadoNuevo,
    },
  }
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : parseFloat(String(v)) || 0
}

function round2(n: number): number {
  return Number(n.toFixed(2))
}
