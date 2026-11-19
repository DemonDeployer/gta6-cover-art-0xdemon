// Selftest for Neon Vice Cover Studio: runs main.ts with a temp output dir
// and checks the handed-in entry holds app/, screenshots/ and a parsable dossier.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'neon-vice-selftest-'));
console.log('output dir:', out);
execFileSync('node', ['main.ts'], {
  cwd: new URL('.', import.meta.url).pathname,
  env: { ...process.env, MAKEFUN_OUTPUT_DIR: out },
  stdio: 'inherit',
});

const failures = [];
function check(name, ok) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
  if (!ok) failures.push(name);
}

check('app/ exists', existsSync(join(out, 'app')));
check('app/index.html exists', existsSync(join(out, 'app', 'index.html')));
check('app/app.js exists', existsSync(join(out, 'app', 'app.js')));
check('app/style.css exists', existsSync(join(out, 'app', 'style.css')));
check('screenshots/ exists', existsSync(join(out, 'screenshots')));
const shots = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')) : [];
check('3 or 4 screenshots', shots.length >= 3 && shots.length <= 4);
for (const s of shots) {
  const st = statSync(join(out, 'screenshots', s));
  check('screenshot ' + s + ' under 256 KiB (' + st.size + ' bytes)', st.size <= 262144);
}
const dossierPath = join(out, 'dossier.json');
check('dossier.json exists', existsSync(dossierPath));
if (existsSync(dossierPath)) {
  try {
    const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
    check('dossier.json parses', true);
    check('dossier schema is makefun/dossier/v1', dossier.schema === 'makefun/dossier/v1');
  } catch (e) {
    check('dossier.json parses (' + e.message + ')', false);
  }
}
if (failures.length) {
  console.error('SELFTEST FAILED:', failures.join(', '));
  process.exit(1);
}
console.log('SELFTEST PASSED');
