import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Endpoint para verificar y activar manualmente una suscripción
 * Útil cuando el webhook de Hotmart no llegó o hubo un problema
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        plan_id,
        subscription_status,
        subscription_period,
        hotmart_subscription_id,
        payment_method,
        plan:planes(id, nombre, slug, limite_clientes, limite_prestamos)
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ 
        error: 'Error al obtener perfil',
        details: profileError.message 
      }, { status: 500 })
    }

    // Forzar tipado flexible para evitar errores de TypeScript en runtime
    const typedProfile: any = profile

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      subscription: {
        plan: typedProfile.plan ? {
          id: typedProfile.plan.id,
          nombre: typedProfile.plan.nombre,
          slug: typedProfile.plan.slug,
          limite_clientes: typedProfile.plan.limite_clientes,
          limite_prestamos: typedProfile.plan.limite_prestamos
        } : null,
        status: typedProfile.subscription_status,
        period: typedProfile.subscription_period,
        hotmart_subscription_id: typedProfile.hotmart_subscription_id,
        payment_method: typedProfile.payment_method
      }
    })
  } catch (error) {
    console.error('Error en verify-subscription:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Endpoint POST para activar manualmente un plan
 * Solo para casos de emergencia cuando el webhook falló
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { planSlug, period = 'monthly' } = body

    if (!planSlug) {
      return NextResponse.json({ error: 'planSlug es requerido' }, { status: 400 })
    }

    // Buscar el plan
    const { data: plan, error: planError } = await supabase
      .from('planes')
      .select('id, nombre, slug')
      .eq('slug', planSlug)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ 
        error: 'Plan no encontrado',
        details: planError?.message 
      }, { status: 404 })
    }

    // Calcular fecha de fin
    const endDate = new Date()
    if (period === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    // Actualizar el perfil
    console.log('🔄 Actualizando perfil:', {
      userId: user.id,
      planId: plan.id,
      planSlug: planSlug,
      period: period
    })

    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({
        plan_id: plan.id,
        subscription_status: 'active',
        subscription_period: period,
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: endDate.toISOString(),
        payment_method: 'hotmart_manual'
      })
      .eq('id', user.id)
      .select()

    if (updateError) {
      console.error('❌ Error al actualizar plan:', updateError)
      return NextResponse.json({ 
        error: 'Error al actualizar plan',
        details: updateError.message,
        code: updateError.code
      }, { status: 500 })
    }

    console.log('✅ Plan actualizado exitosamente:', updateData)

    return NextResponse.json({
      success: true,
      message: `Plan ${plan.nombre} activado correctamente`,
      plan: {
        id: plan.id,
        nombre: plan.nombre,
        slug: plan.slug
      }
    })
  } catch (error) {
    console.error('Error en verify-subscription POST:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

