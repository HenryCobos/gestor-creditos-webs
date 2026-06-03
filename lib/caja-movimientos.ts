import type { SupabaseClient } from '@supabase/supabase-js'
import { endOfDay, parseISO, startOfDay } from 'date-fns'

export type TipoMovimientoCaja =
  | 'pago_recibido'
  | 'prestamo_entregado'
  | 'gasto'
  | 'ingreso_capital'
  | 'retiro_capital'
  | 'transferencia_entrada'
  | 'transferencia_salida'

export interface MovimientoCaja {
  id: string
  fecha: string
  tipo: TipoMovimientoCaja
  monto: number
  es_entrada: boolean
  concepto: string
  detalle?: string
}

export interface ResumenCajaRuta {
  ruta_id: string
  nombre_ruta: string
  color: string | null
  cobrador_nombre: string | null
  capital_actual: number
  total_cobrado: number
  total_prestado: number
  total_gastos: number
  movimientos: MovimientoCaja[]
}

export interface RutaCajaOption {
  id: string
  nombre_ruta: string
  color: string | null
  capital_actual: number
  cobrador_id: string | null
  cobrador_nombre: string | null
}

function rangoIso(desde: string, hasta: string) {
  const d = startOfDay(parseISO(desde)).toISOString()
  const h = endOfDay(parseISO(hasta)).toISOString()
  return { desde: d, hasta: h }
}

function labelTipo(tipo: TipoMovimientoCaja): string {
  const map: Record<TipoMovimientoCaja, string> = {
    pago_recibido: 'Cobro recibido',
    prestamo_entregado: 'Préstamo entregado',
    gasto: 'Gasto operativo',
    ingreso_capital: 'Ingreso de capital',
    retiro_capital: 'Retiro de capital',
    transferencia_entrada: 'Transferencia recibida',
    transferencia_salida: 'Transferencia enviada',
  }
  return map[tipo]
}

export async function loadRutasCaja(
  supabase: SupabaseClient,
  organizationId: string,
  userRole: 'admin' | 'cobrador',
  userId: string
): Promise<RutaCajaOption[]> {
  let query = supabase
    .from('rutas')
    .select('id, nombre_ruta, color, capital_actual, cobrador_id')
    .eq('organization_id', organizationId)
    .eq('estado', 'activa')
    .order('nombre_ruta', { ascending: true })

  if (userRole === 'cobrador') {
    query = query.eq('cobrador_id', userId)
  }

  const { data: rutas, error } = await query
  if (error || !rutas?.length) return []

  const cobradorIds = [...new Set(rutas.map((r) => r.cobrador_id).filter(Boolean))] as string[]
  let cobradoresMap = new Map<string, string>()

  if (cobradorIds.length > 0) {
    const { data: usuarios } = await supabase.rpc('get_usuarios_organizacion')
    ;(usuarios || []).forEach((u: { id: string; nombre_completo?: string; email?: string }) => {
      if (cobradorIds.includes(u.id)) {
        cobradoresMap.set(u.id, u.nombre_completo || u.email || 'Cobrador')
      }
    })
  }

  return rutas.map((r) => ({
    id: r.id,
    nombre_ruta: r.nombre_ruta,
    color: r.color,
    capital_actual: Number(r.capital_actual) || 0,
    cobrador_id: r.cobrador_id,
    cobrador_nombre: r.cobrador_id ? cobradoresMap.get(r.cobrador_id) ?? null : null,
  }))
}

