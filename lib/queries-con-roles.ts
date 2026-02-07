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
    console.error('Detalle del error:', JSON.stringify(error, null, 2))
    throw error
  }
  
  console.log('Clientes cargados desde función RPC:', data?.length || 0)
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
    console.error('Detalle del error:', JSON.stringify(error, null, 2))
    throw error
  }
  
  console.log('Préstamos cargados desde función RPC:', data?.length || 0)
  return data as Prestamo[]
}

/**
 * Obtiene cuotas según el rol del usuario
 */
export async function getCuotasSegunRol() {
  const { data, error } = await supabase.rpc('get_cuotas_segun_rol')
  
  if (error) {
    console.error('Error al obtener cuotas según rol:', error)
    console.error('Detalle del error:', JSON.stringify(error, null, 2))
    throw error
  }
  
  console.log('Cuotas cargadas desde función RPC:', data?.length || 0)
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
    console.log('[getClientesInteligente] Intentando cargar con función RPC...')
    const clientes = await getClientesSegunRol()
    console.log('[getClientesInteligente] ✅ Cargados:', clientes.length, 'clientes')
    return clientes
  } catch (error) {
    console.error('[getClientesInteligente] ❌ Error con función RPC, usando fallback:', error)
    // Fallback a query directa si la función falla
    const clientes = await getClientesPropios()
    console.log('[getClientesInteligente] ⚠️ Fallback exitoso:', clientes.length, 'clientes')
    return clientes
  }
}

export async function getPrestamosInteligente(): Promise<Prestamo[]> {
  try {
    console.log('[getPrestamosInteligente] Intentando cargar con función RPC...')
    const prestamos = await getPrestamosSegunRol()
    console.log('[getPrestamosInteligente] ✅ Cargados:', prestamos.length, 'préstamos')
    return prestamos
  } catch (error) {
    console.error('[getPrestamosInteligente] ❌ Error con función RPC, usando fallback:', error)
    const prestamos = await getPrestamosPropios()
    console.log('[getPrestamosInteligente] ⚠️ Fallback exitoso:', prestamos.length, 'préstamos')
    return prestamos
  }
}
