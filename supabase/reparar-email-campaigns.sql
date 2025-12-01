-- Script para REPARAR y POBLAR la tabla de campañas de email
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Asegurar que la tabla existe
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  
  -- Tracking de cada email enviado
  day_0_sent_at TIMESTAMP WITH TIME ZONE, -- Bienvenida
  day_1_sent_at TIMESTAMP WITH TIME ZONE,
  day_2_sent_at TIMESTAMP WITH TIME ZONE,
  day_3_sent_at TIMESTAMP WITH TIME ZONE,
  day_4_sent_at TIMESTAMP WITH TIME ZONE,
  day_5_sent_at TIMESTAMP WITH TIME ZONE,
  day_6_sent_at TIMESTAMP WITH TIME ZONE,
  day_7_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Estado
  unsubscribed BOOLEAN DEFAULT FALSE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT email_campaigns_user_id_key UNIQUE (user_id)
);

-- 2. Asegurar índices
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);

-- 3. Crear función y trigger para nuevos usuarios (si no existen)
CREATE OR REPLACE FUNCTION handle_new_user_email_campaign()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_campaigns (user_id, email, full_name, day_0_sent_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.created_at
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_email_campaign ON auth.users;
CREATE TRIGGER on_auth_user_created_email_campaign
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_email_campaign();

-- 4. IMPORTANTE: Poblar usuarios existentes que faltan en la tabla
-- Esto "reactiva" la campaña para usuarios que ya se registraron pero no estaban en la tabla
INSERT INTO public.email_campaigns (user_id, email, full_name, created_at, day_0_sent_at)
SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', 'Usuario') as full_name,
    created_at,
    created_at as day_0_sent_at -- Asumimos que ya recibieron bienvenida
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.email_campaigns);

-- 5. Verificar resultados
SELECT count(*) as total_campanas FROM public.email_campaigns;

