'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function RouteChangeListener() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      // Notificar a GTM que la ruta cambió (PageView)
      (window as any).dataLayer.push({
        event: 'page_view',
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title
      })

      // Evento: CompleteRegistration (Usuario llegó al Dashboard)
      if (pathname === '/dashboard') {
        (window as any).dataLayer.push({
          event: 'CompleteRegistration',
          page_path: pathname
        })
      }

      // Evento: InitiateCheckout (Usuario está viendo planes/checkout)
      if (pathname.includes('/dashboard/subscription') || pathname.includes('/checkout')) {
        (window as any).dataLayer.push({
          event: 'InitiateCheckout',
          page_path: pathname
        })
      }

      // Evento: Purchase (Usuario llegó a compra exitosa)
      if (pathname === '/compra-exitosa') {
        (window as any).dataLayer.push({
          event: 'Purchase',
          page_path: pathname
        })
      }
    }
  }, [pathname, searchParams])

  return null
}

