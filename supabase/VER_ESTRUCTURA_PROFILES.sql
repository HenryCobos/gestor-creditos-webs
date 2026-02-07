-- Ver estructura completa de profiles con constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Ver constraints NOT NULL específicamente
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND is_nullable = 'NO'
ORDER BY column_name;
