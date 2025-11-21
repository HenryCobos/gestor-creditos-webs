-- ================================================
-- Tabla para Email Drip Campaign
-- ================================================

-- Crear tabla para trackear el drip campaign
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  
  -- Tracking de cada email enviado
  day_0_sent_at TIMESTAMP WITH TIME ZONE, -- Bienvenida (ya configurado en Supabase Auth)
  day_1_sent_at TIMESTAMP WITH TIME ZONE,
  day_2_sent_at TIMESTAMP WITH TIME ZONE,
  day_3_sent_at TIMESTAMP WITH TIME ZONE,
  day_4_sent_at TIMESTAMP WITH TIME ZONE,
  day_5_sent_at TIMESTAMP WITH TIME ZONE,
  day_6_sent_at TIMESTAMP WITH TIME ZONE,
  day_7_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Estado de la campaña
  unsubscribed BOOLEAN DEFAULT FALSE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_unsubscribed ON email_campaigns(unsubscribed);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_email_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_email_campaigns_updated_at_trigger ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at_trigger
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_email_campaigns_updated_at();

-- ================================================
-- Función que se ejecuta cuando un usuario se registra
-- ================================================

CREATE OR REPLACE FUNCTION handle_new_user_email_campaign()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en email_campaigns automáticamente
  INSERT INTO public.email_campaigns (user_id, email, full_name, day_0_sent_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'ahí'),
    NEW.created_at -- Consideramos que el email de bienvenida se envió al registrarse
  )
  ON CONFLICT (user_id) DO NOTHING; -- Por si acaso ya existe
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se activa cuando un usuario se registra
DROP TRIGGER IF EXISTS on_auth_user_created_email_campaign ON auth.users;
CREATE TRIGGER on_auth_user_created_email_campaign
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_email_campaign();

-- ================================================
-- Agregar constraint único para user_id
-- ================================================

ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_user_id_key UNIQUE (user_id);

-- ================================================
-- Comentarios para documentación
-- ================================================

COMMENT ON TABLE email_campaigns IS 'Tabla para trackear el drip campaign de 7 días de onboarding';
COMMENT ON COLUMN email_campaigns.day_0_sent_at IS 'Email de bienvenida (enviado por Supabase Auth)';
COMMENT ON COLUMN email_campaigns.day_1_sent_at IS 'Tu Primer Cliente Perfecto';
COMMENT ON COLUMN email_campaigns.day_2_sent_at IS 'El Error que Todos Cometen';
COMMENT ON COLUMN email_campaigns.day_3_sent_at IS 'El Dashboard Secreto';
COMMENT ON COLUMN email_campaigns.day_4_sent_at IS 'La Psicología del Cobro';
COMMENT ON COLUMN email_campaigns.day_5_sent_at IS 'El Reporte Mágico';
COMMENT ON COLUMN email_campaigns.day_6_sent_at IS 'De Caos a Control';
COMMENT ON COLUMN email_campaigns.day_7_sent_at IS 'La Última Pieza del Rompecabezas';

