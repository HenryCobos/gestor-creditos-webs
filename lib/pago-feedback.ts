import type { useToast } from '@/components/ui/use-toast'

type ToastFn = ReturnType<typeof useToast>['toast']

interface PagoApiResponse {
  message?: string
  prestamo_liquidado?: boolean
}

/** Toast de éxito al registrar pago; aviso breve si el préstamo quedó liquidado. */
export function toastPagoExitoso(
  toast: ToastFn,
  data: PagoApiResponse,
  _currency: string
) {
  toast({
    title: 'Éxito',
    description: data.message || 'Pago registrado correctamente',
  })

  if (data.prestamo_liquidado) {
    toast({
      title: 'Préstamo liquidado',
      description: 'El préstamo quedó pagado en su totalidad.',
    })
  }
}
