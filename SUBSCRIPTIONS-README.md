# 💳 Sistema de Suscripciones - Guía de Implementación

## 📋 Resumen

Se ha implementado un sistema completo de suscripciones con 4 planes y integración con PayPal para procesar pagos.

## 🎯 Planes Disponibles

| Plan | Precio Mensual | Precio Anual | Clientes | Préstamos | Características Principales |
|------|----------------|--------------|----------|-----------|----------------------------|
| **Gratuito** | $0 | $0 | 5 | 5 | Básico para probar |
| **Profesional** | $19 | $190 | 50 | 50 | Export PDF, sin marca de agua |
| **Business** | $49 | $490 | 200 | 200 | Multi-usuario, recordatorios |
| **Enterprise** | $179 | $1,790 | ∞ | ∞ | Ilimitado + marca blanca |

## 🚀 Pasos de Instalación

### 1. Ejecutar Migraciones de Base de Datos

Ejecuta el archivo SQL en tu base de datos Supabase:

```bash
# En Supabase Dashboard:
# SQL Editor > New Query > Pegar contenido de:
supabase/schema-subscriptions.sql
```

Este script crea:
- ✅ Tabla `planes` con los 4 planes predefinidos
- ✅ Campos adicionales en `profiles` para suscripciones
- ✅ Tabla `pagos_suscripcion` para historial
- ✅ Funciones SQL para verificar límites
- ✅ Políticas RLS (Row Level Security)

### 2. Configurar PayPal

