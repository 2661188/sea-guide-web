import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, Droplets, Eye, ExternalLink, Fish, Navigation2, Phone, Sunrise, Sunset, Thermometer, Waves, Wind } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TideChart } from '@/components/TideChart';
import { TideExplorer } from '@/components/TideExplorer';
import { MoonIcon } from '@/components/MoonIcon';
import { WeatherIcon } from '@/components/WeatherIcon';
import { ActivityIcon } from '@/components/ActivityIcon';
import { ErrorState, LoadingScreen, OfflineBanner, SectionTitle, SourceTag, toneDot, toneText, Val } from '@/components/ui';
import { useSpot } from '@/lib/SpotContext';
import { useConditions } from '@/lib/useConditions';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { contactLabel, spotArea, spotName } from '@/lib/i18n/place';
import { findExtremes, hourIndex, trendKey } from '@/lib/marine/tides';
import { fishingHours, fishingLabel, fishingWindows, seaSummary } from '@/lib/marine/assess';
import { ACTIVITIES, assessActivity, ratingKey, ratingLevelKey, ratingTone } from '@/lib/marine/activities';
import { moonAt } from '@/lib/marine/moon';
import { compassKey, weatherInfo } from '@/lib/marine/weather';
import { dayKey, fmtTime, nowLocalMs } from '@/lib/marine/time';

const heroTone: Record<string, string> = {
  good: 'from-[#06283D] via-[#07384F] to-[#0B5A5E]',
  ok: 'from-[#06283D] via-[#083550] to-[#0E4F6B]',
  caution: 'from-[#2A2410] via-[#3A2F0E] to-[#5A4410]',
  bad: 'from-[#3A0F12] via-[#4A1417] to-[#5E1B1B]',
  unknown: 'from-[#06283D] to-[#0E3B55]',
};
const chipTone: Record<string, string> = {
  good: 'bg-good/10 text-good', caution: 'bg-caution/15 text-amber-700 dark:text-amber-300', bad: 'bg-bad/10 text-bad', unknown: 'bg-slate-100 text-slate-500', ok: 'bg-lagoon/10 text-lagoon',
};

