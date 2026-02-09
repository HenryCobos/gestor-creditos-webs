# 🛡️ Correcciones de Seguridad Supabase

## 🔴 **Problemas Detectados por Security Advisor**

Supabase detectó **4 errores de seguridad** que necesitan ser corregidos:

---

## 📋 **Error 1: Exposed Auth Users**

### **Vista:** `public.v_users_with_roles`

**Problema:**
- Esta vista exponía datos de la tabla `auth.users`
- `auth.users` contiene información sensible (emails, hashed passwords, metadata)
- Si una vista expone estos datos sin protección, cualquier usuario autenticado podría acceder a información de otros usuarios

**Riesgo:**
- 🔴 **ALTO** - Fuga de información sensible
- Usuarios podrían ver emails de otros usuarios
- Información de autenticación expuesta

**Solución:**
- ✅ **ELIMINAR la vista** `v_users_with_roles`
- Ya no es necesaria porque usamos la función RPC `get_usuarios_organizacion()`
- Las funciones RPC con `SECURITY DEFINER` manejan la seguridad correctamente

---

## 📋 **Error 2, 3, 4: Security Definer Views**

### **Vistas Afectadas:**
1. `vista_organizacion_limites`
2. `v_users_with_roles`
3. `vista_uso_por_usuario`

**Problema:**
- Estas vistas fueron creadas con `SECURITY DEFINER`
- `SECURITY DEFINER` ejecuta queries con privilegios del **propietario**, no del usuario
- Sin RLS (Row Level Security) apropiado, esto es un riesgo

**Riesgo:**
- 🟡 **MEDIO-ALTO** - Bypass de políticas de seguridad
- Un usuario podría ver datos de otras organizaciones
- No respetan el principio de "least privilege"

**¿Por qué es problemático `SECURITY DEFINER` en vistas?**

```sql
-- ❌ MAL (vista con SECURITY DEFINER)
CREATE VIEW mi_vista WITH (security_definer=true) AS
SELECT * FROM datos_sensibles;
-- Cualquier usuario puede ver TODOS los datos

-- ✅ BIEN (vista normal + función RPC con SECURITY DEFINER)
CREATE VIEW mi_vista AS
SELECT * FROM datos_sensibles;

CREATE FUNCTION get_mis_datos()
RETURNS SETOF mi_vista
SECURITY DEFINER
AS $$
BEGIN
  -- Validación interna de permisos
  IF NOT es_admin() THEN
    RETURN QUERY SELECT * FROM mi_vista WHERE org_id = mi_org();
  END IF;
END;
$$;
```

**Solución:**
- ✅ **RECREAR las vistas SIN `SECURITY DEFINER`**
- Otorgar solo `SELECT` a `authenticated`
- Usar funciones RPC con `SECURITY DEFINER` para acceso controlado
- Las funciones RPC validan permisos internamente

---

## 🔧 **Implementación de la Solución**

### **Archivo:** `supabase/FIX_SECURITY_ISSUES.sql`

Este script hace lo siguiente:

1. **Elimina `v_users_with_roles`**
   - Ya no se usa (reemplazada por `get_usuarios_organizacion()`)
   
2. **Recrea `vista_organizacion_limites`**
   - Sin `SECURITY DEFINER`
   - Con `GRANT SELECT` solo a `authenticated`
   
3. **Recrea `vista_uso_por_usuario`**
   - Sin `SECURITY DEFINER`
   - Con `GRANT SELECT` solo a `authenticated`

4. **Verifica funciones RPC**
   - Confirma que tienen `SECURITY DEFINER` correctamente
   - Estas SÍ deben tener `SECURITY DEFINER` porque validan permisos internamente

---

## 📊 **Arquitectura de Seguridad Correcta**

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│              (Next.js + Supabase Client)            │
└────────────────┬────────────────────────────────────┘
                 │
                 │ Llama a funciones RPC
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│           FUNCIONES RPC (SECURITY DEFINER)          │
│  • get_usuarios_organizacion()                      │
│  • get_clientes_segun_rol()                         │
│  • get_prestamos_segun_rol()                        │
│  • get_limites_organizacion()                       │
│                                                      │
│  ✅ Validan permisos internamente                   │
│  ✅ Retornan solo datos autorizados                 │
└────────────────┬────────────────────────────────────┘
                 │
                 │ Acceden a vistas/tablas
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│         VISTAS (Sin SECURITY DEFINER)               │
│  • vista_organizacion_limites                       │
│  • vista_uso_por_usuario                            │
│                                                      │
│  ✅ Solo cálculos y agregaciones                    │
│  ✅ No tienen permisos elevados                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              TABLAS BASE + RLS                      │
│  • organizations                                    │
│  • profiles                                         │
│  • clientes                                         │
│  • prestamos                                        │
│                                                      │
│  ✅ RLS ultra-simple (USING true o user_id match)  │
└─────────────────────────────────────────────────────┘
```

---

## ✅ **Pasos para Aplicar la Corrección**

### **1. Ejecutar el Script**

1. Abre **Supabase → SQL Editor**
2. Copia TODO el contenido de `FIX_SECURITY_ISSUES.sql`
3. Pega y haz clic en **"Run"**

### **2. Verificar Correcciones**

Deberías ver:

```
✓ Vista v_users_with_roles eliminada
✓ Vista vista_organizacion_limites recreada sin SECURITY DEFINER
✓ Vista vista_uso_por_usuario recreada sin SECURITY DEFINER
✓ Funciones RPC verificadas
```

### **3. Refrescar Security Advisor**

1. Ve a **Advisors → Security Advisor** en Supabase
2. Haz clic en **"Refresh"**
3. Los **4 errores deberían desaparecer**

---

## 🎯 **Resultado Esperado**

### **Antes:**
- 🔴 4 Errors
- 🟡 46 Warnings

### **Después:**
- ✅ 0 Errors
- 🟡 46 Warnings (las warnings son normales, no críticas)

---

## 📝 **Sobre las 46 Warnings**

Las **warnings (advertencias)** son normales y no críticas. Generalmente son:

- Sugerencias de optimización
- Índices recomendados
- Mejores prácticas opcionales

**No necesitan corrección inmediata** a menos que afecten el rendimiento.

Si quieres, podemos revisarlas después, pero los **4 errors son la prioridad**.

---

## 🔐 **Mejores Prácticas Aplicadas**

✅ **Principio de Menor Privilegio**
- Las vistas NO tienen `SECURITY DEFINER`
- Solo las funciones RPC lo tienen (con validaciones)

✅ **Separación de Responsabilidades**
- Vistas = Cálculos y agregaciones
- Funciones RPC = Control de acceso y permisos

✅ **No Exponer `auth.users`**
- Tabla sensible nunca accesible directamente
- Solo funciones RPC controladas acceden a ella

✅ **RLS Simplificado**
- Tablas con RLS ultra-simple (`USING true`)
- Seguridad manejada en capa de aplicación (funciones RPC)

---

## 🆘 **Si Persisten Errores**

Si después de ejecutar el script y refrescar el Security Advisor **aún aparecen errores**:

1. Toma un **screenshot actualizado** del Security Advisor
2. Envíalo para analizar qué falta
3. Puede ser que necesitemos ajustar permisos específicos

---

## 📚 **Referencias**

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [Row Level Security (RLS)](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

**Estado:** ⏳ Pendiente de aplicar  
**Prioridad:** 🔴 Alta (errores de seguridad)  
**Archivo:** `supabase/FIX_SECURITY_ISSUES.sql`
