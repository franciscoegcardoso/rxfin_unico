#!/usr/bin/env node
/**
 * Writes a unique build id to src/build-id.ts when VERCEL=1.
 * This changes a source file so Turbo/Vercel build cache misses and the new bundle is deployed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.VERCEL === '1') {
  const id = process.env.VERCEL_BUILD_ID || `t${Date.now()}`;
  const content = `/** Injected at build time to bust cache. Do not edit manually. */\nexport const LANDING_BUILD_ID = '${id}';\n`;
  const out = path.join(__dirname, '..', 'src', 'build-id.ts');
  fs.writeFileSync(out, content);
  console.log('[inject-build-id] Wrote LANDING_BUILD_ID:', id);
}
