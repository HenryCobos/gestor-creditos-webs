# 🔧 Instrucciones para Corregir el Sistema de Planes

## 📋 Problema Detectado

Los usuarios nuevos no tienen asignado el plan gratuito automáticamente, lo que causa que:
- No se apliquen las restricciones del plan gratuito (5 clientes, 5 préstamos)
- Los usuarios puedan crear clientes y préstamos ilimitados

## ✅ Solución

He creado un script SQL que corrige este problema. Necesitas ejecutarlo en Supabase.

### Paso 1: Abrir Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Abre tu proyecto
3. Ve al **SQL Editor** (menú lateral izquierdo)

### Paso 2: Ejecutar el Script

1. Haz clic en "New Query"
2. Copia y pega el contenido del archivo `supabase/fix-free-plan-trigger.sql`
3. Haz clic en **Run** (o presiona Ctrl+Enter)

### Paso 3: Verificar

Ejecuta esta consulta para verificar que todos los usuarios tienen un plan asignado:

```sql
SELECT 
  p.email, 
  p.plan_id, 
  pl.nombre as plan_nombre,
  pl.limite_clientes,
  pl.limite_prestamos
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id;
```

Deberías ver que todos los usuarios tienen un plan asignado (la mayoría debería tener el plan "Gratuito").

### Paso 4: Verificar en la App

1. Cierra sesión y vuelve a iniciar sesión
2. Ve al Dashboard
3. Deberías ver:
   - Un badge en la esquina superior derecha que dice "Plan Actual: Gratuito"
   - Una tarjeta que muestra tu uso actual (Clientes: 0/5, Préstamos: 0/5)
4. Intenta crear más de 5 clientes o 5 préstamos
5. Debería aparecer un diálogo indicando que has alcanzado el límite

## 🎯 Cambios Realizados

### 1. Script SQL de Corrección (`supabase/fix-free-plan-trigger.sql`)

- ✅ Actualiza el trigger `handle_new_user()` para asignar automáticamente el plan gratuito
- ✅ Corrige usuarios existentes que no tienen plan asignado
- ✅ Establece el estado de suscripción como 'active'

### 2. Indicador Visual del Plan (Dashboard)

**Ubicación**: `app/dashboard/dashboard-client.tsx`

Agregué:
- **Badge del plan actual**: En la esquina superior derecha del dashboard
  - Muestra el nombre del plan con un ícono de corona
  - Colores diferentes según el plan:
    - Gris para Gratuito
    - Azul para Profesional
    - Morado para Business
    - Dorado para Enterprise
  - Es clickeable y te lleva a la página de suscripciones

- **Tarjeta de uso del plan**: Debajo del encabezado
  - Muestra barras de progreso para clientes y préstamos
  - Verde cuando estás por debajo del 80%
  - Amarillo cuando estás entre 80% y 100%
  - Rojo cuando alcanzas el límite
  - Alerta visual si has alcanzado el límite

### 3. Sistema de Límites

**Ubicación**: `lib/subscription-helpers.ts`

La lógica ya estaba correcta:
- `limite = 0` significa ilimitado (solo para plan Enterprise)
- `limite > 0` significa que hay un límite específico
- El plan Gratuito tiene `limite_clientes = 5` y `limite_prestamos = 5`

## 🧪 Pruebas Recomendadas

1. **Nuevo Usuario**:
   - Registra un nuevo usuario
   - Verifica que tenga el plan gratuito asignado
   - Intenta crear 6 clientes (debería bloquearse en el sexto)
   - Intenta crear 6 préstamos (debería bloquearse en el sexto)

2. **Usuario Existente**:
   - Inicia sesión con tu usuario actual
   - Verifica que veas el badge del plan
   - Verifica que veas la tarjeta de uso
   - Las restricciones deberían aplicarse correctamente

3. **Actualización de Plan**:
   - Ve a la página de suscripciones
   - Simula una actualización de plan
   - Verifica que los límites cambien correctamente

## ⚠️ Notas Importantes

1. **Usuarios con más de 5 clientes/préstamos**: Si ya creaste más de 5 clientes o préstamos antes de ejecutar este script, NO se eliminarán. Simplemente no podrás crear más hasta que actualices tu plan.

2. **Plan Gratuito**: El plan gratuito permite:
   - Hasta 5 clientes
   - Hasta 5 préstamos activos
   - 1 usuario
   - Reportes básicos
   - Historial de 30 días

3. **Actualizar Plan**: Para tener más clientes y préstamos, necesitas actualizar a uno de los planes de pago:
   - **Profesional**: 50 clientes/préstamos ($19/mes)
   - **Business**: 200 clientes/préstamos + 3 usuarios ($49/mes)
   - **Enterprise**: Ilimitado todo ($179/mes)

## 🆘 Problemas Comunes

### "No veo el badge del plan"

- Asegúrate de haber ejecutado el script SQL
- Cierra sesión y vuelve a iniciar sesión
- Limpia la caché del navegador (Ctrl+Shift+R)

### "Todavía puedo crear más de 5 clientes"

- Verifica en Supabase que el usuario tiene el plan gratuito asignado
- Verifica que la función `get_user_plan_limits` existe
- Revisa la consola del navegador para ver si hay errores

### "El indicador muestra 0/0"

- Esto significa que no se pudieron cargar los límites
- Verifica que las funciones SQL existan:
  ```sql
  SELECT proname FROM pg_proc WHERE proname LIKE '%user_plan%';
  ```
- Deberías ver `get_user_plan_limits`, `can_add_cliente`, `can_add_prestamo`

## 📞 Soporte

Si después de seguir estos pasos aún tienes problemas, verifica:
1. Que todas las tablas existan en Supabase (`planes`, `profiles`, `clientes`, `prestamos`)
2. Que las funciones SQL estén creadas correctamente
3. Que el RLS (Row Level Security) esté habilitado
4. Los logs de la consola del navegador para mensajes de error

---

✨ **¡Listo!** Con estos cambios, tu sistema de planes y restricciones debería funcionar correctamente.

