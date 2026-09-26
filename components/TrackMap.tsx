import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Maximize2, Minus, Plus } from 'lucide-react';
import { BaseMap, fitView, View } from './BaseMap';
import { useT } from '@/lib/i18n/LangContext';

interface Props {
  track: [number, number][]; // [lon, lat]
  start?: { lat: number; lon: number } | null;
  pos?: { lat: number; lon: number; acc: number; cog: number | null } | null;
  returnPath?: [number, number][] | null;
  waypoints?: { id: string; lat: number; lon: number; name: string }[];
  height?: number;
  interactive?: boolean;
  className?: string;
}

const W = 600;

/** Offline map with the recorded track, start point, live position and return path. */
export function TrackMap({ track, start, pos, returnPath, waypoints = [], height = 420, interactive = true, className = '' }: Props) {
  const { t } = useT();
  const H = Math.round(height * (W / 600));
  const allPts = useMemo(() => {
    const p: [number, number][] = [...track];
    if (start) p.push([start.lon, start.lat]);
    if (pos) p.push([pos.lon, pos.lat]);
    return p;
  }, [track, start, pos]);
  const [mode, setMode] = useState<'follow' | 'fit' | 'free'>(pos ? 'follow' : 'fit');
  const [span, setSpan] = useState(0.05);
  const [center, setCenter] = useState<{ lon: number; lat: number } | null>(null);
  const drag = useRef<{ x: number; y: number; c: { lon: number; lat: number } } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const view: View = useMemo(() => {
    if (mode === 'fit' || (!pos && mode === 'follow')) return allPts.length ? fitView(allPts, W, H, 0.01) : { lon: 54.3, lat: 24.6, span: 5.8 };
    if (mode === 'follow' && pos) return { lon: pos.lon, lat: pos.lat, span };
    return { lon: center?.lon ?? pos?.lon ?? 54.3, lat: center?.lat ?? pos?.lat ?? 24.6, span };
  }, [mode, allPts, pos, span, center, H]);
  useEffect(() => { if (mode === 'fit') setSpan(view.span); }, [mode, view.span]);

  const zoom = (f: number) => { setCenter({ lon: view.lon, lat: view.lat }); setSpan(Math.min(6, Math.max(0.004, view.span * f))); if (mode === 'fit') setMode('free'); };
  const onDown = (e: React.PointerEvent) => { if (!interactive) return; (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, c: { lon: view.lon, lat: view.lat } }; };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    const r = box.current.getBoundingClientRect();
    const degPerPx = view.span / r.width;
    const k = Math.cos((view.lat * Math.PI) / 180);
    setSpan(view.span); setMode('free');
    setCenter({ lon: drag.current.c.lon - dx * degPerPx, lat: drag.current.c.lat + dy * degPerPx * k });
  };
  const line = (pts: [number, number][], p: (lon: number, lat: number) => [number, number]) => pts.map(([lo, la], i) => `${i ? 'L' : 'M'}${p(lo, la).map((v) => v.toFixed(1)).join(',')}`).join('');

  return (
    <div ref={box} className={`relative overflow-hidden ${className}`} style={{ touchAction: interactive ? 'none' : 'auto' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
      <BaseMap view={view} width={W} height={H} className="block h-full w-full" grid>
        {(p) => {
          const pxPerM = W / (view.span * 111320 * Math.cos((view.lat * Math.PI) / 180));
          return (
            <g>
              {track.length > 1 && (
                <>
                  <path d={line(track, p)} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                  <path d={line(track, p)} fill="none" stroke="#0E7C86" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
              {returnPath && returnPath.length > 1 && (
                <path d={line(returnPath, p)} fill="none" stroke="#FF6B35" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="9 6">
                  <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1.2s" repeatCount="indefinite" />
                </path>
              )}
              {waypoints.map((w) => {
                const [x, y] = p(w.lon, w.lat);
                return (
                  <g key={w.id} transform={`translate(${x},${y})`}>
                    <path d="M0 0 L-6 -14 A7 7 0 1 1 6 -14 Z" fill="#7C3AED" stroke="#fff" strokeWidth="1.5" />
                    <circle cy="-16" r="2.6" fill="#fff" />
                  </g>
                );
              })}
              {start && (() => {
                const [x, y] = p(start.lon, start.lat);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <circle r="11" fill="#06283D" stroke="#fff" strokeWidth="2.5" />
                    <text y="4" textAnchor="middle" className="fill-white text-[11px] font-bold">S</text>
                  </g>
                );
              })()}
              {pos && (() => {
                const [x, y] = p(pos.lon, pos.lat);
                const accR = Math.max(10, Math.min(120, pos.acc * pxPerM));
                return (
                  <g transform={`translate(${x},${y})`}>
                    <circle r={accR} fill="#0A84FF" opacity="0.12" />
                    {pos.cog != null && <path d="M0 0 L-16 -44 A46 46 0 0 1 16 -44 Z" fill="#0A84FF" opacity="0.18" transform={`rotate(${pos.cog})`} />}
                    <circle r="14" fill="#0A84FF" opacity="0.25"><animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values=".35;0;.35" dur="2s" repeatCount="indefinite" /></circle>
                    <circle r="9" fill="#0A84FF" stroke="#fff" strokeWidth="3" />
                    {pos.cog != null && <path d="M0 -5 L3.5 3 L0 1.5 L-3.5 3 Z" fill="#fff" transform={`rotate(${pos.cog})`} />}
                  </g>
                );
              })()}
            </g>
          );
        }}
      </BaseMap>
      {interactive && (
        <div className="absolute bottom-3 end-3 flex flex-col gap-2">
          <MapBtn label={t('zoom_in')} onClick={() => zoom(0.5)}><Plus size={20} /></MapBtn>
          <MapBtn label={t('zoom_out')} onClick={() => zoom(2)}><Minus size={20} /></MapBtn>
          <MapBtn label={t('fit')} onClick={() => setMode('fit')} active={mode === 'fit'}><Maximize2 size={18} /></MapBtn>
          {pos && <MapBtn label={t('follow')} onClick={() => setMode('follow')} active={mode === 'follow'}><Crosshair size={20} /></MapBtn>}
        </div>
      )}
    </div>
  );
}

function MapBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} onPointerDown={(e) => e.stopPropagation()} aria-label={label} title={label}
      className={`tap grid h-11 w-11 place-items-center rounded-xl shadow-md ring-1 ring-black/5 ${active ? 'bg-abyss text-white' : 'bg-white text-ink dark:bg-[#0A2B40] dark:text-white'}`}>
      {children}
    </button>
  );
}
