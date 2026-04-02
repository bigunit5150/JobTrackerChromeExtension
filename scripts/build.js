import { execSync } from 'child_process';
import { readFileSync, mkdirSync, existsSync, unlinkSync, cpSync, rmSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'job-tracker-extension');
const DIST = join(ROOT, 'dist');
const STAGE = join(DIST, '_stage');

// Read version from manifest
const manifest = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8'));
const zipName = `job-tracker-v${manifest.version}.zip`;
const outPath = join(DIST, zipName);

// Clean
if (existsSync(outPath)) unlinkSync(outPath);
if (existsSync(STAGE)) rmSync(STAGE, { recursive: true });

mkdirSync(STAGE, { recursive: true });

// Files and folders to include (runtime only)
const include = [
  'manifest.json',
  'background.js',
  'claude.js',
  'content.js',
  'notion.js',
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
  'parsers',
  'icons',
];

// Copy to staging directory, preserving folder structure
for (const entry of include) {
  cpSync(join(SRC, entry), join(STAGE, entry), { recursive: true });
}

console.log(`Building ${zipName}...`);

try {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${STAGE}/*' -DestinationPath '${outPath}'"`,
    { stdio: 'inherit' }
  );
  console.log(`Done: dist/${zipName}`);
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
} finally {
  rmSync(STAGE, { recursive: true, force: true });
}
