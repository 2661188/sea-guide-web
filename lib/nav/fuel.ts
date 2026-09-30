// Optional fuel tracking. Everything here is an ESTIMATE from the boat profile
// (fuel use at cruise) and the recorded moving time — never a measurement.
import { load, save } from '@/lib/storage';
import { getNav, NavSettings, setNav } from './settings';

export interface FuelEntry { id: string; at: number; litres: number; kind: 'refuel' | 'level' | 'trip'; note?: string }

const KEY = 'fuelLog';
export const fuelLog = (): FuelEntry[] => load<FuelEntry[]>(KEY, []);
function add(e: Omit<FuelEntry, 'id'>) {
  const list = [{ ...e, id: `${e.at.toString(36)}${Math.random().toString(36).slice(2, 5)}` }, ...fuelLog()].slice(0, 200);
  save(KEY, list);
}

/** Set the fuel level (e.g. after reading the gauge). */
export function setFuelLevel(litres: number) {
  const tank = getNav().tankL;
  const v = Math.max(0, tank ? Math.min(tank, litres) : litres);
  setNav({ fuelL: v, fuelAt: Date.now() });
  add({ at: Date.now(), litres: v, kind: 'level' });
}
/** Add fuel. `litres` null = filled to the tank size. */
export function refuel(litres: number | null) {
  const s = getNav();
  const now = s.fuelL ?? 0;
  const next = litres == null ? s.tankL ?? now : now + litres;
  const v = s.tankL ? Math.min(s.tankL, next) : next;
  setNav({ fuelL: v, fuelAt: Date.now() });
  add({ at: Date.now(), litres: litres ?? Math.max(0, v - now), kind: 'refuel' });
}
/** Take a trip's estimated use off the level (user confirms on the trip summary). */
export function deductTripFuel(litres: number, note?: string) {
  const s = getNav();
  if (s.fuelL == null) return;
  setNav({ fuelL: Math.max(0, s.fuelL - litres), fuelAt: Date.now() });
  add({ at: Date.now(), litres: -litres, kind: 'trip', note });
}

/** Estimated range from a fuel amount, keeping 20% in reserve. */
export function rangeNm(fuelL: number | null, s: Pick<NavSettings, 'burnLph' | 'cruiseKn'>): number | null {
  if (fuelL == null || !s.burnLph || !s.cruiseKn) return null;
  return (fuelL / s.burnLph) * s.cruiseKn * 0.8;
}
