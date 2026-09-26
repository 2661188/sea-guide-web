import { useEffect, useState } from 'react';
import { Copy, MapPinPlus, Phone, Share2, Undo2, X } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import { useSpot } from '@/lib/SpotContext';
import { fmtLat, fmtLon } from '@/lib/nav/geo';
import type { Position } from '@/lib/nav/tracker';

/** Deliberately simple: big coordinates and a few large actions. Nothing happens automatically. */
export function EmergencySheet({ open, onClose, pos, canReturn, onReturn, onSave }:
  { open: boolean; onClose: () => void; pos: Position | null; canReturn: boolean; onReturn: () => void; onSave: () => void }) {
  const { t } = useT();
  const { region } = useSpot();
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!open) setCopied(false); }, [open]);
  if (!open) return null;
  const cg = region.emergency.find((e) => /coast/i.test(e.label)) ?? region.emergency[0];
  const police = region.emergency.find((e) => /police/i.test(e.label));
  const text = pos ? `${fmtLat(pos.lat)} ${fmtLon(pos.lon)} (${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)})` : '';
  const link = pos ? `https://maps.google.com/?q=${pos.lat.toFixed(5)},${pos.lon.toFixed(5)}` : '';
  const copy = async () => { try { await navigator.clipboard.writeText(`${text}\n${link}`); setCopied(true); } catch { /* clipboard blocked */ } };
  const share = async () => {
    const msg = t('share_text', { lat: fmtLat(pos!.lat), lon: fmtLon(pos!.lon) });
    try {
      if (navigator.share) await navigator.share({ title: 'Bahrna', text: msg, url: link });
      else window.location.href = `sms:?&body=${encodeURIComponent(`${msg} ${link}`)}`;
    } catch { /* user cancelled */ }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={t('em_title')}>
      <button className="absolute inset-0 bg-black/60" aria-label={t('close')} onClick={onClose} />
      <div className="animate-rise relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-2xl dark:bg-[#0A2B40] md:rounded-3xl">
        <div className="flex items-center justify-between bg-bad px-5 py-3 text-white md:rounded-t-3xl">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{t('em_title')}</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/15" aria-label={t('close')}><X size={20} /></button>
        </div>
        <div className="space-y-3 p-4">
          <section className="rounded-2xl bg-slate-900 p-4 text-center text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">{t('em_coords')}</p>
            {pos ? (
              <>
                <p dir="ltr" className="mt-1 font-display text-[34px] font-bold leading-tight tabular-nums">{fmtLat(pos.lat)}</p>
                <p dir="ltr" className="font-display text-[34px] font-bold leading-tight tabular-nums">{fmtLon(pos.lon)}</p>
                <p dir="ltr" className="mt-1 text-xs tabular-nums text-white/60">{pos.lat.toFixed(5)}, {pos.lon.toFixed(5)} · ±{Math.round(pos.acc)} m</p>
              </>
            ) : <p className="mt-2 text-lg font-semibold">{t('em_no_fix')}</p>}
          </section>
          <p className="muted text-center text-xs">{t('em_note')}</p>
          <a href={`tel:${cg.number}`} className="tap flex h-16 items-center justify-center gap-3 rounded-2xl bg-bad text-lg font-bold text-white shadow-lg">
            <Phone size={24} /> {t('em_call', { n: cg.number })}
          </a>
          <div className="grid grid-cols-2 gap-2">
            <Big onClick={share} disabled={!pos} icon={<Share2 size={20} />} label={t('em_share')} />
            <Big onClick={copy} disabled={!pos} icon={<Copy size={20} />} label={copied ? t('em_copied') : t('em_copy')} />
            <Big onClick={() => { onReturn(); onClose(); }} disabled={!canReturn} icon={<Undo2 size={20} />} label={t('return_start')} />
            <Big onClick={() => { onSave(); onClose(); }} disabled={!pos} icon={<MapPinPlus size={20} />} label={t('em_save')} />
          </div>
          {police && <a href={`tel:${police.number}`} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-semibold dark:bg-white/10"><Phone size={18} /> {t('em_call_police', { n: police.number })}</a>}
        </div>
      </div>
    </div>
  );
}

function Big({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="tap flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-100 text-sm font-semibold disabled:opacity-40 dark:bg-white/10">
      {icon}{label}
    </button>
  );
}
