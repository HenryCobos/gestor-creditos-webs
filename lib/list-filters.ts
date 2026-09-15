import type { Cliente, Prestamo } from '@/lib/store'

export type RutaFilterValue = 'todos' | 'sin_ruta' | string

export interface PrestamoFilterOptions {
  search?: string
  estado?: string
  rutaId?: RutaFilterValue
  frecuencia?: string
  /** IDs de préstamos con al menos una cuota retrasada (effectiveCuotaEstado). */
  prestamoIdsConCuotaRetrasada?: Set<string>
}

function isEstadoConCuotasAtrasadas(estado: string): boolean {
  return estado === 'con_cuotas_atrasadas' || estado === 'retrasado'
}

function prestamoMatchesEstado(
  prestamo: Prestamo,
  estado: string,
  prestamoIdsConCuotaRetrasada?: Set<string>
): boolean {
  if (estado === 'todos') return true

  if (isEstadoConCuotasAtrasadas(estado)) {
    if (prestamo.estado === 'pagado') return false
    return prestamoIdsConCuotaRetrasada?.has(prestamo.id) ?? false
  }

  return prestamo.estado === estado
}

export interface ClienteFilterOptions {
  search?: string
  rutaId?: RutaFilterValue
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase()
}

function prestamoMatchesSearch(prestamo: Prestamo, search: string): boolean {
  const q = normalizeSearch(search)
  if (!q) return true

  const cliente = prestamo.cliente
  const fields = [
    cliente?.nombre,
    cliente?.dni,
    cliente?.telefono,
    String(prestamo.monto_prestado),
    String(prestamo.monto_total),
    prestamo.estado,
  ]

  return fields.some((f) => f && String(f).toLowerCase().includes(q))
}

function prestamoMatchesRuta(prestamo: Prestamo, rutaId: RutaFilterValue): boolean {
  if (rutaId === 'todos') return true
  if (rutaId === 'sin_ruta') return !prestamo.ruta_id
  return prestamo.ruta_id === rutaId
}

export function filterPrestamos(
  prestamos: Prestamo[],
  options: PrestamoFilterOptions
): Prestamo[] {
  const {
    search = '',
    estado = 'todos',
    rutaId = 'todos',
    frecuencia = 'todas',
    prestamoIdsConCuotaRetrasada,
  } = options

  return prestamos.filter((prestamo) => {
    if (!prestamoMatchesSearch(prestamo, search)) return false
    if (!prestamoMatchesEstado(prestamo, estado, prestamoIdsConCuotaRetrasada)) return false
    if (frecuencia !== 'todas' && prestamo.frecuencia_pago !== frecuencia) return false
    if (!prestamoMatchesRuta(prestamo, rutaId)) return false
    return true
  })
}

export function clienteMatchesRuta(
  clienteId: string,
  rutaId: RutaFilterValue,
  rutaClientesMap: Map<string, string>,
  prestamosVisibles: Pick<Prestamo, 'cliente_id' | 'ruta_id'>[]
): boolean {
  if (rutaId === 'todos') return true

  const rutaAsignada = rutaClientesMap.get(clienteId)
  const prestamosDelCliente = prestamosVisibles.filter((p) => p.cliente_id === clienteId)
  const tienePrestamoEnRuta = prestamosDelCliente.some((p) => p.ruta_id === rutaId)
  const tieneAlgunPrestamoConRuta = prestamosDelCliente.some((p) => !!p.ruta_id)

  if (rutaId === 'sin_ruta') {
    return !rutaAsignada && !tieneAlgunPrestamoConRuta
  }

  if (rutaAsignada === rutaId) return true
  return tienePrestamoEnRuta
}

function clienteMatchesSearch(cliente: Cliente, search: string): boolean {
  const q = normalizeSearch(search)
  if (!q) return true

  return (
    cliente.nombre.toLowerCase().includes(q) ||
    cliente.dni.toLowerCase().includes(q) ||
    (cliente.telefono?.toLowerCase().includes(q) ?? false) ||
    (cliente.direccion?.toLowerCase().includes(q) ?? false) ||
    (cliente.cuenta_bancaria?.toLowerCase().includes(q) ?? false)
  )
}

export function filterClientes(
  clientes: Cliente[],
  options: ClienteFilterOptions,
  rutaClientesMap: Map<string, string>,
  prestamosVisibles: Pick<Prestamo, 'cliente_id' | 'ruta_id'>[]
): Cliente[] {
  const { search = '', rutaId = 'todos' } = options

  return clientes.filter((cliente) => {
    if (!clienteMatchesSearch(cliente, search)) return false
    if (!clienteMatchesRuta(cliente.id, rutaId, rutaClientesMap, prestamosVisibles)) {
      return false
    }
    return true
  })
}

export function buildRutaClientesMap(
  rows: { cliente_id: string; ruta_id: string }[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(row.cliente_id, row.ruta_id)
  }
  return map
}
