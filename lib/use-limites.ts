// Hook para obtener y gestionar límites de la organización
import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'

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
  const supabase = createClient()

  const fetchLimites = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('get_limites_organizacion')
        .single()

      if (error) throw error

      setLimites(data)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching limites:', err)
      setError(err.message)
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
      const { data, error } = await supabase.rpc('get_uso_por_usuario')

      if (error) throw error

      setUsoUsuarios(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching uso por usuario:', err)
      setError(err.message)
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
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      await fetchUso() // Refrescar datos
      return { success: true }
    } catch (err: any) {
      console.error('Error updating limites:', err)
      return { success: false, error: err.message }
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
    updateLimitesUsuario 
  }
}
