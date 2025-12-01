'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Check, CreditCard, ShieldCheck, Lock } from 'lucide-react'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { loadPlans } from '@/lib/subscription-helpers'
import { trackBeginCheckout } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { getHotmartCheckoutUrl } from '@/lib/hotmart'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const { plans, setPlans } = useSubscriptionStore()
  const supabase = createClient()

  const planId = searchParams.get('plan')
  const period = searchParams.get('period') as 'monthly' | 'yearly' || 'monthly'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // 1. Cargar Usuario (Necesitamos su ID y Email para Hotmart)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Si no está logueado, guardar intento y redirigir
      sessionStorage.setItem('pending_checkout_plan', planId || '')
      router.push('/login?redirectTo=/dashboard/subscription/checkout')
      return
    }
    setUser(user)

    // 2. Cargar Planes
    const plansData = await loadPlans()
    setPlans(plansData)
    setLoading(false)
  }

  const selectedPlan = plans.find(p => p.id === planId)
  const precio = period === 'monthly' ? selectedPlan?.precio_mensual : selectedPlan?.precio_anual

  // 🎯 Tracking: Usuario inició proceso de pago
  useEffect(() => {
    if (selectedPlan && precio) {
      trackBeginCheckout(selectedPlan.nombre, precio)
    }
  }, [selectedPlan, precio])

  const handleHotmartPayment = () => {
    if (!selectedPlan || !user) return

    const checkoutUrl = getHotmartCheckoutUrl(
      selectedPlan.slug,
      period,
      user.email || '',
      user.id
    )

    if (checkoutUrl) {
      // Tracking antes de irse
      // trackInitiateCheckout(...) 

      // Redirigir a Hotmart
      window.location.href = checkoutUrl
    } else {
      toast({
        title: "Error de configuración",
        description: "No se pudo generar el enlace de pago. Por favor contacta a soporte.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!selectedPlan) {
    return (
      <div className="container max-w-md py-12 text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Plan no encontrado</h2>
        <p className="text-gray-600 mb-6">No pudimos encontrar el plan que seleccionaste.</p>
        <Button onClick={() => router.push('/dashboard/subscription')}>
          Volver a Planes
        </Button>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 px-4 md:px-6">
      <Button 
        variant="ghost" 
        className="mb-6 gap-2 text-gray-600 hover:text-gray-900" 
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Columna Izquierda: Resumen */}
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="bg-gray-50 p-6 border-b">
              <h1 className="text-2xl font-bold text-gray-900">Resumen del Pedido</h1>
              <p className="text-gray-500">Estás a un paso de potenciar tu negocio</p>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Tarjeta de Plan Seleccionado */}
              <div className="flex justify-between items-center p-5 bg-white border-2 border-blue-50 rounded-xl shadow-sm">
                <div>
                  <h3 className="font-bold text-xl text-gray-900">{selectedPlan.nombre}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold uppercase">
                      {period === 'monthly' ? 'Mensual' : 'Anual'}
                    </span>
                    {selectedPlan.slug === 'pro' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold uppercase">
                        Más Popular
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl font-bold text-gray-900">${precio?.toFixed(0)}</span>
                    <span className="text-sm text-gray-500">USD</span>
                  </div>
                  <p className="text-xs text-gray-500">/{period === 'monthly' ? 'mes' : 'año'}</p>
                </div>
              </div>

              {/* Lista de Beneficios */}
              <div className="space-y-4 pt-2">
                <h4 className="font-semibold text-sm text-gray-900 uppercase tracking-wide">Lo que obtienes hoy:</h4>
                <ul className="grid gap-3 sm:grid-cols-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Acceso inmediato al sistema</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Sin contratos forzosos</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Soporte prioritario incluido</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Actualizaciones gratuitas</span>
                  </li>
                </ul>
              </div>

              {/* Garantía */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Garantía de Satisfacción de 7 Días</p>
                  <p className="text-blue-700/80 text-xs mt-1">
                    Si no estás conforme con el servicio, puedes solicitar un reembolso completo en los primeros 7 días directamente con Hotmart.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Pago */}
        <div className="space-y-6">
          <Card className="border-2 border-blue-600 shadow-xl sticky top-8">
            <CardHeader className="bg-gray-50/50 pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500" />
                Pago Seguro
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${precio?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl text-gray-900 border-t pt-4">
                  <span>Total a pagar</span>
                  <span>${precio?.toFixed(2)} USD</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full bg-[#ff4f00] hover:bg-[#e64700] text-white font-bold text-lg h-14 shadow-lg shadow-orange-200 transition-all hover:scale-[1.02]"
                onClick={handleHotmartPayment}
              >
                Pagar Ahora
              </Button>
              
              <div className="text-center space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Serás redirigido al checkout oficial de <strong>Hotmart</strong> para completar tu compra de forma segura.
                </p>
                
                {/* Métodos de Pago Visuales */}
                <div className="flex flex-wrap justify-center gap-2 opacity-60 grayscale transition-all hover:grayscale-0">
                  <div className="h-6 w-10 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">VISA</div>
                  <div className="h-6 w-10 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">MC</div>
                  <div className="h-6 w-10 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">AMEX</div>
                  <div className="h-6 w-14 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">EFECTIVO</div>
                </div>

                <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mt-4">
                  <Lock className="w-3 h-3" />
                  <span>TLS 256-bit Secure Payment</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
