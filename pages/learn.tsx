import { useEffect, useState } from 'react';
import { ExternalLink, Lightbulb, Phone, X } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { SectionTitle, SourceTag } from '@/components/ui';
import { ArtLang } from '@/components/LearnArt';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { contactLabel, forecastName, regionName } from '@/lib/i18n/place';
import { CATS, LEARN, LearnCat, LearnItem } from '@/lib/learn';

const LEVEL: Record<LearnItem['level'], { k: Key; cls: string }> = {
  easy: { k: 'lvl_easy', cls: 'bg-good/10 text-good' },
  med: { k: 'lvl_med', cls: 'bg-lagoon/10 text-lagoon dark:text-shallows' },
  adv: { k: 'lvl_adv', cls: 'bg-caution/15 text-amber-700 dark:text-amber-300' },
};

export default function Learn() {
  const { region } = useSpot();
  const { t, lang } = useT();
  const [cat, setCat] = useState<LearnCat | 'all'>('all');
  const [open, setOpen] = useState<LearnItem | null>(null);
  const items = LEARN.filter((i) => cat === 'all' || i.cat === cat);
  const KNOTS: LearnCat[] = ['boat_knots', 'fishing_knots'];
  const groups: { id: string; title: string; cats: LearnCat[]; sub?: string }[] = cat === 'all'
    ? [{ id: 'knots', title: t('knots'), cats: KNOTS, sub: t('knots_sub') }, { id: 'skills', title: t('skills'), cats: CATS.map((c) => c.id).filter((c) => !KNOTS.includes(c)), sub: t('skills_sub') }]
    : CATS.filter((c) => c.id === cat).map((c) => ({ id: c.id, title: c.title[lang], cats: [c.id] }));

  return (
    <ArtLang.Provider value={lang}>
      <AppShell title={t('learn_title')} showSpot={false}>
        <div className="space-y-3 pb-6">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
            {[{ id: 'all' as const, title: { en: 'All', ar: 'الكل' } }, ...CATS].map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id}
                className={`tap h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${cat === c.id ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200'}`}>
                {c.title[lang]}
              </button>
            ))}
          </div>

          {groups.map((g) => (
            <div key={g.id} className="space-y-2">
              <SectionTitle right={<SourceTag kind="info" />}>{g.title}</SectionTitle>
              {g.sub && <p className="muted -mt-1 px-1 text-sm">{g.sub}</p>}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {items.filter((i) => g.cats.includes(i.cat)).map((i) => (
                  <button key={i.id} onClick={() => setOpen(i)} className="card tap overflow-hidden text-start">
                    <div className="aspect-[240/150] w-full"><i.Art /></div>
                    <div className="p-3">
                      <p className="font-semibold leading-tight">{i.title[lang]}</p>
                      <p className="mt-1.5 flex items-center gap-1.5">
                        <span className={`chip py-0.5 text-[10px] ${LEVEL[i.level].cls}`}>{t(LEVEL[i.level].k)}</span>
                        <span className="muted text-[11px]">{t('of_n', { n: i.steps.length })}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <SectionTitle right={<SourceTag kind="info" />}>{t('emergency', { region: regionName(region, lang) })}</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <section className="card divide-y divide-slate-100 overflow-hidden dark:divide-white/10">
              {region.emergency.map((e) => (
                <a key={e.number} href={`tel:${e.number}`} className="tap flex min-h-[56px] items-center justify-between px-4 hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="flex items-center gap-2.5 font-semibold"><Phone size={16} className="text-bad" /> {contactLabel(e, lang)}</span>
                  <span className="font-display text-2xl font-semibold tabular-nums">{e.number}</span>
                </a>
              ))}
            </section>
            <a href={region.officialForecast.url} target="_blank" rel="noreferrer" className="card tap flex items-center justify-between gap-2 self-start p-4">
              <span>
                <span className="eyebrow block">{t('official_title')}</span>
                <span className="font-semibold">{forecastName(region, lang)}</span>
              </span>
              <ExternalLink size={18} className="shrink-0 text-lagoon" />
            </a>
          </div>
        </div>
        {open && <LearnSheet item={open} onClose={() => setOpen(null)} />}
      </AppShell>
    </ArtLang.Provider>
  );
}

function LearnSheet({ item, onClose }: { item: LearnItem; onClose: () => void }) {
  const { t, lang } = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={item.title[lang]}>
      <button className="absolute inset-0 bg-abyss/50 backdrop-blur-[2px]" aria-label={t('close')} onClick={onClose} />
      <div className="animate-rise relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-2xl dark:bg-[#0A2B40] md:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-5 py-3 backdrop-blur dark:bg-[#0A2B40]/95">
          <h2 className="font-display text-[26px] font-semibold leading-tight">{item.title[lang]}</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10" aria-label={t('close')}><X size={20} /></button>
        </div>
        <div className="px-5 pb-6">
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10"><item.Art /></div>
          <p className="mt-3 text-sm"><span className="font-semibold">{t('use_for')}: </span>{item.use[lang]}</p>
          <p className="eyebrow mt-4">{t('steps')}</p>
          <ol className="mt-2 space-y-2">
            {item.steps.map((s, k) => (
              <li key={k} className="flex gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-abyss font-display text-lg font-bold text-white dark:bg-shallows dark:text-abyss">{k + 1}</span>
                <span className="text-[15px] leading-snug">{s[lang]}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
            <Lightbulb size={18} className="shrink-0" /> <span><b>{t('tip')}: </b>{item.tip[lang]}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
