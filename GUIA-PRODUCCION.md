# 🚀 Guía Completa para Lanzar a Producción

## 📋 Estado Actual

✅ Sistema funcionando en desarrollo
✅ Sistema de suscripciones probado con PayPal Sandbox
✅ Restricciones de planes funcionando correctamente

## 🎯 Objetivo

Llevar tu aplicación a producción para que usuarios reales puedan registrarse y usar el sistema.

---

## PASO 1: Configurar PayPal en Modo Producción

### 1.1 Obtener Credenciales de Producción

1. **Inicia sesión en PayPal Developer**
   - Ve a: https://developer.paypal.com
   - Usa tu cuenta de PayPal real (no sandbox)

2. **Crea una App de Producción**
   - Ve a "My Apps & Credentials"
   - Cambia a la pestaña **"Live"** (arriba)
   - Haz clic en "Create App"
   - Nombre: "Gestor Creditos Production"
   - Haz clic en "Create App"

3. **Copia el Client ID de Producción**
   - Verás tu **Client ID** (empieza con algo como `AW...`)
   - **CÓPIALO** - lo necesitarás en el siguiente paso

4. **Activar Suscripciones**
   - En la misma página, busca "Features"
   - Asegúrate de que **"Subscriptions"** esté habilitado
   - Si no lo está, actívalo

### 1.2 Configurar Variables de Entorno

Actualiza tu archivo `.env.local`:

```env
# Supabase (mantener igual)
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# PayPal - REEMPLAZA con credenciales de PRODUCCIÓN
NEXT_PUBLIC_PAYPAL_CLIENT_ID=TU_CLIENT_ID_DE_PRODUCCION_AQUI

# URL de tu app (actualizar cuando tengas dominio)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

### 1.3 Crear Planes de Suscripción en PayPal (Producción)

Ahora necesitas crear los planes en PayPal **en modo producción**:

1. **Inicia sesión en PayPal Business**: https://www.paypal.com/businessmanage
2. Ve a: **Products & Services** → **Subscriptions**
3. Crea 3 planes siguiendo esta tabla:

#### Plan Profesional - Mensual
- **Nombre**: Plan Profesional Mensual
- **Descripción**: 50 clientes, 50 préstamos, exportación PDF
- **Precio**: $19.00 USD
- **Frecuencia**: Mensual
- **Copiar el Plan ID** (empieza con P-...)

#### Plan Profesional - Anual  
- **Nombre**: Plan Profesional Anual
- **Descripción**: 50 clientes, 50 préstamos, exportación PDF
- **Precio**: $190.00 USD
- **Frecuencia**: Anual
- **Copiar el Plan ID**

#### Plan Business - Mensual
- **Nombre**: Plan Business Mensual
- **Descripción**: 200 clientes, 200 préstamos, 3 usuarios
- **Precio**: $49.00 USD
- **Frecuencia**: Mensual
- **Copiar el Plan ID**

#### Plan Business - Anual
- **Nombre**: Plan Business Anual
- **Descripción**: 200 clientes, 200 préstamos, 3 usuarios
- **Precio**: $490.00 USD
- **Frecuencia**: Anual
- **Copiar el Plan ID**

#### Plan Enterprise - Mensual
- **Nombre**: Plan Enterprise Mensual
- **Descripción**: Todo ilimitado, marca blanca, soporte 24/7
- **Precio**: $179.00 USD
- **Frecuencia**: Mensual
- **Copiar el Plan ID**

#### Plan Enterprise - Anual
- **Nombre**: Plan Enterprise Anual
- **Descripción**: Todo ilimitado, marca blanca, soporte 24/7
- **Precio**: $1,790.00 USD
- **Frecuencia**: Anual
- **Copiar el Plan ID**

### 1.4 Actualizar Plan IDs en Supabase

Ejecuta este SQL en Supabase para actualizar los Plan IDs de PayPal:

```sql
-- Actualizar con tus Plan IDs reales de PayPal Producción

