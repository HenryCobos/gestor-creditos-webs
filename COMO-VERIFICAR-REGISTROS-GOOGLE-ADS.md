# 📊 Cómo Verificar Registros de Google Ads

## 🎯 Dónde Verificar

Los registros de tus campañas de Google Ads se almacenan en **Supabase** (tu base de datos). Tienes 2 formas de verlos:

### **Opción 1: Supabase SQL Editor (Recomendado para análisis detallado)**

1. Ve a: https://supabase.com
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto **gestor-creditos-webs**
4. En el menú lateral, haz clic en **"SQL Editor"**
5. Abre el archivo: `supabase/MONITOREO-registros-campana.sql`
6. Copia y pega las queries que necesites

### **Opción 2: Dashboard en la Aplicación (Próximamente)**

Próximamente podrás ver los registros directamente en tu aplicación en: `/dashboard/admin/registros`

---

## 🔥 Queries Más Útiles

### **1. Ver SOLO los Registros Exitosos (QUERY PRINCIPAL)**

**🎯 Esta es la query que debes usar para ver tus 13 registros exitosos de Google Ads.**

Esta query muestra **SOLO los registros que están funcionando correctamente** (sin errores):

```sql
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  p.subscription_status as estado_suscripcion,
  -- Contar actividad del usuario
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados,
  -- Estado (siempre será OK porque filtramos solo los que están bien)
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

**¿Qué verás?**
- ✅ **Solo registros exitosos** (los que funcionan correctamente)
- Email de cada usuario registrado
- Fecha y hora del registro
- Nombre completo
- Plan asignado (gratuito o de pago)
- Cuántos clientes y préstamos ha creado
- Estado: ✅ OK o 💰 Usuario de pago

**Esta query NO muestra los registros con errores**, solo los que están funcionando bien.

---

### **2. Contar Registros Exitosos Totales**

**Cuenta cuántos registros tienes que están funcionando correctamente:**

```sql
SELECT 
  COUNT(*) as total_registros_exitosos,
  COUNT(CASE WHEN pl.slug = 'free' THEN 1 END) as usuarios_gratuitos,
  COUNT(CASE WHEN pl.slug != 'free' THEN 1 END) as usuarios_de_pago
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.id IS NOT NULL AND p.plan_id IS NOT NULL;
```

**Usa esta query para:**
- Ver el total de registros exitosos (deberías ver 13 si tu campaña tiene 13)
- Ver cuántos son gratuitos vs de pago

### **3. Registros Exitosos de las Últimas 24 Horas**

**Perfecto para monitorear tu campaña activa en tiempo real (solo los que están bien):**

```sql
SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name,
  pl.nombre as plan,
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados,
  '✅ OK' as estado
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE u.created_at >= NOW() - INTERVAL '24 hours'
  AND p.id IS NOT NULL 
  AND p.plan_id IS NOT NULL
ORDER BY u.created_at DESC;
```

**Usa esta query cuando:**
- Tienes una campaña activa de Google Ads
- Quieres ver los registros del día actual
- Necesitas verificar que todo funciona correctamente

---

### **3. Estadísticas Diarias de Registros**

**Ver cuántos registros tienes por día (útil para medir el rendimiento de tu campaña):**

```sql
SELECT 
  DATE(u.created_at) as fecha,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN p.id IS NOT NULL AND p.plan_id IS NOT NULL THEN 1 END) as registros_ok,
  COUNT(CASE WHEN p.id IS NULL OR p.plan_id IS NULL THEN 1 END) as registros_con_error,
  -- Actividad
  SUM((SELECT COUNT(*) FROM clientes WHERE user_id = u.id)) as total_clientes_creados,
  SUM((SELECT COUNT(*) FROM prestamos WHERE user_id = u.id)) as total_prestamos_creados
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(u.created_at)
ORDER BY fecha DESC;
```

**¿Qué verás?**
- Fecha de cada día
- Total de registros ese día
- Cuántos registros están OK
- Cuántos tienen errores
- Actividad total (clientes y préstamos creados)

---

### **4. Detectar Problemas Rápidamente**

**Ver usuarios que se registraron pero tienen problemas:**

```sql
SELECT 
  u.email,
  u.created_at as fecha_registro,
  CASE 
    WHEN p.id IS NULL THEN '❌ Perfil no creado'
    WHEN p.plan_id IS NULL THEN '❌ Plan no asignado'
    ELSE 'Desconocido'
  END as problema
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL OR p.plan_id IS NULL
ORDER BY u.created_at DESC;
```

**Si ves usuarios aquí:**
1. Ejecuta el script de corrección: `supabase/EJECUTAR-AHORA-corregir-registros-completo.sql`
2. Vuelve a ejecutar esta query para verificar que se corrigieron

---

### **5. Resumen General**

**Ver estadísticas generales de todos tus usuarios:**

```sql
SELECT 
  'Total Usuarios Registrados' as metrica,
  COUNT(*) as valor
FROM auth.users
UNION ALL
SELECT 
  'Usuarios con Perfil OK',
  COUNT(*)
