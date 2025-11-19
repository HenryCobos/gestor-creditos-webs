// Google Analytics & Ads Conversion Tracking

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void
  }
}

// Evento: Usuario completó registro (conversión primaria)
export const trackSignupConversion = (userId?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    // Google Ads Conversion
    const ADS_CONVERSION_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP
    if (ADS_CONVERSION_ID) {
      window.gtag('event', 'conversion', {
        send_to: ADS_CONVERSION_ID,
        value: 5.0, // Valor estimado de un registro
        currency: 'USD',
        user_id: userId,
      })
    }

    // Google Analytics Event
    window.gtag('event', 'sign_up', {
      method: 'email',
      user_id: userId,
    })
  }
}

// Evento: Usuario compró suscripción (conversión secundaria - MÁS VALIOSA)
export const trackSubscriptionConversion = (
  plan: string,
  value: number,
  userId?: string
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    // Google Ads Conversion
    const ADS_CONVERSION_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE
    if (ADS_CONVERSION_ID) {
      window.gtag('event', 'conversion', {
        send_to: ADS_CONVERSION_ID,
        value: value,
        currency: 'USD',
        transaction_id: `sub_${Date.now()}`,
        user_id: userId,
      })
    }

    // Google Analytics Event
    window.gtag('event', 'purchase', {
      transaction_id: `sub_${Date.now()}`,
      value: value,
      currency: 'USD',
      items: [
        {
          item_id: plan,
          item_name: `Plan ${plan}`,
          price: value,
          quantity: 1,
        },
      ],
      user_id: userId,
    })
  }
}

// Evento: Usuario vio página de precios (micro-conversión)
export const trackViewPricing = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_pricing', {
      event_category: 'engagement',
      event_label: 'Pricing Page View',
    })
  }
}

// Evento: Usuario hizo clic en CTA
export const trackCTAClick = (ctaName: string, location: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'cta_click', {
      event_category: 'engagement',
      event_label: ctaName,
      cta_location: location,
    })
  }
}

// Evento: Usuario inició proceso de pago
export const trackBeginCheckout = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'USD',
      value: value,
      items: [
        {
          item_id: plan,
          item_name: `Plan ${plan}`,
          price: value,
        },
      ],
    })
  }
}

