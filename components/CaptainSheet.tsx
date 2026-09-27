import { useEffect } from 'react';
import { Phone, ShipWheel, X } from 'lucide-react';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import { contactLabel } from '@/lib/i18n/place';
import { CaptainPanel } from './ai/CaptainPanel';
import { stopAll } from '@/lib/ai/captain';

/** Ask Bahrna: the voice captain. Answers come from the app's own data and tools. */
export function CaptainSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { region } = useSpot();
  const { t, lang } = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const close = () => { stopAll(); onClose(); };
  const coastGuard = region.emergency.find((e) => /coast/i.test(e.label));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={t('ai_title')}>
      <button className="absolute inset-0 bg-abyss/50 backdrop-blur-[2px]" aria-label={t('close')} onClick={close} />
      <div className="animate-rise relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-2xl dark:bg-[#0A2B40] md:max-w-lg md:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-inherit px-5 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-abyss text-shallows"><ShipWheel size={20} /></span>
            <div>
              <h2 className="font-display text-2xl font-semibold leading-none">{t('ai_title')}</h2>
              <p className="muted text-xs">{t('ai_sub')}</p>
            </div>
          </div>
          <button onClick={close} className="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10" aria-label={t('close')}><X size={20} /></button>
        </div>
        <div className="space-y-3 px-5 pb-5">
          <CaptainPanel />
          {coastGuard && (
            <a href={`tel:${coastGuard.number}`} className="tap flex items-center justify-between rounded-2xl bg-bad/10 p-4 text-bad">
              <span className="font-semibold">{t('emergency_call', { label: contactLabel(coastGuard, lang) })}</span>
              <span className="flex items-center gap-1.5 font-display text-2xl font-bold"><Phone size={18} />{coastGuard.number}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
