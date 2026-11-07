/**
 * Builds every listing photo into responsive AVIF and WebP files, plus a
 * manifest with each photo's size and a tiny blurred placeholder.
 *
 * Sources live in assets/photos. Output goes to public/images (gitignored)
 * and src/generated/photos.json (committed, so type-checking never depends
 * on having run this). Runs before dev and build, and skips work that is
 * already done, so it costs nothing after the first run.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'assets/photos';
const OUT = 'public/images';
const MANIFEST = 'src/generated/photos.json';
/** The widths a photo can be served at. The browser picks one with srcset. */
const WIDTHS = [160, 320, 640, 960, 1440];

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

const manifest = {};
const files = fs.readdirSync(SRC).filter((f) => /\.(webp|jpe?g|png)$/i.test(f)).sort();

for (const file of files) {
  const id = path.parse(file).name;
  const input = path.join(SRC, file);
  const { width, height } = await sharp(input).metadata();
  // Never upscale: a 640px source is served at 160, 320 and 640 only.
  const widths = WIDTHS.filter((w) => w <= width);
  if (!widths.includes(width) && width < WIDTHS.at(-1)) widths.push(width);

  for (const w of widths) {
    for (const [format, options] of [
      ['avif', { quality: 50, effort: 2 }],
      ['webp', { quality: 72, effort: 5 }],
    ]) {
      const out = path.join(OUT, `${id}-${w}.${format}`);
      if (fs.existsSync(out)) continue;
      await sharp(input).resize({ width: w }).toFormat(format, options).toFile(out);
    }
  }

  // A 16px-wide blur, inlined as the image background while the real one loads.
  const blur = await sharp(input).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  manifest[id] = {
    w: width,
    h: height,
    widths,
    blur: `data:image/webp;base64,${blur.toString('base64')}`,
  };
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`optimize-images: ${files.length} photos, ${WIDTHS.length} sizes max, avif + webp`);
