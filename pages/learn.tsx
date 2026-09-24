import { BookOpen, ExternalLink, Phone, Sailboat } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Planned, SectionTitle, SourceTag } from '@/components/ui';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import { contactLabel, forecastName, regionName } from '@/lib/i18n/place';

export default function Learn() {
  const { region } = useSpot();
  const { t, lang } = useT();
  return (
    <AppShell title={t('nav_learn')} showSpot={false}>
      <div className="space-y-3 pb-20">
        <SectionTitle right={<SourceTag kind="info" />}>{t('emergency', { region: regionName(region, lang) })}</SectionTitle>
        <section className="card divide-y divide-slate-100 overflow-hidden dark:divide-white/10">
          {region.emergency.map((e) => (
            <a key={e.number} href={`tel:${e.number}`} className="tap flex min-h-[56px] items-center justify-between px-4 hover:bg-slate-50 dark:hover:bg-white/5">
              <span className="flex items-center gap-2.5 font-semibold"><Phone size={16} className="text-bad" /> {contactLabel(e, lang)}</span>
              <span className="font-display text-2xl font-semibold tabular-nums">{e.number}</span>
            </a>
          ))}
        </section>
        <a href={region.officialForecast.url} target="_blank" rel="noreferrer" className="card tap flex items-center justify-between gap-2 p-4">
          <span>
            <span className="eyebrow block">{t('official_title')}</span>
            <span className="font-semibold">{forecastName(region, lang)}</span>
          </span>
          <ExternalLink size={18} className="shrink-0 text-lagoon" />
        </a>

        <SectionTitle>{t('coming_next')}</SectionTitle>
        <Planned icon={<BookOpen size={20} />} title={t('k1')} text={t('k1_t')} />
        <Planned icon={<BookOpen size={20} />} title={t('k2')} text={t('k2_t')} />
        <Planned icon={<Sailboat size={20} />} title={t('k3')} text={t('k3_t')} />
      </div>
    </AppShell>
  );
}
