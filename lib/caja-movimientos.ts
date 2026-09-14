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
  movimientos_manuales_netos: number
  cobros_acumulados: number
  /** SUM(monto_prestado) de todos los préstamos de la ruta (fórmula contable) */
  capital_prestado_historico: number
  /** Capital no recuperado en préstamos activo/pendiente (métrica operativa) */
  capital_pendiente_en_calle: number
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
  /** Suma de capital pendiente en préstamos activo/pendiente de la ruta */
  total_prestado_activo: number
  total_gastos: number
  variacion_periodo: number
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

/** Neto histórico de ingresos/retiros/transferencias (excluye capital inicial duplicado). */
function calcularMovimientosManualesNetos(
  movs: { tipo_movimiento: string; monto: number; concepto?: string | null }[]
): number {
  return movs.reduce((s, m) => {
    const concepto = (m.concepto || '').toLowerCase()
    if (
      m.tipo_movimiento === 'ingreso' &&
      concepto.startsWith('capital inicial')
    ) {
      return s
    }
    if (
      m.tipo_movimiento === 'ingreso' ||
      m.tipo_movimiento === 'transferencia_entrada'
    ) {
      return s + (Number(m.monto) || 0)
    }
    if (
      m.tipo_movimiento === 'retiro' ||
      m.tipo_movimiento === 'transferencia_salida'
    ) {
      return s - (Number(m.monto) || 0)
    }
    return s
  }, 0)
}

/** Suma neta de movimientos visibles en el periodo (no incluye capital liberado al liquidar). */
export function calcularVariacionPeriodo(movimientos: MovimientoCaja[]): number {
  return movimientos.reduce(
    (s, m) => s + (m.es_entrada ? m.monto : -m.monto),
    0
  )
}

type PagoRow = {
  id: string
  prestamo_id: string
  monto_pagado: number
  fecha_pago: string
  metodo_pago: string | null
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

type PrestamoCajaRow = {
  id: string
  monto_prestado: number
  estado: string
  created_at: string
  ruta_id: string | null
  cliente: { nombre?: string } | null
}

function pushMovimientoCapital(
  movimientos: MovimientoCaja[],
  m: {
    id: string
    tipo_movimiento: string
    monto: number
    fecha_movimiento: string
    concepto?: string | null
  }
) {
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
    detalle: m.concepto ?? undefined,
  })
}

