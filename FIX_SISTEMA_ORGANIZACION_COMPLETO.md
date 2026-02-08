# Fix Completo: Sistema de Organización

## 🔴 Problemas Identificados

1. **Cobradores ven "Plan Gratuito"** en lugar del plan de la organización
2. **Inconsistencia en conteo**: Dashboard muestra 28 préstamos, límites muestran 26

## 🔍 Causas Raíz Encontradas

### Problema 1: Plan individual vs Plan de organización

**`app/dashboard/layout.tsx` (ANTES):**
```typescript
// ❌ Cargaba el plan INDIVIDUAL del perfil
let { data: profile } = await supabase
  .from('profiles')
  .select(`
    *,
    plan:planes(id, nombre, slug),  // ⚠️ Plan del perfil individual
    organization_id,
    role
  `)

// ❌ Mostraba el plan individual
planName={profile?.plan?.nombre || 'Gratuito'}
```

**Resultado:**
- Admin: Tiene plan individual asignado → Ve su plan ✅
- Cobrador: NO tiene plan individual → Ve "Gratuito" ❌

### Problema 2: Vista con JOINs complejos

**`vista_organizacion_limites` (ANTES):**
```sql
-- ❌ LEFT JOINs con GROUP BY perdían registros
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN clientes c ON c.user_id = p.id
LEFT JOIN prestamos pr ON pr.user_id = p.id
GROUP BY o.id, ...
COUNT(DISTINCT pr.id) as prestamos_usados
```

**Resultado:**
- Conteo directo: 28 préstamos ✅
- Vista con JOINs: 26 préstamos ❌ (pierde 2)

---

## ✅ Soluciones Implementadas

### Solución 1: Layout carga plan de ORGANIZACIÓN

**`app/dashboard/layout.tsx` (DESPUÉS):**

```typescript
// ✅ Carga el perfil CON la organización y SU plan
let { data: profile } = await supabase
  .from('profiles')
  .select(`
    *,
    organization:organizations(
      id,
      nombre_negocio,
      plan_id,
      subscription_status,
      plan:planes(id, nombre, slug)  // ⭐ Plan de la ORGANIZACIÓN
    )
  `)
  .eq('id', user.id)
  .single()

// ✅ Obtener el plan de la ORGANIZACIÓN
let planInfo = null
if (profile?.organization?.plan) {
  planInfo = profile.organization.plan  // ⭐ Plan de la org
} else {
  // Fallback al plan gratuito
  const { data: freePlan } = await supabase
    .from('planes')
    .select('id, nombre, slug')
    .eq('slug', 'free')
    .single()
  planInfo = freePlan
}

// ✅ Mostrar el plan de la organización
planName={planInfo?.nombre || 'Gratuito'}
```

**Cambios realizados:**
1. ✅ `SELECT` incluye `organization:organizations(plan:planes(...))`
2. ✅ Se extrae `planInfo` del plan de la organización
3. ✅ Se usa `planInfo.nombre` en lugar de `profile.plan.nombre`
4. ✅ Tanto admin como cobradores ven el MISMO plan

### Solución 2: Vista con subqueries precisas

**`vista_organizacion_limites` (DESPUÉS):**

```sql
-- ✅ Subqueries independientes (precisas)
CREATE OR REPLACE VIEW vista_organizacion_limites AS
SELECT 
  o.id as organization_id,
  o.nombre_negocio,
  pl.limite_clientes,
  pl.limite_prestamos,
  
  -- ⭐ Subquery para clientes (preciso)
  COALESCE((
    SELECT COUNT(DISTINCT c.id)
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = o.id
  ), 0) as clientes_usados,
  
  -- ⭐ Subquery para préstamos (preciso)
  COALESCE((
    SELECT COUNT(DISTINCT pr.id)
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = o.id
  ), 0) as prestamos_usados,
  
  ...
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id;
-- ⚠️ SIN LEFT JOIN a profiles, clientes, o préstamos
```

**Ventajas:**
1. ✅ Cada conteo es independiente
2. ✅ No se pierden registros
3. ✅ Consistente con conteo directo
4. ✅ Más eficiente para PostgreSQL

---

## 📝 Archivos Modificados

### Frontend:
1. **`app/dashboard/layout.tsx`** ⭐ PRINCIPAL
   - Cambiado `SELECT` para incluir `organization.plan`
   - Extraer `planInfo` del plan de la organización
   - Usar `planInfo.nombre` en MobileMenu y sidebar
   - Eliminar lógica de asignación de plan individual

### Backend (SQL):
2. **`supabase/FIX_COMPLETO_ORGANIZACION.sql`** ⭐ EJECUTAR ESTO
   - Diagnostica el problema actual
   - Recrea `vista_organizacion_limites` con subqueries
   - Verifica que la función RPC esté correcta
   - Compara conteos (dashboard vs vista)

---

## 📋 Pasos para Aplicar la Solución

### 1. Git Push (Frontend)
```bash
git add -A
git commit -m "fix: Usar plan de organizacion en layout y corregir vista de limites"
git push origin main
```

Espera el deploy de Vercel (2-3 min).

### 2. Ejecutar Script SQL (Backend)
En **Supabase → SQL Editor**, ejecuta:

**`supabase/FIX_COMPLETO_ORGANIZACION.sql`**

Este script:
1. 📊 Muestra conteos actuales (diagnóstico)
2. 🔧 Corrige la vista `vista_organizacion_limites`
3. ✅ Verifica que la función RPC esté bien
4. 📈 Compara conteos (deben ser iguales ahora)

