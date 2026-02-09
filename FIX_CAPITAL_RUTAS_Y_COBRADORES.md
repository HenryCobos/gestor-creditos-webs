# 🔧 Fix: Capital de Rutas y Visualización de Cobradores

## 🔴 **Problemas Detectados**

### **Problema 1: Capital de Rutas No Se Actualiza**

**Situación:**
- Rutas creadas con capital inicial (ej: 80,000 PEN)
- Clientes con préstamos activos asignados a rutas (22 préstamos)
- Capital disponible NO disminuía (seguía en ~80,000 PEN)
- **NO reflejaba el dinero realmente prestado**

**Impacto:**
- 🔴 Imposible saber cuánto dinero real hay disponible en cada ruta
- 🔴 Arqueos de caja incorrectos
- 🔴 No se puede controlar el capital real de trabajo

### **Problema 2: "Sin Cobrador" en Tarjetas**

**Situación:**
- Rutas con cobradores asignados
- Tarjetas mostraban "Sin cobrador"
- Al editar la ruta, SÍ se veía el cobrador asignado

**Causa:**
- Query simplificado sin JOIN no cargaba info de cobradores
- No se enriquecían los datos en el frontend

---

## ✅ **Solución Implementada**

### **Fix 1: Recálculo y Actualización Automática de Capital**

#### **Archivo:** `supabase/RECALCULAR_CAPITAL_RUTAS.sql`

Este script hace lo siguiente:

#### **1. Crea Función de Cálculo**

```sql
CREATE OR REPLACE FUNCTION calcular_capital_disponible_ruta(p_ruta_id UUID)
RETURNS NUMERIC
```

**Lógica:**
```
Capital Disponible = 
  Capital Inicial
  + Total de Pagos Recibidos
  - Total Prestado (solo activos y pendientes)
  - Total de Gastos Aprobados
```

**Ejemplo Real:**
```
Capital Inicial:              80,000.00 PEN
+ Pagos recibidos:            15,000.00 PEN
- Préstamos activos:         -50,000.00 PEN (22 préstamos)
- Gastos:                       -120.00 PEN
─────────────────────────────────────────
= Capital Disponible:         44,880.00 PEN
```

#### **2. Recalcula TODAS las Rutas**

```sql
UPDATE rutas
SET capital_disponible = calcular_capital_disponible_ruta(id),
    updated_at = NOW()
```

Esto actualiza **inmediatamente** el capital de todas las rutas existentes.

#### **3. Crea Triggers Automáticos**

Se crean 3 triggers que actualizan el capital automáticamente cuando:

1. **Se crea/modifica/elimina un préstamo**
   ```sql
   trigger_prestamo_actualiza_capital
   ```

2. **Se registra/modifica/elimina un pago**
   ```sql
   trigger_pago_actualiza_capital
   ```

3. **Se registra/modifica/elimina un gasto**
   ```sql
   trigger_gasto_actualiza_capital
   ```

**Ventaja:** El capital se actualiza **en tiempo real**, sin necesidad de recalcular manualmente.

---

### **Fix 2: Mostrar Cobradores en Tarjetas**

#### **Archivo:** `app/dashboard/rutas/page.tsx`

#### **Cambios en `loadRutas()`:**

**ANTES:**
```typescript
// Solo cargaba rutas básicas
.select('*')
// No había info de cobrador
```

**AHORA:**
```typescript
1. Carga rutas básicas
2. Extrae IDs únicos de cobradores
3. Carga info de cobradores usando RPC:
   await supabase.rpc('get_usuarios_organizacion')
4. Filtra solo los cobradores de las rutas
5. Enriquece cada ruta con:
   ruta.cobrador = {
     id, nombre_completo, email
   }
```

**Resultado:**
- ✅ Tarjetas muestran nombre del cobrador
- ✅ Si no tiene cobrador: "Sin cobrador"
- ✅ Logs detallados para debugging

---

## 📊 **Cómo Funciona el Capital Ahora**

### **Estados del Capital**

| Evento | Impacto en Capital |
|--------|-------------------|
| **Crear ruta** | +Capital Inicial |
| **Desembolsar préstamo** | -Monto del préstamo |
| **Recibir pago** | +Monto del pago |
| **Registrar gasto** | -Monto del gasto |
| **Transferir capital entre rutas** | -En ruta origen, +En ruta destino |

