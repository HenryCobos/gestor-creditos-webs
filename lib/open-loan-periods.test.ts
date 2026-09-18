import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseISO } from 'date-fns'
import {
  calcularInteresAbiertoPeriodo,
  periodoPorNumero,
  type ConfigAbierto,
} from './open-loan-periods.ts'

const configSemanalDomingo: ConfigAbierto = {
  frecuenciaPago: 'semanal',
  frecuenciaCobroDias: null,
  periodoTasa: 'semanal',
  periodoTasaDias: null,
  interesPorcentaje: 10,
  excluirDomingos: true,
  excluirFinesSemana: false,
}

describe('periodoPorNumero préstamo abierto semanal', () => {
  it('periodo 2 tiene 7 días e interés completo 10% sobre 200', () => {
    const fechaInicio = parseISO('2026-09-03')
    const p2 = periodoPorNumero(fechaInicio, 2, configSemanalDomingo)
    const dias =
      Math.round((p2.hasta.getTime() - p2.desde.getTime()) / (24 * 3600 * 1000)) + 1
    assert.equal(dias, 7)
    const interes = calcularInteresAbiertoPeriodo(200, p2.desde, p2.hasta, configSemanalDomingo)
    assert.equal(interes, 20)
  })

  it('periodo 1 sigue con interés 20 sobre 200', () => {
    const fechaInicio = parseISO('2026-09-03')
    const p1 = periodoPorNumero(fechaInicio, 1, configSemanalDomingo)
    const interes = calcularInteresAbiertoPeriodo(200, p1.desde, p1.hasta, configSemanalDomingo)
    assert.equal(interes, 20)
  })
})

describe('calcularInteresAbiertoPeriodo rango parcial manual', () => {
  it('prorratea cuando el rango no es un período completo', () => {
    const desde = parseISO('2026-09-03')
    const hasta = parseISO('2026-09-05')
    const interes = calcularInteresAbiertoPeriodo(
      200,
      desde,
      hasta,
      configSemanalDomingo
    )
    assert.ok(interes > 0 && interes < 20)
  })
})
