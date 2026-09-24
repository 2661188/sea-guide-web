import type { Conditions } from '@/lib/marine/types';
import type { TideExtreme } from '@/lib/marine/tides';
import { levelAt } from '@/lib/marine/tides';
import { toLocalMs, fmtTime } from '@/lib/marine/time';
import { useT } from '@/lib/i18n/LangContext';

interface Props {
  data: Conditions;
  from: number; // local ms
  to: number;
  extremes: TideExtreme[];
  nowMs?: number; // draws the "now" buoy when inside the range
  variant?: 'light' | 'dark';
  height?: number;
  labels?: boolean;
}

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function TideChart({ data, from, to, extremes, nowMs, variant = 'light', height = 120, labels = true }: Props) {
  const { t } = useT();
  const { time, seaLevel } = data.hourly;
  const raw = time
    .map((t, i) => [toLocalMs(t), seaLevel[i]] as const)
    .filter(([t, v]) => v != null && t >= from - 3600e3 && t <= to + 3600e3) as [number, number][];
  if (raw.length < 3) {
    return <p className="py-6 text-center text-sm text-slate-400">{t('no_data_period')}</p>;
  }
  const W = 360, H = height, padX = 10, padTop = labels ? 22 : 8, padBot = labels ? 20 : 6;
  const lo = Math.min(...raw.map((p) => p[1])), hi = Math.max(...raw.map((p) => p[1]));
  const span = Math.max(hi - lo, 0.2);
  const x = (t: number) => padX + ((t - from) / (to - from)) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - (v - lo) / span) * (H - padTop - padBot);
  const pts = raw.map(([t, v]) => [x(t), y(v)] as [number, number]);
  const line = smooth(pts);
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const dark = variant === 'dark';
  const gid = `tide-${variant}-${height}`;
  const visible = extremes.filter((e) => e.at >= from && e.at <= to);
  const nowIn = nowMs != null && nowMs >= from && nowMs <= to;
  const nowLevel = nowIn ? levelAt(time, seaLevel, nowMs!) : null;

  return (
    <svg direction="ltr" viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img"
      aria-label={`${t('tide')}: ${visible.map((e) => `${t(e.type === 'high' ? 'high_tide' : 'low_tide')} ${fmtTime(e.at)}`).join(', ')}`}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#7FD4D0' : '#0E7C86'} stopOpacity={dark ? 0.35 : 0.22} />
          <stop offset="100%" stopColor={dark ? '#7FD4D0' : '#0E7C86'} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${gid}-clip`}><rect x={padX} y="0" width={W - padX * 2} height={H} /></clipPath>
      </defs>
      <g clipPath={`url(#${gid}-clip)`}>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={dark ? '#7FD4D0' : '#0E7C86'} strokeWidth="2.4" strokeLinecap="round" />
      </g>
      {labels && visible.map((e) => (
        <g key={e.at}>
          <circle cx={x(e.at)} cy={y(e.height)} r="3" fill={e.type === 'high' ? (dark ? '#fff' : '#06283D') : '#FF6B35'} />
          <text x={x(e.at)} y={e.type === 'high' ? y(e.height) - 8 : y(e.height) + 15} textAnchor="middle"
            className={`font-display text-[11px] font-semibold ${dark ? 'fill-white/85' : 'fill-slate-600 dark:fill-slate-300'}`}>
            {fmtTime(e.at)}
          </text>
        </g>
      ))}
      {nowIn && nowLevel != null && (
        <g>
          <line x1={x(nowMs!)} x2={x(nowMs!)} y1={y(nowLevel) + 6} y2={H} stroke={dark ? '#ffffff55' : '#0B1B2433'} strokeDasharray="2 3" />
          <g className="animate-bob" style={{ transformBox: 'fill-box' }}>
            <circle cx={x(nowMs!)} cy={y(nowLevel)} r="6.5" fill="#FF6B35" stroke={dark ? '#06283D' : '#fff'} strokeWidth="2.5" />
          </g>
        </g>
      )}
    </svg>
  );
}
