import { createClient } from '@/lib/supabase/client'

const LOGO_BUCKET = 'company-logos'
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

export interface UploadLogoResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Sube el logo de la empresa a Supabase Storage
 */
export async function uploadLogo(
  file: File,
  userId: string
): Promise<UploadLogoResult> {
  try {
    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Tipo de archivo no permitido. Use PNG, JPG, SVG o WebP',
      }
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'El archivo es demasiado grande. Máximo 2MB',
      }
    }

    const supabase = createClient()

    // Crear nombre único para el archivo con estructura de carpetas por usuario
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    // Usar carpeta por usuario para facilitar RLS
    const filePath = `${userId}/${fileName}`

    // Subir el archivo
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      // Si el bucket no existe, intentar crearlo
      if (error.message.includes('not found')) {
        return {
          success: false,
          error: 'El bucket de almacenamiento no está configurado. Contacte al administrador.',
        }
      }
      return {
        success: false,
        error: error.message,
      }
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al subir el logo',
    }
  }
}

/**
 * Elimina el logo de Supabase Storage
 */
export async function deleteLogo(logoUrl: string, userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Extraer el nombre del archivo de la URL
    const urlParts = logoUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    // Usar la misma estructura de carpetas
    const filePath = `${userId}/${fileName}`
    
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove([filePath])

    return !error
  } catch {
    return false
  }
}

/**
 * Valida un archivo antes de subirlo
 */
export function validateLogoFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido. Use PNG, JPG, SVG o WebP',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'El archivo es demasiado grande. Máximo 2MB',
    }
  }

  return { valid: true }
}

