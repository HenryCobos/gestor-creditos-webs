"use client"

import { addDays, addWeeks, addMonths } from 'date-fns'

export type FrecuenciaPago = 'diario' | 'semanal' | 'quincenal' | 'mensual'
export type TipoInteres = 'simple' | 'compuesto'
export type TipoPrestamo = 'amortizacion' | 'solo_intereses' | 'empeño'
export type TipoCalculoInteres = 'por_periodo' | 'global' // Por período (20% mensual) o Global (20% total)

export interface CalculoPrestamoParams {
  monto: number
  interesPorcentaje: number // Interés MENSUAL (siempre mensual)
  numeroMeses?: number // Duración del préstamo en MESES (opcional si se usa numeroDias)
  numeroDias?: number // Duración del préstamo en DÍAS (opcional si se usa numeroMeses)
  frecuenciaPago: FrecuenciaPago // Frecuencia de pago (diario, semanal, quincenal, mensual)
  tipoInteres?: TipoInteres
  tipoPrestamo?: TipoPrestamo
  tipoCalculoInteres?: TipoCalculoInteres // Por período (mensual) o global
}

export interface CalculoPrestamoResult {
  interes: number
  montoTotal: number
  montoCuota: number
  montoInteresCuota?: number // Solo para modo "solo intereses"
  montoCapitalFinal?: number // Capital a pagar al final en "solo intereses"
}

/**
 * Calcula el número de cuotas según la duración (meses o días) y la frecuencia de pago
 */
export function calcularNumeroCuotas(
  numeroMeses: number | undefined,
  frecuenciaPago: FrecuenciaPago,
  numeroDias?: number | undefined
): number {
  // Si se especifica número de días, calcular cuotas directamente según frecuencia
  if (numeroDias !== undefined && numeroDias > 0) {
    switch (frecuenciaPago) {
      case 'diario':
        return numeroDias // 1 día = 1 cuota diaria
      case 'semanal':
        return Math.round(numeroDias / 7) // Dividir días entre 7
      case 'quincenal':
        return Math.round(numeroDias / 15) // Dividir días entre 15
      case 'mensual':
        return Math.round(numeroDias / 30) // Dividir días entre 30
      default:
        return numeroDias
    }
  }
  
  // Si se usa meses (comportamiento original)
  if (numeroMeses !== undefined && numeroMeses > 0) {
    switch (frecuenciaPago) {
      case 'diario':
        // Aproximadamente 30 días por mes
        return Math.round(numeroMeses * 30)
      case 'semanal':
        // Aproximadamente 4 semanas por mes
        return numeroMeses * 4
      case 'quincenal':
        // 2 quincenas por mes
        return numeroMeses * 2
      case 'mensual':
        return numeroMeses
      default:
        return numeroMeses
    }
  }
  
  return 0
}

/**
 * Convierte días a meses para cálculos de interés (aproximación: 30 días = 1 mes)
 */
export function convertirDiasAMeses(numeroDias: number): number {
  return numeroDias / 30
}

/**
 * Calcula los detalles de un préstamo
 * El interés siempre es MENSUAL, y se calcula por número de MESES
 * Luego el monto total se divide según la frecuencia de pago
 */
