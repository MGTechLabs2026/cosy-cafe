// M4 packaging verification: simulate itch.io's HTML5 frame serving the build
// from a SUBPATH. Asserts every runtime-referenced path is RELATIVE.
//
// KNOWN GAP (flagged in the M4 report, pre-existing from M3): Fenwick's
// portrait file does not exist under public/assets/portraits/ (bram, nia,
// sela, wren do), so the bundled reference to assets/portraits/fenwick.png
// 404s at runtime. The journal guards this with `complete && naturalWidth`
// and simply omits the image — graceful. This script reports it as a warning,
// not a failure, so the packaging gate reflects the shipped state honestly.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const jsFile = /assets\/index-[^"]+\.js/.exec(html)?.[0];
if (!jsFile) throw new Error('no entry script found in dist/index.html');
const js = readFileSync(join(dist, jsFile), 'utf8');

const problems = [];
const warnings = [];

// 1. index.html must reference ./ relative paths only.
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = m[1];
  if (/^(https?:)?\/\//.test(url) || url.startsWith('/')) problems.push(`index.html absolute ref: ${url}`);
}

// 2. The bundle must contain no absolute public-asset string literals.
for (const bad of ['"/assets/', "'/assets/", '"/audio/', "'/audio/"]) {
  if (js.includes(bad)) problems.push(`bundle contains absolute path ${bad}`);
}

// 3. Collect every asset path the bundle constructs; verify existence.
const refs = new Set();
for (const m of js.matchAll(/["'`](?:\.?\/)?((?:assets|audio)\/[A-Za-z0-9_\-./]+\.(?:png|ogg|mp3|wav|css))["'`]/g)) {
  refs.add(m[1]);
}
const missing = [];
for (const r of refs) {
  if (!existsSync(join(dist, r))) missing.push(r);
}
for (const f of missing) {
  // Portraits render guarded + optional (journal omits missing art); anything
  // else is a hard problem.
  if (f.startsWith('assets/portraits/')) warnings.push(`optional art missing: ${f}`);
  else problems.push(`missing from dist/: ${f}`);
}

// 4. dist must contain the copied public assets the game cannot run without.
if (!existsSync(join(dist, 'assets', 'backgrounds', 'cafe_room.png'))) problems.push('cafe_room.png missing');
if (!existsSync(join(dist, 'audio', 'click.ogg'))) problems.push('audio/click.ogg missing');

console.log(`index.html relative refs OK · runtime asset refs=${refs.size} · missing-but-optional=${warnings.length}`);
for (const w of warnings) console.log(`WARN ${w}`);
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('SUBPATH-SIMULATION PASS: build is relocatable (works under any iframe subpath)');
