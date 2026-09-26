import { useGuide } from '@/lib/nav/guide';
import { AlarmBanner } from './Guidance';

/** Shows navigation and anchor alarms on every screen, not only on Navigate. */
export function GlobalAlarm() {
  const g = useGuide();
  return g.alarm ? <AlarmBanner alarm={g.alarm} /> : null;
}
