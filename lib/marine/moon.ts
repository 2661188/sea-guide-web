// Moon phase — CALCULATED astronomically (no API needed, works offline).
// Mean synodic month from a reference new moon (2000-01-06 18:14 UTC).
// Accurate to within about a day; phase names are for guidance.

import type { Key } from '../i18n/strings';

const SYNODIC = 29.530588853;
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

export interface MoonInfo {
  fraction: number; // 0 = new, 0.5 = full
  ageDays: number;
  illumination: number; // 0..1
  name: Key;
  waxing: boolean;
}

/** `utcMs` is a real UTC timestamp. */
export function moonAt(utcMs: number): MoonInfo {
  const age = (((utcMs - REF_NEW_MOON_MS) / 864e5) % SYNODIC + SYNODIC) % SYNODIC;
  const f = age / SYNODIC;
  const illumination = (1 - Math.cos(2 * Math.PI * f)) / 2;
  const names: [number, Key][] = [
    [0.0339, 'moon_new'], [0.2161, 'moon_wax_cres'], [0.2839, 'moon_first'], [0.4661, 'moon_wax_gib'],
    [0.5339, 'moon_full'], [0.7161, 'moon_wan_gib'], [0.7839, 'moon_last'], [0.9661, 'moon_wan_cres'], [1.01, 'moon_new'],
  ];
  const name = names.find(([lim]) => f < lim)![1];
  return { fraction: f, ageDays: age, illumination, name, waxing: f < 0.5 };
}

/** Days from `utcMs` to the next new and full moon. */
export function nextMajorPhases(utcMs: number) {
  const { ageDays } = moonAt(utcMs);
  const toFull = (SYNODIC / 2 - ageDays + SYNODIC) % SYNODIC;
  const toNew = (SYNODIC - ageDays) % SYNODIC;
  return { toFullDays: toFull, toNewDays: toNew };
}
