# 🗑️ Guía: Eliminar Usuarios de Prueba Correctamente

## 📋 Problema Actual

Cuando eliminas usuarios desde la tabla `profiles` en Supabase:
- ❌ El usuario **sigue existiendo** en `auth.users` (tabla principal de autenticación)
- ❌ No puedes crear nuevas cuentas con ese email (porque existe en `auth.users`)
- ❌ El registro permanece en `email_campaigns` (vinculado a `auth.users`, no a `profiles`)
- ❌ La base de datos queda inconsistente

## ✅ Solución: Script SQL Automático

---

## 🚀 Paso 1: Ejecutar el Script en Supabase

### **A) Abrir SQL Editor**

1. Ve a: [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **gestor-creditos-webs**
3. En el menú lateral, click en **SQL Editor**
4. Click en **New Query**

### **B) Copiar y Ejecutar el Script**

1. Abre el archivo: `supabase/eliminar-usuarios-test-correctamente.sql`
2. Copia **TODO** el contenido
3. Pégalo en el SQL Editor de Supabase
4. Click en **Run** (▶️)

### **C) Verificar los Cambios**

Deberías ver en el output:
```
✅ Foreign key actualizada con ON DELETE CASCADE
✅ Función delete_user_by_email() creada
✅ Se eliminaron X registros huérfanos de email_campaigns
✅ Se eliminaron X registros huérfanos de profiles
```

---

## 🗑️ Paso 2: Eliminar Usuarios de Prueba

Ahora tienes **3 métodos** para eliminar usuarios:

### **Método 1: Usar la Función SQL (Recomendado)**

En el SQL Editor de Supabase:

```sql
-- Eliminar un usuario por email
SELECT * FROM delete_user_by_email('usuario-prueba@test.com');

-- Eliminar múltiples usuarios a la vez
SELECT * FROM delete_user_by_email('prueba1@test.com');
SELECT * FROM delete_user_by_email('prueba2@test.com');
SELECT * FROM delete_user_by_email('prueba3@test.com');
```

**Resultado esperado:**
```
success | message                                    | deleted_user_id
--------|--------------------------------------------|-----------------
true    | Usuario eliminado exitosamente. Email:... | 12345-uuid-here
```

---

### **Método 2: Desde el Dashboard de Supabase (Más Fácil)**

1. Ve a: **Authentication** → **Users**
2. Busca el usuario que quieres eliminar
3. Click en el **icono de basura (🗑️)** al final de la fila
4. Confirma la eliminación
5. ✅ **Automáticamente se eliminará de TODAS las tablas relacionadas**

---

### **Método 3: SQL Directo (Avanzado)**

```sql
-- Eliminar usuario directamente de auth.users
-- (Esto eliminará automáticamente de todas las tablas con ON DELETE CASCADE)
DELETE FROM auth.users 
WHERE email = 'usuario-prueba@test.com';
```

---

## 📊 Verificar el Estado Actual

### **Ver Todos los Usuarios:**

```sql
SELECT 
  au.id,
  au.email,
  au.created_at,
  p.full_name,
  CASE WHEN ec.user_id IS NOT NULL THEN 'Sí' ELSE 'No' END as en_email_campaign
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.email_campaigns ec ON au.id = ec.user_id
ORDER BY au.created_at DESC;
```

### **Ver Solo Usuarios de Prueba:**

```sql
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
WHERE 
  au.email ILIKE '%prueba%' OR
  au.email ILIKE '%test%' OR
  au.email ILIKE '%demo%'
ORDER BY au.created_at DESC;
```

### **Contar Registros por Tabla:**

```sql
SELECT 
  'auth.users' as tabla,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
  'profiles' as tabla,
  COUNT(*) as total
FROM public.profiles
UNION ALL
SELECT 
  'email_campaigns' as tabla,
  COUNT(*) as total
FROM public.email_campaigns;
```

---

## ⚠️ Advertencias Importantes

### **❌ NUNCA hagas esto:**

```sql
-- ❌ MAL: Eliminar solo de profiles
DELETE FROM public.profiles WHERE email = 'usuario@test.com';

-- ❌ MAL: Eliminar solo de email_campaigns
DELETE FROM public.email_campaigns WHERE email = 'usuario@test.com';
```

### **✅ SIEMPRE haz esto:**

```sql
-- ✅ BIEN: Eliminar desde auth.users (elimina automáticamente de todas las tablas)
DELETE FROM auth.users WHERE email = 'usuario@test.com';

-- ✅ MEJOR: Usar la función creada
SELECT * FROM delete_user_by_email('usuario@test.com');

-- ✅ MEJOR AÚN: Usar el Dashboard de Supabase (Authentication > Users)
```

---

## 🔄 Proceso de Eliminación Automático (después del script)

Cuando eliminas un usuario de `auth.users`:

1. ✅ Se elimina de `auth.users` (tabla principal)
2. ✅ Se elimina **automáticamente** de `profiles` (ON DELETE CASCADE)
3. ✅ Se elimina **automáticamente** de `email_campaigns` (ON DELETE CASCADE)
4. ✅ Se elimina **automáticamente** de `clientes` (ON DELETE CASCADE)
5. ✅ Se elimina **automáticamente** de `prestamos` (ON DELETE CASCADE)
6. ✅ Se elimina **automáticamente** de `cuotas` (ON DELETE CASCADE)
7. ✅ Se elimina **automáticamente** de `pagos` (ON DELETE CASCADE)
8. ✅ Se elimina **automáticamente** de `pagos_suscripcion` (ON DELETE CASCADE)

---

## 📝 Ejemplo Práctico Completo

### **Escenario: Tienes 5 usuarios de prueba que quieres eliminar**

```sql
-- 1. Ver los usuarios actuales
SELECT email, created_at 
FROM auth.users 
WHERE email ILIKE '%test%'
ORDER BY created_at DESC;

-- 2. Eliminar usuarios de prueba uno por uno
SELECT * FROM delete_user_by_email('test1@ejemplo.com');
SELECT * FROM delete_user_by_email('test2@ejemplo.com');
SELECT * FROM delete_user_by_email('test3@ejemplo.com');
SELECT * FROM delete_user_by_email('prueba@test.com');
SELECT * FROM delete_user_by_email('demo@usuario.com');

-- 3. Verificar que se eliminaron correctamente
SELECT 
  'auth.users' as tabla,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
  'profiles' as tabla,
  COUNT(*) as total
FROM public.profiles
UNION ALL
SELECT 
  'email_campaigns' as tabla,
  COUNT(*) as total
FROM public.email_campaigns;

-- 4. Verificar que ya NO existen los usuarios de prueba
SELECT email 
FROM auth.users 
WHERE email ILIKE '%test%';
-- Debería retornar 0 filas
```

---

## 🎯 Resumen

### **Antes del Script:**
- ❌ Eliminar de `profiles` dejaba registros huérfanos
- ❌ No podías reutilizar emails eliminados
- ❌ Base de datos inconsistente

### **Después del Script:**
- ✅ Eliminación automática en cascada
- ✅ Puedes reutilizar emails inmediatamente
- ✅ Base de datos siempre consistente
- ✅ Función helper para eliminar por email
- ✅ Limpieza automática de registros huérfanos

---

## 🆘 Solución de Problemas

### **Problema: "No puedo eliminar el usuario, da error"**

**Solución:**
```sql
-- Verificar si el usuario existe
SELECT * FROM auth.users WHERE email = 'email@ejemplo.com';

-- Si existe en auth.users pero da error, revisar permisos
-- Ejecuta el script completo nuevamente
```

### **Problema: "Eliminé el usuario pero sigue en email_campaigns"**

**Solución:**
```sql
-- Ejecutar solo la parte de limpieza de huérfanos del script:
DELETE FROM public.email_campaigns
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

### **Problema: "No puedo crear un nuevo usuario con un email que eliminé"**

**Causa:** El email todavía existe en `auth.users`

**Solución:**
```sql
-- Eliminar desde auth.users directamente
DELETE FROM auth.users WHERE email = 'email@ejemplo.com';

-- O usar la función
SELECT * FROM delete_user_by_email('email@ejemplo.com');
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar el script `eliminar-usuarios-test-correctamente.sql` en Supabase
- [ ] Verificar que la función `delete_user_by_email()` fue creada
- [ ] Ver los mensajes de limpieza de registros huérfanos
- [ ] Listar todos los usuarios actuales
- [ ] Identificar usuarios de prueba a eliminar
- [ ] Eliminar usuarios usando el método preferido
- [ ] Verificar que los conteos coinciden entre tablas
- [ ] Intentar registrar un nuevo usuario con un email eliminado (debería funcionar)

---

**¡Listo! Ahora puedes eliminar usuarios de prueba sin dejar registros huérfanos.** 🎉

