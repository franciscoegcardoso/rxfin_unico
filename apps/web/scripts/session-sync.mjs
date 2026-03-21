#!/usr/bin/env node
/**
 * session-sync.mjs — RXFin Session Start Checklist
 * Executado automaticamente por `pnpm dev:sync` antes do Vite.
 * Verifica paridade do ambiente local com produção.
 * Sai com code 0 mesmo com warnings (não bloqueia o dev server).
 * Sai com code 1 apenas em divergência crítica (>10 commits atrás).
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')   // apps/web/

const R = '\x1b[0m', G = '\x1b[32m', Y = '\x1b[33m',
      RE = '\x1b[31m', C = '\x1b[36m', B = '\x1b[1m', D = '\x1b[2m'

const ok   = m => console.log(`  ${G}✅${R} ${m}`)
const warn = m => console.log(`  ${Y}⚠️ ${R} ${m}`)
const fail = m => console.log(`  ${RE}❌${R} ${m}`)
const info = m => console.log(`     ${D}${m}${R}`)

function run(cmd) {
  try { return execSync(cmd, { stdio: ['pipe','pipe','pipe'], cwd: ROOT }).toString().trim() }
  catch { return '' }
}

// ── 1. Git sync ──────────────────────────────────────────────────────────────
function checkGit() {
  run('git fetch origin --quiet 2>/dev/null || true')
  const behind = parseInt(run('git rev-list HEAD..origin/main --count'), 10) || 0
  const ahead  = parseInt(run('git rev-list origin/main..HEAD --count'),  10) || 0
  const branch = run('git rev-parse --abbrev-ref HEAD') || 'unknown'
  const sha    = run('git rev-parse --short HEAD')       || '?'

  if (behind === 0 && ahead === 0) {
    ok(`Git: ${B}${branch}${R}${G} em paridade com origin/main ${D}(${sha})${R}`)
  } else if (behind > 10) {
    fail(`Git: branch ${branch} está ${B}${behind} commits atrás${R}${RE} de origin/main`)
    info('Execute: git fetch origin && git rebase origin/main')
    return { behind, ahead, critical: true }
  } else if (behind > 0) {
    warn(`Git: branch ${branch} está ${behind} commit(s) atrás de origin/main`)
    info('Execute: git rebase origin/main antes do próximo deploy')
  }
  if (ahead > 0) info(`${ahead} commit(s) locais ainda não em prod (delta intencional OK)`)
  return { behind, ahead, critical: false }
}

// ── 2. .env.local vs .env.example ───────────────────────────────────────────
function checkEnv() {
  const exPath = join(ROOT, '.env.example')
  const lcPath = join(ROOT, '.env.local')
  if (!existsSync(exPath)) { info('.env.example não encontrado'); return true }

  const keys = txt => txt.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => l.split('=')[0].trim())

  const exKeys = keys(readFileSync(exPath, 'utf8'))
  if (!existsSync(lcPath)) {
    fail('.env.local não encontrado — copie .env.example e preencha os valores')
    info('cp .env.example .env.local')
    return false
  }
  const lcSet   = new Set(keys(readFileSync(lcPath, 'utf8')))
  const missing = exKeys.filter(k => !lcSet.has(k))
  if (missing.length === 0) {
    ok(`.env.local: todas as ${exKeys.length} chaves presentes`)
  } else {
    warn(`.env.local: ${missing.length} chave(s) faltando:`)
    missing.forEach(k => info(`→ ${k}`))
  }
  return missing.length === 0
}

// ── 3. Última migration Supabase ─────────────────────────────────────────────
function checkMigrations() {
  // Tenta caminhos possíveis no monorepo
  const candidates = [
    join(ROOT, 'supabase', 'migrations'),
    join(ROOT, '..', '..', 'supabase', 'migrations'),
  ]
  const dir = candidates.find(p => existsSync(p))
  if (!dir) { info('supabase/migrations não encontrado — verificar manualmente'); return }
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort().reverse()
  if (!files.length) { info('Nenhuma migration SQL encontrada'); return }
  ok(`Migrations: ${files.length} total`)
  info(`Última: ${B}${files[0]}${R}`)
  info('Confirme que está aplicada no Supabase (MCP ou dashboard)')
}

// ── Main ─────────────────────────────────────────────────────────────────────
const now = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
console.log(`\n  ${B}${C}RXFin — Session Start Checklist${R}  ${D}${now}${R}\n`)

const git = checkGit()
const env = checkEnv()
checkMigrations()

console.log()
if (git.critical) {
  console.log(`  ${RE}${B}❌ Divergência crítica — resolva antes de continuar${R}\n`)
  process.exit(1)
} else if (git.behind > 0 || !env) {
  console.log(`  ${Y}${B}⚠️  Ambiente com divergências — verifique acima${R}`)
  console.log(`  ${D}Dev server iniciando mesmo assim...${R}\n`)
} else {
  console.log(`  ${G}${B}✅ Ambiente pronto — iniciando dev server...${R}\n`)
}
