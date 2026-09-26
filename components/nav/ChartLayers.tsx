// SVG overlay pieces drawn on top of ChartView.
import type { ChartProject } from '@/components/ChartView';
import type { RoutePoint, Waypoint } from '@/lib/nav/db';
import { bearing, destination, distanceNm, fmtDist, distUnit, nmToM } from '@/lib/nav/geo';
import { kindOf } from './kinds';

type LL = [number, number];
const path = (pts: LL[], p: ChartProject) => pts.map(([lo, la], i) => `${i ? 'L' : 'M'}${p(lo, la).map((n) => n.toFixed(1)).join(',')}`).join('');

export function TrackLine({ pts, p, color = '#0E7C86' }: { pts: LL[]; p: ChartProject; color?: string }) {
  if (pts.length < 2) return null;
  const d = path(pts, p);
  return (
    <g>
      <path d={d} fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <path d={d} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export function DashLine({ pts, p, color = '#FF6B35', animate = true }: { pts: LL[]; p: ChartProject; color?: string; animate?: boolean }) {
  if (pts.length < 2) return null;
  return (
    <path d={path(pts, p)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="9 6">
      {animate && <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1.2s" repeatCount="indefinite" />}
    </path>
  );
}

/** A planned or active route: magenta line, numbered points, leg distances. */
export function RouteLine({ pts, p, active = -1, labels = true, dashed = false, z }:
  { pts: RoutePoint[]; p: ChartProject; active?: number; labels?: boolean; dashed?: boolean; z: number }) {
  if (!pts.length) return null;
  const ll: LL[] = pts.map((q) => [q.lon, q.lat]);
  const d = path(ll, p);
  return (
    <g>
      {pts.length > 1 && <path d={d} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />}
      {pts.length > 1 && <path d={d} fill="none" stroke="#C026D3" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? '10 6' : undefined} />}
      {active > 0 && pts[active - 1] && (
        <path d={path([ll[active - 1], ll[active]], p)} fill="none" stroke="#C026D3" strokeWidth="6" strokeLinecap="round" />
      )}
      {labels && z >= 9 && pts.slice(1).map((q, i) => {
        const a = pts[i], nm = distanceNm(a, q);
        const [x1, y1] = p(a.lon, a.lat), [x2, y2] = p(q.lon, q.lat);
        if (Math.hypot(x2 - x1, y2 - y1) < 70) return null;
        const brg = Math.round(bearing(a, q));
        return (
          <text key={i} x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7} textAnchor="middle" className="map-label fill-fuchsia-800 text-[11px] font-bold dark:fill-fuchsia-200">
            {fmtDist(nm)} {distUnit(nm)} · {String(brg).padStart(3, '0')}°
          </text>
        );
      })}
      {pts.map((q, i) => {
        const [x, y] = p(q.lon, q.lat);
        const on = i === active;
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            {on && <circle r="15" fill="#C026D3" opacity="0.25"><animate attributeName="r" values="11;18;11" dur="1.8s" repeatCount="indefinite" /></circle>}
            <circle r={on ? 10 : 8.5} fill={i < active ? '#94A3B8' : '#C026D3'} stroke="#fff" strokeWidth="2.2" />
            <text y="3.8" textAnchor="middle" className="fill-white text-[10px] font-bold">{i + 1}</text>
            {q.name && z >= 11 && <text x="13" y="4" className="map-label fill-ink text-[11px] font-semibold dark:fill-white">{q.name}</text>}
          </g>
        );
      })}
    </g>
  );
}

export function WaypointMarkers({ wps, p, selected, z }: { wps: Waypoint[]; p: ChartProject; selected?: string | null; z: number }) {
  return (
    <g>
      {wps.map((w) => {
        const [x, y] = p(w.lon, w.lat);
        const k = kindOf(w.kind), on = w.id === selected;
        const s = on ? 1.2 : 1;
        return (
          <g key={w.id} transform={`translate(${x},${y})`}>
            <g transform={`scale(${s})`}>
              <path d="M0 0 C-3 -6 -12 -12 -12 -21 A12 12 0 1 1 12 -21 C12 -12 3 -6 0 0 Z" fill={k.color} stroke="#fff" strokeWidth="2" />
              <k.Icon x={-7} y={-28} width={14} height={14} color="#fff" strokeWidth={2.4} />
            </g>
            {on && <circle r="4" fill="#fff" stroke={k.color} strokeWidth="2" />}
            {(z >= 12 || on) && (
              <text x="15" y="-16" className="map-label fill-ink text-[12px] font-bold dark:fill-white">{w.name}</text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function StartMarker({ at, p }: { at: { lat: number; lon: number }; p: ChartProject }) {
  const [x, y] = p(at.lon, at.lat);
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="10" fill="#06283D" stroke="#fff" strokeWidth="2.5" />
      <text y="4" textAnchor="middle" className="fill-white text-[10px] font-bold">S</text>
    </g>
  );
}

/** Boat position, accuracy circle and a 6-minute course/speed predictor. */
export function BoatMarker({ pos, p, mpp }: { pos: { lat: number; lon: number; acc: number; cog: number | null; speedKn: number | null }; p: ChartProject; mpp: number }) {
  const [x, y] = p(pos.lon, pos.lat);
  const accR = Math.max(8, Math.min(160, pos.acc / mpp));
  const moving = pos.cog != null && (pos.speedKn ?? 0) > 0.8;
  const tip = moving ? p(...(() => { const d = destination(pos, pos.cog!, (pos.speedKn ?? 0) * 0.1); return [d.lon, d.lat] as LL; })()) : null;
  return (
    <g>
      {tip && <line x1={x} y1={y} x2={tip[0]} y2={tip[1]} stroke="#0A84FF" strokeWidth="2.5" strokeDasharray="5 4" />}
      <g transform={`translate(${x},${y})`}>
        <circle r={accR} fill="#0A84FF" opacity="0.12" />
        <circle r="13" fill="#0A84FF" opacity="0.25"><animate attributeName="r" values="10;19;10" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values=".35;0;.35" dur="2s" repeatCount="indefinite" /></circle>
        {moving
          ? <path d="M0 -14 L9 10 L0 5 L-9 10 Z" fill="#0A84FF" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" transform={`rotate(${pos.cog})`} />
          : <circle r="8.5" fill="#0A84FF" stroke="#fff" strokeWidth="3" />}
      </g>
    </g>
  );
}

export function AnchorCircle({ an, p, mpp, drifted }: { an: { lat: number; lon: number; radiusM: number }; p: ChartProject; mpp: number; drifted: boolean }) {
  const [x, y] = p(an.lon, an.lat);
  const r = an.radiusM / mpp;
  const c = drifted ? '#D64545' : '#0E9F6E';
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r} fill={c} fillOpacity="0.1" stroke={c} strokeWidth="2.5" strokeDasharray="6 4" />
      <circle r="9" fill={c} stroke="#fff" strokeWidth="2" />
      <path d="M0 -5 V4 M-4 1 Q0 6 4 1 M-2.5 -3 H2.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** Measure / plan helper: dotted line from boat to a target. */
export function BearingLine({ from, to, p }: { from: { lat: number; lon: number }; to: { lat: number; lon: number }; p: ChartProject }) {
  const [x1, y1] = p(from.lon, from.lat), [x2, y2] = p(to.lon, to.lat);
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C026D3" strokeWidth="2.5" strokeDasharray="2 5" strokeLinecap="round" />;
}

export const metersToPx = (m: number, mpp: number) => m / mpp;
export { nmToM };
