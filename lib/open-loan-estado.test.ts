import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  capitalLiquidado,
  resolverEstadoPrestamoAbierto,
} from './open-loan-estado.ts'

describe('capitalLiquidado', () => {
  it('0 y centavos residuales cuentan como liquidado', () => {
    assert.equal(capitalLiquidado(0), true)
    assert.equal(capitalLiquidado(0.01), true)
    assert.equal(capitalLiquidado(0.02), false)
  })
})

describe('resolverEstadoPrestamoAbierto', () => {
  it('capital 0 + cuota pendiente → activo', () => {
    assert.equal(
      resolverEstadoPrestamoAbierto({
        capitalSaldo: 0,
        interesPendiente: 0,
        cuotas: [{ estado: 'pagada' }, { estado: 'pendiente' }],
      }),
      'activo'
    )
  })

  it('capital 0 + todas pagadas + sin arrastre → pagado', () => {
    assert.equal(
      resolverEstadoPrestamoAbierto({
        capitalSaldo: 0,
        interesPendiente: 0,
        cuotas: [{ estado: 'pagada' }, { estado: 'pagada' }],
      }),
      'pagado'
    )
  })

  it('capital > 0 + cuotas pagadas → activo', () => {
    assert.equal(
      resolverEstadoPrestamoAbierto({
        capitalSaldo: 500,
        interesPendiente: 0,
        cuotas: [{ estado: 'pagada' }],
      }),
      'activo'
    )
  })

  it('capital 0 + interes_pendiente > epsilon → activo', () => {
    assert.equal(
      resolverEstadoPrestamoAbierto({
        capitalSaldo: 0,
        interesPendiente: 50,
        cuotas: [{ estado: 'pagada' }],
      }),
      'activo'
    )
  })

  it('cuota retrasada impide pagado', () => {
    assert.equal(
      resolverEstadoPrestamoAbierto({
        capitalSaldo: 0,
        interesPendiente: 0,
        cuotas: [{ estado: 'retrasada' }],
      }),
      'activo'
    )
  })
})
