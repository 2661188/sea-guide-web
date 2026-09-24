import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronRight, Droplets, Eye, ExternalLink, Fish, Navigation2, Phone, Sunrise, Sunset, Thermometer, Waves, Wind } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TideChart } from '@/components/TideChart';
import { MoonIcon } from '@/components/MoonIcon';
import { WeatherIcon } from '@/components/WeatherIcon';
import { ErrorState, LoadingScreen, OfflineBanner, SectionTitle, SourceTag, toneDot, Val } from '@/components/ui';
import { useSpot } from '@/lib/SpotContext';
import { useConditions } from '@/lib/useConditions';
import { useT } from '@/lib/i18n/LangContext';
import { contactLabel, spotArea, spotName } from '@/lib/i18n/place';
import { findExtremes, hourIndex, levelAt, trendKey } from '@/lib/marine/tides';
import { fishingHours, fishingLabel, fishingWindows, seaSummary } from '@/lib/marine/assess';
import { moonAt } from '@/lib/marine/moon';
import { compassKey, weatherInfo } from '@/lib/marine/weather';
import { dayKey, fmtTime, nowLocalMs, untilMsg } from '@/lib/marine/time';

const heroTone: Record<string, string> = {
  good: 'from-[#06283D] via-[#07384F] to-[#0B5A5E]',
  ok: 'from-[#06283D] via-[#083550] to-[#0E4F6B]',
  caution: 'from-[#2A2410] via-[#3A2F0E] to-[#5A4410]',
  bad: 'from-[#3A0F12] via-[#4A1417] to-[#5E1B1B]',
  unknown: 'from-[#06283D] to-[#0E3B55]',
};