/** Carga resúmenes de varias rutas con pocas queries (modo lite omite movimientos). */
export async function fetchResumenesCajaBatch(
  supabase: SupabaseClient,
  rutas: RutaCajaOption[],
  fechaDesde: string,
  fechaHasta: string,
  options?: { lite?: boolean }
): Promise<ResumenCajaRuta[]> {
  if (rutas.length === 0) return []

  const lite = options?.lite === true
  const rutaIds = rutas.map((r) => r.id)
  const { desde, hasta } = rangoFechasLocales(fechaDesde, fechaHasta)

  const [
    prestamosRes,
    rutasCapitalRes,
    gastosPeriodoRes,
    gastosTotalesRes,
    movsPeriodoRes,
    movsManualAllRes,
  ] = await Promise.all([
    supabase
      .from('prestamos')
      .select(
        'id, monto_prestado, estado, created_at, ruta_id, cliente:clientes(nombre)'
      )
      .in('ruta_id', rutaIds),
    supabase
      .from('rutas')
      .select('id, capital_inicial, capital_actual')
      .in('id', rutaIds),
    supabase
      .from('gastos')
      .select('id, monto, fecha_gasto, categoria, descripcion, ruta_id')
      .in('ruta_id', rutaIds)
      .eq('aprobado', true)
      .gte('fecha_gasto', fechaDesde)
      .lte('fecha_gasto', fechaHasta),
    supabase
      .from('gastos')
      .select('monto, ruta_id')
      .in('ruta_id', rutaIds)
      .eq('aprobado', true),
    supabase
      .from('movimientos_capital_ruta')
      .select(
        'id, ruta_id, tipo_movimiento, monto, fecha_movimiento, concepto'
      )
      .in('ruta_id', rutaIds)
      .in('tipo_movimiento', [
        'ingreso',
        'retiro',
        'transferencia_entrada',
        'transferencia_salida',
      ])
      .gte('fecha_movimiento', desde)
      .lte('fecha_movimiento', hasta),
    supabase
      .from('movimientos_capital_ruta')
      .select('ruta_id, tipo_movimiento, monto, concepto')
      .in('ruta_id', rutaIds),
  ])

  const prestamos = (prestamosRes.data || []) as PrestamoCajaRow[]
  const capitalPorRuta = new Map(
    (rutasCapitalRes.data || []).map((r) => [
      r.id,
      {
        capital_inicial: Number(r.capital_inicial) || 0,
        capital_actual: Number(r.capital_actual) || 0,
      },
    ])
  )

  const prestamosPorRuta = new Map<string, PrestamoCajaRow[]>()
  const clientePorPrestamo = new Map<string, string>()
  const prestamoIds: string[] = []

  for (const pr of prestamos) {
    if (!pr.ruta_id) continue
    prestamoIds.push(pr.id)
    const nombre =
      (pr.cliente as { nombre?: string } | null)?.nombre || 'Cliente'
    clientePorPrestamo.set(pr.id, nombre)
    const list = prestamosPorRuta.get(pr.ruta_id) || []
    list.push(pr)
    prestamosPorRuta.set(pr.ruta_id, list)
  }

  let pagosPeriodo: PagoRow[] = []
  let pagosAcum: { prestamo_id: string; monto_pagado: number }[] = []

  if (prestamoIds.length > 0) {
    const [pagosPeriodoRes, pagosAcumRes] = await Promise.all([
      supabase
        .from('pagos')
        .select('id, prestamo_id, monto_pagado, fecha_pago, metodo_pago')
        .in('prestamo_id', prestamoIds)
        .gte('fecha_pago', desde)
        .lte('fecha_pago', hasta)
        .order('fecha_pago', { ascending: false }),
      supabase
        .from('pagos')
        .select('prestamo_id, monto_pagado')
        .in('prestamo_id', prestamoIds),
    ])

    pagosPeriodo = ((pagosPeriodoRes.data || []) as PagoRow[]).filter((p) =>
      estaEnRangoCalendario(p.fecha_pago, fechaDesde, fechaHasta)
    )
    pagosAcum = pagosAcumRes.data || []
  }

  const prestamoToRuta = new Map<string, string>()
  for (const pr of prestamos) {
    if (pr.ruta_id) prestamoToRuta.set(pr.id, pr.ruta_id)
  }

  const pagosPeriodoPorRuta = new Map<string, PagoRow[]>()
  for (const p of pagosPeriodo) {
    const rutaId = prestamoToRuta.get(p.prestamo_id)
    if (!rutaId) continue
    const list = pagosPeriodoPorRuta.get(rutaId) || []
    list.push(p)
    pagosPeriodoPorRuta.set(rutaId, list)
  }

  const cobrosAcumPorRuta = new Map<string, number>()
  for (const p of pagosAcum) {
    const rutaId = prestamoToRuta.get(p.prestamo_id)
    if (!rutaId) continue
    cobrosAcumPorRuta.set(
      rutaId,
      (cobrosAcumPorRuta.get(rutaId) || 0) +
        (Number(p.monto_pagado) || 0)
    )
  }

  const gastosPeriodoPorRuta = new Map<
    string,
    {
      id: string
      monto: number
      fecha_gasto: string
      categoria: string
      descripcion: string
    }[]
  >()
  for (const g of gastosPeriodoRes.data || []) {
    const list = gastosPeriodoPorRuta.get(g.ruta_id) || []
    list.push(g)
    gastosPeriodoPorRuta.set(g.ruta_id, list)
  }

  const gastosTotalesPorRuta = new Map<string, number>()
  for (const g of gastosTotalesRes.data || []) {
    gastosTotalesPorRuta.set(
      g.ruta_id,
      (gastosTotalesPorRuta.get(g.ruta_id) || 0) + (Number(g.monto) || 0)
    )
  }

  const movsPeriodoPorRuta = new Map<
    string,
    {
      id: string
      tipo_movimiento: string
      monto: number
      fecha_movimiento: string
      concepto?: string | null
    }[]
  >()
  for (const m of movsPeriodoRes.data || []) {
    const list = movsPeriodoPorRuta.get(m.ruta_id) || []
    list.push(m)
    movsPeriodoPorRuta.set(m.ruta_id, list)
  }

  const movsManualPorRuta = new Map<
    string,
    { tipo_movimiento: string; monto: number; concepto?: string | null }[]
  >()
  for (const m of movsManualAllRes.data || []) {
    const list = movsManualPorRuta.get(m.ruta_id) || []
    list.push(m)
    movsManualPorRuta.set(m.ruta_id, list)
  }

  return rutas.map((meta) => {
    const rutaId = meta.id
    const prestamosRuta = prestamosPorRuta.get(rutaId) || []
    const capitalRow = capitalPorRuta.get(rutaId)

    const movimientos: MovimientoCaja[] = []

    if (!lite) {
      for (const p of pagosPeriodoPorRuta.get(rutaId) || []) {
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

      for (const pr of prestamosRuta) {
        const fechaPrestamo = pr.created_at
        if (
          !fechaPrestamo ||
          !estaEnRangoCalendario(fechaPrestamo, fechaDesde, fechaHasta)
        ) {
          continue
        }
        movimientos.push({
          id: `prestamo-${pr.id}`,
          fecha: fechaPrestamo,
          tipo: 'prestamo_entregado',
          monto: Number(pr.monto_prestado) || 0,
          es_entrada: false,
          concepto: labelTipo('prestamo_entregado'),
          detalle: clientePorPrestamo.get(pr.id) || 'Cliente',
        })
      }

      for (const g of gastosPeriodoPorRuta.get(rutaId) || []) {
        movimientos.push({
          id: `gasto-${g.id}`,
          fecha: `${g.fecha_gasto}T12:00:00.000Z`,
          tipo: 'gasto',
          monto: Number(g.monto) || 0,
          es_entrada: false,
          concepto: labelTipo('gasto'),
          detalle: `${g.categoria} — ${g.descripcion}`,
        })
      }

      for (const m of movsPeriodoPorRuta.get(rutaId) || []) {
        pushMovimientoCapital(movimientos, m)
      }

      movimientos.sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )
    } else {
      const total_cobrado_lite = (pagosPeriodoPorRuta.get(rutaId) || []).reduce(
        (s, p) => s + (Number(p.monto_pagado) || 0),
        0
      )
      const total_prestado_lite = prestamosRuta.reduce((s, pr) => {
        if (
          !pr.created_at ||
          !estaEnRangoCalendario(pr.created_at, fechaDesde, fechaHasta)
        ) {
          return s
        }
        return s + (Number(pr.monto_prestado) || 0)
      }, 0)
      const total_gastos_lite = (gastosPeriodoPorRuta.get(rutaId) || []).reduce(
        (s, g) => s + (Number(g.monto) || 0),
        0
      )
      const variacion_lite =
        total_cobrado_lite - total_prestado_lite - total_gastos_lite
      const movsCap = movsPeriodoPorRuta.get(rutaId) || []
      const variacion_capital = movsCap.reduce((s, m) => {
        const esEntrada =
          m.tipo_movimiento === 'ingreso' ||
          m.tipo_movimiento === 'transferencia_entrada'
        return s + (esEntrada ? Number(m.monto) || 0 : -(Number(m.monto) || 0))
      }, 0)

      const capitalPrestadoHistorico = prestamosRuta.reduce(
        (s, p) => s + (Number(p.monto_prestado) || 0),
        0
      )
      const capitalPendienteEnCalle = prestamosRuta
        .filter((p) => p.estado === 'activo' || p.estado === 'pendiente')
        .reduce((s, p) => s + (Number(p.monto_prestado) || 0), 0)

      const desglose_saldo: DesgloseSaldoCaja = {
        capital_inicial: capitalRow?.capital_inicial ?? 0,
        movimientos_manuales_netos: calcularMovimientosManualesNetos(
          movsManualPorRuta.get(rutaId) || []
        ),
        cobros_acumulados: cobrosAcumPorRuta.get(rutaId) || 0,
        capital_prestado_historico: capitalPrestadoHistorico,
        capital_pendiente_en_calle: capitalPendienteEnCalle,
        gastos_aprobados_total: gastosTotalesPorRuta.get(rutaId) || 0,
      }

      return {
        ruta_id: meta.id,
        nombre_ruta: meta.nombre_ruta,
        color: meta.color,
        cobrador_nombre: meta.cobrador_nombre,
        capital_actual:
          capitalRow?.capital_actual ?? meta.capital_actual ?? 0,
        total_cobrado: total_cobrado_lite,
        total_prestado: total_prestado_lite,
        total_prestado_activo: capitalPendienteEnCalle,
        total_gastos: total_gastos_lite,
        variacion_periodo: variacion_lite + variacion_capital,
        desglose_saldo,
        movimientos: [],
      }
    }

    const total_cobrado = movimientos
      .filter((m) => m.tipo === 'pago_recibido')
      .reduce((s, m) => s + m.monto, 0)
    const total_prestado = movimientos
      .filter((m) => m.tipo === 'prestamo_entregado')
      .reduce((s, m) => s + m.monto, 0)
    const total_gastos = movimientos
      .filter((m) => m.tipo === 'gasto')
      .reduce((s, m) => s + m.monto, 0)

    const capitalPrestadoHistorico = prestamosRuta.reduce(
      (s, p) => s + (Number(p.monto_prestado) || 0),
      0
    )
    const capitalPendienteEnCalle = prestamosRuta
      .filter((p) => p.estado === 'activo' || p.estado === 'pendiente')
      .reduce((s, p) => s + (Number(p.monto_prestado) || 0), 0)

    const desglose_saldo: DesgloseSaldoCaja = {
      capital_inicial: capitalRow?.capital_inicial ?? 0,
      movimientos_manuales_netos: calcularMovimientosManualesNetos(
        movsManualPorRuta.get(rutaId) || []
      ),
      cobros_acumulados: cobrosAcumPorRuta.get(rutaId) || 0,
      capital_prestado_historico: capitalPrestadoHistorico,
      capital_pendiente_en_calle: capitalPendienteEnCalle,
      gastos_aprobados_total: gastosTotalesPorRuta.get(rutaId) || 0,
    }

    return {
      ruta_id: meta.id,
      nombre_ruta: meta.nombre_ruta,
      color: meta.color,
      cobrador_nombre: meta.cobrador_nombre,
      capital_actual: capitalRow?.capital_actual ?? meta.capital_actual ?? 0,
      total_cobrado,
      total_prestado,
      total_prestado_activo: capitalPendienteEnCalle,
      total_gastos,
      variacion_periodo: calcularVariacionPeriodo(movimientos),
      desglose_saldo,
      movimientos,
    }
  })
}

export async function fetchResumenCajaRuta(
  supabase: SupabaseClient,
  rutaId: string,
  fechaDesde: string,
  fechaHasta: string,
  rutaMeta?: RutaCajaOption,
  _options?: { preferRpc?: boolean }
): Promise<ResumenCajaRuta | null> {
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

  const [resumen] = await fetchResumenesCajaBatch(
    supabase,
    [meta],
    fechaDesde,
    fechaHasta,
    { lite: false }
  )
  return resumen ?? null
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
  _options?: { preferRpc?: boolean }
): Promise<ResumenCajaRuta[]> {
  return fetchResumenesCajaBatch(supabase, rutas, fechaDesde, fechaHasta, {
    lite: true,
  })
}
