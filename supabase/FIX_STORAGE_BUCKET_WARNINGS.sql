-- =========================================================
-- FIX: "Public Bucket Allows Listing" - storage.company-logos
-- =========================================================
-- El bucket company-logos tiene una política SELECT con
-- USING (bucket_id = 'company-logos') que permite a cualquier
-- usuario listar TODOS los archivos del bucket.
--
-- SOLUCIÓN SEGURA:
-- ✅ El bucket sigue siendo público (las URLs de logos siguen funcionando)
-- ✅ Se restringe el LISTADO a que cada usuario solo vea sus propios archivos
-- ✅ No se rompe nada en la UI de logos de empresa
--
-- Ejecutar en: Supabase → SQL Editor → Run
-- =========================================================

-- Eliminar política de lectura pública sin restricción
DROP POLICY IF EXISTS "Logos are publicly readable"      ON storage.objects;
DROP POLICY IF EXISTS "Public Access"                    ON storage.objects;
DROP POLICY IF EXISTS "Public read access"               ON storage.objects;
DROP POLICY IF EXISTS "Allow public read"                ON storage.objects;

-- Crear política de SELECT restringida:
-- Cada usuario autenticado solo puede listar SUS PROPIOS archivos.
-- Las URLs directas (ej: https://<project>.supabase.co/storage/v1/object/public/company-logos/...)
-- siguen funcionando sin autenticación porque el bucket es PUBLIC.
CREATE POLICY "Logos select own files"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Mantener políticas de escritura (INSERT/UPDATE/DELETE) sin cambios
-- Solo reemplazamos la de SELECT que era demasiado permisiva

-- =========================================================
-- VERIFICACIÓN
-- =========================================================

SELECT
  policyname,
  cmd AS operacion,
  roles,
  qual AS using_expr
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND qual LIKE '%company-logos%'
ORDER BY cmd;

-- =========================================================
-- RESULTADO ESPERADO:
-- - La política SELECT ahora limita a cada usuario ver solo sus archivos
-- - Las otras políticas (INSERT, UPDATE, DELETE) sin cambios
-- - Las URLs de logos existentes siguen funcionando públicamente
-- =========================================================
