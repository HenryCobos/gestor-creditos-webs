#!/usr/bin/env node
/**
 * Agrega o actualiza una variable en Vercel Production sin tocar las demás.
 *
 * Uso:
 *   TIKTOK_PIXEL_ID=xxx TIKTOK_ACCESS_TOKEN=yyy node scripts/add-vercel-env.mjs
 *   node scripts/add-vercel-env.mjs TIKTOK_PIXEL_ID=xxx TIKTOK_ACCESS_TOKEN=yyy
 */

import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function runVercel(args, input) {
  return spawnSync('npx', ['vercel', ...args], {
    cwd: ROOT,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

function upsertVercelEnv(name, value, environment = 'production') {
  const ls = runVercel(['env', 'ls', environment], undefined)
  if (ls.status !== 0) {
    throw new Error(ls.stderr || ls.stdout || 'vercel env ls failed')
  }
  if (ls.stdout.includes(name)) {
    runVercel(['env', 'rm', name, environment, '--yes'], undefined)
  }
  const add = runVercel(['env', 'add', name, environment], value)
  if (add.status !== 0) {
    throw new Error(add.stderr || add.stdout || `Failed to set ${name}`)
  }
}

function parsePairs(argv) {
  const pairs = {}
  for (const arg of argv) {
    const eq = arg.indexOf('=')
    if (eq === -1) continue
    pairs[arg.slice(0, eq)] = arg.slice(eq + 1)
  }
  for (const key of ['TIKTOK_PIXEL_ID', 'TIKTOK_ACCESS_TOKEN']) {
    if (process.env[key]) pairs[key] = process.env[key]
  }
  return pairs
}

function main() {
  const pairs = parsePairs(process.argv.slice(2))
  const entries = Object.entries(pairs).filter(([, v]) => v)

  if (!entries.length) {
    console.error('Uso: node scripts/add-vercel-env.mjs KEY=value [KEY2=value2 ...]')
    console.error('  o exporta TIKTOK_PIXEL_ID y TIKTOK_ACCESS_TOKEN en el entorno')
    process.exit(1)
  }

  const whoami = runVercel(['whoami'], undefined)
  if (whoami.status !== 0) {
    console.error('Ejecuta primero: npx vercel login && npx vercel link')
    process.exit(1)
  }
  console.log(`Vercel: ${whoami.stdout.trim()}\n`)

  for (const [key] of entries) {
    upsertVercelEnv(key, pairs[key])
    console.log(`  ✓ ${key} → Production`)
  }

  console.log('\n✅ Listo. Redeploy para aplicar:')
  console.log('  npx vercel --prod')
}

main()
