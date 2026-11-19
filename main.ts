// Neon Vice Cover Studio — entry program (Node 22, standard library only).
//
// This program hands the entry in: it copies the static app under app/ and
// the screenshots under screenshots/ from this repository into the output
// directory, then writes dossier.json there with buildDossier from the
// vendored make.fun library (vendor/makefun-app.ts, the kit's own copy).
//
// In the grader the output directory is /output. Anywhere else, set
// MAKEFUN_OUTPUT_DIR to a directory of your choice, for example:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with: node serve.ts  (http://localhost:8080)

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Directory holding this file, i.e. the repository root.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// Where the handed-in entry goes: the grader's /output, or the override.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(source: string, target: string): void {
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function handIn(): void {
  mkdirSync(outputDir, { recursive: true });
  // Start from a clean output so a stale file can never leak into the entry.
  for (const name of ['app', 'screenshots', 'dossier.json']) {
    const p = join(outputDir, name);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
  copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
  if (existsSync(join(repoRoot, 'screenshots'))) {
    copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
  } else {
    mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  }
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

handIn();
