// Infographic building blocks for the Home dashboard. All drawn in SVG/CSS, no
// chart library. Status colours (good / fair / poor) always come with a label.
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Droplets, Eye, Timer, Umbrella } from 'lucide-react';
import type { Conditions } from '@/lib/marine/types';
import type { TideExtreme } from '@/lib/marine/tides';
import { ActivityAssessment, ActivityId, assessActivity, Rating } from '@/lib/marine/activities';
import { dayKey, fmtTime, toLocalMs, untilMsg } from '@/lib/marine/time';
import { weatherInfo } from '@/lib/marine/weather';
import { moonAt } from '@/lib/marine/moon';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { dayName } from '@/lib/i18n/strings';
import { ActivityIcon } from './ActivityIcon';
import { WeatherIcon } from './WeatherIcon';
import { MoonIcon } from './MoonIcon';
import { SourceTag } from './ui';

export const RATE_COLOR: Record<Rating, string> = { good: '#0E9F6E', fair: '#D99A0B', poor: '#D64545', unknown: '#94A3B8' };
const RATE_LABEL: Record<Rating, Key> = { good: 'legend_good', fair: 'legend_fair', poor: 'legend_poor', unknown: 'legend_none' };

function Card({ title, tag, children, className = '' }: { title: string; tag?: 'live' | 'calc' | 'info'; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{title}</p>
        {tag && <SourceTag kind={tag} />}
      </div>
      {children}
    </section>
  );
}

