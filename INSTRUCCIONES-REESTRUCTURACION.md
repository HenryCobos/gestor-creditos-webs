# 📋 INSTRUCCIONES - REESTRUCTURACIÓN COMPLETA DEL SISTEMA DE PRÉSTAMOS

## ✅ IMPLEMENTACIÓN COMPLETADA

Se ha completado exitosamente la reestructuración del sistema para soportar los 3 tipos de clientes:

### 1. **Prestamista Tradicional** ✅ (Ya funcionaba perfectamente)
- Tipo: `amortizacion`
- Capital + Interés en cada cuota
- Frecuencias: diario, semanal, quincenal, mensual
- Sin cambios

### 2. **Casas de Empeño** ✅ (Mejorado)
- Tipo: `empeño`
- **CAMBIO IMPORTANTE**: Ahora usa lógica de "solo_intereses" en vez de amortización
- Solo intereses en cada cuota, capital al final
- Con garantías/colaterales
- **NUEVAS FUNCIONALIDADES**:
  - ✅ Botón "Abonar a Capital" (reduce saldo y recalcula intereses)
  - ✅ Botón "Renovar Empeño" (extiende plazo pagando intereses)
  - ✅ Control de renovaciones por garantía
  - ✅ Cálculo automático de fecha de vencimiento

### 3. **Ventas a Crédito** ✅ (NUEVO)
- Tipo: `venta_credito`
- Formulario especializado con:
  - Descripción del producto/servicio
  - Precio de contado
  - Enganche/Cuota inicial
  - Cargos adicionales (seguros, comisiones)
  - Cálculo automático del monto a financiar
- **Página de Productos**: Catálogo e inventario completo
- Navegación agregada al menú

---

## 🚀 PASOS PARA ACTIVAR TODO

### **PASO 1: Ejecutar Script SQL en Supabase** ⚠️ OBLIGATORIO

1. Abre tu proyecto en Supabase: https://supabase.com/dashboard
2. Ve a **SQL Editor** (ícono de consola en el menú lateral)
3. Abre el archivo: `supabase/schema-reestructuracion-completa.sql`
4. **Copia TODO el contenido** del archivo
5. **Pégalo** en el SQL Editor de Supabase
6. Click en **RUN** (▶️)
7. Espera confirmación: ✅ "Success. No rows returned"

**Este script hace:**
- ✅ Agrega columnas nuevas a la tabla `prestamos` (precio_contado, enganche, etc.)
- ✅ Crea tabla `abonos_capital` (para empeños)
- ✅ Crea tabla `productos` (inventario para ventas)
- ✅ Crea tabla `renovaciones_empeno` (historial de renovaciones)
- ✅ Actualiza constraint para incluir `venta_credito`
- ✅ **NO AFECTA datos existentes** (todas las columnas son opcionales)

---

### **PASO 2: Verificar Navegación**

Después del PASO 1, ya tendrás todo funcionando:

**Menú de Navegación:**
- 🏠 Dashboard
- 👥 Clientes
- 💰 Préstamos
- 📦 **Productos** ← NUEVO
- 💳 Cuotas
- 📊 Reportes
- ⚙️ Configuración

---

## 🎯 CÓMO USAR CADA TIPO DE PRÉSTAMO

### 1️⃣ **PRESTAMISTA TRADICIONAL** (Amortización)

**Cuándo usar:** Cliente típico que paga cuotas regulares con capital + interés

**Pasos:**
1. Ir a **Préstamos** → Nuevo Préstamo
2. Tipo: **💰 Amortización (Capital + Interés)**
3. Llenar: Cliente, Monto, Interés, Duración, Frecuencia
4. El sistema calcula automáticamente las cuotas
5. ✅ Listo

**Ejemplo:**
- Préstamo: $10,000
- Interés: 20% mensual
- Plazo: 6 meses
- Frecuencia: Mensual
- **Resultado**: 6 cuotas de $2,333.33 c/u ($10,000 + $2,000 interés total)

---

### 2️⃣ **CASAS DE EMPEÑO**

**Cuándo usar:** Cliente deja garantía (joya, electrónica, etc.), paga solo intereses, y recupera garantía al pagar capital

**Pasos:**
1. Ir a **Préstamos** → Nuevo Préstamo
2. Tipo: **💎 Empeño (Con garantías)**
3. Llenar datos básicos
4. **Agregar Garantías**:
   - Descripción (Ej: Anillo de oro 18k)
   - Categoría (Joyas, Electrónica, etc.)
   - Valor estimado
   - Fecha de vencimiento
   - Observaciones
5. Crear préstamo

**NUEVAS ACCIONES desde "Ver Detalles":**

