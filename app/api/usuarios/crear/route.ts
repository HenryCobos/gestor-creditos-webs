import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cliente de Supabase con Service Role (admin)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Clave de servicio (admin)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role, organizationId, invitedBy } = await request.json()

    // Verificar que el usuario que invita es admin
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', invitedBy)
      .single()

    if (!inviterProfile || inviterProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para crear usuarios' },
        { status: 403 }
      )
    }

    // Crear usuario en Supabase Auth usando admin API
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        full_name: fullName
      }
    })

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    // Crear perfil del usuario
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: fullName,
        organization_id: organizationId,
        role: role,
        activo: true
      })

    if (profileError) {
      console.error('Error al crear perfil:', profileError)
      // Intentar eliminar el usuario de Auth si falla el perfil
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Error al crear el perfil del usuario' },
        { status: 500 }
      )
    }

    // Crear user_role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        organization_id: organizationId,
        role: role
      })

    if (roleError) {
      console.error('Error al asignar rol:', roleError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        fullName: fullName,
        role: role
      }
    })

  } catch (error: any) {
    console.error('Error en API de crear usuario:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
