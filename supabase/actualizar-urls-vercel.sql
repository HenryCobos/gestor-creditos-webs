-- Script para actualizar las URLs de Supabase con tu URL de Vercel
-- IMPORTANTE: Reemplaza la URL con tu URL real de Vercel

-- ============================================
-- INSTRUCCIONES:
-- ============================================
-- 1. Copia tu URL de Vercel (ejemplo: https://gestor-creditos-webs.vercel.app)
-- 2. Ve a Supabase → Authentication → URL Configuration
-- 3. Actualiza manualmente (no es SQL, es en la interfaz):
--    
--    Site URL: https://gestor-creditos-webs.vercel.app
--    
--    Redirect URLs (agregar):
--    https://gestor-creditos-webs.vercel.app/**
--    https://gestor-creditos-webs.vercel.app/login
--    https://gestor-creditos-webs.vercel.app/dashboard
--
-- 4. Guarda los cambios

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- No hay consultas SQL para ejecutar aquí.
-- Todo se hace en la interfaz de Supabase.
--
-- Ruta: Authentication → URL Configuration

-- ============================================
-- IMPORTANTE
-- ============================================
-- Sin esta configuración, el login y registro NO funcionarán
-- en tu URL de Vercel.

