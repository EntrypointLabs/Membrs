import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const shell = join(dist, 'spa.html');
const { module } = await runnerImport(
  fileURLToPath(new URL('../src/lib/prerender.ts', import.meta.url)),
);

// The first run copies Vite's index.html to spa.html before overwriting
// index.html with the prerendered home page, so a second run must read the
// untouched shell instead of an already filled page.
const template = await readFile(shell, 'utf8').catch(() =>
  readFile(join(dist, 'index.html'), 'utf8'),
);
await writeFile(shell, template);

const pages = module.prerenderPages(template);
for (const { file, html } of pages) {
  const target = join(dist, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
}
await writeFile(
  join(dist, 'site.json'),
  `${JSON.stringify(module.siteManifest(), null, 2)}\n`,
);
console.log(`Prerendered ${pages.length} pages into dist`);
