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
    const body = await request.json()
    const { email, password, fullName, role, organizationId, invitedBy } = body

    console.log('[API crear usuario] Request recibido:', { email, fullName, role, organizationId, invitedBy })

    // Verificar que tenemos la Service Role Key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[API crear usuario] SUPABASE_SERVICE_ROLE_KEY no está configurada')
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    // Verificar que el usuario que invita es admin
    const { data: inviterProfile, error: inviterError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', invitedBy)
      .single()

    console.log('[API crear usuario] Perfil del invitador:', inviterProfile)

    if (inviterError) {
      console.error('[API crear usuario] Error al verificar invitador:', inviterError)
      return NextResponse.json(
        { error: 'Error al verificar permisos del invitador' },
        { status: 500 }
      )
    }

    if (!inviterProfile?.organization_id) {
      console.error('[API crear usuario] Invitador sin organización:', inviterProfile)
      return NextResponse.json(
        { error: 'No tienes permisos para crear usuarios' },
        { status: 403 }
      )
    }

    const { data: inviterRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', invitedBy)
      .eq('organization_id', inviterProfile.organization_id)
      .maybeSingle()

    let inviterRole: 'admin' | 'cobrador' = inviterProfile.role === 'admin' ? 'admin' : 'cobrador'
    if (inviterRoleData?.role === 'admin' || inviterRoleData?.role === 'cobrador') {
      inviterRole = inviterRoleData.role
    }

    if (inviterRole !== 'admin') {
      console.error('[API crear usuario] Usuario no es admin:', inviterProfile)
      return NextResponse.json(
        { error: 'No tienes permisos para crear usuarios' },
        { status: 403 }
      )
    }

    // Crear usuario en Supabase Auth usando admin API
    console.log('[API crear usuario] Creando usuario en Auth...')
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        full_name: fullName,
        organization_id: organizationId, // Para que el trigger no cree una org nueva
        role: role, // admin o cobrador
      }
    })

    if (authError) {
      console.error('[API crear usuario] Error al crear usuario en Auth:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!newUser.user) {
      console.error('[API crear usuario] No se devolvió usuario')
      return NextResponse.json(
        { error: 'No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    console.log('[API crear usuario] Usuario creado en Auth:', newUser.user.id)

    console.log('[API crear usuario] Usuario creado en Auth:', newUser.user.id)

    // Crear/actualizar perfil del usuario
    console.log('[API crear usuario] Creando perfil...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: email,
        full_name: fullName,
        nombre_completo: fullName, // Por si usa esta columna
        organization_id: organizationId,
        role: role,
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('[API crear usuario] Error al crear perfil:', profileError)
      // Intentar eliminar el usuario de Auth si falla el perfil
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Error al crear el perfil del usuario: ' + profileError.message },
        { status: 500 }
      )
    }

    console.log('[API crear usuario] Perfil creado correctamente')

    // Crear/actualizar user_role
    console.log('[API crear usuario] Asignando rol...')
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: newUser.user.id,
        organization_id: organizationId,
        role: role,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id'
      })

    if (roleError) {
      console.error('[API crear usuario] Error al asignar rol:', roleError)
      return NextResponse.json(
        { error: 'Error al asignar rol: ' + roleError.message },
        { status: 500 }
      )
    }

    console.log('[API crear usuario] ✅ Usuario creado completamente')
    console.log('[API crear usuario] Detalles finales:', {
      id: newUser.user.id,
      email: email,
      fullName: fullName,
      role: role,
      organizationId: organizationId
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        fullName: fullName,
        role: role,
        organizationId: organizationId
      }
    })

  } catch (error: any) {
    console.error('[API crear usuario] Error general:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
