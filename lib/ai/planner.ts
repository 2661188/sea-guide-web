// Trip planner: turns "fishing tomorrow morning for five hours" into a structured
// TripPlan using the saved forecast, fishing windows and the boat profile.
// Every number comes from data the app has; missing data is reported, never guessed.
import type { Conditions } from '@/lib/marine/types';
import { fishingHours, fishingWindows, seaSummary } from '@/lib/marine/assess';
import { findExtremes, hourIndex } from '@/lib/marine/tides';
import { nowLocalMs, toLocalMs, dayKey } from '@/lib/marine/time';
import { CHECKLISTS } from '@/lib/checklists';
import type { ActivityId } from '@/lib/marine/activities';
import { distanceNm } from '@/lib/nav/geo';
import { newId, PlanChecklistItem, TripPlan, Waypoint } from '@/lib/nav/db';
import type { BoatContext } from './context';

export interface PlanRequest {
  activity: string;
  day: number; // 0 today, 1 tomorrow…
  part: 'morning' | 'afternoon' | 'evening' | null;
  hours: number | null;
  destination?: Waypoint | null;
}

const PART_RANGE: Record<string, [number, number]> = { morning: [4, 11], afternoon: [12, 17], evening: [16, 21], any: [5, 18] };
const DEFAULT_DEPART: Record<string, number> = { morning: 6, afternoon: 14, evening: 16, any: 7 };
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (localMs: number) => new Date(localMs).toISOString().slice(11, 16);
const ACT_NAMES: Record<string, { en: string; ar: string }> = {
  fishing: { en: 'Fishing', ar: 'صيد' }, boating: { en: 'Boat trip', ar: 'طلعة بحر' }, diving: { en: 'Diving', ar: 'غوص' },
  jetski: { en: 'Jet ski', ar: 'جت سكي' }, kayak: { en: 'Kayak', ar: 'كاياك' }, sailing: { en: 'Sailing', ar: 'إبحار شراعي' }, swimming: { en: 'Swimming', ar: 'سباحة' },
};
export const activityName = (a: string, lang: 'en' | 'ar') => (ACT_NAMES[a] ?? ACT_NAMES.boating)[lang];

export function buildChecklist(activity: string): PlanChecklistItem[] {
  const act = (activity in CHECKLISTS ? activity : 'boating') as ActivityId;
  const src = CHECKLISTS[act];
  const pick = ['fuel', 'forecast', 'told', 'lifejackets', 'lifejacket', 'vhf', 'engine', 'water', 'phone', 'firstaid', 'anchor'];
  const items: PlanChecklistItem[] = pick.filter((k) => src[k] || CHECKLISTS.boating[k]).slice(0, 7)
    .map((k) => { const v = src[k] ?? CHECKLISTS.boating[k]; return { id: k, en: v.en, ar: v.ar, done: false }; });
  if (activity === 'fishing') items.push({ id: 'gear', en: 'Fishing gear, bait and ice box', ar: 'عدة الصيد والطعم وصندوق الثلج', done: false });
  if (activity === 'diving') items.push({ id: 'divegear', en: 'Dive gear checked and dive flag', ar: 'فحص معدات الغوص وعلم الغوص', done: false });
  return items;
}

export function planTrip(req: PlanRequest, c: Conditions | null, boat: BoatContext, from: { lat: number; lon: number; label: string }): TripPlan {
  const hours = req.hours && req.hours > 0 && req.hours <= 24 ? req.hours : req.activity === 'fishing' ? 4 : 3;
  const part = req.part ?? (req.activity === 'fishing' ? 'morning' : 'any');
  const [lo, hi] = PART_RANGE[part];
  let date: string, depart: string, conditions: TripPlan['conditions'] = null;

  if (c) {
    const now = nowLocalMs(c.utcOffsetSeconds);
    date = dayKey(now + req.day * 86400e3);
    let departMs = Date.parse(`${date}T${pad(DEFAULT_DEPART[part])}:00:00Z`);
    // Morning trips: leave around sunrise if the forecast has it.
    const sr = c.daily.date.indexOf(date);
    if (part === 'morning' && sr >= 0 && c.daily.sunrise[sr]) departMs = toLocalMs(c.daily.sunrise[sr]) - 30 * 60e3;
    let score: number | null = null;
    if (req.activity === 'fishing') {
      const wins = fishingWindows(c, fishingHours(c), date, req.day === 0 ? now : 0, 3)
        .filter((w) => { const h = new Date(w.start).getUTCHours(); return h >= lo && h <= hi; });
      const best = wins.sort((a, b) => b.score - a.score)[0];
      if (best) {
        // Leave ~45 min before the best window, but not more than an hour before sunrise.
        const sunriseMs = sr >= 0 && c.daily.sunrise[sr] ? toLocalMs(c.daily.sunrise[sr]) : null;
        departMs = best.start - 45 * 60e3;
        if (sunriseMs != null && departMs < sunriseMs - 60 * 60e3) departMs = sunriseMs - 60 * 60e3;
        score = best.score;
      }
    }
    departMs = Math.round(departMs / (15 * 60e3)) * 15 * 60e3;
    if (req.day === 0 && departMs < now) departMs = Math.ceil((now + 15 * 60e3) / (15 * 60e3)) * 15 * 60e3;
    depart = hhmm(departMs);
    const i = hourIndex(c.hourly.time, departMs);
    const covered = toLocalMs(c.hourly.time[c.hourly.time.length - 1]) >= departMs + hours * 3600e3 && toLocalMs(c.hourly.time[0]) <= departMs;
    if (covered) {
      const sum = seaSummary(c, i, Math.ceil(hours));
      const endMs = departMs + hours * 3600e3;
      conditions = {
        level: sum.windMax == null ? null : sum.level,
        windMaxKn: sum.windMax, gustMaxKn: sum.gustMax, waveMaxM: sum.waveMax,
        tide: findExtremes(c.hourly.time, c.hourly.seaLevel).filter((e) => e.at >= departMs && e.at <= endMs)
          .map((e) => ({ type: e.type, at: e.at - c.utcOffsetSeconds * 1000, height: e.height })),
        fishingScore: score, source: c.source?.name ?? 'Open-Meteo', fetchedAt: c.fetchedAt,
      };
    }
  } else {
    const d = new Date(Date.now() + req.day * 86400e3);
    date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    depart = `${pad(DEFAULT_DEPART[part])}:00`;
  }

  const dest = req.destination ?? null;
  const distanceNmRt = dest ? distanceNm(from, dest) * 2 : null;
  const fuelPerHourL = boat.burnLph ?? null;
  const fuelL = distanceNmRt != null && boat.burnLph && boat.cruiseKn > 0 ? (distanceNmRt / boat.cruiseKn) * boat.burnLph : null;
  const now = Date.now();
  return {
    id: newId(),
    name: `${activityName(req.activity, 'en')} · ${date}`,
    activity: req.activity,
    date, departure: depart, durationH: hours,
    start: from,
    destination: dest ? { lat: dest.lat, lon: dest.lon, name: dest.name, wpId: dest.id } : null,
    waypoints: dest ? [{ lat: from.lat, lon: from.lon, name: from.label }, { lat: dest.lat, lon: dest.lon, name: dest.name, wpId: dest.id }] : [],
    distanceNm: distanceNmRt,
    fuelL,
    fuelCarryL: fuelL != null ? fuelL * 1.5 : null, // one third kept in reserve
    fuelPerHourL,
    conditions,
    checklist: buildChecklist(req.activity),
    notes: '',
    createdBy: 'ai',
    modified: false,
    createdAt: now,
    updatedAt: now,
  };
}
