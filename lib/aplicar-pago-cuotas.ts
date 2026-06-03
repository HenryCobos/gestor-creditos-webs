/** Utilidades para aplicar un cobro en cascada desde una cuota hacia las siguientes */

export const CASCADA_META_PREFIX = '__CASCADA__:'

export interface CuotaParaAplicarPago {
  id: string
  numero_cuota: number
  monto_cuota: number
  monto_pagado: number
  estado?: string
  fecha_vencimiento?: string | null
}

export interface AplicacionPagoCuota {
  cuota_id: string
  numero_cuota: number
  monto_aplicado: number
  nuevo_monto_pagado: number
  queda_pagada: boolean
}

export interface ResultadoAplicacionCascada {
  aplicaciones: AplicacionPagoCuota[]
  excedente: number
  totalAplicado: number
  totalPendienteDesdeInicio: number
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function pendienteCuota(cuota: Pick<CuotaParaAplicarPago, 'monto_cuota' | 'monto_pagado'>): number {
  return roundMoney(Math.max(0, cuota.monto_cuota - (cuota.monto_pagado || 0)))
}

/** Cuotas desde la de inicio (por número) hacia adelante, ordenadas */
export function cuotasDesdeInicio(
  cuotas: CuotaParaAplicarPago[],
  numeroCuotaInicio: number
): CuotaParaAplicarPago[] {
  return [...cuotas]
    .filter((c) => c.numero_cuota >= numeroCuotaInicio)
    .sort((a, b) => a.numero_cuota - b.numero_cuota)
}

export function totalPendienteDesdeCuota(
  cuotas: CuotaParaAplicarPago[],
  numeroCuotaInicio: number
): number {
  return roundMoney(
    cuotasDesdeInicio(cuotas, numeroCuotaInicio).reduce((sum, c) => sum + pendienteCuota(c), 0)
  )
}

/** Reparte el monto cobrado en la cuota elegida y las siguientes */
export function calcularAplicacionCascada(
  cuotas: CuotaParaAplicarPago[],
  numeroCuotaInicio: number,
  montoTotal: number
): ResultadoAplicacionCascada {
  const lista = cuotasDesdeInicio(cuotas, numeroCuotaInicio)
  let restante = roundMoney(montoTotal)
  const aplicaciones: AplicacionPagoCuota[] = []

  for (const cuota of lista) {
    if (restante <= 0) break

    const pendiente = pendienteCuota(cuota)
    if (pendiente <= 0) continue

    const aplicado = roundMoney(Math.min(restante, pendiente))
    const nuevoMontoPagado = roundMoney((cuota.monto_pagado || 0) + aplicado)

    aplicaciones.push({
      cuota_id: cuota.id,
      numero_cuota: cuota.numero_cuota,
      monto_aplicado: aplicado,
      nuevo_monto_pagado: nuevoMontoPagado,
      queda_pagada: nuevoMontoPagado >= cuota.monto_cuota - 0.001,
    })

    restante = roundMoney(restante - aplicado)
  }

  const totalPendienteDesdeInicio = roundMoney(
    lista.reduce((sum, c) => sum + pendienteCuota(c), 0)
  )

  return {
    aplicaciones,
    excedente: restante,
    totalAplicado: roundMoney(montoTotal - restante),
    totalPendienteDesdeInicio,
  }
}

export function buildNotasConCascada(
  notasUsuario: string | null | undefined,
  aplicaciones: AplicacionPagoCuota[]
): string | null {
  if (aplicaciones.length <= 1) {
    return notasUsuario?.trim() || null
  }

  const meta = {
    v: 1,
    aplicaciones: aplicaciones.map((a) => ({
      cuota_id: a.cuota_id,
      monto: a.monto_aplicado,
    })),
  }

  const metaLine = `${CASCADA_META_PREFIX}${JSON.stringify(meta)}`
  const base = notasUsuario?.trim()
  return base ? `${base}\n${metaLine}` : metaLine
}

export function parseCascadaDesdeNotas(notas: string | null | undefined): {
  cuota_id: string
  monto: number
}[] | null {
  if (!notas?.includes(CASCADA_META_PREFIX)) return null

  const line = notas.split('\n').find((l) => l.startsWith(CASCADA_META_PREFIX))
  if (!line) return null

  try {
    const json = line.slice(CASCADA_META_PREFIX.length)
    const parsed = JSON.parse(json) as {
      aplicaciones?: { cuota_id: string; monto: number }[]
    }
    return parsed.aplicaciones ?? null
  } catch {
    return null
  }
}

export function mensajePagoCascada(
  montoTotal: number,
  aplicaciones: AplicacionPagoCuota[],
  currencyLabel = ''
): string {
  if (aplicaciones.length === 0) {
    return 'No se aplicó el pago a ninguna cuota'
  }

  if (aplicaciones.length === 1) {
    const a = aplicaciones[0]
    return a.queda_pagada
      ? `Cuota #${a.numero_cuota} pagada completamente`
      : `Pago parcial registrado en cuota #${a.numero_cuota}`
  }

  const numeros = aplicaciones.map((a) => `#${a.numero_cuota}`).join(', ')
  return `Cobro registrado (${currencyLabel ? currencyLabel + ' ' : ''}${montoTotal}): aplicado a cuotas ${numeros}`
}

/** Vista previa en el modal de pago */
export function previewAplicacionCascada(
  cuotas: CuotaParaAplicarPago[],
  numeroCuotaInicio: number,
  monto: number
): string | null {
  if (!monto || monto <= 0) return null

  const { aplicaciones, excedente, totalPendienteDesdeInicio } = calcularAplicacionCascada(
    cuotas,
    numeroCuotaInicio,
    monto
  )

  if (aplicaciones.length === 0) return 'No hay saldo pendiente en esta cuota ni en las siguientes.'

  const nums = aplicaciones.map((a) => `#${a.numero_cuota}`).join(', ')

  if (excedente > 0.001) {
    return `El monto supera el pendiente (${totalPendienteDesdeInicio}). Máximo a aplicar desde esta cuota.`
  }

  if (aplicaciones.length === 1) {
    const a = aplicaciones[0]
    if (a.queda_pagada) return `Se completará la cuota #${a.numero_cuota}.`
    return `Pago parcial en cuota #${a.numero_cuota}.`
  }

  return `Se aplicará a las cuotas ${nums} (en orden).`
}
