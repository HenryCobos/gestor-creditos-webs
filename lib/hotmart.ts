export const HOTMART_CONFIG = {
  // URLs base de tus productos en Hotmart
  LINKS: {
    professional: {
      monthly: 'https://pay.hotmart.com/C103126853X?off=ik0qihyk',
      yearly: 'https://pay.hotmart.com/C103126853X?off=r73t9021',
    },
    business: {
      monthly: 'https://pay.hotmart.com/C103126853X?off=fsdgw81e',
      yearly: 'https://pay.hotmart.com/C103126853X?off=4x3wc2e7',
    },
    enterprise: {
      monthly: 'https://pay.hotmart.com/C103126853X?off=axldy5u9',
      yearly: 'https://pay.hotmart.com/C103126853X?off=1kmzhadk',
    },
  },
}

/**
 * Genera la URL de checkout de Hotmart con los parámetros de rastreo necesarios.
 * 
 * @param planSlug - El slug del plan (professional, business, enterprise)
 * @param period - El periodo (monthly, yearly)
 * @param userEmail - El email del usuario (para pre-llenar el campo)
 * @param userId - El ID del usuario (para rastrear quién compró)
 */
export function getHotmartCheckoutUrl(
  planSlug: string,
  period: 'monthly' | 'yearly',
  userEmail: string,
  userId: string
): string | null {
  // Normalizar el slug si es necesario (asegurar minúsculas)
  const normalizedSlug = planSlug.toLowerCase()
  
  // Obtener la URL base según el plan y periodo
  // @ts-ignore
  const baseUrl = HOTMART_CONFIG.LINKS[normalizedSlug]?.[period]

  if (!baseUrl) {
    console.error(`No se encontró link de Hotmart para: ${normalizedSlug} - ${period}`)
    return null
  }

  // Construir URL con parámetros
  // sck (Source Key): Usamos esto para pasar el ID del usuario y recuperarlo en el webhook
  // email: Para que el usuario no tenga que escribirlo de nuevo
  // checkoutMode: 10 (apariencia limpia)
  return `${baseUrl}&email=${encodeURIComponent(userEmail)}&sck=${userId}&checkoutMode=10`
}