export async function fetchResumenCajaRuta(
  supabase: SupabaseClient,
  rutaId: string,
  fechaDesde: string,
  fechaHasta: string,
  rutaMeta?: RutaCajaOption
): Promise<ResumenCajaRuta | null> {
  const { desde, hasta } = rangoIso(fechaDesde, fechaHasta)

  let meta = rutaMeta
  if (!meta) {
    const { data: ruta } = await supabase
      .from('rutas')
      .select('id, nombre_ruta, color, capital_actual, cobrador_id')
      .eq('id', rutaId)
      .maybeSingle()
    if (!ruta) return null
    meta = {
      id: ruta.id,
      nombre_ruta: ruta.nombre_ruta,
      color: ruta.color,
      capital_actual: Number(ruta.capital_actual) || 0,
      cobrador_id: ruta.cobrador_id,
      cobrador_nombre: null,
    }
  }

  const movimientos: MovimientoCaja[] = []

  const { data: prestamosRuta } = await supabase
    .from('prestamos')
    .select('id')
    .eq('ruta_id', rutaId)

  const prestamoIds = (prestamosRuta || []).map((p) => p.id)

  if (prestamoIds.length > 0) {
    const { data: pagos } = await supabase
      .from('pagos')
      .select(
        `
        id,
        monto_pagado,
        fecha_pago,
        metodo_pago,
        prestamo:prestamos(
          cliente:clientes(nombre)
        )
      `
      )
      .in('prestamo_id', prestamoIds)
      .gte('fecha_pago', desde)
      .lte('fecha_pago', hasta)
      .order('fecha_pago', { ascending: false })

    ;(pagos || []).forEach((p) => {
      const cliente =
        (p.prestamo as { cliente?: { nombre?: string } } | null)?.cliente?.nombre ||
        'Cliente'
      movimientos.push({
        id: `pago-${p.id}`,
        fecha: p.fecha_pago,
        tipo: 'pago_recibido',
        monto: Number(p.monto_pagado) || 0,
        es_entrada: true,
        concepto: labelTipo('pago_recibido'),
        detalle: `${cliente}${p.metodo_pago ? ` · ${p.metodo_pago}` : ''}`,
      })
    })
  }

  const { data: prestamos } = await supabase
    .from('prestamos')
    .select('id, monto_prestado, created_at, cliente:clientes(nombre)')
    .eq('ruta_id', rutaId)
    .gte('created_at', desde)
    .lte('created_at', hasta)
    .order('created_at', { ascending: false })

  ;(prestamos || []).forEach((pr) => {
    movimientos.push({
      id: `prestamo-${pr.id}`,
      fecha: pr.created_at,
      tipo: 'prestamo_entregado',
      monto: Number(pr.monto_prestado) || 0,
      es_entrada: false,
      concepto: labelTipo('prestamo_entregado'),
      detalle: (pr.cliente as { nombre?: string } | null)?.nombre || 'Cliente',
    })
  })

  const { data: gastos } = await supabase
    .from('gastos')
    .select('id, monto, fecha_gasto, categoria, descripcion')
    .eq('ruta_id', rutaId)
    .eq('aprobado', true)
    .gte('fecha_gasto', fechaDesde)
    .lte('fecha_gasto', fechaHasta)
    .order('fecha_gasto', { ascending: false })

  ;(gastos || []).forEach((g) => {
    movimientos.push({
      id: `gasto-${g.id}`,
      fecha: `${g.fecha_gasto}T12:00:00.000Z`,
      tipo: 'gasto',
      monto: Number(g.monto) || 0,
      es_entrada: false,
      concepto: labelTipo('gasto'),
      detalle: `${g.categoria} — ${g.descripcion}`,
    })
  })

  const { data: movsCapital } = await supabase
    .from('movimientos_capital_ruta')
    .select('id, tipo_movimiento, monto, fecha_movimiento, concepto, saldo_nuevo')
    .eq('ruta_id', rutaId)
    .in('tipo_movimiento', [
      'ingreso',
      'retiro',
      'transferencia_entrada',
      'transferencia_salida',
    ])
    .gte('fecha_movimiento', desde)
    .lte('fecha_movimiento', hasta)
    .order('fecha_movimiento', { ascending: false })

  ;(movsCapital || []).forEach((m) => {
    const tipoMap: Record<string, TipoMovimientoCaja> = {
      ingreso: 'ingreso_capital',
      retiro: 'retiro_capital',
      transferencia_entrada: 'transferencia_entrada',
      transferencia_salida: 'transferencia_salida',
    }
    const tipo = tipoMap[m.tipo_movimiento] || 'ingreso_capital'
    const esEntrada =
      m.tipo_movimiento === 'ingreso' || m.tipo_movimiento === 'transferencia_entrada'
    movimientos.push({
      id: `mov-${m.id}`,
      fecha: m.fecha_movimiento,
      tipo,
      monto: Number(m.monto) || 0,
      es_entrada: esEntrada,
      concepto: labelTipo(tipo),
      detalle: m.concepto,
    })
  })

  movimientos.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  const total_cobrado = movimientos
    .filter((m) => m.tipo === 'pago_recibido')
    .reduce((s, m) => s + m.monto, 0)
  const total_prestado = movimientos
    .filter((m) => m.tipo === 'prestamo_entregado')
    .reduce((s, m) => s + m.monto, 0)
  const total_gastos = movimientos
    .filter((m) => m.tipo === 'gasto')
    .reduce((s, m) => s + m.monto, 0)

  return {
    ruta_id: meta.id,
    nombre_ruta: meta.nombre_ruta,
    color: meta.color,
    cobrador_nombre: meta.cobrador_nombre,
    capital_actual: meta.capital_actual,
    total_cobrado,
    total_prestado,
    total_gastos,
    movimientos,
  }
}

/** Resumen ligero por ruta (admin vista "todas") */
export async function fetchResumenTodasRutas(
  supabase: SupabaseClient,
  rutas: RutaCajaOption[],
  fechaDesde: string,
  fechaHasta: string
): Promise<ResumenCajaRuta[]> {
  const resultados: ResumenCajaRuta[] = []
  for (const ruta of rutas) {
    const resumen = await fetchResumenCajaRuta(
      supabase,
      ruta.id,
      fechaDesde,
      fechaHasta,
      ruta
    )
    if (resumen) resultados.push({ ...resumen, movimientos: [] })
  }
  return resultados
}
