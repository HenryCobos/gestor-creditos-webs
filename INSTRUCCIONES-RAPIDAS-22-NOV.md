# 🚀 Instrucciones Rápidas: Encontrar los 3 Registros del 22/11/2025

## ⚡ Solución Rápida (2 minutos)

### **Paso 1: Ver Registros del 22/11/2025 (Incluyendo Errores)**

Copia y pega esta query en Supabase SQL Editor:

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

**¿Qué buscar?**
- Si ves 3 registros con estado "❌ ERROR", esos son los que faltan
- Si ves menos de 3, puede haber un desfase de tiempo o los usuarios no completaron el registro

---

### **Paso 2: Si Encuentras Registros con Error, Corrígelos**

1. Abre: `supabase/EJECUTAR-AHORA-corregir-registros-completo.sql`
2. Copia TODO el contenido
3. Pégalo en Supabase SQL Editor
4. Ejecuta (RUN o Ctrl+Enter)

Esto corregirá automáticamente todos los registros con problemas.

---

### **Paso 3: Verificar que se Corrigieron**

Ejecuta esta query para ver los registros exitosos del 22/11/2025:

```sql
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  '✅ OK' as estado
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE DATE(u.created_at) = '2025-11-22'
  AND p.id IS NOT NULL 
  AND p.plan_id IS NOT NULL
ORDER BY u.created_at DESC;
```

Ahora deberías ver los 3 registros con estado "✅ OK".

---

## 📊 Ver Todos los Registros Recientes (Si No Aparecen)

Si no encuentras los 3 registros en la query del Paso 1, ejecuta esta para ver todos los registros recientes:

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

Busca los registros del 22/11/2025 en la lista.

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué Google Ads dice 3 pero solo veo 1 o 2?**
R: Puede haber desfase de tiempo (horas) o los usuarios no completaron el registro.

**P: ¿Los registros con "❌ ERROR" cuentan como conversiones?**
R: Sí, el usuario se registró, pero tiene un problema técnico. Ejecuta el script de corrección para arreglarlos.

**P: ¿Cómo sé si un registro es de Google Ads o de prueba?**
R: Revisa la fecha y hora. Los de prueba los creaste tú manualmente. Los de Google Ads llegan cuando tu campaña está activa.

---

## ✅ Resultado Esperado

Después de corregir, deberías tener:
- **13 registros exitosos** en total (los 4 que ya viste + los 3 del 22/11 + otros)
- Todos con estado "✅ Usuario gratuito OK"
- Los 3 del 22/11/2025 visibles en la query de registros exitosos

