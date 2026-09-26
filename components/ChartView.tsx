// Slippy chart view (Web Mercator) with online tile layers, a built-in offline coastline,
// and an SVG overlay for tracks, routes and waypoints. Pan, pinch, wheel, double-tap and
// long-press are handled here; the page decides what a tap or long-press means.
import { forwardRef, ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { BORDERS, LAND } from '@/lib/geo/uaeBase';
import type { MapLayer } from '@/lib/nav/settings';

export interface CView { lon: number; lat: number; z: number }
export type ChartProject = (lon: number, lat: number) => [number, number];
export interface ChartHandle {
  zoomBy: (d: number) => void;
  setView: (v: Partial<CView>) => void;
  fit: (pts: [number, number][], maxZ?: number) => void;
  getView: () => CView;
}
interface TileLayer { id: string; url: (z: number, x: number, y: number) => string; min: number; max: number; attr: string }

const TS = 256;
export const MIN_Z = 4, MAX_Z = 19;
const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z));
export const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * TS * 2 ** z;
export const lat2y = (lat: number, z: number) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TS * 2 ** z;
};
export const x2lon = (x: number, z: number) => (x / (TS * 2 ** z)) * 360 - 180;
export const y2lat = (y: number, z: number) => (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - (2 * Math.PI * y) / (TS * 2 ** z)));

const WEB = 2 * Math.PI * 6378137;
const wmsBbox = (z: number, x: number, y: number) => {
  const span = WEB / 2 ** z, minx = -WEB / 2 + x * span, maxy = WEB / 2 - y * span;
  return `${minx},${maxy - span},${minx + span},${maxy}`;
};

export const BASES: Record<Exclude<MapLayer, 'offline'>, TileLayer> = {
  map: { id: 'osm', url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, min: 0, max: 19, attr: '© OpenStreetMap contributors' },
  sat: { id: 'esri', url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`, min: 0, max: 18, attr: 'Imagery © Esri, Maxar, Earthstar Geographics' },
  depth: {
    id: 'gebco', min: 0, max: 12, attr: 'GEBCO Compilation Group (2026) GEBCO 2026 Grid · not for navigation',
    url: (z, x, y) => `https://wms.gebco.net/mapserv?service=WMS&version=1.3.0&request=GetMap&layers=GEBCO_LATEST_2&styles=&crs=EPSG:3857&bbox=${wmsBbox(z, x, y)}&width=256&height=256&format=image/png`,
  },
};
export const SEAMARKS: TileLayer = { id: 'osea', url: (z, x, y) => `https://tiles.openseamap.org/seamark/${z}/${x}/${y}.png`, min: 9, max: 18, attr: 'Seamarks © OpenSeaMap' };

// ---------- Tile cache (keeps what you have viewed, for use offline) ----------
const CACHE = 'bahrna-tiles-v1';
let puts = 0;
async function trimCache(c: Cache) {
  const keys = await c.keys();
  const extra = keys.length - 4000;
  for (let i = 0; i < extra; i++) await c.delete(keys[i]);
}
async function loadTile(url: string): Promise<string> {
  try {
    if (typeof caches === 'undefined') return url;
    const c = await caches.open(CACHE);
    const hit = await c.match(url);
    if (hit) return URL.createObjectURL(await hit.blob());
    if (!navigator.onLine) return '';
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return '';
    c.put(url, r.clone()).then(() => { if (++puts % 150 === 0) trimCache(c); }).catch(() => {});
    return URL.createObjectURL(await r.blob());
  } catch {
    return navigator.onLine ? url : '';
  }
}
export async function tileCacheInfo() {
  try { const c = await caches.open(CACHE); return (await c.keys()).length; } catch { return 0; }
}
export async function clearTileCache() { try { await caches.delete(CACHE); } catch { /* ignore */ } }

function Tile({ url, left, top, size }: { url: string; left: number; top: number; size: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let alive = true, obj: string | null = null;
    loadTile(url).then((s) => {
      if (!alive) { if (s.startsWith('blob:')) URL.revokeObjectURL(s); return; }
      obj = s; setSrc(s || null);
    });
    return () => { alive = false; if (obj?.startsWith('blob:')) URL.revokeObjectURL(obj); };
  }, [url]);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" draggable={false} onLoad={() => setShown(true)} onError={() => setSrc(null)}
      className="absolute max-w-none select-none transition-opacity duration-300"
      style={{ left, top, width: size + 0.5, height: size + 0.5, opacity: shown ? 1 : 0 }} />
  );
}

