import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function calculateLoanDetails(
  monto: number,
  interesPorcentaje: number,
  numeroCuotas: number
) {
  const interes = (monto * interesPorcentaje) / 100
  const montoTotal = monto + interes
  const montoCuota = montoTotal / numeroCuotas

  return {
    interes,
    montoTotal,
    montoCuota,
  }
}

export function isDateOverdue(date: string | Date): boolean {
  return new Date(date) < new Date()
}

