import { useEffect, useState } from 'react';
import { Fuel, Lock, Ship, Trash2 } from 'lucide-react';
import { refuel, rangeNm, setFuelLevel } from '@/lib/nav/fuel';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { NavSettings, useNavSettings } from '@/lib/nav/settings';
import { clearTileCache, tileCacheInfo } from '@/components/ChartView';

const TYPES: NavSettings['boatType'][] = ['speedboat', 'fishing', 'yacht', 'sail', 'jetski', 'kayak', 'other'];

function NumField({ label, value, onChange, step = 1 }: { label: string; value: number | null; onChange: (v: number | null) => void; step?: number }) {
  const [txt, setTxt] = useState(value != null ? String(value) : '');
  useEffect(() => { setTxt(value != null ? String(value) : ''); }, [value]);
  return (
    <label className="block text-sm font-medium">{label}
      <input value={txt} inputMode="decimal" step={step} placeholder="—"
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => { const v = parseFloat(txt.replace(',', '.')); onChange(Number.isFinite(v) && v >= 0 ? v : null); }}
        className="mt-1 h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base tabular-nums dark:bg-white/10" />
    </label>
  );
}

export function BoatSettings() {
  const { t } = useT();
  const [s, set] = useNavSettings();
  const range = s.tankL && s.burnLph && s.cruiseKn ? Math.round((s.tankL / s.burnLph) * s.cruiseKn * 0.8) : null;
  return (
    <section className="card space-y-3 p-4 text-sm">
      <p className="flex items-center gap-2"><Ship size={18} className="text-lagoon dark:text-shallows" /><span className="muted">{t('boat_t')}</span></p>
      <label className="block font-medium">{t('boat_name')}
        <input value={s.boatName} onChange={(e) => set({ boatName: e.target.value })} maxLength={40}
          className="mt-1 h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
      </label>
      <div>
        <p className="font-medium">{t('boat_type')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {TYPES.map((b) => (
            <button key={b} onClick={() => set({ boatType: b })} aria-pressed={s.boatType === b}
              className={`tap h-9 rounded-full px-3 text-xs font-semibold ${s.boatType === b ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
              {t(`bt_${b}` as Key)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label={t('cruise_kn')} value={s.cruiseKn} onChange={(v) => set({ cruiseKn: v && v > 0 ? v : 18 })} />
        <NumField label={t('length_ft')} value={s.lengthFt} onChange={(v) => set({ lengthFt: v })} />
        <NumField label={t('burn_lph')} value={s.burnLph} onChange={(v) => set({ burnLph: v })} />
        <NumField label={t('tank_l')} value={s.tankL} onChange={(v) => set({ tankL: v })} />
      </div>
      {range != null && <p className="muted text-xs">{t('range_nm', { nm: range })} (80%)</p>}
      <div className="grid grid-cols-2 gap-2">
        <TextField label={t('bp_engine')} value={s.engine} onChange={(v) => set({ engine: v })} />
        <NumField label={t('bp_hp')} value={s.hp} onChange={(v) => set({ hp: v })} />
      </div>
      <TextField label={t('bp_marina')} value={s.homeMarina} onChange={(v) => set({ homeMarina: v })} />
      <div className="space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
        <p className="flex items-center gap-1.5 text-xs font-semibold"><Lock size={13} /> {t('bp_private')}</p>
        <TextField label={t('bp_reg')} value={s.registration} onChange={(v) => set({ registration: v })} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label={t('bp_em_name')} value={s.emergencyName} onChange={(v) => set({ emergencyName: v })} />
          <TextField label={t('bp_em_phone')} value={s.emergencyPhone} onChange={(v) => set({ emergencyPhone: v })} tel />
        </div>
      </div>
    </section>
  );
}

function TextField({ label, value, onChange, tel }: { label: string; value: string; onChange: (v: string) => void; tel?: boolean }) {
  return (
    <label className="block text-sm font-medium">{label}
      <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={60} inputMode={tel ? 'tel' : undefined} dir={tel ? 'ltr' : undefined}
        className="mt-1 h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
    </label>
  );
}

/** Optional fuel tracking: level on board, refuels, estimated range. All estimates. */
export function FuelCard() {
  const { t } = useT();
  const [s] = useNavSettings();
  const [add, setAdd] = useState('');
  const r = rangeNm(s.fuelL, s);
  const pct = s.fuelL != null && s.tankL ? Math.round((s.fuelL / s.tankL) * 100) : null;
  return (
    <section className="card space-y-3 p-4 text-sm">
      <p className="flex items-center gap-2"><Fuel size={18} className="text-lagoon dark:text-shallows" /><span className="muted">{t('fuel_t')}</span></p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t('fuel_now')}</p>
          <p className="readout mt-1 text-[34px]">{s.fuelL != null ? Math.round(s.fuelL) : '—'}<span className="ms-1 font-sans text-sm font-medium text-slate-400">L{pct != null ? ` · ${pct}%` : ''}</span></p>
          {s.fuelAt && <p className="muted text-[11px]">{t('fuel_set_at', { d: new Date(s.fuelAt).toLocaleDateString() })}</p>}
        </div>
        {r != null && <p className="text-end text-xs"><span className="muted block">{t('fuel_range')}</span><b className="text-base tabular-nums">≈ {Math.round(r)} NM</b></p>}
      </div>
      {pct != null && <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full ${pct < 25 ? 'bg-bad' : pct < 50 ? 'bg-caution' : 'bg-good'}`} style={{ width: `${pct}%` }} /></div>}
      <div className="grid grid-cols-2 gap-2">
        <NumField label={t('fuel_level')} value={s.fuelL != null ? Math.round(s.fuelL) : null} onChange={(v) => { if (v != null) setFuelLevel(v); }} />
        <label className="block text-sm font-medium">{t('fuel_add')}
          <span className="mt-1 flex gap-1">
            <input value={add} onChange={(e) => setAdd(e.target.value)} inputMode="decimal" placeholder="L" className="h-11 min-w-0 flex-1 rounded-xl border-0 bg-slate-100 px-3 text-base tabular-nums dark:bg-white/10" />
            <button onClick={() => { const v = parseFloat(add.replace(',', '.')); if (Number.isFinite(v) && v > 0) { refuel(v); setAdd(''); } }} className="tap h-11 rounded-xl bg-abyss px-3 text-sm font-bold text-white">+</button>
          </span>
        </label>
      </div>
      {s.tankL != null && <button onClick={() => refuel(null)} className="tap h-11 w-full rounded-xl bg-lagoon/10 text-sm font-semibold text-lagoon dark:text-shallows">{t('fuel_full', { l: s.tankL })}</button>}
      <p className="muted text-[11px] leading-snug">{t('fuel_est_note')}</p>
    </section>
  );
}

export function TileCacheRow() {
  const { t } = useT();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => { tileCacheInfo().then(setN); }, []);
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
      <span className="muted text-xs">{t('tiles_saved', { n: n ?? 0 })}</span>
      <button onClick={async () => { await clearTileCache(); setN(0); }} disabled={!n}
        className="tap inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-lagoon disabled:opacity-40 dark:bg-white/10 dark:text-shallows">
        <Trash2 size={13} /> {t('clear_tiles')}
      </button>
    </div>
  );
}
