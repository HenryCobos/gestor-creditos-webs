-- Ver estructura de la tabla organizations
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organizations'
ORDER BY ordinal_position;

-- Ver datos existentes
SELECT * FROM organizations LIMIT 5;
