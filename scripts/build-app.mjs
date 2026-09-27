// Builds the web pages bundled inside the Android app into ./out.
// API routes cannot be part of a static export, so they are moved aside for the
// build (the app calls the live site's API instead: NEXT_PUBLIC_API_BASE).
import { execSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';

const API = 'pages/api', AWAY = '.api-build-aside';
const env = { ...process.env, BUILD_TARGET: 'app', NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'https://bahrna.vercel.app' };
if (existsSync(AWAY)) renameSync(AWAY, API); // restore after an interrupted build
renameSync(API, AWAY);
try {
  execSync('npx next build', { stdio: 'inherit', env });
} finally {
  renameSync(AWAY, API);
}
if (!existsSync('out/index.html')) { console.error('Static export failed: out/index.html missing'); process.exit(1); }
console.log('App pages ready in ./out (API: ' + env.NEXT_PUBLIC_API_BASE + ')');
