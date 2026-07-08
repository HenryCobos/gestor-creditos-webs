import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Los trials se activan desde el checkout de Hotmart. Elige un plan con prueba de 7 días en la app.',
    },
    { status: 410 }
  )
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
