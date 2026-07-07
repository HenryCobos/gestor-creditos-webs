import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const TRIAL_DAYS = 7
const TRIAL_PLAN_SLUG = 'pro'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar que no haya usado trial antes
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('trial_used, trial_ends_at, plan_id')
      .eq('id', user.id)
      .single()

    if (profile?.trial_used) {
      return NextResponse.json({ error: 'Ya usaste tu período de prueba gratuito' }, { status: 400 })
    }

    if (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
      return NextResponse.json({ error: 'Ya tienes un trial activo' }, { status: 400 })
    }

    const trialStart = new Date()
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        trial_start_at: trialStart.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        trial_plan_slug: TRIAL_PLAN_SLUG,
        trial_used: true,
      })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Error al activar el trial' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Trial de ${TRIAL_DAYS} días activado correctamente`,
      trial_ends_at: trialEnd.toISOString(),
      plan: TRIAL_PLAN_SLUG,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_start_at, trial_ends_at, trial_plan_slug, trial_used')
      .eq('id', user.id)
      .single()

    const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
    const isActive = trialEndsAt ? trialEndsAt > new Date() : false
    const daysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0

    return NextResponse.json({
      isActive,
      daysRemaining,
      trialEndsAt: profile?.trial_ends_at,
      planSlug: profile?.trial_plan_slug || 'pro',
      trialUsed: profile?.trial_used || false,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
