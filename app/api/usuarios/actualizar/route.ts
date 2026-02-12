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
    const { userId, nombre_completo, role } = body as {
      userId?: string
      nombre_completo?: string
      role?: 'admin' | 'cobrador'
    }

    if (!userId || !nombre_completo || !role) {
      return NextResponse.json(
        { error: 'Datos incompletos para actualizar usuario' },
        { status: 400 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[API actualizar usuario] Falta SUPABASE_SERVICE_ROLE_KEY')
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
      console.error('[API actualizar usuario] Error al obtener usuario actual:', authError)
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
      console.error('[API actualizar usuario] Error al leer perfil admin:', inviterError)
      return NextResponse.json(
        { error: 'Error al verificar permisos' },
        { status: 500 }
      )
    }

    if (!inviterProfile || inviterProfile.role !== 'admin' || !inviterProfile.organization_id) {
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar usuarios' },
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
      console.error('[API actualizar usuario] Usuario objetivo no encontrado:', targetError)
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (targetProfile.organization_id !== inviterProfile.organization_id) {
      return NextResponse.json(
        { error: 'Solo puedes actualizar usuarios de tu organización' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()

    // 4. Actualizar perfil (nombre y rol)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        nombre_completo,
        full_name: nombre_completo,
        role,
        updated_at: now,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('[API actualizar usuario] Error al actualizar perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo actualizar el perfil del usuario' },
        { status: 500 }
      )
    }

    // 5. Mantener tabla user_roles en sincronía
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({
        role,
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('organization_id', inviterProfile.organization_id)

    if (roleError) {
      console.error('[API actualizar usuario] Error al actualizar rol en user_roles:', roleError)
      return NextResponse.json(
        { error: 'El usuario se actualizó parcialmente, pero hubo un problema con el rol' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado correctamente',
    })
  } catch (error: any) {
    console.error('[API actualizar usuario] Error general:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

