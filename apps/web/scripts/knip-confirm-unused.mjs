#!/usr/bin/env node
/**
 * Segunda ronda: Knip (só ficheiros) + confirmação por grep.
 * Lista ficheiros que o Knip marca como unused e verifica se ainda há referências em `src/`.
 *
 * Uso: npm run knip:verify
 *
 * Não apaga ficheiros — apenas imprime listas para revisão humana.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const gitRoot = execSync('git rev-parse --show-toplevel', { cwd: root, encoding: 'utf8' }).trim();
const srcArg = path.relative(gitRoot, path.join(root, 'src')).replace(/\\/g, '/');

function stripBom(s) {
  return s.replace(/^\uFEFF/, '');
}

function gitGrep(pattern) {
  try {
    return execSync(`git grep -l -F ${JSON.stringify(pattern)} -- ${srcArg}`, {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function main() {
  let raw = '';
  try {
    raw = execSync('npx knip --include files --reporter json --no-config-hints', {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    raw = e.stdout?.toString?.() ?? '';
    if (!raw) throw e;
  }

  const json = JSON.parse(stripBom(raw));
  const issues = json.issues ?? [];

  /** Caminhos relativos a apps/web que Knip considera unused file */
  const files = [];
  for (const issue of issues) {
    const f = issue.file;
    if (!f || !String(f).endsWith('.ts') && !String(f).endsWith('.tsx')) continue;
    const isUnusedFile =
      Array.isArray(issue.files) &&
      issue.files.length > 0 &&
      (!issue.exports || issue.exports.length === 0) &&
      (!issue.types || issue.types.length === 0);
    if (isUnusedFile) files.push(f.replace(/\\/g, '/'));
  }

  const unique = [...new Set(files)];

  if (unique.length === 0) {
    console.log('[knip:verify] 0 ficheiros órfãos reportados pelo Knip (include=files).');
    process.exit(0);
  }

  console.log(`[knip:verify] ${unique.length} candidato(s) órfão(s). A cruzar com git grep em src/...\n`);

  const confirmed = [];
  const needsReview = [];

  for (const rel of unique) {
    const posix = rel.replace(/\\/g, '/');
    const fromSrc = posix.startsWith('src/') ? posix.slice(4) : posix;
    const aliasPath = `@/${fromSrc.replace(/\.(tsx?)$/, '')}`;
    const baseName = path.basename(posix, path.extname(posix));

    const patterns = [
      aliasPath,
      aliasPath + "'",
      `"@/${fromSrc}"`,
      `'@/${fromSrc}'`,
      fromSrc,
    ];

    let hitOutsideSelf = false;
    for (const p of patterns) {
      const out = gitGrep(p);
      if (!out) continue;
      const lines = out.split(/\r?\n/).filter(Boolean);
      const others = lines.filter((line) => line.replace(/\\/g, '/') !== posix);
      if (others.length > 0) {
        hitOutsideSelf = true;
        break;
      }
    }

    if (!hitOutsideSelf) {
      const broad = gitGrep(baseName);
      if (broad) {
        const lines = broad.split(/\r?\n/).filter(Boolean);
        const others = lines.filter((line) => line.replace(/\\/g, '/') !== posix);
        hitOutsideSelf = others.length > 0;
      }
    }

    if (hitOutsideSelf) needsReview.push(rel);
    else confirmed.push(rel);
  }

  console.log('--- CONFIRMADOS (sem git grep em src além do próprio ficheiro) ---');
  if (confirmed.length === 0) console.log('  (nenhum)');
  else confirmed.forEach((f) => console.log(`  ${f}`));

  console.log('\n--- REVISAR (ainda há referências a este path/nome em src) ---');
  if (needsReview.length === 0) console.log('  (nenhum)');
  else needsReview.forEach((f) => console.log(`  ${f}`));

  console.log(
    '\nNota: falsos negativos são possíveis (imports dinâmicos, strings). Apagar só após revisão.'
  );
}

main();