// ---------- Donut: how many sports are good right now ----------
export function SportsDonut({ acts, activity, onPick }: { acts: ActivityAssessment[]; activity: ActivityId; onPick: (a: ActivityId) => void }) {
  const { t } = useT();
  const order: Rating[] = ['good', 'fair', 'poor', 'unknown'];
  const counts = order.map((r) => acts.filter((a) => a.rating === r).length);
  const R = 42, C = 2 * Math.PI * R, GAP = 2.5;
  let acc = 0;
  return (
    <Card title={t('sports_today')} tag="calc">
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={t('sports_split', { good: counts[0], fair: counts[1], poor: counts[2] })}>
            <circle cx="50" cy="50" r={R} fill="none" className="stroke-slate-100 dark:stroke-white/10" strokeWidth="12" />
            {counts.map((n, k) => {
              if (!n) return null;
              const len = (n / acts.length) * C;
              const seg = <circle key={k} cx="50" cy="50" r={R} fill="none" stroke={RATE_COLOR[order[k]]} strokeWidth="12"
                strokeDasharray={`${Math.max(0, len - GAP)} ${C}`} strokeDashoffset={-acc} />;
              acc += len;
              return seg;
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <span><span className="readout block text-4xl text-good">{counts[0]}</span><span className="muted block text-[10px] font-semibold uppercase tracking-wide">{t('of_sports')}</span></span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {order.slice(0, 3).map((r, k) => (
            <li key={r}>
              <p className="flex items-center gap-1.5 text-xs font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: RATE_COLOR[r] }} />{t(RATE_LABEL[r])} <span className="muted tabular-nums">· {counts[k]}</span></p>
              <p className="mt-1 flex flex-wrap gap-1">
                {acts.filter((a) => a.rating === r).map((a) => (
                  <button key={a.id} onClick={() => onPick(a.id)} title={t(`act_${a.id}`)} aria-label={t(`act_${a.id}`)}
                    className={`grid h-7 w-7 place-items-center rounded-lg ${a.id === activity ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                    <ActivityIcon id={a.id} size={15} />
                  </button>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

// ---------- 24-hour strip for the chosen activity ----------
export function HourStrip({ data, activity, i }: { data: Conditions; activity: ActivityId; i: number }) {
  const { t } = useT();
  const [showTable, setShowTable] = useState(false);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, k) => i + k).filter((j) => j < data.hourly.time.length)
    .map((j) => ({ j, at: toLocalMs(data.hourly.time[j]), r: assessActivity(activity, data, j, 1) })), [data, activity, i]);
  // Longest run of good hours
  let best: [number, number] | null = null, run: number | null = null;
  hours.forEach((h, k) => {
    if (h.r.rating === 'good') { run = run ?? k; if (!best || k - run > best[1] - best[0]) best = [run, k]; } else run = null;
  });
  const b = best as [number, number] | null;
  return (
    <Card title={t('hours_today', { activity: t(`act_${activity}`) })} tag="calc">
      {b && <p className="mt-1 text-sm"><span className="font-semibold text-good">{t('best_hours')}:</span> {b[1] - b[0] + 1 >= hours.length ? t('all_day') : <bdi className="tabular-nums">{fmtTime(hours[b[0]].at)}–{fmtTime(hours[b[1]].at + 3600e3)}</bdi>}</p>}
      <div dir="ltr" className="mt-3 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0,1fr))` }}>
        {hours.map((h) => (
          <div key={h.j} title={`${fmtTime(h.at)} · ${t(RATE_LABEL[h.r.rating])}`} className="group relative">
            <div className="h-10 rounded-[4px] transition-transform group-hover:scale-y-110" style={{ background: RATE_COLOR[h.r.rating], opacity: h.r.rating === 'unknown' ? 0.4 : 1 }} />
          </div>
        ))}
      </div>
      <div dir="ltr" className="mt-1 grid text-[10px] font-semibold tabular-nums text-slate-400" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0,1fr))` }}>
        {hours.map((h, k) => <span key={h.j} className="overflow-visible whitespace-nowrap">{k % 3 === 0 ? fmtTime(h.at).slice(0, 2) : ''}</span>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {(['good', 'fair', 'poor'] as Rating[]).map((r) => <span key={r} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RATE_COLOR[r] }} />{t(RATE_LABEL[r])}</span>)}
        <button onClick={() => setShowTable(!showTable)} className="ms-auto text-lagoon underline-offset-2 hover:underline dark:text-shallows">{t('table_view')}</button>
      </div>
      {showTable && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
          <table className="w-full text-xs">
            <tbody>
              {hours.map((h) => (
                <tr key={h.j} className="border-b border-slate-100 last:border-0 dark:border-white/10">
                  <td className="px-3 py-1.5 font-semibold tabular-nums">{fmtTime(h.at)}</td>
                  <td className="px-3 py-1.5"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: RATE_COLOR[h.r.rating] }} />{t(RATE_LABEL[h.r.rating])}</span></td>
                  <td className="muted px-3 py-1.5">{Math.round(data.hourly.windSpeed[h.j] ?? 0)} {t('unit_kn')} · {(data.hourly.waveHeight[h.j] ?? 0).toFixed(1)} {t('unit_m')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------- Radial gauge ----------
function Gauge({ value, max, label, unit, display, color, sub }: { value: number | null; max: number; label: string; unit: string; display: string; color: string; sub?: string }) {
  const r = 36, start = Math.PI * 0.8, sweep = Math.PI * 1.4;
  const pt = (a: number) => [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  const arc = (a0: number, a1: number) => { const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const f = value == null ? 0 : Math.min(1, Math.max(0, value / max));
  return (
    <section className="card flex flex-col items-center p-3 text-center">
      <p className="eyebrow">{label}</p>
      <svg viewBox="0 0 100 82" className="mt-1 w-full max-w-[140px]" aria-hidden="true">
        <path d={arc(start, start + sweep)} fill="none" className="stroke-slate-100 dark:stroke-white/10" strokeWidth="9" strokeLinecap="round" />
        {f > 0 && <path d={arc(start, start + sweep * f)} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />}
        <text x="50" y="52" textAnchor="middle" className="fill-ink font-display text-[22px] font-semibold dark:fill-white">{display}</text>
        <text x="50" y="66" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold">{unit}</text>
      </svg>
      {sub && <p className="muted -mt-1 text-xs">{sub}</p>}
    </section>
  );
}

const uvKey = (v: number): Key => (v < 3 ? 'uv_low' : v < 6 ? 'uv_mod' : v < 8 ? 'uv_high' : v < 11 ? 'uv_vhigh' : 'uv_ext');
const uvColor = (v: number) => (v < 3 ? '#0E9F6E' : v < 6 ? '#D99A0B' : v < 8 ? '#FF6B35' : v < 11 ? '#D64545' : '#7C3AED');

export function Gauges({ data, i }: { data: Conditions; i: number }) {
  const { t } = useT();
  const h = data.hourly;
  const w = h.windSpeed[i], wv = h.waveHeight[i], uv = h.uv?.[i] ?? null;
  return (
    <>
      <Gauge label={t('wind')} value={w} max={35} unit={t('unit_kn')} display={w != null ? `${Math.round(w)}` : '—'}
        color={w == null ? '#94A3B8' : w < 12 ? '#0E7C86' : w < 18 ? '#D99A0B' : '#D64545'} sub={h.windGusts[i] != null ? t('gusts', { v: Math.round(h.windGusts[i]!) }) : undefined} />
      <Gauge label={t('waves')} value={wv} max={2.5} unit={t('unit_m')} display={wv != null ? wv.toFixed(1) : '—'}
        color={wv == null ? '#94A3B8' : wv < 0.6 ? '#0E7C86' : wv < 1.2 ? '#D99A0B' : '#D64545'} sub={h.wavePeriod[i] != null ? t('period', { v: h.wavePeriod[i]!.toFixed(0) }) : undefined} />
      <Gauge label={t('uv')} value={uv} max={12} unit="UV" display={uv != null ? `${Math.round(uv)}` : '—'}
        color={uv == null ? '#94A3B8' : uvColor(uv)} sub={uv != null ? t(uvKey(uv)) : undefined} />
    </>
  );
}

// ---------- Compass rose (wind + waves) ----------
export function Compass({ data, i }: { data: Conditions; i: number }) {
  const { t } = useT();
  const wd = data.hourly.windDirection[i], vd = data.hourly.waveDirection[i];
  const labels = ['N', 'E', 'S', 'W'] as const;
  const keys: Key[] = ['dir_N', 'dir_E', 'dir_S', 'dir_W'];
  return (
    <section className="card flex flex-col items-center p-3 text-center">
      <p className="eyebrow">{t('compass')}</p>
      <svg viewBox="0 0 100 100" className="mt-1 w-full max-w-[130px]" direction="ltr" role="img" aria-label={t('compass')}>
        <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-200 dark:stroke-white/15" strokeWidth="1.5" />
        {Array.from({ length: 16 }, (_, k) => {
          const a = (k * 22.5 * Math.PI) / 180, l = k % 4 === 0 ? 6 : 3;
          return <line key={k} x1={50 + 40 * Math.sin(a)} y1={50 - 40 * Math.cos(a)} x2={50 + (40 - l) * Math.sin(a)} y2={50 - (40 - l) * Math.cos(a)} className="stroke-slate-300 dark:stroke-white/25" strokeWidth="1.2" />;
        })}
        {labels.map((l, k) => {
          const a = (k * 90 * Math.PI) / 180;
          return <text key={l} x={50 + 29 * Math.sin(a)} y={50 - 29 * Math.cos(a) + 3.5} textAnchor="middle" className={`text-[10px] font-bold ${k === 0 ? 'fill-buoy' : 'fill-slate-400'}`}>{t(keys[k]).slice(0, 2)}</text>;
        })}
        {vd != null && (
          <g transform={`rotate(${vd + 180} 50 50)`}>
            <path d="M50 22 L54 50 L46 50 Z" className="fill-sky-400/70" />
          </g>
        )}
        {wd != null && (
          <g transform={`rotate(${wd + 180} 50 50)`}>
            <path d="M50 16 L55.5 52 L50 47 L44.5 52 Z" fill="#0E7C86" className="dark:fill-shallows" />
            <circle cx="50" cy="50" r="3.5" className="fill-abyss dark:fill-white" />
          </g>
        )}
      </svg>
      <p className="muted text-xs">
        <span className="font-semibold text-lagoon dark:text-shallows">{t('wind')}</span> {wd != null ? t('from_dir', { d: t((['dir_N', 'dir_NE', 'dir_E', 'dir_SE', 'dir_S', 'dir_SW', 'dir_W', 'dir_NW'] as Key[])[Math.round(wd / 45) % 8]) }) : '—'}
      </p>
    </section>
  );
}

// ---------- Daylight arc + moon ----------
export function Daylight({ data, nowMs }: { data: Conditions; nowMs: number }) {
  const { t } = useT();
  const d = Math.max(0, data.daily.date.indexOf(dayKey(nowMs)));
  const sr = data.daily.sunrise[d], ss = data.daily.sunset[d];
  const moon = moonAt(Date.now());
  if (!sr || !ss) return null;
  const a = toLocalMs(sr), b = toLocalMs(ss);
  const f = Math.min(1, Math.max(0, (nowMs - a) / (b - a)));
  const up = nowMs >= a && nowMs <= b;
  const left = Math.max(0, b - nowMs), lh = Math.floor(left / 3600e3), lm = Math.round((left % 3600e3) / 60000);
  const ang = Math.PI * (1 - f);
  const sx = 50 + 38 * Math.cos(ang), sy = 52 - 38 * Math.sin(ang);
  return (
    <section className="card flex flex-col items-center p-3 text-center">
      <p className="eyebrow">{t('daylight')}</p>
      <svg viewBox="0 0 100 66" className="mt-1 w-full max-w-[140px]" direction="ltr" aria-hidden="true">
        <path d="M12 52 A38 38 0 0 1 88 52" fill="none" className="stroke-slate-200 dark:stroke-white/15" strokeWidth="2" strokeDasharray="3 3" />
        {up && <path d={`M12 52 A38 38 0 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)}`} fill="none" stroke="#F5B301" strokeWidth="3" strokeLinecap="round" />}
        <line x1="4" x2="96" y1="52" y2="52" className="stroke-slate-300 dark:stroke-white/20" strokeWidth="1.5" />
        {up && <circle cx={sx} cy={sy} r="6" fill="#F5B301" stroke="#fff" strokeWidth="2" />}
        <text x="12" y="63" textAnchor="middle" className="fill-slate-400 text-[8.5px] font-semibold">{sr.slice(11, 16)}</text>
        <text x="88" y="63" textAnchor="middle" className="fill-slate-400 text-[8.5px] font-semibold">{ss.slice(11, 16)}</text>
      </svg>
      <p className="muted text-xs">{up ? t('daylight_left', { h: lh, m: lm }) : nowMs < a ? t('before_dawn') : t('after_dark')}</p>
      <p className="mt-2 flex items-center gap-2 text-xs"><MoonIcon fraction={moon.fraction} size={22} /><span className="font-semibold">{t(moon.name)}</span><span className="muted">{t('lit', { v: Math.round(moon.illumination * 100) })}</span></p>
    </section>
  );
}

// ---------- Air vs sea temperature + small stats ----------
export function Temps({ data, i }: { data: Conditions; i: number }) {
  const { t } = useT();
  const h = data.hourly;
  const air = h.airTemp[i], sea = h.seaTemp[i];
  const bar = (v: number | null, color: string) => (
    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
      <span className="block h-full rounded-full" style={{ width: `${v == null ? 0 : Math.min(100, Math.max(4, ((v - 10) / 40) * 100))}%`, background: color }} />
    </span>
  );
  const vis = h.visibility[i];
  return (
    <section className="card p-3">
      <p className="eyebrow text-center">{t('temps')}</p>
      <div className="mt-3 space-y-2.5 text-xs">
        <p className="flex items-center gap-2"><span className="w-9 font-semibold">{t('air')}</span>{bar(air, '#FF6B35')}<span className="readout w-10 text-end text-base">{air != null ? Math.round(air) : '—'}°</span></p>
        <p className="flex items-center gap-2"><span className="w-9 font-semibold">{t('sea')}</span>{bar(sea, '#0E7C86')}<span className="readout w-10 text-end text-base">{sea != null ? sea.toFixed(1) : '—'}°</span></p>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2.5 text-center text-[11px] dark:border-white/10">
        <div><dt className="muted flex justify-center"><Droplets size={13} /></dt><dd className="mt-0.5 font-semibold tabular-nums">{h.humidity[i] != null ? `${Math.round(h.humidity[i]!)}%` : '—'}</dd></div>
        <div><dt className="muted flex justify-center"><Eye size={13} /></dt><dd className="mt-0.5 font-semibold tabular-nums">{vis != null ? (vis >= 10000 ? '10+' : (vis / 1000).toFixed(1)) : '—'} {t('unit_km')}</dd></div>
        <div><dt className="muted flex justify-center"><Umbrella size={13} /></dt><dd className="mt-0.5 font-semibold tabular-nums">{h.precipProb[i] ?? 0}%</dd></div>
      </dl>
    </section>
  );
}

// ---------- Tide table ----------
export function TideTable({ extremes, nowMs }: { extremes: TideExtreme[]; nowMs: number }) {
  const { t, tm, lang } = useT();
  const rows = extremes.filter((e) => e.at > nowMs).slice(0, 6);
  return (
    <Card title={t('tide_table')} tag="calc">
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-start text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-1.5 text-start font-semibold">{t('type')}</th>
            <th className="py-1.5 text-start font-semibold">{t('time')}</th>
            <th className="py-1.5 text-end font-semibold">{t('height')}</th>
            <th className="py-1.5 text-end font-semibold">{t('in_label')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.at} className="border-t border-slate-100 dark:border-white/10">
              <td className="py-2">
                <span className={`inline-flex items-center gap-1 font-semibold ${e.type === 'high' ? 'text-lagoon dark:text-shallows' : 'text-buoy'}`}>
                  {e.type === 'high' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{t(e.type === 'high' ? 'high_tide' : 'low_tide')}
                </span>
              </td>
              <td className="py-2 tabular-nums">{dayKey(e.at) !== dayKey(nowMs) && <span className="muted me-1 text-xs">{dayName(lang, e.at)}</span>}{fmtTime(e.at)}</td>
              <td className="py-2 text-end tabular-nums"><bdi>{e.height >= 0 ? '+' : ''}{e.height.toFixed(2)}</bdi> {t('unit_m')}</td>
              <td className="muted py-2 text-end text-xs">{tm(untilMsg(e.at, nowMs)).replace(/^in /, '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ---------- 7-day outlook table ----------
export function WeekOutlook({ data, activity }: { data: Conditions; activity: ActivityId }) {
  const { t, lang } = useT();
  const h = data.hourly;
  const days = useMemo(() => {
    const out: { key: string; ms: number; wind: number | null; gust: number | null; wave: number | null; code: number | null; rating: Rating }[] = [];
    const byDay = new Map<string, number[]>();
    h.time.forEach((s, j) => { const k = s.slice(0, 10); byDay.set(k, [...(byDay.get(k) ?? []), j]); });
    for (const [k, idx] of Array.from(byDay.entries())) {
      const day = idx.filter((j) => { const hr = +h.time[j].slice(11, 13); return hr >= 8 && hr <= 17; });
      const num = (arr: (number | null)[]) => day.map((j) => arr[j]).filter((v): v is number => v != null);
      const w = num(h.windSpeed), g = num(h.windGusts), v = num(h.waveHeight);
      const codes = num(h.weatherCode);
      const noon = idx.find((j) => h.time[j].slice(11, 13) === '09') ?? idx[0];
      out.push({
        key: k, ms: toLocalMs(`${k}T12:00`),
        wind: w.length ? Math.max(...w) : null, gust: g.length ? Math.max(...g) : null, wave: v.length ? Math.max(...v) : null,
        code: codes.length ? Math.max(...codes) : null,
        rating: assessActivity(activity, data, noon, 8).rating,
      });
    }
    return out.slice(0, 7);
  }, [data, activity, h]);
  const maxW = Math.max(25, ...days.map((d) => d.gust ?? d.wind ?? 0));
  return (
    <Card title={t('week_outlook')} tag="calc">
      <div className="-mx-1 mt-2 overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-1 py-1.5 text-start font-semibold">{t('day')}</th>
              <th className="px-1 py-1.5 font-semibold" />
              <th className="px-1 py-1.5 text-start font-semibold">{t('max_wind')} ({t('unit_kn')})</th>
              <th className="px-1 py-1.5 text-end font-semibold">{t('max_waves')}</th>
              <th className="px-1 py-1.5 text-end font-semibold"><span className="inline-flex"><ActivityIcon id={activity} size={14} /></span></th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, k) => {
              const wx = weatherInfo(d.code);
              return (
                <tr key={d.key} className="border-t border-slate-100 dark:border-white/10">
                  <td className="px-1 py-2 font-semibold">{k === 0 ? t('today') : dayName(lang, d.ms)}</td>
                  <td className="px-1 py-2 text-slate-500"><WeatherIcon kind={wx?.kind} size={18} /></td>
                  <td className="px-1 py-2">
                    <span dir="ltr" className="flex items-center gap-1.5">
                      <span className="relative h-2 w-full max-w-[110px] overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <span className="absolute inset-y-0 start-0 rounded-full bg-buoy/30" style={{ width: `${((d.gust ?? 0) / maxW) * 100}%` }} />
                        <span className="absolute inset-y-0 start-0 rounded-full bg-lagoon" style={{ width: `${((d.wind ?? 0) / maxW) * 100}%` }} />
                      </span>
                      <span className="w-12 shrink-0 text-xs font-semibold tabular-nums">{d.wind != null ? Math.round(d.wind) : '—'}<span className="text-slate-400">/{d.gust != null ? Math.round(d.gust) : '—'}</span></span>
                    </span>
                  </td>
                  <td className="px-1 py-2 text-end text-xs font-semibold tabular-nums">{d.wave != null ? d.wave.toFixed(1) : '—'} {t('unit_m')}</td>
                  <td className="px-1 py-2 text-end">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: RATE_COLOR[d.rating] }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: RATE_COLOR[d.rating] }} />{t(RATE_LABEL[d.rating])}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted mt-2 flex items-center gap-1 text-[11px]"><Timer size={12} /> 08:00–17:00</p>
    </Card>
  );
}
