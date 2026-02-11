"use client"

import { createClient } from '@/lib/supabase/client'
import type { Plan, UserSubscription, UsageLimits } from './subscription-store'

// Función para cargar todos los planes disponibles
export async function loadPlans(): Promise<Plan[]> {
  const supabase = createClient()
  
  try {
    const { data: planes, error } = await supabase
      .from('planes')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })

    if (error) {
      console.error('[loadPlans] Error cargando planes:', error)
      return []
    }

    return (planes || []) as Plan[]
  } catch (error) {
    console.error('[loadPlans] Error:', error)
    return []
  }
}

// Función auxiliar para obtener beneficios de un plan según su slug
export function getPlanBenefits(planSlug: string): string[] {
  const benefitsByPlan: Record<string, string[]> = {
    free: [
      'Hasta 5 clientes activos',
      'Hasta 5 préstamos activos',
      'Gestión básica de préstamos',
      'Cálculo automático de cuotas',
      'Registro de pagos',
    ],
    pro: [
      'Hasta 50 clientes activos',
      'Hasta 50 préstamos activos',
      'Exportación de reportes en PDF sin marca de agua',
      'Recordatorios automáticos de pagos',
      'Soporte prioritario por email',
      'Historial de 90 días',
      'Reportes avanzados',
    ],
    business: [
      'Hasta 200 clientes activos',
      'Hasta 200 préstamos activos',
      'Multi-usuario: Hasta 5 usuarios',
      'Gestión de rutas y cobradores',
      'Exportación ilimitada de reportes',
      'Recordatorios por email y WhatsApp',
      'API para integración externa',
      'Soporte premium 24/7',
      'Historial ilimitado',
      'Reportes personalizados',
    ],
    enterprise: [
      'Clientes ilimitados',
      'Préstamos ilimitados',
      'Multi-usuario: Usuarios ilimitados',
      'Gestión avanzada de rutas',
      'Marca blanca (white label)',
      'API completa para integración',
      'Base de datos dedicada',
      'Soporte premium 24/7',
      'Historial ilimitado',
      'Capacitación personalizada',
      'Desarrollo de funciones a medida',
    ],
  }

  return benefitsByPlan[planSlug] || benefitsByPlan.free
}

// NUEVA FUNCIÓN: Cargar suscripción a nivel de organización
export async function loadOrganizationSubscription(): Promise<UserSubscription | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  try {
    // Obtener perfil con organización
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      console.log('[loadOrganizationSubscription] Usuario sin organización, devolviendo null')
      // Este usuario funciona con el sistema antiguo (plan individual)
      return null
    }

    // Obtener organización con su plan
    const { data: organization } = await supabase
      .from('organizations')
      .select(`
        plan_id,
        subscription_status,
        subscription_start_date,
        subscription_end_date,
        paypal_subscription_id,
        plan:planes(*)
      `)
      .eq('id', profile.organization_id)
      .single()

    if (!organization) {
      console.log('[loadOrganizationSubscription] Organización no encontrada para el usuario, devolviendo null')
      return null
    }

    // Si la organización no tiene plan, obtener el plan gratuito
    if (!organization.plan_id || !organization.plan) {
      const { data: freePlan } = await supabase
        .from('planes')
        .select('*')
        .eq('slug', 'free')
        .single()

      if (freePlan) {
        return {
          plan_id: freePlan.id,
          plan: freePlan as Plan,
          subscription_status: 'active',
          subscription_period: 'monthly',
          subscription_start_date: null,
          subscription_end_date: null,
          hotmart_subscription_id: null,
          payment_method: null,
        }
      }
    }

    console.log('[loadOrganizationSubscription] ✅ Plan de organización:', organization.plan)

    // Casting explícito a través de unknown para evitar errores TypeScript
    return {
      plan_id: organization.plan_id,
      plan: organization.plan as unknown as Plan,
      subscription_status: organization.subscription_status || 'active',
      subscription_period: 'monthly',
      subscription_start_date: organization.subscription_start_date,
      subscription_end_date: organization.subscription_end_date,
      hotmart_subscription_id: organization.paypal_subscription_id || null,
      payment_method: null,
    }

  } catch (error) {
    console.error('[loadOrganizationSubscription] Error:', error)
    // No hacemos fallback aquí para evitar recursión y datos inconsistentes.
    // El caller puede decidir usar loadUserSubscription solo si realmente quiere un plan individual.
    return null
  }
}

