import { useEffect, useState } from 'react';
import { Ship, Trash2 } from 'lucide-react';
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