-- Plan Profesional
UPDATE planes 
SET caracteristicas = jsonb_set(
  caracteristicas, 
  '{paypal_plan_id_monthly}', 
  '"P-TU_PLAN_ID_PRO_MENSUAL"'
)
WHERE slug = 'pro';

UPDATE planes 
SET caracteristicas = jsonb_set(
  caracteristicas, 
  '{paypal_plan_id_yearly}', 
  '"P-TU_PLAN_ID_PRO_ANUAL"'
)
WHERE slug = 'pro';

-- Plan Business
UPDATE planes 
SET caracteristicas = jsonb_set(
  caracteristicas, 
  '{paypal_plan_id_monthly}', 
  '"P-TU_PLAN_ID_BUSINESS_MENSUAL"'
)
WHERE slug = 'business';

UPDATE planes 
SET caracteristicas = jsonb_set(
  caracteristicas, 
  '{paypal_plan_id_yearly}', 
  '"P-TU_PLAN_ID_BUSINESS_ANUAL"'
)
WHERE slug = 'business';

-- Plan Enterprise
UPDATE planes 
SET caracteristicas = jsonb_set(
  caracteristicas, 
  '{paypal_plan_id_monthly}', 
  '"P-TU_PLAN_ID_ENTERPRISE_MENSUAL"'
)
WHERE slug = 'enterprise';

UPDATE planes 
SET caracteristicas = jsonb_set(
  caracteristicas, 
  '{paypal_plan_id_yearly}', 
  '"P-TU_PLAN_ID_ENTERPRISE_ANUAL"'
)
WHERE slug = 'enterprise';
```

---

## PASO 2: Verificar Supabase para Producción

### 2.1 Verificar Configuración

Tu Supabase ya debería estar en producción, pero verifica:

1. **Políticas RLS (Row Level Security)**
   - Ve a Supabase → Authentication → Policies
   - Verifica que todas las tablas tengan RLS habilitado ✅

2. **Verificar Funciones SQL**
   - Ejecuta el script `supabase/verificar-estado-planes.sql`
   - Debe mostrar las 4 funciones correctamente

3. **Verificar Planes**
   ```sql
   SELECT * FROM planes ORDER BY orden;
   ```
   - Debe mostrar los 4 planes (Gratuito, Profesional, Business, Enterprise)

### 2.2 Configurar Email Templates (Opcional pero Recomendado)

1. Ve a Supabase → Authentication → Email Templates
2. Personaliza los templates:
   - **Confirm signup**: Email de confirmación de registro
   - **Reset password**: Email de recuperación de contraseña
   - **Magic link**: Para login sin contraseña (opcional)

---

## PASO 3: Deploy a Vercel (Recomendado)

### 3.1 Preparar el Repositorio

1. **Sube tu código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Preparar para producción"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/gestor-creditos.git
   git push -u origin main
   ```

2. **Asegúrate de tener `.gitignore` configurado**
   ```
   .env.local
   .env
   node_modules
   .next
   ```

### 3.2 Deploy en Vercel

1. **Ve a Vercel**: https://vercel.com
2. **Importa tu proyecto**
   - Haz clic en "New Project"
   - Selecciona tu repositorio de GitHub
   - Haz clic en "Import"

3. **Configura las Variables de Entorno**
   - En "Environment Variables", agrega:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL = tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY = tu_anon_key
   NEXT_PUBLIC_PAYPAL_CLIENT_ID = tu_client_id_de_produccion
   NEXT_PUBLIC_APP_URL = https://tu-app.vercel.app
   ```

4. **Deploy**
   - Haz clic en "Deploy"
   - Espera 2-3 minutos
   - ¡Tu app estará en línea! 🎉

### 3.3 Obtener tu URL de Vercel

Vercel te dará una URL como: `https://gestor-creditos-webs.vercel.app`

---

## PASO 4: Configurar Dominio Personalizado (Opcional)

### 4.1 Comprar un Dominio

Opciones recomendadas:
- **Namecheap**: https://www.namecheap.com
- **GoDaddy**: https://www.godaddy.com
- **Google Domains**: https://domains.google

Sugerencias de nombres:
- `gestorcreditos.com`
- `micreditapp.com`
- `prestamanager.com`
- `creditosimple.com`

