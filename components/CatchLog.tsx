// Private catch log. Everything stays on the phone; location is stored only as precisely
// as the user chooses (exact, ~5 km area, or not at all). Nothing is published.
import { useEffect, useMemo, useState } from 'react';
import { Camera, EyeOff, Fish, MapPin, Plus, Trash2 } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { allCatches, Catch, deleteCatch, newId, notifyNavData, onNavData, putCatch } from '@/lib/nav/db';
import { getTracker, holdGps, startGps, releaseGps } from '@/lib/nav/tracker';
import { load, save } from '@/lib/storage';
import { useSpot } from '@/lib/SpotContext';
import { useConditions } from '@/lib/useConditions';
import { snapshotAt } from '@/lib/marine/snapshot';
import { shrinkPhoto } from '@/lib/photo';
import { fmtLat, fmtLon } from '@/lib/nav/geo';
import { Sheet } from './Sheet';

const SPECIES: [string, string][] = [
  ['Hamour', 'هامور'], ['Kingfish (Kanaad)', 'كنعد'], ['Sheri', 'شعري'], ['Safi', 'صافي'], ['Trevally (Jesh)', 'جش'],
  ['Barracuda', 'باراكودا'], ['Tuna', 'تونة'], ['Cobia', 'الكوبيا'], ['Queenfish', 'سمكة الملكة'],
];
const TECH: Key[] = ['tq_trolling', 'tq_jigging', 'tq_bottom', 'tq_casting', 'tq_popping', 'tq_drifting'];
export const AREA_DEG = 0.05; // ~5 km

function useCatches() {
  const [l, setL] = useState<Catch[] | null>(null);
  useEffect(() => { const f = () => allCatches().then(setL).catch(() => setL([])); f(); return onNavData(f); }, []);
  return l;
}

function Photo({ blob, className }: { blob: Blob; className: string }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} />;
}

export function CatchLog({ tripId = null, compact = false }: { tripId?: string | null; compact?: boolean }) {
  const { t, lang } = useT();
  const all = useCatches();
  const [edit, setEdit] = useState<Catch | null>(null);
  const list = all?.filter((c) => (tripId ? c.tripId === tripId : true)) ?? null;
  const fmt = (ms: number) => new Date(ms).toLocaleString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const total = list?.reduce((s, c) => s + c.count, 0) ?? 0;
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold"><Fish size={18} className="text-lagoon dark:text-shallows" /> {t('ct_title')}{list && list.length > 0 && <span className="muted text-xs font-normal">· {t('ct_total', { n: total })}</span>}</p>
        {!tripId && <button onClick={() => setEdit(blankCatch())} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-abyss px-4 text-sm font-bold text-white"><Plus size={16} /> {t('ct_add')}</button>}
      </div>
      {list && list.length === 0 && <p className="muted mt-2 text-sm">{t(tripId ? 'ct_none_trip' : 'ct_empty')}</p>}
      <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
        {(list ?? []).slice(0, compact ? 3 : 200).map((c) => (
          <li key={c.id}>
            <button onClick={() => setEdit(c)} className="tap flex w-full items-center gap-3 py-2.5 text-start">
              {c.photo ? <Photo blob={c.photo} className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lagoon/10 text-lagoon dark:text-shallows"><Fish size={20} /></span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.species || t('ct_unknown')}{c.count > 1 ? ` ×${c.count}` : ''}{c.released ? ` · ${t('ct_released')}` : ''}</span>
                <span className="muted block truncate text-xs">{fmt(c.at)}{c.bait ? ` · ${c.bait}` : ''}{c.conditions?.tide ? ` · ${t(`ct_tide_${c.conditions.tide}` as Key)}` : ''}</span>
              </span>
              {c.privacy === 'hidden' ? <EyeOff size={15} className="shrink-0 text-slate-400" /> : <MapPin size={15} className={`shrink-0 ${c.privacy === 'exact' ? 'text-lagoon' : 'text-slate-400'}`} />}
            </button>
          </li>
        ))}
      </ul>
      {!tripId && <p className="muted mt-2 text-[11px] leading-snug">{t('ct_private')}</p>}
      {edit && <CatchSheet item={edit} isNew={!all?.some((x) => x.id === edit.id)} onClose={() => setEdit(null)} />}
    </section>
  );
}

function blankCatch(): Catch {
  const tr = getTracker();
  const p = tr.pos && tr.gps !== 'lost' ? tr.pos : null;
  const privacy = load<Catch['privacy']>('catchPrivacy', 'area');
  return {
    id: newId(), at: Date.now(), species: '', count: 1, weightKg: null, lengthCm: null, bait: '', technique: '', depthM: null, notes: '',
    privacy, lat: p?.lat ?? null, lon: p?.lon ?? null, photo: null, tripId: tr.trip?.id ?? null, conditions: null, released: false,
  };
}

const num = (s: string) => { const v = parseFloat(s.replace(',', '.')); return Number.isFinite(v) && v >= 0 ? v : null; };
const localInput = (ms: number) => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60e3); return d.toISOString().slice(0, 16); };

