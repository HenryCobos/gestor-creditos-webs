import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularAbonoCapitalAbierto,
  capitalSaldoVigente,
  debePreservarInteresCuotaPorAbono,
  previewInteresProximoPeriodoFuturo,
  validarAbonoCapitalAbierto,
} from './open-loan-abono-capital.ts'
import { debeOmitirRecalculoInteresCuota } from './open-loan-periods.ts'
import type { Prestamo } from './store.ts'

const prestamoBase: Pick<
  Prestamo,
  | 'tipo_prestamo'
  | 'estado'
  | 'capital_saldo'
  | 'monto_prestado'
  | 'fecha_inicio'
  | 'interes_porcentaje'
  | 'frecuencia_pago'
  | 'periodo_tasa'
> = {
  tipo_prestamo: 'abierto',
  estado: 'activo',
  capital_saldo: 500,
  monto_prestado: 500,
  fecha_inicio: '2026-08-08',
  interes_porcentaje: 15,
  frecuencia_pago: 'mensual',
  periodo_tasa: 'mensual',
}

describe('validarAbonoCapitalAbierto', () => {
  it('rechaza monto mayor al saldo', () => {
    assert.equal(
      validarAbonoCapitalAbierto({ prestamo: prestamoBase, montoAbono: 501 }),
      'monto_excede_saldo'
    )
  })

  it('acepta abono válido', () => {
    assert.equal(
      validarAbonoCapitalAbierto({ prestamo: prestamoBase, montoAbono: 200 }),
      null
    )
  })
})

describe('calcularAbonoCapitalAbierto', () => {
  it('500 - 200 = 300', () => {
    const r = calcularAbonoCapitalAbierto(500, 200)
    assert.equal(r.saldoAnterior, 500)
    assert.equal(r.saldoNuevo, 300)
    assert.equal(r.prestamoPagado, false)
  })

  it('liquida préstamo', () => {
    const r = calcularAbonoCapitalAbierto(300, 300)
    assert.equal(r.saldoNuevo, 0)
    assert.equal(r.prestamoPagado, true)
  })
})

describe('debeOmitirRecalculoInteresCuota (caso abono en período en curso)', () => {
  it('cuota 3 Sep14–Oct13: abono Oct9 preserva interés (50, no 40)', () => {
    assert.equal(
      debeOmitirRecalculoInteresCuota('2026-09-14', '2026-10-09'),
      true
    )
  })

  it('período futuro Oct14+: permite recalcular tras abono Oct9', () => {
    assert.equal(
      debeOmitirRecalculoInteresCuota('2026-10-14', '2026-10-09'),
      false
    )
  })
})

describe('debePreservarInteresCuotaPorAbono', () => {
  it('preserva cuota del período en curso', () => {
    assert.equal(
      debePreservarInteresCuotaPorAbono('2026-10-01', '2026-10-09'),
      true
    )
  })

  it('recalcula cuota futura', () => {
    assert.equal(
      debePreservarInteresCuotaPorAbono('2026-11-01', '2026-10-09'),
      false
    )
  })
})

describe('previewInteresProximoPeriodoFuturo (500 → 300 al 15%)', () => {
  it('interés ~45 sobre capital 300 en período mensual completo', () => {
    const prestamo = {
      ...prestamoBase,
      periodo_tasa_dias: null,
      frecuencia_cobro_dias: null,
      excluir_domingos: false,
      excluir_fines_semana: false,
    } as Prestamo

    const interes = previewInteresProximoPeriodoFuturo({
      prestamo,
      nuevoCapitalSaldo: 300,
      fechaAbono: '2026-10-09',
      cuotasPendientes: [
        {
          numero_cuota: 4,
          periodo_desde: '2026-10-01',
          periodo_hasta: '2026-10-31',
        },
        {
          numero_cuota: 5,
          periodo_desde: '2026-11-01',
          periodo_hasta: '2026-11-30',
        },
      ],
    })

    assert.equal(interes, 45)
  })
})

describe('capitalSaldoVigente', () => {
  it('usa capital_saldo cuando existe', () => {
    assert.equal(capitalSaldoVigente({ capital_saldo: 300, monto_prestado: 500 }), 300)
  })
})
