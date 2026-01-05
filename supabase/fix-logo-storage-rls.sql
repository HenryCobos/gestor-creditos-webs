-- Script para configurar correctamente el bucket de logos y sus políticas RLS
-- Ejecuta este script en Supabase SQL Editor

-- IMPORTANTE: Primero crea el bucket desde la UI de Storage:
-- 1. Ve a Storage > New bucket
-- 2. Nombre: "company-logos"
-- 3. Marca "Public bucket"
-- 4. Crea el bucket

-- Luego ejecuta este script para configurar las políticas RLS

-- Política 1: Permitir lectura pública de logos
DROP POLICY IF EXISTS "Logos are publicly readable" ON storage.objects;
CREATE POLICY "Logos are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

-- Política 2: Permitir que usuarios autenticados suban logos
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);

-- Política 3: Permitir que usuarios autenticados actualicen sus propios logos
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 4: Permitir que usuarios autenticados eliminen sus propios logos
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
CREATE POLICY "Users can delete their own logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- NOTA: Si las políticas anteriores no funcionan, usa esta versión simplificada:
-- (Descomenta y ejecuta si la versión anterior falla)

/*
-- Política simplificada: Cualquier usuario autenticado puede hacer todo
DROP POLICY IF EXISTS "Authenticated users full access to logos" ON storage.objects;
CREATE POLICY "Authenticated users full access to logos"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);
*/

