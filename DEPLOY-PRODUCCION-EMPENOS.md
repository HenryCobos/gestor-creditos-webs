# 🚀 Desplegar Empeños, Solo Intereses y Contratos PDF a Producción

## ✅ Paso 1: SQL Ejecutado

✅ Script SQL ejecutado en Supabase
✅ Tablas creadas: `garantias`
✅ Campos agregados: `tipo_prestamo`, `fecha_fin`, `dias_gracia`
✅ Funciones creadas: `get_empeños_vencidos`

---

## 📦 Paso 2: Commit y Push de Código

### A. Verificar cambios pendientes:

```bash
git status
```

Deberías ver estos archivos modificados:
- `lib/store.ts`
- `lib/loan-calculations.ts`
- `lib/pdf-generator.ts`
- `app/dashboard/prestamos/page.tsx`
- `components/prestamo-detail-dialog.tsx`

Y estos archivos nuevos:
- `supabase/schema-empeños-solo-intereses.sql`
- `INSTRUCCIONES-EMPENOS-SOLO-INTERESES.md`
- `DEPLOY-PRODUCCION-EMPENOS.md`

### B. Hacer commit:

```bash
git add .
git commit -m "feat: Agregar sistema de empeños, modo solo intereses y contratos PDF

- Sistema completo de empeños con garantías/colaterales
- Modo 'solo intereses' con capital al final
- Generación automática de contratos PDF personalizados
- Script SQL para migración de base de datos
- Interfaces TypeScript actualizadas
- Componentes UI para gestión de garantías"
```

### C. Push a producción:

```bash
git push origin main
```

**Si usas otra rama:**
```bash
git push origin tu-rama
```

---

## ⏱️ Paso 3: Vercel Deployment Automático

**Vercel detectará los cambios automáticamente y comenzará a desplegar**

### Verificar el deploy:

1. Ve a: https://vercel.com/dashboard
2. Busca tu proyecto
3. Verás un nuevo deploy en progreso 🔄
4. Espera 2-3 minutos
5. Estado: ✅ **Ready** cuando termine

---

## 🧪 Paso 4: Verificar en Producción

### A. Probar creación de préstamo "Solo Intereses":

1. Abre tu sitio de producción
2. Inicia sesión
3. Ve a **Dashboard** → **Préstamos**
4. Click en **Nuevo Préstamo**
5. Selecciona tipo: **"Solo Intereses (Capital al final)"**
6. Completa el formulario:
   - Cliente: Selecciona uno
   - Monto: $1,000
   - Interés: 5%
   - Cuotas: 6
   - Frecuencia: Mensual
7. **Verifica:**
   - ✅ Resumen muestra "Interés por Cuota"
   - ✅ Resumen muestra "Capital a Pagar al Final"
   - ✅ Fecha de Vencimiento aparece automáticamente
8. Click en **Crear Préstamo**
9. **Verifica:**
   - ✅ Préstamo creado correctamente
   - ✅ Tipo aparece como "Solo Interés" en la tabla
   - ✅ Cuotas creadas (5 de interés, 1 de capital + interés)

### B. Probar creación de préstamo "Empeño":

1. Click en **Nuevo Préstamo**
2. Selecciona tipo: **"Empeño (Con garantías)"**
3. Completa el formulario normalmente
4. En **Garantías/Colaterales:**
   - Click en **Agregar Garantía**
   - Descripción: "Anillo de oro 18k"
   - Categoría: "Joyas"
   - Valor Estimado: $800
   - Fecha Vencimiento: (30 días desde hoy)
5. **Verifica:**
   - ✅ Garantía agregada
   - ✅ Puedes agregar múltiples garantías
   - ✅ Puedes eliminar garantías
6. Click en **Crear Préstamo**
7. **Verifica:**
   - ✅ Préstamo creado correctamente
   - ✅ Tipo aparece como "Empeño" en la tabla

### C. Probar detalle de préstamo con garantías:

1. En la lista de préstamos, busca un empeño
2. Click en el icono de **ojo** 👁️
3. **Verifica:**
   - ✅ Sección "Garantías/Colaterales" aparece
   - ✅ Muestra todas las garantías
   - ✅ Muestra valor estimado, categoría, fecha vencimiento
   - ✅ Estado de cada garantía

### D. Probar generación de contrato PDF:

1. Abre el detalle de cualquier préstamo
2. Click en **"Generar Contrato PDF"** (arriba derecha)
3. **Verifica:**
   - ✅ PDF se descarga automáticamente
   - ✅ Contrato incluye información del prestamista
   - ✅ Contrato incluye información del prestatario
   - ✅ Detalles del préstamo correctos
   - ✅ Si es empeño, incluye garantías
   - ✅ Cláusulas personalizadas según tipo

---

## ✅ Checklist de Verificación en Producción

- [ ] SQL ejecutado en Supabase ✅
- [ ] Código commiteado y pusheado
- [ ] Vercel deployment completado
- [ ] Puedo crear préstamo "Solo Intereses"
- [ ] Cálculo de "Solo Intereses" es correcto
- [ ] Puedo crear préstamo "Empeño" con garantías
- [ ] Garantías se muestran en el detalle
- [ ] Puedo generar contrato PDF
- [ ] Contrato PDF incluye garantías (si es empeño)
- [ ] Tipos de préstamo aparecen en la tabla
- [ ] No hay errores en la consola del navegador

---

## 🐛 Solución de Problemas

### Error: "Column 'tipo_prestamo' does not exist"
**Causa:** Script SQL no se ejecutó correctamente  
**Solución:** 
1. Ve a Supabase SQL Editor
2. Ejecuta de nuevo: `supabase/schema-empeños-solo-intereses.sql`
3. Verifica que las tablas existen

### Error: "Cannot read property 'tipo_prestamo' of undefined"
**Causa:** Préstamos antiguos sin tipo  
**Solución:** Es normal, el sistema usa 'amortizacion' por defecto

### El formulario no muestra el selector de tipo
**Causa:** Cache del navegador  
**Solución:**
1. Refrescar con fuerza: `Ctrl + Shift + R`
2. Limpiar cache del navegador
3. Probar en modo incógnito

### El PDF no se genera
**Causa:** jsPDF no se carga correctamente  
**Solución:**
1. Verifica que `jspdf` está instalado: `npm list jspdf`
2. Si no, instala: `npm install jspdf jspdf-autotable`
3. Re-deploy en Vercel

### Las garantías no se guardan
**Causa:** RLS (Row Level Security) no configurado  
**Solución:**
1. Verifica que el script SQL se ejecutó completamente
2. En Supabase, ve a Table Editor → garantias
3. Verifica que existen políticas RLS

---

## 🎉 ¡Listo!

Si todos los checks pasan, **¡estás en producción con las nuevas funcionalidades!**

### Próximos pasos opcionales:

1. **Renovación de Empeños:**
   - Sistema para renovar empeños vencidos
   - Pago de interés para extender fecha

2. **Liquidación de Garantías:**
   - Marcar garantías como liquidadas
   - Registrar monto de venta

3. **Alertas de Vencimiento:**
   - Notificaciones de empeños próximos a vencer
   - Dashboard de empeños vencidos

4. **Fotos de Garantías:**
   - Subir fotos de artículos
   - Integración con Supabase Storage

---

## 📊 Estadísticas del Deployment

**Archivos modificados:** 5  
**Archivos nuevos:** 3  
**Tablas SQL nuevas:** 1  
**Funciones SQL nuevas:** 1  
**Features nuevas:** 3  

**Tiempo estimado de deploy:** 2-3 minutos  
**Tiempo de prueba:** 10-15 minutos

