import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getLimitesOrganizacionForOrg } from '@/lib/limites-organizacion-server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Usuario sin organización' },
        { status: 403 }
      )
    }

    const limites = await getLimitesOrganizacionForOrg(
      profile.organization_id as string
    )

    if (!limites) {
      return NextResponse.json(
        { error: 'No se pudieron calcular los límites' },
        { status: 404 }
      )
    }

    return NextResponse.json({ limites })
  } catch (e) {
    console.error('[api/limites-organizacion]', e)
    return NextResponse.json(
      { error: 'Error al cargar límites de la organización' },
      { status: 500 }
    )
  }
}
