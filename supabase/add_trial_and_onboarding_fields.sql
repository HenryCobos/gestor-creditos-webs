  -- Campos para sistema de trial y onboarding
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_plan_slug TEXT DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- También en email_campaigns: campo para saber si ya se envió email de aviso de límite
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS limit_warning_sent_at TIMESTAMP WITH TIME ZONE;

-- Comentarios de columnas
COMMENT ON COLUMN public.profiles.trial_start_at IS 'Fecha de inicio del trial gratuito';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Fecha de fin del trial (7 días desde inicio)';
COMMENT ON COLUMN public.profiles.trial_plan_slug IS 'Slug del plan activo durante el trial (default: pro)';
COMMENT ON COLUMN public.profiles.trial_used IS 'Si el usuario ya usó su trial gratuito (solo 1 vez)';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Fecha en que el usuario completó el wizard de onboarding';
COMMENT ON COLUMN public.email_campaigns.limit_warning_sent_at IS 'Fecha en que se envió el email de aviso de límite al 80% de uso';