### 4.2 Configurar el Dominio en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a "Settings" → "Domains"
3. Agrega tu dominio personalizado
4. Sigue las instrucciones para configurar los DNS

### 4.3 Actualizar URLs

Una vez que tengas el dominio:

1. **Actualizar en Vercel**:
   - Ve a Settings → Environment Variables
   - Actualiza `NEXT_PUBLIC_APP_URL` a tu dominio

2. **Actualizar en Supabase**:
   - Ve a Authentication → URL Configuration
   - Agrega tu dominio a "Site URL"
   - Agrega `https://tu-dominio.com/**` a "Redirect URLs"

3. **Actualizar en PayPal**:
   - Ve a tu App en PayPal Developer
   - Actualiza las URLs de retorno si es necesario

---

## PASO 5: Configurar Webhooks de PayPal (Opcional pero Recomendado)

Los webhooks te notifican cuando hay cambios en las suscripciones.

### 5.1 Crear Endpoint de Webhook

1. Ve a PayPal Developer → My Apps & Credentials → [Tu App]
2. Scroll hasta "Webhooks"
3. Haz clic en "Add Webhook"
4. URL del webhook: `https://tu-dominio.com/api/webhooks/paypal`
5. Selecciona estos eventos:
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `PAYMENT.SALE.COMPLETED`

### 5.2 Crear el Endpoint en tu App

Crea el archivo `app/api/webhooks/paypal/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const eventType = body.event_type
    
    const supabase = await createClient()
    
    // Manejar eventos de PayPal
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // Activar suscripción del usuario
        break
        
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        // Cancelar suscripción del usuario
        break
        
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        // Marcar suscripción como expirada
        break
        
      case 'PAYMENT.SALE.COMPLETED':
        // Registrar pago completado
        break
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
```

---

## PASO 6: Verificaciones Pre-Lanzamiento

### ✅ Checklist de Producción

Antes de lanzar, verifica:

- [ ] PayPal configurado en modo producción
- [ ] Variables de entorno actualizadas en Vercel
- [ ] Plan IDs de PayPal actualizados en Supabase
- [ ] App deployada en Vercel
- [ ] Dominio personalizado configurado (opcional)
- [ ] Email templates personalizados en Supabase
- [ ] RLS habilitado en todas las tablas
- [ ] Funciones SQL creadas correctamente
- [ ] Los 4 planes visibles en `/dashboard/subscription`

### 🧪 Pruebas en Producción

1. **Registro de Usuario**
   - [ ] Registra un nuevo usuario
   - [ ] Verifica que reciba email de confirmación
   - [ ] Verifica que tenga plan gratuito asignado

2. **Funcionalidad Básica**
   - [ ] Crear un cliente
   - [ ] Crear un préstamo
   - [ ] Registrar un pago
   - [ ] Generar un reporte PDF

3. **Sistema de Suscripciones**
   - [ ] Ver planes en `/dashboard/subscription`
   - [ ] Intentar crear más de 5 clientes (debe bloquearse)
   - [ ] Proceso de pago con PayPal funciona
   - [ ] Después del pago, el plan se actualiza

4. **Responsividad**
   - [ ] Prueba en móvil
   - [ ] Prueba en tablet
   - [ ] Prueba en desktop

---

## PASO 7: Marketing y Publicidad

### 7.1 Preparar Materiales de Marketing

1. **Página de Aterrizaje (Landing Page)**
   - Crear una página principal atractiva
   - Explicar los beneficios del sistema
   - Mostrar screenshots
   - Incluir testimonios (cuando los tengas)
   - Call-to-action claro: "Prueba Gratis"

2. **Video Demo**
   - Graba un video corto (1-2 minutos) mostrando el sistema
   - Sube a YouTube
   - Comparte en redes sociales

3. **Capturas de Pantalla**
   - Dashboard
   - Gestión de clientes
   - Gestión de préstamos
   - Reportes

### 7.2 Estrategias de Marketing

#### Marketing Gratuito

