/**
 * Utilidades para validación de emails y prevención de bounce rate
 * 
 * Este archivo ayuda a prevenir emails rebotados (bounced emails) que pueden
 * resultar en restricciones de envío por parte de Supabase.
 */

export interface EmailValidationResult {
  valid: boolean
  error?: string
  suggestion?: string
}

// Dominios comunes con errores tipográficos
const COMMON_TYPOS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'live.co': 'live.com',
  'icloud.co': 'icloud.com',
}

// Dominios de prueba que no deberían usarse en producción
const TEST_DOMAINS = [
  'test.com',
  'prueba.com',
  'ejemplo.com',
  'example.com',
  'sample.com',
  'demo.com',
  'testing.com',
  'fake.com',
  'temp.com',
  'temporal.com',
]

// Dominios desechables conocidos (temporary email services)
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'throwaway.email',
  'trashmail.com',
  'yopmail.com',
]

/**
 * Valida un email con reglas estrictas para prevenir bounce backs
 */
export function validateEmail(email: string): EmailValidationResult {
  // Limpiar y normalizar
  const normalizedEmail = email.trim().toLowerCase()
  
  // Validación de formato básico
  if (!normalizedEmail) {
    return {
      valid: false,
      error: 'El email es requerido',
    }
  }

  // Regex mejorado para formato de email
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  if (!emailRegex.test(normalizedEmail)) {
    return {
      valid: false,
      error: 'Formato de email no válido',
    }
  }

  // Extraer partes del email
  const [localPart, domain] = normalizedEmail.split('@')
  
  // Validar que tenga dominio
  if (!domain || !domain.includes('.')) {
    return {
      valid: false,
      error: 'El email debe tener un dominio válido (ej: @gmail.com)',
    }
  }

  // Verificar errores tipográficos comunes
  if (COMMON_TYPOS[domain]) {
    return {
      valid: false,
      error: `Email inválido`,
      suggestion: `¿Quisiste decir ${localPart}@${COMMON_TYPOS[domain]}?`,
    }
  }

  // Bloquear dominios de prueba
  if (TEST_DOMAINS.includes(domain)) {
    return {
      valid: false,
      error: 'Por favor usa un email real, no de prueba',
    }
  }

  // Advertir sobre emails desechables (opcional: puedes bloquearlo completamente)
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return {
      valid: false,
      error: 'No se permiten emails temporales o desechables',
    }
  }

  // Validaciones adicionales de la parte local
  if (localPart.length < 1 || localPart.length > 64) {
    return {
      valid: false,
      error: 'La parte del usuario del email es inválida',
    }
  }

  // Verificar que no tenga puntos consecutivos
  if (localPart.includes('..') || domain.includes('..')) {
    return {
      valid: false,
      error: 'El email no puede contener puntos consecutivos',
    }
  }

  // Verificar que no empiece o termine con punto
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      valid: false,
      error: 'El email no puede empezar o terminar con un punto',
    }
  }

  // Todo válido
  return {
    valid: true,
  }
}

/**
 * Devuelve el email normalizado (limpio y en minúsculas)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Verifica si un dominio tiene un error tipográfico común
 */
export function hasTypo(email: string): { hasTypo: boolean; suggestion?: string } {
  const normalizedEmail = normalizeEmail(email)
  const domain = normalizedEmail.split('@')[1]
  
  if (!domain) {
    return { hasTypo: false }
  }
  
  if (COMMON_TYPOS[domain]) {
    const [localPart] = normalizedEmail.split('@')
    return {
      hasTypo: true,
      suggestion: `${localPart}@${COMMON_TYPOS[domain]}`,
    }
  }
  
  return { hasTypo: false }
}

/**
 * Lista de dominios de email populares para autocompletado
 */
export const POPULAR_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
]

/**
 * Valida que el email no sea de un dominio de prueba
 */
export function isTestEmail(email: string): boolean {
  const normalizedEmail = normalizeEmail(email)
  const domain = normalizedEmail.split('@')[1]
  return TEST_DOMAINS.includes(domain)
}

/**
 * Valida que el email no sea desechable
 */
export function isDisposableEmail(email: string): boolean {
  const normalizedEmail = normalizeEmail(email)
  const domain = normalizedEmail.split('@')[1]
  return DISPOSABLE_DOMAINS.includes(domain)
}

