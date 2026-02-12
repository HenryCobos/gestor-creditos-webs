import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Cliente de Supabase con Service Role (admin)
const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body as { userId?: string }

    if (!userId) {
      return NextResponse.json(
        { error: 'Falta el ID del usuario' },
        { status: 400 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[API toggle-activo usuario] Falta SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    // 1. Obtener usuario autenticado desde cookies (anon key)
    const supabaseServer = await createServerClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabaseServer.auth.getUser()

    if (authError) {
      console.error('[API toggle-activo usuario] Error al obtener usuario actual:', authError)
      return NextResponse.json(
        { error: 'No se pudo verificar la sesión actual' },
        { status: 401 }
      )
    }

    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // 2. Verificar que el usuario actual sea admin
    const { data: inviterProfile, error: inviterError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', currentUser.id)
      .single()

    if (inviterError) {
      console.error('[API toggle-activo usuario] Error al leer perfil admin:', inviterError)
      return NextResponse.json(
        { error: 'Error al verificar permisos' },
        { status: 500 }
      )
    }

    if (!inviterProfile || inviterProfile.role !== 'admin' || !inviterProfile.organization_id) {
      return NextResponse.json(
        { error: 'No tienes permisos para cambiar el estado de usuarios' },
        { status: 403 }
      )
    }

    // 3. Leer el estado actual del usuario objetivo y validar organización
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, activo')
      .eq('id', userId)
      .single()

    if (targetError || !targetProfile) {
      console.error('[API toggle-activo usuario] Usuario objetivo no encontrado:', targetError)
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (targetProfile.organization_id !== inviterProfile.organization_id) {
      return NextResponse.json(
        { error: 'Solo puedes gestionar usuarios de tu organización' },
        { status: 403 }
      )
    }

    const nuevoEstado = !targetProfile.activo
    const now = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        activo: nuevoEstado,
        updated_at: now,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[API toggle-activo usuario] Error al actualizar estado:', updateError)
      return NextResponse.json(
        { error: 'No se pudo cambiar el estado del usuario' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      activo: nuevoEstado,
    })
  } catch (error: any) {
    console.error('[API toggle-activo usuario] Error general:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

