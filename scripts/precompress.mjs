import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

const MIN_BYTES = 5 * 1024;
const COMPRESSIBLE = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.svg',
  '.xml',
  '.txt',
]);

const brotli = promisify(brotliCompress);
const gzipped = promisify(gzip);

async function* filesUnder(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(path);
    else yield path;
  }
}

async function precompress(path) {
  const body = await readFile(path);
  await Promise.all([
    brotli(body, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
      },
    }).then((packed) => writeFile(`${path}.br`, packed)),
    gzipped(body, { level: constants.Z_BEST_COMPRESSION }).then((packed) =>
      writeFile(`${path}.gz`, packed),
    ),
  ]);
}

const chosen = [];
for await (const path of filesUnder(dist)) {
  if (!COMPRESSIBLE.has(extname(path)) || basename(path) === 'spa.html')
    continue;
  if ((await stat(path)).size < MIN_BYTES) continue;
  chosen.push(path);
}
await Promise.all(chosen.map(precompress));
console.log(`Precompressed ${chosen.length} files in dist`);
