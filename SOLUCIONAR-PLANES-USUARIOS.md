# 🔧 Solucionar Problema de Planes en Usuarios Nuevos

## Problema Detectado

Cuando se crean nuevos usuarios, a veces no se les asigna automáticamente el plan gratuito, lo que resulta en:
- Dashboard sin indicadores de plan
- No se muestran los límites de uso
- Experiencia inconsistente

## Solución Implementada

He implementado una solución en **3 niveles** para garantizar que TODOS los usuarios siempre tengan un plan:

### ✅ Nivel 1: Frontend (Automático al cargar)

**Archivos modificados:**
- `lib/subscription-helpers.ts`
- `app/dashboard/layout.tsx`
- `lib/subscription-store.ts`

**Qué hace:**
- Cuando un usuario inicia sesión, si no tiene perfil o plan asignado, automáticamente se crea/actualiza con el plan gratuito
- Esto funciona en el cliente (navegador) sin necesidad de intervención manual

### ✅ Nivel 2: Backend (Base de datos)

**Archivo SQL:** `supabase/fix-plan-limits-function.sql`

**Qué hace:**
- Mejora las funciones de base de datos para manejar usuarios sin plan
- Las funciones `get_user_plan_limits`, `can_add_cliente`, y `can_add_prestamo` ahora:
  - Detectan cuando un usuario no tiene plan
  - Asignan automáticamente el plan gratuito
  - Retornan los límites correctos incluso si algo falla

### ✅ Nivel 3: Trigger (Prevención)

**Archivo SQL previo:** `supabase/fix-registro-usuarios.sql`

**Qué hace:**
- Trigger automático que se ejecuta cuando se crea un nuevo usuario en `auth.users`
- Crea automáticamente el perfil con el plan gratuito asignado

---

## 📋 Instrucciones para Aplicar la Solución

### Paso 1: Ejecutar el Script SQL en Supabase

1. **Ve a tu proyecto en Supabase:** https://supabase.com
2. **Abre el SQL Editor** (menú lateral izquierdo)
3. **Crea una nueva query**
4. **Copia y pega** el contenido completo del archivo: `supabase/fix-plan-limits-function.sql`
5. **Ejecuta el script** (botón "Run" o Ctrl/Cmd + Enter)

### Paso 2: Verificar que Funciona

Ejecuta esta query en el SQL Editor para verificar:

```sql
-- Ver todos los usuarios y sus planes
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY p.created_at DESC;
```

**Resultados esperados:**
- Todos los usuarios deben tener un `plan_id` (no debe ser NULL)
- Todos deben tener un `plan_nombre` y `plan_slug`
- Los usuarios nuevos deben tener el plan "Gratuito" (slug: 'free')

### Paso 3: Probar con un Usuario Nuevo

1. **Cierra sesión** en tu aplicación
2. **Registra un nuevo usuario** desde `/register`
3. **Inicia sesión** con la nueva cuenta
4. **Verifica que:**
   - ✅ El dashboard muestra el indicador del plan (esquina superior derecha)
   - ✅ El sidebar muestra "Plan Actual: Gratuito"
   - ✅ Se muestran las barras de progreso de uso (clientes y préstamos)
   - ✅ Los límites son: 5 clientes, 5 préstamos activos

---

## 🛠️ Solución para Usuarios Existentes Sin Plan

Si tienes usuarios que ya existen pero no tienen plan asignado, ejecuta este script:

```sql
-- Asignar plan gratuito a todos los usuarios sin plan
UPDATE profiles
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  subscription_status = 'active'
WHERE plan_id IS NULL;

-- Verificar cuántos usuarios se actualizaron
SELECT 
  COUNT(*) as usuarios_actualizados
FROM profiles
WHERE plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1);
```

---

## 🔍 Debugging: Si Sigues Teniendo Problemas

### 1. Verificar que existe el plan gratuito

```sql
SELECT * FROM planes WHERE slug = 'free';
```

**Debe retornar:** 1 fila con el plan "Gratuito"

Si no existe, créalo:

```sql
INSERT INTO planes (nombre, slug, precio_mensual, precio_anual, limite_clientes, limite_prestamos, limite_usuarios, caracteristicas, orden, activo) 
VALUES (
  'Gratuito', 
  'free', 
  0, 
  0, 
  5, 
  5, 
  1, 
  '{"exportar_pdf": false, "sin_marca_agua": false, "recordatorios": false, "multi_usuario": false, "api": false, "soporte": "72h", "historial_dias": 30}'::jsonb, 
  1,
  true
);
```

### 2. Verificar que el trigger está activo

```sql
-- Ver si el trigger existe y está habilitado
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Debe retornar:** 1 fila con el trigger

Si no existe, ejecuta nuevamente: `supabase/fix-registro-usuarios.sql`

### 3. Verificar las funciones RPC

```sql
-- Listar las funciones creadas
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('get_user_plan_limits', 'can_add_cliente', 'can_add_prestamo', 'handle_new_user')
ORDER BY proname;
```

**Debe retornar:** 4 funciones

---

## 📊 Monitoreo Continuo

Para verificar periódicamente que todos los usuarios tienen plan:

```sql
-- Usuarios sin plan (debería retornar 0 filas)
SELECT 
  id,
  email,
  created_at
FROM profiles
WHERE plan_id IS NULL;

-- Resumen de usuarios por plan
SELECT 
  pl.nombre as plan,
  COUNT(p.id) as usuarios
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
GROUP BY pl.nombre
ORDER BY usuarios DESC;
```

---

## ✅ Checklist Final

Después de aplicar todas las soluciones, verifica:

- [ ] Script SQL ejecutado correctamente en Supabase
- [ ] Trigger `on_auth_user_created` existe y está habilitado
- [ ] Funciones RPC actualizadas (`get_user_plan_limits`, etc.)
- [ ] Plan "Gratuito" existe en la tabla `planes`
- [ ] Todos los usuarios existentes tienen `plan_id` asignado
- [ ] Nuevos usuarios se registran correctamente con plan gratuito
- [ ] Dashboard muestra plan e indicadores de uso correctamente
- [ ] Cambios deployados en producción (push a GitHub)

---

## 🚀 Próximos Pasos

Una vez que todo funcione correctamente:

1. **Monitorea** los registros de nuevos usuarios por unos días
2. **Verifica** que el trigger funcione automáticamente
3. **Considera** agregar alertas para detectar usuarios sin plan
4. **Documenta** el proceso para futuras referencias

---

**Estado:** ✅ Solución completa implementada y lista para probar

**Última actualización:** Noviembre 2025

