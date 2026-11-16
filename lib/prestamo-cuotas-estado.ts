import { resolverEstadoPrestamoAbierto, type CuotaEstadoRef } from '@/lib/open-loan-estado'

export type ResolverEstadoPrestamoDesdeCuotasInput = {
  tipoPrestamo?: string | null
  numeroCuotas: number
  capitalSaldo?: number | null
  montoPrestado?: number | null
  interesPendiente?: number | null
  cuotas: CuotaEstadoRef[]
}

/** Liquidación: cuotas fijas requieren filas >= numero_cuotas; abiertos usan regla de capital. */
export function resolverEstadoPrestamoDesdeCuotas(
  input: ResolverEstadoPrestamoDesdeCuotasInput
): 'activo' | 'pagado' {
  const {
    tipoPrestamo,
    numeroCuotas,
    capitalSaldo,
    montoPrestado,
    interesPendiente,
    cuotas,
  } = input

  if (tipoPrestamo === 'abierto') {
    const capital =
      capitalSaldo != null ? Number(capitalSaldo) : Number(montoPrestado ?? 0)
    return resolverEstadoPrestamoAbierto({
      capitalSaldo: capital,
      interesPendiente,
      cuotas,
    })
  }

  const filas = cuotas.length
  if (numeroCuotas <= 0 || filas < numeroCuotas) {
    return 'activo'
  }

  const todasPagadas =
    filas > 0 && cuotas.every((c) => c.estado === 'pagada')

  return todasPagadas ? 'pagado' : 'activo'
}