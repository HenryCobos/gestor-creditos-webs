/** Tipos y builders de límites — sin "use client" (usable en API/server) */

export interface LimitesOrganizacion {
  organization_id: string
  plan_nombre: string
  plan_slug: string
  limite_clientes: number
  limite_prestamos: number
  clientes_usados: number
  prestamos_usados: number
  clientes_disponibles: number
  prestamos_disponibles: number
  porcentaje_clientes: number
  porcentaje_prestamos: number
  puede_crear_cliente: boolean
  puede_crear_prestamo: boolean
}

export function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function buildLimitesOrganizacion(
  organizationId: string,
  plan: { nombre: string; slug: string; limite_clientes: number; limite_prestamos: number },
  clientesUsados: number,
  prestamosUsados: number
): LimitesOrganizacion {
  const limiteClientes = plan.limite_clientes
  const limitePrestamos = plan.limite_prestamos
  const clientesDisponibles = Math.max(0, limiteClientes - clientesUsados)
  const prestamosDisponibles = Math.max(0, limitePrestamos - prestamosUsados)

  return {
    organization_id: organizationId,
    plan_nombre: plan.nombre,
    plan_slug: plan.slug,
    limite_clientes: limiteClientes,
    limite_prestamos: limitePrestamos,
    clientes_usados: clientesUsados,
    prestamos_usados: prestamosUsados,
    clientes_disponibles: clientesDisponibles,
    prestamos_disponibles: prestamosDisponibles,
    porcentaje_clientes:
      limiteClientes > 0
        ? Math.round((clientesUsados / limiteClientes) * 10000) / 100
        : 0,
    porcentaje_prestamos:
      limitePrestamos > 0
        ? Math.round((prestamosUsados / limitePrestamos) * 10000) / 100
        : 0,
    puede_crear_cliente: clientesUsados < limiteClientes,
    puede_crear_prestamo: prestamosUsados < limitePrestamos,
  }
}

export function mapRpcRowToLimites(row: Record<string, unknown>): LimitesOrganizacion {
  const limiteClientes = toNumber(row.limite_clientes)
  const limitePrestamos = toNumber(row.limite_prestamos)
  const clientesUsados = toNumber(row.clientes_usados)
  const prestamosUsados = toNumber(row.prestamos_usados)

  return buildLimitesOrganizacion(
    String(row.organization_id),
    {
      nombre: String(row.plan_nombre ?? 'Plan'),
      slug: String(row.plan_slug ?? 'free'),
      limite_clientes: limiteClientes,
      limite_prestamos: limitePrestamos,
    },
    clientesUsados,
    prestamosUsados
  )
}

export type PlanLimitesRaw = {
  nombre?: string
  slug?: string
  limite_clientes?: number
  limite_prestamos?: number
}

export function normalizePlanFromJoin(plan: unknown): PlanLimitesRaw | null {
  if (!plan) return null
  const raw = Array.isArray(plan) ? plan[0] : plan
  if (!raw || typeof raw !== 'object') return null
  return raw as PlanLimitesRaw
}
