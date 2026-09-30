// Optional boat maintenance log with due dates. Stays on the phone. Bahrna only tracks
// dates and intervals the owner enters — it gives no mechanical instructions.
import { useEffect, useState } from 'react';
import { load, save } from '@/lib/storage';
import { cancelNotify, notify, notifyId } from '@/lib/native/notify';

export type MaintKind = 'engine_oil' | 'gear_oil' | 'impeller' | 'battery' | 'spark_plugs' | 'fuel_filter' | 'trailer' | 'registration' | 'insurance' | 'service' | 'other';
export const MAINT_KINDS: MaintKind[] = ['engine_oil', 'gear_oil', 'impeller', 'battery', 'spark_plugs', 'fuel_filter', 'trailer', 'registration', 'insurance', 'service', 'other'];
/** Common intervals in months, only as a starting suggestion — follow your engine manual. */
export const DEFAULT_MONTHS: Record<MaintKind, number> = {
  engine_oil: 12, gear_oil: 12, impeller: 24, battery: 36, spark_plugs: 24, fuel_filter: 12, trailer: 12, registration: 12, insurance: 12, service: 12, other: 12,
};

export interface MaintItem {
  id: string;
  kind: MaintKind;
  label: string; // custom name (for 'other') or ''
  lastDate: string; // YYYY-MM-DD, last done
  months: number; // interval
  notes: string;
  remind: boolean;
}

const KEY = 'maint';
let items: MaintItem[] | null = null;
const subs = new Set<(l: MaintItem[]) => void>();
const all = () => (items ??= load<MaintItem[]>(KEY, []));
function commit(l: MaintItem[]) { items = l; save(KEY, l); subs.forEach((f) => f(l)); }

export function dueDate(m: MaintItem): Date {
  const d = new Date(`${m.lastDate}T09:00:00`);
  d.setMonth(d.getMonth() + m.months);
  return d;
}
export type DueState = 'ok' | 'soon' | 'overdue';
export function dueState(m: MaintItem, now = Date.now()): DueState {
  const ms = dueDate(m).getTime() - now;
  return ms < 0 ? 'overdue' : ms < 30 * 864e5 ? 'soon' : 'ok';
}

async function schedule(m: MaintItem, title: string) {
  const id = notifyId(`maint:${m.id}`);
  await cancelNotify(id);
  if (!m.remind) return;
  const at = dueDate(m);
  at.setDate(at.getDate() - 7); // a week before
  if (at.getTime() > Date.now()) await notify(id, title, m.label || '', 'reminder', at);
}

export function upsertMaint(m: MaintItem, reminderTitle: string) {
  const l = all().filter((x) => x.id !== m.id);
  commit([m, ...l].sort((a, b) => dueDate(a).getTime() - dueDate(b).getTime()));
  schedule(m, reminderTitle);
}
export function removeMaint(id: string) {
  commit(all().filter((x) => x.id !== id));
  cancelNotify(notifyId(`maint:${id}`));
}
export const maintDueCount = () => all().filter((m) => dueState(m) !== 'ok').length;

export function useMaint(): MaintItem[] {
  const [l, setL] = useState<MaintItem[]>([]);
  useEffect(() => { setL(all()); subs.add(setL); return () => { subs.delete(setL); }; }, []);
  return l;
}
