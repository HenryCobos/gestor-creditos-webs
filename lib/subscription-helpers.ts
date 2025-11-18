"use client"

import { createClient } from '@/lib/supabase/client'
import type { Plan, UserSubscription, UsageLimits } from './subscription-store'

export async function loadUserSubscription(): Promise<UserSubscription | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      plan_id,
      subscription_status,
      subscription_period,
      subscription_start_date,
      subscription_end_date,
      paypal_subscription_id,
      payment_method,
      plan:planes(*)
    `)
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    plan_id: profile.plan_id,
    plan: profile.plan as any,
    subscription_status: profile.subscription_status || 'active',
    subscription_period: profile.subscription_period || 'monthly',
    subscription_start_date: profile.subscription_start_date,
    subscription_end_date: profile.subscription_end_date,
    paypal_subscription_id: profile.paypal_subscription_id,
    payment_method: profile.payment_method,
  }
}

export async function loadPlans(): Promise<Plan[]> {
  const supabase = createClient()
  
  const { data } = await supabase
    .from('planes')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })

  return (data || []) as Plan[]
}

export async function loadUsageLimits(): Promise<UsageLimits | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Obtener límites del plan
  const { data: limitsData } = await supabase
    .rpc('get_user_plan_limits', { user_uuid: user.id })
    .single()

  if (!limitsData) return null

  // Cast explícito del tipo de datos
  const limits = limitsData as any

  // Contar clientes actuales
  const { count: clientesCount } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Contar préstamos activos
  const { count: prestamosCount } = await supabase
    .from('prestamos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('estado', 'activo')

  const limiteClientes = limits.limite_clientes || 0
  const limitePrestamos = limits.limite_prestamos || 0

  return {
    clientes: {
      current: clientesCount || 0,
      limit: limiteClientes,
      canAdd: limiteClientes === 0 || (clientesCount || 0) < limiteClientes,
    },
    prestamos: {
      current: prestamosCount || 0,
      limit: limitePrestamos,
      canAdd: limitePrestamos === 0 || (prestamosCount || 0) < limitePrestamos,
    },
    usuarios: {
      current: 1,
      limit: limits.limite_usuarios || 1,
      canAdd: false, // Por ahora solo soportamos 1 usuario
    },
  }
}

export async function upgradePlan(
  planId: string, 
  period: 'monthly' | 'yearly', 
  paypalSubscriptionId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  const updateData: any = {
    plan_id: planId,
    subscription_period: period,
    subscription_status: 'active',
    subscription_start_date: new Date().toISOString(),
    payment_method: 'paypal',
  }

  // Agregar subscription_id si está disponible
  if (paypalSubscriptionId) {
    updateData.paypal_subscription_id = paypalSubscriptionId
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function cancelSubscription(): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  // Obtener el plan gratuito
  const { data: freePlan } = await supabase
    .from('planes')
    .select('id')
    .eq('slug', 'free')
    .single()

  if (!freePlan) {
    return { success: false, error: 'No se encontró el plan gratuito' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      plan_id: freePlan.id,
      subscription_status: 'cancelled',
      subscription_end_date: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export function getPlanBenefits(slug: string): string[] {
  const benefits: Record<string, string[]> = {
    free: [
      'Hasta 5 clientes',
      'Hasta 5 préstamos activos',
      'Historial de 30 días',
      'Reportes básicos',
      'Soporte por email',
    ],
    pro: [
      'Hasta 50 clientes',
      'Hasta 50 préstamos activos',
      'Historial ilimitado',
      'Exportación PDF ilimitada',
      'Sin marca de agua',
      'Reportes avanzados',
      'Soporte prioritario (24h)',
    ],
    business: [
      'Hasta 200 clientes',
      'Hasta 200 préstamos activos',
      'Hasta 3 usuarios',
      'Todo del plan Pro',
      'Recordatorios automáticos',
      'Roles y permisos',
      'API básica',
      'Soporte prioritario (12h)',
    ],
    enterprise: [
      'Clientes ILIMITADOS',
      'Préstamos ILIMITADOS',
      'Usuarios ILIMITADOS',
      'Todo del plan Business',
      'Marca blanca',
      'API completa',
      'Scoring de crédito',
      'Soporte 24/7',
      'Gerente dedicado',
    ],
  }

  return benefits[slug] || []
}

