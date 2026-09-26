import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowDown, ArrowUp, Check, Minus, Navigation, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BaseMap, View } from '@/components/BaseMap';
import { SourceTag, Skeleton } from '@/components/ui';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import { useStations } from '@/lib/useStations';
import { EMIRATES, REGIONS, DEFAULT_REGION, Spot } from '@/lib/regions';
import { spotArea, spotName } from '@/lib/i18n/place';
import { dayKey, fmtTime, nowLocalMs } from '@/lib/marine/time';
import { dayName } from '@/lib/i18n/strings';
import type { Key } from '@/lib/i18n/strings';
import type { StationTide } from '@/lib/marine/types';

const W = 720, H = 470;
const VIEWS: Record<string, View> = {
  all: { lon: 54.05, lat: 24.85, span: 5.5 },
  west: { lon: 53.1, lat: 24.35, span: 2.4 },
  north: { lon: 55.55, lat: 25.45, span: 1.5 },
  east: { lon: 56.25, lat: 25.3, span: 1.0 },
};
const VIEW_LABEL: Record<string, { en: string; ar: string }> = {
  all: { en: 'All UAE', ar: 'كل الإمارات' },
  west: { en: 'Abu Dhabi', ar: 'أبوظبي' },
  north: { en: 'Dubai – RAK', ar: 'دبي – رأس الخيمة' },
  east: { en: 'East coast', ar: 'الساحل الشرقي' },
};
const trendColor = (t: StationTide['trend']) => (t === 'Rising' ? '#0E7C86' : t === 'Falling' ? '#FF6B35' : '#64748B');

