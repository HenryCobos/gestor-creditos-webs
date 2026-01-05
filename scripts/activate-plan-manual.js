/**
 * Script para activar manualmente un plan de usuario
 * Uso: node scripts/activate-plan-manual.js credifast365@outlook.com
 */

const { createClient } = require('@supabase/supabase-js')
// Las variables de entorno se leen directamente de process.env
// Asegúrate de tenerlas configuradas en tu sistema o en .env.local

const email = process.argv[2] || 'credifast365@outlook.com'
const planSlug = process.argv[3] || 'pro'
const period = process.argv[4] || 'monthly'
const amount = parseFloat(process.argv[5] || '9.5')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Variables de entorno no configuradas')
  console.error('Necesitas configurar en .env.local:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function activatePlan() {
  console.log('🚀 Iniciando activación manual de plan...')
  console.log(`📧 Email: ${email}`)
  console.log(`📦 Plan: ${planSlug} (${period})`)
  console.log(`💰 Monto: $${amount}`)
  console.log('')

  // Inicializar Supabase Admin
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Buscar el usuario por email
    console.log(`🔍 Buscando usuario con email: ${email}...`)
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email, plan_id, plan:planes(slug, nombre)')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      console.error('❌ Error buscando usuario:', userError?.message)
      console.error('   Detalles:', userError)
      process.exit(1)
    }

    console.log(`✅ Usuario encontrado: ${userData.id}`)
    console.log(`📋 Plan actual: ${userData.plan?.nombre || 'N/A'}`)
    console.log('')

    // Buscar el plan solicitado
    console.log(`🔍 Buscando plan: ${planSlug}...`)
    const { data: planDb, error: planError } = await supabase
      .from('planes')
      .select('id, nombre, slug')
      .eq('slug', planSlug)
      .single()

    if (planError || !planDb) {
      console.error('❌ Error buscando plan:', planError?.message)
      console.error('   Detalles:', planError)
      process.exit(1)
    }

    console.log(`✅ Plan encontrado: ${planDb.nombre} (${planDb.slug})`)
    console.log('')

    // Calcular fecha de fin
    const startDate = new Date()
    const endDate = new Date()
    if (period === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    console.log(`📅 Fecha inicio: ${startDate.toISOString()}`)
    console.log(`📅 Fecha fin: ${endDate.toISOString()}`)
    console.log('')

    // Actualizar perfil
    console.log('🔄 Actualizando perfil del usuario...')
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
      console.error('🔴 Error actualizando perfil:', updateError.message)
      console.error('   Detalles:', updateError)
      process.exit(1)
    }

    console.log('✅ Perfil actualizado correctamente')
    console.log('')

    // Registrar el pago en el historial
    console.log('💰 Registrando pago en historial...')
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
      console.error('⚠️ Error registrando pago (no crítico):', paymentError.message)
    } else {
      console.log(`✅ Pago registrado: $${amount} USD`)
    }
    console.log('')

    // Verificar que la actualización fue exitosa
    console.log('🔍 Verificando actualización...')
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('plan_id, plan:planes(slug, nombre), subscription_status, subscription_end_date')
      .eq('id', userData.id)
      .single()

    if (verifyError) {
      console.error('⚠️ Error verificando actualización:', verifyError.message)
    } else {
      console.log('✅ Verificación exitosa:')
      console.log(`   - Plan: ${updatedProfile?.plan?.nombre}`)
      console.log(`   - Estado: ${updatedProfile?.subscription_status}`)
      console.log(`   - Fecha fin: ${updatedProfile?.subscription_end_date}`)
    }

    console.log('')
    console.log('🎉 ¡Activación completada exitosamente!')
    console.log('')
    console.log('Resumen:')
    console.log(`   Usuario: ${email}`)
    console.log(`   Plan: ${planDb.nombre} (${period})`)
    console.log(`   Monto: $${amount} USD`)
    console.log(`   Válido hasta: ${endDate.toLocaleDateString()}`)

  } catch (error) {
    console.error('🔴 Error inesperado:', error)
    process.exit(1)
  }
}

activatePlan()

