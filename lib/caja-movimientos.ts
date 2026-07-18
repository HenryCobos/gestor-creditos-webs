import type { SupabaseClient } from '@supabase/supabase-js'
import {
  estaEnRangoCalendario,
  rangoFechasLocales,
} from '@/lib/fecha-calendario'

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

export interface DesgloseSaldoCaja {
  capital_inicial: number
  cobros_acumulados: number
  prestamos_activos: number
  gastos_aprobados_total: number
}

export interface AlertaPrestamosSinRuta {
  prestamos_sin_ruta_count: number
  monto_sin_ruta: number
}

export interface ResumenCajaRuta {
  ruta_id: string
  nombre_ruta: string
  color: string | null
  cobrador_nombre: string | null
  capital_actual: number
  total_cobrado: number
  total_prestado: number
  total_prestado_activo: number
  total_gastos: number
  desglose_saldo?: DesgloseSaldoCaja
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

type PagoRow = {
  id: string
  prestamo_id: string
  monto_pagado: number
  fecha_pago: string
  metodo_pago: string | null
}

async function cargarPagosRuta(
  supabase: SupabaseClient,
  prestamoIds: string[],
  fechaDesde: string,
  fechaHasta: string,
  preferRpc: boolean
): Promise<PagoRow[]> {
  if (prestamoIds.length === 0) return []

  const prestamoIdSet = new Set(prestamoIds)
  const { desde, hasta } = rangoFechasLocales(fechaDesde, fechaHasta)

  if (preferRpc) {
    const { data: pagosRpc, error: rpcError } = await supabase.rpc(
      'get_pagos_segun_rol'
    )

    if (!rpcError && pagosRpc?.length) {
      return (pagosRpc as PagoRow[]).filter(
        (p) =>
          prestamoIdSet.has(p.prestamo_id) &&
          estaEnRangoCalendario(p.fecha_pago, fechaDesde, fechaHasta)
      )
    }
  }

  const { data: pagosDirect, error: directError } = await supabase
    .from('pagos')
    .select('id, prestamo_id, monto_pagado, fecha_pago, metodo_pago')
    .in('prestamo_id', prestamoIds)
    .gte('fecha_pago', desde)
    .lte('fecha_pago', hasta)
    .order('fecha_pago', { ascending: false })

  if (directError) {
    console.error('[caja] Error cargando pagos:', directError)
    return []
  }

  return (pagosDirect || []).filter((p) =>
    estaEnRangoCalendario(p.fecha_pago, fechaDesde, fechaHasta)
  )
}

async function cargarPrestamoIdsRuta(
  supabase: SupabaseClient,
  rutaId: string,
  preferRpc: boolean
): Promise<{ ids: string[]; clientePorPrestamo: Map<string, string> }> {
  const clientePorPrestamo = new Map<string, string>()

  if (preferRpc) {
    const { data: prestamosRpc, error: rpcError } = await supabase.rpc(
      'get_prestamos_segun_rol'
    )

    if (!rpcError && prestamosRpc?.length) {
      const enRuta = (
        prestamosRpc as { id: string; ruta_id?: string | null }[]
      ).filter((p) => p.ruta_id === rutaId)
      return { ids: enRuta.map((p) => p.id), clientePorPrestamo }
    }
  }

  const { data: prestamos, error } = await supabase
    .from('prestamos')
    .select('id, cliente:clientes(nombre)')
    .eq('ruta_id', rutaId)

  if (error) {
    console.error('[caja] Error cargando préstamos de ruta:', error)
    return { ids: [], clientePorPrestamo }
  }

  for (const pr of prestamos || []) {
    const nombre =
      (pr.cliente as { nombre?: string } | null)?.nombre || 'Cliente'
    clientePorPrestamo.set(pr.id, nombre)
  }

  return {
    ids: (prestamos || []).map((p) => p.id),
    clientePorPrestamo,
  }
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
  const cobradoresMap = new Map<string, string>()

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
  rutaMeta?: RutaCajaOption,
  options?: { preferRpc?: boolean }
): Promise<ResumenCajaRuta | null> {
  const preferRpc = options?.preferRpc !== false
  const { desde, hasta } = rangoFechasLocales(fechaDesde, fechaHasta)

  let meta = rutaMeta
  if (!meta) {
    const { data: ruta } = await supabase
      .from('rutas')
      .select('id, nombre_ruta, color, capital_actual, capital_inicial, cobrador_id')
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

  const { data: rutaCapital } = await supabase
    .from('rutas')
    .select('capital_inicial, capital_actual')
    .eq('id', rutaId)
    .maybeSingle()

  const movimientos: MovimientoCaja[] = []

  const { ids: prestamoIds, clientePorPrestamo } =
    await cargarPrestamoIdsRuta(supabase, rutaId, preferRpc)

  if (prestamoIds.length > 0) {
    const pagos = await cargarPagosRuta(
      supabase,
      prestamoIds,
      fechaDesde,
      fechaHasta,
      preferRpc
    )

    if (pagos.length > 0 && clientePorPrestamo.size === 0) {
      const { data: prestamosNombres } = await supabase
        .from('prestamos')
        .select('id, cliente:clientes(nombre)')
        .in('id', [...new Set(pagos.map((p) => p.prestamo_id))])

      for (const pr of prestamosNombres || []) {
        clientePorPrestamo.set(
          pr.id,
          (pr.cliente as { nombre?: string } | null)?.nombre || 'Cliente'
        )
      }
    }

    for (const p of pagos) {
      const cliente = clientePorPrestamo.get(p.prestamo_id) || 'Cliente'
      movimientos.push({
        id: `pago-${p.id}`,
        fecha: p.fecha_pago,
        tipo: 'pago_recibido',
        monto: Number(p.monto_pagado) || 0,
        es_entrada: true,
        concepto: labelTipo('pago_recibido'),
        detalle: `${cliente}${p.metodo_pago ? ` · ${p.metodo_pago}` : ''}`,
      })
    }
  }

  const { data: prestamos } = await supabase
    .from('prestamos')
    .select('id, monto_prestado, created_at, cliente:clientes(nombre)')
    .eq('ruta_id', rutaId)
    .order('created_at', { ascending: false })

  ;(prestamos || []).forEach((pr) => {
    const fechaPrestamo = pr.created_at
    if (!fechaPrestamo || !estaEnRangoCalendario(fechaPrestamo, fechaDesde, fechaHasta)) return
    movimientos.push({
      id: `prestamo-${pr.id}`,
      fecha: fechaPrestamo,
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
    .select('id, tipo_movimiento, monto, fecha_movimiento, concepto')
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
      m.tipo_movimiento === 'ingreso' ||
      m.tipo_movimiento === 'transferencia_entrada'
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

  let cobrosAcumulados = 0
  if (prestamoIds.length > 0) {
    const { data: pagosAcum } = await supabase
      .from('pagos')
      .select('monto_pagado')
      .in('prestamo_id', prestamoIds)
    cobrosAcumulados = (pagosAcum || []).reduce(
      (s, p) => s + (Number(p.monto_pagado) || 0),
      0
    )
  }

  const { data: prestamosActivos } = await supabase
    .from('prestamos')
    .select('monto_prestado')
    .eq('ruta_id', rutaId)
    .in('estado', ['activo', 'pendiente'])

  const { data: gastosTotales } = await supabase
    .from('gastos')
    .select('monto')
    .eq('ruta_id', rutaId)
    .eq('aprobado', true)

  const desglose_saldo: DesgloseSaldoCaja = {
    capital_inicial: Number(rutaCapital?.capital_inicial) || 0,
    cobros_acumulados: cobrosAcumulados,
    prestamos_activos: (prestamosActivos || []).reduce(
      (s, p) => s + (Number(p.monto_prestado) || 0),
      0
    ),
    gastos_aprobados_total: (gastosTotales || []).reduce(
      (s, g) => s + (Number(g.monto) || 0),
      0
    ),
  }

  return {
    ruta_id: meta.id,
    nombre_ruta: meta.nombre_ruta,
    color: meta.color,
    cobrador_nombre: meta.cobrador_nombre,
    capital_actual: Number(rutaCapital?.capital_actual ?? meta.capital_actual) || 0,
    total_cobrado,
    total_prestado,
    total_prestado_activo: desglose_saldo.prestamos_activos,
    total_gastos,
    desglose_saldo,
    movimientos,
  }
}

/** Préstamos activos/pendientes de la org sin ruta asignada (solo diagnóstico admin) */
export async function fetchAlertaPrestamosSinRuta(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AlertaPrestamosSinRuta> {
  const { data: orgUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)

  const userIds = (orgUsers || []).map((u) => u.id)
  if (userIds.length === 0) {
    return { prestamos_sin_ruta_count: 0, monto_sin_ruta: 0 }
  }

  const { data: sinRuta } = await supabase
    .from('prestamos')
    .select('monto_prestado')
    .in('user_id', userIds)
    .in('estado', ['activo', 'pendiente'])
    .is('ruta_id', null)

  const monto = (sinRuta || []).reduce(
    (s, p) => s + (Number(p.monto_prestado) || 0),
    0
  )

  return {
    prestamos_sin_ruta_count: sinRuta?.length ?? 0,
    monto_sin_ruta: monto,
  }
}

/** Resumen ligero por ruta (admin vista "todas") */
export async function fetchResumenTodasRutas(
  supabase: SupabaseClient,
  rutas: RutaCajaOption[],
  fechaDesde: string,
  fechaHasta: string,
  options?: { preferRpc?: boolean }
): Promise<ResumenCajaRuta[]> {
  const resultados: ResumenCajaRuta[] = []
  for (const ruta of rutas) {
    const resumen = await fetchResumenCajaRuta(
      supabase,
      ruta.id,
      fechaDesde,
      fechaHasta,
      ruta,
      options
    )
    if (resumen) resultados.push({ ...resumen, movimientos: [] })
  }
  return resultados
}
