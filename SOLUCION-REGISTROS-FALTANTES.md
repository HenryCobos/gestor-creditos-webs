# 🔍 Solución: Registros Faltantes de Google Ads

## 🎯 Problema

Google Ads dice que tuviste 3 registros el 22/11/2025, pero no los ves en la query de registros exitosos.

**Causa probable:** Esos 3 registros tienen errores (sin perfil o sin plan asignado).

---

## ✅ Solución en 3 Pasos

### **Paso 1: Ver los Registros del 22/11/2025 (Incluyendo Errores)**

Ejecuta esta query en Supabase SQL Editor:

```sql
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  CASE 
    WHEN p.id IS NULL THEN '❌ ERROR: Sin perfil'
    WHEN p.plan_id IS NULL THEN '❌ ERROR: Sin plan'
    WHEN pl.slug != 'free' THEN '💰 Usuario de pago'
    ELSE '✅ Usuario gratuito OK'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE DATE(u.created_at) = '2025-11-22'
ORDER BY u.created_at DESC;
```

**¿Qué verás?**
- ✅ Todos los registros del 22/11/2025 (incluyendo los que tienen errores)
- Si ves registros con "❌ ERROR", esos son los que faltan

---

### **Paso 2: Ver TODOS los Registros (Para Encontrar los Faltantes)**

Si no aparecen en la query anterior, ejecuta esta para ver todos los registros recientes:

```sql
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  CASE 
    WHEN p.id IS NULL THEN '❌ ERROR: Sin perfil'
    WHEN p.plan_id IS NULL THEN '❌ ERROR: Sin plan'
    WHEN pl.slug != 'free' THEN '💰 Usuario de pago'
    ELSE '✅ Usuario gratuito OK'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY u.created_at DESC
LIMIT 50;
```

Busca los registros del 22/11/2025 que tengan estado "❌ ERROR".

---

### **Paso 3: Corregir los Registros con Errores**

Si encuentras registros con "❌ ERROR", ejecuta el script de corrección:

1. Abre el archivo: `supabase/EJECUTAR-AHORA-corregir-registros-completo.sql`
2. Copia TODO el contenido
3. Pégalo en Supabase SQL Editor
4. Ejecuta (RUN o Ctrl+Enter)

**Este script:**
- ✅ Crea perfiles faltantes
- ✅ Asigna plan gratuito a usuarios sin plan
- ✅ Corrige todos los registros con problemas

---

## 🔍 Por Qué Puede Haber Diferencia

### **1. Desfase de Tiempo**
- Google Ads registra la conversión cuando alguien hace clic y se registra
- Puede haber un pequeño retraso (minutos u horas) antes de que aparezca en tu base de datos

### **2. Registros con Errores**
- El usuario se registró, pero:
  - No se creó su perfil automáticamente (error en el trigger)
  - No se le asignó el plan gratuito
- Estos registros existen en `auth.users` pero no tienen perfil completo

### **3. Usuarios que No Completaron el Registro**
- Hicieron clic en el anuncio
- Google Ads registró la conversión
- Pero no completaron el proceso de registro en tu app

---

## 📊 Verificar Después de Corregir

Después de ejecutar el script de corrección, vuelve a ejecutar la query de registros exitosos:

```sql
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  CASE 
    WHEN pl.slug != 'free' THEN '💰 Usuario de pago'
    ELSE '✅ Usuario gratuito OK'
  END as estado
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.id IS NOT NULL AND p.plan_id IS NOT NULL
ORDER BY u.created_at DESC;
```

Ahora deberías ver los 3 registros del 22/11/2025 (si se corrigieron correctamente).

---

## 🎯 Query Rápida: Contar Registros por Día

Para ver cuántos registros exitosos tienes por día:

```sql
SELECT 
  DATE(u.created_at) as fecha,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN p.id IS NOT NULL AND p.plan_id IS NOT NULL THEN 1 END) as registros_exitosos,
  COUNT(CASE WHEN p.id IS NULL OR p.plan_id IS NULL THEN 1 END) as registros_con_error
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(u.created_at)
ORDER BY fecha DESC;
```

Esto te mostrará:
- Cuántos registros hubo cada día
- Cuántos están bien (exitosos)
- Cuántos tienen problemas (con error)

---

## ✅ Checklist

- [ ] Ejecuté la query para ver registros del 22/11/2025
- [ ] Encontré los 3 registros (pueden tener estado "❌ ERROR")
- [ ] Ejecuté el script de corrección
- [ ] Verifiqué que ahora aparecen en la query de registros exitosos
- [ ] Confirmé que tengo 13 registros exitosos (o el número correcto)

---

## 🆘 Si Siguen Faltando

Si después de corregir aún no ves los 3 registros:

1. **Verifica en Google Ads:**
   - ¿Las conversiones están confirmadas o son "en revisión"?
   - ¿La fecha de conversión es realmente 22/11/2025?

2. **Verifica en Supabase:**
   - Ejecuta: `SELECT COUNT(*) FROM auth.users WHERE DATE(created_at) = '2025-11-22';`
   - Esto te dirá cuántos usuarios se registraron ese día en total

3. **Posible causa:**
   - Los usuarios pueden haberse registrado pero no confirmado su email
   - O pueden haber usado un email diferente al que Google Ads rastrea

