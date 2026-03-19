/**
 * Baixa SVG/PNG de logos FIPE para apps/web/public/logos/
 * Uso (na raiz do monorepo): node fetch-all-logos.mjs
 *
 * Camada raster: Logo.dev (substitui Clearbit descontinuado).
 */
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logosDir = join(__dirname, 'apps', 'web', 'public', 'logos');
mkdirSync(logosDir, { recursive: true });

const LOGODEV_TOKEN = 'pk_Dp3UH6feRJSHIK2iM3-Y0g';
const logoDev = (domain) =>
  `https://img.logo.dev/${domain}?token=${LOGODEV_TOKEN}&size=128`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const logos = [
  { f: 'honda-motos.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Honda_Moto_logo.svg' },
  { f: 'yamaha.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Yamaha_Logo.svg' },
  { f: 'kawasaki.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Kawasaki_Heavy_Industries_logo.svg' },
  { f: 'ducati.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Ducati_red_logo.svg' },
  { f: 'royal-enfield.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Royal-enfield-logo.svg' },
  { f: 'indian.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Indian_Motorcycle_logo.svg' },
  { f: 'gas-gas.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/GasGas_logo.svg' },
  { f: 'kymco.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Kymco-Logo.svg' },
  { f: 'mahindra.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Mahindra_new_logo.svg' },
  { f: 'geely.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Geely_logo.svg' },
  { f: 'changan.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Changan_logo_2020.svg' },
  { f: 'smart.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Smart_logo.svg' },
  { f: 'niu.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/NIU_Technologies_logo.svg' },
  { f: 'derbi.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Derbi_logo.svg' },
  { f: 'motomorini.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Moto_Morini_logo.svg' },
  { f: 'navistar.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Navistar_logo.svg' },
  { f: 'gac.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/GAC_Group_logo.svg' },
  { f: 'daihatsu.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Daihatsu_logo.svg' },
  { f: 'daewoo.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Daewoo_logo.svg' },
  { f: 'buell.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Buell_logo.svg' },
  { f: 'cagiva.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Cagiva_logo.svg' },
  { f: 'hero.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Hero_MotoCorp_Logo.svg' },
  { f: 'lada.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/3/30/AvtoVAZ_logo.svg' },
  { f: 'lotus.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Lotus_cars_logo.svg' },
  { f: 'isuzu.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Isuzu_logo.svg' },
  { f: 'acura.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Acura_logo.svg' },
  { f: 'cadillac.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Cadillac_logo.svg' },
  { f: 'saab.svg', u: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Saab_Automobile_logo.svg' },
  { f: 'lifan.png', u: logoDev('lifan.com') },
  { f: 'foton.png', u: logoDev('foton.com') },
  { f: 'hisun.png', u: logoDev('hisun.com') },
  { f: 'daelim.png', u: logoDev('daelim.co.kr') },
  { f: 'zontes.png', u: logoDev('zontesmoto.com') },
  { f: 'sinotruk.png', u: logoDev('sinotruk.com') },
  { f: 'shacman.png', u: logoDev('shacman.com') },
  { f: 'neobus.png', u: logoDev('neobus.com.br') },
  { f: 'mascarello.png', u: logoDev('mascarello.com.br') },
  { f: 'haojue.png', u: logoDev('haojue.com.br') },
  { f: 'traxx.png', u: logoDev('traxx.com.br') },
  { f: 'sundown.png', u: logoDev('sundown.com.br') },
  { f: 'motorino.png', u: logoDev('motorino.com.br') },
  { f: 'dayang.png', u: logoDev('dayanggroup.com') },
  { f: 'bimota.png', u: logoDev('bimota.it') },
  { f: 'super-soco.png', u: logoDev('super-soco.com') },
  { f: 'kasinski.png', u: logoDev('kasinski.com.br') },
  { f: 'dafra.png', u: logoDev('dafra.com.br') },
  { f: 'shineray-motos.png', u: logoDev('shineray.com.br') },
  { f: 'shineray-car.png', u: logoDev('shineray.com.br') },
  { f: 'marcopolo.png', u: logoDev('marcopolo.com.br') },
  { f: 'agrale.png', u: logoDev('agrale.com.br') },
];

let ok = 0;
let skip = 0;
let fail = 0;

for (const { f, u } of logos) {
  const path = join(logosDir, f);

  if (existsSync(path)) {
    const content = readFileSync(path);
    const isPlaceholder =
      content.length < 300 ||
      (content.includes(Buffer.from('<circle')) && content.includes(Buffer.from('<text')));
    if (!isPlaceholder) {
      console.log(`⏭️  SKIP  ${f} (${content.length}B)`);
      skip++;
      continue;
    }
    console.log(`🔄 REPLACE placeholder ${f} (${content.length}B)`);
  }

  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (!r.ok) {
      console.log(`❌ HTTP ${r.status}  ${f}`);
      fail++;
      continue;
    }

    const isSvg = f.endsWith('.svg');
    if (isSvg) {
      const text = await r.text();
      if (!text.includes('<svg') || text.length < 200) {
        console.log(`❌ INVALID ${f} (${text.length}B)`);
        fail++;
        continue;
      }
      writeFileSync(path, text);
      console.log(`✅ OK  ${f.padEnd(28)} ${text.length.toLocaleString()}B`);
    } else {
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 100) {
        console.log(`❌ EMPTY ${f}`);
        fail++;
        continue;
      }
      writeFileSync(path, buf);
      console.log(`✅ OK  ${f.padEnd(28)} ${buf.length.toLocaleString()}B`);
    }
    ok++;
  } catch (e) {
    console.log(`❌ ERROR ${f}: ${e.message}`);
    fail++;
  }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`✅ OK: ${ok}  |  ⏭️ Skipped: ${skip}  |  ❌ Failed: ${fail}`);
console.log(`\n⚠️  Para logos que falharam, adicione manualmente em apps/web/public/logos/`);
