import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Configuración de seguridad
// Debes configurar esta variable en Vercel con el token que te da Hotmart en: Herramientas > Webhook
const HOTMART_SECRET = process.env.HOTMART_WEBHOOK_SECRET

// Mapeo de Códigos de Oferta (off) a slugs de planes en la tabla `planes`
// IMPORTANTE: los slugs deben coincidir con los que usas en Supabase (free, pro, business, enterprise)
const OFFER_CODE_TO_PLAN = {
  // Planes Mensuales
  'ik0qihyk': { slug: 'pro', period: 'monthly' },        // Profesional - $19
  'fsdgw81e': { slug: 'business', period: 'monthly' },   // Business - $49
  'axldy5u9': { slug: 'enterprise', period: 'monthly' }, // Enterprise - $179
  
  // Planes Anuales
  'r73t9021': { slug: 'pro', period: 'yearly' },         // Profesional Anual - $190
  '4x3wc2e7': { slug: 'business', period: 'yearly' },    // Business Anual - $490
  'lkmzhadk': { slug: 'enterprise', period: 'yearly' },  // Enterprise Anual - $1,790 (con L)
  '1kmzhadk': { slug: 'enterprise', period: 'yearly' },  // Enterprise Anual - $1,790 (con 1) - Por seguridad
  
  // Plan de Prueba (opcional)
  'rsymwzo6': { slug: 'pro', period: 'monthly' },        // Profesional $1 (acceso de prueba)
}

const EVENTS = {
  APPROVED: 'PURCHASE_APPROVED',
  CANCELLED: 'SUBSCRIPTION_CANCELLATION',
  SWITCH_PLAN: 'SWITCH_PLAN',
  REFUNDED: 'REFUND',
  DISPUTE: 'DISPUTE_OPENED',
  // Eventos de renovación automática
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWAL',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED', // Algunos webhooks usan este
  SUBSCRIPTION_PAYMENT: 'SUBSCRIPTION_PAYMENT_APPROVED' // O este
}

