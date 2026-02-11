# 🔧 FIX: Sistema de Organizaciones con Plan Compartido

**Fecha**: 11 Feb 2026  
**Problema**: Usuarios nuevos reciben "Plan Gratuito" individual  
**Causa**: Trigger conflictivo  
**Solución**: Sistema de planes a nivel organización

---

## 🔴 Problema Identificado

### Síntoma
Cuando el admin (con Plan Profesional de 50 clientes/50 préstamos) crea un nuevo cobrador, el cobrador ve "Plan Gratuito" y tiene límites de 5/5.

### Causa Raíz
Existía un trigger `on_auth_user_created` que **automáticamente asignaba un "plan gratuito" individual** a cada nuevo usuario:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();  -- ❌ Asignaba plan individual
```

Esto contradecía el modelo de organizaciones donde:
- ✅ La **ORGANIZACIÓN** tiene el plan
- ✅ **TODOS** los usuarios de la org comparten ese plan

---

## ✅ Solución Implementada

### Cambios en Base de Datos

#### 1. Eliminado Trigger Conflictivo
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```

#### 2. Limpieza de Planes Individuales
```sql
-- Usuarios en organizaciones NO deben tener plan_id individual
UPDATE profiles
SET 
  plan_id = NULL,
  limite_clientes = NULL,
  limite_prestamos = NULL
WHERE organization_id IS NOT NULL;
```

#### 3. Nuevo Trigger Correcto
```sql
CREATE FUNCTION public.handle_new_user_signup() -- ✅ CORREGIDO
-- Este trigger:
-- 1. Crea UNA ORGANIZACIÓN para el nuevo usuario
-- 2. La ORGANIZACIÓN tiene el plan (no el usuario)
-- 3. El usuario es vinculado a la org (organization_id)
-- 4. El usuario NO tiene plan_id individual
```

### Modelo de Datos Correcto

```
┌─────────────────────────────────────────┐
│          ORGANIZATIONS TABLE            │
├─────────────────────────────────────────┤
│ id, name, plan_id  ← ✅ PLAN AQUÍ      │
│ (Plan Profesional: 50/50)               │
└─────────────────────────────────────────┘
              ↑
              │ organization_id (FK)
              │
┌─────────────────────────────────────────┐
│            PROFILES TABLE               │
├─────────────────────────────────────────┤
│ Admin:                                  │
│  - organization_id: [org_id]            │
│  - plan_id: NULL  ← ✅ NO PLAN INDIV.  │
│  - role: 'admin'                        │
│                                         │
│ Cobrador 1:                             │
│  - organization_id: [org_id]            │
│  - plan_id: NULL  ← ✅ NO PLAN INDIV.  │
│  - role: 'cobrador'                     │
│                                         │
│ Cobrador 2:                             │
│  - organization_id: [org_id]            │
│  - plan_id: NULL  ← ✅ NO PLAN INDIV.  │
│  - role: 'cobrador'                     │
└─────────────────────────────────────────┘

🎯 TODOS comparten el plan de la organización
```

---

## 📋 Cómo Funciona Ahora

### Para Usuarios Existentes en Organizaciones
1. **Admin** tiene `organization_id = X`
2. **Cobradores** tienen `organization_id = X`
3. **Organización X** tiene `plan_id` → "Plan Profesional" (50/50)
4. Todos los usuarios tienen `plan_id = NULL`
5. Frontend usa `get_limites_organizacion()` → Retorna límites de la org

### Para Nuevos Usuarios Creados por Admin (API)
Cuando admin crea un cobrador desde `/dashboard/usuarios`:

```typescript
// /api/usuarios/crear
await supabaseAdmin.from('profiles').upsert({
  id: newUser.id,
  organization_id: adminOrgId,  // ✅ Mismo org del admin
  role: 'cobrador',
  plan_id: NULL,                // ❌ NO asigna plan individual
  limite_clientes: NULL,        // ❌ NO asigna límites individuales
  limite_prestamos: NULL
})
```

✅ El nuevo usuario **automáticamente comparte** el plan de la organización.

### Para Nuevos Usuarios desde Landing Page
Cuando alguien se registra desde la landing:

1. Trigger `on_auth_user_created` se dispara
2. Crea una **nueva organización** con plan gratuito
3. Vincula al usuario a esa organización como admin
4. Usuario tiene `plan_id = NULL` pero accede al plan via `organization_id`

---

## 🚀 Scripts para Ejecutar

### Orden de Ejecución

#### 1️⃣ **PRIMERO**: Fix Security Advisor (si aún no lo hiciste)
```bash
# En Supabase SQL Editor
supabase/FIX_SECURITY_FINAL_CORREGIDO.sql
```

