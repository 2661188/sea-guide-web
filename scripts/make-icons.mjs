// Draws the Bahrna app icon and splash screen source images into ./assets.
// `npx @capacitor/assets generate --android` then makes every Android size from them.
// (Kept as code, not images, so the brand mark lives in one place and is easy to change.)
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const NAVY = '#06283D', NIGHT = '#041B2A';
// The mark (same as the website icon), drawn in a 64-unit box; its visual centre is (32, 34.5).
const mark = `
  <path d="M8 38c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5" stroke="#7FD4D0" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M8 48c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5" stroke="#e0f2fe" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="44" cy="24" r="5" fill="#FF6B35"/>`;
const svg = (size, bg, scale) => {
  const k = (scale * size) / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  <g transform="translate(${size / 2 - 32 * k},${size / 2 - 34.5 * k}) scale(${k})">${mark}</g></svg>`;
};
const files = {
  'icon-only.png': svg(1024, NAVY, 0.82),
  'icon-foreground.png': svg(1024, '', 0.74),
  'icon-background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${NAVY}"/></svg>`,
  'splash.png': svg(2732, NAVY, 0.22),
  'splash-dark.png': svg(2732, NIGHT, 0.22),
};
mkdirSync('assets', { recursive: true });
for (const [name, s] of Object.entries(files)) {
  await sharp(Buffer.from(s)).png().toFile(`assets/${name}`);
  console.log('assets/' + name);
}