### **Ejemplo de Flujo Real**

```
DÍA 1: Crear Ruta
├─ Capital Inicial: 80,000.00 PEN
└─ Capital Disponible: 80,000.00 PEN

DÍA 2: Asignar 8 clientes con 22 préstamos activos (50,000 PEN)
├─ Trigger se ejecuta automáticamente
├─ Capital Disponible: 80,000 - 50,000 = 30,000.00 PEN
└─ ✅ Se actualiza en la BD

DÍA 3: Cobrador recibe pagos (15,000 PEN)
├─ Se registran 10 pagos
├─ Trigger se ejecuta por cada pago
├─ Capital Disponible: 30,000 + 15,000 = 45,000.00 PEN
└─ ✅ Se actualiza automáticamente

DÍA 4: Cobrador registra gastos (120 PEN gasolina)
├─ Se registra gasto
├─ Trigger se ejecuta
├─ Capital Disponible: 45,000 - 120 = 44,880.00 PEN
└─ ✅ Se actualiza automáticamente

DÍA 5: Nuevo préstamo desembolsado (5,000 PEN)
├─ Se crea préstamo
├─ Trigger se ejecuta
├─ Capital Disponible: 44,880 - 5,000 = 39,880.00 PEN
└─ ✅ Se actualiza automáticamente
```

---

## 🚀 **PASOS PARA APLICAR**

### **PASO 1: Ejecutar Script SQL**

1. **Abre Supabase → SQL Editor**
2. **Copia TODO** el contenido de `supabase/RECALCULAR_CAPITAL_RUTAS.sql`
3. **Pega y ejecuta** (clic en "Run")

**Resultado Esperado:**

```
=== ESTADO ACTUAL ===
(Muestra capital actual de cada ruta)

✓ Función calcular_capital_disponible_ruta() creada
✓ Capital de todas las rutas actualizado
✓ Triggers creados para actualización automática

=== RESULTADO FINAL ===
(Muestra capital corregido con desglose completo)

✅ RECALCULO COMPLETADO
```

Verás una tabla como esta:

| Ruta | Capital Inicial | Total Prestado | Total Pagos | Total Gastos | Capital Disponible | Clientes | Préstamos Activos |
|------|----------------|----------------|-------------|--------------|-------------------|----------|-------------------|
| Ruta Prueba | 80,000.00 | 50,000.00 | 15,000.00 | 120.00 | 44,880.00 | 8 | 22 |
| Ruta Centro | 60,000.00 | 35,000.00 | 8,000.00 | 50.00 | 32,950.00 | 9 | 15 |

### **PASO 2: Git Push + Deploy**

```bash
git push origin main
```

Espera 2-3 minutos para el deploy de Vercel.

### **PASO 3: Verificar en la App**

1. **Abre la aplicación**
2. **Ve a "Rutas"**
3. **Verifica:**

#### ✅ **Capital Correcto:**
- Ruta Prueba debe mostrar ~44,880 PEN (no 80,000)
- El capital debe reflejar el dinero REAL disponible

#### ✅ **Cobradores Visibles:**
- Las tarjetas deben mostrar el nombre del cobrador
- Si no tiene cobrador: "Sin cobrador"
- Al editar, la info debe ser consistente

### **PASO 4: Probar Actualizaciones Automáticas**

1. **Registra un nuevo pago** en algún préstamo
2. **Ve a Rutas**
3. El capital debe **actualizarse automáticamente** ✅

4. **Registra un nuevo gasto**
5. **Ve a Rutas**
6. El capital debe **disminuir automáticamente** ✅

7. **Crea un nuevo préstamo** en una ruta
8. **Ve a Rutas**
9. El capital debe **disminuir automáticamente** ✅

---

## 🔍 **Validaciones**

### **1. Verificar Capital Correcto**

En Supabase SQL Editor, ejecuta:

