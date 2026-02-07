-- =====================================================
-- ALTERNATIVA: Permitir signup y auto-asignar a org
-- =====================================================
-- Como no podemos crear usuarios directamente desde SQL,
-- habilitaremos signup y usaremos un trigger para
-- asignar automáticamente a la organización del invitador
-- =====================================================

-- Tabla para invitaciones pendientes
CREATE TABLE IF NOT EXISTS public.invitaciones_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'cobrador')),
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expira_en TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  usado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT invitaciones_usuarios_email_key UNIQUE (email, organization_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON invitaciones_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON invitaciones_usuarios(token);
CREATE INDEX IF NOT EXISTS idx_invitaciones_org ON invitaciones_usuarios(organization_id);

-- RLS para invitaciones
ALTER TABLE public.invitaciones_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden crear invitaciones"
ON public.invitaciones_usuarios FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = invitaciones_usuarios.organization_id
  )
);

CREATE POLICY "Admins pueden ver invitaciones de su org"
ON public.invitaciones_usuarios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = invitaciones_usuarios.organization_id
  )
);

-- =====================================================
-- Función: Crear invitación
-- =====================================================
CREATE OR REPLACE FUNCTION public.crear_invitacion_usuario(
  p_email TEXT,
  p_role TEXT,
  p_full_name TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id UUID;
  v_is_admin BOOLEAN;
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT 
    p.organization_id,
    p.role = 'admin'
  INTO v_organization_id, v_is_admin
  FROM profiles p
  WHERE p.id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Solo los administradores pueden invitar usuarios'
    );
  END IF;

  -- Verificar que el email no esté ya registrado
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este email ya está registrado en el sistema'
    );
  END IF;

  -- Crear invitación
  INSERT INTO invitaciones_usuarios (
    email,
    organization_id,
    invited_by,
    role
  ) VALUES (
    p_email,
    v_organization_id,
    auth.uid(),
    p_role
  )
  RETURNING id, token INTO v_invitation_id, v_token;

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'token', v_token,
    'message', 'Invitación creada. Comparte este link: /register?token=' || v_token
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ya existe una invitación pendiente para este email'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- Trigger: Auto-asignar usuario a org después de signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.asignar_usuario_a_organizacion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitacion RECORD;
BEGIN
  -- Buscar invitación pendiente para este email
  SELECT * INTO v_invitacion
  FROM invitaciones_usuarios
  WHERE email = NEW.email
    AND usado = false
    AND expira_en > NOW()
  LIMIT 1;

  IF FOUND THEN
    -- Crear/actualizar perfil con la organización
    INSERT INTO profiles (
      id,
      full_name,
      organization_id,
      role,
      activo,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      v_invitacion.organization_id,
      v_invitacion.role,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      organization_id = v_invitacion.organization_id,
      role = v_invitacion.role,
      updated_at = NOW();

    -- Crear user_role
    INSERT INTO user_roles (
      user_id,
      organization_id,
      role,
      created_at
    ) VALUES (
      NEW.id,
      v_invitacion.organization_id,
      v_invitacion.role,
      NOW()
    )
    ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = v_invitacion.role;

    -- Marcar invitación como usada
    UPDATE invitaciones_usuarios
    SET usado = true
    WHERE id = v_invitacion.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS on_auth_user_created_assign_org ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_org
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION asignar_usuario_a_organizacion();

SELECT '✅ Sistema de invitaciones creado exitosamente' as resultado;
