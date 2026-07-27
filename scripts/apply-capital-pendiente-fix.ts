// @ts-nocheck
/**
 * Aplica fix capital pendiente por fases (producción activa).
 *
 * Requiere DATABASE_URL en .env.local (Supabase → Database → Connection string URI)
 *
 * Uso:
 *   npx tsx scripts/apply-capital-pendiente-fix.ts A   # solo funciones
 *   npx tsx scripts/apply-capital-pendiente-fix.ts B   # prueba ANITA
 *   npx tsx scripts/apply-capital-pendiente-fix.ts C   # resto rutas (tras OK)
 *
 * Sin DATABASE_URL: ejecuta manualmente en Supabase → SQL Editor:
 *   supabase/FIX_CAPITAL_PENDIENTE_CAJA_A.sql
 *   supabase/FIX_CAPITAL_PENDIENTE_CAJA_B.sql
 *   supabase/FIX_CAPITAL_PENDIENTE_CAJA_C.sql
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const phase = (process.argv[2] || '').toUpperCase()
const files: Record<string, string> = {
  A: 'FIX_CAPITAL_PENDIENTE_CAJA_A.sql',
  B: 'FIX_CAPITAL_PENDIENTE_CAJA_B.sql',
  C: 'FIX_CAPITAL_PENDIENTE_CAJA_C.sql',
}

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function main() {
  if (!files[phase]) {
    console.error('Uso: npx tsx scripts/apply-capital-pendiente-fix.ts A|B|C')
    process.exit(1)
  }

  if (phase === 'C' && process.env.CONFIRM_RECALC_ALL !== 'yes') {
    console.error('❌ Fase C requiere confirmación explícita:')
    console.error('   CONFIRM_RECALC_ALL=yes npx tsx scripts/apply-capital-pendiente-fix.ts C')
    process.exit(1)
  }

  const sqlPath = join(process.cwd(), 'supabase', files[phase])

  if (!databaseUrl) {
    console.error('❌ Falta DATABASE_URL o SUPABASE_DB_URL')
    console.error('   Ejecuta manualmente en Supabase → SQL Editor:')
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
    console.log(`Aplicando Fase ${phase}: ${files[phase]}...`)
    const result = await client.query(sql)
    if (result.rows?.length) {
      console.log('Resultado:')
      console.table(result.rows)
    }
    console.log(`✓ Fase ${phase} aplicada`)
    if (phase === 'B') {
      console.log('\nValida con:')
      console.log('  npx tsx scripts/diagnostico-caja-ruta.ts cristianfuchs10@gmail.com ANITA')
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e)
  process.exit(1)
})