- **💰 Abonar a Capital**:
  - Click en el botón verde "Abonar a Capital"
  - Ingresa el monto a abonar
  - El sistema calcula automáticamente:
    - Nuevo saldo de capital
    - Ahorro en intereses
    - Nueva cuota de interés (más baja)
  - Las cuotas pendientes se actualizan automáticamente

- **🔄 Renovar Empeño**:
  - Click en el botón morado "Renovar Empeño"
  - Selecciona cuántos meses extender (0.5 - 12)
  - El sistema calcula el interés de renovación
  - Cliente paga ese interés para extender el plazo
  - Se actualiza la fecha de vencimiento
  - Garantía se marca como "renovada"

**Ejemplo:**
- Empeño: $5,000 (con un iPhone 13 Pro como garantía)
- Interés: 10% mensual
- Plazo: 3 meses
- **Cuotas**: 3 cuotas de $500 (solo interés)
- **Al final**: Paga $5,000 capital → Recupera iPhone
- **Si abona $2,000 a capital**:
  - Nuevo saldo: $3,000
  - Nueva cuota de interés: $300 (antes $500)
  - Ahorra $200 por cuota

---

### 3️⃣ **TIENDAS QUE VENDEN A CRÉDITO** (Motos, Muebles, etc.)

**Cuándo usar:** Venta de producto con enganche y financiamiento

**PRIMERO: Crear Productos (Opcional pero recomendado)**

1. Ir a **Productos** (nuevo en el menú 📦)
2. Click "Nuevo Producto"
3. Llenar:
   - Código/SKU (opcional)
   - Nombre (Ej: Moto Honda XR 150)
   - Categoría (Motos, Muebles, etc.)
   - Precio de contado: $30,000
   - Margen a crédito: 15% (opcional)
   - Click "Calcular" → Precio a crédito: $34,500
   - Stock actual
4. Guardar

**LUEGO: Crear Venta a Crédito**

1. Ir a **Préstamos** → Nuevo Préstamo
2. Tipo: **🛍️ Venta a Crédito (Con enganche)**
3. Seleccionar Cliente
4. **Campos especiales aparecen**:
   - **Descripción del Producto**: "Moto Honda XR 150 2024 roja"
   - **Precio de Contado**: $30,000
   - **Enganche**: $5,000 (16.7% del total)
   - **Cargos Adicionales**: $500 (seguro)
   
5. **El sistema calcula automáticamente**:
   - Precio de contado: $30,000
   - Enganche: -$5,000
   - Cargos adicionales: +$500
   - **Monto a financiar: $25,500** ← Este es el "préstamo"

6. Llenar: Interés, Plazo, Frecuencia (como préstamo normal)
7. Crear

**Resultado:**
- Cliente pagó: $5,000 enganche
- Debe pagar: X cuotas sobre $25,500 + intereses
- Al terminar de pagar, ya es dueño de la moto

**Ejemplo completo:**
- Producto: Moto Honda
- Precio contado: $30,000
- Enganche: $5,000
- Seguro: $500
- Monto a financiar: $25,500
- Interés: 5% mensual
- Plazo: 12 meses
- **Resultado**: 12 cuotas de $2,656.25
- **Total que paga el cliente**: $5,000 (enganche) + $31,875 (cuotas) = **$36,875**
- **Interés implícito total**: $6,875 sobre $30,000 = 22.9%

---

## 📊 NUEVAS TABLAS EN LA BASE DE DATOS

### `abonos_capital`
```sql
- id: UUID
- user_id: UUID
- prestamo_id: UUID
- monto_abonado: DECIMAL(10,2)
- saldo_anterior: DECIMAL(10,2)
- saldo_nuevo: DECIMAL(10,2)
- interes_recalculado: DECIMAL(10,2)
- fecha_abono: TIMESTAMPTZ
- metodo_pago: TEXT
- notas: TEXT
```

### `productos`
```sql
- id: UUID
- user_id: UUID
- codigo: TEXT (SKU)
- nombre: TEXT
- categoria: TEXT
- descripcion: TEXT
- precio_contado: DECIMAL(10,2)
- precio_credito: DECIMAL(10,2)
- margen_credito: DECIMAL(5,2)
- stock: INTEGER
- stock_minimo: INTEGER
- foto_url: TEXT
- activo: BOOLEAN
```

### `renovaciones_empeno`
```sql
- id: UUID
- user_id: UUID
- prestamo_id: UUID
- garantia_id: UUID
- fecha_renovacion: TIMESTAMPTZ
- monto_intereses_pagados: DECIMAL(10,2)
- nueva_fecha_vencimiento: DATE
- dias_extendidos: INTEGER
- notas: TEXT
```

