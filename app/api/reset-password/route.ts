import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Cliente con Service Role Key para operaciones privilegiadas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    // 1. Verificar autenticación del admin
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[API reset-password] Error de autenticación:', authError)
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // 2. Verificar que el usuario es admin
    const { data: profile } = await supabaseAdmin
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

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    if (roleData?.role !== 'admin') {
      console.error('[API reset-password] Usuario no es admin')
      return NextResponse.json(
        { error: 'Solo los administradores pueden resetear contraseñas' },
        { status: 403 }
      )
    }

    // 3. Obtener datos del request
    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'userId y newPassword son requeridos' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // 4. Verificar que el usuario a resetear pertenece a la misma organización
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, email')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (targetProfile.organization_id !== profile.organization_id) {
      console.error('[API reset-password] Usuario no pertenece a la misma organización')
      return NextResponse.json(
        { error: 'No tienes permiso para resetear la contraseña de este usuario' },
        { status: 403 }
      )
    }

    // 5. Resetear la contraseña usando Service Role Key
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('[API reset-password] Error al actualizar contraseña:', updateError)
      return NextResponse.json(
        { error: 'No se pudo resetear la contraseña', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[API reset-password] Contraseña reseteada exitosamente para:', targetProfile.email)

    // 6. Responder con éxito
    return NextResponse.json({
      success: true,
      message: 'Contraseña reseteada exitosamente',
      email: targetProfile.email
    })

  } catch (error: any) {
    console.error('[API reset-password] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}
