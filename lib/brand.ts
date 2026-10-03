// Bahrna brand mark: a Gulf dhow (slanted lateen sail, raised-stern hull) over a wave.
// Drawn in a 512-unit box; the same shapes are copied in scripts/make-icons.mjs for the
// Android icons and in public/icon-*.png. Keep them in sync when changing the mark.
export const BRAND_TOP = '#0D5C75';
export const BRAND_BOTTOM = '#05253A';
export const DHOW_MARK =
  '<line x1="150" y1="250" x2="380" y2="110" stroke="#E9C46A" stroke-width="10" stroke-linecap="round"/>' +
  '<path d="M156 246 L 376 114 C 372 200 352 270 318 318 L 200 318 C 190 290 172 266 156 246 Z" fill="#FFFFFF"/>' +
  '<line x1="262" y1="182" x2="262" y2="330" stroke="#E9C46A" stroke-width="8" stroke-linecap="round"/>' +
  '<path d="M118 312 C 150 330 360 330 404 300 L 392 336 C 372 372 330 386 280 386 L 210 386 C 170 386 136 360 118 312 Z" fill="#E9C46A"/>' +
  '<path d="M112 420 c22 0 22-13 44-13 s22 13 44 13 22-13 44-13 22 13 44 13 22-13 44-13 22 13 44 13" stroke="#7FD4D0" stroke-width="10" fill="none" stroke-linecap="round"/>';

/** Full icon as SVG text (rounded square, gradient background). */
export const brandIconSvg = (radius = 112) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BRAND_TOP}"/><stop offset="1" stop-color="${BRAND_BOTTOM}"/></linearGradient></defs><rect width="512" height="512" rx="${radius}" fill="url(#b)"/>${DHOW_MARK}</svg>`;
