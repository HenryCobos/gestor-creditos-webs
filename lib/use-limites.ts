// Hook para obtener y gestionar límites de la organización
import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import {
  fetchLimitesOrganizacion,
  type LimitesOrganizacion,
} from './subscription-helpers'

export type { LimitesOrganizacion }

export interface UsoUsuario {
  user_id: string
  email: string
  full_name: string
  role: string
  organization_id: string
  limite_clientes: number | null
  limite_prestamos: number | null
  clientes_usados: number
  prestamos_usados: number
  clientes_disponibles: number | null
  prestamos_disponibles: number | null
}

export function useLimitesOrganizacion() {
  const [limites, setLimites] = useState<LimitesOrganizacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLimites = async () => {
    try {
      setLoading(true)
      const data = await fetchLimitesOrganizacion()

      if (!data) {
        setLimites(null)
        setError(null)
        return
      }

      setLimites(data)
      setError(null)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudieron cargar los límites'
      console.error('Error fetching limites:', message, err)
      setError(message)
      setLimites(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLimites()
  }, [])

  return { limites, loading, error, refetch: fetchLimites }
}

export function useUsoPorUsuario() {
  const [usoUsuarios, setUsoUsuarios] = useState<UsoUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchUso = async () => {
    try {
      setLoading(true)
      const { data, error: rpcError } = await supabase.rpc('get_uso_por_usuario')

      if (rpcError) throw rpcError

      setUsoUsuarios((data || []) as UsoUsuario[])
      setError(null)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Error al cargar uso por usuario'
      console.error('Error fetching uso por usuario:', message, err)
      setError(message)
      setUsoUsuarios([])
    } finally {
      setLoading(false)
    }
  }

  const updateLimitesUsuario = async (
    userId: string,
    limiteClientes: number | null,
    limitePrestamos: number | null
  ) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          limite_clientes: limiteClientes,
          limite_prestamos: limitePrestamos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      await fetchUso()
      return { success: true }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Error al actualizar límites'
      console.error('Error updating limites:', message, err)
      return { success: false, error: message }
    }
  }

  useEffect(() => {
    fetchUso()
  }, [])

  return {
    usoUsuarios,
    loading,
    error,
    refetch: fetchUso,
    updateLimitesUsuario,
  }
}
