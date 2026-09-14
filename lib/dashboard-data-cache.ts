import { useStore } from '@/lib/store'

export function hasDashboardListCache(): boolean {
  const s = useStore.getState()
  return s.clientes.length > 0 || s.prestamos.length > 0 || s.cuotas.length > 0
}

export function hydrateDashboardMetricsFromStore(): {
  clientes: ReturnType<typeof useStore.getState>['clientes']
  prestamos: ReturnType<typeof useStore.getState>['prestamos']
  cuotas: ReturnType<typeof useStore.getState>['cuotas']
} {
  const s = useStore.getState()
  const clientes = s.clientes
  const cuotas = s.cuotas
  let prestamos = s.prestamos
  if (prestamos.length > 0 && clientes.length > 0) {
    prestamos = prestamos.map((p) => ({
      ...p,
      cliente: clientes.find((c) => c.id === p.cliente_id) ?? p.cliente,
    }))
  }
  return { clientes, prestamos, cuotas }
}
