import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, ArrowRight, LayoutDashboard } from "lucide-react"

export default function CompraExitosaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <div className="h-2 bg-green-500 w-full rounded-t-xl" />
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center mb-2">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center shadow-inner animate-in zoom-in duration-500">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            ¡Pago Recibido! 🎉
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Tu suscripción se ha activado correctamente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
            <p className="font-medium mb-1">¿Qué sucede ahora?</p>
            <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
              <li>Tu cuenta ha sido actualizada al plan Premium.</li>
              <li>Ya tienes acceso ilimitado a todas las funciones.</li>
              <li>Hemos enviado el recibo a tu correo electrónico.</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2 pb-8">
          <Link href="/dashboard" className="w-full">
            <Button className="w-full h-12 text-lg gap-2 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
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

