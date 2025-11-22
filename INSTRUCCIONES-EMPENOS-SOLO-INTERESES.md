# 📋 Instrucciones: Sistema de Empeños, Solo Intereses y Contratos PDF

## ✅ Implementación Completada

Se han implementado las siguientes mejoras:

1. ✅ **Sistema de Empeños/Colaterales**
2. ✅ **Modo "Solo Intereses"** 
3. ✅ **Plantillas de Contratos PDF** personalizables

---

## 🗄️ Paso 1: Actualizar Base de Datos

**IMPORTANTE:** Debes ejecutar el script SQL en Supabase antes de usar las nuevas funcionalidades.

### Pasos:

1. Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve al **SQL Editor** (menú lateral izquierdo)
3. Abre una nueva consulta
4. Copia y pega el contenido del archivo: `supabase/schema-empeños-solo-intereses.sql`
5. Haz clic en **Run** (o presiona Ctrl+Enter)

### ¿Qué hace este script?

- ✅ Agrega campo `tipo_prestamo` a la tabla `prestamos` (amortizacion, solo_intereses, empeño)
- ✅ Agrega campo `fecha_fin` para préstamos "solo intereses"
- ✅ Agrega campo `dias_gracia` para renovaciones
- ✅ Crea tabla `garantias` para empeños
- ✅ Configura Row Level Security (RLS) para garantías
- ✅ Crea función para consultar empeños vencidos

---

## 📝 Paso 2: Verificar Cambios

Después de ejecutar el script SQL:

1. Ve a **Table Editor** → tabla `prestamos`
2. Deberías ver las nuevas columnas:
   - `tipo_prestamo` (texto)
   - `fecha_fin` (date, nullable)
   - `dias_gracia` (integer, nullable)

3. Ve a **Table Editor** → debería existir la tabla `garantias` con:
   - `id`, `user_id`, `prestamo_id`
   - `descripcion`, `categoria`, `valor_estimado`
   - `fecha_vencimiento`, `estado`
   - `fecha_liquidacion`, `monto_liquidacion`
   - `fecha_renovacion`, `numero_renovaciones`

---

## 🚀 Paso 3: Reiniciar la Aplicación

```bash
# Detén el servidor si está corriendo (Ctrl + C)
# Luego reinicia:
npm run dev
```

---

## 🎯 Cómo Usar las Nuevas Funcionalidades

### 1. **Crear Préstamo "Solo Intereses"**

1. Ve a **Dashboard** → **Préstamos**
2. Click en **Nuevo Préstamo**
3. Selecciona tipo: **"Solo Intereses (Capital al final)"**
4. Completa el formulario normalmente
5. El sistema calculará automáticamente:
   - **Pago mensual:** Solo el interés sobre el capital
   - **Última cuota:** Interés + Capital total
   - **Fecha de vencimiento:** Calculada automáticamente

**Ejemplo:**
- Monto: $1,000
- Interés: 5% mensual
- Cuotas: 6 mensuales
- **Resultado:**
  - Cuotas 1-5: $50 cada una (solo interés)
  - Cuota 6: $1,050 (interés + capital)

---

### 2. **Crear Préstamo de Empeño**

1. Selecciona tipo: **"Empeño (Con garantías)"**
2. Completa los datos del préstamo
3. En la sección **"Garantías/Colaterales":**
   - Click en **"Agregar Garantía"**
   - Completa:
     - Descripción (requerido): "Anillo de oro 18k", "iPhone 13", etc.
     - Categoría: Joyas, Electrónica, Vehículo, etc.
     - Valor Estimado: Valor aproximado del artículo
     - Fecha de Vencimiento: Fecha límite para renovar o pagar
     - Observaciones: Notas adicionales
4. Puedes agregar múltiples garantías
5. Click en **"Crear Préstamo"**

**Ejemplo:**
- Monto: $500
- Garantía: Anillo de oro, valor estimado $800
- Fecha vencimiento: 30 días

---

### 3. **Ver Garantías de un Empeño**

1. En la lista de préstamos, busca un préstamo tipo "Empeño"
2. Click en el icono de **ojo** 👁️ para ver detalles
3. En la sección **"Garantías/Colaterales"** verás:
   - Descripción y categoría
   - Valor estimado
   - Fecha de vencimiento
   - Estado (activo, liquidado, renovado)
   - Número de renovaciones
   - Alertas si está vencido

---

### 4. **Generar Contrato PDF**

1. Abre el detalle de cualquier préstamo
2. Click en **"Generar Contrato PDF"** (arriba a la derecha)
3. Se descargará un PDF con:
   - Información del prestamista y prestatario
   - Detalles completos del préstamo
   - Garantías (si es empeño)
   - Cláusulas personalizadas según el tipo
   - Espacios para firmas

**El contrato se personaliza automáticamente según el tipo:**
- **Amortización:** Cláusulas estándar de préstamo
- **Solo Intereses:** Menciona que capital se paga al final
- **Empeño:** Incluye garantías y cláusulas específicas de empeño

