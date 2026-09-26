import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, LocateFixed, Minus } from 'lucide-react';
import type { Conditions } from '@/lib/marine/types';
import { levelAt, TideExtreme } from '@/lib/marine/tides';
import { dayKey, fmtTime, toLocalMs } from '@/lib/marine/time';
import { useT } from '@/lib/i18n/LangContext';
import { dayName, fmtDayL } from '@/lib/i18n/strings';
import { smooth } from './TideChart';
import { SourceTag } from './ui';

const HOUR = 3600e3;
const VIEW = 24 * HOUR; // visible span of the chart
const STEP = 10 * 60e3; // slider step: 10 minutes

/**
 * Week-long tide explorer: a dotted line the user drags (on the chart or the
 * slider) to read the tide height and direction at any time in the forecast.
 */
export function TideExplorer({ data, extremes, nowMs }: { data: Conditions; extremes: TideExtreme[]; nowMs: number }) {
  const { t, lang } = useT();
  const { time, seaLevel } = data.hourly;
  const start = toLocalMs(time[0]);
  const end = toLocalMs(time[time.length - 1]);
  const clampT = (v: number) => Math.min(end, Math.max(start, v));
  const nowC = clampT(nowMs);

  const [cursor, setCursor] = useState(nowC);
  const minView = start - VIEW * 0.15, maxView = end - VIEW * 0.85;
  const [viewFrom, setViewFrom] = useState(Math.max(minView, Math.min(maxView, nowC - 6 * HOUR)));
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; c: number; moved: boolean } | null>(null);

  // Keep the dotted line inside the visible window, panning when it nears an edge.
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
  useEffect(() => { moveTo(nowC); /* reset when the spot or data changes */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const W = 360, H = 150, padTop = 26, padBot = 22;
  const to = viewFrom + VIEW;
  const pts = useMemo(() => time
    .map((s, i) => [toLocalMs(s), seaLevel[i]] as const)
    .filter(([ms, v]) => v != null) as [number, number][], [time, seaLevel]);
  const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
  const span = Math.max(hi - lo, 0.2);
  const x = (ms: number) => ((ms - viewFrom) / VIEW) * W;
  const y = (v: number) => padTop + (1 - (v - lo) / span) * (H - padTop - padBot);
  const vis = pts.filter(([ms]) => ms >= viewFrom - 2 * HOUR && ms <= to + 2 * HOUR).map(([ms, v]) => [x(ms), y(v)] as [number, number]);
  const line = smooth(vis);
  const area = vis.length ? `${line} L${vis[vis.length - 1][0].toFixed(1)},${H} L${vis[0][0].toFixed(1)},${H} Z` : '';

  const level = levelAt(time, seaLevel, cursor);
  const before = levelAt(time, seaLevel, cursor - 30 * 60e3), after = levelAt(time, seaLevel, cursor + 30 * 60e3);
  const rate = before != null && after != null ? after - before : 0;
  const trend = Math.abs(rate) < 0.03 ? 'Slack' : rate > 0 ? 'Rising' : 'Falling';
  const next = extremes.find((e) => e.at > cursor);
  const midnights: number[] = [];
  for (let d = Math.ceil(viewFrom / (24 * HOUR)) * 24 * HOUR; d <= to; d += 24 * HOUR) midnights.push(d);
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
        <p className="eyebrow">{t('tide_week')}</p>
        <SourceTag kind="live" />
      </div>

      {/* Readout for the time under the dotted line */}
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400" aria-live="polite">
            {fmtDayL(lang, cursor)} · <span className="tabular-nums">{fmtTime(cursor)}</span>
          </p>
          <p className="readout mt-1 flex items-center gap-2 text-[38px]">
            {trend === 'Rising' ? <ArrowUp className="text-lagoon" /> : trend === 'Falling' ? <ArrowDown className="text-buoy" /> : <Minus className="text-slate-400" />}
            <bdi>{level != null ? `${level >= 0 ? '+' : ''}${level.toFixed(2)}` : '—'}</bdi>
            <span className="font-sans text-base font-medium text-slate-400">{t('unit_m')}</span>
          </p>
          <p className="muted mt-1 text-sm">
            {t(`trend_${trend}` as const)}
            {next && <> · {t('next_turn', { type: t(next.type === 'high' ? 'high_tide' : 'low_tide'), time: fmtTime(next.at) })}{dayKey(next.at) !== dayKey(cursor) ? ` (${dayName(lang, next.at)})` : ''}</>}
          </p>
        </div>
        <button onClick={() => moveTo(nowC)} disabled={atNow}
          className="tap flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-lagoon/10 px-3.5 text-sm font-semibold text-lagoon disabled:opacity-40 dark:text-shallows">
          <LocateFixed size={15} /> {t('now_btn')}
        </button>
      </div>

      {/* Chart: drag anywhere to move the line; tap to jump */}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="mt-3 block w-full cursor-ew-resize touch-pan-y select-none"
        direction="ltr" role="img" aria-label={t('tide_week')}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)}>
        <defs>
          <linearGradient id="tx-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0E7C86" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0E7C86" stopOpacity="0" />
          </linearGradient>
        </defs>
        {midnights.map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={14} y2={H} className="stroke-slate-200 dark:stroke-white/10" strokeWidth="1" />
            {x(m) < W - 30 && <text x={x(m) + 4} y={11} className="fill-slate-400 text-[10px] font-semibold">{dayName(lang, m)}</text>}
          </g>
        ))}
        <path d={area} fill="url(#tx-fill)" />
        <path d={line} fill="none" stroke="#0E7C86" strokeWidth="2.4" strokeLinecap="round" />
        {extremes.filter((e) => e.at >= viewFrom && e.at <= to).map((e) => (
          <g key={e.at}>
            <circle cx={x(e.at)} cy={y(e.height)} r="2.8" fill={e.type === 'high' ? '#06283D' : '#FF6B35'} className={e.type === 'high' ? 'dark:fill-white' : ''} />
            {x(e.at) > 16 && x(e.at) < W - 16 && (
              <text x={x(e.at)} y={e.type === 'high' ? y(e.height) - 7 : y(e.height) + 14} textAnchor="middle"
                className="fill-slate-500 font-display text-[10.5px] font-semibold dark:fill-slate-300">{fmtTime(e.at)}</text>
            )}
          </g>
        ))}
        {nowMs >= viewFrom && nowMs <= to && levelAt(time, seaLevel, nowMs) != null && (
          <circle cx={x(nowMs)} cy={y(levelAt(time, seaLevel, nowMs)!)} r="4" fill="#FF6B35" opacity={atNow ? 0 : 0.6} />
        )}
        {level != null && (
          <g>
            <line x1={x(cursor)} x2={x(cursor)} y1={16} y2={H} stroke="#0B1B24" className="dark:stroke-white" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx={x(cursor)} cy={y(level)} r="7" fill={atNow ? '#FF6B35' : '#0E7C86'} stroke="#fff" strokeWidth="2.5" />
            <rect x={x(cursor) - 9} y={H - 16} width="18" height="14" rx="4" className="fill-abyss dark:fill-shallows" />
            <path d={`M${x(cursor) - 3} ${H - 9}h6`} stroke="#fff" strokeWidth="1.5" className="dark:stroke-abyss" />
          </g>
        )}
      </svg>

      {/* Slider across the whole week (keyboard and screen-reader friendly) */}
      <div dir="ltr" className="mt-3">
        <input type="range" min={start} max={end} step={STEP} value={cursor}
          onChange={(e) => moveTo(Number(e.target.value))}
          aria-label={t('slider_label')} aria-valuetext={`${fmtDayL(lang, cursor)} ${fmtTime(cursor)}`}
          className="tide-slider w-full" />
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400">
          {days.map((d) => <span key={d}>{dayName(lang, toLocalMs(`${d}T00:00`))}</span>)}
        </div>
      </div>
      <p className="muted mt-2 text-xs">{t('drag_hint')}</p>
    </section>
  );
}
