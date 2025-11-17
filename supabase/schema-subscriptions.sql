-- Tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS planes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  precio_mensual DECIMAL(10, 2) NOT NULL DEFAULT 0,
  precio_anual DECIMAL(10, 2) NOT NULL DEFAULT 0,
  limite_clientes INTEGER NOT NULL DEFAULT 0, -- 0 = ilimitado
  limite_prestamos INTEGER NOT NULL DEFAULT 0, -- 0 = ilimitado
  limite_usuarios INTEGER NOT NULL DEFAULT 1,
  caracteristicas JSONB,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insertar planes por defecto
INSERT INTO planes (nombre, slug, precio_mensual, precio_anual, limite_clientes, limite_prestamos, limite_usuarios, caracteristicas, orden) VALUES
('Gratuito', 'free', 0, 0, 5, 5, 1, 
  '{"exportar_pdf": false, "sin_marca_agua": false, "recordatorios": false, "multi_usuario": false, "api": false, "soporte": "72h", "historial_dias": 30}'::jsonb, 
  1),
('Profesional', 'pro', 19, 190, 50, 50, 1, 
  '{"exportar_pdf": true, "sin_marca_agua": true, "recordatorios": false, "multi_usuario": false, "api": false, "soporte": "24h", "historial_dias": 0}'::jsonb, 
  2),
('Business', 'business', 49, 490, 200, 200, 3, 
  '{"exportar_pdf": true, "sin_marca_agua": true, "recordatorios": true, "multi_usuario": true, "api": "basica", "soporte": "12h", "historial_dias": 0}'::jsonb, 
  3),
('Enterprise', 'enterprise', 179, 1790, 0, 0, 0, 
  '{"exportar_pdf": true, "sin_marca_agua": true, "recordatorios": true, "multi_usuario": true, "api": "completa", "marca_blanca": true, "soporte": "24/7", "historial_dias": 0}'::jsonb, 
  4);

-- Agregar campos a la tabla profiles para suscripciones
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES planes(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period VARCHAR(20) DEFAULT 'monthly'; -- monthly o yearly
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_subscription_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50); -- paypal, mercadopago, etc

-- Establecer plan gratuito por defecto para usuarios existentes
UPDATE profiles 
SET plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1)
WHERE plan_id IS NULL;

-- Tabla de historial de pagos
CREATE TABLE IF NOT EXISTS pagos_suscripcion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES planes(id),
  monto DECIMAL(10, 2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'USD',
  periodo VARCHAR(20) NOT NULL, -- monthly o yearly
  metodo_pago VARCHAR(50), -- paypal, mercadopago
  transaction_id VARCHAR(255),
  estado VARCHAR(20) DEFAULT 'completado', -- completado, pendiente, fallido, reembolsado
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_plan_id ON profiles(plan_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_user_id ON pagos_suscripcion(user_id);
CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_fecha ON pagos_suscripcion(fecha_pago DESC);

-- Función para obtener límites del plan del usuario
CREATE OR REPLACE FUNCTION get_user_plan_limits(user_uuid UUID)
RETURNS TABLE (
  limite_clientes INTEGER,
  limite_prestamos INTEGER,
  limite_usuarios INTEGER,
  plan_nombre VARCHAR,
  caracteristicas JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.limite_clientes,
    p.limite_prestamos,
    p.limite_usuarios,
    p.nombre,
    p.caracteristicas
  FROM profiles prof
  JOIN planes p ON prof.plan_id = p.id
  WHERE prof.id = user_uuid;
END;
$$;

-- Función para verificar si el usuario puede agregar más clientes
CREATE OR REPLACE FUNCTION can_add_cliente(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limite INTEGER;
  actual INTEGER;
BEGIN
  -- Obtener límite del plan
  SELECT limite_clientes INTO limite
  FROM profiles prof
  JOIN planes p ON prof.plan_id = p.id
  WHERE prof.id = user_uuid;
  
  -- Si es 0, es ilimitado
  IF limite = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Contar clientes actuales
  SELECT COUNT(*) INTO actual
  FROM clientes
  WHERE user_id = user_uuid;
  
  RETURN actual < limite;
END;
$$;

-- Función para verificar si el usuario puede agregar más préstamos
CREATE OR REPLACE FUNCTION can_add_prestamo(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limite INTEGER;
  actual INTEGER;
BEGIN
  -- Obtener límite del plan
  SELECT limite_prestamos INTO limite
  FROM profiles prof
  JOIN planes p ON prof.plan_id = p.id
  WHERE prof.id = user_uuid;
  
  -- Si es 0, es ilimitado
  IF limite = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Contar préstamos activos
  SELECT COUNT(*) INTO actual
  FROM prestamos
  WHERE user_id = user_uuid AND estado = 'activo';
  
  RETURN actual < limite;
END;
$$;

-- RLS (Row Level Security) para planes
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planes son públicos para lectura"
  ON planes FOR SELECT
  USING (true);

-- RLS para pagos_suscripcion
ALTER TABLE pagos_suscripcion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios pagos"
  ON pagos_suscripcion FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema puede insertar pagos"
  ON pagos_suscripcion FOR INSERT
  WITH CHECK (auth.uid() = user_id);

