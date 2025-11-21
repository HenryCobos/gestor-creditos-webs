'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'

interface WhatsAppButtonProps {
  phoneNumber: string // Formato: 51999999999 (código país + número sin espacios)
  message?: string
  position?: 'right' | 'left'
}

export default function WhatsAppButton({ 
  phoneNumber, 
  message = '¡Hola! Tengo una consulta sobre Gestor de Créditos',
  position = 'right'
}: WhatsAppButtonProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)

  useEffect(() => {
    // Mostrar el botón después de un pequeño delay para mejor UX
    const timer = setTimeout(() => setIsVisible(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  const positionClasses = position === 'right' 
    ? 'right-4 sm:right-6' 
    : 'left-4 sm:left-6'

  if (!isVisible) return null

  return (
    <>
      {/* Botón Principal */}
      <div
        className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Tooltip/Mensaje */}
        {isTooltipOpen && (
          <div className="absolute bottom-full mb-2 right-0 sm:right-auto sm:left-0 animate-in slide-in-from-bottom-2">
            <div className="relative bg-white rounded-lg shadow-lg p-4 max-w-[280px] border border-gray-100">
              {/* Botón cerrar */}
              <button
                onClick={() => setIsTooltipOpen(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              <p className="text-sm text-gray-700 pr-6">
                ¿Necesitas ayuda? ¡Contáctanos por WhatsApp!
              </p>
              
              {/* Flecha del tooltip */}
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-gray-100 transform rotate-45"></div>
            </div>
          </div>
        )}

        {/* Botón de WhatsApp */}
        <button
          onClick={handleWhatsAppClick}
          onMouseEnter={() => setIsTooltipOpen(true)}
          onMouseLeave={() => setTimeout(() => setIsTooltipOpen(false), 3000)}
          className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Contactar por WhatsApp"
        >
          {/* Efecto de pulso */}
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75 animate-ping"></span>
          
          {/* Icono de WhatsApp */}
          <MessageCircle className="relative h-7 w-7 sm:h-8 sm:w-8 group-hover:rotate-12 transition-transform duration-300" />
          
          {/* Badge de notificación (opcional) */}
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            1
          </span>
        </button>

        {/* Texto flotante en desktop */}
        <div className="hidden sm:block absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap">
            ¿Necesitas ayuda?
          </div>
        </div>
      </div>
    </>
  )
}

