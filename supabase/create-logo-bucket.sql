-- Script para crear el bucket de almacenamiento de logos
-- Ejecuta este script en Supabase SQL Editor

-- Crear el bucket (esto se hace desde la UI de Storage, pero aquí está la configuración)
-- Ve a Storage > Create Bucket y crea un bucket llamado 'company-logos'

-- Configurar políticas RLS para el bucket
-- Nota: Estas políticas se configuran desde la UI de Storage > Policies

-- Política para permitir lectura pública de logos
-- CREATE POLICY "Logos are publicly readable"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'company-logos');

-- Política para permitir que usuarios autenticados suban logos
-- CREATE POLICY "Users can upload their own logos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'company-logos' 
--   AND auth.role() = 'authenticated'
-- );

-- Política para permitir que usuarios eliminen sus propios logos
-- CREATE POLICY "Users can delete their own logos"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'company-logos' 
--   AND auth.role() = 'authenticated'
-- );

-- INSTRUCCIONES MANUALES:
-- 1. Ve a Supabase Dashboard > Storage
-- 2. Click en "New bucket"
-- 3. Nombre: "company-logos"
-- 4. Marca "Public bucket" (para que los logos sean accesibles públicamente)
-- 5. Click en "Create bucket"
-- 6. Ve a Storage > Policies > company-logos
-- 7. Crea las políticas mencionadas arriba o usa estas políticas simplificadas:

-- Política de lectura pública (simplificada):
-- Name: "Public read access"
-- Allowed operation: SELECT
-- Policy definition: 
--   (bucket_id = 'company-logos')

-- Política de escritura para usuarios autenticados:
-- Name: "Authenticated users can upload"
-- Allowed operation: INSERT
-- Policy definition:
--   (bucket_id = 'company-logos' AND auth.role() = 'authenticated')

-- Política de eliminación para usuarios autenticados:
-- Name: "Authenticated users can delete"
-- Allowed operation: DELETE
-- Policy definition:
--   (bucket_id = 'company-logos' AND auth.role() = 'authenticated')