#### A. Crear Cuenta de PayPal Developer
1. Ve a [PayPal Developer](https://developer.paypal.com/)
2. Inicia sesión con tu cuenta de PayPal
3. Ve a "Dashboard" > "My Apps & Credentials"

#### B. Crear App en Sandbox (Pruebas)
1. En la sección "Sandbox", haz clic en "Create App"
2. Nombre: "Gestor de Créditos - Sandbox"
3. Copia el **Client ID**

#### C. Configurar Variables de Entorno

Crea o actualiza tu archivo `.env.local`:

```env
# Supabase (ya lo tienes)
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key

# PayPal - SANDBOX (para pruebas)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_paypal_client_id_sandbox

# PayPal - PRODUCTION (cuando estés listo para producción)
# NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_paypal_client_id_production
```

### 3. Instalar Dependencias (Ya hecho)

Las dependencias ya están instaladas:
- ✅ `@paypal/react-paypal-js`
- ✅ `class-variance-authority`

### 4. Probar el Sistema

#### A. En Modo Sandbox (Pruebas)

1. **Registra un usuario** en tu aplicación
2. Automáticamente se asigna el **Plan Gratuito**
3. Ve a **"Planes"** en el menú lateral
4. Intenta crear más de 5 clientes → Verás el diálogo de límite alcanzado
5. Haz clic en "Ver Planes" y selecciona un plan de pago
6. Usa las **credenciales de prueba de PayPal**:

```
CUENTA DE PRUEBA (Sandbox):
Email: sb-buyer@personal.example.com
Password: (disponible en PayPal Developer)
```

7. Completa el pago
8. El sistema actualizará tu plan automáticamente

#### B. Credenciales de Prueba PayPal

Para obtener credenciales de prueba:
1. En PayPal Developer Dashboard
2. Ve a "Sandbox" > "Accounts"
3. Crea una cuenta de tipo "Personal" (comprador)
4. Anota email y contraseña

## 📱 Funcionalidades Implementadas

### ✅ Control de Límites
- Verifica límites antes de crear clientes/préstamos
- Muestra diálogo elegante cuando se alcanza el límite
- Actualiza contadores en tiempo real

### ✅ Página de Planes
- `/dashboard/subscription`
- Muestra todos los planes disponibles
- Toggle mensual/anual con descuento
- Resumen de uso actual
- Recomendación del plan más popular

### ✅ Checkout con PayPal
- `/dashboard/subscription/checkout`
- Integración completa con PayPal SDK
- Proceso de pago seguro
- Actualización automática del plan

### ✅ Historial de Pagos
- Se registra cada pago en `pagos_suscripcion`
- Incluye método de pago, monto, y fecha
- Puedes ver el historial en base de datos

## 🔒 Seguridad

- ✅ Row Level Security (RLS) activado
- ✅ Verificaciones del lado del servidor
- ✅ Validaciones de límites en base de datos
- ✅ Pago seguro con PayPal (SSL)

## 🌍 Pasar a Producción

### 1. Crear App de Producción en PayPal

1. En PayPal Developer Dashboard
2. Ve a "Live" (no Sandbox)
3. Crea una nueva app
4. Verifica tu cuenta de negocio
5. Copia el **Client ID de producción**

### 2. Actualizar Variables de Entorno

```env
# Cambiar a production
NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_client_id_de_produccion
```

### 3. Configurar Webhooks (Opcional pero Recomendado)

Para recibir notificaciones de PayPal:

1. En tu app de PayPal, ve a "Webhooks"
2. Agrega URL: `https://tudominio.com/api/webhooks/paypal`
3. Selecciona eventos:
   - `PAYMENT.SALE.COMPLETED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`

## 📊 Monitoreo

### Ver Estadísticas de Suscripciones

```sql
-- Total de usuarios por plan
SELECT p.nombre, COUNT(*) as usuarios
FROM profiles pr
JOIN planes p ON pr.plan_id = p.id
GROUP BY p.nombre
ORDER BY usuarios DESC;

-- Ingresos mensuales
SELECT 
  DATE_TRUNC('month', fecha_pago) as mes,
  SUM(monto) as ingresos_totales
FROM pagos_suscripcion
WHERE estado = 'completado'
GROUP BY mes
ORDER BY mes DESC;
```

## 🎨 Personalización

### Cambiar Precios

Edita en Supabase:
```sql
UPDATE planes 
SET precio_mensual = 25, precio_anual = 250
WHERE slug = 'pro';
```

### Cambiar Límites

```sql
UPDATE planes 
SET limite_clientes = 100, limite_prestamos = 100
WHERE slug = 'pro';
```

### Agregar/Modificar Características

```sql
UPDATE planes 
SET caracteristicas = jsonb_set(
  caracteristicas, 
  '{nueva_caracteristica}', 
  'true'
)
WHERE slug = 'pro';
```

## 🐛 Solución de Problemas

### "PayPal button not loading"
- Verifica que `NEXT_PUBLIC_PAYPAL_CLIENT_ID` esté configurado
- Revisa la consola del navegador para errores
- Asegúrate de tener conexión a internet

### "Límites no se actualizan"
- Revisa que las funciones SQL estén creadas
- Verifica los permisos RLS en Supabase
- Limpia caché del navegador

### "Plan no cambia después del pago"
- Verifica que la función `upgradePlan` se ejecute
- Revisa logs en la consola del navegador
- Confirma que el pago se completó en PayPal Dashboard

## 📞 Soporte

Para dudas sobre:
- **PayPal**: [PayPal Developer Support](https://developer.paypal.com/support/)
- **Supabase**: [Supabase Docs](https://supabase.com/docs)

## 🚀 Próximos Pasos Sugeridos

1. **Implementar webhooks** para sincronización automática
2. **Agregar Mercado Pago** como alternativa de pago
3. **Sistema de cupones** para descuentos
4. **Programa de referidos** con recompensas
5. **Notificaciones por email** antes de vencimiento
6. **Dashboard de admin** para gestionar suscripciones

## ✨ Mejoras Futuras

- [ ] Auto-renovación de suscripciones
- [ ] Facturación automática
- [ ] Sistema de créditos para planes
- [ ] Prueba gratuita de 14 días
- [ ] Descuentos por volumen
- [ ] API pública para integraciones

---

¿Necesitas ayuda? Revisa la documentación o contacta al equipo de desarrollo.

