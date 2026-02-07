/**
 * Queries con soporte de roles usando funciones SECURITY DEFINER
 * 
 * Este módulo reemplaza las queries directas con llamadas a funciones
 * de Supabase que respetan la lógica de roles (admin/cobrador).
 */

import { createClient } from './supabase/client'
import type { Cliente, Prestamo, Cuota, Pago } from './store'

const supabase = createClient()

/**
 * Obtiene clientes según el rol del usuario:
 * - Admin: todos los clientes de la organización
 * - Cobrador: solo clientes de sus rutas
 * - Usuario normal: solo sus propios clientes
 */
export async function getClientesSegunRol() {
  const { data, error } = await supabase.rpc('get_clientes_segun_rol')
  
  if (error) {
    console.error('Error al obtener clientes según rol:', error)
    throw error
  }
  
  return data as Cliente[]
}

/**
 * Obtiene préstamos según el rol del usuario:
 * - Admin: todos los préstamos de la organización
 * - Cobrador: solo préstamos de sus rutas
 * - Usuario normal: solo sus propios préstamos
 */
export async function getPrestamosSegunRol() {
  const { data, error } = await supabase.rpc('get_prestamos_segun_rol')
  
  if (error) {
    console.error('Error al obtener préstamos según rol:', error)
    throw error
  }
  
  return data as Prestamo[]
}

/**
 * Obtiene cuotas según el rol del usuario
 */
export async function getCuotasSegunRol() {
  const { data, error } = await supabase.rpc('get_cuotas_segun_rol')
  
  if (error) {
    console.error('Error al obtener cuotas según rol:', error)
    throw error
  }
  
  return data as Cuota[]
}

/**
 * Obtiene pagos según el rol del usuario
 */
export async function getPagosSegunRol() {
  const { data, error } = await supabase.rpc('get_pagos_segun_rol')
  
  if (error) {
    console.error('Error al obtener pagos según rol:', error)
    throw error
  }
  
  return data as Pago[]
}

/**
 * Verifica si el usuario puede acceder a un cliente específico
 */
export async function puedeAccederCliente(clienteId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('puede_acceder_cliente', {
    cliente_id_param: clienteId
  })
  
  if (error) {
    console.error('Error al verificar acceso a cliente:', error)
    return false
  }
  
  return data as boolean
}

/**
 * Verifica si el usuario puede acceder a un préstamo específico
 */
export async function puedeAccederPrestamo(prestamoId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('puede_acceder_prestamo', {
    prestamo_id_param: prestamoId
  })
  
  if (error) {
    console.error('Error al verificar acceso a préstamo:', error)
    return false
  }
  
  return data as boolean
}

/**
 * FALLBACK: Query directa para usuarios sin organización (backward compatibility)
 * Solo devuelve datos propios
 */
export async function getClientesPropios() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('user_id', user.id)
    .order('nombre')
  
  if (error) throw error
  return data as Cliente[]
}

/**
 * FALLBACK: Query directa para préstamos propios
 */
export async function getPrestamosPropios() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  
  const { data, error } = await supabase
    .from('prestamos')
    .select(`
      *,
      cliente:clientes(*),
      ruta:rutas(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Prestamo[]
}

/**
 * Hook para determinar qué función usar según el contexto del usuario
 */
export async function getClientesInteligente(): Promise<Cliente[]> {
  try {
    // Intentar primero con la función que respeta roles
    return await getClientesSegunRol()
  } catch (error) {
    console.warn('Fallback a query directa para clientes:', error)
    // Fallback a query directa si la función falla
    return await getClientesPropios()
  }
}

export async function getPrestamosInteligente(): Promise<Prestamo[]> {
  try {
    return await getPrestamosSegunRol()
  } catch (error) {
    console.warn('Fallback a query directa para préstamos:', error)
    return await getPrestamosPropios()
  }
}
