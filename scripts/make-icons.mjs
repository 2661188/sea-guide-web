// Draws the Bahrna app icon and splash screen source images into ./assets.
// `npx @capacitor/assets generate --android` then makes every Android size from them.
// (Kept as code, not images, so the brand mark lives in one place and is easy to change.)
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const NAVY = '#06283D', NIGHT = '#041B2A', TOP = '#0D5C75', BOTTOM = '#05253A';
// The mark: a Gulf dhow over a wave (same shapes as lib/brand.ts), drawn in a 512-unit box.
// Its visual centre is (258, 266).
const mark = `
  <line x1="150" y1="250" x2="380" y2="110" stroke="#E9C46A" stroke-width="10" stroke-linecap="round"/>
  <path d="M156 246 L 376 114 C 372 200 352 270 318 318 L 200 318 C 190 290 172 266 156 246 Z" fill="#FFFFFF"/>
  <line x1="262" y1="182" x2="262" y2="330" stroke="#E9C46A" stroke-width="8" stroke-linecap="round"/>
  <path d="M118 312 C 150 330 360 330 404 300 L 392 336 C 372 372 330 386 280 386 L 210 386 C 170 386 136 360 118 312 Z" fill="#E9C46A"/>
  <path d="M112 420 c22 0 22-13 44-13 s22 13 44 13 22-13 44-13 22 13 44 13 22-13 44-13 22 13 44 13" stroke="#7FD4D0" stroke-width="10" fill="none" stroke-linecap="round"/>`;
const grad = (size) => `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${TOP}"/><stop offset="1" stop-color="${BOTTOM}"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#b)"/>`;
// scale = share of the canvas the 512-unit box takes.
export const svg = (size, bg, scale) => {
  const k = (scale * size) / 512;
  const back = bg === 'grad' ? grad(size) : bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${back}
  <g transform="translate(${size / 2 - 258 * k},${size / 2 - 266 * k}) scale(${k})">${mark}</g></svg>`;
};
const files = {
  'icon-only.png': svg(1024, 'grad', 1.0),
  'icon-foreground.png': svg(1024, '', 0.72), // inside the adaptive-icon safe circle
  'icon-background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${grad(1024)}</svg>`,
  'splash.png': svg(2732, NAVY, 0.26),
  'splash-dark.png': svg(2732, NIGHT, 0.26),
};
mkdirSync('assets', { recursive: true });
for (const [name, s] of Object.entries(files)) {
  await sharp(Buffer.from(s)).png().toFile(`assets/${name}`);
  console.log('assets/' + name);
}
