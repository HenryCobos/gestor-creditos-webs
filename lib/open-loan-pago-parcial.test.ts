import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  aplicarPagoCuotaAbierta,
  calcularInteresDebido,
  simularPagosParcialesInteres,
  totalInteresObligacionPeriodo,
} from './open-loan-pago-parcial.ts'

describe('calcularInteresDebido', () => {
  it('nueva cuota: interés período + arrastre', () => {
    const debido = calcularInteresDebido({
      interesCalculadoPeriodo: 150,
      interesArrastrePrestamo: 20,
      cuotaExistente: null,
      esCuotaManual: true,
    })
    assert.equal(debido, 170)
  })

  it('segundo pago parcial: no duplica arrastre del mismo período', () => {
    const debido = calcularInteresDebido({
      interesCalculadoPeriodo: 150,
      interesArrastrePrestamo: 100,
      cuotaExistente: { monto_cuota: 150, monto_pagado: 50, monto_capital: 0 },
      esCuotaManual: false,
    })
    assert.equal(debido, 100)
  })
})

describe('simularPagosParcialesInteres (caso jhordy 1000 al 15%)', () => {
  it('150 debido; pagos 50 + 50 → cuota 150, pagado 100, pendiente 50', () => {
    const { cuotaFinal, despuesDeCadaPago } = simularPagosParcialesInteres(150, [50, 50])

    assert.equal(cuotaFinal.monto_cuota, 150)
    assert.equal(cuotaFinal.monto_pagado, 100)
    assert.equal(cuotaFinal.monto_cuota - cuotaFinal.monto_pagado, 50)
    assert.equal(despuesDeCadaPago[0].interesPendientePrestamo, 100)
    assert.equal(despuesDeCadaPago[1].interesPendientePrestamo, 50)
    assert.equal(despuesDeCadaPago[1].cuotaPagada, false)
  })

  it('pago único 150 → cuota pagada, arrastre 0', () => {
    const r = aplicarPagoCuotaAbierta({
      interesCalculadoPeriodo: 150,
      interesArrastrePrestamo: 0,
      cuotaExistente: null,
      pagadoInteresEstePago: 150,
      abonoCapital: 0,
    })
    assert.equal(r.montoCuota, 150)
    assert.equal(r.montoPagadoNuevo, 150)
    assert.equal(r.interesPendientePrestamo, 0)
    assert.equal(r.cuotaPagada, true)
  })

  it('pago con abono a capital mantiene interés del período', () => {
    const r = aplicarPagoCuotaAbierta({
      interesCalculadoPeriodo: 150,
      interesArrastrePrestamo: 0,
      cuotaExistente: null,
      pagadoInteresEstePago: 150,
      abonoCapital: 200,
    })
    assert.equal(r.montoCuota, 350)
    assert.equal(r.montoPagadoNuevo, 350)
    assert.equal(r.montoCapital, 200)
    assert.equal(r.interesPendientePrestamo, 0)
  })
})

describe('totalInteresObligacionPeriodo', () => {
  it('con pagos previos solo cuenta interés del período', () => {
    const total = totalInteresObligacionPeriodo({
      interesCalculadoPeriodo: 150,
      interesArrastrePrestamo: 200,
      cuotaExistente: { monto_cuota: 250, monto_pagado: 50, monto_capital: 0 },
      esCuotaManual: false,
    })
    assert.equal(total, 150)
  })
})
