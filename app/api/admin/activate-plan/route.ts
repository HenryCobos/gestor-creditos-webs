import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Ruta de administración para activar manualmente un plan
// Uso: POST /api/admin/activate-plan
// Body: { email: string, planSlug: 'pro' | 'business' | 'enterprise', period: 'monthly' | 'yearly', amount?: number }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, planSlug = 'pro', period = 'monthly', amount = 9.5 } = body

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 })
    }

    // Inicializar Supabase Admin (necesario para escribir en profiles de otros usuarios)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log(`🔍 Buscando usuario con email: ${email}`)

    // Buscar el usuario por email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email, plan_id, plan:planes(slug, nombre)')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      console.error('❌ Error buscando usuario:', userError)
      return NextResponse.json({ 
        error: 'Usuario no encontrado', 
        details: userError?.message 
      }, { status: 404 })
    }

    console.log(`✅ Usuario encontrado: ${userData.id}`)
    console.log(`📋 Plan actual: ${(userData.plan as any)?.nombre || 'N/A'}`)

    // Buscar el plan solicitado
    const { data: planDb, error: planError } = await supabase
      .from('planes')
      .select('id, nombre, slug')
      .eq('slug', planSlug)
      .single()

    if (planError || !planDb) {
      console.error('❌ Error buscando plan:', planError)
      return NextResponse.json({ 
        error: 'Plan no encontrado', 
        details: planError?.message 
      }, { status: 404 })
    }

    console.log(`✅ Plan encontrado: ${planDb.nombre} (${planDb.slug})`)

    // Calcular fecha de fin
    const startDate = new Date()
    const endDate = new Date()
    if (period === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    // Actualizar perfil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan_id: planDb.id,
        subscription_status: 'active',
        subscription_period: period,
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        payment_method: 'hotmart',
      })
      .eq('id', userData.id)

    if (updateError) {
      console.error('🔴 Error actualizando perfil:', updateError)
      return NextResponse.json({ 
        error: 'Error actualizando perfil', 
        details: updateError.message 
      }, { status: 500 })
    }

    console.log(`✅ Perfil actualizado correctamente`)

    // Registrar el pago en el historial
    const { error: paymentError } = await supabase
      .from('pagos_suscripcion')
      .insert({
        user_id: userData.id,
        plan_id: planDb.id,
        monto: amount,
        moneda: 'USD',
        periodo: period,
        metodo_pago: 'hotmart',
        transaction_id: `manual_activation_${Date.now()}`,
        estado: 'completado',
        fecha_pago: startDate.toISOString()
      })

    if (paymentError) {
      console.error('⚠️ Error registrando pago (no crítico):', paymentError)
    } else {
      console.log(`💰 Pago registrado: $${amount} USD`)
    }

    // Verificar que la actualización fue exitosa
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('plan_id, plan:planes(slug, nombre), subscription_status, subscription_end_date')
      .eq('id', userData.id)
      .single()

    console.log('✅ Verificación post-actualización:', updatedProfile)

    return NextResponse.json({
      success: true,
      message: `Plan ${planDb.nombre} activado correctamente para ${email}`,
      user: {
        id: userData.id,
        email: userData.email,
        plan: (updatedProfile?.plan as any)?.nombre,
        subscription_status: updatedProfile?.subscription_status,
        subscription_end_date: updatedProfile?.subscription_end_date,
      }
    })

  } catch (error) {
    console.error('🔴 Error procesando activación manual:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

