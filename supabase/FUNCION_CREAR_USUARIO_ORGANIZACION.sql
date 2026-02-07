-- =====================================================
-- FUNCIÓN PARA CREAR USUARIOS (ADMIN)
-- =====================================================
-- Esta función permite a admins crear cobradores/admins
-- Requiere privilegios de SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.crear_usuario_organizacion(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_organization_id UUID;
  v_is_admin BOOLEAN;
  v_result JSON;
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT 
    p.organization_id,
    p.role = 'admin'
  INTO v_organization_id, v_is_admin
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Solo admins pueden crear usuarios
  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Solo los administradores pueden crear usuarios'
    );
  END IF;

  -- Crear usuario en auth.users usando admin API
  -- NOTA: Esta función debe ejecutarse con privilegios elevados
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('full_name', p_full_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Crear perfil
  INSERT INTO profiles (
    id,
    full_name,
    organization_id,
    role,
    activo,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_full_name,
    v_organization_id,
    p_role,
    true,
    NOW(),
    NOW()
  );

  -- Crear user_role
  INSERT INTO user_roles (
    user_id,
    organization_id,
    role,
    created_at
  ) VALUES (
    v_user_id,
    v_organization_id,
    p_role,
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Usuario creado exitosamente'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'El email ya está registrado'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.crear_usuario_organizacion(TEXT, TEXT, TEXT, TEXT) TO authenticated;

SELECT '✅ Función crear_usuario_organizacion creada' as resultado;
