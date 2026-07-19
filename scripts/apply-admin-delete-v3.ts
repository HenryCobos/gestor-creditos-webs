// @ts-nocheck
/**
 * Aplica supabase/FIX_ADMIN_DELETE_ORG_V3.sql vía conexión Postgres directa.
 *
 * Requiere DATABASE_URL (Supabase → Project Settings → Database → Connection string URI)
 * en .env.local o variable de entorno.
 *
 * Uso:
 *   export $(grep -E '^DATABASE_URL=' .env.local | xargs)
 *   npx tsx scripts/apply-admin-delete-v3.ts
 *
 * Sin DATABASE_URL: copia el SQL a Supabase → SQL Editor y ejecuta manualmente.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const sqlPath = join(process.cwd(), 'supabase/FIX_ADMIN_DELETE_ORG_V3.sql')
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function main() {
  if (!databaseUrl) {
    console.error('❌ Falta DATABASE_URL o SUPABASE_DB_URL')
    console.error('   Obtén la URI en Supabase → Project Settings → Database')
    console.error('   O ejecuta manualmente en Supabase → SQL Editor:')
    console.error(`   ${sqlPath}`)
    process.exit(1)
  }

  const sql = readFileSync(sqlPath, 'utf8')

  let pg: typeof import('pg')
  try {
    pg = await import('pg')
  } catch {
    console.error('❌ Instala pg: npm install pg')
    process.exit(1)
  }

  const client = new pg.default.Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    console.log('Aplicando FIX_ADMIN_DELETE_ORG_V3.sql...')
    await client.query(sql)
    console.log('✓ SQL v3 aplicado correctamente')
    console.log('\nVerifica con: npx tsx scripts/verify-admin-delete-rls.ts')
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('❌ Error aplicando SQL:', e.message || e)
  process.exit(1)
})