---

## 📊 Tipos de Préstamo Disponibles

### 1. **Amortización** (Por defecto)
- Pago de capital + interés distribuido en cuotas
- Cada cuota reduce el capital pendiente
- Es el modo tradicional de préstamos

### 2. **Solo Intereses**
- Solo se paga interés periódicamente
- Capital se paga completo al final (bullet payment)
- Útil para préstamos cortos o renovables
- Última cuota incluye capital + interés

### 3. **Empeño**
- Similar a amortización
- Incluye gestión de garantías/colaterales
- Control de vencimiento de empeños
- Soporte para renovaciones

---

## 🎨 Características de Garantías

### Estados de Garantía:
- **Activo:** Empeño vigente
- **Liquidado:** Artículo vendido (empeño vencido)
- **Renovado:** Empeño extendido
- **Recuperado:** Cliente pagó y recuperó el artículo

### Categorías Disponibles:
- Joyas
- Electrónica
- Vehículo
- Electrodomésticos
- Herramientas
- Otros

---

## 📋 Campos Nuevos en Préstamos

### `tipo_prestamo`
- Valores: `amortizacion`, `solo_intereses`, `empeño`
- Por defecto: `amortizacion`

### `fecha_fin`
- Solo para modo "solo intereses"
- Fecha cuando vence el capital
- Calculada automáticamente

### `dias_gracia`
- Días de gracia para renovaciones
- Útil para empeños

---

## 🔧 Funciones SQL Disponibles

### `get_empeños_vencidos(user_uuid)`
Consulta empeños vencidos para un usuario (o todos).

**Ejemplo:**
```sql
SELECT * FROM get_empeños_vencidos(NULL);
-- Devuelve todos los empeños vencidos

SELECT * FROM get_empeños_vencidos('user-uuid');
-- Devuelve empeños vencidos de un usuario específico
```

---

## ⚠️ Notas Importantes

1. **Préstamos Existentes:**
   - Los préstamos creados antes de esta actualización tendrán `tipo_prestamo = 'amortizacion'` por defecto
   - No necesitas actualizarlos manualmente

2. **Garantías:**
   - Solo se pueden crear en préstamos tipo "empeño"
   - Al menos una garantía debe tener descripción para crear el empeño

3. **Cálculo de Cuotas:**
   - **Solo Intereses:** Primera a penúltima cuota = solo interés. Última = interés + capital
   - **Amortización/Empeño:** Todas las cuotas distribuyen capital + interés

4. **Contratos PDF:**
   - Se generan en el navegador (no requiere servidor)
   - Usan el nombre de empresa de tu configuración
   - Se descargan automáticamente

---

## 🐛 Solución de Problemas

### Error: "Column 'tipo_prestamo' does not exist"
**Solución:** Ejecuta el script SQL primero (Paso 1)

### Error: "Table 'garantias' does not exist"
**Solución:** El script SQL no se ejecutó completamente. Vuelve a ejecutarlo.

### Los préstamos antiguos no tienen tipo
**Solución:** Es normal. Todos los préstamos existentes se marcan como "amortización" automáticamente.

### No puedo agregar garantías
**Solución:** Asegúrate de seleccionar tipo "Empeño" antes de agregar garantías.

---

## 📱 Próximos Pasos (Opcional)

### Mejoras Futuras:
1. **Renovación de Empeños:**
   - Pago de interés para extender fecha de vencimiento
   - Incrementar contador de renovaciones

2. **Liquidación de Garantías:**
   - Marcar garantía como liquidada
   - Registrar monto de venta
   - Cálculo de ganancia

3. **Alertas de Vencimiento:**
   - Notificaciones de empeños próximos a vencer
   - Dashboard de empeños vencidos

4. **Fotos de Garantías:**
   - Subir fotos de artículos empeñados
   - Almacenamiento en Supabase Storage

---

## ✅ Checklist de Verificación

- [ ] Script SQL ejecutado en Supabase
- [ ] Tabla `garantias` existe
- [ ] Campo `tipo_prestamo` existe en `prestamos`
- [ ] Aplicación reiniciada
- [ ] Puedo crear préstamo "Solo Intereses"
- [ ] Puedo crear préstamo "Empeño" con garantías
- [ ] Puedo generar contrato PDF
- [ ] Las garantías se muestran en el detalle del préstamo

---

## 🎉 ¡Listo!

Ya puedes usar todas las nuevas funcionalidades. Si tienes preguntas o problemas, revisa la sección de Solución de Problemas arriba.

**Archivos modificados:**
- `lib/store.ts` - Interfaces actualizadas
- `lib/loan-calculations.ts` - Cálculo "solo intereses"
- `lib/pdf-generator.ts` - Contratos personalizados
- `app/dashboard/prestamos/page.tsx` - Formulario actualizado
- `components/prestamo-detail-dialog.tsx` - Vista de garantías y botón PDF

**Archivos nuevos:**
- `supabase/schema-empeños-solo-intereses.sql` - Script de migración