export default function StationsMap() {
  const { t, lang } = useT();
  const router = useRouter();
  const { spot, setSpotId } = useSpot();
  const { data, status, offline, refresh } = useStations();
  const spots = REGIONS[DEFAULT_REGION].spots;
  const [sel, setSel] = useState<string>(spot.id);
  const [zoom, setZoom] = useState<keyof typeof VIEWS>('all');
  const byId = useMemo(() => new Map((data?.stations ?? []).map((s) => [s.id, s])), [data]);
  const now = data ? nowLocalMs(data.utcOffsetSeconds) : 0;
  const selSpot = spots.find((s) => s.id === sel)!;
  const selTide = byId.get(sel);
  const trendKey = (tr: StationTide['trend']): Key => (tr === 'Rising' ? 'st_rising' : tr === 'Falling' ? 'st_falling' : 'st_slack');
  const TrendIcon = ({ tr, size = 14 }: { tr: StationTide['trend']; size?: number }) =>
    tr === 'Rising' ? <ArrowUp size={size} /> : tr === 'Falling' ? <ArrowDown size={size} /> : <Minus size={size} />;
  const when = (ms: number) => `${dayKey(ms) !== dayKey(now) ? dayName(lang, ms) + ' ' : ''}${fmtTime(ms)}`;
  const labelsOn = zoom !== 'all';

  return (
    <AppShell title={t('map_title')} showSpot={false}>
      <div className="space-y-3 pb-6">
        <p className="muted px-1 text-sm">{t('map_sub', { n: spots.length })}</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
          {Object.keys(VIEWS).map((k) => (
            <button key={k} onClick={() => setZoom(k as keyof typeof VIEWS)} aria-pressed={zoom === k}
              className={`tap h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${zoom === k ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200'}`}>
              {VIEW_LABEL[k][lang]}
            </button>
          ))}
          <button onClick={refresh} aria-label={t('refresh')} className="tap ms-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200"><RefreshCw size={16} /></button>
        </div>

        <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
          <section className="card relative overflow-hidden lg:col-span-8">
            <BaseMap view={VIEWS[zoom]} width={W} height={H} className="block h-auto w-full touch-manipulation">
              {(p) => (
                <g>
                  {zoom === 'all' && (
                    <>
                      <text {...xy(p(52.9, 25.55))} textAnchor="middle" className="fill-sky-800/40 text-[15px] font-semibold italic tracking-[0.3em] dark:fill-sky-200/30">{t('arabian_gulf').toUpperCase()}</text>
                      <text {...xy(p(56.72, 24.6))} textAnchor="middle" transform={`rotate(-70 ${p(56.72, 24.6).join(' ')})`} className="fill-sky-800/40 text-[11px] font-semibold italic tracking-[0.2em] dark:fill-sky-200/30">{t('gulf_oman').toUpperCase()}</text>
                    </>
                  )}
                  {spots.map((s) => {
                    const [x, y] = p(s.lon, s.lat);
                    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return null;
                    const st = byId.get(s.id);
                    const on = s.id === sel;
                    const c = trendColor(st?.trend ?? null);
                    return (
                      <g key={s.id} transform={`translate(${x},${y})`} onClick={() => setSel(s.id)} className="cursor-pointer" role="button" aria-label={spotName(s, lang)}>
                        <circle r="16" fill="transparent" />
                        {on && <circle r="13" fill={c} opacity="0.25"><animate attributeName="r" values="9;15;9" dur="2.4s" repeatCount="indefinite" /></circle>}
                        <circle r={on ? 8.5 : 6.5} fill={c} stroke="#fff" strokeWidth="2.2" />
                        {st?.trend && st.trend !== 'Slack' && <path d={st.trend === 'Rising' ? 'M0 -3.2 L2.8 1.6 H-2.8 Z' : 'M0 3.2 L2.8 -1.6 H-2.8 Z'} fill="#fff" />}
                        {(labelsOn || on) && (
                          <text x="12" y="4" className="fill-ink text-[12px] font-bold dark:fill-white" style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }}>{spotName(s, lang)}</text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
            </BaseMap>
            <div className="absolute start-3 top-3 flex flex-col gap-1 rounded-xl bg-white/90 px-2.5 py-2 text-[11px] font-semibold shadow-sm dark:bg-[#06283D]/90">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: trendColor('Rising') }} />{t('st_rising')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: trendColor('Falling') }} />{t('st_falling')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: trendColor('Slack') }} />{t('st_slack')}</span>
            </div>
            {status === 'loading' && <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-slate-600">{t('st_loading')}</p>}
            {offline && data && <p className="absolute inset-x-3 bottom-3 rounded-lg bg-amber-50 px-2 py-1 text-center text-[11px] text-amber-900">{t('offline', { time: new Date(data.fetchedAt).toLocaleTimeString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) })}</p>}
          </section>

          {/* Selected station */}
          <section className="card p-4 lg:col-span-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="eyebrow">{EMIRATES[selSpot.emirate][lang]}</p>
                <h2 className="font-display text-[28px] font-semibold leading-tight">{spotName(selSpot, lang)}</h2>
                <p className="muted text-xs">{spotArea(selSpot, lang)} · <bdi className="tabular-nums">{selSpot.lat.toFixed(3)}°N {selSpot.lon.toFixed(3)}°E</bdi></p>
              </div>
              <SourceTag kind="calc" />
            </div>
            {selTide ? (
              <>
                <div className="mt-3 flex items-end gap-3">
                  <p className="readout flex items-center gap-1.5 text-[40px]" style={{ color: trendColor(selTide.trend) }}>
                    <TrendIcon tr={selTide.trend} size={26} />
                    <bdi className="text-ink dark:text-white">{selTide.level != null ? `${selTide.level >= 0 ? '+' : ''}${selTide.level.toFixed(2)}` : '—'}</bdi>
                    <span className="font-sans text-base font-medium text-slate-400">{t('unit_m')}</span>
                  </p>
                  <p className="mb-1.5 text-sm font-semibold" style={{ color: trendColor(selTide.trend) }}>{t(trendKey(selTide.trend))}</p>
                </div>
                <Spark series={selTide.series} />
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {selTide.next.map((e) => (
                    <div key={e.at} className="rounded-xl bg-slate-50 p-2 dark:bg-white/5">
                      <dt className={`flex items-center justify-center gap-1 text-[11px] font-semibold ${e.type === 'high' ? 'text-lagoon dark:text-shallows' : 'text-buoy'}`}>{e.type === 'high' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{t(e.type === 'high' ? 'high_tide' : 'low_tide')}</dt>
                      <dd className="readout mt-1 text-lg">{when(e.at)}</dd>
                      <dd className="muted text-[11px] tabular-nums"><bdi>{e.height >= 0 ? '+' : ''}{e.height.toFixed(2)}</bdi> {t('unit_m')}</dd>
                    </div>
                  ))}
                  <div className="rounded-xl bg-slate-50 p-2 dark:bg-white/5">
                    <dt className="text-[11px] font-semibold text-slate-500">{t('st_range')}</dt>
                    <dd className="readout mt-1 text-lg">{selTide.range != null ? selTide.range.toFixed(2) : '—'}</dd>
                    <dd className="muted text-[11px]">{t('unit_m')}</dd>
                  </div>
                </dl>
              </>
            ) : status === 'error' ? <p className="muted mt-4 text-sm">{t('st_error')}</p> : <Skeleton className="mt-4 h-32" />}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => { setSpotId(sel); router.push('/'); }} disabled={sel === spot.id}
                className="tap flex h-11 items-center justify-center gap-1.5 rounded-xl bg-abyss text-sm font-semibold text-white disabled:bg-good">
                {sel === spot.id ? <><Check size={16} /> {t('is_home')}</> : t('set_home')}
              </button>
              <a href={`https://www.google.com/maps/search/?api=1&query=${selSpot.lat},${selSpot.lon}`} target="_blank" rel="noreferrer"
                className="tap flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10">
                <Navigation size={15} /> {t('open_maps')}
              </a>
            </div>
          </section>
        </div>

        {/* All stations table */}
        <section className="card overflow-hidden">
          <p className="eyebrow px-4 pt-4">{t('all_stations')}</p>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[340px] text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 text-start font-semibold">{t('station')}</th>
                  <th className="px-2 py-2 text-end font-semibold">{t('st_level')}</th>
                  <th className="px-2 py-2 text-start font-semibold" />
                  <th className="px-4 py-2 text-end font-semibold">{t('st_next')}</th>
                </tr>
              </thead>
              <tbody>
                {spots.map((s: Spot) => {
                  const st = byId.get(s.id);
                  const n = st?.next[0];
                  return (
                    <tr key={s.id} onClick={() => { setSel(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`cursor-pointer border-t border-slate-100 dark:border-white/10 ${s.id === sel ? 'bg-lagoon/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                      <td className="px-4 py-2.5"><span className="font-semibold">{spotName(s, lang)}</span><span className="muted block text-[11px]">{EMIRATES[s.emirate][lang]}</span></td>
                      <td className="px-2 py-2.5 text-end tabular-nums"><bdi>{st?.level != null ? `${st.level >= 0 ? '+' : ''}${st.level.toFixed(2)}` : '—'}</bdi></td>
                      <td className="px-2 py-2.5"><span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: trendColor(st?.trend ?? null) }}><TrendIcon tr={st?.trend ?? null} size={12} />{st?.trend ? t(trendKey(st.trend)) : ''}</span></td>
                      <td className="px-4 py-2.5 text-end text-xs tabular-nums">{n ? <><span className={n.type === 'high' ? 'text-lagoon dark:text-shallows' : 'text-buoy'}>{t(n.type === 'high' ? 'high_tide' : 'low_tide')}</span> {when(n.at)}</> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p className="muted px-1 text-xs">{t('map_note')}</p>
      </div>
    </AppShell>
  );
}

const xy = ([x, y]: [number, number]) => ({ x, y });

function Spark({ series }: { series: (number | null)[] }) {
  const vals = series.filter((v): v is number => v != null);
  if (vals.length < 2) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals), w = 300, h = 54;
  const pts = series.map((v, i) => (v == null ? null : [(i / (series.length - 1)) * w, 4 + (1 - (v - lo) / (hi - lo || 1)) * (h - 8)] as const)).filter(Boolean) as [number, number][];
  const d = 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-14 w-full" direction="ltr" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L${w},${h} L0,${h} Z`} className="fill-lagoon/10" />
      <path d={d} fill="none" stroke="#0E7C86" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[0][0]} cy={pts[0][1]} r="4" fill="#FF6B35" />
    </svg>
  );
}
