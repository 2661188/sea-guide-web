import { useEffect, useRef } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { ChartHandle, ChartView } from '@/components/ChartView';
import { useT } from '@/lib/i18n/LangContext';
import type { RoutePoint, Waypoint } from '@/lib/nav/db';
import { useNavSettings } from '@/lib/nav/settings';
import { RouteLine, StartMarker, TrackLine, WaypointMarkers } from './ChartLayers';

/** Chart that fits a track, route or set of waypoints (trip and route details). */
export function MiniChart({ track = [], route, wps = [], start, className = '' }:
  { track?: [number, number][]; route?: RoutePoint[]; wps?: Waypoint[]; start?: { lat: number; lon: number } | null; className?: string }) {
  const { t } = useT();
  const [nav] = useNavSettings();
  const ref = useRef<ChartHandle>(null);
  const pts: [number, number][] = [...track, ...(route ?? []).map((p) => [p.lon, p.lat] as [number, number]), ...wps.map((w) => [w.lon, w.lat] as [number, number])];
  const key = `${pts.length}:${pts[0]?.join(',')}:${pts[pts.length - 1]?.join(',')}`;
  useEffect(() => {
    const id = setTimeout(() => { if (pts.length) ref.current?.fit(pts, 16); }, 30);
    return () => clearTimeout(id);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const btn = 'tap grid h-10 w-10 place-items-center rounded-xl bg-white text-ink shadow-md ring-1 ring-black/5 dark:bg-[#0A2B40] dark:text-white';
  return (
    <ChartView ref={ref} layer={nav.layer} seamarks={nav.seamarks} className={className} label={t('chart')}
      overlay={
        <div data-chart-ui className="absolute bottom-7 end-3 flex flex-col gap-2">
          <button className={btn} onClick={() => ref.current?.zoomBy(1)} aria-label={t('zoom_in')}><Plus size={18} /></button>
          <button className={btn} onClick={() => ref.current?.zoomBy(-1)} aria-label={t('zoom_out')}><Minus size={18} /></button>
          <button className={btn} onClick={() => ref.current?.fit(pts, 16)} aria-label={t('fit')}><Maximize2 size={16} /></button>
        </div>
      }>
      {(p, v) => (
        <g>
          <TrackLine pts={track} p={p} />
          {route && <RouteLine pts={route} p={p} z={v.z} />}
          <WaypointMarkers wps={wps} p={p} z={v.z} />
          {start && <StartMarker at={start} p={p} />}
        </g>
      )}
    </ChartView>
  );
}
