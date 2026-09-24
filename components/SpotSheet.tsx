import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { REGIONS } from '@/lib/regions';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import { regionName, spotArea, spotName } from '@/lib/i18n/place';

export function SpotSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { spot, setSpotId } = useSpot();
  const { t, lang } = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t('where_heading')}>
      <button className="absolute inset-0 bg-abyss/50 backdrop-blur-[2px]" aria-label={t('close')} onClick={onClose} />
      <div className="animate-rise relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-2xl dark:bg-[#0A2B40]">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="font-display text-2xl font-semibold">{t('where_heading')}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" aria-label={t('close')}><X size={20} /></button>
        </div>
        {Object.values(REGIONS).map((region) => (
          <div key={region.id} className="px-3 pb-4 pt-2">
            <p className="eyebrow px-2 pb-1">{regionName(region, lang)}</p>
            <ul>
              {region.spots.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => { setSpotId(s.id); onClose(); }}
                    className={`tap flex min-h-[56px] w-full items-center justify-between rounded-xl px-3 py-3 text-start ${s.id === spot.id ? 'bg-lagoon/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                    <span>
                      <span className="font-semibold">{spotName(s, lang)}</span>{' '}
                      <span className="muted text-sm">{lang === 'ar' ? s.name : s.ar}</span>
                      {s.area && <span className="muted block text-xs">{spotArea(s, lang)}</span>}
                    </span>
                    {s.id === spot.id && <Check size={18} className="text-lagoon" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
