# 🗄️ Guía de Configuración de Supabase

## 📋 Índice
1. [Ejecutar Migración SQL](#paso-1-ejecutar-migración-sql)
2. [Verificar que todo funcionó](#paso-2-verificar-que-funcionó)
3. [Configurar Políticas de Seguridad](#paso-3-seguridad)
4. [Pruebas](#paso-4-pruebas)

---

## PASO 1: Ejecutar Migración SQL

### 1.1 Acceder al SQL Editor

```
Dashboard Supabase > Menú Lateral > SQL Editor
```

O usa este link directo reemplazando `tu-proyecto-id`:
```
https://supabase.com/dashboard/project/tu-proyecto-id/sql
```

### 1.2 Crear Nueva Query

1. Haz clic en el botón **"+ New query"** (esquina superior derecha)
2. Se abrirá un editor de SQL vacío

### 1.3 Copiar el Script SQL

Abre el archivo: `supabase/schema-subscriptions.sql`

Copia TODO el contenido (Ctrl+A, Ctrl+C)

### 1.4 Pegar en Supabase

1. Pega el contenido en el editor SQL de Supabase
2. Revisa que se haya copiado completo (debe tener ~171 líneas)

### 1.5 Ejecutar el Script

1. Haz clic en el botón **"Run"** (esquina inferior derecha)
2. O presiona `Ctrl + Enter`

### 1.6 Esperar Confirmación

Verás uno de estos mensajes:

✅ **Success**: "Query executed successfully"
- ¡Todo salió bien! Continúa al Paso 2

❌ **Error**: Si ves un error rojo
- Lee el mensaje de error
- Ve a la sección [Errores Comunes](#errores-comunes)

---

## PASO 2: Verificar que Funcionó

### 2.1 Verificar Tabla de Planes

En el SQL Editor, ejecuta esta consulta:

```sql
SELECT * FROM planes ORDER BY orden;
```

**Resultado esperado**: Deberías ver 4 filas con los planes:
- Gratuito ($0/$0)
- Profesional ($19/$190)
- Business ($49/$490)
- Enterprise ($179/$1790)

### 2.2 Verificar Campos en Profiles

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('plan_id', 'subscription_status', 'subscription_period');
```

**Resultado esperado**: Deberías ver 3 columnas listadas.

### 2.3 Verificar Funciones

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_user_plan_limits', 'can_add_cliente', 'can_add_prestamo');
```

**Resultado esperado**: Las 3 funciones deben aparecer.

---

## PASO 3: Seguridad

### 3.1 Verificar RLS (Row Level Security)

En el SQL Editor:

```sql
-- Verificar que RLS esté habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('planes', 'pagos_suscripcion');
```

**Resultado esperado**: 
- `planes`: rowsecurity = true
- `pagos_suscripcion`: rowsecurity = true

### 3.2 Verificar Políticas

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename IN ('planes', 'pagos_suscripcion');
```

**Resultado esperado**: Deberías ver 3 políticas.

---

## PASO 4: Pruebas

### 4.1 Probar Función de Límites

Reemplaza `TU_USER_ID` con un ID real de la tabla `profiles`:

```sql
-- Obtener un user_id real
SELECT id FROM profiles LIMIT 1;

-- Usar ese ID en la función
SELECT * FROM get_user_plan_limits('aqui-va-el-id');
```

**Resultado esperado**: Deberías ver los límites del plan del usuario.

### 4.2 Probar Verificación de Clientes

```sql
SELECT can_add_cliente('tu-user-id-aqui');
```

**Resultado esperado**: `true` o `false` dependiendo del límite.

---

## 🐛 Errores Comunes

### Error: "relation 'planes' already exists"

**Causa**: La migración ya se ejecutó antes.

**Solución**: 
```sql
-- Eliminar la tabla y volver a crear
DROP TABLE IF EXISTS planes CASCADE;
DROP TABLE IF EXISTS pagos_suscripcion CASCADE;
-- Luego vuelve a ejecutar el script completo
```

### Error: "column 'plan_id' already exists"

**Causa**: Los campos ya existen en profiles.

**Solución**: Continúa, no es crítico. Los datos se mantendrán.

### Error: "function already exists"

**Causa**: Las funciones ya están creadas.

**Solución**: 
```sql
-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS get_user_plan_limits(UUID);
DROP FUNCTION IF EXISTS can_add_cliente(UUID);
DROP FUNCTION IF EXISTS can_add_prestamo(UUID);
-- Luego vuelve a ejecutar el script completo
```

### Error: "extension 'uuid-ossp' does not exist"

**Causa**: Extensión no habilitada.

**Solución**: 
1. Ve a Database > Extensions
2. Busca "uuid-ossp"
3. Habilítala
4. Vuelve a ejecutar el script

---

## ✅ Checklist Final

Marca cada item cuando lo completes:

- [ ] Script SQL ejecutado sin errores
- [ ] Tabla `planes` tiene 4 registros
- [ ] Tabla `pagos_suscripcion` creada
- [ ] Campo `plan_id` existe en `profiles`
- [ ] Funciones SQL creadas (3 en total)
- [ ] RLS habilitado en `planes` y `pagos_suscripcion`
- [ ] Políticas de seguridad creadas
- [ ] Plan gratuito asignado a usuarios existentes

---

## 🔍 Comandos Útiles

### Ver todos los planes
```sql
SELECT * FROM planes;
```

### Ver usuarios y sus planes
```sql
SELECT 
  p.id,
  p.email,
  pl.nombre as plan
FROM auth.users u
JOIN profiles p ON u.id = p.id
JOIN planes pl ON p.plan_id = pl.id;
```

### Ver historial de pagos
```sql
SELECT 
  ps.*,
  p.email
FROM pagos_suscripcion ps
JOIN profiles p ON ps.user_id = p.id
ORDER BY ps.fecha_pago DESC;
```

### Cambiar plan manualmente a un usuario
```sql
UPDATE profiles
SET plan_id = (SELECT id FROM planes WHERE slug = 'pro')
WHERE email = 'usuario@ejemplo.com';
```

### Contar usuarios por plan
```sql
SELECT 
  pl.nombre,
  COUNT(*) as usuarios
FROM profiles p
JOIN planes pl ON p.plan_id = pl.id
GROUP BY pl.nombre
ORDER BY usuarios DESC;
```

---

## 🆘 ¿Necesitas Ayuda?

Si encuentras algún error que no está en esta guía:

1. **Copia el mensaje de error completo**
2. **Verifica qué línea del SQL causó el error**
3. **Revisa si tienes permisos de administrador en Supabase**

---

## 📝 Notas Importantes

⚠️ **IMPORTANTE**: 
- Esta migración es **segura** para ejecutar
- NO elimina datos existentes
- Solo AGREGA nuevas tablas y campos
- Los usuarios existentes recibirán el plan gratuito automáticamente

💾 **RESPALDO**:
- Supabase hace respaldos automáticos diarios
- Puedes hacer un respaldo manual antes si lo deseas
- Ve a Settings > Database > Backups

🔒 **SEGURIDAD**:
- Las políticas RLS protegen los datos
- Los usuarios solo ven sus propios datos
- Los planes son públicos (todos pueden verlos)

---

## ✨ Siguientes Pasos

Una vez completada la configuración de Supabase:

1. ✅ Configurar PayPal (siguiente guía)
2. ✅ Probar sistema en desarrollo
3. ✅ Crear primeras suscripciones de prueba
4. ✅ Pasar a producción

---

¿Listo? ¡Empecemos! 🚀

