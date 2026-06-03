import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { startOfDay } from "date-fns"

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
  // Si es un string de fecha (YYYY-MM-DD), parsearlo correctamente para evitar problemas de zona horaria
  if (typeof date === 'string') {
    // Si tiene formato ISO con hora (YYYY-MM-DDTHH:mm:ss), usar directamente
    if (date.includes('T')) {
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(date))
    }
    // Si es solo fecha (YYYY-MM-DD), parsear los componentes para evitar conversión UTC
    const [year, month, day] = date.split('-').map(Number)
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(year, month - 1, day))
  }
  // Si ya es un objeto Date, usarlo directamente
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
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

/** Retrasada solo si la fecha de vencimiento es anterior a hoy (mismo día = pendiente). */
export function isDateOverdue(date: string | Date): boolean {
  let dueDate: Date
  if (typeof date === 'string') {
    const datePart = date.includes('T') ? date.split('T')[0] : date
    const [year, month, day] = datePart.split('-').map(Number)
    dueDate = new Date(year, month - 1, day)
  } else {
    dueDate = date
  }
  const due = startOfDay(dueDate)
  const today = startOfDay(new Date())
  return today > due
}

