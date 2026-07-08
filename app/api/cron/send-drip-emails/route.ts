import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getEmailTemplate } from '@/lib/email-templates'

// Inicializar Resend de forma lazy para evitar errores durante el build
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(apiKey)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const manualKey = searchParams.get('key')

    // Verificar cron secret para seguridad (o clave manual para pruebas)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && manualKey !== 'test-drip-123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date()
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tu-app.vercel.app'

    // Obtener todas las campañas activas (no desuscritas)
    const { data: campaigns, error: fetchError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('unsubscribed', false)

    if (fetchError) {
      console.error('Error fetching campaigns:', fetchError)
      throw fetchError
    }

    const emailsSent: any[] = []
    const errors: any[] = []

    // Función de espera para evitar rate limits de Resend (max 2 req/seg en plan gratis)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    for (const campaign of campaigns || []) {
      // Esperar 1 segundo entre correos para no saturar la API
      await delay(1000)
      
      try {
        // Calcular días desde el registro
        const daysSinceRegistration = Math.floor(
          (now.getTime() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Determinar qué email enviar (Lógica Catch-up: enviar en orden si se perdió alguno)
        let dayToSend: number | null = null

        if (daysSinceRegistration >= 1 && !campaign.day_1_sent_at) {
          dayToSend = 1
        } else if (daysSinceRegistration >= 2 && !campaign.day_2_sent_at) {
          dayToSend = 2
        } else if (daysSinceRegistration >= 3 && !campaign.day_3_sent_at) {
          dayToSend = 3
        } else if (daysSinceRegistration >= 4 && !campaign.day_4_sent_at) {
          dayToSend = 4
        } else if (daysSinceRegistration >= 5 && !campaign.day_5_sent_at) {
          dayToSend = 5
        } else if (daysSinceRegistration >= 6 && !campaign.day_6_sent_at) {
          dayToSend = 6
        } else if (daysSinceRegistration >= 7 && !campaign.day_7_sent_at) {
          dayToSend = 7
        }

        // Si hay email para enviar
        if (dayToSend) {
          const template = getEmailTemplate(
            dayToSend,
            campaign.full_name || 'ahí',
            dashboardUrl
          )

          if (template) {
            // Enviar email con Resend
            const resend = getResend()
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'Henry - Gestor de Créditos <hola@ingresosonlinehoy.com>'
            const { data: emailData, error: emailError } = await resend.emails.send({
              from: fromEmail,
              to: campaign.email,
              subject: template.subject,
              html: template.html,
            })

            if (emailError) {
              console.error(`Error sending day ${dayToSend} to ${campaign.email}:`, emailError)
              errors.push({
                campaign_id: campaign.id,
                email: campaign.email,
                day: dayToSend,
                error: emailError.message
              })
              continue
            }

            // Actualizar registro en la base de datos
            const updateField = `day_${dayToSend}_sent_at`
            await supabase
              .from('email_campaigns')
              .update({ [updateField]: now.toISOString() })
              .eq('id', campaign.id)

            emailsSent.push({
              campaign_id: campaign.id,
              email: campaign.email,
              day: dayToSend,
              sent_at: now.toISOString(),
              resend_id: emailData?.id
            })

            console.log(`✅ Sent Day ${dayToSend} email to ${campaign.email}`)
          }
        }
      } catch (error: any) {
        console.error(`Error processing campaign ${campaign.id}:`, error)
        errors.push({
          campaign_id: campaign.id,
          email: campaign.email,
          error: error.message
        })
      }
    }

    // === EMAIL TRIGGER: Aviso de límite al 80% de uso ===
    const limitWarningsSent: any[] = []
    try {
      // Buscar campañas no desuscritas que no han recibido aviso de límite
      const { data: campaignsForLimit } = await supabase
        .from('email_campaigns')
        .select('id, email, full_name, limit_warning_sent_at')
        .eq('unsubscribed', false)
        .is('limit_warning_sent_at', null)

      for (const camp of campaignsForLimit || []) {
        await delay(1000)
        try {
          // Buscar el organization_id del usuario por email
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, id')
            .eq('email', camp.email)
            .maybeSingle()

          if (!profile?.organization_id) continue

          // Llamar a la función de límites
          const { data: limitesRaw } = await supabase
            .rpc('get_limites_organizacion', { p_organization_id: profile.organization_id })
            .maybeSingle()

          if (!limitesRaw) continue

          const limites = limitesRaw as {
            porcentaje_clientes: number
            porcentaje_prestamos: number
            limite_clientes: number
            clientes_usados: number
          }

          const pctClientes = limites.porcentaje_clientes ?? 0
          const pctPrestamos = limites.porcentaje_prestamos ?? 0

          if (pctClientes < 80 && pctPrestamos < 80) continue

          // Ya supera el 80% — enviar email de aviso
          const cuposRestantes = (limites.limite_clientes ?? 5) - (limites.clientes_usados ?? 0)
          const nombre = camp.full_name || 'ahí'
          const subject = `⚠️ ${nombre}, te quedan solo ${cuposRestantes} cupos — actúa ahora`
          const html = getLimitWarningEmail(nombre, cuposRestantes, dashboardUrl)

          const resend = getResend()
          const fromEmail = process.env.RESEND_FROM_EMAIL || 'Henry - Gestor de Créditos <hola@ingresosonlinehoy.com>'
          const { error: emailErr } = await resend.emails.send({
            from: fromEmail,
            to: camp.email,
            subject,
            html,
          })

          if (!emailErr) {
            await supabase
              .from('email_campaigns')
              .update({ limit_warning_sent_at: now.toISOString() })
              .eq('id', camp.id)

            limitWarningsSent.push({ email: camp.email, pct_clientes: pctClientes })
            console.log(`✅ Limit warning sent to ${camp.email} (${pctClientes}% clientes)`)
          }
        } catch (err: any) {
          console.error(`Error processing limit warning for ${camp.email}:`, err.message)
        }
      }
    } catch (err: any) {
      console.error('Error in limit warning check:', err.message)
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_campaigns: campaigns?.length || 0,
        emails_sent: emailsSent.length,
        limit_warnings_sent: limitWarningsSent.length,
        errors: errors.length
      },
      emails_sent: emailsSent,
      limit_warnings_sent: limitWarningsSent,
      errors: errors
    })

  } catch (error: any) {
    console.error('Error in cron job:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

function getLimitWarningEmail(userName: string, cuposRestantes: number, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Atención: Casi sin cupos</h1>
              <p style="color: #fecaca; margin: 8px 0 0 0; font-size: 14px;">Tu plan gratuito está casi lleno</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hola <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Te escribo porque veo que ya usaste la mayoría de tu capacidad en el Gestor de Créditos.</p>

              <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ef4444; text-align: center;">
                <p style="font-size: 28px; font-weight: bold; margin: 0; color: #991b1b;">Solo te quedan ${cuposRestantes} cupo${cuposRestantes !== 1 ? 's' : ''}</p>
                <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 14px;">Cuando llegues a 0, no podrás agregar más clientes hasta actualizar tu plan.</p>
              </div>

              <p style="font-size: 15px; line-height: 1.6; color: #374151;">Para que no pierdas ningún cliente por falta de capacidad, tienes 2 opciones:</p>

              <div style="margin: 20px 0; space-y: 12px;">
                <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #3b82f6;">
                  <p style="font-weight: bold; margin: 0 0 6px 0; color: #1e40af;">Opción 1: Trial gratuito 7 días</p>
                  <p style="margin: 0; color: #374151; font-size: 14px;">Actívalo desde tu dashboard sin tarjeta de crédito. Prueba Pro completamente gratis.</p>
                </div>
                <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="font-weight: bold; margin: 0 0 6px 0; color: #065f46;">Opción 2: Plan Pro — $19/mes</p>
                  <p style="margin: 0; color: #374151; font-size: 14px;">50 clientes, 50 préstamos, PDFs sin marca de agua. Con garantía de 7 días.</p>
                </div>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 12px;">⚡ Ir al Dashboard y Activar Trial</a>
                <br>
                <a href="${dashboardUrl}/dashboard/subscription" style="display: inline-block; background: #10b981; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Ver planes de pago</a>
              </div>

              <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 20px;">Garantía de devolución de 7 días · Sin contratos forzosos</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

