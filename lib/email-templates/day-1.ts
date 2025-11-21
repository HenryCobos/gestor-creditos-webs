export function getDayOneEmail(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Primer Cliente Perfecto</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                🎯 Tu Primer Cliente Perfecto
              </h1>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hola <strong>${userName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ¡Bienvenido al Gestor de Créditos! 🎉
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Ayer te registraste y hoy quiero ayudarte a dar el primer paso más importante: <strong>registrar tu primer cliente</strong>.
              </p>

              <!-- Botón CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}/clientes" 
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.4);">
                      ✨ Registrar Mi Primer Cliente
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Pasos -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; font-weight: bold;">
                  ✅ 3 PASOS SIMPLES:
                </p>
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 15px;">
                  1. Dashboard → Clientes → Nuevo Cliente
                </p>
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 15px;">
                  2. Completa: Nombre, Teléfono, Email (opcional)
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 15px;">
                  3. ¡Listo! Ya puedes crear préstamos para este cliente
                </p>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>💡 TIP PRO:</strong> ¿Tienes clientes en Excel? Próximamente podrás importarlos todos de una vez (disponible en Plan Pro).
                </p>
              </div>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Nos vemos mañana con más tips 😊
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                Henry<br>
                Gestor de Créditos
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                ¿Necesitas ayuda? Solo responde este email.
              </p>
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