export async function POST(req: Request) {
  try {
    // 1. Verificación de Seguridad
    // Hotmart puede enviar el token en diferentes headers según la versión
    const hotmartToken = req.headers.get('x-hotmart-hottok') || 
                        req.headers.get('hottok') || 
                        req.headers.get('x-hotmart-security')
    
    // Log para debugging
    console.log('🔍 Headers recibidos:', {
      'x-hotmart-hottok': req.headers.get('x-hotmart-hottok'),
      'hottok': req.headers.get('hottok'),
      'x-hotmart-security': req.headers.get('x-hotmart-security'),
      'HOTMART_SECRET configurado': HOTMART_SECRET ? 'Sí' : 'No'
    })
    
    if (HOTMART_SECRET && hotmartToken !== HOTMART_SECRET) {
      console.error('🔴 Intento de acceso no autorizado al Webhook de Hotmart')
      console.error('Token recibido:', hotmartToken)
      console.error('Token esperado:', HOTMART_SECRET)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, data } = body

    // Logging detallado para debugging
    console.log(`🔔 Evento Hotmart Recibido: ${event}`)
    console.log('📦 Datos completos del webhook:', JSON.stringify(body, null, 2))
    console.log('👤 Email del comprador:', data?.buyer?.email)
    console.log('🔑 sck (Source Key):', data?.purchase?.sck)
    
    // Logging mejorado para cupones
    const offerCode1 = data?.purchase?.offer?.code
    const offerCode2 = data?.purchase?.pricing?.offer?.code
    const hasCoupon = !!(data?.purchase?.pricing?.discount || data?.purchase?.coupon || data?.purchase?.discount)
    const originalPrice = data?.purchase?.original_offer_price?.value
    const finalPrice = data?.purchase?.price?.value
    
    console.log('🎫 Código de oferta (offer.code):', offerCode1)
    console.log('🎫 Código de oferta (pricing.offer.code):', offerCode2)
    console.log('💰 Tiene cupón:', hasCoupon)
    console.log('💰 Precio original:', originalPrice)
    console.log('💰 Precio final:', finalPrice)
    console.log('💰 Descuento aplicado:', originalPrice && finalPrice ? (originalPrice - finalPrice) : 'N/A')

    // Inicializar Supabase Admin (necesario para escribir en profiles de otros usuarios)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Identificar al Usuario
    // Intentamos múltiples formas de identificar al usuario
    const sck = data.purchase?.sck || data.purchase?.source?.code
    const userEmail = data.buyer?.email
    const buyerEmail = data.buyer?.email
    
    console.log('🔍 Intentando identificar usuario...')
    console.log('  - sck recibido:', sck)
    console.log('  - email recibido:', userEmail)

    if (!sck && !userEmail) {
      console.error('❌ No se encontró ni sck ni email para identificar al usuario')
      return NextResponse.json({ error: 'No user identification found' }, { status: 400 })
    }

    // Buscar el ID del usuario
    let targetUserId: string | null = null
    
    // Primero intentar con sck (si es un UUID válido)
    if (sck && !sck.includes('@')) {
      // Verificar si el sck es un UUID válido (formato de Supabase)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(sck)) {
        targetUserId = sck
        console.log('✅ Usando sck como UUID directo:', targetUserId)
      }
    }
    
    // Si no tenemos el ID aún, buscar por email
    if (!targetUserId && userEmail) {
      console.log('🔍 Buscando usuario por email:', userEmail)
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', userEmail)
        .single()
      
      if (userError) {
        console.error('❌ Error buscando usuario por email:', userError)
      } else if (userData) {
        targetUserId = userData.id
        console.log('✅ Usuario encontrado por email:', targetUserId)
      } else {
        console.warn('⚠️ No se encontró usuario con email:', userEmail)
      }
    }

    if (!targetUserId) {
      console.error('❌ No se pudo identificar al usuario con ningún método')
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // 3. Manejar el Evento
    if (event === EVENTS.APPROVED || event === EVENTS.SUBSCRIPTION_RENEWED || event === EVENTS.PAYMENT_APPROVED || event === EVENTS.SUBSCRIPTION_PAYMENT) {
      // Maneja tanto la primera compra como las renovaciones automáticas
      let offerCode = data.purchase?.offer?.code || data.purchase?.pricing?.offer?.code
      
      // Función para extraer código base (remover sufijos de cupón si existen)
      const extractBaseOfferCode = (code: string | undefined): string | undefined => {
        if (!code) return undefined
        // Si el código tiene formato "ik0qihyk_COUPON_50" o similar, extraer solo la parte base
        // También manejar códigos con guiones o otros separadores
        const baseCode = code.split('_')[0].split('-')[0].split(' ')[0]
        return baseCode || code
      }
      
      // Intentar primero con el código completo
      let planInfo = OFFER_CODE_TO_PLAN[offerCode as keyof typeof OFFER_CODE_TO_PLAN]
      
      // Si no se encuentra, intentar con el código base (sin sufijos de cupón)
      if (!planInfo && offerCode) {
        const baseCode = extractBaseOfferCode(offerCode)
        if (baseCode && baseCode !== offerCode) {
          console.log(`🔄 Intentando con código base: ${baseCode} (original: ${offerCode})`)
          planInfo = OFFER_CODE_TO_PLAN[baseCode as keyof typeof OFFER_CODE_TO_PLAN]
        }
      }
      
      // Si aún no se encuentra, intentar identificar por monto pagado (fallback)
      if (!planInfo) {
        const amount = data.purchase?.price?.value || data.purchase?.original_offer_price?.value || 0
        console.log(`💰 Fallback: Intentando identificar plan por monto: $${amount}`)
        
        // Mapeo por rangos de precio (considerando descuentos)
        if (amount >= 9 && amount <= 10) {
          // $9.50 = Plan Profesional con 50% descuento
          planInfo = { slug: 'pro', period: 'monthly' }
          console.log('✅ Plan identificado por monto: Profesional (con cupón 50%)')
        } else if (amount >= 19 && amount <= 20) {
          // $19 = Plan Profesional normal
          planInfo = { slug: 'pro', period: 'monthly' }
          console.log('✅ Plan identificado por monto: Profesional')
        } else if (amount >= 24 && amount <= 25) {
          // $24.50 = Plan Business con 50% descuento
          planInfo = { slug: 'business', period: 'monthly' }
          console.log('✅ Plan identificado por monto: Business (con cupón 50%)')
        } else if (amount >= 49 && amount <= 50) {
          // $49 = Plan Business normal
          planInfo = { slug: 'business', period: 'monthly' }
          console.log('✅ Plan identificado por monto: Business')
        } else if (amount >= 89 && amount <= 90) {
          // $89.50 = Plan Enterprise con 50% descuento
          planInfo = { slug: 'enterprise', period: 'monthly' }
          console.log('✅ Plan identificado por monto: Enterprise (con cupón 50%)')
        } else if (amount >= 179 && amount <= 180) {
          // $179 = Plan Enterprise normal
          planInfo = { slug: 'enterprise', period: 'monthly' }
          console.log('✅ Plan identificado por monto: Enterprise')
        }
      }

      if (!planInfo) {
        console.error(`❌ No se pudo identificar el plan. Código de oferta: ${offerCode}, Monto: ${data.purchase?.price?.value || 'N/A'}`)
        console.error('📦 Datos completos de purchase:', JSON.stringify(data.purchase, null, 2))
        return NextResponse.json({ 
          error: 'Unknown offer code and amount', 
          offerCode,
          amount: data.purchase?.price?.value,
          details: 'Could not identify plan from offer code or amount'
        }, { status: 400 })
      }

      // Buscar el ID del plan en la base de datos
      const { data: planDb } = await supabase
        .from('planes')
        .select('id')
        .eq('slug', planInfo.slug)
        .single()

      if (!planDb) {
        console.error(`🔴 Plan no encontrado en DB: ${planInfo.slug}`)
        return NextResponse.json({ error: 'Plan not found in DB' }, { status: 500 })
      }

      // Calcular fecha de fin
      const endDate = new Date()
      if (planInfo.period === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1)
      }

      // ACTUALIZAR PERFIL
      const startDate = new Date()
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan_id: planDb.id,
          subscription_status: 'active',
          subscription_period: planInfo.period,
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          payment_method: 'hotmart',
          hotmart_subscription_id: data.subscription?.subscriber?.code || data.purchase?.subscription?.subscriber_code
        })
        .eq('id', targetUserId)

      if (updateError) {
        console.error('🔴 Error actualizando perfil:', updateError)
        throw updateError
      }
      
      console.log(`✅ Usuario ${targetUserId} actualizado a plan ${planInfo.slug} (${planInfo.period})`)
      
      // Registrar el pago en el historial
      const amount = data.purchase?.price?.value || data.purchase?.original_offer_price?.value || 0
      await supabase
        .from('pagos_suscripcion')
        .insert({
          user_id: targetUserId,
          plan_id: planDb.id,
          monto: amount,
          moneda: data.purchase?.price?.currency_code || 'USD',
          periodo: planInfo.period,
          metodo_pago: 'hotmart',
          transaction_id: data.purchase?.transaction || data.purchase?.purchase_date,
          estado: 'completado',
          fecha_pago: new Date().toISOString()
        })
      
      console.log(`💰 Pago registrado: $${amount} ${data.purchase?.price?.currency_code || 'USD'}`)
      
      // Verificar que la actualización fue exitosa
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('plan_id, plan:planes(slug, nombre)')
        .eq('id', targetUserId)
        .single()
      
      console.log('✅ Verificación post-actualización:', updatedProfile)
      
      // Log especial para renovaciones
      if (event !== EVENTS.APPROVED) {
        console.log(`🔄 RENOVACIÓN AUTOMÁTICA procesada para usuario ${targetUserId}`)
      }
    }

    else if (event === EVENTS.CANCELLED || event === EVENTS.REFUNDED || event === EVENTS.DISPUTE) {
      // Devolver al plan gratuito
      const { data: freePlan } = await supabase
        .from('planes')
        .select('id')
        .eq('slug', 'free')
        .single()

      if (freePlan) {
        await supabase
          .from('profiles')
          .update({
            plan_id: freePlan.id,
            subscription_status: 'cancelled',
            subscription_end_date: new Date().toISOString()
          })
          .eq('id', targetUserId)
          
        console.log(`🚫 Usuario ${targetUserId} devuelto a plan FREE por cancelación/reembolso`)
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('🔴 Error procesando webhook Hotmart:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

