import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'web');
const outputDir = path.join(rootDir, 'dist');

async function build() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await cp(sourceDir, outputDir, { recursive: true });

  console.log(`Built static site from ${sourceDir} to ${outputDir}`);
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exitCode = 1;
});
