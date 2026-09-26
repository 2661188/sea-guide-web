// Light / dark / follow-the-phone appearance. The class on <html> drives Tailwind's
// dark: styles; _document applies it before first paint so there is no flash.
import { load, save } from './storage';

export type ThemePref = 'auto' | 'light' | 'dark';

export function applyTheme(pref: ThemePref) {
  if (typeof window === 'undefined') return;
  const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export const getTheme = (): ThemePref => load<ThemePref>('theme', 'auto');

export function setTheme(pref: ThemePref) {
  save('theme', pref);
  applyTheme(pref);
}

/** Keep "auto" in step with the phone's setting while the app is open. */
export function watchSystemTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const on = () => { if (getTheme() === 'auto') applyTheme('auto'); };
  mq.addEventListener?.('change', on);
  return () => mq.removeEventListener?.('change', on);
}
