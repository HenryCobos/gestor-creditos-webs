import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Configuración de seguridad
// Debes configurar esta variable en Vercel con el token que te da Hotmart en: Herramientas > Webhook
const HOTMART_SECRET = process.env.HOTMART_WEBHOOK_SECRET

// Mapeo de Códigos de Oferta (off) a Slugs de Planes
// Estos códigos vienen de los enlaces que me pasaste
const OFFER_CODE_TO_PLAN = {
  'ik0qihyk': { slug: 'professional', period: 'monthly' },
  'fsdgw81e': { slug: 'business', period: 'monthly' },
  'axldy5u9': { slug: 'enterprise', period: 'monthly' },
  
  'r73t9021': { slug: 'professional', period: 'yearly' },
  '4x3wc2e7': { slug: 'business', period: 'yearly' },
  '1kmzhadk': { slug: 'enterprise', period: 'yearly' },
}

const EVENTS = {
  APPROVED: 'PURCHASE_APPROVED',
  CANCELLED: 'SUBSCRIPTION_CANCELLATION',
  SWITCH_PLAN: 'SWITCH_PLAN',
  REFUNDED: 'REFUND',
  DISPUTE: 'DISPUTE_OPENED'
}

export async function POST(req: Request) {
  try {
    // 1. Verificación de Seguridad
    const hotmartToken = req.headers.get('hottok')
    
    if (HOTMART_SECRET && hotmartToken !== HOTMART_SECRET) {
      console.error('🔴 Intento de acceso no autorizado al Webhook de Hotmart')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, data } = body

    console.log(`🔔 Evento Hotmart Recibido: ${event}`, data?.purchase?.transaction)

    // Inicializar Supabase Admin (necesario para escribir en profiles de otros usuarios)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Identificar al Usuario
    // Usamos el campo 'sck' que enviamos en el checkout, o el email como respaldo
    const userId = data.purchase?.sck || data.buyer?.email // Nota: sck es ideal, email es fallback
    const userEmail = data.buyer?.email

    if (!userId && !userEmail) {
      return NextResponse.json({ error: 'No user identification found' }, { status: 400 })
    }

    // Buscar el ID del usuario si solo tenemos el email
    let targetUserId = userId
    if (userId && userId.includes('@')) {
      // Si el sck es un email o falló y usamos el email del comprador
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single()
      
      if (userData) targetUserId = userData.id
    }

    // 3. Manejar el Evento
    if (event === EVENTS.APPROVED) {
      const offerCode = data.purchase?.offer?.code || data.purchase?.pricing?.offer?.code
      const planInfo = OFFER_CODE_TO_PLAN[offerCode as keyof typeof OFFER_CODE_TO_PLAN]

      if (!planInfo) {
        console.warn(`⚠️ Código de oferta desconocido: ${offerCode}`)
        return NextResponse.json({ warning: 'Unknown offer code' })
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
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan_id: planDb.id,
          subscription_status: 'active',
          subscription_period: planInfo.period,
          subscription_end_date: endDate.toISOString(),
          payment_method: 'hotmart',
          hotmart_subscription_id: data.subscription?.subscriber?.code
        })
        .eq('id', targetUserId)

      if (updateError) {
        console.error('🔴 Error actualizando perfil:', updateError)
        throw updateError
      }
      
      console.log(`✅ Usuario ${targetUserId} actualizado a plan ${planInfo.slug}`)
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

