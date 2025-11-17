# Actualización de Base de Datos - Frecuencias de Pago

## 🔄 Instrucciones para Actualizar Supabase

Has solicitado agregar diferentes frecuencias de pago (diario, semanal, quincenal, mensual) al sistema. Para que esto funcione, necesitas ejecutar un script SQL en Supabase.

### Paso 1: Ir a Supabase

1. Abre tu proyecto en [https://supabase.com](https://supabase.com)
2. Ve al **SQL Editor** (menú lateral izquierdo)

### Paso 2: Ejecutar el Script SQL

Copia y pega el siguiente código en una nueva consulta y haz click en **Run**:

```sql
-- Agregar nuevas columnas a la tabla prestamos
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS frecuencia_pago TEXT DEFAULT 'mensual' CHECK (frecuencia_pago IN ('diario', 'semanal', 'quincenal', 'mensual'));

ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS tipo_interes TEXT DEFAULT 'simple' CHECK (tipo_interes IN ('simple', 'compuesto'));

-- Actualizar prestamos existentes con valores por defecto
UPDATE public.prestamos 
SET frecuencia_pago = 'mensual' 
WHERE frecuencia_pago IS NULL;

UPDATE public.prestamos 
SET tipo_interes = 'simple' 
WHERE tipo_interes IS NULL;
```

### Paso 3: Verificar

1. Ve a **Table Editor** → tabla `prestamos`
2. Deberías ver dos nuevas columnas:
   - `frecuencia_pago`
   - `tipo_interes`

### Paso 4: Reiniciar la Aplicación

```bash
# Detén el servidor si está corriendo (Ctrl + C)
# Luego reinicia:
npm run dev
```

## ✨ Nuevas Funcionalidades Agregadas

### 1. Frecuencias de Pago
- **Diario**: Pagos cada día (7-365 cuotas)
- **Semanal**: Pagos cada semana (4-104 cuotas)
- **Quincenal**: Pagos cada 15 días (2-52 cuotas)
- **Mensual**: Pagos cada mes (1-60 cuotas)

### 2. Tipos de Interés
- **Simple**: Interés calculado una sola vez sobre el capital inicial
- **Compuesto**: Interés calculado sobre el capital más los intereses acumulados

### 3. Validaciones Inteligentes
El sistema ahora valida automáticamente que el número de cuotas sea apropiado para la frecuencia seleccionada.

### 4. Cálculo Automático de Fechas
Las fechas de vencimiento de las cuotas se calculan automáticamente según la frecuencia:
- Diario: fecha + 1 día por cuota
- Semanal: fecha + 7 días por cuota
- Quincenal: fecha + 14 días por cuota
- Mensual: fecha + 1 mes por cuota

## 📋 Ejemplo de Uso

### Préstamo Semanal:
- Monto: $1,000
- Interés: 10% (simple)
- Cuotas: 8 (8 semanas = 2 meses)
- Frecuencia: Semanal
- Resultado: 8 cuotas de $137.50 cada semana

### Préstamo Quincenal:
- Monto: $5,000
- Interés: 15% (simple)
- Cuotas: 10 (10 quincenas = 5 meses)
- Frecuencia: Quincenal
- Resultado: 10 cuotas de $575.00 cada 15 días

### Préstamo Diario (Microcrédito):
- Monto: $100
- Interés: 5% (simple)
- Cuotas: 30 (30 días = 1 mes)
- Frecuencia: Diario
- Resultado: 30 cuotas de $3.50 por día

## 🚀 ¡Todo Listo!

Después de ejecutar el SQL, tu sistema podrá manejar cualquier tipo de préstamo con diferentes frecuencias de pago, perfecto para diferentes tipos de negocios:

- **Microcréditos**: Pagos diarios
- **Préstamos rápidos**: Pagos semanales
- **Préstamos personales**: Pagos quincenales o mensuales
- **Créditos empresariales**: Pagos mensuales

---

**Nota**: Los préstamos antiguos (creados antes de esta actualización) tendrán `frecuencia_pago = 'mensual'` y `tipo_interes = 'simple'` por defecto.

