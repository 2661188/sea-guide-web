// After-trip extras shared by the "Trip complete" sheet and the trip detail page:
// plain-language summary from the recorded track, notes, fuel estimate (with an
// explicit "take it off my fuel level" button) and share. All local; nothing uploaded.
import { useEffect, useMemo, useState } from 'react';
import { Fuel, Share2 } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import { useSpot } from '@/lib/SpotContext';
import { useConditions } from '@/lib/useConditions';
import { notifyNavData, putTrip, TrackPoint, Trip, tripPoints } from '@/lib/nav/db';
import { analyseTrack, TripAnalysis, tripSummaryText } from '@/lib/nav/tripstats';
import { tideStageAt } from '@/lib/marine/snapshot';
import { useNavSettings } from '@/lib/nav/settings';
import { deductTripFuel } from '@/lib/nav/fuel';
import { distUnit, fmtDist, fmtDuration } from '@/lib/nav/geo';

/** Loads the track once and returns the analysis (null until loaded / no points). */
export function useTripAnalysis(trip: Trip | null, points?: TrackPoint[]): TripAnalysis | null {
  const [nav] = useNavSettings();
  const [pts, setPts] = useState<TrackPoint[] | null>(points ?? null);
  useEffect(() => { if (points) { setPts(points); return; } if (trip) tripPoints(trip.id).then(setPts).catch(() => setPts([])); }, [trip, points]);
  return useMemo(() => (pts && pts.length > 1 ? analyseTrack(pts, nav.burnLph) : null), [pts, nav.burnLph]);
}

export function TripExtras({ trip, an, onChange }: { trip: Trip; an: TripAnalysis | null; onChange?: (t: Trip) => void }) {
  const { t, lang } = useT();
  const { spot } = useSpot();
  const { data } = useConditions(spot.id);
  const [nav] = useNavSettings();
  const [notes, setNotes] = useState(trip.notes ?? '');
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const summary = useMemo(() => tripSummaryText(trip, an, lang,
    data ? (ms) => tideStageAt(data, ms + data.utcOffsetSeconds * 1000) : undefined), [trip, an, lang, data]);
  const fuelEst = an?.fuelL ?? null;
  const deducted = trip.fuelUsedL != null;

  const persist = async (patch: Partial<Trip>) => {
    const next = { ...trip, ...patch };
    await putTrip(next).catch(() => {});
    notifyNavData();
    onChange?.(next);
    return next;
  };
  const saveNotes = async () => { await persist({ notes: notes.trim() }); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const deduct = async () => {
    if (fuelEst == null || deducted) return;
    deductTripFuel(fuelEst, trip.name);
    await persist({ fuelUsedL: Math.round(fuelEst * 10) / 10 });
    setMsg(t('te_fuel_done', { l: Math.round(fuelEst) }));
  };
  const share = async () => {
    // Text only — no coordinates, so sharing a trip never reveals where you fished.
    const text = `${trip.name}\n${fmtDist(trip.distanceNm)} ${distUnit(trip.distanceNm)} · ${fmtDuration((trip.endedAt ?? Date.now()) - trip.startedAt)}\n${summary}\n— ${t('app_name')}`;
    try {
      if (navigator.share) { await navigator.share({ title: trip.name, text }); return; }
      await navigator.clipboard.writeText(text);
      setMsg(t('te_copied'));
    } catch { /* user cancelled */ }
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="rounded-2xl bg-lagoon/5 p-3 leading-relaxed dark:bg-white/5">{summary}</p>
      {fuelEst != null && (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
          <span className="flex items-center gap-2"><Fuel size={16} /> {t('te_fuel_est', { l: Math.round(fuelEst) })}</span>
          {nav.fuelL != null && !deducted && <button onClick={deduct} className="tap h-10 shrink-0 rounded-xl bg-lagoon px-3 text-xs font-bold text-white">{t('te_fuel_deduct')}</button>}
          {deducted && <span className="muted text-xs">{t('te_fuel_deducted')}</span>}
        </div>
      )}
      <label className="block font-medium">{t('notes')}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3} maxLength={1000} placeholder={t('te_notes_ph')}
          className="mt-1 w-full rounded-xl border-0 bg-slate-100 p-3 text-base dark:bg-white/10" />
      </label>
      {saved && <p className="text-xs font-semibold text-good">{t('te_saved')}</p>}
      {msg && <p className="text-xs font-semibold text-lagoon dark:text-shallows">{msg}</p>}
      <button onClick={share} className="tap inline-flex h-11 items-center gap-2 rounded-full bg-slate-100 px-4 font-semibold dark:bg-white/10"><Share2 size={15} /> {t('te_share')}</button>
      <p className="muted text-[11px]">{t('te_share_note')}</p>
    </div>
  );
}