export default function Home() {
  const { spot, region } = useSpot();
  const { t, tm, lang } = useT();
  const cond = useConditions(spot.id);
  const { data } = cond;
  const dir = (deg: number | null | undefined) => { const k = compassKey(deg); return k ? t(k) : '—'; };

  const v = useMemo(() => {
    if (!data) return null;
    const h = data.hourly;
    const now = nowLocalMs(data.utcOffsetSeconds);
    const i = hourIndex(h.time, now);
    const extremes = findExtremes(h.time, h.seaLevel);
    const upcoming = extremes.filter((e) => e.at > now).slice(0, 2);
    const summary = seaSummary(data, i);
    const hours = fishingHours(data);
    const today = dayKey(now);
    const d = Math.max(0, data.daily.date.indexOf(today));
    return {
      now, i, extremes, upcoming, summary,
      fishNow: hours[i]?.score ?? null,
      window: fishingWindows(data, hours, today, now, 1)[0] ?? fishingWindows(data, hours, dayKey(now + 864e5), now, 1)[0],
      level: levelAt(h.time, h.seaLevel, now),
      wx: weatherInfo(h.weatherCode[i]),
      moon: moonAt(Date.now()),
      sunrise: data.daily.sunrise[d]?.slice(11, 16),
      sunset: data.daily.sunset[d]?.slice(11, 16),
    };
  }, [data]);

  const h = data?.hourly;
  const coastGuard = region.emergency.find((e) => /coast/i.test(e.label));

  return (
    <AppShell status={{ refreshing: cond.refreshing, updatedAt: data?.fetchedAt, utcOffsetSeconds: data?.utcOffsetSeconds, onRefresh: cond.refresh }}>
      <div className="space-y-3 pb-20">
        {cond.offline && data && <OfflineBanner savedAt={data.fetchedAt} />}
        {cond.status === 'loading' && <LoadingScreen />}
        {cond.status === 'error' && <ErrorState errorKey={cond.error} onRetry={cond.refresh} />}

        {data && v && h && (
          <>
            {/* HERO — today on the water, with the tide as the horizon */}
            <section className={`animate-rise relative overflow-hidden rounded-3xl bg-gradient-to-br ${heroTone[v.summary.tone]} text-white shadow-lg`}>
              <div className="px-5 pt-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{t('today_on_water')}</p>
                  <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">{t('src_calc')}</span>
                </div>
                <h2 className="mt-2 flex items-center gap-2.5 font-display text-[34px] font-bold uppercase leading-[1.05] tracking-tight">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${v.summary.tone === 'ok' ? 'bg-shallows' : toneDot[v.summary.tone]} ring-4 ring-white/10`} />
                  {t(v.summary.level)}
                </h2>
                <p className="mt-1.5 text-sm text-white/70">{v.summary.reasons.map(tm).join(' · ')}</p>

                <dl className="mt-4 grid grid-cols-4 gap-2">
                  {([
                    ['wind', v.summary.windMin != null ? `${Math.round(v.summary.windMin)}–${Math.round(v.summary.windMax!)}` : null, t('unit_kn')],
                    ['waves', v.summary.waveMax != null ? v.summary.waveMax.toFixed(1) : null, t('unit_m')],
                    ['tide', v.summary.trend ? t(trendKey(v.summary.trend)) : null, ''],
                    ['fishing', v.fishNow != null ? t(fishingLabel(v.fishNow)) : null, ''],
                  ] as const).map(([label, value, unit]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{t(label)}</dt>
                      <dd className="mt-1 font-display text-[22px] font-semibold leading-none tabular-nums">
                        <bdi>{value ?? '—'}</bdi><span className="ms-0.5 text-xs font-medium text-white/60">{value ? unit : ''}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="mt-2">
                <TideChart data={data} from={v.now - 3 * 3600e3} to={v.now + 21 * 3600e3} extremes={v.extremes} nowMs={v.now} variant="dark" height={112} />
              </div>
              <div className="flex items-center justify-between gap-2 bg-black/20 px-5 py-2.5 text-[11px] text-white/60">
                <span>{t('hero_foot')}</span>
                <a href={region.officialForecast.url} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 font-semibold text-shallows">
                  {t('official_forecast')} <ExternalLink size={11} />
                </a>
              </div>
            </section>

            {/* TIDE */}
            <section className="card p-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{t('tide')}</p>
                <SourceTag kind="live" />
              </div>
              <p className="readout mt-2 text-[40px]">{v.summary.trend ? t(trendKey(v.summary.trend)) : '—'}</p>
              <p className="muted mt-1 text-sm"><Val v={v.level}>{v.level != null && t('vs_msl', { v: `${v.level >= 0 ? '+' : ''}${v.level.toFixed(2)}` })}</Val></p>
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
                {v.upcoming.length === 0 && <li className="muted py-2 text-sm">{t('no_turning')}</li>}
                {v.upcoming.map((e) => (
                  <li key={e.at} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="flex items-center gap-2 font-medium">
                      {e.type === 'high' ? <ArrowUp size={16} className="text-lagoon" /> : <ArrowDown size={16} className="text-buoy" />}
                      {t(e.type === 'high' ? 'high_tide' : 'low_tide')}
                    </span>
                    <span className="text-end">
                      <span className="readout text-2xl">{fmtTime(e.at)}</span>
                      <span className="muted ms-2 text-xs">{e.height.toFixed(2)} {t('unit_m')} · {tm(untilMsg(e.at, v.now))}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* CONDITIONS GRID */}
            <SectionTitle right={<SourceTag kind="live" />}>{t('right_now')}</SectionTitle>
            <section className="grid grid-cols-2 gap-3">
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

            {/* FISHING TEASER */}
            <Link href="/fishing" className="card tap flex items-center gap-4 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lagoon/10 text-lagoon dark:text-shallows"><Fish size={24} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="eyebrow">{t('best_window')}</span><SourceTag kind="calc" /></span>
                {v.window ? (
                  <span className="mt-1 block">
                    <span className="readout block text-[28px]">{fmtTime(v.window.start)}–{fmtTime(v.window.end)}</span>
                    <span className="muted mt-0.5 block text-sm">{t(dayKey(v.window.start) === dayKey(v.now) ? 'today' : 'tomorrow')} · {t(v.window.label)}</span>
                  </span>
                ) : <span className="muted block text-sm">{t('no_window')}</span>}
              </span>
              <ChevronRight className="shrink-0 text-slate-400 rtl:rotate-180" />
            </Link>

            {/* SAFETY + SOURCES */}
            <section className="space-y-2 px-1 pt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {coastGuard && (
                <a href={`tel:${coastGuard.number}`} className="tap flex items-center justify-between rounded-2xl border border-bad/20 bg-bad/5 px-4 py-3 text-sm font-semibold text-bad">
                  <span className="flex items-center gap-2"><Phone size={16} /> {t('emergency_sea', { label: contactLabel(coastGuard, lang) })}</span>
                  <span className="font-display text-xl">{coastGuard.number}</span>
                </a>
              )}
              <p>{t('footer_src', { src: data.source.name, place: spotArea(spot, lang) ?? spotName(spot, lang) })}</p>
            </section>
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
