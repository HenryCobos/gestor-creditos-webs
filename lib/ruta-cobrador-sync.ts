import type { SupabaseClient } from '@supabase/supabase-js'
import { resolverRutaActivaCobrador } from '@/lib/ruta-activa-cobrador'

/**
 * Vincula un cliente a la ruta activa del cobrador vía RPC SECURITY DEFINER.
 * Requiere que exista la función asignar_cliente_a_ruta_cobrador en Supabase.
 */
export async function asegurarClienteEnRutaActiva(
  supabase: SupabaseClient,
  clienteId: string,
  rutaId?: string | null,
  userId?: string
): Promise<string | null> {
  let rutaDestino = rutaId ?? null

  if (!rutaDestino && userId) {
    const { rutaId: resuelta } = await resolverRutaActivaCobrador(supabase, userId)
    rutaDestino = resuelta
  }

  const { data, error } = await supabase.rpc('asignar_cliente_a_ruta_cobrador', {
    p_cliente_id: clienteId,
    p_ruta_id: rutaDestino,
  })

  if (error) {
    console.error('[ruta-cobrador-sync] RPC error:', error)
    return null
  }

  return (data as string | null) ?? rutaDestino
}
