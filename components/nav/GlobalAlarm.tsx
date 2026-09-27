import { useEffect } from 'react';
import { useGuide, getGuide } from '@/lib/nav/guide';
import { initTracker } from '@/lib/nav/tracker';
import { AlarmBanner } from './Guidance';

/**
 * Mounted once in _app. Resumes an active trip and route guidance on ANY page after a
 * refresh or restart (not only on Navigate), and shows alarms on every screen.
 */
export function GlobalAlarm() {
  const g = useGuide();
  useEffect(() => { initTracker(); getGuide(); }, []);
  return g.alarm ? <AlarmBanner alarm={g.alarm} /> : null;
}
