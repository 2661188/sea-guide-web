import { useState } from 'react';
import { Sailboat, Star, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Planned, SectionTitle } from '@/components/ui';
import { useT } from '@/lib/i18n/LangContext';
import { LANGS } from '@/lib/i18n/strings';

export default function Profile() {
  const { t, lang, setLang } = useT();
  const [cleared, setCleared] = useState(false);
  const clearSaved = () => {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('bahrna:cond:')).forEach((k) => localStorage.removeItem(k));
    } catch { /* storage blocked */ }
    setCleared(true);
  };
  return (
    <AppShell title={t('profile')} showSpot={false}>
      <div className="space-y-3 pb-20 lg:max-w-3xl">
        <SectionTitle>{t('settings')}</SectionTitle>
        <section className="card divide-y divide-slate-100 text-sm dark:divide-white/10">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="font-medium">{t('language')}</span>
            <div role="radiogroup" aria-label={t('language')} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/10">
              {LANGS.map((l) => (
                <button key={l.id} role="radio" aria-checked={lang === l.id} onClick={() => setLang(l.id)} lang={l.id}
                  className={`tap h-9 rounded-lg px-4 text-sm font-semibold ${lang === l.id ? 'bg-white text-ink shadow-sm dark:bg-[#0A2B40] dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <Row label={t('appearance')} value={t('appearance_v')} />
          <Row label={t('units')} value={t('units_v')} />
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="font-medium">{t('saved_forecasts')}</span>
            <button onClick={clearSaved} className="tap flex items-center gap-1.5 font-semibold text-lagoon">
              <Trash2 size={14} /> {t(cleared ? 'cleared' : 'clear')}
            </button>
          </div>
        </section>

        <SectionTitle>{t('boats_places')}</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <Planned icon={<Sailboat size={20} />} title={t('my_boats')} text={t('my_boats_t')} />
          <Planned icon={<Star size={20} />} title={t('favourites')} text={t('favourites_t')} />
        </div>

        <SectionTitle>{t('about_data')}</SectionTitle>
        <section className="card space-y-2 p-4 text-sm leading-relaxed">
          <p>{t('about_1')}</p>
          <p>{t('about_2')}</p>
          <p>{t('about_3')}</p>
          <p className="muted">{t('about_4')}</p>
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <span className="font-medium">{label}</span>
      <span className="muted text-end">{value}</span>
    </div>
  );
}
