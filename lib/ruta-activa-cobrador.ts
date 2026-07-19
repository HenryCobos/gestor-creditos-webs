import type { SupabaseClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'cobrador_ruta_activa_id'

export interface RutaCobradorOption {
  id: string
  nombre_ruta: string
  color: string | null
}

export function getRutaActivaCobrador(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setRutaActivaCobrador(rutaId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, rutaId)
  } catch {
    // ignore quota / private mode
  }
}

export function clearRutaActivaCobrador(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Rutas activas donde el usuario es cobrador asignado */
export async function cargarRutasDelCobrador(
  supabase: SupabaseClient,
  userId: string
): Promise<RutaCobradorOption[]> {
  const { data, error } = await supabase
    .from('rutas')
    .select('id, nombre_ruta, color')
    .eq('cobrador_id', userId)
    .eq('estado', 'activa')
    .order('nombre_ruta', { ascending: true })

  if (error) {
    console.error('[ruta-activa-cobrador] Error cargando rutas:', error)
    return []
  }

  return (data || []).map((r) => ({
    id: r.id,
    nombre_ruta: r.nombre_ruta,
    color: r.color,
  }))
}

/**
 * Resuelve la ruta activa del cobrador:
 * 1) localStorage si sigue siendo ruta válida del cobrador
 * 2) única ruta activa → auto-guardar
 * 3) varias rutas → primera (el selector permite cambiar)
 */
export async function resolverRutaActivaCobrador(
  supabase: SupabaseClient,
  userId: string
): Promise<{ rutaId: string | null; rutas: RutaCobradorOption[] }> {
  const rutas = await cargarRutasDelCobrador(supabase, userId)
  if (rutas.length === 0) {
    clearRutaActivaCobrador()
    return { rutaId: null, rutas }
  }

  const guardada = getRutaActivaCobrador()
  const guardadaValida = guardada && rutas.some((r) => r.id === guardada)

  if (guardadaValida) {
    return { rutaId: guardada, rutas }
  }

  const elegida = rutas[0].id
  setRutaActivaCobrador(elegida)
  return { rutaId: elegida, rutas }
}
