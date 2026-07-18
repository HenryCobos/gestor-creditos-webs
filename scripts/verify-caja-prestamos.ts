import { createClient } from '@supabase/supabase-js'
import { fetchResumenCajaRuta } from '../lib/caja-movimientos'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const rutaId = '62517381-351d-458d-9a70-95f84b6f4be1'

  const jul17 = await fetchResumenCajaRuta(
    supabase,
    rutaId,
    '2026-07-01',
    '2026-07-17',
    undefined,
    { preferRpc: false }
  )
  const jul18 = await fetchResumenCajaRuta(
    supabase,
    rutaId,
    '2026-07-01',
    '2026-07-18',
    undefined,
    { preferRpc: false }
  )

  console.log('Periodo 01/07-17/07:', {
    total_prestado: jul17?.total_prestado,
    total_prestado_activo: jul17?.total_prestado_activo,
    capital_actual: jul17?.capital_actual,
    movimientos_prestamo: jul17?.movimientos.filter((m) => m.tipo === 'prestamo_entregado').length,
  })
  console.log('Periodo 01/07-18/07:', {
    total_prestado: jul18?.total_prestado,
    total_prestado_activo: jul18?.total_prestado_activo,
  })
}

main().catch(console.error)
