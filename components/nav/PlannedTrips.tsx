import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, ChevronDown, Fuel, Trash2, Wind } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import { allPlans, deletePlan, notifyNavData, onNavData, putPlan, TripPlan } from '@/lib/nav/db';
import { activityName } from '@/lib/ai/planner';
import { fmtClock } from '@/lib/nav/eta';

/** Trip plans (from the voice assistant or later by hand), stored on the phone. */
export function PlannedTrips() {
  const { t, lang } = useT();
  const [plans, setPlans] = useState<TripPlan[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const reload = useCallback(() => { allPlans().then(setPlans).catch(() => setPlans([])); }, []);
  useEffect(() => { reload(); return onNavData(reload); }, [reload]);
  if (!plans.length) return null;

  const toggle = async (p: TripPlan, id: string) => {
    const next = { ...p, checklist: p.checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i)), modified: true, updatedAt: Date.now() };
    setPlans((l) => l.map((x) => (x.id === p.id ? next : x)));
    await putPlan(next).catch(() => {});
  };
  const del = async (id: string) => {
    if (confirmDel !== id) { setConfirmDel(id); setTimeout(() => setConfirmDel(null), 3500); return; }
    await deletePlan(id).catch(() => {});
    notifyNavData();
  };
  const date = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <ul className="space-y-2">
      {plans.map((p) => {
        const c = p.conditions;
        const isOpen = open === p.id;
        const done = p.checklist.filter((i) => i.done).length;
        return (
          <li key={p.id} className="card overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : p.id)} className="flex w-full items-center gap-3 p-3 text-start" aria-expanded={isOpen}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lagoon/10 text-lagoon dark:text-shallows"><CalendarClock size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{activityName(p.activity, lang)} · {date(p.date)}</span>
                <span className="muted block text-xs tabular-nums">{t('ai_departure')} {p.departure} · {p.durationH} {t('unit_h')} · {t('ai_check_n', { d: done, n: p.checklist.length })}{p.createdBy === 'ai' ? ` · ${t('ai_made_by')}` : ''}</span>
              </span>
              <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="space-y-2 border-t border-slate-100 p-3 text-sm dark:border-white/10">
                <p className="flex items-start gap-2"><Wind size={16} className="mt-0.5 shrink-0 text-lagoon" />
                  <span>{c && c.windMaxKn != null ? `${t('ai_wind_to', { v: Math.round(c.windMaxKn) })}${c.waveMaxM != null ? ` · ${t('ai_waves_to', { v: c.waveMaxM.toFixed(1) })}` : ''}${c.tide.length ? ` · ${c.tide.map((x) => `${x.type === 'high' ? t('high_tide') : t('low_tide')} ${fmtClock(x.at)}`).join(', ')}` : ''}` : t('ai_no_forecast')}
                    {c && <span className="muted block text-[11px]">{t('ai_source', { s: c.source })} · {t('ai_check_again')}</span>}</span></p>
                <p className="flex items-start gap-2"><Fuel size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>{p.fuelL != null ? t('ai_fuel_v', { l: Math.round(p.fuelL), c: Math.round(p.fuelCarryL!), d: p.distanceNm!.toFixed(1), to: p.destination!.name }) : p.fuelPerHourL ? t('ai_fuel_ph', { l: p.fuelPerHourL }) : t('ai_fuel_na')}</span></p>
                <ul className="space-y-1">
                  {p.checklist.map((i) => (
                    <li key={i.id}>
                      <button onClick={() => toggle(p, i.id)} className="flex min-h-[40px] w-full items-center gap-2 text-start" aria-pressed={i.done}>
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ring-1 ${i.done ? 'bg-good text-white ring-good' : 'ring-slate-300 dark:ring-white/20'}`}>{i.done && <Check size={15} />}</span>
                        <span className={i.done ? 'muted line-through' : ''}>{lang === 'ar' ? i.ar : i.en}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button onClick={() => del(p.id)} className={`tap inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ${confirmDel === p.id ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}><Trash2 size={15} /> {confirmDel === p.id ? t('confirm_again') : t('delete')}</button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
