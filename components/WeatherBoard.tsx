// "Weather now" board: one large weather card (now, 7 days, hourly curve) and
// small cards for wind, humidity, visibility, pressure, air quality, UV, sun and sea.
// Everything comes from the forecast model; each card says "No data" rather than guessing.
import { useEffect, useMemo, useState } from 'react';
import { Droplets, Eye, Gauge as GaugeIcon, Sun, Sunrise, Sunset, Waves, Wind as WindIcon } from 'lucide-react';
import type { Conditions } from '@/lib/marine/types';
import { weatherInfo, compassKey } from '@/lib/marine/weather';
import { dayKey, fmtTime, toLocalMs } from '@/lib/marine/time';
import { moonAt } from '@/lib/marine/moon';
import {
  AQI_COLOR, aqiClass, beaufort, bfTone, daySummaries, dewClass, dewPointFrom, dewTone, DUSTY, fmtTemp, knToKmh,
  pressTone, pressureTrend, TempUnit, Tone, toUnit, UV_COLOR, uvClass, uvPeak, visClass, visText, visTone,
} from '@/lib/marine/wxcalc';
import { load, save } from '@/lib/storage';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { dayName } from '@/lib/i18n/strings';
import { WeatherIcon } from './WeatherIcon';
import { MoonIcon } from './MoonIcon';
import { SourceTag } from './ui';

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-good', ok: 'text-lagoon dark:text-shallows', caution: 'text-amber-600 dark:text-amber-300', bad: 'text-bad', severe: 'text-bad', none: 'text-slate-400',
};

// ---------- temperature unit (per phone) ----------
const unitSubs = new Set<(u: TempUnit) => void>();
function useTempUnit(): [TempUnit, (u: TempUnit) => void] {
  const [u, setU] = useState<TempUnit>('C');
  useEffect(() => { setU(load<TempUnit>('tempUnit', 'C')); unitSubs.add(setU); return () => { unitSubs.delete(setU); }; }, []);
  return [u, (v) => { save('tempUnit', v); unitSubs.forEach((f) => f(v)); }];
}