export default function Home() {
  const { spot, region, activity, setActivity } = useSpot();
  const { t, tm, lang } = useT();
  const cond = useConditions(spot.id);
  const { data } = cond;
  const dir = (deg: number | null | undefined) => { const k = compassKey(deg); return k ? t(k) : '—'; };

  const v = useMemo(() => {
    if (!data) return null;
    const h = data.hourly;
    const now = nowLocalMs(data.utcOffsetSeconds);
    const i = hourIndex(h.time, now);
    const hours = fishingHours(data);
    const today = dayKey(now);
    const d = Math.max(0, data.daily.date.indexOf(today));
    return {
      now, i, hours,
      extremes: findExtremes(h.time, h.seaLevel),
      summary: seaSummary(data, i),
      acts: ACTIVITIES.map((a) => assessActivity(a, data, i)),
      window: fishingWindows(data, hours, today, now, 1)[0] ?? fishingWindows(data, hours, dayKey(now + 864e5), now, 1)[0],
      wx: weatherInfo(h.weatherCode[i]),
      moon: moonAt(Date.now()),
      sunrise: data.daily.sunrise[d]?.slice(11, 16),
      sunset: data.daily.sunset[d]?.slice(11, 16),
    };
  }, [data]);

  const h = data?.hourly;
  const coastGuard = region.emergency.find((e) => /coast/i.test(e.label));
  const mine = v?.acts.find((a) => a.id === activity);
  const tone = mine ? ratingTone[mine.rating] : 'unknown';

  return (
    <AppShell status={{ refreshing: cond.refreshing, updatedAt: data?.fetchedAt, utcOffsetSeconds: data?.utcOffsetSeconds, onRefresh: cond.refresh }}>
      <div className="space-y-3 pb-20 lg:space-y-4">
        {/* Activity picker — drives the headline assessment */}
        <div role="radiogroup" aria-label={t('your_activity')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
          {ACTIVITIES.map((a) => (
            <button key={a} role="radio" aria-checked={a === activity} onClick={() => setActivity(a)}
              className={`tap flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${a === activity ? 'bg-abyss text-white shadow-sm dark:bg-shallows dark:text-abyss' : 'bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200'}`}>
              <ActivityIcon id={a} size={17} /> {t(`act_${a}`)}
            </button>
          ))}
        </div>

        {cond.offline && data && <OfflineBanner savedAt={data.fetchedAt} />}
        {cond.status === 'loading' && <LoadingScreen />}
        {cond.status === 'error' && <ErrorState errorKey={cond.error} onRetry={cond.refresh} />}

        {data && v && h && mine && (
          <>
            <div className="grid gap-3 md:grid-cols-12 lg:gap-4">
              {/* HERO — your activity, with the tide as the horizon */}
              <section className={`animate-rise relative overflow-hidden rounded-3xl bg-gradient-to-br ${heroTone[tone]} text-white shadow-lg md:col-span-7`}>
                <div className="px-5 pt-5 md:px-6 md:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      <ActivityIcon id={activity} size={15} /> {t('for_activity', { activity: t(`act_${activity}`) })}
                    </p>
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">{t('src_calc')}</span>
                  </div>
                  <h2 className="mt-2 flex items-center gap-2.5 font-display text-[34px] font-bold uppercase leading-[1.05] tracking-tight md:text-[42px]">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${toneDot[tone]} ring-4 ring-white/10`} />
                    {t(ratingLevelKey[mine.rating])}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/70">{mine.reasons.map(tm).join(' · ')}</p>

                  <dl className="mt-4 grid grid-cols-4 gap-2">
                    {(([
                      ['wind', v.summary.windMin != null ? `${Math.round(v.summary.windMin)}–${Math.round(v.summary.windMax!)}` : null, t('unit_kn')],
                      activity === 'fishing'
                        ? ['fishing', v.hours[v.i] ? t(fishingLabel(v.hours[v.i].score)) : null, '']
                        : ['gusts_label', v.summary.gustMax != null ? `${Math.round(v.summary.gustMax)}` : null, t('unit_kn')],
                      ['waves', v.summary.waveMax != null ? v.summary.waveMax.toFixed(1) : null, t('unit_m')],
                      ['tide', v.summary.trend ? t(trendKey(v.summary.trend)) : null, ''],
                    ]) as [Key, string | null, string][]).map(([label, value, unit]) => (
                      <div key={label}>
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{t(label)}</dt>
                        <dd className="mt-1 font-display text-[22px] font-semibold leading-none tabular-nums md:text-[26px]">
                          <bdi>{value ?? '—'}</bdi><span className="ms-0.5 text-xs font-medium text-white/60">{value ? unit : ''}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="mt-2">
                  <TideChart data={data} from={v.now - 3 * 3600e3} to={v.now + 21 * 3600e3} extremes={v.extremes} nowMs={v.now} variant="dark" height={112} />
                </div>
                <div className="flex items-center justify-between gap-2 bg-black/20 px-5 py-2.5 text-[11px] text-white/60 md:px-6">
                  <span>{t('hero_foot')}</span>
                  <a href={region.officialForecast.url} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 font-semibold text-shallows">
                    {t('official_forecast')} <ExternalLink size={11} />
                  </a>
                </div>
              </section>

              {/* TIDE EXPLORER — drag through the whole week */}
              <div className="md:col-span-5">
                <TideExplorer data={data} extremes={v.extremes} nowMs={v.now} />
              </div>
            </div>

            {/* ALL ACTIVITIES AT A GLANCE */}
            <SectionTitle right={<SourceTag kind="calc" />}>{t('activities')}</SectionTitle>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {v.acts.map((a) => (
                <button key={a.id} onClick={() => setActivity(a.id)} aria-pressed={a.id === activity}
                  className={`card tap p-3.5 text-start transition-shadow ${a.id === activity ? 'ring-2 ring-lagoon dark:ring-shallows' : ''}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-lagoon/10 text-lagoon dark:text-shallows"><ActivityIcon id={a.id} size={19} /></span>
                    <span className={`chip ${chipTone[ratingTone[a.rating]]}`}>{t(ratingKey[a.rating])}</span>
                  </span>
                  <span className="mt-2 block text-sm font-semibold">{t(`act_${a.id}`)}</span>
                  <span className="muted mt-0.5 line-clamp-2 block text-xs">{a.reasons.map(tm).join(' · ')}</span>
                </button>
              ))}
            </section>

            {/* CONDITIONS GRID */}
            <SectionTitle right={<SourceTag kind="live" />}>{t('right_now')}</SectionTitle>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Tile icon={<Wind size={16} />} label={t('wind')}>
                <Val v={h.windSpeed[v.i]}>
                  <p className="readout text-[34px]">{Math.round(h.windSpeed[v.i]!)}<Unit>{t('unit_kn')}</Unit></p>
                  <p className="muted mt-1 flex items-center gap-1 text-xs">
                    <Navigation2 size={13} className="shrink-0 text-lagoon" style={{ transform: `rotate(${(h.windDirection[v.i] ?? 0) + 180}deg)` }} aria-hidden="true" />
                    {t('from_dir', { d: dir(h.windDirection[v.i]) })} · {t('gusts', { v: h.windGusts[v.i] != null ? Math.round(h.windGusts[v.i]!) : '—' })}
                  </p>
                </Val>
              </Tile>
              <Tile icon={<Waves size={16} />} label={t('waves')}>
                <Val v={h.waveHeight[v.i]}>
                  <p className="readout text-[34px]">{h.waveHeight[v.i]!.toFixed(1)}<Unit>{t('unit_m')}</Unit></p>
                  <p className="muted mt-1 text-xs">{h.wavePeriod[v.i] != null ? t('period', { v: h.wavePeriod[v.i]!.toFixed(0) }) : t('period_na')} · {t('wave_from', { d: dir(h.waveDirection[v.i]) })}</p>
                </Val>
              </Tile>
              <Tile icon={<WeatherIcon kind={v.wx?.kind} size={16} />} label={t('weather')}>
                <Val v={h.airTemp[v.i]}>
                  <p className="readout text-[34px]">{Math.round(h.airTemp[v.i]!)}<Unit>°C</Unit></p>
                  <p className="muted mt-1 text-xs">{v.wx ? t(v.wx.key) : '—'}{h.precipProb[v.i] ? ` · ${t('rain_pct', { v: h.precipProb[v.i]! })}` : ''}</p>
                </Val>
              </Tile>
              <Tile icon={<Thermometer size={16} />} label={t('sea_temp')}>
                <Val v={h.seaTemp[v.i]}>
                  <p className="readout text-[34px]">{h.seaTemp[v.i]!.toFixed(1)}<Unit>°C</Unit></p>
                  <p className="muted mt-1 text-xs">{t('surface')}</p>
                </Val>
              </Tile>
              <Tile icon={<Droplets size={16} />} label={t('humidity')}>
                <Val v={h.humidity[v.i]}><p className="readout text-[34px]">{Math.round(h.humidity[v.i]!)}<Unit>%</Unit></p></Val>
              </Tile>
              <Tile icon={<Eye size={16} />} label={t('visibility')}>
                <Val v={h.visibility[v.i]}>
                  <p className="readout text-[34px]"><bdi>{h.visibility[v.i]! >= 10000 ? '10+' : (h.visibility[v.i]! / 1000).toFixed(1)}</bdi><Unit>{t('unit_km')}</Unit></p>
                </Val>
              </Tile>
              <Tile icon={<Sunrise size={16} />} label={t('sun')}>
                <p className="readout text-[28px]">{v.sunrise ?? '—'}</p>
                <p className="muted mt-1 flex items-center gap-1 text-xs"><Sunset size={13} /> {t('sunset_at', { v: v.sunset ?? '—' })}</p>
              </Tile>
              <Tile icon={null} label={t('moon')} tag="calc">
                <div className="flex items-center gap-3">
                  <MoonIcon fraction={v.moon.fraction} size={40} />
                  <div>
                    <p className="text-sm font-semibold leading-tight">{t(v.moon.name)}</p>
                    <p className="muted text-xs">{t('lit', { v: Math.round(v.moon.illumination * 100) })}</p>
                  </div>
                </div>
              </Tile>
            </section>

            <div className="grid gap-3 md:grid-cols-2">
              {/* FISHING TEASER */}
              <Link href="/fishing" className="card tap flex items-center gap-4 p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lagoon/10 text-lagoon dark:text-shallows"><Fish size={24} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="eyebrow">{t('best_window')}</span><SourceTag kind="calc" /></span>
                  {v.window ? (
                    <span className="mt-1 block">
                      <span className="readout block text-[28px]">{fmtTime(v.window.start)}–{fmtTime(v.window.end)}</span>
                      <span className={`mt-0.5 block text-sm ${toneText[v.window.tone]}`}>{t(dayKey(v.window.start) === dayKey(v.now) ? 'today' : 'tomorrow')} · {t(v.window.label)}</span>
                    </span>
                  ) : <span className="muted block text-sm">{t('no_window')}</span>}
                </span>
                <ChevronRight className="shrink-0 text-slate-400 rtl:rotate-180" />
              </Link>

              {coastGuard && (
                <a href={`tel:${coastGuard.number}`} className="tap flex items-center justify-between gap-3 rounded-2xl border border-bad/20 bg-bad/5 px-4 py-4 text-sm font-semibold text-bad">
                  <span className="flex items-center gap-2"><Phone size={18} /> {t('emergency_sea', { label: contactLabel(coastGuard, lang) })}</span>
                  <span className="font-display text-3xl">{coastGuard.number}</span>
                </a>
              )}
            </div>

            <p className="px-1 pt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t('footer_src', { src: data.source.name, place: spotArea(spot, lang) ?? spotName(spot, lang) })}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="ms-1 font-sans text-sm font-medium text-slate-400">{children}</span>;
}

function Tile({ icon, label, children, tag }: { icon: React.ReactNode; label: string; children: React.ReactNode; tag?: 'calc' }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow flex items-center gap-1.5">{icon}{label}</p>
        {tag && <SourceTag kind={tag} />}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
