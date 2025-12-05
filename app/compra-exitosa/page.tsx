'use client'

import { useEffect, useState } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, ArrowRight, LayoutDashboard, Check, Loader2 } from "lucide-react"
import { loadUserSubscription } from "@/lib/subscription-helpers"
import { getPlanBenefits } from "@/lib/subscription-helpers"

// Colores y estilos por plan
const planStyles = {
  pro: {
    gradient: 'from-blue-50 via-indigo-50 to-purple-50',
    borderColor: 'bg-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
    buttonShadow: 'shadow-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  business: {
    gradient: 'from-purple-50 via-pink-50 to-purple-50',
    borderColor: 'bg-purple-500',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    buttonBg: 'bg-purple-600 hover:bg-purple-700',
    buttonShadow: 'shadow-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  enterprise: {
    gradient: 'from-amber-50 via-orange-50 to-yellow-50',
    borderColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    buttonBg: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
    buttonShadow: 'shadow-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  free: {
    gradient: 'from-gray-50 via-gray-50 to-gray-50',
    borderColor: 'bg-gray-500',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-800',
    buttonBg: 'bg-gray-600 hover:bg-gray-700',
    buttonShadow: 'shadow-gray-200',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
}

export default function CompraExitosaPage() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)

  useEffect(() => {
    loadPlanData()
  }, [])

  const loadPlanData = async () => {
    try {
      // Intentar cargar hasta 3 veces con delay de 2 segundos
      let attempts = 0
      const maxAttempts = 3
      
      while (attempts < maxAttempts) {
        const data = await loadUserSubscription()
        
        // Si ya no está en plan gratuito, significa que el webhook ya procesó
        if (data?.plan?.slug !== 'free') {
          setSubscription(data)
          setLoading(false)
          return
        }
        
        attempts++
        if (attempts < maxAttempts) {
          console.log(`Intento ${attempts}: Plan aún no actualizado, reintentando en 3s...`)
          await new Promise(resolve => setTimeout(resolve, 3000)) // Esperar 3 segundos
        }
      }
      
      // Después de 3 intentos, mostrar lo que sea que tengamos
      const finalData = await loadUserSubscription()
      setSubscription(finalData)
    } catch (error) {
      console.error('Error cargando suscripción:', error)
    } finally {
      setLoading(false)
    }
  }

  // Determinar el plan actual (excluir 'free')
  const currentPlan = subscription?.plan
  const planSlug = currentPlan?.slug || 'free'
  const planName = currentPlan?.nombre || 'Gratuito'
  const isPaidPlan = planSlug !== 'free'
  
  // Si no es un plan de pago, usar estilos del plan Pro por defecto
  const styles = isPaidPlan ? planStyles[planSlug as keyof typeof planStyles] || planStyles.pro : planStyles.pro
  const benefits = getPlanBenefits(planSlug)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Activando tu plan...</p>
          <p className="text-sm text-gray-500">Esto puede tomar unos segundos</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${styles.gradient} p-4`}>
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <div className={`h-2 ${styles.borderColor} w-full rounded-t-xl`} />
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center mb-2">
            <div className={`w-20 h-20 ${styles.iconBg} rounded-full flex items-center justify-center shadow-inner animate-in zoom-in duration-500`}>
              <CheckCircle2 className={`w-10 h-10 ${styles.iconColor}`} />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            ¡Pago Recibido! 🎉
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Tu suscripción al plan <strong className="font-bold">{planName}</strong> se ha activado correctamente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Badge del Plan */}
          {isPaidPlan && (
            <div className="flex justify-center">
              <div className={`px-4 py-2 ${styles.badgeBg} ${styles.badgeText} rounded-full font-bold text-sm`}>
                Plan {planName} Activado
              </div>
            </div>
          )}

          {/* Beneficios del Plan */}
          {isPaidPlan && benefits.length > 0 && (
            <div className={`${styles.badgeBg} p-6 rounded-lg border-2 ${styles.borderColor.replace('bg-', 'border-')} border-opacity-30`}>
              <p className={`font-bold text-lg mb-4 ${styles.badgeText}`}>
                ✨ Beneficios de tu Plan {planName}
              </p>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
                    <span className={`${styles.badgeText} text-sm`}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Información Adicional */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-700">
            <p className="font-medium mb-2">📧 ¿Qué sucede ahora?</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Tu cuenta ha sido actualizada al plan <strong>{planName}</strong>.</li>
              <li>Ya tienes acceso a todas las funciones de tu plan.</li>
              <li>Hemos enviado el recibo a tu correo electrónico.</li>
              {subscription?.subscription_period && (
                <li>Tu suscripción es <strong>{subscription.subscription_period === 'monthly' ? 'mensual' : 'anual'}</strong>.</li>
              )}
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2 pb-8">
          <Link href="/dashboard" className="w-full">
            <Button className={`w-full h-12 text-lg gap-2 ${styles.buttonBg} text-white shadow-lg ${styles.buttonShadow}`}>
              <LayoutDashboard className="w-5 h-5" />
              Ir al Dashboard
            </Button>
          </Link>
          
          <Link href="/dashboard/subscription" className="w-full">
            <Button variant="ghost" className="w-full text-gray-500 hover:text-gray-900">
              Ver detalles de mi plan
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

