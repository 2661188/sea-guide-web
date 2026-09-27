/** @type {import('next').NextConfig} */
// BUILD_TARGET=app builds the static pages that are bundled inside the Android app
// (see scripts/build-app.mjs). The website on Vercel is the normal server build.
const app = process.env.BUILD_TARGET === 'app';
module.exports = app
  ? { reactStrictMode: true, output: 'export', distDir: 'out', images: { unoptimized: true } }
  : { reactStrictMode: true };
