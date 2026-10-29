/** Umbral alineado con SALDO_CERO en open-loan-abono-capital. */
export const OPEN_LOAN_SALDO_EPSILON = 0.01

export type CuotaEstadoRef = { estado: string }

export type ResolverEstadoPrestamoAbiertoInput = {
  capitalSaldo: number
  interesPendiente?: number | null
  cuotas: CuotaEstadoRef[]
}

export function capitalLiquidado(capitalSaldo: number): boolean {
  return capitalSaldo <= OPEN_LOAN_SALDO_EPSILON
}

/** Estado del préstamo abierto: pagado solo si capital, cuotas e interés arrastre están saldados. */
export function resolverEstadoPrestamoAbierto(
  input: ResolverEstadoPrestamoAbiertoInput
): 'activo' | 'pagado' {
  const { capitalSaldo, interesPendiente, cuotas } = input
  const capitalSaldado = capitalLiquidado(capitalSaldo)
  const hayArrastre = (interesPendiente ?? 0) > OPEN_LOAN_SALDO_EPSILON
  const hayCuotasImpagadas = cuotas.some((c) => c.estado !== 'pagada')

  if (capitalSaldado && !hayCuotasImpagadas && !hayArrastre) {
    return 'pagado'
  }
  return 'activo'
}