Esto asegura que:
- ✅ `get_limites_organizacion()` funciona correctamente
- ✅ Vistas problemáticas están eliminadas

#### 2️⃣ **SEGUNDO**: Fix Organizaciones Plan Compartido
```bash
# En Supabase SQL Editor
supabase/FIX_ORGANIZACIONES_PLAN_COMPARTIDO.sql
```

Esto corrige:
- ✅ Elimina trigger conflictivo
- ✅ Limpia planes individuales
- ✅ Configura sistema de planes compartidos

---

## 🔍 Verificación

Después de ejecutar los scripts, verifica:

### 1. Usuarios en Organizaciones Sin Plan Individual
```sql
SELECT 
  COUNT(*) as usuarios_en_org_con_plan_individual
FROM profiles
WHERE organization_id IS NOT NULL
  AND plan_id IS NOT NULL;

-- Resultado esperado: 0
```

### 2. Plan de la Organización
```sql
SELECT 
  o.name as organizacion,
  pl.nombre as plan,
  pl.limite_clientes,
  pl.limite_prestamos,
  COUNT(p.id) as total_usuarios
FROM organizations o
JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.name, pl.nombre, pl.limite_clientes, pl.limite_prestamos;

-- Tu organización debe mostrar "Plan Profesional" con 50/50
```

### 3. En el Dashboard
- Admin debe ver: **"Plan Profesional - 50 clientes / 50 préstamos"**
- Cobradores deben ver: **"Plan Profesional - 50 clientes / 50 préstamos"**
- Ambos consumen del **mismo pool** de límites

---

## 🎯 Resultado Final

### ✅ Comportamiento Correcto

| Usuario | Organization ID | plan_id | Role | Límites que ve |
|---------|----------------|---------|------|----------------|
| Admin | org-123 | `NULL` | admin | 50/50 (del org) |
| Cobrador 1 | org-123 | `NULL` | cobrador | 50/50 (del org) |
| Cobrador 2 | org-123 | `NULL` | cobrador | 50/50 (del org) |

**Organization org-123:**
- `plan_id` → Plan Profesional
- `limite_clientes` → 50
- `limite_prestamos` → 50

### ❌ Comportamiento Anterior (Incorrecto)

| Usuario | Organization ID | plan_id | Role | Límites que ve |
|---------|----------------|---------|------|----------------|
| Admin | org-123 | `NULL` | admin | 50/50 (del org) |
| Cobrador 1 | org-123 | **plan-free-id** ❌ | cobrador | **5/5** ❌ |
| Cobrador 2 | org-123 | **plan-free-id** ❌ | cobrador | **5/5** ❌ |

---

## 📝 Notas Importantes

### Frontend No Requiere Cambios
El frontend **YA** está configurado correctamente:
- ✅ Usa `get_limites_organizacion()` para obtener límites
- ✅ Esta función consulta el plan de la **organización**, no del usuario
- ✅ No hay cambios necesarios en React/Next.js

### API Routes Ya Están Correctas
`/api/usuarios/crear`:
- ✅ NO asigna `plan_id` al crear usuarios
- ✅ Solo asigna `organization_id`
- ✅ No requiere cambios

### RLS Policies Funcionan Correctamente
Las políticas RLS:
- ✅ Filtran por `organization_id`
- ✅ No dependen de `plan_id`
- ✅ No requieren ajustes

---

## ⚠️ Casos Edge

### ¿Qué pasa si un usuario NO tiene organization_id?
Usuarios antiguos o mal configurados sin `organization_id`:
- Frontend intentará llamar `get_limites_organizacion()`
- Función lanzará excepción: "Usuario sin organización"
- Solución: Correr migration para asignar org a usuarios huérfanos

### ¿Qué pasa si quiero límites individuales por cobrador?
Si en el futuro deseas que cobradores tengan sub-límites:
- Usa campos `limite_clientes` y `limite_prestamos` en `profiles`
- Modifica `get_limites_organizacion()` para chequear ambos límites
- El código ya está preparado para esto (columnas existen, solo están en NULL)

---

## 🎉 Conclusión

Este fix asegura que:
1. ✅ **Solo las organizaciones tienen planes**
2. ✅ **Todos los usuarios de una org comparten ese plan**
3. ✅ **No hay asignación automática de planes individuales**
4. ✅ **Sistema escalable y consistente**

Tu admin con Plan Profesional de 50/50 ahora verá que sus cobradores **comparten ese mismo límite**, no tienen su propio plan gratuito de 5/5.
