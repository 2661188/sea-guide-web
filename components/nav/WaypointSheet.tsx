import { useState } from 'react';
import { Copy, Navigation, Share2, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/LangContext';
import { deleteWaypoint, newId, notifyNavData, putWaypoint, Waypoint, WpKind } from '@/lib/nav/db';
import { bearing, distanceNm, distUnit, fmtDist, fmtLat, fmtLon, parseCoords } from '@/lib/nav/geo';
import { WP_KINDS } from './kinds';

/** Create, view or edit a waypoint. `wp.id === ''` means a new one. */
export function WaypointSheet({ wp, pos, onClose, onGoTo, onSaved }:
  { wp: Waypoint; pos: { lat: number; lon: number } | null; onClose: () => void; onGoTo?: (w: Waypoint) => void; onSaved?: (w: Waypoint | null) => void }) {
  const { t } = useT();
  const isNew = !wp.id;
  const [name, setName] = useState(wp.name);
  const [kind, setKind] = useState<WpKind>(wp.kind === 'spot' ? 'mark' : wp.kind);
  const [coord, setCoord] = useState(`${fmtLat(wp.lat)} ${fmtLon(wp.lon)}`);
  const [notes, setNotes] = useState(wp.notes ?? '');
  const [depth, setDepth] = useState(wp.depth != null ? String(wp.depth) : '');
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const parsed = parseCoords(coord);
  const at = parsed ?? { lat: wp.lat, lon: wp.lon };
  const d = pos ? distanceNm(pos, at) : null;

  const build = (): Waypoint | null => {
    if (!parsed) { setMsg(t('coord_bad')); return null; }
    const dep = depth.trim() ? parseFloat(depth.replace(',', '.')) : null;
    return { ...wp, id: wp.id || newId(), name: name.trim() || t('wp_default', { n: '' }).trim(), kind, lat: parsed.lat, lon: parsed.lon, notes: notes.trim() || undefined, depth: dep != null && Number.isFinite(dep) ? dep : null, at: wp.at || Date.now() };
  };
  const save = async (then?: (w: Waypoint) => void) => {
    const w = build();
    if (!w) return;
    await putWaypoint(w).catch(() => {});
    notifyNavData();
    onSaved?.(w);
    if (then) then(w); else onClose();
  };
  const del = async () => {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3500); return; }
    await deleteWaypoint(wp.id).catch(() => {});
    notifyNavData();
    onSaved?.(null);
    onClose();
  };
  const text = `${name || 'Waypoint'}: ${fmtLat(at.lat)} ${fmtLon(at.lon)} (${at.lat.toFixed(5)}, ${at.lon.toFixed(5)})`;
  const link = `https://maps.google.com/?q=${at.lat.toFixed(5)},${at.lon.toFixed(5)}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: name || 'Bahrna', text, url: link });
      else { await navigator.clipboard.writeText(`${text}\n${link}`); setMsg(t('copied')); }
    } catch { /* cancelled */ }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(`${fmtLat(at.lat)} ${fmtLon(at.lon)}`); setMsg(t('copied')); } catch { /* blocked */ } };

  return (
    <Sheet title={isNew ? t('new_wp') : t('edit_wp')} onClose={onClose}>
      {d != null && (
        <p className="mb-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
          <Navigation size={16} className="text-lagoon dark:text-shallows" style={{ transform: `rotate(${pos ? bearing(pos, at) - 45 : 0}deg)` }} />
          <span className="font-semibold tabular-nums">{fmtDist(d)} {distUnit(d)}</span>
          <span className="muted">· {t('bearing')} {pos ? String(Math.round(bearing(pos, at))).padStart(3, '0') : '—'}°</span>
        </p>
      )}
      <label className="block text-sm font-medium">{t('wp_name')}
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus={isNew}
          className="mt-1 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
      </label>
      <p className="mt-3 text-sm font-medium">{t('wp_type')}</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {WP_KINDS.map((k) => (
          <button key={k.id} onClick={() => setKind(k.id)} aria-pressed={kind === k.id}
            className={`tap flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold ${kind === k.id ? 'text-white shadow' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
            style={kind === k.id ? { background: k.color } : undefined}>
            <k.Icon size={18} /> {t(k.label)}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-sm font-medium">{t('coordinates')}
        <input value={coord} onChange={(e) => { setCoord(e.target.value); setMsg(null); }} dir="ltr" inputMode="text" spellCheck={false}
          className={`mt-1 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 font-display text-lg tabular-nums dark:bg-white/10 ${parsed ? '' : 'ring-2 ring-bad'}`} />
        <span className="muted mt-1 block text-xs">{t('coord_hint')}</span>
      </label>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="col-span-1 block text-sm font-medium">{t('depth_m')}
          <input value={depth} onChange={(e) => setDepth(e.target.value)} inputMode="decimal" placeholder="—"
            className="mt-1 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
        </label>
        <label className="col-span-2 block text-sm font-medium">{t('notes')}
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200}
            className="mt-1 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
        </label>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-lagoon dark:text-shallows">{msg}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => save()} className="tap h-12 rounded-2xl bg-abyss font-semibold text-white dark:bg-shallows dark:text-abyss">{t('save')}</button>
        {onGoTo
          ? <button onClick={() => save((w) => { onGoTo(w); onClose(); })} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#C026D3] font-semibold text-white"><Navigation size={18} /> {t('go_to')}</button>
          : <span />}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={copy} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-sm font-semibold dark:bg-white/10"><Copy size={15} /> {t('copy')}</button>
        <button onClick={share} className="tap inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-sm font-semibold dark:bg-white/10"><Share2 size={15} /> {t('share')}</button>
        {!isNew && (
          <button onClick={del} className={`tap ms-auto inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ${confirmDel ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}>
            <Trash2 size={15} /> {confirmDel ? t('confirm_again') : t('delete')}
          </button>
        )}
      </div>
    </Sheet>
  );
}
