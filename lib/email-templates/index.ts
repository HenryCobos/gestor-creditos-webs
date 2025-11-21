// Email Templates para Drip Campaign de 7 días

interface EmailTemplate {
  subject: string
  html: string
}

export function getEmailTemplate(day: number, userName: string, dashboardUrl: string): EmailTemplate | null {
  const templates: Record<number, EmailTemplate> = {
    1: {
      subject: '🎯 Tu primer cliente perfecto - 2 minutos',
      html: getDayOneEmail(userName, dashboardUrl)
    },
    2: {
      subject: '⚠️ Por qué el 80% de los prestamistas pierden dinero',
      html: getDayTwoEmail(userName, dashboardUrl)
    },
    3: {
      subject: '💰 El número que debes revisar cada mañana (10 segundos)',
      html: getDayThreeEmail(userName, dashboardUrl)
    },
    4: {
      subject: '🧠 El truco mental que hace que te paguen más rápido',
      html: getDayFourEmail(userName, dashboardUrl)
    },
    5: {
      subject: '📊 Cómo hacer que tus clientes confíen más en ti',
      html: getDayFiveEmail(userName, dashboardUrl)
    },
    6: {
      subject: '⏰ Cómo gestionar 100 clientes en 15 minutos al día',
      html: getDaySixEmail(userName, dashboardUrl)
    },
    7: {
      subject: '🎁 Tu regalo de graduación + última oportunidad',
      html: getDaySevenEmail(userName, dashboardUrl)
    }
  }

  return templates[day] || null
}

function getDayOneEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tu Primer Cliente Perfecto</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎯 Tu Primer Cliente Perfecto</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hola <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">¡Bienvenido al Gestor de Créditos! 🎉</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hoy quiero ayudarte a dar el primer paso: <strong>registrar tu primer cliente</strong>.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}/clientes" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">✨ Registrar Mi Primer Cliente</a>
              </div>

              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0;">✅ 3 PASOS SIMPLES:</p>
                <p style="margin: 5px 0;">1. Dashboard → Clientes → Nuevo Cliente</p>
                <p style="margin: 5px 0;">2. Completa: Nombre, Teléfono, Email</p>
                <p style="margin: 5px 0;">3. ¡Listo! Ya puedes crear préstamos</p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Nos vemos mañana 😊</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Henry - Gestor de Créditos</p>
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

function getDayTwoEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td style="background: #ef4444; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ El Error que Todos Cometen</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hola <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Espero que ya hayas registrado tu primer cliente 🎉</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hoy quiero hablarte del <strong>ERROR #1</strong> que cometen el 80% de los prestamistas:</p>
              
              <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <p style="font-weight: bold; margin: 0 0 10px 0; color: #991b1b;">❌ NO LLEVAR CONTROL DE PAGOS ATRASADOS</p>
                <p style="margin: 5px 0; color: #7f1d1d;">• Pérdidas de dinero</p>
                <p style="margin: 5px 0; color: #7f1d1d;">• Clientes que "olvidan" pagar</p>
                <p style="margin: 5px 0; color: #7f1d1d;">• Estrés innecesario</p>
              </div>

              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <p style="font-weight: bold; margin: 0 0 10px 0; color: #065f46;">✅ LA SOLUCIÓN:</p>
                <p style="margin: 5px 0; color: #064e3b;">Con Gestor de Créditos puedes ver de un vistazo quién debe y recibir alertas automáticas.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}/prestamos" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">🎯 Crear Mi Primer Préstamo</a>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Mañana te enseñaré el truco para nunca olvidar un cobro 😉</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Henry - Gestor de Créditos</p>
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

function getDayThreeEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">💰 El Dashboard Secreto</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hola <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Los prestamistas exitosos revisan <strong>UNA MÉTRICA</strong> cada mañana:</p>
              
              <div style="background: #dbeafe; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="font-size: 28px; font-weight: bold; margin: 0; color: #1e40af;">"CUÁNTO DEBEN HOY"</p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Tu dashboard te muestra:</p>
              <ul style="color: #374151;">
                <li>Total por cobrar HOY</li>
                <li>Quién debe (con nombres)</li>
                <li>Tu proyección del mes</li>
              </ul>

              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0;">💡 TIP PRO:</p>
                <p style="margin: 0;">Los usuarios del Plan Pro reciben un reporte en WhatsApp cada mañana con esta información.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">📊 Ver Mi Dashboard</a>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Mañana: "Cómo cobrar sin ser insistente" 😊</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Henry - Gestor de Créditos</p>
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

function getDayFourEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🧠 La Psicología del Cobro</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hola <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">¿Te ha pasado que un cliente "olvida" pagarte? 😅</p>
              
              <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <p style="font-size: 20px; font-weight: bold; margin: 0 0 10px 0; color: #5b21b6;">🧠 "LAS PERSONAS PAGAN LO QUE RECUERDAN"</p>
                <p style="margin: 0; color: #6b21a8;">El 70% de los pagos atrasados son por "olvido"</p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;"><strong>EL SISTEMA PERFECTO:</strong></p>
              <ul style="color: #374151;">
                <li>Recordatorio 2 días antes del vencimiento</li>
                <li>Recordatorio el día del vencimiento</li>
                <li>Seguimiento 1 día después</li>
              </ul>

              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0;">💬 PLANTILLA QUE FUNCIONA:</p>
                <p style="margin: 0; font-style: italic;">"Hola [Cliente], te recuerdo que tu cuota de $XXX vence el [Fecha]. ¿Todo bien para el pago? 😊"</p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;"><strong>🎯 CÓMO LO HACEMOS FÁCIL:</strong></p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Plan Gratuito: Copias y pegas el mensaje<br>Plan Pro: El sistema envía automáticamente 🤖</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}/planes" style="display: inline-block; background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">📊 Ver Planes</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Henry - Gestor de Créditos</p>
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

function getDayFiveEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📊 El Reporte Mágico</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hola <strong>${userName}</strong>,</p>
              <p style="font-size: 18px; font-weight: bold; line-height: 1.6; color: #374151;">Un cliente feliz = Un cliente que paga a tiempo + Recomienda a otros</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">El secreto está en la <strong>TRANSPARENCIA</strong>.</p>
              
              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0;">🎯 EL REPORTE QUE CAMBIA TODO:</p>
                <p style="margin: 0;">Cada vez que un cliente paga, envíale comprobante profesional + estado de cuenta actualizado</p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;"><strong>💡 POR QUÉ FUNCIONA:</strong></p>
              <ul style="color: #374151;">
                <li>El cliente ve su progreso</li>
                <li>Genera confianza</li>
                <li>Reduce reclamos</li>
                <li>Te hace ver profesional</li>
              </ul>

              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0;">⭐ HISTORIA REAL:</p>
                <p style="margin: 0;">Luis pasó de 3 reclamos al mes a 0 solo por enviar comprobantes automáticos.</p>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Plan Pro/Premium: Click en "Enviar Comprobante" y listo! Se envía automático 🚀</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #ec4899; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Ir al Dashboard</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Henry - Gestor de Créditos</p>
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

function getDaySixEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏰ De Caos a Control</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hola <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Déjame adivinar... cuando empezaste tenías 5 clientes (fácil). Luego 10, luego 20... y ahora, ¿cuántos tienes?</p>
              
              <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0; color: #991b1b;">🤯 EL PROBLEMA DEL CRECIMIENTO:</p>
                <p style="margin: 0; color: #7f1d1d;">Más clientes = Más tiempo en cobrar, más Excel, más estrés</p>
              </div>

              <p style="font-size: 18px; font-weight: bold; line-height: 1.6; color: #374151;">LA SOLUCIÓN no es trabajar más horas.<br>Es trabajar MÁS INTELIGENTE.</p>
              
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0;">⏱️ RUTINA DE 15 MINUTOS:</p>
                <p style="margin: 5px 0;">5 min: Revisar dashboard (quién debe hoy)</p>
                <p style="margin: 5px 0;">5 min: Enviar recordatorios (automático en Pro)</p>
                <p style="margin: 5px 0;">5 min: Registrar pagos recibidos</p>
              </div>

              <div style="background: #dcfce7; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #10b981;">
                <p style="font-size: 20px; font-weight: bold; margin: 0 0 10px 0; color: #065f46;">💡 CALCULADORA:</p>
                <p style="margin: 0; color: #064e3b;">Si cobras $100 por préstamo y tienes 50 clientes = $5,000/mes</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #047857;">Plan Pro cuesta $19/mes. Tu retorno: 263x 🚀</p>
              </div>

              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f59e0b;">
                <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 18px;">🎁 BONUS ESPECIAL (Solo hoy):</p>
                <p style="margin: 5px 0;">✅ 1 mes extra gratis</p>
                <p style="margin: 5px 0;">✅ Onboarding personalizado (30 min)</p>
                <p style="margin: 5px 0;">✅ Plantillas de mensajes profesionales</p>
                <p style="margin: 15px 0 5px 0; font-weight: bold;">Código: CONTROL7</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}/planes" style="display: inline-block; background: #f59e0b; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">⚡ Actualizar a Pro</a>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Mañana: Último email con sorpresa final 🎁</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Henry - Gestor de Créditos</p>
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

function getDaySevenEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎁 Tu Graduación + Última Oportunidad</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hola <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Han pasado 7 días desde que te registraste 🎉</p>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0; color: #065f46;">Mira todo lo que aprendiste:</p>
                <p style="margin: 5px 0; color: #047857;">✅ Día 1: Registraste tu primer cliente</p>
                <p style="margin: 5px 0; color: #047857;">✅ Día 2: Entendiste el error costoso</p>
                <p style="margin: 5px 0; color: #047857;">✅ Día 3: Descubriste tu dashboard</p>
                <p style="margin: 5px 0; color: #047857;">✅ Día 4: Aprendiste psicología del cobro</p>
                <p style="margin: 5px 0; color: #047857;">✅ Día 5: Viste el poder de los comprobantes</p>
                <p style="margin: 5px 0; color: #047857;">✅ Día 6: Calculaste tu retorno</p>
              </div>

              <p style="font-size: 18px; font-weight: bold; line-height: 1.6; color: #374151; text-align: center;">Ahora la pregunta es... ¿QUÉ SIGUE?</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td width="48%" style="vertical-align: top;">
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; height: 100%;">
                      <p style="font-weight: bold; margin: 0 0 10px 0;">CAMINO A: Seguir como estás</p>
                      <p style="margin: 5px 0; font-size: 14px;">• Plan Gratuito (5 clientes)</p>
                      <p style="margin: 5px 0; font-size: 14px;">• Gestión manual</p>
                      <p style="margin: 5px 0; font-size: 14px;">• Sin automatizaciones</p>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align: top;">
                    <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border: 2px solid #3b82f6; height: 100%;">
                      <p style="font-weight: bold; margin: 0 0 10px 0; color: #1e40af;">CAMINO B: Acelerar tu negocio</p>
                      <p style="margin: 5px 0; font-size: 14px; color: #1e3a8a;">• Plan Pro o Premium</p>
                      <p style="margin: 5px 0; font-size: 14px; color: #1e3a8a;">• Recordatorios automáticos</p>
                      <p style="margin: 5px 0; font-size: 14px; color: #1e3a8a;">• Más clientes sin más trabajo</p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 16px; line-height: 1.6; color: #374151; text-align: center;"><strong>No hay opción mala.</strong> Solo tú sabes dónde estás.</p>

              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 3px solid #f59e0b;">
                <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 18px; text-align: center;">⏰ ÚLTIMA OPORTUNIDAD:</p>
                <p style="margin: 0; text-align: center;">El código <strong>CONTROL7</strong> expira esta noche</p>
                <p style="margin: 10px 0; text-align: center; font-size: 14px;">✅ 1 mes gratis + Sesión personalizada</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}/planes" style="display: inline-block; background: #6366f1; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; margin-bottom: 10px;">🚀 Actualizar Ahora</a>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Esto es el final de la serie de 7 días, pero no de nuestra relación 😊</p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-top: 30px;">🙏 <strong>GRACIAS</strong> por tomarte el tiempo de leer estos emails. Significa mucho para mí.</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: bold;">Henry - Fundador</p>
              <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Gestor de Créditos</p>
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

