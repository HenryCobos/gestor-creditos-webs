export const HOTMART_CONFIG = {
  // URLs base de tus productos en Hotmart
  LINKS: {
    // IMPORTANTE: Las claves deben coincidir exactamente con los "slugs" de tu base de datos
    pro: {
      monthly: 'https://pay.hotmart.com/C103126853X?off=ik0qihyk',
      yearly: 'https://pay.hotmart.com/C103126853X?off=r73t9021',
    },
    business: {
      monthly: 'https://pay.hotmart.com/C103126853X?off=fsdgw81e',
      yearly: 'https://pay.hotmart.com/C103126853X?off=4x3wc2e7',
    },
    enterprise: {
      monthly: 'https://pay.hotmart.com/C103126853X?off=axldy5u9',
      yearly: 'https://pay.hotmart.com/C103126853X?off=lkmzhadk',
    },
  },
  /**
   * Ofertas de trial 7 días en Hotmart (códigos `off=` distintos).
   * Cuando los configures en Hotmart, reemplaza null por la URL completa.
   * Si es null, se usa LINKS estándar (mismo checkout, trial lo gestiona Hotmart).
   */
  TRIAL_LINKS: {
    pro: {
      yearly: null as string | null,
    },
    business: {
      monthly: null as string | null,
      yearly: null as string | null,
    },
    enterprise: {
      monthly: null as string | null,
      yearly: null as string | null,
    },
  },
}

export type HotmartCheckoutOptions = {
  /** Si true y existe TRIAL_LINKS para ese plan, usa la oferta de trial */
  useTrial?: boolean
}

/**
 * Genera la URL de checkout de Hotmart con los parámetros de rastreo necesarios.
 * 
 * @param planSlug - El slug del plan (pro, business, enterprise)
 * @param period - El periodo (monthly, yearly)
 * @param userEmail - El email del usuario (para pre-llenar el campo)
 * @param userId - El ID del usuario (para rastrear quién compró)
 */
export function getHotmartCheckoutUrl(
  planSlug: string,
  period: 'monthly' | 'yearly',
  userEmail: string,
  userId: string,
  options?: HotmartCheckoutOptions
): string | null {
  const rawSlug = planSlug.toLowerCase()
  const normalizedSlug = (
    rawSlug === 'professional' ? 'pro' : rawSlug
  ) as keyof typeof HOTMART_CONFIG.LINKS
  const useTrial = options?.useTrial ?? false

  let baseUrl: string | null | undefined

  if (useTrial) {
    const trialLinks = HOTMART_CONFIG.TRIAL_LINKS[normalizedSlug as keyof typeof HOTMART_CONFIG.TRIAL_LINKS]
    if (trialLinks) {
      baseUrl = trialLinks[period as keyof typeof trialLinks] ?? undefined
    }
  }

  if (!baseUrl) {
    baseUrl = HOTMART_CONFIG.LINKS[normalizedSlug]?.[period]
  }

  if (!baseUrl) {
    console.error(`No se encontró link de Hotmart para: ${normalizedSlug} - ${period}`)
    return null
  }

  return `${baseUrl}&email=${encodeURIComponent(userEmail)}&sck=${userId}&checkoutMode=10`
}