1. **Redes Sociales**
   - Facebook: Únete a grupos de negocios, emprendedores
   - Instagram: Comparte tips sobre gestión de créditos
   - LinkedIn: Conecta con empresarios
   - TikTok: Videos cortos educativos

2. **SEO (Posicionamiento en Google)**
   - Crea un blog con artículos útiles:
     - "Cómo gestionar préstamos personales"
     - "Mejores prácticas para cobro de créditos"
     - "Cómo calcular intereses de préstamos"
   - Usa palabras clave relevantes

3. **WhatsApp Business**
   - Crea mensajes automáticos
   - Ofrece demos gratuitas
   - Comparte en grupos relevantes

4. **Referidos**
   - Implementa programa de referidos
   - Ofrece mes gratis por cada referido
   - Código de descuento para compartir

#### Marketing de Pago (Cuando tengas presupuesto)

1. **Facebook Ads**
   - Público objetivo: emprendedores, pequeños negocios
   - Presupuesto inicial: $5-10/día
   - Anuncio: "Gestiona tus préstamos fácilmente"

2. **Google Ads**
   - Palabras clave: "software gestión préstamos", "app créditos"
   - Presupuesto: $10-20/día

3. **Instagram Ads**
   - Historias patrocinadas
   - Carrusel con beneficios

### 7.3 Métricas a Seguir

Usa Google Analytics para monitorear:
- Visitas al sitio
- Registros de usuarios
- Conversión a planes de pago
- Retención de usuarios

---

## PASO 8: Soporte al Cliente

### 8.1 Canales de Soporte

1. **Email de Soporte**
   - Crea: soporte@tu-dominio.com
   - Responde en menos de 24 horas

2. **WhatsApp Business**
   - Configura respuestas automáticas
   - Horario de atención

3. **Base de Conocimiento**
   - Crea sección de preguntas frecuentes
   - Videos tutoriales
   - Guías paso a paso

### 8.2 Documentación para Usuarios

Crea guías de usuario:
- Cómo registrarse
- Cómo crear un cliente
- Cómo crear un préstamo
- Cómo registrar pagos
- Cómo generar reportes
- Cómo cambiar de plan

---

## 📊 Precios Sugeridos (Ya configurados)

| Plan | Precio Mensual | Precio Anual | Ahorro Anual |
|------|----------------|--------------|--------------|
| Gratuito | $0 | $0 | - |
| Profesional | $19 | $190 | $38 (2 meses gratis) |
| Business | $49 | $490 | $98 (2 meses gratis) |
| Enterprise | $179 | $1,790 | $358 (2 meses gratis) |

---

## 🎯 Primeros Pasos Después del Lanzamiento

### Semana 1
- [ ] Monitorear registro de usuarios
- [ ] Responder a consultas rápidamente
- [ ] Publicar en redes sociales diariamente
- [ ] Pedir feedback a los primeros usuarios

### Semana 2-4
- [ ] Implementar feedback de usuarios
- [ ] Crear contenido educativo
- [ ] Empezar campaña de marketing
- [ ] Ofrecer promoción de lanzamiento

### Mes 2-3
- [ ] Analizar métricas
- [ ] Ajustar precios si es necesario
- [ ] Agregar nuevas funcionalidades
- [ ] Expandir marketing

---

## 🆘 Problemas Comunes y Soluciones

### PayPal no procesa pagos
- Verifica que estés usando credenciales de producción
- Verifica que los Plan IDs sean correctos
- Revisa los logs de PayPal

### Emails no llegan
- Verifica spam
- Configura SPF y DKIM en tu dominio
- Usa servicio de email dedicado (SendGrid, AWS SES)

### App lenta
- Optimiza imágenes
- Implementa caching
- Usa CDN (Vercel ya lo tiene)

---

## 📞 Siguiente Nivel

Una vez que tengas usuarios activos:
- Implementar webhooks de PayPal
- Agregar notificaciones por email
- Implementar recordatorios automáticos
- Agregar reportes avanzados
- App móvil (React Native)

---

✨ **¡Todo listo para lanzar!**

¿Necesitas ayuda con algún paso específico?

