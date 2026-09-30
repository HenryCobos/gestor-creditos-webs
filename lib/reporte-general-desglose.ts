import { parseISO } from 'date-fns'
import type { Cuota, Prestamo } from '@/lib/store'

export interface ClienteMinimo {
  id: string
  nombre: string
  dni: string
}

export interface ReporteGeneralDesglosePrestamo {
  nombre: string
  dni: string
  prestamo_id: string
  total_prestado: number
  total_pagado: number
  total_pendiente: number
  cuotas_pendientes: number
  fecha_pago_cuota: string | null
  fecha_inicio: string
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : parseFloat(String(value))
}

function saldoCuota(cuota: Pick<Cuota, 'monto_cuota' | 'monto_pagado'>): number {
  const montoCuota = toNumber(cuota.monto_cuota)
  const montoPagado = toNumber(cuota.monto_pagado)
  return Math.max(0, montoCuota - montoPagado)
}

function parseVencimiento(fecha: string): number {
  const s = fecha.includes('T') ? fecha.split('T')[0] : fecha
  return parseISO(s).getTime()
}

function proximoVencimientoCuota(
  cuotasPrestamo: Pick<Cuota, 'fecha_vencimiento' | 'monto_cuota' | 'monto_pagado'>[]
): string | null {
  let best: string | null = null
  let bestTs = Infinity

  for (const c of cuotasPrestamo) {
    if (saldoCuota(c) <= 0) continue
    if (!c.fecha_vencimiento) continue
    const ts = parseVencimiento(c.fecha_vencimiento)
    if (ts < bestTs) {
      bestTs = ts
      best = c.fecha_vencimiento
    }
  }

  return best
}

export function buildDesglosePrestamosParaPdf(
  prestamos: Prestamo[],
  cuotasFiltradas: Cuota[],
  clientes: ClienteMinimo[]
): ReporteGeneralDesglosePrestamo[] {
  const clienteById = new Map(clientes.map((c) => [c.id, c]))
  const cuotasByPrestamo = new Map<string, Cuota[]>()

  for (const c of cuotasFiltradas) {
    const list = cuotasByPrestamo.get(c.prestamo_id) ?? []
    list.push(c)
    cuotasByPrestamo.set(c.prestamo_id, list)
  }

  const rows: ReporteGeneralDesglosePrestamo[] = prestamos.map((prestamo) => {
    const cliente = clienteById.get(prestamo.cliente_id)
    const cuotasDelPrestamo = cuotasByPrestamo.get(prestamo.id) ?? []

    let total_pagado = 0
    let total_pendiente = 0
    let cuotas_pendientes = 0

    for (const c of cuotasDelPrestamo) {
      total_pagado += toNumber(c.monto_pagado)
      const pend = saldoCuota(c)
      if (pend > 0) {
        total_pendiente += pend
        cuotas_pendientes++
      }
    }

    return {
      nombre: cliente?.nombre ?? 'Desconocido',
      dni: cliente?.dni ?? '-',
      prestamo_id: prestamo.id,
      total_prestado: toNumber(prestamo.monto_prestado),
      total_pagado,
      total_pendiente,
      cuotas_pendientes,
      fecha_pago_cuota: proximoVencimientoCuota(cuotasDelPrestamo),
      fecha_inicio: prestamo.fecha_inicio,
    }
  })

  rows.sort((a, b) => {
    const nameCmp = a.nombre.localeCompare(b.nombre, 'es')
    if (nameCmp !== 0) return nameCmp

    const aDue = a.fecha_pago_cuota ? parseVencimiento(a.fecha_pago_cuota) : Infinity
    const bDue = b.fecha_pago_cuota ? parseVencimiento(b.fecha_pago_cuota) : Infinity
    if (aDue !== bDue) return aDue - bDue

    return parseVencimiento(a.fecha_inicio) - parseVencimiento(b.fecha_inicio)
  })

  return rows
}
