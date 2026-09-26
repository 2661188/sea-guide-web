// GPX 1.1 import/export, the common format used by Navionics, Garmin, OpenCPN and Google Earth.
import type { Route, TrackPoint, Trip, Waypoint } from './db';

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
const ll = (p: { lat: number; lon: number }) => `lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"`;
const iso = (ms: number) => new Date(ms).toISOString();

export function toGpx(data: { waypoints?: Waypoint[]; routes?: Route[]; tracks?: { trip: Trip; points: TrackPoint[] }[] }) {
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Bahrna" xmlns="http://www.topografix.com/GPX/1/1">',
    `<metadata><name>Bahrna export</name><time>${iso(Date.now())}</time></metadata>`,
  ];
  for (const w of data.waypoints ?? []) {
    out.push(`<wpt ${ll(w)}><time>${iso(w.at)}</time><name>${esc(w.name)}</name>${w.notes ? `<desc>${esc(w.notes)}</desc>` : ''}<type>${w.kind}</type></wpt>`);
  }
  for (const r of data.routes ?? []) {
    out.push(`<rte><name>${esc(r.name)}</name>${r.notes ? `<desc>${esc(r.notes)}</desc>` : ''}`);
    r.points.forEach((p, i) => out.push(`<rtept ${ll(p)}><name>${esc(p.name || `WP${String(i + 1).padStart(2, '0')}`)}</name></rtept>`));
    out.push('</rte>');
  }
  for (const { trip, points } of data.tracks ?? []) {
    out.push(`<trk><name>${esc(trip.name)}</name><type>${esc(trip.activity)}</type><trkseg>`);
    points.forEach((p) => out.push(`<trkpt ${ll(p)}><time>${iso(p.t)}</time></trkpt>`));
    out.push('</trkseg></trk>');
  }
  out.push('</gpx>');
  return out.join('\n');
}

export interface GpxData {
  waypoints: { name: string; lat: number; lon: number; notes?: string; kind?: string; time?: number }[];
  routes: { name: string; points: { lat: number; lon: number; name?: string }[] }[];
  tracks: { name: string; points: { lat: number; lon: number; t: number }[] }[];
}

export function parseGpx(text: string): GpxData {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('not-gpx');
  const kids = (el: Element | Document, tag: string) => Array.from(el.getElementsByTagName(tag));
  const child = (el: Element, tag: string) => Array.from(el.children).find((c) => c.localName === tag)?.textContent?.trim() || undefined;
  const pt = (el: Element) => ({ lat: parseFloat(el.getAttribute('lat') || ''), lon: parseFloat(el.getAttribute('lon') || '') });
  const ok = (p: { lat: number; lon: number }) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
  const time = (el: Element) => { const s = child(el, 'time'); const v = s ? Date.parse(s) : NaN; return Number.isFinite(v) ? v : undefined; };

  const waypoints = kids(doc, 'wpt').map((e) => ({ ...pt(e), name: child(e, 'name') ?? '', notes: child(e, 'desc') ?? child(e, 'cmt'), kind: child(e, 'type'), time: time(e) })).filter(ok);
  const routes = kids(doc, 'rte').map((r, i) => ({
    name: child(r, 'name') ?? `Route ${i + 1}`,
    points: kids(r, 'rtept').map((e) => ({ ...pt(e), name: child(e, 'name') })).filter(ok),
  })).filter((r) => r.points.length >= 2);
  const tracks = kids(doc, 'trk').map((tr, i) => {
    let t0 = Date.now() - 3600e3;
    const points = kids(tr, 'trkpt').map((e, k) => ({ ...pt(e), t: time(e) ?? t0 + k * 10e3 })).filter(ok);
    if (points.length) t0 = points[0].t;
    return { name: child(tr, 'name') ?? `Track ${i + 1}`, points };
  }).filter((t) => t.points.length >= 2);
  if (!waypoints.length && !routes.length && !tracks.length) throw new Error('empty');
  return { waypoints, routes, tracks };
}

export function downloadText(name: string, text: string, type = 'application/gpx+xml') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const safeName = (s: string) => (s.replace(/[^\p{L}\p{N}\-_ ]+/gu, '').trim().replace(/\s+/g, '-') || 'bahrna').slice(0, 60);
