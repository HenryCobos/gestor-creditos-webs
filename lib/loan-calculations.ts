"use client"

import { addDays, addWeeks, addMonths } from 'date-fns'

export type FrecuenciaPago = 'diario' | 'semanal' | 'quincenal' | 'mensual'
export type TipoInteres = 'simple' | 'compuesto'

export interface CalculoPrestamoParams {
  monto: number
  interesPorcentaje: number
  numeroCuotas: number
  tipoInteres?: TipoInteres
}

export interface CalculoPrestamoResult {
  interes: number
  montoTotal: number
  montoCuota: number
}

/**
 * Calcula los detalles de un préstamo
 */
export function calculateLoanDetails(
  params: CalculoPrestamoParams
): CalculoPrestamoResult {
  const { monto, interesPorcentaje, numeroCuotas, tipoInteres = 'simple' } = params
  
  let interes: number
  let montoTotal: number
  
  if (tipoInteres === 'simple') {
    // Interés simple: I = P * r * t
    interes = (monto * interesPorcentaje) / 100
    montoTotal = monto + interes
  } else {
    // Interés compuesto: A = P(1 + r)^n
    const tasa = interesPorcentaje / 100
    montoTotal = monto * Math.pow(1 + tasa / numeroCuotas, numeroCuotas)
    interes = montoTotal - monto
  }
  
  const montoCuota = montoTotal / numeroCuotas
  
  return {
    interes: Number(interes.toFixed(2)),
    montoTotal: Number(montoTotal.toFixed(2)),
    montoCuota: Number(montoCuota.toFixed(2)),
  }
}

/**
 * Calcula la siguiente fecha de pago según la frecuencia
 */
export function calcularSiguienteFechaPago(
  fechaBase: Date,
  numeroCuota: number,
  frecuencia: FrecuenciaPago
): Date {
  switch (frecuencia) {
    case 'diario':
      return addDays(fechaBase, numeroCuota)
    case 'semanal':
      return addWeeks(fechaBase, numeroCuota)
    case 'quincenal':
      return addWeeks(fechaBase, numeroCuota * 2)
    case 'mensual':
      return addMonths(fechaBase, numeroCuota)
    default:
      return addMonths(fechaBase, numeroCuota)
  }
}

/**
 * Obtiene el nombre descriptivo de la frecuencia
 */
export function getNombreFrecuencia(frecuencia: FrecuenciaPago): string {
  const nombres: Record<FrecuenciaPago, string> = {
    diario: 'Diario',
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual',
  }
  return nombres[frecuencia]
}

/**
 * Calcula el período total del préstamo en días
 */
export function calcularDuracionTotal(
  numeroCuotas: number,
  frecuencia: FrecuenciaPago
): number {
  switch (frecuencia) {
    case 'diario':
      return numeroCuotas
    case 'semanal':
      return numeroCuotas * 7
    case 'quincenal':
      return numeroCuotas * 14
    case 'mensual':
      return numeroCuotas * 30
    default:
      return numeroCuotas * 30
  }
}

/**
 * Valida el número de cuotas según la frecuencia
 */
export function validarNumeroCuotas(
  numeroCuotas: number,
  frecuencia: FrecuenciaPago
): { valido: boolean; mensaje?: string } {
  const limites: Record<FrecuenciaPago, { min: number; max: number }> = {
    diario: { min: 7, max: 365 },
    semanal: { min: 4, max: 104 },
    quincenal: { min: 2, max: 52 },
    mensual: { min: 1, max: 60 },
  }
  
  const { min, max } = limites[frecuencia]
  
  if (numeroCuotas < min) {
    return {
      valido: false,
      mensaje: `Mínimo ${min} cuotas para frecuencia ${getNombreFrecuencia(frecuencia).toLowerCase()}`,
    }
  }
  
  if (numeroCuotas > max) {
    return {
      valido: false,
      mensaje: `Máximo ${max} cuotas para frecuencia ${getNombreFrecuencia(frecuencia).toLowerCase()}`,
    }
  }
  
  return { valido: true }
}

