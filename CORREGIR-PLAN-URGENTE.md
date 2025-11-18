# ⚠️ CORRECCIÓN URGENTE: Plan Incorrecto en Usuarios Nuevos

## 🔴 Problema Detectado

Los usuarios nuevos están recibiendo el plan "Profesional" en lugar del plan "Gratuito", aunque tienen los límites correctos del plan gratuito.

## 🛠️ Solución Inmediata

### **Ejecutar este script SQL AHORA:**

1. **Ve a Supabase**: https://supabase.com
2. **Abre SQL Editor**
3. **Copia y pega** el contenido completo de: `supabase/fix-plan-usuarios-nuevos-urgente.sql`
4. **Ejecuta el script**

Este script hace lo siguiente:

1. ✅ **Identifica** usuarios con plan incorrecto
2. ✅ **Corrige** automáticamente todos los usuarios sin método de pago al plan gratuito
3. ✅ **Recrea el trigger** para que funcione correctamente
4. ✅ **Verifica** que todo esté correcto

---

## 📊 Verificación Después de Ejecutar

Después de ejecutar el script, verifica:

### 1. Ver Planes de Usuarios

```sql
SELECT 
  p.email,
  pl.nombre as plan,
  p.payment_method,
  p.created_at
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY p.created_at DESC
LIMIT 10;
```

**Resultado esperado:**
- Usuarios sin `payment_method` → Plan "Gratuito"
- Usuarios con `payment_method` = "paypal" → Plan pagado

### 2. Verificar Trigger

```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

**Debe retornar:** 1 fila (trigger activo)

### 3. Contar Usuarios por Plan

```sql
SELECT 
  pl.nombre as plan,
  COUNT(p.id) as cantidad_usuarios
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
GROUP BY pl.nombre
ORDER BY cantidad_usuarios DESC;
```

---

## 🧪 Probar con Usuario Nuevo

Después de ejecutar el script:

1. **Cierra sesión** de tu cuenta actual
2. **Registra una nueva cuenta de prueba**
3. **Inicia sesión**
4. **Verifica que el dashboard muestre:**
   - ✅ "Plan Actual: Gratuito" (en la esquina superior derecha)
   - ✅ "Plan Actual: Gratuito" (en el sidebar)
   - ✅ Límites correctos: 5 clientes, 5 préstamos

---

## 🔍 Causa del Problema

El trigger `handle_new_user` probablemente tenía un error o estaba seleccionando el plan incorrecto al crear nuevos usuarios.

**El script SQL corrige:**
- ✅ La función del trigger para que SIEMPRE asigne el plan "free"
- ✅ Todos los usuarios existentes que tengan plan incorrecto
- ✅ Agrega verificaciones para prevenir futuros errores

---

## ⚡ Corrección para el Usuario Actual

Si quieres corregir SOLO tu usuario actual sin esperar al script completo:

```sql
-- Reemplaza 'TU_EMAIL_AQUI' con tu email
UPDATE profiles
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  subscription_status = 'active'
WHERE email = 'cesarrima25@gmail.com';
```

Después de ejecutar esto, **recarga la página** (Ctrl+Shift+R) y deberías ver "Plan Actual: Gratuito".

---

## 📝 Resumen

1. ✅ **Ejecuta:** `supabase/fix-plan-usuarios-nuevos-urgente.sql`
2. ✅ **Recarga** la página del dashboard
3. ✅ **Verifica** que ahora muestre "Gratuito"
4. ✅ **Prueba** registrar un nuevo usuario

---

**¿Necesitas ayuda?** Avísame si tienes algún error al ejecutar el script.

