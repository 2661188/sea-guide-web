import { useEffect, useState } from 'react';
import { Check, NotebookPen, RotateCcw, Route } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Planned, SectionTitle, SourceTag } from '@/components/ui';
import { load, save } from '@/lib/storage';
import { useT } from '@/lib/i18n/LangContext';

const CHECKLIST = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'] as const;

export default function Trips() {
  const { t } = useT();
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => setDone(load('checklist', {})), []);
  const toggle = (item: string) => {
    const next = { ...done, [item]: !done[item] };
    setDone(next);
    save('checklist', next);
  };
  const reset = () => { setDone({}); save('checklist', {}); };
  const count = CHECKLIST.filter((i) => done[i]).length;

  return (
    <AppShell title={t('nav_trips')} showSpot={false}>
      <div className="space-y-3 pb-20">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <div>
              <p className="eyebrow">{t('before_leave')}</p>
              <h2 className="font-display text-2xl font-semibold">{t('checklist_title')}</h2>
            </div>
            <p className="readout text-3xl"><bdi>{count}<span className="text-base text-slate-400">/{CHECKLIST.length}</span></bdi></p>
          </div>
          <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-full rounded-full bg-lagoon transition-all" style={{ width: `${(count / CHECKLIST.length) * 100}%` }} />
          </div>
          <ul className="mt-2">
            {CHECKLIST.map((item) => (
              <li key={item}>
                <button onClick={() => toggle(item)} aria-pressed={!!done[item]}
                  className="tap flex min-h-[52px] w-full items-center gap-3 px-4 text-start hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${done[item] ? 'border-lagoon bg-lagoon text-white' : 'border-slate-300 dark:border-white/30'}`}>
                    {done[item] && <Check size={15} strokeWidth={3} />}
                  </span>
                  <span className={done[item] ? 'text-slate-400 line-through' : 'font-medium'}>{t(item)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-white/10">
            <p className="muted text-xs">{t('saved_offline')}</p>
            <button onClick={reset} className="tap flex shrink-0 items-center gap-1.5 text-sm font-semibold text-lagoon"><RotateCcw size={14} /> {t('new_trip')}</button>
          </div>
        </section>

        <SectionTitle right={<SourceTag kind="info" />}>{t('coming_next')}</SectionTitle>
        <Planned icon={<Route size={20} />} title={t('plan_trip')} text={t('plan_trip_t')} />
        <Planned icon={<NotebookPen size={20} />} title={t('journal')} text={t('journal_t')} />
      </div>
    </AppShell>
  );
}
