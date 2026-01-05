-- Script SEGURO para configurar políticas RLS del bucket de logos
-- Este script NO elimina políticas existentes, solo crea las que faltan
-- Ejecuta este script en Supabase SQL Editor

-- IMPORTANTE: Primero crea el bucket desde la UI de Storage:
-- 1. Ve a Storage > New bucket
-- 2. Nombre: "company-logos"
-- 3. Marca "Public bucket"
-- 4. Crea el bucket

-- Este script es SEGURO y NO afecta datos de usuarios, préstamos o clientes
-- Solo configura quién puede subir/ver logos

-- Política 1: Permitir lectura pública de logos
-- (Solo se crea si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Logos are publicly readable'
  ) THEN
    CREATE POLICY "Logos are publicly readable"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'company-logos');
  END IF;
END $$;

-- Política 2: Permitir que usuarios autenticados suban logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload logos'
  ) THEN
    CREATE POLICY "Authenticated users can upload logos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'company-logos' 
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- Política 3: Permitir que usuarios autenticados actualicen sus propios logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own logos'
  ) THEN
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
  END IF;
END $$;

-- Política 4: Permitir que usuarios autenticados eliminen sus propios logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own logos'
  ) THEN
    CREATE POLICY "Users can delete their own logos"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'company-logos' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Si las políticas anteriores dan error, usa esta versión simplificada:
-- (Descomenta y ejecuta solo si la versión anterior falla)

/*
-- Versión simplificada: Cualquier usuario autenticado puede hacer todo con logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users full access to logos'
  ) THEN
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
  END IF;
END $$;
*/

