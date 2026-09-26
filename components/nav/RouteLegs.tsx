import { useState } from 'react';
import { ArrowLeftRight, Download, Navigation, Pencil, Trash2 } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import { deleteRoute, notifyNavData, putRoute, Route, RoutePoint } from '@/lib/nav/db';
import { bearing, distanceNm, distUnit, fmtDist, pathNm } from '@/lib/nav/geo';
import { downloadText, safeName, toGpx } from '@/lib/nav/gpx';
import { fmtHours, legPlan, useNavSettings } from '@/lib/nav/settings';

export function useFmtHours() {
  const { t } = useT();
  return (h: number | null) => fmtHours(h).replace('min', t('unit_min')).replace(' h ', ` ${t('unit_h')} `);
}

/** Totals line: distance · time at cruise speed · fuel. */
export function RouteTotals({ pts, className = '' }: { pts: RoutePoint[]; className?: string }) {
  const { t } = useT();
  const [nav] = useNavSettings();
  const fh = useFmtHours();
  const nm = pathNm(pts);
  const plan = legPlan(nm, nav);
  return (
    <div className={`grid grid-cols-3 gap-2 text-center ${className}`}>
      <div className="rounded-xl bg-slate-50 p-2 dark:bg-white/5"><p className="eyebrow">{t('distance')}</p><p className="readout mt-0.5 text-2xl"><bdi>{fmtDist(nm)}</bdi> <span className="font-sans text-xs text-slate-400">{distUnit(nm)}</span></p></div>
      <div className="rounded-xl bg-slate-50 p-2 dark:bg-white/5"><p className="eyebrow">{t('time_at', { kn: nav.cruiseKn })}</p><p className="readout mt-0.5 text-2xl">{fh(plan.hours)}</p></div>
      <div className="rounded-xl bg-slate-50 p-2 dark:bg-white/5"><p className="eyebrow">{t('fuel')}</p><p className="readout mt-0.5 text-2xl">{plan.fuelL != null ? `${Math.round(plan.fuelL)}` : '—'} <span className="font-sans text-xs text-slate-400">{plan.fuelL != null ? 'L' : ''}</span></p></div>
    </div>
  );
}

export function LegsTable({ pts, onRemove }: { pts: RoutePoint[]; onRemove?: (i: number) => void }) {
  const { t } = useT();
  const [nav] = useNavSettings();
  const fh = useFmtHours();
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 dark:ring-white/10">
      <table className="w-full min-w-[300px] text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2 text-start font-semibold">#</th>
            <th className="px-2 py-2 text-start font-semibold">{t('point')}</th>
            <th className="px-2 py-2 text-end font-semibold">{t('brg')}</th>
            <th className="px-2 py-2 text-end font-semibold">{t('leg')}</th>
            <th className="px-2 py-2 text-end font-semibold">{t('time')}</th>
            {onRemove && <th />}
          </tr>
        </thead>
        <tbody>
          {pts.map((q, i) => {
            const a = pts[i - 1];
            const nm = a ? distanceNm(a, q) : null;
            return (
              <tr key={i} className="border-t border-slate-100 dark:border-white/10">
                <td className="px-3 py-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#C026D3] text-[11px] font-bold text-white">{i + 1}</span></td>
                <td className="max-w-[9rem] truncate px-2 py-2 font-medium">{q.name || `WP${String(i + 1).padStart(2, '0')}`}</td>
                <td className="px-2 py-2 text-end tabular-nums">{a ? `${String(Math.round(bearing(a, q))).padStart(3, '0')}°` : '—'}</td>
                <td className="px-2 py-2 text-end tabular-nums">{nm != null ? `${fmtDist(nm)} ${distUnit(nm)}` : '—'}</td>
                <td className="px-2 py-2 text-end tabular-nums">{nm != null ? fh(legPlan(nm, nav).hours) : '—'}</td>
                {onRemove && <td className="pe-2 text-end"><button onClick={() => onRemove(i)} aria-label={t('delete')} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-bad"><Trash2 size={15} /></button></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Route details and actions (used in Navigate and in Trips). */
export function RouteDetail({ route, onNavigate, onEdit, onDeleted, onRenamed }:
  { route: Route; onNavigate: (pts: RoutePoint[]) => void; onEdit?: () => void; onDeleted: () => void; onRenamed?: (r: Route) => void }) {
  const { t } = useT();
  const [name, setName] = useState(route.name);
  const [confirmDel, setConfirmDel] = useState(false);
  const rename = async () => {
    const n = name.trim();
    if (!n || n === route.name) return;
    const r = { ...route, name: n, updatedAt: Date.now() };
    await putRoute(r).catch(() => {});
    notifyNavData();
    onRenamed?.(r);
  };
  const del = async () => {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3500); return; }
    await deleteRoute(route.id).catch(() => {});
    notifyNavData();
    onDeleted();
  };
  return (
    <div className="space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label={t('route_name')} maxLength={50} className="h-12 w-full rounded-xl border-0 bg-slate-100 px-3 font-display text-xl font-semibold dark:bg-white/10" />
      <RouteTotals pts={route.points} />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onNavigate(route.points)} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#C026D3] font-semibold text-white"><Navigation size={18} /> {t('navigate_route')}</button>
        <button onClick={() => onNavigate([...route.points].reverse())} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-semibold dark:bg-white/10"><ArrowLeftRight size={18} /> {t('reverse')}</button>
      </div>
      <LegsTable pts={route.points} />
      <div className="flex flex-wrap gap-2">
        {onEdit && <button onClick={onEdit} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-sm font-semibold dark:bg-white/10"><Pencil size={15} /> {t('edit_on_chart')}</button>}
        <button onClick={() => downloadText(`${safeName(route.name)}.gpx`, toGpx({ routes: [route] }))} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-sm font-semibold dark:bg-white/10"><Download size={15} /> GPX</button>
        <button onClick={del} className={`tap ms-auto inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ${confirmDel ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}><Trash2 size={15} /> {confirmDel ? t('confirm_again') : t('delete')}</button>
      </div>
    </div>
  );
}
