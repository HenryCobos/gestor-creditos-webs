import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildDesglosePrestamosParaPdf } from './reporte-general-desglose.ts'
import type { Cuota, Prestamo } from '@/lib/store'

const clienteId = 'cliente-1'

const clientes = [{ id: clienteId, nombre: 'Ana', dni: '123' }]

function prestamo(id: string, monto: number): Prestamo {
  return {
    id,
    cliente_id: clienteId,
    monto_prestado: monto,
    interes_porcentaje: 10,
    numero_cuotas: 2,
    fecha_inicio: '2026-01-01',
    monto_total: monto * 1.1,
    frecuencia_pago: 'mensual',
    tipo_interes: 'simple',
    estado: 'activo',
    organization_id: 'org',
    created_at: '',
    updated_at: '',
  } as Prestamo
}

function cuota(
  id: string,
  prestamo_id: string,
  venc: string,
  monto: number,
  pagado: number
): Cuota {
  return {
    id,
    prestamo_id,
    numero_cuota: 1,
    monto_cuota: monto,
    monto_pagado: pagado,
    fecha_vencimiento: venc,
    estado: pagado >= monto ? 'pagada' : 'pendiente',
    organization_id: 'org',
    created_at: '',
    updated_at: '',
  } as Cuota
}

describe('buildDesglosePrestamosParaPdf', () => {
  it('genera una fila por préstamo del mismo cliente', () => {
    const p1 = prestamo('p1', 100)
    const p2 = prestamo('p2', 200)
    const cuotas: Cuota[] = [
      cuota('c1', 'p1', '2026-02-01', 50, 0),
      cuota('c2', 'p2', '2026-03-01', 80, 20),
    ]

    const rows = buildDesglosePrestamosParaPdf([p1, p2], cuotas, clientes)
    assert.equal(rows.length, 2)
    assert.equal(rows[0].nombre, 'Ana')
    assert.equal(rows[0].total_prestado, 100)
    assert.equal(rows[0].total_pendiente, 50)
    assert.equal(rows[0].fecha_pago_cuota, '2026-02-01')
    assert.equal(rows[1].total_prestado, 200)
    assert.equal(rows[1].fecha_pago_cuota, '2026-03-01')
    assert.equal(rows[1].cuotas_pendientes, 1)
  })

  it('fecha_pago_cuota es null cuando el crédito está saldado', () => {
    const p = prestamo('p1', 100)
    const cuotas: Cuota[] = [cuota('c1', 'p1', '2026-02-01', 100, 100)]

    const rows = buildDesglosePrestamosParaPdf([p], cuotas, clientes)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].fecha_pago_cuota, null)
    assert.equal(rows[0].total_pendiente, 0)
    assert.equal(rows[0].cuotas_pendientes, 0)
  })
})
