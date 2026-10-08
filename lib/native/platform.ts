// Android / iPhone app (Capacitor) vs web browser.
// The same code runs in both. In the Android app the pages are bundled inside the
// APK (they work with no internet), and the few server calls go to the live site.
// Native plugins are loaded only inside the app, so the website never downloads them.

type CapWindow = { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  try { return !!(window as unknown as CapWindow).Capacitor?.isNativePlatform?.(); } catch { return false; }
}

export const isAndroidApp = () => isNative() && (window as unknown as CapWindow).Capacitor?.getPlatform?.() === 'android';
export const isIOSApp = () => isNative() && (window as unknown as CapWindow).Capacitor?.getPlatform?.() === 'ios';

/** Server base for API calls: empty on the website (same origin), the live site inside the app. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');
export const apiUrl = (path: string) => `${API_BASE}${path}`;
