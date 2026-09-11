import type { SupabaseClient } from '@supabase/supabase-js'
import { cargarRutasDelCobrador } from '@/lib/ruta-activa-cobrador'
import { buildRutaClientesMap } from '@/lib/list-filters'

export interface RutaFiltroOption {
  id: string
  nombre_ruta: string
  color: string | null
}

export async function loadRutasParaFiltro(
  supabase: SupabaseClient,
  params: {
    role: 'admin' | 'cobrador'
    userId: string
    organizationId: string | null
  }
): Promise<RutaFiltroOption[]> {
  const { role, userId, organizationId } = params

  if (role === 'cobrador') {
    return cargarRutasDelCobrador(supabase, userId)
  }

  if (!organizationId) return []

  const { data, error } = await supabase
    .from('rutas')
    .select('id, nombre_ruta, color')
    .eq('organization_id', organizationId)
    .eq('estado', 'activa')
    .order('nombre_ruta', { ascending: true })

  if (error) {
    console.error('[loadRutasParaFiltro] Error:', error)
    return []
  }

  return (data || []).map((r) => ({
    id: r.id,
    nombre_ruta: r.nombre_ruta,
    color: r.color,
  }))
}

export async function loadRutaClientesMap(
  supabase: SupabaseClient,
  clienteIds?: string[]
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('ruta_clientes')
    .select('cliente_id, ruta_id')
    .eq('activo', true)

  if (error) {
    console.error('[loadRutaClientesMap] Error:', error)
    return new Map()
  }

  let rows = data || []
  if (clienteIds && clienteIds.length > 0) {
    const idSet = new Set(clienteIds)
    rows = rows.filter((r) => idSet.has(r.cliente_id))
  }

  return buildRutaClientesMap(rows)
}
