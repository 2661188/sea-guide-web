import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Navigation2 } from 'lucide-react';
import type { Conditions } from '@/lib/marine/types';
import { hourIndex, levelAt } from '@/lib/marine/tides';
import { fmtTime, toLocalMs } from '@/lib/marine/time';
import { compassKey } from '@/lib/marine/weather';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { dayName, fmtDayL } from '@/lib/i18n/strings';
import { smooth } from './TideChart';
import { SourceTag } from './ui';

const HOUR = 3600e3;
const VIEW = 24 * HOUR;
const STEP = 10 * 60e3;

const BFT = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64];
export const beaufort = (kn: number) => BFT.filter((v) => kn >= v).length;

/** Colour of the wind line at a speed: calm teal → orange → red. */
const windColor = (kn: number) => (kn < 12 ? '#0E7C86' : kn < 18 ? '#D99A0B' : kn < 25 ? '#FF6B35' : '#D64545');

/**
 * Week-long wind explorer, twin of the tide explorer: drag the dotted line (or
 * the slider) to read wind, gusts and direction at any time in the forecast.
 */
export function WindExplorer({ data, nowMs }: { data: Conditions; nowMs: number }) {
  const { t, lang } = useT();
  const { time, windSpeed, windGusts, windDirection } = data.hourly;
  const start = toLocalMs(time[0]);
  const end = toLocalMs(time[time.length - 1]);
  const clampT = (v: number) => Math.min(end, Math.max(start, v));
  const nowC = clampT(nowMs);

  const [cursor, setCursor] = useState(nowC);
  const minView = start - VIEW * 0.15, maxView = end - VIEW * 0.85;
  const [viewFrom, setViewFrom] = useState(Math.max(minView, Math.min(maxView, nowC - 6 * HOUR)));
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; c: number; moved: boolean } | null>(null);

  const moveTo = (v: number) => {
    const c = clampT(Math.round(v / STEP) * STEP);
    setCursor(c);
    setViewFrom((vf) => {
      let next = vf;
      if (c < vf + VIEW * 0.15) next = c - VIEW * 0.15;
      if (c > vf + VIEW * 0.85) next = c - VIEW * 0.85;
      return Math.max(minView, Math.min(maxView, next));
    });
  };
  useEffect(() => { moveTo(nowC); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const W = 360, H = 150, padTop = 18, padBot = 26;
  const to = viewFrom + VIEW;
  const hi = useMemo(() => Math.max(20, ...windGusts.filter((v): v is number => v != null), ...windSpeed.filter((v): v is number => v != null)) * 1.08, [windGusts, windSpeed]);
  const x = (ms: number) => ((ms - viewFrom) / VIEW) * W;
  const y = (v: number) => padTop + (1 - v / hi) * (H - padTop - padBot);

  const idx = time.map((s, i) => [toLocalMs(s), i] as const).filter(([ms]) => ms >= viewFrom - 2 * HOUR && ms <= to + 2 * HOUR);
  const windPts = idx.filter(([, i]) => windSpeed[i] != null).map(([ms, i]) => [x(ms), y(windSpeed[i]!)] as [number, number]);
  const gustPts = idx.filter(([, i]) => windGusts[i] != null).map(([ms, i]) => [x(ms), y(windGusts[i]!)] as [number, number]);
  const windLine = smooth(windPts);
  const band = gustPts.length && windPts.length
    ? `${smooth(gustPts)} L${windPts[windPts.length - 1][0].toFixed(1)},${windPts[windPts.length - 1][1].toFixed(1)} ${smooth([...windPts].reverse()).replace(/^M/, 'L')} Z`
    : '';
  const area = windPts.length ? `${windLine} L${windPts[windPts.length - 1][0].toFixed(1)},${H - padBot} L${windPts[0][0].toFixed(1)},${H - padBot} Z` : '';

  const wind = levelAt(time, windSpeed, cursor);
  const gust = levelAt(time, windGusts, cursor);
  const dirDeg = windDirection[hourIndex(time, cursor)];
  const dk = compassKey(dirDeg);
  const b = wind != null ? beaufort(wind) : null;
  const midnights: number[] = [];
  for (let d = Math.ceil(viewFrom / (24 * HOUR)) * 24 * HOUR; d <= to; d += 24 * HOUR) midnights.push(d);
  const arrows = idx.filter(([ms, i]) => new Date(ms).getUTCHours() % 3 === 0 && windDirection[i] != null && ms >= viewFrom && ms <= to);
  const days = Array.from(new Set(time.map((s) => s.slice(0, 10))));

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, c: cursor, moved: false };
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    if (drag.current.moved) moveTo(drag.current.c + (dx / svgRef.current.getBoundingClientRect().width) * VIEW);
  };
  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current && !drag.current.moved && svgRef.current) {
      const r = svgRef.current.getBoundingClientRect();
      moveTo(viewFrom + ((e.clientX - r.left) / r.width) * VIEW);
    }
    drag.current = null;
  };
  const atNow = Math.abs(cursor - nowC) < STEP;

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{t('wind_week')}</p>
        <SourceTag kind="live" />
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400" aria-live="polite">
            {fmtDayL(lang, cursor)} · <span className="tabular-nums">{fmtTime(cursor)}</span>
          </p>
          <p className="readout mt-1 flex items-center gap-2 text-[38px]">
            <Navigation2 size={26} style={{ transform: `rotate(${(dirDeg ?? 0) + 180}deg)`, color: wind != null ? windColor(wind) : undefined }} aria-hidden="true" />
            <bdi>{wind != null ? Math.round(wind) : '—'}</bdi>
            <span className="font-sans text-base font-medium text-slate-400">{t('unit_kn')}</span>
            {gust != null && <span className="ms-1 font-sans text-sm font-medium text-slate-500">{t('gusts', { v: Math.round(gust) })}</span>}
          </p>
          <p className="muted mt-1 text-sm">
            {dk ? t('from_dir', { d: t(dk) }) : '—'}
            {b != null && <> · {t('bft', { n: b, name: t(`bft_${b}` as Key) })}</>}
          </p>
        </div>
        <button onClick={() => moveTo(nowC)} disabled={atNow}
          className="tap flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-lagoon/10 px-3.5 text-sm font-semibold text-lagoon disabled:opacity-40 dark:text-shallows">
          <LocateFixed size={15} /> {t('now_btn')}
        </button>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="mt-3 block w-full cursor-ew-resize touch-pan-y select-none"
        direction="ltr" role="img" aria-label={t('wind_week')}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)}>
        <defs>
          <linearGradient id="wx-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0E7C86" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0E7C86" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[10, 20, 30].filter((v) => v < hi).map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-white/10" strokeWidth="1" strokeDasharray="2 4" />
            <text x={W - 2} y={y(v) - 3} textAnchor="end" className="fill-slate-400 text-[9px] font-semibold">{v} {t('unit_kn')}</text>
          </g>
        ))}
        {midnights.map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={10} y2={H - padBot} className="stroke-slate-200 dark:stroke-white/10" strokeWidth="1" />
            {x(m) < W - 30 && <text x={x(m) + 4} y={9} className="fill-slate-400 text-[10px] font-semibold">{dayName(lang, m)}</text>}
          </g>
        ))}
        <path d={area} fill="url(#wx-fill)" />
        <path d={band} className="fill-buoy/15" />
        <path d={windLine} fill="none" stroke="#0E7C86" strokeWidth="2.4" strokeLinecap="round" className="dark:stroke-shallows" />
        {/* Direction arrows every 3 hours (pointing where the wind blows to) */}
        {arrows.map(([ms, i]) => (
          <g key={ms} transform={`translate(${x(ms)},${H - 11}) rotate(${(windDirection[i] ?? 0) + 180})`}>
            <path d="M0 -6 L3.5 4 L0 2 L-3.5 4 Z" className="fill-slate-400 dark:fill-slate-500" />
          </g>
        ))}
        {wind != null && (
          <g>
            <line x1={x(cursor)} x2={x(cursor)} y1={12} y2={H - padBot + 4} stroke="#0B1B24" className="dark:stroke-white" strokeWidth="1.5" strokeDasharray="3 3" />
            {gust != null && <circle cx={x(cursor)} cy={y(gust)} r="4" fill="#FF6B35" stroke="#fff" strokeWidth="2" />}
            <circle cx={x(cursor)} cy={y(wind)} r="7" fill={windColor(wind)} stroke="#fff" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-lagoon dark:bg-shallows" /> {t('mean_wind')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-buoy/25" /> {t('gust_band')}</span>
      </div>

      <div dir="ltr" className="mt-2">
        <input type="range" min={start} max={end} step={STEP} value={cursor}
          onChange={(e) => moveTo(Number(e.target.value))}
          aria-label={t('wind_slider')} aria-valuetext={`${fmtDayL(lang, cursor)} ${fmtTime(cursor)}`}
          className="tide-slider w-full" />
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400">
          {days.map((d) => <span key={d}>{dayName(lang, toLocalMs(`${d}T00:00`))}</span>)}
        </div>
      </div>
      <p className="muted mt-2 text-xs">{t('wind_hint')}</p>
    </section>
  );
}
