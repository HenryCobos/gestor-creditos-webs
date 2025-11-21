# 🔧 Implementación Técnica - Email Drip Campaign

## 🎯 Arquitectura

```
Usuario se registra
       ↓
Supabase Auth
       ↓
Webhook/Trigger
       ↓
Crear registro en "email_campaigns"
       ↓
Cron Job (diario)
       ↓
Verificar qué emails enviar
       ↓
Resend API
       ↓
Email enviado
```

---

## 📦 Opción Recomendada: Resend

### Por qué Resend:
- ✅ **3,000 emails/mes gratis** (suficiente para empezar)
- ✅ **API super simple** (5 líneas de código)
- ✅ **React Email** integrado (diseño fácil)
- ✅ **Analytics** incluidos
- ✅ **99.9% deliverability**
- ✅ Creado por el team de Vercel

---

## 🚀 Implementación Paso a Paso

### Paso 1: Instalar Resend

```bash
npm install resend
npm install @react-email/components
```

### Paso 2: Obtener API Key

1. Ir a: https://resend.com
2. Crear cuenta (gratis)
3. Ir a: API Keys
4. Crear nueva key
5. Copiar key

### Paso 3: Agregar Variables de Entorno

```env
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

En Vercel:
```
Settings → Environment Variables → Add
Name: RESEND_API_KEY
Value: tu_key
```

### Paso 4: Crear Tabla en Supabase

```sql
-- Tabla para trackear el drip campaign
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  day_0_sent_at TIMESTAMP WITH TIME ZONE,
  day_1_sent_at TIMESTAMP WITH TIME ZONE,
  day_2_sent_at TIMESTAMP WITH TIME ZONE,
  day_3_sent_at TIMESTAMP WITH TIME ZONE,
  day_4_sent_at TIMESTAMP WITH TIME ZONE,
  day_5_sent_at TIMESTAMP WITH TIME ZONE,
  day_6_sent_at TIMESTAMP WITH TIME ZONE,
  day_7_sent_at TIMESTAMP WITH TIME ZONE,
  unsubscribed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX idx_email_campaigns_created_at ON email_campaigns(created_at);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_campaigns_updated_at 
  BEFORE UPDATE ON email_campaigns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### Paso 5: Crear Trigger para Nuevos Usuarios

```sql
-- Función que se ejecuta cuando un usuario se registra
CREATE OR REPLACE FUNCTION handle_new_user_campaign()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en email_campaigns
  INSERT INTO public.email_campaigns (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se activa en nuevo registro
CREATE TRIGGER on_auth_user_created_campaign
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_campaign();
```

### Paso 6: Crear Templates de Email

**Crear carpeta:** `emails/drip-campaign/`

**Archivo:** `emails/drip-campaign/day-1.tsx`

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface Day1EmailProps {
  userName: string;
}

export default function Day1Email({ userName }: Day1EmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu primer cliente perfecto - 2 minutos</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎯 Tu Primer Cliente Perfecto</Heading>
          
          <Text style={text}>Hola {userName},</Text>
          
          <Text style={text}>
            ¡Bienvenido al Gestor de Créditos! 🎉
          </Text>
          
          <Text style={text}>
            Ayer te registraste y hoy quiero ayudarte a dar el primer paso 
            más importante: <strong>registrar tu primer cliente</strong>.
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href="https://tu-app.vercel.app/dashboard/clientes/nuevo">
              ✨ Registrar Mi Primer Cliente
            </Button>
          </Section>
          
          <Text style={text}>
            <strong>3 PASOS SIMPLES:</strong>
          </Text>
          
          <Text style={listText}>
            1. Dashboard → Clientes → Nuevo Cliente<br />
            2. Completa: Nombre, Teléfono, Email (opcional)<br />
            3. ¡Listo! Ya puedes crear préstamos
          </Text>
          
          <Text style={text}>
            💡 <strong>TIP PRO:</strong> ¿Tienes clientes en Excel? 
            Próximamente podrás importarlos todos de una vez (disponible en Plan Pro).
          </Text>
          
          <Text style={footer}>
            Nos vemos mañana con más tips 😊<br /><br />
            Henry<br />
            Gestor de Créditos
          </Text>
          
          <Text style={unsubscribe}>
            <a href="{{unsubscribe_url}}">Cancelar suscripción</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
};

const listText = {
  ...text,
  marginLeft: '20px',
};

const buttonContainer = {
  padding: '27px 48px',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 20px',
};

const footer = {
  ...text,
  marginTop: '32px',
  color: '#8898aa',
};