function Tile({ title, icon, children, className = '' }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card flex min-h-[168px] flex-col p-4 ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-white"><span className="text-lagoon dark:text-shallows">{icon}</span>{title}</p>
      {children}
    </section>
  );
}
const Big = ({ v, unit }: { v: string; unit?: string }) => (
  <p className="mt-2 leading-none"><bdi className="readout text-[40px]">{v}</bdi>{unit && <span className="ms-1 text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>}</p>
);
const Label = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => <p className={`mt-1.5 text-sm font-bold ${TONE_TEXT[tone]}`}>{children}</p>;
const Note = ({ children }: { children: React.ReactNode }) => <p className="muted mt-auto pt-2 text-xs leading-snug">{children}</p>;

// Arc gauge (240°) with a coloured scale and a marker.
function Arc({ f, stops, size = 92 }: { f: number | null; stops: string[]; size?: number }) {
  const r = 38, a0 = (150 * Math.PI) / 180, sweep = (240 * Math.PI) / 180;
  const pt = (a: number) => [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  const seg = (i: number) => {
    const s = a0 + (sweep * i) / stops.length + 0.05, e = a0 + (sweep * (i + 1)) / stops.length - 0.05;
    const [x0, y0] = pt(s), [x1, y1] = pt(e);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const m = f == null ? null : pt(a0 + sweep * Math.min(1, Math.max(0, f)));
  return (
    <svg viewBox="0 0 100 92" width={size} height={size * 0.92} aria-hidden="true" className="shrink-0">
      {stops.map((c, i) => <path key={i} d={seg(i)} stroke={c} strokeWidth="8" fill="none" strokeLinecap="round" opacity={0.9} />)}
      {m && <circle cx={m[0]} cy={m[1]} r="7" fill="#fff" stroke="#06283D" strokeWidth="3" className="dark:stroke-white dark:fill-abyss" />}
    </svg>
  );
}

export function WeatherBoard({ data, i, nowMs, placeName }: { data: Conditions; i: number; nowMs: number; placeName: string }) {
  const { t, lang } = useT();
  const [unit, setUnit] = useTempUnit();
  const days = useMemo(() => daySummaries(data), [data]);
  const today = dayKey(nowMs);
  const [sel, setSel] = useState(today);
  const day = days.find((d) => d.date === sel) ?? days[0];
  const h = data.hourly;

  const air = h.airTemp[i];
  const wx = weatherInfo(h.weatherCode[i]);
  const todaySum = days.find((d) => d.date === today);

  // ---- hourly curve for the selected day ----
  const curve = useMemo(() => {
    if (!day) return null;
    const pts = day.idx.map((k) => ({ ms: toLocalMs(h.time[k]), v: h.airTemp[k], rain: h.precipProb[k] })).filter((p) => p.v != null) as { ms: number; v: number; rain: number | null }[];
    if (pts.length < 2) return null;
    const vs = pts.map((p) => toUnit(p.v, unit));
    const lo = Math.floor(Math.min(...vs) - 1), hi = Math.ceil(Math.max(...vs) + 1);
    const W = 600, H = 150, top = 30, bot = 118;
    const x = (k: number) => 30 + (k * (W - 60)) / (pts.length - 1);
    const y = (v: number) => bot - ((v - lo) / Math.max(1, hi - lo)) * (bot - top);
    const line = vs.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(pts.length - 1).toFixed(1)} ${bot + 12} L${x(0).toFixed(1)} ${bot + 12} Z`;
    const nowK = sel === today ? pts.findIndex((p, k) => p.ms <= nowMs && (pts[k + 1]?.ms ?? Infinity) > nowMs) : -1;
    return { pts, vs, x, y, line, area, nowK, W, H, bot };
  }, [day, h, unit, sel, today, nowMs]);

  // ---- small-card values ----
  const w = h.windSpeed[i], g = h.windGusts[i], wd = h.windDirection[i];
  const bf = beaufort(w);
  const rh = h.humidity[i];
  const dp = h.dewPoint?.[i] ?? (air != null && rh != null ? dewPointFrom(air, rh) : null);
  const dc = dewClass(dp);
  const vis = h.visibility[i], vc = visClass(vis);
  const pr = h.pressure?.[i] ?? null, pt = pressureTrend(h.pressure, i);
  const aqi = h.aqi?.[i] ?? null, ac = aqiClass(aqi), dust = h.dust?.[i] ?? null;
  const uv = h.uv?.[i] ?? null, uc = uvClass(uv), peak = uvPeak(data, nowMs);
  const dIdx = Math.max(0, data.daily.date.indexOf(today));
  const sr = data.daily.sunrise[dIdx], ss = data.daily.sunset[dIdx];
  const moon = moonAt(Date.now());
  const dir = (deg: number | null) => { const k = compassKey(deg); return k ? t(k) : '—'; };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
      {/* ================= MAIN WEATHER CARD ================= */}
      <section className="card col-span-2 overflow-hidden md:row-span-2">
        <div className="flex items-start justify-between gap-3 p-4 pb-0 md:p-5 md:pb-0">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink dark:text-white">{placeName}</p>
            <p className="muted text-xs">{t('wb_local', { t: fmtTime(nowMs) })}</p>
          </div>
          <div role="radiogroup" aria-label={t('wb_unit_c') + ' / ' + t('wb_unit_f')} className="flex shrink-0 rounded-xl bg-slate-100 p-1 dark:bg-white/10" dir="ltr">
            {(['C', 'F'] as TempUnit[]).map((u) => (
              <button key={u} role="radio" aria-checked={unit === u} aria-label={t(u === 'C' ? 'wb_unit_c' : 'wb_unit_f')} onClick={() => setUnit(u)}
                className={`tap h-9 w-10 rounded-lg text-sm font-bold ${unit === u ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'text-slate-500'}`}>°{u}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 px-4 pt-3 md:px-5">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-buoy text-white shadow-md">
            <WeatherIcon kind={wx?.kind} size={44} />
          </span>
          <p className="leading-none"><bdi className="readout text-[64px] text-ink dark:text-white">{fmtTemp(air, unit)}</bdi><span className="align-top text-2xl font-semibold">°{unit}</span></p>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{wx ? t(wx.key) : t('wb_na')}</p>
            {todaySum && <p className="text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-300">{t('wb_hi')} {fmtTemp(todaySum.hi, unit)}° · {t('wb_lo')} {fmtTemp(todaySum.lo, unit)}°</p>}
            {h.feelsLike?.[i] != null && <p className="muted text-xs">{t('wb_feels', { v: fmtTemp(h.feelsLike[i], unit) })}</p>}
          </div>
        </div>

        {/* days */}
        <div role="tablist" aria-label={t('wb_title')} className="mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar md:px-5">
          {days.map((d) => {
            const info = weatherInfo(d.code);
            const on = d.date === (day?.date ?? '');
            return (
              <button key={d.date} role="tab" aria-selected={on} onClick={() => setSel(d.date)}
                className={`tap flex min-w-[72px] shrink-0 flex-col items-center rounded-2xl px-2 py-2 ${on ? 'bg-lagoon/10 ring-1 ring-lagoon/40 dark:bg-white/10 dark:ring-shallows/40' : ''}`}>
                <span className="text-xs font-semibold">{d.date === today ? t('wb_today') : dayName(lang, d.ms)}</span>
                <WeatherIcon kind={info?.kind} size={24} className="my-1 text-buoy" />
                <span className="text-xs tabular-nums"><b>{fmtTemp(d.hi, unit)}°</b> <span className="muted">{fmtTemp(d.lo, unit)}°</span></span>
              </button>
            );
          })}
        </div>

        {/* hourly curve */}
        {curve && (
          <figure className="px-2 pb-3 pt-1 md:px-3">
            <figcaption className="sr-only">{t('wb_hourly')}</figcaption>
            <svg viewBox={`0 0 ${curve.W} ${curve.H + 20}`} className="w-full" direction="ltr" role="img" aria-label={t('wb_hourly')}>
              <defs>
                <linearGradient id="wbfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF6B35" stopOpacity=".35" /><stop offset="1" stopColor="#FF6B35" stopOpacity="0" /></linearGradient>
              </defs>
              <path d={curve.area} fill="url(#wbfill)" />
              <path d={curve.line} fill="none" stroke="#FF6B35" strokeWidth="3" strokeLinejoin="round" />
              {curve.pts.map((p, k) => (k % 3 === 0 ? (
                <g key={k}>
                  <text x={curve.x(k)} y={curve.y(curve.vs[k]) - 9} textAnchor="middle" className="fill-ink text-[17px] font-semibold dark:fill-white">{Math.round(curve.vs[k])}°</text>
                  <text x={curve.x(k)} y={curve.H + 14} textAnchor="middle" className="fill-slate-400 text-[15px] font-semibold">{fmtTime(p.ms)}</text>
                  {p.rain != null && p.rain >= 20 && <text x={curve.x(k)} y={curve.bot + 10} textAnchor="middle" className="fill-sky-600 text-[13px] font-semibold">{p.rain}%</text>}
                </g>
              ) : null))}
              {curve.nowK >= 0 && (
                <g>
                  <line x1={curve.x(curve.nowK)} x2={curve.x(curve.nowK)} y1="18" y2={curve.bot + 12} stroke="#06283D" strokeDasharray="4 4" strokeWidth="2" className="dark:stroke-white" />
                  <circle cx={curve.x(curve.nowK)} cy={curve.y(curve.vs[curve.nowK])} r="6" fill="#06283D" stroke="#fff" strokeWidth="2" />
                </g>
              )}
            </svg>
          </figure>
        )}
      </section>

      {/* ================= WIND ================= */}
      <Tile title={t('wb_wind')} icon={<WindIcon size={16} />}>
        <div className="mt-2 flex items-center gap-3">
          <svg viewBox="0 0 100 100" width="76" height="76" direction="ltr" aria-hidden="true" className="shrink-0">
            <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-200 dark:stroke-white/15" strokeWidth="6" />
            {['N', 'E', 'S', 'W'].map((l, k) => <text key={l} x={50 + 29 * Math.sin((k * Math.PI) / 2)} y={50 - 29 * Math.cos((k * Math.PI) / 2) + 4} textAnchor="middle" className={`text-[11px] font-bold ${k === 0 ? 'fill-buoy' : 'fill-slate-400'}`}>{l}</text>)}
            {wd != null && <g transform={`rotate(${wd + 180} 50 50)`}><path d="M50 14 L57 54 L50 48 L43 54 Z" fill="#0E7C86" /></g>}
          </svg>
          <div className="min-w-0">
            <p className="leading-none"><bdi className="readout text-[34px]">{w != null ? Math.round(w) : '—'}</bdi><span className="ms-1 text-xs font-medium text-slate-500">{t('unit_kn')}</span></p>
            {w != null && <p className="muted text-[11px] tabular-nums">{Math.round(knToKmh(w))} km/h</p>}
            <p className="mt-1 whitespace-nowrap text-xs"><span className="muted">{t('wb_gusts')}</span> <b className="tabular-nums">{g != null ? `${Math.round(g)} ${t('unit_kn')}` : '—'}</b></p>
          </div>
        </div>
        <Label tone={bfTone(bf)}>{bf != null ? `${t('wb_force', { f: bf })} · ${t(`bf_${bf}` as Key)}` : t('wb_na')}</Label>
        <Note>{wd != null ? t('wb_from', { d: dir(wd) }) : ''}</Note>
      </Tile>

      {/* ================= HUMIDITY ================= */}
      <Tile title={t('wb_humidity')} icon={<Droplets size={16} />}>
        <div className="mt-2 flex items-end gap-3">
          <div className="flex h-16 items-end gap-1" dir="ltr" aria-hidden="true">
            {Array.from({ length: 8 }, (_, k) => {
              const on = rh != null && (k + 1) / 8 <= rh / 100 + 0.0625;
              return <span key={k} className={`w-2 rounded-full ${on ? 'bg-sky-500' : 'bg-slate-200 dark:bg-white/10'}`} style={{ height: `${40 + k * 8}%` }} />;
            })}
          </div>
          <div>
            <p className="leading-none"><bdi className="readout text-[34px]">{rh != null ? Math.round(rh) : '—'}</bdi><span className="text-sm font-medium text-slate-500">%</span></p>
          </div>
        </div>
        <p className="muted mt-2 text-xs">{t('wb_dew')} <b className="text-ink dark:text-white">{fmtTemp(dp, unit)}°</b></p>
        <Label tone={dc ? dewTone[dc] : 'none'}>{dc ? t(`dew_${dc}` as Key) : t('wb_na')}</Label>
      </Tile>

      {/* ================= VISIBILITY ================= */}
      <Tile title={t('wb_vis')} icon={<Eye size={16} />}>
        <div className="flex items-end justify-between gap-2">
          {vis != null ? <Big v={visText(vis).km} unit={t('unit_km')} /> : <Big v="—" />}
          <div className="mb-1 flex w-16 flex-col gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((k) => {
              const lit = vc ? 5 - ['excellent', 'good', 'moderate', 'poor', 'fog'].indexOf(vc) : 0;
              return <span key={k} className={`h-1.5 rounded-full ${4 - k < lit ? 'bg-good' : 'bg-slate-200 dark:bg-white/10'}`} style={{ width: `${60 + k * 10}%`, marginInlineStart: 'auto' }} />;
            })}
          </div>
        </div>
        {vis != null && <p className="muted text-[11px] tabular-nums">≈ {visText(vis).nm} NM</p>}
        <Label tone={vc ? visTone[vc] : 'none'}>{vc ? t(`vis_${vc}` as Key) : t('wb_na')}</Label>
        {vc && <Note>{t(`visn_${vc}` as Key)}</Note>}
      </Tile>

      {/* ================= PRESSURE ================= */}
      <Tile title={t('wb_pressure')} icon={<GaugeIcon size={16} />}>
        <Big v={pr != null ? `${Math.round(pr)}` : '—'} unit="hPa" />
        {pr != null && (
          <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-sky-300 via-lagoon to-violet-500" dir="ltr" aria-hidden="true">
            <span className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-abyss shadow" style={{ left: `${Math.min(100, Math.max(0, ((pr - 980) / 60) * 100))}%` }} />
          </div>
        )}
        <Label tone={pt ? pressTone[pt.trend] : 'none'}>{pt ? t(`pt_${pt.trend}` as Key) : t('wb_na')}</Label>
        {pt && <Note>{pt.trend === 'falling_fast' ? t('ptn_falling_fast') : t('wb_3h', { v: `${pt.change > 0 ? '+' : ''}${pt.change.toFixed(1)}` })}</Note>}
      </Tile>

      {/* ================= AIR QUALITY ================= */}
      <Tile title={t('wb_aqi')} icon={<WindIcon size={16} />}>
        {ac ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <Big v={`${Math.round(aqi!)}`} unit="AQI" />
              <Arc f={aqi! / 300} stops={[AQI_COLOR.good, AQI_COLOR.moderate, AQI_COLOR.sensitive, AQI_COLOR.unhealthy, AQI_COLOR.very_unhealthy, AQI_COLOR.hazardous]} size={78} />
            </div>
            <p className="mt-1 text-sm font-bold" style={{ color: AQI_COLOR[ac] }}>{t(`aqi_${ac}` as Key)}</p>
            <Note>{dust != null && dust >= DUSTY ? t('wb_dusty') : dust != null ? t('wb_dust', { v: Math.round(dust) }) : ''}</Note>
          </>
        ) : <Note>{t('wb_air_na')}</Note>}
      </Tile>

      {/* ================= UV ================= */}
      <Tile title={t('wb_uv')} icon={<Sun size={16} />}>
        <div className="flex items-center justify-between gap-2">
          <Big v={uv != null ? `${Math.round(uv)}` : '—'} />
          <Arc f={uv == null ? null : uv / 12} stops={[UV_COLOR.low, UV_COLOR.moderate, UV_COLOR.high, UV_COLOR.very_high, UV_COLOR.extreme]} size={78} />
        </div>
        <p className="mt-1 text-sm font-bold" style={{ color: uc ? UV_COLOR[uc] : undefined }}>{uc ? t(`uvc_${uc}` as Key) : t('wb_na')}</p>
        <Note>{uc && uc !== 'low' ? t('uvn_high') : uc ? t('uvn_low') : ''}{peak != null ? ` · ${t('wb_uv_peak', { t: fmtTime(peak) })}` : ''}</Note>
      </Tile>

      {/* ================= SUN ================= */}
      <Tile title={t('wb_sun')} icon={<Sunrise size={16} />}>
        {sr && ss ? (() => {
          const a = toLocalMs(sr), b = toLocalMs(ss), f = Math.min(1, Math.max(0, (nowMs - a) / (b - a)));
          const len = b - a, lh = Math.floor(len / 3600e3), lm = Math.round((len % 3600e3) / 60000);
          const ang = Math.PI * (1 - f), sx = 50 + 38 * Math.cos(ang), sy = 48 - 34 * Math.sin(ang);
          const up = nowMs >= a && nowMs <= b;
          return (
            <>
              <svg viewBox="0 0 100 56" className="mt-1 w-full" direction="ltr" aria-hidden="true">
                <path d="M12 48 A38 34 0 0 1 88 48" fill="none" className="stroke-slate-200 dark:stroke-white/15" strokeWidth="3" strokeDasharray="4 4" />
                <line x1="4" x2="96" y1="48" y2="48" className="stroke-slate-300 dark:stroke-white/20" strokeWidth="1.5" />
                {up && <circle cx={sx} cy={sy} r="6" fill="#F5B301" stroke="#fff" strokeWidth="2" />}
              </svg>
              <div className="flex justify-between text-xs" dir="ltr">
                <span><Sunrise size={13} className="inline text-amber-500" /> <b className="tabular-nums">{sr.slice(11, 16)}</b></span>
                <span><b className="tabular-nums">{ss.slice(11, 16)}</b> <Sunset size={13} className="inline text-buoy" /></span>
              </div>
              <Note>{t('wb_daylen', { h: lh, m: lm })}</Note>
              <p className="muted mt-1 flex items-center gap-1.5 text-xs"><MoonIcon fraction={moon.fraction} size={14} /> {t(moon.name)}</p>
            </>
          );
        })() : <Note>{t('wb_na')}</Note>}
      </Tile>

      {/* ================= SEA ================= */}
      <Tile title={t('wb_sea')} icon={<Waves size={16} />}>
        <Big v={h.seaTemp[i] != null ? h.seaTemp[i]!.toFixed(0) : '—'} unit={`°C ${t('sea_temp').toLowerCase()}`} />
        <p className="mt-2 text-sm"><span className="muted">{t('waves')}</span> <b className="tabular-nums">{h.waveHeight[i] != null ? `${h.waveHeight[i]!.toFixed(1)} ${t('unit_m')}` : '—'}</b></p>
        <Note>{h.wavePeriod[i] != null ? t('wb_period', { v: h.wavePeriod[i]!.toFixed(0) }) : ''}{h.waveDirection[i] != null ? ` · ${t('wb_from', { d: dir(h.waveDirection[i]) })}` : ''}</Note>
      </Tile>
    </div>
  );
}

export function WeatherBoardSection(props: { data: Conditions; i: number; nowMs: number; placeName: string }) {
  const { t } = useT();
  return (
    <section aria-label={t('wb_title')} className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="eyebrow">{t('wb_title')}</h2>
        <SourceTag kind="live" />
      </div>
      <WeatherBoard {...props} />
      <p className="px-1 text-[11px] text-slate-400">{props.data.source.name}{props.data.air ? ` · ${props.data.air.name}` : ''}</p>
    </section>
  );
}
