// GPS inside the Android app. Uses the background-geolocation plugin so that, while a
// trip is recording (or route guidance / anchor alarm is on), Android keeps GPS running
// with the screen off through a visible "Bahrna is using your location" notification
// (a foreground service). Outside those times it only listens while the app is open.
// This is "while using the app" location: no "Allow all the time" permission is asked.

export interface NativeFix { lat: number; lon: number; acc: number; t: number; speed: number | null; heading: number | null }
export type NativeGpsError = 'denied' | 'unavailable';

interface BgLocation { latitude: number; longitude: number; accuracy: number; speed: number | null; bearing: number | null; time: number | null }
interface BgPlugin {
  addWatcher(o: { backgroundMessage?: string; backgroundTitle?: string; requestPermissions?: boolean; stale?: boolean; distanceFilter?: number },
    cb: (loc?: BgLocation, err?: { code?: string; message?: string }) => void): Promise<string>;
  removeWatcher(o: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

let plugin: BgPlugin | null = null;
async function bg(): Promise<BgPlugin> {
  if (plugin) return plugin;
  const { registerPlugin } = await import('@capacitor/core');
  plugin = registerPlugin<BgPlugin>('BackgroundGeolocation');
  return plugin;
}

/** Start a watcher. Returns a function that stops it. */
export async function watchNative(
  background: boolean,
  lang: 'en' | 'ar',
  onFix: (f: NativeFix) => void,
  onError: (e: NativeGpsError) => void,
): Promise<() => void> {
  const p = await bg();
  const opts = background
    ? {
        backgroundTitle: lang === 'ar' ? 'بحرنا يستخدم موقعك' : 'Bahrna is using your location',
        backgroundMessage: lang === 'ar' ? 'تسجيل الرحلة والملاحة شغالين. افتح التطبيق لإيقافها.' : 'Trip recording / navigation is on. Open the app to stop it.',
        requestPermissions: true, stale: false, distanceFilter: 0,
      }
    : { requestPermissions: true, stale: false, distanceFilter: 0 };
  const id = await p.addWatcher(opts, (loc, err) => {
    if (err) { onError(err.code === 'NOT_AUTHORIZED' ? 'denied' : 'unavailable'); return; }
    if (!loc) return;
    onFix({
      lat: loc.latitude, lon: loc.longitude, acc: loc.accuracy,
      t: loc.time || Date.now(), speed: loc.speed ?? null, heading: loc.bearing ?? null,
    });
  });
  let stopped = false;
  return () => { if (stopped) return; stopped = true; p.removeWatcher({ id }).catch(() => { /* already gone */ }); };
}

export async function openLocationSettings() { try { await (await bg()).openSettings(); } catch { /* ignore */ } }

// ---- screen on ----
export async function nativeKeepAwake(on: boolean) {
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    if (on) await KeepAwake.keepAwake(); else await KeepAwake.allowSleep();
  } catch { /* not critical */ }
}
