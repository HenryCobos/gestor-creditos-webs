import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolverEstadoPrestamoDesdeCuotas } from './prestamo-cuotas-estado.ts'

const pagadas = (n: number) =>
  Array.from({ length: n }, () => ({ estado: 'pagada' as const }))

describe('resolverEstadoPrestamoDesdeCuotas — cronograma fijo', () => {
  it('9 filas pagadas pero numero_cuotas 20 → activo (YAHAIRA)', () => {
    assert.equal(
      resolverEstadoPrestamoDesdeCuotas({
        tipoPrestamo: 'amortizacion',
        numeroCuotas: 20,
        cuotas: pagadas(9),
      }),
      'activo'
    )
  })

  it('20/20 pagadas → pagado', () => {
    assert.equal(
      resolverEstadoPrestamoDesdeCuotas({
        tipoPrestamo: 'amortizacion',
        numeroCuotas: 20,
        cuotas: pagadas(20),
      }),
      'pagado'
    )
  })

  it('10 filas, una pendiente → activo', () => {
    assert.equal(
      resolverEstadoPrestamoDesdeCuotas({
        numeroCuotas: 10,
        cuotas: [
          ...pagadas(9),
          { estado: 'pendiente' },
        ],
      }),
      'activo'
    )
  })

  it('numero_cuotas 0 → activo aunque todas pagadas', () => {
    assert.equal(
      resolverEstadoPrestamoDesdeCuotas({
        numeroCuotas: 0,
        cuotas: pagadas(3),
      }),
      'activo'
    )
  })
})
