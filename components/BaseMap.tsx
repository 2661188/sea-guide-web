// Offline base map: land and borders from Natural Earth drawn as SVG, so the map
// works with no internet at all. Not a nautical chart (no depths or hazards).
import { ReactNode, useMemo } from 'react';
import { BORDERS, LAND } from '@/lib/geo/uaeBase';

export interface View { lon: number; lat: number; span: number } // centre and width in degrees of longitude
export type Project = (lon: number, lat: number) => [number, number];

export function makeProjection(view: View, w: number, h: number): Project {
  const k = Math.cos((view.lat * Math.PI) / 180);
  const pxPerDeg = w / view.span;
  return (lon, lat) => [w / 2 + (lon - view.lon) * pxPerDeg, h / 2 - (lat - view.lat) * pxPerDeg / k];
}

/** View that fits all points with padding (min span keeps short tracks readable). */
export function fitView(pts: [number, number][], w: number, h: number, minSpan = 0.02): View {
  if (!pts.length) return { lon: 54.3, lat: 24.6, span: 5.8 };
  const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2, lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const k = Math.cos((lat * Math.PI) / 180);
  const spanLon = Math.max(...lons) - Math.min(...lons);
  const spanLatAsLon = ((Math.max(...lats) - Math.min(...lats)) / k) * (w / h);
  return { lon, lat, span: Math.max(minSpan, Math.max(spanLon, spanLatAsLon) * 1.35) };
}

export function BaseMap({ view, width, height, children, className = '', grid = true }:
  { view: View; width: number; height: number; children?: (p: Project) => ReactNode; className?: string; grid?: boolean }) {
  const p = useMemo(() => makeProjection(view, width, height), [view, width, height]);
  const land = useMemo(() => LAND.map((ring) => 'M' + ring.map(([x, y]) => p(x, y).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join(''), [p]);
  const borders = useMemo(() => BORDERS.map((l) => 'M' + l.map(([x, y]) => p(x, y).map((v) => v.toFixed(1)).join(',')).join('L')).join(''), [p]);
  // Lat/lon grid lines at a sensible step for the zoom level
  const step = view.span > 3 ? 1 : view.span > 0.8 ? 0.25 : view.span > 0.2 ? 0.05 : 0.01;
  const lines: ReactNode[] = [];
  if (grid) {
    const [lonA] = [view.lon - view.span / 2];
    for (let lon = Math.ceil(lonA / step) * step; lon < view.lon + view.span / 2; lon += step) {
      const [x] = p(lon, view.lat);
      lines.push(<line key={`x${lon.toFixed(3)}`} x1={x} x2={x} y1={0} y2={height} className="stroke-sky-900/10 dark:stroke-white/5" strokeWidth="1" />);
    }
    const latSpan = (view.span * height / width) * Math.cos((view.lat * Math.PI) / 180);
    for (let lat = Math.ceil((view.lat - latSpan) / step) * step; lat < view.lat + latSpan; lat += step) {
      const [, y] = p(view.lon, lat);
      lines.push(<line key={`y${lat.toFixed(3)}`} x1={0} x2={width} y1={y} y2={y} className="stroke-sky-900/10 dark:stroke-white/5" strokeWidth="1" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} direction="ltr" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sea-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" className="[stop-color:#CFEAF0] dark:[stop-color:#0A3550]" />
          <stop offset="100%" className="[stop-color:#A9DCE6] dark:[stop-color:#072A40]" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#sea-bg)" />
      {lines}
      <path d={land} className="fill-[#F1E9D8] stroke-[#C9B98F] dark:fill-[#1C3A4A] dark:stroke-[#2F5467]" strokeWidth="1" strokeLinejoin="round" />
      <path d={borders} fill="none" className="stroke-[#B4A47B] dark:stroke-[#3E6477]" strokeWidth="1" strokeDasharray="4 3" />
      {children?.(p)}
    </svg>
  );
}