function CatchSheet({ item, isNew, onClose }: { item: Catch; isNew: boolean; onClose: () => void }) {
  const { t, lang } = useT();
  const { spot } = useSpot();
  const cond = useConditions(spot.id);
  const [c, setC] = useState<Catch>(item);
  const [raw, setRaw] = useState({ w: item.weightKg?.toString() ?? '', l: item.lengthCm?.toString() ?? '', d: item.depthM?.toString() ?? '' });
  const [pos, setPos] = useState(item.lat != null ? { lat: item.lat, lon: item.lon! } : null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // New catch without a fix: use GPS briefly, only if location was allowed before.
  useEffect(() => {
    if (!isNew || pos || !load<boolean>('gpsAsked', false)) return;
    holdGps('catch', true); startGps();
    const iv = setInterval(() => { const tr = getTracker(); if (tr.pos && tr.gps !== 'lost') { setPos({ lat: tr.pos.lat, lon: tr.pos.lon }); clearInterval(iv); } }, 500);
    return () => { clearInterval(iv); holdGps('catch', false); if (location.pathname !== '/navigate') releaseGps(); };
  }, [isNew, pos]);

  const saveIt = async () => {
    setBusy(true);
    const round = (v: number) => Math.round(v / AREA_DEG) * AREA_DEG;
    const lat = c.privacy === 'hidden' || !pos ? null : c.privacy === 'area' ? round(pos.lat) : pos.lat;
    const lon = c.privacy === 'hidden' || !pos ? null : c.privacy === 'area' ? round(pos.lon) : pos.lon;
    const off = (cond.data?.utcOffsetSeconds ?? 14400) * 1000;
    const conditions = c.conditions ?? snapshotAt(cond.data, c.at + off);
    save('catchPrivacy', c.privacy); // remember the chosen precision for next time
    await putCatch({ ...c, lat, lon, conditions, weightKg: num(raw.w), lengthCm: num(raw.l), depthM: num(raw.d), species: c.species.trim() }).catch(() => {});
    notifyNavData(); setBusy(false); onClose();
  };
  const onPhoto = async (f: File | undefined) => { if (!f) return; try { setC({ ...c, photo: await shrinkPhoto(f) }); } catch { /* unreadable image */ } };
  const field = 'mt-1 h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10';
  return (
    <Sheet title={isNew ? t('ct_add') : c.species || t('ct_title')} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block font-medium">{t('ct_species')}
          <input value={c.species} onChange={(e) => setC({ ...c, species: e.target.value })} maxLength={40} className={field} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SPECIES.map(([en, ar]) => { const v = lang === 'ar' ? ar : en; return (
            <button key={en} onClick={() => setC({ ...c, species: v })} aria-pressed={c.species === v} className={`tap h-8 rounded-full px-3 text-xs font-semibold ${c.species === v ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-slate-100 dark:bg-white/10'}`}>{v}</button>
          ); })}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="block font-medium">{t('ct_count')}<input value={c.count} inputMode="numeric" onChange={(e) => setC({ ...c, count: Math.max(1, Math.min(999, parseInt(e.target.value) || 1)) })} className={field} /></label>
          <label className="block font-medium">{t('ct_weight')}<input value={raw.w} inputMode="decimal" placeholder="—" onChange={(e) => setRaw({ ...raw, w: e.target.value })} className={field} /></label>
          <label className="block font-medium">{t('ct_length')}<input value={raw.l} inputMode="decimal" placeholder="—" onChange={(e) => setRaw({ ...raw, l: e.target.value })} className={field} /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block font-medium">{t('ct_bait')}<input value={c.bait} onChange={(e) => setC({ ...c, bait: e.target.value })} maxLength={40} className={field} /></label>
          <label className="block font-medium">{t('ct_depth')}<input value={raw.d} inputMode="decimal" placeholder="—" onChange={(e) => setRaw({ ...raw, d: e.target.value })} className={field} /></label>
        </div>
        <div>
          <p className="font-medium">{t('ct_technique')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TECH.map((k) => (
              <button key={k} onClick={() => setC({ ...c, technique: c.technique === t(k) ? '' : t(k) })} aria-pressed={c.technique === t(k)} className={`tap h-8 rounded-full px-3 text-xs font-semibold ${c.technique === t(k) ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-slate-100 dark:bg-white/10'}`}>{t(k)}</button>
            ))}
          </div>
        </div>
        <label className="block font-medium">{t('ct_when')}
          <input type="datetime-local" value={localInput(c.at)} onChange={(e) => { const v = new Date(e.target.value).getTime(); if (Number.isFinite(v)) setC({ ...c, at: v, conditions: null }); }} className={field} />
        </label>
        <div>
          <p className="font-medium">{t('ct_location')}</p>
          <div role="radiogroup" className="mt-1.5 grid grid-cols-3 gap-1.5">
            {(['exact', 'area', 'hidden'] as const).map((p) => (
              <button key={p} role="radio" aria-checked={c.privacy === p} onClick={() => setC({ ...c, privacy: p })}
                className={`tap h-10 rounded-xl text-xs font-semibold ${c.privacy === p ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-slate-100 dark:bg-white/10'}`}>{t(`ct_p_${p}` as Key)}</button>
            ))}
          </div>
          <p className="muted mt-1 text-xs" dir="auto">
            {c.privacy === 'hidden' ? t('ct_p_hidden_t') : pos ? `${t(c.privacy === 'area' ? 'ct_p_area_t' : 'ct_p_exact_t')} · ${fmtLat(pos.lat)} ${fmtLon(pos.lon)}` : t('ct_no_pos')}
          </p>
        </div>
        <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={c.released} onChange={(e) => setC({ ...c, released: e.target.checked })} className="h-5 w-5" /> {t('ct_released_q')}</label>
        <div className="flex items-center gap-3">
          {c.photo && <Photo blob={c.photo} className="h-16 w-16 rounded-xl object-cover" />}
          <label className="tap inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-slate-100 px-4 font-semibold dark:bg-white/10">
            <Camera size={16} /> {c.photo ? t('ct_photo_change') : t('ct_photo')}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          {c.photo && <button onClick={() => setC({ ...c, photo: null })} className="text-xs font-semibold text-bad">{t('delete')}</button>}
        </div>
        <label className="block font-medium">{t('notes')}
          <textarea value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} rows={2} maxLength={500} className="mt-1 w-full rounded-xl border-0 bg-slate-100 p-3 text-base dark:bg-white/10" />
        </label>
        {c.conditions && <p className="muted text-xs">{t('ct_cond', { w: c.conditions.windKn != null ? Math.round(c.conditions.windKn) : '—', v: c.conditions.waveM?.toFixed(1) ?? '—' })}{c.conditions.tide ? ` · ${t(`ct_tide_${c.conditions.tide}` as Key)}` : ''} · {t('src_forecast_short')}</p>}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={saveIt} disabled={busy} className="tap h-12 rounded-2xl bg-abyss font-bold text-white disabled:opacity-50">{t('save')}</button>
          {!isNew ? (
            <button onClick={async () => { if (!confirm) { setConfirm(true); return; } await deleteCatch(c.id).catch(() => {}); notifyNavData(); onClose(); }} className={`tap inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl font-semibold ${confirm ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}><Trash2 size={15} /> {confirm ? t('discard_confirm') : t('delete')}</button>
          ) : <button onClick={onClose} className="tap h-12 rounded-2xl bg-slate-100 font-semibold dark:bg-white/10">{t('cancel')}</button>}
        </div>
      </div>
    </Sheet>
  );
}
