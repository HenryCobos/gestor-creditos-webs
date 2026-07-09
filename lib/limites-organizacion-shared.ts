/** Tipos y builders de límites — sin "use client" (usable en API/server) */

export interface LimitesOrganizacion {
  organization_id: string
  plan_nombre: string
  plan_slug: string
  limite_clientes: number
  limite_prestamos: number
  limite_usuarios: number
  clientes_usados: number
  prestamos_usados: number
  usuarios_usados: number
  clientes_disponibles: number
  prestamos_disponibles: number
  usuarios_disponibles: number
  porcentaje_clientes: number
  porcentaje_prestamos: number
  porcentaje_usuarios: number
  puede_crear_cliente: boolean
  puede_crear_prestamo: boolean
  puede_crear_usuario: boolean
}

export function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function buildLimitesOrganizacion(
  organizationId: string,
  plan: {
    nombre: string
    slug: string
    limite_clientes: number
    limite_prestamos: number
    limite_usuarios: number
  },
  counts: {
    clientesUsados: number
    prestamosUsados: number
    usuariosUsados: number
  }
): LimitesOrganizacion {
  const limiteClientes = plan.limite_clientes
  const limitePrestamos = plan.limite_prestamos
  const limiteUsuarios = plan.limite_usuarios
  const { clientesUsados, prestamosUsados, usuariosUsados } = counts

  const clientesDisponibles = Math.max(0, limiteClientes - clientesUsados)
  const prestamosDisponibles = Math.max(0, limitePrestamos - prestamosUsados)
  const usuariosDisponibles =
    limiteUsuarios === 0 ? 999999 : Math.max(0, limiteUsuarios - usuariosUsados)

  const puedeCrearUsuario =
    limiteUsuarios === 0 || usuariosUsados < limiteUsuarios

  return {
    organization_id: organizationId,
    plan_nombre: plan.nombre,
    plan_slug: plan.slug,
    limite_clientes: limiteClientes,
    limite_prestamos: limitePrestamos,
    limite_usuarios: limiteUsuarios,
    clientes_usados: clientesUsados,
    prestamos_usados: prestamosUsados,
    usuarios_usados: usuariosUsados,
    clientes_disponibles: clientesDisponibles,
    prestamos_disponibles: prestamosDisponibles,
    usuarios_disponibles: usuariosDisponibles,
    porcentaje_clientes:
      limiteClientes > 0
        ? Math.round((clientesUsados / limiteClientes) * 10000) / 100
        : 0,
    porcentaje_prestamos:
      limitePrestamos > 0
        ? Math.round((prestamosUsados / limitePrestamos) * 10000) / 100
        : 0,
    porcentaje_usuarios:
      limiteUsuarios > 0
        ? Math.round((usuariosUsados / limiteUsuarios) * 10000) / 100
        : 0,
    puede_crear_cliente: clientesUsados < limiteClientes,
    puede_crear_prestamo: prestamosUsados < limitePrestamos,
    puede_crear_usuario: puedeCrearUsuario,
  }
}

export function mapRpcRowToLimites(row: Record<string, unknown>): LimitesOrganizacion {
  const limiteClientes = toNumber(row.limite_clientes)
  const limitePrestamos = toNumber(row.limite_prestamos)
  const limiteUsuarios = toNumber(row.limite_usuarios)
  const clientesUsados = toNumber(row.clientes_usados)
  const prestamosUsados = toNumber(row.prestamos_usados)
  const usuariosUsados = toNumber(row.usuarios_usados)

  const base = buildLimitesOrganizacion(
    String(row.organization_id),
    {
      nombre: String(row.plan_nombre ?? 'Plan'),
      slug: String(row.plan_slug ?? 'free'),
      limite_clientes: limiteClientes,
      limite_prestamos: limitePrestamos,
      limite_usuarios: limiteUsuarios,
    },
    { clientesUsados, prestamosUsados, usuariosUsados }
  )

  if (row.puede_crear_usuario !== undefined) {
    base.puede_crear_usuario = Boolean(row.puede_crear_usuario)
  }
  if (row.puede_crear_cliente !== undefined) {
    base.puede_crear_cliente = Boolean(row.puede_crear_cliente)
  }
  if (row.puede_crear_prestamo !== undefined) {
    base.puede_crear_prestamo = Boolean(row.puede_crear_prestamo)
  }

  return base
}

export type PlanLimitesRaw = {
  nombre?: string
  slug?: string
  limite_clientes?: number
  limite_prestamos?: number
  limite_usuarios?: number
}

export function normalizePlanFromJoin(plan: unknown): PlanLimitesRaw | null {
  if (!plan) return null
  const raw = Array.isArray(plan) ? plan[0] : plan
  if (!raw || typeof raw !== 'object') return null
  return raw as PlanLimitesRaw
}
