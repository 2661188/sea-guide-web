import { Anchor, Fuel, LifeBuoy, MapPin, Navigation, Star } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Planned, SectionTitle, SourceTag } from '@/components/ui';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import { spotArea, spotName } from '@/lib/i18n/place';

export default function MapPage() {
  const { spot } = useSpot();
  const { t, lang } = useT();
  const q = `${spot.lat},${spot.lon}`;
  return (
    <AppShell title={t('nav_map')}>
      <div className="space-y-3 pb-20">
        <section className="card p-4">
          <p className="eyebrow">{t('forecast_point')}</p>
          <p className="mt-1 font-display text-2xl font-semibold">{spotName(spot, lang)} <span className="font-sans text-base font-normal text-slate-500">{lang === 'ar' ? spot.name : spot.ar}</span></p>
          <p className="muted text-sm tabular-nums">{spotArea(spot, lang)} · <bdi>{spot.lat.toFixed(4)}°N, {spot.lon.toFixed(4)}°E</bdi></p>
          <div className="mt-3 grid grid-cols-2 gap-2 md:max-w-md">
            <a className="tap flex h-11 items-center justify-center gap-2 rounded-xl bg-abyss text-sm font-semibold text-white" href={`https://maps.apple.com/?ll=${q}&q=${encodeURIComponent(spot.name)}`} target="_blank" rel="noreferrer">
              <Navigation size={15} /> {t('apple_maps')}
            </a>
            <a className="tap flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10" href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">
              <MapPin size={15} /> {t('google_maps')}
            </a>
          </div>
        </section>

        <SectionTitle right={<SourceTag kind="info" />}>{t('map_coming')}</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
        <Planned icon={<Anchor size={20} />} title={t('m1')} text={t('m1_t')} />
        <Planned icon={<Fuel size={20} />} title={t('m2')} text={t('m2_t')} />
        <Planned icon={<Star size={20} />} title={t('m3')} text={t('m3_t')} />
        <Planned icon={<LifeBuoy size={20} />} title={t('m4')} text={t('m4_t')} />
        </div>
      </div>
    </AppShell>
  );
}
