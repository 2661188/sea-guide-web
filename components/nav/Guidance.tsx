import { Anchor, BellRing, ChevronsLeft, ChevronsRight, Flag, Navigation2, SkipBack, SkipForward, Square } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import { ackAlarm, Active, Alarm, anchorDriftM, Anchor as AnchorT, clearAnchor, computeGuidance, previousPoint, setAnchorRadius, skipPoint, stopGuide } from '@/lib/nav/guide';
import { distUnit, fmtDist } from '@/lib/nav/geo';
import type { Position } from '@/lib/nav/tracker';
import { useNavSettings } from '@/lib/nav/settings';
import { useFmtHours } from './RouteLegs';

const pad3 = (n: number) => String(Math.round(n) % 360).padStart(3, '0');
const clock = (h: number | null) => {
  if (h == null || !Number.isFinite(h) || h > 72) return '—';
  const d = new Date(Date.now() + h * 3600e3);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Big, glanceable guidance: where to steer, how far, how long, and cross-track error. */
export function GuidanceCard({ a, pos }: { a: Active; pos: Position | null }) {
  const { t } = useT();
  const [nav] = useNavSettings();
  const fh = useFmtHours();
  const g = computeGuidance(a, pos);
  const name = g?.target.name || (a.kind === 'goto' ? a.name : `WP${String(a.leg + 1).padStart(2, '0')}`);
  const rel = g && pos?.cog != null ? ((g.btw - pos.cog + 540) % 360) - 180 : null;
  const xte = g?.xte ?? null;
  const xteFrac = xte != null ? Math.max(-1, Math.min(1, xte / (nav.xteNm * 2))) : 0;
  const offLimit = xte != null && Math.abs(xte) > nav.xteNm;

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#4A0D52] to-[#C026D3] text-white shadow-lg">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
        <span className="truncate">{a.kind === 'route' ? `${a.name} · ${t('leg_of', { n: g?.leg ?? a.leg, total: g?.legs ?? a.pts.length - 1 })}` : t('going_to')}</span>
        {a.arrived && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#C026D3]">{t('arrived')}</span>}
      </div>
      <p className="truncate px-4 font-display text-[26px] font-semibold leading-tight"><Flag size={18} className="me-1.5 inline" />{name}</p>
      {!pos ? <p className="px-4 pb-4 pt-1 text-sm text-white/80">{t('em_no_fix')}</p> : g && (
        <>
          <div className="flex items-center gap-4 px-4 pt-2">
            <div className="relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full bg-white/15 ring-2 ring-white/30">
              <Navigation2 size={46} fill="#fff" style={{ transform: `rotate(${rel ?? g.btw}deg)`, transition: 'transform .4s' }} />
              <span className="absolute -bottom-1 rounded-full bg-white px-2 text-[10px] font-bold text-[#C026D3]">{rel != null ? t('rel_head') : t('true_north')}</span>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1">
              <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{t('brg')}</dt><dd className="readout text-[34px] leading-none">{pad3(g.btw)}°</dd></div>
              <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{t('dist')}</dt><dd className="readout text-[34px] leading-none"><bdi>{fmtDist(g.dtw)}</bdi><span className="ms-0.5 font-sans text-xs text-white/70">{distUnit(g.dtw)}</span></dd></div>
              <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{t('ttg')}</dt><dd className="font-display text-xl font-semibold">{fh(g.ttg)}</dd></div>
              <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{t('eta')}</dt><dd className="font-display text-xl font-semibold tabular-nums">{clock(g.ttg)}</dd></div>
            </dl>
          </div>
          {xte != null && (
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-white/80">
                <span>{t('xte')} <bdi className="tabular-nums">{fmtDist(Math.abs(xte))} {distUnit(Math.abs(xte))}</bdi></span>
                {Math.abs(xte) > 0.01 && (
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${offLimit ? 'bg-white text-bad' : 'bg-white/15'}`}>
                    {xte > 0 ? <><ChevronsLeft size={14} /> {t('steer_left')}</> : <>{t('steer_right')} <ChevronsRight size={14} /></>}
                  </span>
                )}
              </div>
              <div dir="ltr" className="relative mt-1.5 h-3 rounded-full bg-white/15">
                <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/70" />
                <span className="absolute inset-y-0 rounded-full bg-white/10" style={{ left: '25%', right: '25%' }} />
                <span className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${offLimit ? 'bg-bad' : 'bg-good'}`} style={{ left: `${50 + xteFrac * 50}%`, transition: 'left .4s' }} />
              </div>
            </div>
          )}
          {a.kind === 'route' && (
            <p className="px-4 pt-2 text-xs text-white/80">{t('to_end')}: <b className="tabular-nums">{fmtDist(g.remaining)} {distUnit(g.remaining)}</b> · {fh(g.ttgEnd)} · {t('eta')} {clock(g.ttgEnd)}</p>
          )}
          {g.vmg != null && <p className="px-4 text-xs text-white/70">{t('vmg')} <span className="tabular-nums">{g.vmg.toFixed(1)} {t('unit_kn')}</span></p>}
        </>
      )}
      <div className="mt-3 flex gap-1 bg-black/20 p-2">
        {a.kind === 'route' && <button onClick={previousPoint} disabled={a.leg <= 1} className="tap flex h-11 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-semibold disabled:opacity-40"><SkipBack size={16} className="rtl:rotate-180" /> {t('prev_wp')}</button>}
        {a.kind === 'route' && <button onClick={skipPoint} disabled={a.leg >= a.pts.length - 1} className="tap flex h-11 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-semibold disabled:opacity-40">{t('next_wp')} <SkipForward size={16} className="rtl:rotate-180" /></button>}
        <button onClick={stopGuide} className="tap flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-bold text-[#C026D3]"><Square size={14} fill="currentColor" /> {t('stop_nav')}</button>
      </div>
    </section>
  );
}

export function AnchorCard({ an, pos }: { an: AnchorT; pos: Position | null }) {
  const { t } = useT();
  const drift = pos ? anchorDriftM(an, pos) : null;
  const out = drift != null && drift > an.radiusM;
  return (
    <section className={`card p-4 ${out ? 'ring-2 ring-bad' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold"><Anchor size={18} className={out ? 'text-bad' : 'text-good'} /> {t('anchor_on')}</p>
        <button onClick={clearAnchor} className="tap rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold dark:bg-white/10">{t('anchor_off')}</button>
      </div>
      <p className="mt-2 text-sm">{t('anchor_drift')}: <b className={`tabular-nums ${out ? 'text-bad' : ''}`}>{drift != null ? `${Math.round(drift)} m` : '—'}</b> / {an.radiusM} m</p>
      <div className="mt-2 flex gap-1.5">
        {[25, 50, 100, 200].map((r) => (
          <button key={r} onClick={() => setAnchorRadius(r)} className={`tap h-9 flex-1 rounded-lg text-xs font-semibold ${an.radiusM === r ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-slate-100 dark:bg-white/10'}`}>{r} m</button>
        ))}
      </div>
    </section>
  );
}

export function AlarmBanner({ alarm }: { alarm: Alarm }) {
  const { t } = useT();
  const urgent = alarm.type === 'anchor' || alarm.type === 'xte';
  const text = alarm.type === 'arrive' ? t('al_arrive', { name: alarm.name || '' }) : alarm.type === 'end' ? t('al_end', { name: alarm.name || '' })
    : alarm.type === 'xte' ? t('al_xte') : t('al_anchor');
  return (
    <div role="alert" className={`fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-2xl ${urgent ? 'animate-pulse bg-bad' : 'bg-good'}`}>
      <BellRing size={24} className="shrink-0" />
      <p className="flex-1 font-semibold leading-snug">{text}</p>
      <button onClick={ackAlarm} className="tap h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-bold text-ink">{t('ok')}</button>
    </div>
  );
}
