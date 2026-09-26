import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';

/** Bottom sheet on phones, centred dialog on larger screens. Esc and backdrop close it. */
export function Sheet({ title, onClose, children, wide = false, z = 'z-50' }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean; z?: string }) {
  const { t } = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={`fixed inset-0 ${z} flex items-end justify-center md:items-center md:p-6`} role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-abyss/50 backdrop-blur-[2px]" aria-label={t('close')} onClick={onClose} />
      <div className={`animate-rise relative max-h-[90vh] w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-2xl dark:bg-[#0A2B40] md:rounded-3xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-white/95 px-5 py-3 backdrop-blur dark:bg-[#0A2B40]/95">
          <div className="min-w-0 flex-1 font-display text-2xl font-semibold leading-tight">{title}</div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10" aria-label={t('close')}><X size={20} /></button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
