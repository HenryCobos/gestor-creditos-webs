"use client"

import { addDays, addWeeks, addMonths } from 'date-fns'

export type FrecuenciaPago = 'diario' | 'semanal' | 'quincenal' | 'mensual'
export type TipoInteres = 'simple' | 'compuesto'
export type TipoPrestamo = 'amortizacion' | 'solo_intereses' | 'empeño'
export type TipoCalculoInteres = 'por_periodo' | 'global' // Por período (20% mensual) o Global (20% total)

export interface CalculoPrestamoParams {
  monto: number
  interesPorcentaje: number // Interés POR PERÍODO o GLOBAL según tipoCalculoInteres
  numeroCuotas: number
  tipoInteres?: TipoInteres
  tipoPrestamo?: TipoPrestamo
  frecuenciaPago?: FrecuenciaPago // Necesario para mostrar correctamente en labels
  tipoCalculoInteres?: TipoCalculoInteres // Por período o global
}

export interface CalculoPrestamoResult {
  interes: number
  montoTotal: number
  montoCuota: number
  montoInteresCuota?: number // Solo para modo "solo intereses"
  montoCapitalFinal?: number // Capital a pagar al final en "solo intereses"
}

/**
 * Calcula los detalles de un préstamo
 */
export function calculateLoanDetails(
  params: CalculoPrestamoParams
): CalculoPrestamoResult {
  const { 
    monto, 
    interesPorcentaje, 
    numeroCuotas, 
    tipoInteres = 'simple',
    tipoPrestamo = 'amortizacion'
  } = params
  
  // Modo "Solo Intereses": Solo se paga interés mensual, capital al final
  if (tipoPrestamo === 'solo_intereses') {
    const tasaMensual = interesPorcentaje / 100
    const montoInteresCuota = monto * tasaMensual
    const interesTotal = montoInteresCuota * numeroCuotas
    const montoTotal = monto + interesTotal
    
    return {
      interes: Number(interesTotal.toFixed(2)),
      montoTotal: Number(montoTotal.toFixed(2)),
      montoCuota: Number(montoInteresCuota.toFixed(2)), // Solo el interés
      montoInteresCuota: Number(montoInteresCuota.toFixed(2)),
      montoCapitalFinal: monto, // Capital a devolver al final
    }
  }
  
  // Modo "Empeño": Similar a amortización pero con garantía
  // Por ahora usa la misma lógica de amortización
  if (tipoPrestamo === 'empeño') {
    // En empeños, normalmente se paga interés periódico y se puede renovar
    // Por defecto, calculamos como amortización normal
    // El usuario puede ajustar según su modelo de negocio
  }
  
  // Modo "Amortización" (por defecto): Pago de capital + interés
  const tipoCalculo = params.tipoCalculoInteres || 'por_periodo'
  
  let interes: number
  let montoTotal: number
  
  if (tipoCalculo === 'global') {
    // Interés GLOBAL: Se aplica sobre el capital total, independiente del tiempo
    // Ejemplo: $1000 al 20% global = $200 de interés (sin importar cuántos meses)
    const tasaGlobal = interesPorcentaje / 100
    interes = monto * tasaGlobal
    montoTotal = monto + interes
  } else {
    // Interés POR PERÍODO: Se multiplica por número de períodos
    // Ejemplo: $1000 al 20% mensual por 6 meses = $1000 * 20% * 6 = $1200 de interés
    if (tipoInteres === 'simple') {
      // Interés simple: I = P * r * t
      // r = tasa por período, t = número de períodos
      const tasaPorPeriodo = interesPorcentaje / 100
      interes = monto * tasaPorPeriodo * numeroCuotas
      montoTotal = monto + interes
    } else {
      // Interés compuesto: A = P(1 + r)^n
      // r = tasa por período, n = número de períodos
      const tasaPorPeriodo = interesPorcentaje / 100
      montoTotal = monto * Math.pow(1 + tasaPorPeriodo, numeroCuotas)
      interes = montoTotal - monto
    }
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

