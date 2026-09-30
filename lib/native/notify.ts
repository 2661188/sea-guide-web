// Notifications for safety alarms (anchor drag, off course, arrival) and reminders.
// Android app: native local notifications (work with the screen off, alongside the
// location notification). Website: the browser's Notification API, shown only when the
// page is hidden (the in-app banner and sound cover the visible case).
// Nothing is sent to a server; all notifications are created on the phone.
import { isNative } from './platform';

type LN = typeof import('@capacitor/local-notifications').LocalNotifications;
let ln: LN | null = null;
let channelReady = false;
async function plugin(): Promise<LN> {
  if (ln) return ln;
  ln = (await import('@capacitor/local-notifications')).LocalNotifications;
  return ln;
}

const ALARM_CHANNEL = 'bahrna-alarms';
const REMIND_CHANNEL = 'bahrna-reminders';

async function ensureChannels(p: LN) {
  if (channelReady) return;
  try {
    await p.createChannel({ id: ALARM_CHANNEL, name: 'Safety alarms', description: 'Anchor drag, off course, arrival', importance: 5, visibility: 1, vibration: true });
    await p.createChannel({ id: REMIND_CHANNEL, name: 'Reminders', description: 'Boat maintenance and trip reminders', importance: 3, visibility: 1 });
    channelReady = true;
  } catch { /* older Android: channels not needed */ }
}

/** Ask once, from a user action (setting the anchor alarm, starting guidance, adding a reminder). */
export async function requestNotifyPermission(): Promise<boolean> {
  try {
    if (isNative()) {
      const p = await plugin();
      let s = await p.checkPermissions();
      if (s.display !== 'granted') s = await p.requestPermissions();
      if (s.display === 'granted') await ensureChannels(p);
      return s.display === 'granted';
    }
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  } catch { return false; }
}

export type NotifyKind = 'alarm' | 'reminder';

/** Show now (alarm) or at a time (reminder). Returns false when not permitted/available. */
export async function notify(id: number, title: string, body: string, kind: NotifyKind = 'alarm', at?: Date): Promise<boolean> {
  try {
    if (isNative()) {
      const p = await plugin();
      if ((await p.checkPermissions()).display !== 'granted') return false;
      await ensureChannels(p);
      await p.schedule({ notifications: [{
        id, title, body,
        channelId: kind === 'alarm' ? ALARM_CHANNEL : REMIND_CHANNEL,
        schedule: at ? { at, allowWhileIdle: true } : undefined,
        ongoing: false, autoCancel: true,
        isExactNotification: false, // reminders don't need exact alarms (no SCHEDULE_EXACT_ALARM permission)
      }] });
      return true;
    }
    if (at) return false; // the website cannot schedule future notifications
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') return false; // banner is on screen
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) await reg.showNotification(title, { body, tag: `bahrna-${id}`, requireInteraction: kind === 'alarm' } as NotificationOptions);
    else new Notification(title, { body, tag: `bahrna-${id}` });
    return true;
  } catch { return false; }
}

export async function cancelNotify(id: number) {
  try { if (isNative()) await (await plugin()).cancel({ notifications: [{ id }] }); } catch { /* ignore */ }
}

/** Stable numeric id from a string (Android needs 32-bit ints). */
export const notifyId = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 2_000_000_000; };
