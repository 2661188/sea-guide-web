// Boat profile and navigation preferences, kept on this phone.
import { useEffect, useState } from 'react';
import { load, save } from '@/lib/storage';

export type MapLayer = 'map' | 'sat' | 'depth' | 'offline';

export interface NavSettings {
  boatName: string;
  boatType: 'speedboat' | 'fishing' | 'yacht' | 'sail' | 'jetski' | 'kayak' | 'other';
  lengthFt: number | null;
  cruiseKn: number; // used for route times when you are not moving
  burnLph: number | null; // fuel burn at cruise, litres per hour
  tankL: number | null;
  arriveNm: number; // arrival radius
  xteNm: number; // off-course alarm limit
  sound: boolean;
  layer: MapLayer;
  seamarks: boolean;
}

export const DEFAULT_NAV: NavSettings = {
  boatName: '', boatType: 'speedboat', lengthFt: null, cruiseKn: 18, burnLph: null, tankL: null,
  arriveNm: 0.05, xteNm: 0.1, sound: true, layer: 'map', seamarks: true,
};

let cur: NavSettings | null = null;
const subs = new Set<(s: NavSettings) => void>();

export function getNav(): NavSettings {
  if (!cur) cur = { ...DEFAULT_NAV, ...load<Partial<NavSettings>>('nav', {}) };
  return cur;
}

export function setNav(patch: Partial<NavSettings>) {
  cur = { ...getNav(), ...patch };
  save('nav', cur);
  subs.forEach((f) => f(cur!));
}

export function useNavSettings(): [NavSettings, (p: Partial<NavSettings>) => void] {
  const [s, setS] = useState<NavSettings>(DEFAULT_NAV);
  useEffect(() => {
    setS(getNav());
    subs.add(setS);
    return () => { subs.delete(setS); };
  }, []);
  return [s, setNav];
}

/** Time and fuel for a distance at the boat's cruise speed. */
export function legPlan(nm: number, s: NavSettings) {
  const h = s.cruiseKn > 0 ? nm / s.cruiseKn : null;
  return { hours: h, fuelL: h != null && s.burnLph ? h * s.burnLph : null };
}

export const fmtHours = (h: number | null) => {
  if (h == null || !Number.isFinite(h)) return '—';
  const m = Math.round(h * 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
};