function TileLayerView({ layer, v, w, h }: { layer: TileLayer; v: CView; w: number; h: number }) {
  if (v.z + 0.5 < layer.min) return null;
  const tz = Math.max(layer.min, Math.min(layer.max, Math.round(v.z)));
  const scale = 2 ** (v.z - tz), size = TS * scale, n = 2 ** tz;
  const ox = lon2x(v.lon, tz) - w / 2 / scale, oy = lat2y(v.lat, tz) - h / 2 / scale;
  const x0 = Math.floor(ox / TS), x1 = Math.floor((ox + w / scale) / TS);
  const y0 = Math.max(0, Math.floor(oy / TS)), y1 = Math.min(n - 1, Math.floor((oy + h / scale) / TS));
  const tiles: ReactNode[] = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const wx = ((tx % n) + n) % n;
    tiles.push(<Tile key={`${layer.id}/${tz}/${tx}/${ty}`} url={layer.url(tz, wx, ty)} left={(tx * TS - ox) * scale} top={(ty * TS - oy) * scale} size={size} />);
  }
  return <>{tiles}</>;
}

// Coastline in world pixels at a reference zoom, moved with a transform (fast to pan).
const REF_Z = 12;
const toPath = (rings: readonly (readonly [number, number])[][], close: boolean) =>
  rings.map((r) => 'M' + r.map(([lo, la]) => `${lon2x(lo, REF_Z).toFixed(0)},${lat2y(la, REF_Z).toFixed(0)}`).join('L') + (close ? 'Z' : '')).join('');

/** Map scale in metres per CSS pixel at the view centre. */
export const mPerPx = (v: CView) => (40075016.686 * Math.cos((v.lat * Math.PI) / 180)) / (TS * 2 ** v.z);

export function fitChart(pts: [number, number][], w: number, h: number, maxZ = 16, pad = 56): CView {
  if (!pts.length) return { lon: 54.4, lat: 24.7, z: 7 };
  const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const dx = lon2x(maxLon, 0) - lon2x(minLon, 0), dy = lat2y(minLat, 0) - lat2y(maxLat, 0);
  const zx = dx > 0 ? Math.log2(Math.max(40, w - 2 * pad) / dx) : maxZ;
  const zy = dy > 0 ? Math.log2(Math.max(40, h - 2 * pad) / dy) : maxZ;
  const z = clampZ(Math.min(maxZ, zx, zy));
  return { lon: x2lon((lon2x(minLon, z) + lon2x(maxLon, z)) / 2, z), lat: y2lat((lat2y(minLat, z) + lat2y(maxLat, z)) / 2, z), z };
}

interface Props {
  layer: MapLayer;
  seamarks?: boolean;
  initial?: CView;
  className?: string;
  children?: (p: ChartProject, v: CView & { w: number; h: number }) => ReactNode;
  overlay?: ReactNode; // HTML on top (buttons etc.)
  onTap?: (lon: number, lat: number, x: number, y: number) => void;
  onLongPress?: (lon: number, lat: number) => void;
  onUserMove?: () => void;
  onViewChange?: (v: CView) => void;
  doubleTapZoom?: boolean;
  label?: string;
}

