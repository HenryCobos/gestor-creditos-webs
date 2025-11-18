# ✅ INSTRUCCIONES FINALES PARA LANZAR TU SOFTWARE

## 🚨 **PASO CRÍTICO ANTES DE LANZAR**

### Ejecuta este Script SQL EN SUPABASE:

1. **Ve a:** https://supabase.com → Tu proyecto → **SQL Editor**
2. **Abre el archivo:** `supabase/fix-completo-planes-definitivo.sql`
3. **Copia TODO el contenido**
4. **Pégalo en el SQL Editor**
5. **Ejecuta** (botón "Run" o Ctrl+Enter)

### ¿Por qué este script?

Este script hace **3 cosas críticas**:

1. ✅ **Corrige TODOS los perfiles existentes** para que tengan el plan gratuito
2. ✅ **Arregla el trigger** para que nuevos usuarios siempre reciban plan gratuito
3. ✅ **Verifica** que todo esté configurado correctamente

---

## 🧪 **PRUEBA COMPLETA (Haz esto antes de vender)**

### 1. Probar Cuenta Nueva

1. **Cierra sesión** de tu cuenta actual
2. **Registra una cuenta completamente nueva** (usa un email temporal si quieres)
3. **Inicia sesión** con la nueva cuenta
4. **Verifica que veas:**
   - ✅ "Plan Actual: Gratuito" en el sidebar izquierdo
   - ✅ "Plan Actual: Gratuito" en la esquina superior derecha del dashboard
   - ✅ Banner azul que dice "Potencia tu Negocio"
   - ✅ Barras de progreso: "0 / 5" clientes, "0 / 5" préstamos activos
   - ✅ Todo el dashboard funcional

### 2. Probar Límites del Plan Gratuito

1. **Crea 5 clientes** (el límite del plan gratuito)
2. **Verifica que:**
   - ✅ La barra de clientes llegue a "5 / 5" y se ponga ROJA
   - ✅ Aparezca el mensaje de advertencia al alcanzar el límite
3. **Intenta crear un 6to cliente:**
   - ✅ Debe mostrar un error o advertencia de límite alcanzado

### 3. Probar Compra de Plan (Con PayPal Sandbox)

1. **Click en "Ver Planes"** o en el banner de upgrade
2. **Selecciona un plan** (ej: Profesional)
3. **Click en "Seleccionar Plan"**
4. **Completa el proceso de PayPal** (usa cuenta sandbox de prueba)
5. **Verifica que después de pagar:**
   - ✅ El indicador del plan cambie a "Profesional" (o el que compraste)
   - ✅ Los límites aumenten (ej: 50 clientes, 50 préstamos)
   - ✅ El banner de upgrade desaparezca

---

## 📊 **Verificación en Supabase**

Después de ejecutar el script, verifica en Supabase:

### Query 1: Ver todos los usuarios y planes

```sql
SELECT 
  p.email,
  pl.nombre as plan,
  p.subscription_status,
  p.payment_method,
  p.created_at
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY p.created_at DESC
LIMIT 20;
```

**Resultado esperado:**
- Usuarios sin `payment_method` → Plan "Gratuito"
- Usuarios con `payment_method = 'paypal'` → Plan pagado correspondiente

### Query 2: Verificar que no hay usuarios sin plan

```sql
SELECT COUNT(*) as usuarios_sin_plan
FROM profiles
WHERE plan_id IS NULL;
```

**Resultado esperado:** `0`

### Query 3: Estadísticas de planes

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

## ✅ **CHECKLIST PRE-LANZAMIENTO**

Antes de empezar a comercializar, asegúrate de que:

### Backend (Supabase)
- [ ] Script SQL ejecutado correctamente
- [ ] Trigger `on_auth_user_created` está activo
- [ ] Plan "Gratuito" existe en la tabla `planes`
- [ ] Todos los usuarios tienen `plan_id` asignado
- [ ] PayPal Plan IDs están configurados en los planes

### Frontend (Aplicación)
- [ ] Cambios deployados en producción (push a GitHub)
- [ ] Cuenta nueva de prueba funciona correctamente
- [ ] Dashboard muestra plan e indicadores
- [ ] Proceso de upgrade funciona
- [ ] Límites del plan se respetan

### PayPal
- [ ] Variables de entorno configuradas en Vercel:
  - `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
- [ ] Planes creados en PayPal
- [ ] Modo: Producción (no Sandbox) para ventas reales
- [ ] Webhook configurado (opcional pero recomendado)

### Páginas Legales
- [ ] Términos de Servicio publicados (`/terminos`)
- [ ] Política de Privacidad publicada (`/privacidad`)
- [ ] Landing page funcional y atractiva

---

## 🚀 **LISTO PARA LANZAR**

Una vez que hayas completado:
1. ✅ Script SQL ejecutado
2. ✅ Todas las pruebas pasadas
3. ✅ Checklist completado

**¡Estás listo para comercializar tu software!** 🎉

---

## 🆘 **Si algo no funciona**

### Problema: Usuarios no tienen plan en el dashboard

**Solución:**
```sql
UPDATE profiles
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'free' LIMIT 1),
  subscription_status = 'active'
WHERE plan_id IS NULL;
```

### Problema: Nuevos usuarios no reciben plan automáticamente

**Solución:** Ejecuta de nuevo el script completo `fix-completo-planes-definitivo.sql`

### Problema: Límites no se respetan

**Solución:** Verifica que el script `fix-plan-limits-function.sql` también esté ejecutado

---

## 📞 **Soporte Adicional**

Si necesitas más ayuda, verifica:
1. Los logs de la consola del navegador (F12)
2. Los logs de Supabase (Dashboard → Logs)
3. Los mensajes de error específicos

---

**¡Mucho éxito con el lanzamiento de tu software!** 🚀💰