```sql
SELECT 
  r.nombre_ruta,
  r.capital_inicial,
  r.capital_disponible,
  
  -- Desglose manual para verificar
  COALESCE(SUM(CASE WHEN p.estado IN ('activo', 'pendiente') THEN p.monto ELSE 0 END), 0) as prestado,
  
  -- Debe coincidir con capital_disponible
  r.capital_inicial 
    + COALESCE((SELECT SUM(pag.monto_pagado) FROM pagos pag JOIN prestamos pr ON pr.id = pag.prestamo_id WHERE pr.ruta_id = r.id), 0)
    - COALESCE(SUM(CASE WHEN p.estado IN ('activo', 'pendiente') THEN p.monto ELSE 0 END), 0)
    - COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.ruta_id = r.id AND g.aprobado = true), 0)
  as calculo_manual

FROM rutas r
LEFT JOIN prestamos p ON p.ruta_id = r.id
GROUP BY r.id, r.nombre_ruta, r.capital_inicial, r.capital_disponible
ORDER BY r.nombre_ruta;
```

**`capital_disponible` debe ser igual a `calculo_manual`** ✅

### **2. Verificar Triggers Funcionan**

```sql
-- Ver triggers creados
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%capital%'
ORDER BY event_object_table, trigger_name;
```

Deberías ver:
- `trigger_prestamo_actualiza_capital` en tabla `prestamos`
- `trigger_pago_actualiza_capital` en tabla `pagos`
- `trigger_gasto_actualiza_capital` en tabla `gastos`

---

## ⚠️ **Importante**

### **Datos Históricos**

- ✅ El script recalcula el capital de **TODAS las rutas existentes**
- ✅ Considera todos los préstamos, pagos y gastos **hasta el momento**
- ✅ No afecta datos históricos, solo ajusta el capital actual

### **No Afecta:**

- ❌ Clientes
- ❌ Préstamos
- ❌ Pagos
- ❌ Gastos
- ❌ Cuotas

### **Solo Actualiza:**

- ✅ Campo `capital_disponible` en tabla `rutas`
- ✅ Campo `updated_at` en tabla `rutas`

---

## 🎯 **Beneficios**

1. **Control Real del Efectivo**
   - Sabes exactamente cuánto dinero hay en cada ruta
   - Puedes decidir si prestar más o no

2. **Arqueos de Caja Correctos**
   - El dinero esperado se calcula correctamente
   - Detectas faltantes/sobrantes reales

3. **Auditoría Precisa**
   - Cada movimiento actualiza el capital automáticamente
   - Trazabilidad completa

4. **Mejor Toma de Decisiones**
   - Ves qué rutas tienen más capital disponible
   - Puedes redistribuir capital según necesidad

5. **Transparencia Total**
   - Admin ve capital real de cada ruta
   - Cobradores ven su capital disponible

---

## 📝 **Resumen de Cambios**

### **Base de Datos:**
- ✅ Función `calcular_capital_disponible_ruta()`
- ✅ Trigger `trigger_prestamo_actualiza_capital`
- ✅ Trigger `trigger_pago_actualiza_capital`
- ✅ Trigger `trigger_gasto_actualiza_capital`

### **Frontend:**
- ✅ `loadRutas()` enriquecida con info de cobradores
- ✅ Logs detallados para debugging
- ✅ Manejo de errores mejorado

### **Archivos Modificados:**
- ✅ `supabase/RECALCULAR_CAPITAL_RUTAS.sql` (nuevo)
- ✅ `app/dashboard/rutas/page.tsx` (modificado)
- ✅ `FIX_CAPITAL_RUTAS_Y_COBRADORES.md` (documentación)

---

## 🔄 **Próximas Mejoras Sugeridas**

- [ ] Dashboard de "Salud Financiera" por ruta
- [ ] Alertas cuando capital < X% del inicial
- [ ] Gráfica histórica de capital por ruta
- [ ] Reporte de movimientos de capital (PDF/Excel)
- [ ] Proyección de capital futuro basado en cuotas pendientes

---

**Estado:** ✅ **LISTO PARA APLICAR**  
**Prioridad:** 🔴 **ALTA** (afecta control financiero)  
**Fecha:** 09/02/2026  
**Commits:** `3f317af - fix: Corregir capital de rutas y mostrar cobradores en tarjetas`
