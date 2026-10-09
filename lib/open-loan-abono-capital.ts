import { format, parseISO, startOfDay } from 'date-fns'
import {
  calcularInteresAbiertoPeriodo,
  getConfigAbierto,
  periodoPorNumero,
} from './open-loan-periods'
import type { Prestamo } from './store'

const SALDO_CERO = 0.01

function round2(n: number): number {
  return Number(n.toFixed(2))
}

function isoDateOnly(value: string): string {
  return value.includes('T') ? value.split('T')[0]! : value
}

export type ValidarAbonoCapitalAbiertoError =
  | 'tipo_invalido'
  | 'estado_invalido'
  | 'monto_invalido'
  | 'monto_excede_saldo'

export interface ValidarAbonoCapitalAbiertoInput {
  prestamo: Pick<Prestamo, 'tipo_prestamo' | 'estado' | 'capital_saldo' | 'monto_prestado'>
  montoAbono: number
}

export function capitalSaldoVigente(
  prestamo: Pick<Prestamo, 'capital_saldo' | 'monto_prestado'>
): number {
  return prestamo.capital_saldo ?? prestamo.monto_prestado
}

export function validarAbonoCapitalAbierto(
  input: ValidarAbonoCapitalAbiertoInput
): ValidarAbonoCapitalAbiertoError | null {
  const { prestamo, montoAbono } = input
  if (prestamo.tipo_prestamo !== 'abierto') return 'tipo_invalido'
  if (prestamo.estado !== 'activo') return 'estado_invalido'
  if (!Number.isFinite(montoAbono) || montoAbono <= 0) return 'monto_invalido'
  const saldo = capitalSaldoVigente(prestamo)
  if (montoAbono > saldo + 1e-9) return 'monto_excede_saldo'
  return null
}

export interface CalcularAbonoCapitalAbiertoResult {
  saldoAnterior: number
  saldoNuevo: number
  prestamoPagado: boolean
}

export function calcularAbonoCapitalAbierto(
  saldoAnterior: number,
  montoAbono: number
): CalcularAbonoCapitalAbiertoResult {
  const saldoNuevo = round2(Math.max(0, saldoAnterior - montoAbono))
  return {
    saldoAnterior: round2(saldoAnterior),
    saldoNuevo,
    prestamoPagado: saldoNuevo <= SALDO_CERO,
  }
}

/** Si true, no recalcular interés de la cuota (período en curso o vencido al momento del abono). */
export function debePreservarInteresCuotaPorAbono(
  periodoDesde: string | null | undefined,
  fechaCortePreservarInteres: string
): boolean {
  if (!periodoDesde) return false
  return isoDateOnly(periodoDesde) <= isoDateOnly(fechaCortePreservarInteres)
}

export interface CuotaPeriodoRef {
  periodo_desde?: string | null
  periodo_hasta?: string | null
  numero_cuota?: number
}

export interface PreviewInteresProximoPeriodoInput {
  prestamo: Prestamo
  nuevoCapitalSaldo: number
  fechaAbono: string
  cuotasPendientes: CuotaPeriodoRef[]
}

/** Interés estimado del primer período futuro (periodo_desde > fecha abono). */
export function previewInteresProximoPeriodoFuturo(
  input: PreviewInteresProximoPeriodoInput
): number | null {
  const { prestamo, nuevoCapitalSaldo, fechaAbono, cuotasPendientes } = input
  if (nuevoCapitalSaldo <= SALDO_CERO) return null

  const config = getConfigAbierto(prestamo)
  const corte = isoDateOnly(fechaAbono)
  const fechaInicio = startOfDay(parseISO(isoDateOnly(prestamo.fecha_inicio)))

  const futuras = [...cuotasPendientes]
    .filter((c) => c.periodo_desde && isoDateOnly(c.periodo_desde) > corte)
    .sort((a, b) => isoDateOnly(a.periodo_desde!).localeCompare(isoDateOnly(b.periodo_desde!)))

  let desde: Date
  let hasta: Date

  if (futuras[0]?.periodo_desde && futuras[0]?.periodo_hasta) {
    desde = startOfDay(parseISO(isoDateOnly(futuras[0].periodo_desde)))
    hasta = startOfDay(parseISO(isoDateOnly(futuras[0].periodo_hasta)))
  } else {
    const nums = cuotasPendientes
      .map((c) => c.numero_cuota)
      .filter((n): n is number => n != null)
    const maxNum = nums.length ? Math.max(...nums) : 0
    const pagadasGuess = maxNum > 0 ? maxNum : 0
    const n = pagadasGuess + 1
    const p = periodoPorNumero(fechaInicio, n, config)
    if (format(p.desde, 'yyyy-MM-dd') <= corte) {
      const p2 = periodoPorNumero(fechaInicio, n + 1, config)
      desde = p2.desde
      hasta = p2.hasta
    } else {
      desde = p.desde
      hasta = p.hasta
    }
  }

  return calcularInteresAbiertoPeriodo(nuevoCapitalSaldo, desde, hasta, config)
}
