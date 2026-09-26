import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { EMIRATES, EmirateId, REGIONS } from '@/lib/regions';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import { spotArea, spotName } from '@/lib/i18n/place';

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
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={t('where_heading')}>
      <button className="absolute inset-0 bg-abyss/50 backdrop-blur-[2px]" aria-label={t('close')} onClick={onClose} />
      <div className="animate-rise relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-3xl md:max-w-lg md:rounded-3xl bg-white pb-safe shadow-2xl dark:bg-[#0A2B40]">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="font-display text-2xl font-semibold">{t('where_heading')}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" aria-label={t('close')}><X size={20} /></button>
        </div>
        {Object.values(REGIONS).map((region) => (Object.keys(EMIRATES) as EmirateId[]).map((em) => {
          const list = region.spots.filter((s) => s.emirate === em);
          if (!list.length) return null;
          return (
          <div key={em} className="px-3 pb-2 pt-2">
            <p className="eyebrow px-2 pb-1">{EMIRATES[em][lang]}</p>
            <ul className="md:grid md:grid-cols-2 md:gap-1">
              {list.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => { setSpotId(s.id); onClose(); }}
                    className={`tap flex min-h-[52px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-start ${s.id === spot.id ? 'bg-lagoon/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
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
          );
        }))}
        <div className="h-4" />
      </div>
    </div>
  );
}
