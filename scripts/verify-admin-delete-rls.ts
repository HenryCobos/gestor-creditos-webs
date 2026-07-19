/**
 * Verifica helpers y RPC v3 DELETE admin-only.
 *
 * Ejecutar en Supabase → SQL Editor:
 *   supabase/FIX_ADMIN_DELETE_ORG_V3.sql
 *
 * Uso:
 *   export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs)
 *   npx tsx scripts/verify-admin-delete-rls.ts
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const V3_FUNCTIONS: { name: string; args: Record<string, string> }[] = [
  { name: 'get_mi_organization_admin', args: {} },
  { name: 'es_admin_activo', args: {} },
  { name: 'admin_puede_eliminar_cliente', args: { p_cliente_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'admin_puede_eliminar_prestamo', args: { p_prestamo_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'eliminar_cliente_admin', args: { p_cliente_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'eliminar_prestamo_admin', args: { p_prestamo_id: '00000000-0000-0000-0000-000000000000' } },
]

async function main() {
  console.log('=== Verificación RLS delete admin (v3) ===\n')

  for (const { name, args } of V3_FUNCTIONS) {
    const { error } = await supabase.rpc(name, args)
    if (error?.message?.includes('Could not find the function')) {
      console.error(`❌ Falta función/RPC ${name}.`)
      console.error('   Ejecuta supabase/FIX_ADMIN_DELETE_ORG_V3.sql en Supabase SQL Editor.')
      process.exit(1)
    }
    console.log(`✓ ${name} disponible`)
  }

  const { count: cobNull } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'cobrador')
    .is('organization_id', null)

  const { count: adminNull } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')
    .is('organization_id', null)

  if (cobNull) {
    console.log(`\n⚠️  Cobradores con org NULL: ${cobNull} (v3 usa IS NOT DISTINCT FROM)`)
  }
  if (adminNull) {
    console.log(`⚠️  Admins con org NULL: ${adminNull} (v3 modo legacy habilitado)`)
  }

  console.log('\n✓ Verificación automática completada.')
  console.log('  Probar en UI: admin elimina préstamo/cliente del cobrador vía RPC eliminar_*_admin.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