FROM profiles
WHERE plan_id IS NOT NULL
UNION ALL
SELECT 
  'Usuarios con Problemas',
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN profiles p ON au.id = p.id WHERE p.id IS NULL OR p.plan_id IS NULL)
UNION ALL
SELECT 
  'Usuarios Activos (con préstamos)',
  COUNT(DISTINCT user_id)
FROM prestamos
UNION ALL
SELECT 
  'Usuarios de Pago',
  COUNT(*)
FROM profiles p
JOIN planes pl ON p.plan_id = pl.id
WHERE pl.slug != 'free'
UNION ALL
SELECT 
  'Usuarios Gratuitos',
  COUNT(*)
FROM profiles p
JOIN planes pl ON p.plan_id = pl.id
WHERE pl.slug = 'free';
```

---

### **6. Conversiones de tu Campaña**

**Ver qué porcentaje de usuarios realmente usa la plataforma:**

```sql
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN clientes > 0 THEN 1 END) as usuarios_que_crearon_clientes,
  COUNT(CASE WHEN prestamos > 0 THEN 1 END) as usuarios_que_crearon_prestamos,
  ROUND(
    100.0 * COUNT(CASE WHEN clientes > 0 THEN 1 END) / COUNT(*),
    2
  ) as porcentaje_activacion,
  ROUND(
    100.0 * COUNT(CASE WHEN prestamos > 0 THEN 1 END) / COUNT(*),
    2
  ) as porcentaje_conversion
FROM (
  SELECT 
    u.id,
    (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes,
    (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos
  FROM auth.users u
  WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days'
) stats;
```

**Métricas importantes:**
- **porcentaje_activacion**: % de usuarios que crearon al menos 1 cliente
- **porcentaje_conversion**: % de usuarios que crearon al menos 1 préstamo

---

## 📅 Cuándo Usar Cada Query

| Query | Cuándo Usarla |
|-------|---------------|
| **Registros Recientes** | Diariamente, para ver todos los nuevos usuarios |
| **Últimas 24 Horas** | Cuando tienes campaña activa, varias veces al día |
| **Estadísticas Diarias** | Semanalmente, para analizar tendencias |
| **Detectar Problemas** | Si sospechas que algo anda mal |
| **Resumen General** | Mensualmente, para ver el panorama completo |
| **Conversiones** | Semanalmente, para medir el ROI de tu campaña |

---

## ✅ Interpretación de Resultados

### **Estado: ✅ Usuario gratuito OK**
- El usuario se registró correctamente
- Tiene perfil creado
- Tiene plan gratuito asignado
- Puede usar la aplicación sin problemas

### **Estado: ❌ ERROR: Sin perfil**
- El usuario se registró pero no se creó su perfil
- **Solución:** Ejecuta el script de corrección

### **Estado: ❌ ERROR: Sin plan**
- El usuario tiene perfil pero no tiene plan asignado
- **Solución:** Ejecuta el script de corrección

### **Estado: 💰 Usuario de pago**
- El usuario se suscribió a un plan de pago
- ¡Excelente! Es una conversión exitosa

---

## 🚨 Si Encuentras Problemas

Si ves usuarios con estado **❌ ERROR**:

1. **Ejecuta el script de corrección:**
   - Abre: `supabase/EJECUTAR-AHORA-corregir-registros-completo.sql`
   - Copia todo el contenido
   - Pégalo en Supabase SQL Editor
   - Ejecuta (RUN o F5)

2. **Verifica que se corrigieron:**
   - Ejecuta la query "Detectar Problemas" de nuevo
   - Debería mostrar 0 usuarios con problemas

3. **Si persisten los problemas:**
   - Revisa: `ARREGLAR-REGISTROS-USUARIOS.md`
   - Verifica que el plan gratuito existe en la base de datos

---

## 💡 Tips de Monitoreo

1. **Durante campaña activa:**
   - Revisa "Últimas 24 horas" 2-3 veces al día
   - Verifica que no haya errores

2. **Análisis semanal:**
   - Ejecuta "Estadísticas Diarias" para ver tendencias
   - Revisa "Conversiones" para medir efectividad

3. **Mantenimiento mensual:**
   - Ejecuta "Resumen General" para ver el panorama completo
   - Ejecuta "Detectar Problemas" para asegurar que todo está bien

---

## 📊 Comparar con Google Ads

Para verificar que tus conversiones en Google Ads coinciden con tus registros:

1. **En Google Ads:**
   - Ve a: Conversiones → Ver conversiones
   - Anota cuántas conversiones (registros) tienes por día

2. **En Supabase:**
   - Ejecuta la query "Estadísticas Diarias"
   - Compara el número de `total_registros` con las conversiones en Google Ads

**Nota:** Puede haber una pequeña diferencia debido a:
- Usuarios que se registran directamente (sin Google Ads)
- Retraso en el tracking de Google Ads (hasta 24 horas)

---

## 🎯 Próximos Pasos

1. ✅ Configura alertas en Google Ads para recibir notificaciones de conversiones
2. ✅ Revisa regularmente las métricas de conversión
3. ✅ Optimiza tu campaña basándote en los datos de activación y conversión

---

¿Necesitas ayuda? Revisa:
- `ARREGLAR-REGISTROS-USUARIOS.md` - Para solucionar problemas
- `supabase/MONITOREO-registros-campana.sql` - Todas las queries disponibles