// NUEVA FUNCIÓN: Cargar límites a nivel de organización
export async function loadOrganizationUsageLimits(): Promise<UsageLimits | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  try {
    // 1) Intentar obtener límites usando la función RPC principal
    const { data: limites, error } = await supabase
      .rpc('get_limites_organizacion')
      .single()

    if (!error && limites) {
      console.log('[loadOrganizationUsageLimits] ✅ Límites de organización (RPC):', limites)

      // Casting explícito para TypeScript
      const limitesData = limites as any
      const clientesUsados = limitesData.clientes_usados || 0
      const limiteClientes = limitesData.limite_clientes || 0
      const prestamosUsados = limitesData.prestamos_usados || 0
      const limitePrestamos = limitesData.limite_prestamos || 0

      return {
        clientes: {
          current: clientesUsados,
          limit: limiteClientes,
          canAdd: clientesUsados < limiteClientes,
        },
        prestamos: {
          current: prestamosUsados,
          limit: limitePrestamos,
          canAdd: prestamosUsados < limitePrestamos,
        },
        usuarios: {
          current: 0,
          limit: 999,
          canAdd: true,
        },
      }
    }

    console.log('[loadOrganizationUsageLimits] ⚠️ Error o sin datos desde RPC, usando fallback manual:', error)

    // 2) FALLBACK SEGURO (sin recursion):
    //    Calcular límites a partir de la organización y sus usuarios.

    // 2.1 Obtener perfil para conocer organization_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      console.log('[loadOrganizationUsageLimits] Fallback: usuario sin organization_id')
      return null
    }

    const orgId = profile.organization_id as string

    // 2.2 Obtener plan de la organización
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        plan:planes(limite_clientes, limite_prestamos)
      `)
      .eq('id', orgId)
      .single()

    if (orgError || !org?.plan) {
      console.log('[loadOrganizationUsageLimits] Fallback: organización sin plan o error:', orgError)
      return null
    }

    const planData = org.plan as any
    const limiteClientes = planData.limite_clientes || 0
    const limitePrestamos = planData.limite_prestamos || 0

    // 2.3 Obtener IDs de usuarios de la organización
    const { data: orgUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', orgId)

    if (usersError || !orgUsers || orgUsers.length === 0) {
      console.log('[loadOrganizationUsageLimits] Fallback: sin usuarios en organización o error:', usersError)
      return null
    }

    const userIds = orgUsers.map(u => u.id)

    // 2.4 Contar clientes y préstamos de TODOS los usuarios de la organización
    const [clientesAgg, prestamosAgg] = await Promise.all([
      supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .in('user_id', userIds),
      supabase
        .from('prestamos')
        .select('id', { count: 'exact', head: true })
        .in('user_id', userIds),
    ])

    const clientesUsados = clientesAgg.count || 0
    const prestamosUsados = prestamosAgg.count || 0

    console.log('[loadOrganizationUsageLimits] ✅ Fallback manual calculado:', {
      clientesUsados,
      prestamosUsados,
      limiteClientes,
      limitePrestamos,
    })

    return {
      clientes: {
        current: clientesUsados,
        limit: limiteClientes,
        canAdd: clientesUsados < limiteClientes,
      },
      prestamos: {
        current: prestamosUsados,
        limit: limitePrestamos,
        canAdd: prestamosUsados < limitePrestamos,
      },
      usuarios: {
        current: userIds.length,
        limit: 999,
        canAdd: true,
      },
    }

  } catch (error) {
    console.error('[loadOrganizationUsageLimits] Error:', error)
    return null
  }
}

// ============================================
// FUNCIONES ANTIGUAS (Fallback para usuarios sin organización)
// ============================================

export async function loadUserSubscription(): Promise<UserSubscription | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // PRIMERO: si el usuario pertenece a una organización, usamos SIEMPRE
  // la suscripción de la organización (plan compartido)
  try {
    const { data: orgProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (orgProfile?.organization_id) {
      console.log('[loadUserSubscription] Usuario con organización, delegando a loadOrganizationSubscription')
      return await loadOrganizationSubscription()
    }
  } catch (e) {
    console.error('[loadUserSubscription] Error verificando organización, continuando con lógica individual:', e)
  }

  try {
    const { data: freePlan } = await supabase
      .from('planes')
      .select('*')
      .eq('slug', 'free')
      .single()

    if (!freePlan) {
      console.error('❌ No existe el plan gratuito en la base de datos!')
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        plan_id,
        subscription_status,
        subscription_period,
        subscription_start_date,
        subscription_end_date,
        hotmart_subscription_id,
        payment_method,
        plan:planes(*)
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.log('⚠️ Perfil no encontrado, creando con plan gratuito...')
      
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          plan_id: freePlan.id,
          subscription_status: 'active',
          subscription_period: 'monthly',
        }, {
          onConflict: 'id'
        })

      return {
        plan_id: freePlan.id,
        plan: freePlan,
        subscription_status: 'active',
        subscription_period: 'monthly',
        subscription_start_date: null,
        subscription_end_date: null,
        hotmart_subscription_id: null,
        payment_method: null,
      }
    }

    if (!profile.plan_id || !profile.plan) {
      console.log('⚠️ Perfil sin plan, asignando plan gratuito...')
      
      await supabase
        .from('profiles')
        .update({
          plan_id: freePlan.id,
          subscription_status: 'active',
          subscription_period: 'monthly',
        })
        .eq('id', user.id)

      return {
        plan_id: freePlan.id,
        plan: freePlan,
        subscription_status: 'active',
        subscription_period: 'monthly',
        subscription_start_date: null,
        subscription_end_date: null,
        hotmart_subscription_id: null,
        payment_method: null,
      }
    }

    // Casting explícito a través de unknown para evitar errores TypeScript
    return {
      plan_id: profile.plan_id,
      plan: profile.plan as unknown as Plan,
      subscription_status: profile.subscription_status || 'active',
      subscription_period: profile.subscription_period || 'monthly',
      subscription_start_date: profile.subscription_start_date,
      subscription_end_date: profile.subscription_end_date,
      hotmart_subscription_id: profile.hotmart_subscription_id,
      payment_method: profile.payment_method,
    }

  } catch (error) {
    console.error('Error loading subscription:', error)
    return null
  }
}

export async function loadUsageLimits(): Promise<UsageLimits | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // PRIMERO: si el usuario pertenece a una organización, usamos SIEMPRE
  // los límites de la organización (planes compartidos)
  try {
    const { data: orgProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (orgProfile?.organization_id) {
      console.log('[loadUsageLimits] Usuario con organización, delegando a loadOrganizationUsageLimits')
      return await loadOrganizationUsageLimits()
    }
  } catch (e) {
    console.error('[loadUsageLimits] Error verificando organización, continuando con lógica individual:', e)
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        plan:planes(limite_clientes, limite_prestamos)
      `)
      .eq('id', user.id)
      .single()

    if (!profile || !profile.plan) {
      return {
        clientes: { current: 0, limit: 0, canAdd: true },
        prestamos: { current: 0, limit: 0, canAdd: true },
        usuarios: { current: 0, limit: 999, canAdd: true },
      }
    }

    const [clientesCount, prestamosCount] = await Promise.all([
      supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('prestamos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
    ])

    // Casting explícito para TypeScript
    const planData = profile.plan as any
    const limiteClientes = planData.limite_clientes || 0
    const limitePrestamos = planData.limite_prestamos || 0

    return {
      clientes: {
        current: clientesCount.count || 0,
        limit: limiteClientes,
        canAdd: (clientesCount.count || 0) < limiteClientes,
      },
      prestamos: {
        current: prestamosCount.count || 0,
        limit: limitePrestamos,
        canAdd: (prestamosCount.count || 0) < limitePrestamos,
      },
      usuarios: {
        current: 0,
        limit: 999,
        canAdd: true,
      },
    }

  } catch (error) {
    console.error('Error loading usage limits:', error)
    return null
  }
}
