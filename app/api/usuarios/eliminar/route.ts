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
      console.error('[API eliminar usuario] Falta SUPABASE_SERVICE_ROLE_KEY')
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
      console.error('[API eliminar usuario] Error al obtener usuario actual:', authError)
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

    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propio usuario' },
        { status: 400 }
      )
    }

    // 2. Verificar que el usuario actual sea admin
    const { data: inviterProfile, error: inviterError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', currentUser.id)
      .single()

    if (inviterError) {
      console.error('[API eliminar usuario] Error al leer perfil admin:', inviterError)
      return NextResponse.json(
        { error: 'Error al verificar permisos' },
        { status: 500 }
      )
    }

    if (!inviterProfile || inviterProfile.role !== 'admin' || !inviterProfile.organization_id) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar usuarios' },
        { status: 403 }
      )
    }

    // 3. Verificar que el usuario objetivo pertenece a la misma organización
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id')
      .eq('id', userId)
      .single()

    if (targetError || !targetProfile) {
      console.error('[API eliminar usuario] Usuario objetivo no encontrado:', targetError)
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (targetProfile.organization_id !== inviterProfile.organization_id) {
      return NextResponse.json(
        { error: 'Solo puedes eliminar usuarios de tu organización' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()

    // 4. Eliminar roles en user_roles para esa organización
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', inviterProfile.organization_id)

    if (roleError) {
      console.error('[API eliminar usuario] Error al eliminar roles:', roleError)
      return NextResponse.json(
        { error: 'No se pudo eliminar los roles del usuario' },
        { status: 500 }
      )
    }

    // 5. Desactivar usuario y desvincularlo de la organización (soft delete)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        activo: false,
        organization_id: null,
        role: null,
        updated_at: now,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('[API eliminar usuario] Error al actualizar perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo eliminar el usuario' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    })
  } catch (error: any) {
    console.error('[API eliminar usuario] Error general:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

