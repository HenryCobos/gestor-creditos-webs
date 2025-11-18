import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, Lock, Eye, Database } from 'lucide-react'

export default function PrivacidadPage() {
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
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">
              Política de Privacidad
            </h1>
          </div>
          <p className="text-slate-600 mb-8">
            Última actualización: 1 de enero de 2025
          </p>

          {/* Compromisos de Seguridad */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <Lock className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Encriptación SSL</h3>
              <p className="text-sm text-slate-600">
                Todos tus datos están protegidos con encriptación de nivel bancario
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg border border-green-100">
              <Eye className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">No Vendemos Datos</h3>
              <p className="text-sm text-slate-600">
                Nunca vendemos ni compartimos tus datos personales con terceros
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
              <Database className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Backups Diarios</h3>
              <p className="text-sm text-slate-600">
                Respaldos automáticos diarios para proteger tu información
              </p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              1. Introducción
            </h2>
            <p className="text-slate-700 mb-4">
              En GestorPro, nos tomamos muy en serio la privacidad y seguridad de sus datos. Esta 
              Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos 
              su información personal cuando utiliza nuestro servicio.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              2. Información que Recopilamos
            </h2>
            
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">
              2.1 Información de Registro
            </h3>
            <p className="text-slate-700 mb-4">
              Cuando se registra en GestorPro, recopilamos:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Nombre completo</li>
              <li>Dirección de correo electrónico</li>
              <li>Contraseña (encriptada)</li>
              <li>Información de la empresa (opcional)</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">
              2.2 Información de Uso
            </h3>
            <p className="text-slate-700 mb-4">
              Recopilamos información sobre cómo utiliza el Servicio:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Páginas visitadas y funciones utilizadas</li>
              <li>Fecha y hora de acceso</li>
              <li>Dirección IP</li>
              <li>Tipo de navegador y dispositivo</li>
              <li>Datos de rendimiento y errores</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">
              2.3 Datos de Negocio
            </h3>
            <p className="text-slate-700 mb-4">
              Los datos que usted ingresa en GestorPro:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Información de clientes</li>
              <li>Detalles de préstamos y cuotas</li>
              <li>Documentos y archivos adjuntos</li>
              <li>Reportes generados</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              3. Cómo Utilizamos su Información
            </h2>
            <p className="text-slate-700 mb-4">
              Utilizamos su información para:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li><strong>Proporcionar el Servicio:</strong> Procesar sus datos y ejecutar las funcionalidades del sistema</li>
              <li><strong>Mejorar el Servicio:</strong> Analizar el uso para optimizar características y rendimiento</li>
              <li><strong>Comunicación:</strong> Enviar notificaciones importantes sobre su cuenta</li>
              <li><strong>Soporte:</strong> Responder a sus consultas y resolver problemas técnicos</li>
              <li><strong>Seguridad:</strong> Detectar y prevenir fraudes y actividades no autorizadas</li>
              <li><strong>Cumplimiento Legal:</strong> Cumplir con obligaciones legales y regulatorias</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              4. Compartición de Información
            </h2>
            <p className="text-slate-700 mb-4">
              <strong>NO vendemos sus datos personales.</strong> Únicamente compartimos información en estos casos:
            </p>
            
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">
              4.1 Proveedores de Servicios
            </h3>
            <p className="text-slate-700 mb-4">
              Compartimos datos con proveedores que nos ayudan a operar el Servicio:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li><strong>Supabase:</strong> Alojamiento de base de datos y autenticación</li>
              <li><strong>Vercel:</strong> Alojamiento de la aplicación web</li>
              <li><strong>PayPal:</strong> Procesamiento de pagos</li>
            </ul>
            <p className="text-slate-700 mb-4">
              Estos proveedores están obligados contractualmente a proteger su información.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">
              4.2 Requisitos Legales
            </h3>
            <p className="text-slate-700 mb-4">
              Podemos divulgar información si es requerido por ley o en respuesta a procesos legales válidos.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              5. Seguridad de los Datos
            </h2>
            <p className="text-slate-700 mb-4">
              Implementamos medidas de seguridad técnicas y organizativas:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li><strong>Encriptación:</strong> Conexiones HTTPS y encriptación de datos en reposo</li>
              <li><strong>Autenticación:</strong> Contraseñas hasheadas con algoritmos seguros</li>
              <li><strong>Backups:</strong> Respaldos automáticos diarios</li>
              <li><strong>Monitoreo:</strong> Detección de actividades sospechosas 24/7</li>
              <li><strong>Acceso Restringido:</strong> Solo personal autorizado puede acceder a los datos</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              6. Retención de Datos
            </h2>
            <p className="text-slate-700 mb-4">
              Conservamos su información mientras:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Su cuenta esté activa</li>
              <li>Sea necesaria para proporcionar el Servicio</li>
              <li>Sea requerida por obligaciones legales</li>
            </ul>
            <p className="text-slate-700 mb-4">
              Cuando cancele su cuenta, eliminaremos sus datos dentro de 90 días, excepto lo que 
              debamos retener por requisitos legales.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              7. Sus Derechos
            </h2>
            <p className="text-slate-700 mb-4">
              Usted tiene derecho a:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li><strong>Acceso:</strong> Solicitar una copia de sus datos personales</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
              <li><strong>Eliminación:</strong> Solicitar la eliminación de sus datos</li>
              <li><strong>Portabilidad:</strong> Exportar sus datos en formato estructurado</li>
              <li><strong>Oposición:</strong> Oponerse al procesamiento de sus datos</li>
              <li><strong>Restricción:</strong> Solicitar la limitación del procesamiento</li>
            </ul>
            <p className="text-slate-700 mb-4">
              Para ejercer estos derechos, contacte con nosotros desde su panel de control.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              8. Cookies y Tecnologías Similares
            </h2>
            <p className="text-slate-700 mb-4">
              Utilizamos cookies estrictamente necesarias para:
            </p>
            <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
              <li>Mantener su sesión iniciada</li>
              <li>Recordar sus preferencias</li>
              <li>Garantizar la seguridad del Servicio</li>
            </ul>
            <p className="text-slate-700 mb-4">
              No utilizamos cookies de seguimiento o publicidad de terceros.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              9. Transferencias Internacionales
            </h2>
            <p className="text-slate-700 mb-4">
              Sus datos pueden ser procesados en servidores ubicados en diferentes países. 
              Garantizamos que se aplican medidas de seguridad adecuadas en todas las ubicaciones.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              10. Menores de Edad
            </h2>
            <p className="text-slate-700 mb-4">
              GestorPro no está dirigido a menores de 18 años. No recopilamos conscientemente 
              información de menores. Si descubrimos que hemos recopilado información de un menor, 
              la eliminaremos inmediatamente.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              11. Cambios en esta Política
            </h2>
            <p className="text-slate-700 mb-4">
              Podemos actualizar esta Política de Privacidad ocasionalmente. Le notificaremos sobre 
              cambios importantes por correo electrónico o mediante un aviso destacado en el Servicio.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
              12. Contacto
            </h2>
            <p className="text-slate-700 mb-4">
              Si tiene preguntas sobre esta Política de Privacidad o sobre cómo manejamos sus datos, 
              puede contactarnos a través de su panel de control en GestorPro.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-green-900 font-semibold mb-2">
                    Compromiso con su Privacidad
                  </p>
                  <p className="text-green-800 text-sm">
                    En GestorPro, la protección de sus datos es nuestra prioridad. Implementamos 
                    las mejores prácticas de seguridad y cumplimos con todas las regulaciones 
                    aplicables de protección de datos.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-slate-700 text-sm mb-2">
                <strong>Última actualización:</strong> 1 de enero de 2025
              </p>
              <p className="text-slate-700 text-sm">
                Al utilizar GestorPro, usted acepta esta Política de Privacidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