const unsubscribe = {
  ...text,
  marginTop: '32px',
  fontSize: '12px',
  color: '#8898aa',
  textAlign: 'center' as const,
};
```

### Paso 7: Crear Edge Function para Enviar Emails

**Archivo:** `supabase/functions/send-drip-emails/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date()
    
    // Obtener usuarios que necesitan recibir emails
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('unsubscribed', false)
      .is('deleted_at', null)
    
    if (error) throw error
    
    const emailsSent = []
    
    for (const campaign of campaigns) {
      const daysSinceRegistration = Math.floor(
        (now.getTime() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // Día 1: 1 día después del registro
      if (daysSinceRegistration === 1 && !campaign.day_1_sent_at) {
        await sendDay1Email(campaign)
        await supabase
          .from('email_campaigns')
          .update({ day_1_sent_at: now.toISOString() })
          .eq('id', campaign.id)
        emailsSent.push({ user: campaign.email, day: 1 })
      }
      
      // Día 2
      if (daysSinceRegistration === 2 && !campaign.day_2_sent_at) {
        await sendDay2Email(campaign)
        await supabase
          .from('email_campaigns')
          .update({ day_2_sent_at: now.toISOString() })
          .eq('id', campaign.id)
        emailsSent.push({ user: campaign.email, day: 2 })
      }
      
      // ... Repetir para días 3-7
    }
    
    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function sendDay1Email(campaign: any) {
  const { data, error } = await resend.emails.send({
    from: 'Henry <noreply@tu-dominio.com>',
    to: campaign.email,
    subject: '🎯 Tu primer cliente perfecto - 2 minutos',
    html: renderDay1Email(campaign.full_name || 'ahí'),
  })
  
  if (error) {
    console.error('Error sending Day 1:', error)
    throw error
  }
  
  return data
}

function renderDay1Email(userName: string): string {
  // Aquí renderizarías tu template React Email
  // O usar HTML directo
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">🎯 Tu Primer Cliente Perfecto</h1>
      <p>Hola ${userName},</p>
      <p>¡Bienvenido al Gestor de Créditos! 🎉</p>
      <!-- Resto del contenido -->
    </div>
  `
}
```

### Paso 8: Configurar Cron Job

**En Supabase Dashboard:**

```
Functions → Create a new function → Cron Jobs
```

O en `supabase/functions/send-drip-emails/deno.json`:

```json
{
  "schedule": "0 8 * * *"
}
```

Esto ejecuta la función **todos los días a las 8:00 AM**.

---

## 🔧 Alternativa Más Simple: API Route en Next.js

Si prefieres no usar Edge Functions:

**Archivo:** `app/api/cron/send-drip-emails/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(request: Request) {
  // Verificar cron secret para seguridad
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Lógica de envío de emails aquí
  const now = new Date()
  
  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('unsubscribed', false)
  
  // ... resto del código similar a Edge Function
  
  return NextResponse.json({ success: true })
}
```

**Configurar en Vercel:**

1. Ir a: Project Settings → Cron Jobs
2. Agregar:
   ```
   Schedule: 0 8 * * *
   URL: /api/cron/send-drip-emails
   ```

---

## 📊 Dashboard para Monitorear

**Archivo:** `app/admin/email-campaigns/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmailCampaignsPage() {
  const [stats, setStats] = useState<any>(null)
  
  useEffect(() => {
    loadStats()
  }, [])
  
  async function loadStats() {
    const supabase = createClient()
    
    const { data } = await supabase
      .from('email_campaigns')
      .select('*')
    
    // Calcular estadísticas
    const totalUsers = data?.length || 0
    const day1Sent = data?.filter(c => c.day_1_sent_at).length || 0
    const day7Sent = data?.filter(c => c.day_7_sent_at).length || 0
    const unsubscribed = data?.filter(c => c.unsubscribed).length || 0
    
    setStats({
      totalUsers,
      day1Sent,
      day7Sent,
      unsubscribed,
      completionRate: ((day7Sent / totalUsers) * 100).toFixed(1)
    })
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Email Campaigns Dashboard</h1>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold">{stats?.totalUsers}</div>
          <div className="text-gray-600">Total Usuarios</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold">{stats?.day1Sent}</div>
          <div className="text-gray-600">Día 1 Enviados</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold">{stats?.completionRate}%</div>
          <div className="text-gray-600">Completion Rate</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold">{stats?.unsubscribed}</div>
          <div className="text-gray-600">Unsubscribed</div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎯 Testing

### Test local:

```typescript
// test/send-test-email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

async function testEmail() {
  const { data, error } = await resend.emails.send({
    from: 'Test <noreply@tu-dominio.com>',
    to: 'tu-email@gmail.com',
    subject: 'Test Email Day 1',
    html: '<h1>Hola desde Resend!</h1>'
  })
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Email sent:', data)
  }
}

testEmail()
```

Ejecutar:
```bash
npx tsx test/send-test-email.ts
```

---

## 📋 Checklist de Implementación

### Preparación:
- [ ] Crear cuenta en Resend
- [ ] Obtener API Key
- [ ] Agregar variables de entorno
- [ ] Escribir contenido de 7 emails

### Base de Datos:
- [ ] Crear tabla email_campaigns
- [ ] Crear trigger para nuevos usuarios
- [ ] Verificar que funciona con registro de prueba

### Código:
- [ ] Instalar dependencias (resend, react-email)
- [ ] Crear templates de emails (7)
- [ ] Crear Edge Function o API Route
- [ ] Implementar lógica de envío

### Cron Job:
- [ ] Configurar cron en Supabase o Vercel
- [ ] Testear ejecución manual
- [ ] Verificar logs

### Testing:
- [ ] Registrar usuario de prueba
- [ ] Verificar que se crea registro en email_campaigns
- [ ] Forzar cron job manualmente
- [ ] Verificar que llega email Día 1
- [ ] Esperar y verificar Día 2

### Monitoreo:
- [ ] Crear dashboard de estadísticas
- [ ] Configurar alertas si algo falla
- [ ] Revisar analytics de Resend

---

## 💰 Costos

- **Resend:** Gratis hasta 3,000 emails/mes
- **Supabase Edge Functions:** Gratis (hasta 500,000 invocaciones/mes)
- **Vercel Cron Jobs:** Gratis

**Total:** $0/mes para empezar 🎉

---

## 🚀 ¿Siguiente Paso?

Dime si quieres que implemente esto para ti y en cuánto tiempo lo necesitas:

**Opción A:** Implementación básica (3-4 días)
- Setup Resend
- Tabla en Supabase
- 7 emails en HTML simple
- Cron job básico

**Opción B:** Implementación completa (1 semana)
- Todo lo anterior +
- Templates con React Email
- Dashboard de analytics
- A/B testing setup
- Testing completo

¿Cuál prefieres? 🚀

