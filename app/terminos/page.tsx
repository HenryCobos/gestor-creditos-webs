import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Simple */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Términos de Servicio
          </h1>
          <p className="text-slate-600 mb-8">
            Última actualización: 1 de enero de 2025
          </p>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              1. Aceptación de los Términos
            </h2>
            <p className="text-slate-700 mb-4">
              Al acceder y utilizar GestorPro ("el Servicio"), usted acepta estar obligado por estos 
              Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, 
              no debe utilizar nuestro servicio.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              2. Descripción del Servicio
            </h2>
            <p className="text-slate-700 mb-4">
              GestorPro es una plataforma de software como servicio (SaaS) diseñada para la gestión 
              de préstamos, clientes y cobros. El servicio incluye:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Gestión de clientes y base de datos</li>
              <li>Control y seguimiento de préstamos</li>
              <li>Cálculo automático de intereses y cuotas</li>
              <li>Generación de reportes y documentos</li>
              <li>Panel de control con métricas en tiempo real</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              3. Registro y Cuenta de Usuario
            </h2>
            <p className="text-slate-700 mb-4">
              Para utilizar el Servicio, debe:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Proporcionar información precisa y completa durante el registro</li>
              <li>Mantener la seguridad de su contraseña</li>
              <li>Notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta</li>
              <li>Ser responsable de todas las actividades que ocurran bajo su cuenta</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              4. Planes y Pagos
            </h2>
            <p className="text-slate-700 mb-4">
              <strong>4.1 Planes Disponibles:</strong> Ofrecemos cuatro planes de suscripción: 
              Gratuito, Profesional, Business y Enterprise.
            </p>
            <p className="text-slate-700 mb-4">
              <strong>4.2 Facturación:</strong> Los planes de pago se facturan mensual o anualmente, 
              según su elección. El pago se procesa automáticamente al inicio de cada período.
            </p>
            <p className="text-slate-700 mb-4">
              <strong>4.3 Reembolsos:</strong> Ofrecemos una garantía incondicional de 7 días 
              (o el periodo establecido por la ley local aplicable) procesada directamente a través de Hotmart.
            </p>
            <p className="text-slate-700 mb-4">
              <strong>4.4 Procesador de Pagos:</strong> Todas las transacciones son procesadas de forma segura 
              por Hotmart B.V., quien actúa como el Comerciante Registrado (Merchant of Record) para estos servicios.
            </p>
            <p className="text-slate-700 mb-4">
              <strong>4.5 Cancelación:</strong> Puede cancelar su suscripción en cualquier momento desde 
              su panel de control. La cancelación será efectiva al final del período de facturación actual.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              5. Uso Aceptable
            </h2>
            <p className="text-slate-700 mb-4">
              Usted se compromete a NO:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Utilizar el Servicio para actividades ilegales o fraudulentas</li>
              <li>Intentar acceder a sistemas o datos de otros usuarios</li>
              <li>Interferir con el funcionamiento del Servicio</li>
              <li>Copiar, modificar o distribuir el software sin autorización</li>
              <li>Utilizar el Servicio para enviar spam o contenido malicioso</li>
              <li>Compartir su cuenta con terceros no autorizados</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              6. Propiedad Intelectual
            </h2>
            <p className="text-slate-700 mb-4">
              El Servicio y su contenido original, características y funcionalidad son propiedad 
              exclusiva de GestorPro. Todos los derechos de propiedad intelectual están reservados.
            </p>
            <p className="text-slate-700 mb-4">
              Los datos que usted ingresa en el sistema son de su propiedad. GestorPro solo actúa 
              como procesador de datos.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              7. Limitación de Responsabilidad
            </h2>
            <p className="text-slate-700 mb-4">
              GestorPro proporciona el Servicio "tal cual" y "según disponibilidad". No garantizamos 
              que el Servicio sea ininterrumpido, seguro o libre de errores.
            </p>
            <p className="text-slate-700 mb-4">
              En ningún caso GestorPro será responsable por daños indirectos, incidentales, especiales, 
              consecuentes o punitivos, incluyendo pérdida de beneficios, datos o uso.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              8. Protección de Datos
            </h2>
            <p className="text-slate-700 mb-4">
              El tratamiento de sus datos personales está regido por nuestra{' '}
              <Link href="/privacidad" className="text-blue-600 hover:underline">
                Política de Privacidad
              </Link>.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              9. Modificaciones del Servicio
            </h2>
            <p className="text-slate-700 mb-4">
              Nos reservamos el derecho de:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Modificar o discontinuar el Servicio con o sin previo aviso</li>
              <li>Actualizar los precios con 30 días de anticipación para usuarios existentes</li>
              <li>Cambiar las características de los planes</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              10. Terminación
            </h2>
            <p className="text-slate-700 mb-4">
              Podemos terminar o suspender su cuenta inmediatamente, sin previo aviso, si:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Viola estos Términos de Servicio</li>
              <li>No realiza el pago correspondiente</li>
              <li>Utiliza el Servicio de manera fraudulenta o ilegal</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              11. Ley Aplicable
            </h2>
            <p className="text-slate-700 mb-4">
              Estos Términos se rigen por las leyes aplicables en su jurisdicción, sin tener en 
              cuenta sus conflictos de principios legales.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              12. Cambios en los Términos
            </h2>
            <p className="text-slate-700 mb-4">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Le 
              notificaremos sobre cambios importantes por correo electrónico o a través de un 
              aviso en el Servicio.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              13. Contacto
            </h2>
            <p className="text-slate-700 mb-4">
              Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos a través 
              del dashboard o enviando un mensaje desde su cuenta.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <p className="text-blue-900 font-semibold mb-2">
                Última actualización: 1 de enero de 2025
              </p>
              <p className="text-blue-800 text-sm">
                Al utilizar GestorPro, usted acepta estos Términos de Servicio en su totalidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

