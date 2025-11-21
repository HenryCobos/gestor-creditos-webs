import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getEmailTemplate } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY!)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    // Verificar cron secret para seguridad
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    for (const campaign of campaigns || []) {
      try {
        // Calcular días desde el registro
        const daysSinceRegistration = Math.floor(
          (now.getTime() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Determinar qué email enviar
        let dayToSend: number | null = null

        if (daysSinceRegistration === 1 && !campaign.day_1_sent_at) {
          dayToSend = 1
        } else if (daysSinceRegistration === 2 && !campaign.day_2_sent_at) {
          dayToSend = 2
        } else if (daysSinceRegistration === 3 && !campaign.day_3_sent_at) {
          dayToSend = 3
        } else if (daysSinceRegistration === 4 && !campaign.day_4_sent_at) {
          dayToSend = 4
        } else if (daysSinceRegistration === 5 && !campaign.day_5_sent_at) {
          dayToSend = 5
        } else if (daysSinceRegistration === 6 && !campaign.day_6_sent_at) {
          dayToSend = 6
        } else if (daysSinceRegistration === 7 && !campaign.day_7_sent_at) {
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
            const { data: emailData, error: emailError } = await resend.emails.send({
              from: 'Henry <noreply@gestorcreditos.com>', // Cambiar por tu dominio
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

    return NextResponse.json({
      success: true,
      summary: {
        total_campaigns: campaigns?.length || 0,
        emails_sent: emailsSent.length,
        errors: errors.length
      },
      emails_sent: emailsSent,
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