### 3. Verificar Inmediatamente

Después de deploy + script SQL:

**Como ADMIN:**
- Dashboard: Préstamos Activos = X
- Límites: X/50 (debe coincidir)
- Plan: "Plan Profesional" (o el que tengas)

**Como COBRADOR:**
- Dashboard: Muestra sus préstamos
- Plan: "Plan Profesional" (MISMO que el admin)
- Límites: MISMOS números que el admin

---

## 🎯 Comportamiento Esperado

### Antes del Fix:

| Usuario | Plan Mostrado | Límites Clientes | Límites Préstamos |
|---------|---------------|------------------|-------------------|
| Admin | Plan Profesional | 12/50 | 26/50 ❌ |
| Cobrador | Plan Gratuito ❌ | 5/5 ❌ | 3/5 ❌ |

**Problemas:**
- ❌ Cada uno ve plan diferente
- ❌ Límites individuales (no compartidos)
- ❌ Inconsistencia (28 vs 26)

### Después del Fix:

| Usuario | Plan Mostrado | Límites Clientes | Límites Préstamos |
|---------|---------------|------------------|-------------------|
| Admin | Plan Profesional ✅ | 12/50 ✅ | 28/50 ✅ |
| Cobrador | Plan Profesional ✅ | 12/50 ✅ | 28/50 ✅ |

**Logros:**
- ✅ Todos ven el MISMO plan (de la organización)
- ✅ Límites COMPARTIDOS (suma de toda la org)
- ✅ Conteos CONSISTENTES (dashboard = límites)

---

## 🔄 Diagrama del Flujo Correcto

```
┌─────────────────────────────────────┐
│ Usuario ingresa al dashboard       │
└────────────────┬────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ layout.tsx carga:          │
    │ - profile                  │
    │ - organization             │
    │ - organization.plan ⭐     │
    └────────────┬───────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ planInfo = organization.plan       │
│ (NO profile.plan)                  │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ MobileMenu y Sidebar muestran:    │
│ planInfo.nombre                    │
│ (MISMO para todos en la org)       │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ Dashboard carga límites:           │
│ loadOrganizationUsageLimits()      │
│ → get_limites_organizacion()       │
│ → vista_organizacion_limites       │
│ (cuenta con subqueries precisas)   │
└────────────────────────────────────┘
```

---

## 🧪 Test de Verificación

### Después de aplicar los fixes:

1. **Como Admin**, en SQL Editor:
   ```sql
   -- Ver conteos
   SELECT * FROM vista_organizacion_limites
   WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());
   
   -- Debe coincidir con:
   SELECT COUNT(*) FROM prestamos pr
   JOIN profiles p ON p.id = pr.user_id
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());
   ```

2. **En la aplicación**:
   - Refresca como Admin → Ve "Plan Profesional" y límites correctos
   - Ingresa como Cobrador → Ve "Plan Profesional" (MISMO) y límites correctos
   - Ambos deben ver los MISMOS números

---

## ⚠️ Prevención de Futuros Errores

### Regla 1: Plan siempre de la organización

```typescript
// ❌ NUNCA hacer esto
const plan = profile.plan

// ✅ SIEMPRE hacer esto
const plan = profile.organization?.plan || freePlan
```

### Regla 2: Conteos con subqueries, no JOINs

```sql
-- ❌ NUNCA usar múltiples LEFT JOINs con GROUP BY
FROM table1
LEFT JOIN table2 ON ...
LEFT JOIN table3 ON ...
GROUP BY ...
COUNT(DISTINCT ...) -- ⚠️ Puede perder registros

-- ✅ SIEMPRE usar subqueries para conteos
SELECT
  (SELECT COUNT(*) FROM table2 WHERE ...) as count2,
  (SELECT COUNT(*) FROM table3 WHERE ...) as count3
FROM table1
```

### Regla 3: Verificar consistencia

Siempre que agregues una métrica:
1. Cuenta directamente en SQL
2. Cuenta desde la vista/función
3. Verifica que los números coincidan

---

## 📚 Archivos Relacionados

### Frontend (modificados):
- ✅ `app/dashboard/layout.tsx` - Usa plan de organización

### Backend (scripts SQL):
- ⭐ `supabase/FIX_COMPLETO_ORGANIZACION.sql` - Fix principal
- 📝 `supabase/SISTEMA_LIMITES_ORGANIZACION.sql` - Script original
- 📝 `supabase/FIX_CONTEO_PRESTAMOS.sql` - Fix anterior (obsoleto)

### Helpers (ya correctos):
- ✅ `lib/subscription-helpers.ts` - `loadOrganizationSubscription()`
- ✅ `lib/use-limites.ts` - Hooks de límites
- ✅ `components/limites-organizacion-card.tsx` - UI de límites

---

## 📞 Si Algo Falla

### Plan sigue mostrando "Gratuito":
1. Verifica que el deploy de Vercel terminó
2. Limpia caché del navegador (Ctrl+Shift+R)
3. Verifica en SQL que `organization.plan_id` no sea NULL

### Conteos siguen inconsistentes:
1. Ejecuta el script SQL completo
2. Verifica las queries de diagnóstico al final
3. Si los números no coinciden, envía los resultados del script

---

**Fecha:** 2026-02-07  
**Versión:** 2.0 (Solución Completa)  
**Estado:** Listo para deploy + ejecución SQL