export const ChartView = forwardRef<ChartHandle, Props>(function ChartView(
  { layer, seamarks = false, initial, className = '', children, overlay, onTap, onLongPress, onUserMove, onViewChange, doubleTapZoom = true, label }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [v, setV] = useState<CView>(initial ?? { lon: 54.4, lat: 24.7, z: 7 });
  const vr = useRef(v); vr.current = v;
  const sr = useRef(size); sr.current = size;
  const cb = useRef({ onTap, onLongPress, onUserMove, onViewChange, doubleTapZoom });
  cb.current = { onTap, onLongPress, onUserMove, onViewChange, doubleTapZoom };

  const update = useCallback((nv: CView) => {
    const c = { lon: ((nv.lon + 540) % 360) - 180, lat: Math.max(-80, Math.min(80, nv.lat)), z: clampZ(nv.z) };
    vr.current = c; setV(c); cb.current.onViewChange?.(c);
  }, []);

  const zoomAt = useCallback((x: number, y: number, nz: number) => {
    const cur = vr.current, { w, h } = sr.current, z = clampZ(nz);
    const gl = x2lon(lon2x(cur.lon, cur.z) + x - w / 2, cur.z), ga = y2lat(lat2y(cur.lat, cur.z) + y - h / 2, cur.z);
    update({ z, lon: x2lon(lon2x(gl, z) - (x - w / 2), z), lat: y2lat(lat2y(ga, z) - (y - h / 2), z) });
  }, [update]);

  useImperativeHandle(ref, () => ({
    zoomBy: (d) => update({ ...vr.current, z: Math.round(vr.current.z + d) }),
    setView: (p) => update({ ...vr.current, ...p }),
    fit: (pts, maxZ) => { const { w, h } = sr.current; if (w && h) update(fitChart(pts, w, h, maxZ)); },
    getView: () => vr.current,
  }), [update]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, vr.current.z - e.deltaY * (e.ctrlKey ? 0.01 : 0.0025));
      cb.current.onUserMove?.();
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { ro.disconnect(); el.removeEventListener('wheel', wheel); };
  }, [zoomAt]);

  // ---------- Gestures ----------
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{ mode: 'pan' | 'pinch'; sx: number; sy: number; wx: number; wy: number; z0: number; d0: number; gl: number; ga: number; moved: boolean; t0: number; long: boolean; lp: ReturnType<typeof setTimeout> | null } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const rel = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const unproject = (x: number, y: number) => {
    const cur = vr.current, { w, h } = sr.current;
    return { lon: x2lon(lon2x(cur.lon, cur.z) + x - w / 2, cur.z), lat: y2lat(lat2y(cur.lat, cur.z) + y - h / 2, cur.z) };
  };
  const startPan = (x: number, y: number, moved: boolean) => {
    const cur = vr.current;
    if (g.current?.lp) clearTimeout(g.current.lp);
    g.current = { mode: 'pan', sx: x, sy: y, wx: lon2x(cur.lon, cur.z), wy: lat2y(cur.lat, cur.z), z0: cur.z, d0: 0, gl: 0, ga: 0, moved, t0: Date.now(), long: false, lp: null };
    if (!moved) {
      g.current.lp = setTimeout(() => {
        const s = g.current;
        if (!s || s.moved || s.mode !== 'pan' || !cb.current.onLongPress) return;
        s.long = true;
        const p = unproject(s.sx, s.sy);
        try { navigator.vibrate?.(30); } catch { /* ignore */ }
        cb.current.onLongPress(p.lon, p.lat);
      }, 550);
    }
  };
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-chart-ui]')) return;
    box.current?.setPointerCapture?.(e.pointerId);
    const p = rel(e);
    ptrs.current.set(e.pointerId, p);
    if (ptrs.current.size === 1) startPan(p.x, p.y, false);
    else if (ptrs.current.size === 2) {
      const [a, b] = Array.from(ptrs.current.values());
      if (g.current?.lp) clearTimeout(g.current.lp);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, geo = unproject(mx, my);
      g.current = { mode: 'pinch', sx: mx, sy: my, wx: 0, wy: 0, z0: vr.current.z, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, gl: geo.lon, ga: geo.lat, moved: true, t0: Date.now(), long: false, lp: null };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const p = rel(e);
    ptrs.current.set(e.pointerId, p);
    const s = g.current;
    if (!s) return;
    const { w, h } = sr.current;
    if (s.mode === 'pan') {
      const dx = p.x - s.sx, dy = p.y - s.sy;
      if (!s.moved && Math.abs(dx) + Math.abs(dy) < 7) return;
      if (!s.moved) { s.moved = true; if (s.lp) clearTimeout(s.lp); cb.current.onUserMove?.(); }
      if (s.long) return;
      update({ z: s.z0, lon: x2lon(s.wx - dx, s.z0), lat: y2lat(s.wy - dy, s.z0) });
    } else if (ptrs.current.size >= 2) {
      const [a, b] = Array.from(ptrs.current.values());
      const z = clampZ(s.z0 + Math.log2((Math.hypot(a.x - b.x, a.y - b.y) || 1) / s.d0));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      update({ z, lon: x2lon(lon2x(s.gl, z) - (mx - w / 2), z), lat: y2lat(lat2y(s.ga, z) - (my - h / 2), z) });
    }
  };
  const onUp = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const p = rel(e);
    ptrs.current.delete(e.pointerId);
    const s = g.current;
    if (s?.lp) clearTimeout(s.lp);
    if (ptrs.current.size === 1) { const r = Array.from(ptrs.current.values())[0]; startPan(r.x, r.y, true); return; }
    g.current = null;
    if (!s || s.mode !== 'pan' || s.moved || s.long || Date.now() - s.t0 > 500 || e.type === 'pointercancel') return;
    const now = Date.now(), lt = lastTap.current;
    if (cb.current.doubleTapZoom && lt && now - lt.t < 320 && Math.hypot(lt.x - p.x, lt.y - p.y) < 30) {
      lastTap.current = null;
      zoomAt(p.x, p.y, Math.round(vr.current.z) + 1);
      cb.current.onUserMove?.();
      return;
    }
    lastTap.current = { t: now, x: p.x, y: p.y };
    const geo = unproject(p.x, p.y);
    cb.current.onTap?.(geo.lon, geo.lat, p.x, p.y);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const cur = vr.current, step = 80;
    const pan = (dx: number, dy: number) => update({ ...cur, lon: x2lon(lon2x(cur.lon, cur.z) + dx, cur.z), lat: y2lat(lat2y(cur.lat, cur.z) + dy, cur.z) });
    const k: Record<string, () => void> = {
      ArrowLeft: () => pan(-step, 0), ArrowRight: () => pan(step, 0), ArrowUp: () => pan(0, -step), ArrowDown: () => pan(0, step),
      '+': () => update({ ...cur, z: Math.round(cur.z) + 1 }), '=': () => update({ ...cur, z: Math.round(cur.z) + 1 }), '-': () => update({ ...cur, z: Math.round(cur.z) - 1 }),
    };
    if (k[e.key]) { e.preventDefault(); k[e.key](); cb.current.onUserMove?.(); }
  };

  const { w, h } = size;
  const project: ChartProject = useMemo(() => {
    const cx = lon2x(v.lon, v.z), cy = lat2y(v.lat, v.z);
    return (lon, lat) => [w / 2 + lon2x(lon, v.z) - cx, h / 2 + lat2y(lat, v.z) - cy];
  }, [v, w, h]);
  const land = useMemo(() => toPath(LAND, true), []);
  const borders = useMemo(() => toPath(BORDERS as unknown as [number, number][][], false), []);
  const k = 2 ** (v.z - REF_Z);
  const landTf = `translate(${w / 2 - lon2x(v.lon, REF_Z) * k} ${h / 2 - lat2y(v.lat, REF_Z) * k}) scale(${k})`;
  const base = layer === 'offline' ? null : BASES[layer];
  const attr = [base?.attr, seamarks ? SEAMARKS.attr : null, 'Coast: Natural Earth'].filter(Boolean).join(' · ');

  // Scale bar: a round distance that fits in ~90 px
  const mpp = mPerPx(v);
  const bar = (() => {
    const maxM = mpp * 90;
    const nmSteps = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const nm = [...nmSteps].reverse().find((s) => s * 1852 <= maxM);
    if (nm && nm >= 0.25) return { px: (nm * 1852) / mpp, label: `${nm} NM` };
    const mSteps = [10, 20, 50, 100, 200, 250, 500];
    const m = [...mSteps].reverse().find((s) => s <= maxM) ?? 10;
    return { px: m / mpp, label: `${m} m` };
  })();

  return (
    <div ref={box} tabIndex={0} role="application" aria-label={label}
      className={`relative select-none overflow-hidden bg-[#AAD3DF] outline-none focus-visible:ring-2 focus-visible:ring-lagoon dark:bg-[#0A3550] ${className}`}
      style={{ touchAction: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}>
      {w > 0 && (
        <>
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <g transform={landTf}>
              <path d={land} className="fill-[#F2EFE9] stroke-[#B9AE92] dark:fill-[#1C3A4A] dark:stroke-[#2F5467]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d={borders} fill="none" className="stroke-[#A89A74] dark:stroke-[#3E6477]" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {base && <div className="absolute inset-0"><TileLayerView layer={base} v={v} w={w} h={h} /></div>}
          {seamarks && <div className="absolute inset-0"><TileLayerView layer={SEAMARKS} v={v} w={w} h={h} /></div>}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" direction="ltr">{children?.(project, { ...v, w, h })}</svg>
        </>
      )}
      <div className="pointer-events-none absolute bottom-1.5 start-2 flex flex-col items-start" dir="ltr">
        <span className="rounded bg-white/80 px-1 text-[10px] font-semibold text-slate-700 dark:bg-black/50 dark:text-slate-200">{bar.label}</span>
        <span className="mt-0.5 h-1.5 border-x-2 border-b-2 border-slate-800 dark:border-white" style={{ width: bar.px }} />
      </div>
      <p className="pointer-events-none absolute bottom-0 end-0 max-w-[70%] truncate rounded-tl bg-white/70 px-1 text-[9px] text-slate-600 dark:bg-black/40 dark:text-slate-300" dir="ltr">{attr}</p>
      {overlay}
    </div>
  );
});