### Nuevas columnas en `prestamos`
```sql
- precio_contado: DECIMAL(10,2)        -- Para ventas a crédito
- enganche: DECIMAL(10,2)              -- Cuota inicial
- cargos_adicionales: DECIMAL(10,2)    -- Seguros, comisiones
- descripcion_producto: TEXT           -- Qué se vendió
- excluir_domingos: BOOLEAN            -- Ya existía
```

---

## 🧪 PRUEBAS RECOMENDADAS

### ✅ Test 1: Préstamo Tradicional
1. Crear préstamo tipo "Amortización"
2. Verificar que las cuotas se crean correctamente
3. Pagar una cuota
4. ✅ Debe funcionar igual que antes

### ✅ Test 2: Casa de Empeño
1. Crear préstamo tipo "Empeño"
2. Agregar garantía (Ej: "Laptop HP Pavilion")
3. Ver detalles del préstamo
4. Click "Abonar a Capital"
5. Abonar $1,000
6. Verificar que las cuotas se actualizan
7. Click "Renovar Empeño"
8. Extender por 1 mes
9. Verificar nueva fecha de vencimiento

### ✅ Test 3: Venta a Crédito
1. (Opcional) Crear producto en Productos
2. Crear préstamo tipo "Venta a Crédito"
3. Verificar que campos especiales aparecen
4. Ingresar precio contado y enganche
5. Verificar cálculo automático de monto a financiar
6. Crear préstamo
7. Verificar en la tabla que aparece como "Venta a Crédito"

---

## 🔍 DIFERENCIAS CLAVE

### Antes vs Ahora - EMPEÑO

**ANTES:**
- ❌ Empeño usaba lógica de amortización (capital + interés en cada cuota)
- ❌ No había forma de abonar a capital
- ❌ No se podía renovar fácilmente

**AHORA:**
- ✅ Empeño usa "solo_intereses" (interés en cuota, capital al final)
- ✅ Botón "Abonar a Capital" con cálculo automático
- ✅ Botón "Renovar Empeño" con historial
- ✅ Fecha de vencimiento se calcula automáticamente
- ✅ Más acorde a cómo funciona un empeño real

---

## ⚠️ IMPORTANTE

### Préstamos Existentes

**Los préstamos que ya tenías ANTES de esta actualización:**
- ✅ Siguen funcionando perfectamente
- ✅ No se ven afectados
- ✅ Tipo "empeño" antiguo seguirá con lógica de amortización
- ✅ Nuevos empeños usarán la lógica mejorada

### Migración (Opcional)

Si quieres convertir empeños antiguos a la nueva lógica:
1. No hay migración automática (para no romper datos)
2. Puedes crearlos de nuevo manualmente si lo deseas
3. O dejarlos como están y solo usar la nueva lógica para futuros

---

## 📞 SOPORTE

Si tienes algún problema:

1. ✅ Verifica que ejecutaste el script SQL en Supabase
2. ✅ Verifica que el tipo de préstamo está seleccionado correctamente
3. ✅ Revisa la consola del navegador (F12) en caso de errores
4. ✅ Los botones "Abonar" y "Renovar" solo aparecen en préstamos tipo "empeño"

---

## 🎉 RESUMEN

**Has ganado:**
- ✅ Sistema completo para 3 tipos de clientes
- ✅ Casas de empeño con abonos y renovaciones
- ✅ Ventas a crédito con enganche y productos
- ✅ Inventario de productos
- ✅ Cálculos automáticos inteligentes
- ✅ Sin afectar datos existentes

**Lo único que debes hacer:**
1. ⚠️ **Ejecutar script SQL en Supabase** (PASO 1)
2. ✅ ¡Empezar a usar!

---

## 📁 ARCHIVOS MODIFICADOS

### Nuevos Archivos
- ✅ `supabase/schema-reestructuracion-completa.sql`
- ✅ `app/dashboard/productos/page.tsx`
- ✅ `components/abono-capital-dialog.tsx`
- ✅ `components/renovar-empeno-dialog.tsx`

### Archivos Actualizados
- ✅ `lib/store.ts` (nuevos tipos e interfaces)
- ✅ `lib/loan-calculations.ts` (funciones para ventas y abonos)
- ✅ `app/dashboard/prestamos/page.tsx` (formulario de ventas)
- ✅ `components/prestamo-detail-dialog.tsx` (botones de abono y renovar)
- ✅ `app/dashboard/layout.tsx` (navegación)
- ✅ `components/mobile-menu.tsx` (navegación móvil)

---

**¡DISFRUTA TU SISTEMA MEJORADO! 🚀**