export function calculateLoanDetails(
  params: CalculoPrestamoParams
): CalculoPrestamoResult {
  const { 
    monto, 
    interesPorcentaje, 
    numeroMeses,
    numeroDias,
    frecuenciaPago,
    tipoInteres = 'simple',
    tipoPrestamo = 'amortizacion'
  } = params
  
  // Calcular número de cuotas basado en meses/días y frecuencia
  const numeroCuotas = calcularNumeroCuotas(numeroMeses, frecuenciaPago, numeroDias)
  
  // Determinar número de meses equivalentes para el cálculo de interés
  // Si se especifica días, convertir a meses (30 días = 1 mes)
  const mesesParaInteres = numeroDias !== undefined && numeroDias > 0
    ? convertirDiasAMeses(numeroDias)
    : (numeroMeses || 0)
  
  // Modo "Solo Intereses": Solo se paga interés mensual, capital al final
  if (tipoPrestamo === 'solo_intereses') {
    // El interés se calcula mensualmente
    const tasaMensual = interesPorcentaje / 100
    const interesPorMes = monto * tasaMensual
    const interesTotal = interesPorMes * mesesParaInteres // Interés por número de MESES equivalentes
    const montoTotal = monto + interesTotal
    
    // El interés mensual se divide según la frecuencia de pago
    const montoInteresPorCuota = interesTotal / numeroCuotas
    
    return {
      interes: Number(interesTotal.toFixed(2)),
      montoTotal: Number(montoTotal.toFixed(2)),
      montoCuota: Number(montoInteresPorCuota.toFixed(2)), // Solo el interés dividido
      montoInteresCuota: Number(montoInteresPorCuota.toFixed(2)),
      montoCapitalFinal: monto, // Capital a devolver al final
    }
  }
  
  // Modo "Empeño": Similar a amortización pero con garantía
  if (tipoPrestamo === 'empeño') {
    // Usa la misma lógica de amortización
  }
  
  // Modo "Amortización" (por defecto): Pago de capital + interés
  const tipoCalculo = params.tipoCalculoInteres || 'por_periodo'
  
  let interes: number
  let montoTotal: number
  
  if (tipoCalculo === 'global') {
    // Interés GLOBAL: Se aplica sobre el capital total, independiente del tiempo
    // Ejemplo: $1000 al 20% global = $200 de interés (sin importar cuántos meses/días)
    const tasaGlobal = interesPorcentaje / 100
    interes = monto * tasaGlobal
    montoTotal = monto + interes
  } else {
    // Interés MENSUAL: Se multiplica por número de MESES equivalentes
    // Ejemplo: $1000 al 20% mensual por 6 meses = $1000 * 20% * 6 = $1200 de interés
    // Ejemplo: $1000 al 20% mensual por 24 días (0.8 meses) = $1000 * 20% * 0.8 = $160 de interés
    if (tipoInteres === 'simple') {
      // Interés simple: I = P * r * t
      // r = tasa MENSUAL, t = número de MESES equivalentes
      const tasaMensual = interesPorcentaje / 100
      interes = monto * tasaMensual * mesesParaInteres
      montoTotal = monto + interes
    } else {
      // Interés compuesto: A = P(1 + r)^n
      // r = tasa MENSUAL, n = número de MESES equivalentes
      const tasaMensual = interesPorcentaje / 100
      montoTotal = monto * Math.pow(1 + tasaMensual, mesesParaInteres)
      interes = montoTotal - monto
    }
  }
  
  // Dividir el monto total entre el número de cuotas según la frecuencia de pago
  const montoCuota = numeroCuotas > 0 ? montoTotal / numeroCuotas : 0
  
  return {
    interes: Number(interes.toFixed(2)),
    montoTotal: Number(montoTotal.toFixed(2)),
    montoCuota: Number(montoCuota.toFixed(2)),
  }
}

/**
 * Ajusta una fecha al lunes siguiente si cae en domingo
 */
export function ajustarDomingo(fecha: Date): Date {
  const diaSemana = fecha.getDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  if (diaSemana === 0) {
    // Si es domingo, mover al lunes (agregar 1 día)
    return addDays(fecha, 1)
  }
  return fecha
}

/**
 * Calcula la siguiente fecha de pago según la frecuencia
 * Para la cuota 1, devuelve la fecha base más un período
 * Para la cuota 2, devuelve la fecha base más dos períodos, etc.
 * @param excluirDomingos - Si es true, las fechas que caigan en domingo se moverán al lunes
 */
export function calcularSiguienteFechaPago(
  fechaBase: Date,
  numeroCuota: number,
  frecuencia: FrecuenciaPago,
  excluirDomingos: boolean = false
): Date {
  // La primera cuota vence un período después de la fecha de inicio
  // numeroCuota ya viene con el valor correcto (1, 2, 3, etc.)
  let fecha: Date
  
  switch (frecuencia) {
    case 'diario':
      fecha = addDays(fechaBase, numeroCuota)
      break
    case 'semanal':
      fecha = addWeeks(fechaBase, numeroCuota)
      break
    case 'quincenal':
      fecha = addWeeks(fechaBase, numeroCuota * 2)
      break
    case 'mensual':
      fecha = addMonths(fechaBase, numeroCuota)
      break
    default:
      fecha = addMonths(fechaBase, numeroCuota)
  }
  
  // Si se debe excluir domingos, ajustar la fecha
  if (excluirDomingos) {
    fecha = ajustarDomingo(fecha)
  }
  
  return fecha
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

