# Funciones disponibles en `lib/subscription-helpers.ts`

Este archivo contiene todas las funciones para manejar suscripciones, planes y límites.

## 📦 Funciones exportadas

### 1. `loadPlans()` ⭐ NUEVA
Carga todos los planes activos disponibles de la base de datos.

```typescript
export async function loadPlans(): Promise<Plan[]>
```

**Uso:**
```typescript
import { loadPlans } from '@/lib/subscription-helpers'

const planes = await loadPlans()
```

**Retorna:** Array de objetos `Plan` ordenados por `orden` ascendente.

---

### 2. `getPlanBenefits(planSlug: string)` ⭐ NUEVA
Obtiene los beneficios de un plan según su slug.

```typescript
export function getPlanBenefits(planSlug: string): string[]
```

**Uso:**
```typescript
import { getPlanBenefits } from '@/lib/subscription-helpers'

const beneficios = getPlanBenefits('pro')
// Retorna: ['Hasta 50 clientes activos', 'Hasta 50 préstamos activos', ...]
```

**Planes soportados:** `free`, `pro`, `business`, `enterprise`

---

### 3. `loadOrganizationSubscription()` ⭐ RECOMENDADA
Carga la suscripción **a nivel de organización** (no individual).

```typescript
export async function loadOrganizationSubscription(): Promise<UserSubscription | null>
```

**Uso:**
```typescript
import { loadOrganizationSubscription } from '@/lib/subscription-helpers'

const subscription = await loadOrganizationSubscription()
// Retorna el plan de la ORGANIZACIÓN, no del usuario individual
```

**Beneficios:**
- Admin y cobradores ven el **mismo plan**
- El plan es compartido por toda la organización
- Fallback automático a `loadUserSubscription()` si no hay organización

---

### 4. `loadOrganizationUsageLimits()` ⭐ RECOMENDADA
Carga los límites de uso **a nivel de organización** (suma de todos los usuarios).

```typescript
export async function loadOrganizationUsageLimits(): Promise<UsageLimits | null>
```

**Uso:**
```typescript
import { loadOrganizationUsageLimits } from '@/lib/subscription-helpers'

const limites = await loadOrganizationUsageLimits()
// limites.clientes.current = Total de clientes de TODA la organización
// limites.prestamos.current = Total de préstamos de TODA la organización
```

**Beneficios:**
- Los límites se **comparten** entre admin y cobradores
- Si un cobrador crea un cliente, el admin lo ve en sus límites
- Usa la función RPC `get_limites_organizacion()` para cálculo eficiente

---

### 5. `loadUserSubscription()` (Fallback/Legacy)
Carga la suscripción **individual** del usuario.

```typescript
export async function loadUserSubscription(): Promise<UserSubscription | null>
```

**Cuándo usar:**
- Para usuarios sin organización
- Como fallback cuando `loadOrganizationSubscription()` no encuentra organización
- Páginas de suscripción/checkout que gestionan planes individuales

---

### 6. `loadUsageLimits()` (Fallback/Legacy)
Carga los límites **individuales** del usuario.

```typescript
export async function loadUsageLimits(): Promise<UsageLimits | null>
```

**Cuándo usar:**
- Para usuarios sin organización
- Como fallback cuando `loadOrganizationUsageLimits()` falla
- Páginas de suscripción/checkout

---

## 🎯 ¿Qué función usar?

### Para páginas del Dashboard (clientes, préstamos, dashboard principal)
```typescript
import { 
  loadOrganizationSubscription, 
  loadOrganizationUsageLimits 
} from '@/lib/subscription-helpers'
```

### Para páginas de Suscripción/Checkout
```typescript
import { 
  loadPlans,
  loadUserSubscription, 
  loadUsageLimits,
  getPlanBenefits 
} from '@/lib/subscription-helpers'
```

### Para páginas de confirmación de compra
```typescript
import { 
  loadUserSubscription,
  getPlanBenefits 
} from '@/lib/subscription-helpers'
```

---

## 📊 Tipos exportados desde `lib/subscription-store.ts`

```typescript
import type { Plan, UserSubscription, UsageLimits } from '@/lib/subscription-store'
```

---

## ⚠️ Errores comunes evitados

### ❌ Error: "has no exported member 'loadPlans'"
**Solución:** Importar de `@/lib/subscription-helpers`:
```typescript
import { loadPlans } from '@/lib/subscription-helpers'
```

### ❌ Error: "has no exported member 'getPlanBenefits'"
**Solución:** Importar de `@/lib/subscription-helpers`:
```typescript
import { getPlanBenefits } from '@/lib/subscription-helpers'
```

### ❌ Error: Los cobradores no ven los clientes del admin
**Solución:** Usar funciones de **organización**, no individuales:
```typescript
// ❌ MAL
import { loadUserSubscription, loadUsageLimits } from '@/lib/subscription-helpers'

// ✅ BIEN
import { loadOrganizationSubscription, loadOrganizationUsageLimits } from '@/lib/subscription-helpers'
```

---

## 🔄 Historial de cambios

- **2026-02-07**: Agregada `loadPlans()` para cargar planes activos
- **2026-02-07**: Agregada `getPlanBenefits()` para obtener beneficios por slug
- **2026-02-07**: Creadas funciones de organización (`loadOrganizationSubscription`, `loadOrganizationUsageLimits`)
- **2026-02-07**: Mantenidas funciones individuales como fallback
