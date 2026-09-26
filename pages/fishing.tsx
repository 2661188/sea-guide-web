import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Minus, Plus, Sunrise, Sunset, Waves, Wind } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TideChart } from '@/components/TideChart';
import { FishingToday } from '@/components/FishingToday';
import { MoonIcon } from '@/components/MoonIcon';
import { WeatherIcon } from '@/components/WeatherIcon';
import { ErrorState, LoadingScreen, OfflineBanner, SectionTitle, SourceTag, toneText } from '@/components/ui';
import { useSpot } from '@/lib/SpotContext';
import { useConditions } from '@/lib/useConditions';
import { useT } from '@/lib/i18n/LangContext';
import { dayName, fmtDayL } from '@/lib/i18n/strings';
import type { Conditions } from '@/lib/marine/types';
import { findExtremes, TideExtreme } from '@/lib/marine/tides';
import { dayKeys, FishingHour, fishingHours, fishingLabel, fishingTone, fishingWindows, FishingWindow } from '@/lib/marine/assess';
import { moonAt } from '@/lib/marine/moon';
import { weatherInfo } from '@/lib/marine/weather';
import { dayKey, fmtTime, nowLocalMs, toLocalMs } from '@/lib/marine/time';

type View = 'today' | 'tomorrow' | 'week';

const barColor = (s: number) => (s >= 75 ? 'bg-good' : s >= 60 ? 'bg-lagoon' : s >= 45 ? 'bg-caution/80' : 'bg-slate-300 dark:bg-white/20');

export default function Fishing() {
  const { spot } = useSpot();
  const { t, lang } = useT();
  const cond = useConditions(spot.id);
  const { data } = cond;
  const [view, setView] = useState<View>('today');
  const [pickedDay, setPickedDay] = useState<string | null>(null);

  const base = useMemo(() => {
    if (!data) return null;
    const now = nowLocalMs(data.utcOffsetSeconds);
    return { now, hours: fishingHours(data), extremes: findExtremes(data.hourly.time, data.hourly.seaLevel), days: dayKeys(data) };
  }, [data]);

  const today = base ? dayKey(base.now) : '';
  const tomorrow = base ? dayKey(base.now + 864e5) : '';
  const day = pickedDay ?? (view === 'tomorrow' ? tomorrow : today);

  return (
    <AppShell title={t('nav_fishing')} status={{ refreshing: cond.refreshing, updatedAt: data?.fetchedAt, utcOffsetSeconds: data?.utcOffsetSeconds, onRefresh: cond.refresh }}>
      <div className="space-y-3 pb-20">
        <div role="tablist" aria-label={t('day')} className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200/70 p-1 dark:bg-white/10">
          {([['today', 'today'], ['tomorrow', 'tomorrow'], ['week', 'week']] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={view === k && !pickedDay}
              onClick={() => { setView(k); setPickedDay(null); }}
              className={`tap h-11 rounded-xl text-sm font-semibold transition-colors ${view === k && !pickedDay ? 'bg-white text-ink shadow-sm dark:bg-[#0A2B40] dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              {t(label)}
            </button>
          ))}
        </div>

        {cond.offline && data && <OfflineBanner savedAt={data.fetchedAt} />}
        {cond.status === 'loading' && <LoadingScreen />}
        {cond.status === 'error' && <ErrorState errorKey={cond.error} onRetry={cond.refresh} />}

        {data && base && view === 'today' && !pickedDay && (
          <FishingToday data={data} hours={base.hours} windows={fishingWindows(data, base.hours, today, base.now, 2)} now={base.now} />
        )}

        {data && base && (view !== 'week' || pickedDay) && (
          <>
            {pickedDay && (
              <button onClick={() => setPickedDay(null)} className="tap flex items-center gap-1 px-1 text-sm font-semibold text-lagoon">
                <ChevronLeft size={16} className="rtl:rotate-180" /> {t('week')}
              </button>
            )}
            <DayView data={data} day={day} now={base.now} hours={base.hours} extremes={base.extremes}
              isToday={day === today}
              label={day === today ? t('today') : day === tomorrow ? t('tomorrow') : fmtDayL(lang, toLocalMs(`${day}T00:00`))} />
          </>
        )}

        {data && base && view === 'week' && !pickedDay && (
          <WeekView data={data} days={base.days} now={base.now} hours={base.hours} extremes={base.extremes} onPick={setPickedDay} today={today} />
        )}

        <HowWeEstimate />
      </div>
    </AppShell>
  );
}

function DayView({ data, day, now, hours, extremes, label, isToday }: {
  data: Conditions; day: string; now: number; hours: FishingHour[]; extremes: TideExtreme[]; label: string; isToday: boolean;
}) {
  const { t } = useT();
  const windows = fishingWindows(data, hours, day, now, 3);
  const topScore = windows.length ? Math.max(...windows.map((w) => w.score)) : -1;
  const dayHours = hours.filter((x) => dayKey(x.at) === day);
  const from = toLocalMs(`${day}T00:00`), to = from + 24 * 3600e3;
  const dayExt = extremes.filter((e) => e.at >= from && e.at < to);
  const d = data.daily.date.indexOf(day);
  const moon = moonAt(from + 12 * 3600e3 - data.utcOffsetSeconds * 1000);
  const idx = dayHours.map((x) => x.i);
  const winds = idx.map((i) => data.hourly.windSpeed[i]).filter((x): x is number => x != null);
  const waves = idx.map((i) => data.hourly.waveHeight[i]).filter((x): x is number => x != null);
  const wx = weatherInfo(data.hourly.weatherCode[idx[Math.floor(idx.length / 2)]] ?? null);
  const inWindow = (at: number) => windows.some((w) => at >= w.start && at < w.end);

  if (!dayHours.length) return <div className="card muted p-5 text-center text-sm">{t('no_forecast_day')}</div>;

  return (
    <>
      <SectionTitle right={<SourceTag kind="calc" />}>{t('best_windows', { day: label })}</SectionTitle>
      {windows.length === 0 && (
        <div className="card p-5 text-sm">
          <p className="font-semibold">{t(isToday ? 'no_window_today' : 'no_window_day')}</p>
          <p className="muted mt-1">{t('no_window_hint')}</p>
        </div>
      )}
      {windows.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {windows.map((w) => <WindowCard key={w.start} w={w} primary={w.score === topScore} now={now} />)}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
      {/* Hourly outlook — time runs left to right in every language */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">{t('hour_by_hour')}</p>
          <SourceTag kind="calc" />
        </div>
        <div dir="ltr">
          <div className="mt-3 flex h-24 items-end gap-[3px]" role="img" aria-label={t('hours_aria')}>
            {dayHours.map((x) => {
              const past = x.at + 3600e3 <= now;
              return (
                <div key={x.i} className="flex h-full flex-1 flex-col justify-end" title={`${fmtTime(x.at)} · ${t(fishingLabel(x.score))} (${x.score})`}>
                  <div className={`w-full rounded-t-[3px] ${barColor(x.score)} ${past ? 'opacity-30' : ''} ${inWindow(x.at) ? 'ring-2 ring-buoy/70 ring-offset-1 ring-offset-white dark:ring-offset-[#0A2B40]' : ''}`}
                    style={{ height: `${Math.max(6, x.score)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
            {['00', '06', '12', '18', '24'].map((h) => <span key={h}>{h}</span>)}
          </div>
        </div>
      </section>

      {/* Tide for the day */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">{t('tide')}</p>
          <SourceTag kind="live" />
        </div>
        <div className="mt-2"><TideChart data={data} from={from} to={to} extremes={extremes} nowMs={now} height={130} /></div>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {dayExt.map((e) => (
            <li key={e.at} className="flex items-center gap-1.5 tabular-nums">
              {e.type === 'high' ? <ArrowUp size={14} className="text-lagoon" /> : <ArrowDown size={14} className="text-buoy" />}
              <span className="font-semibold">{fmtTime(e.at)}</span>
              <span className="muted text-xs">{t(e.type === 'high' ? 'high' : 'low')} {e.height.toFixed(2)} {t('unit_m')}</span>
            </li>
          ))}
        </ul>
      </section>
      </div>

      {/* Day facts */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Fact label={t('sun')} tag="live">
          <p className="flex items-center gap-1.5 text-sm"><Sunrise size={15} className="text-buoy" /> <b className="tabular-nums">{data.daily.sunrise[d]?.slice(11, 16) ?? '—'}</b></p>
          <p className="mt-1 flex items-center gap-1.5 text-sm"><Sunset size={15} className="text-lagoon" /> <b className="tabular-nums">{data.daily.sunset[d]?.slice(11, 16) ?? '—'}</b></p>
        </Fact>
        <Fact label={t('moon')} tag="calc">
          <div className="flex items-center gap-2.5">
            <MoonIcon fraction={moon.fraction} size={34} />
            <div><p className="text-sm font-semibold leading-tight">{t(moon.name)}</p><p className="muted text-xs">{t('lit', { v: Math.round(moon.illumination * 100) })}</p></div>
          </div>
        </Fact>
        <Fact label={t('wind')} tag="live">
          <p className="flex items-center gap-1.5 text-sm"><Wind size={15} className="text-lagoon" />
            <b className="tabular-nums">{winds.length ? `${Math.round(Math.min(...winds))}–${Math.round(Math.max(...winds))} ${t('unit_kn')}` : '—'}</b></p>
        </Fact>
        <Fact label={t('sea')} tag="live">
          <p className="flex items-center gap-1.5 text-sm"><Waves size={15} className="text-lagoon" /> <b className="tabular-nums">{waves.length ? t('up_to_m', { v: Math.max(...waves).toFixed(1) }) : '—'}</b></p>
          <p className="mt-1 flex items-center gap-1.5 text-sm"><WeatherIcon kind={wx?.kind} size={15} className="text-slate-500" /> {wx ? t(wx.key) : '—'}</p>
        </Fact>
      </section>
    </>
  );
}

function WindowCard({ w, primary, now }: { w: FishingWindow; primary: boolean; now: number }) {
  const { t, tm } = useT();
  const live = now >= w.start && now < w.end;
  return (
    <section className={`animate-rise rounded-3xl p-5 ${primary ? 'bg-abyss text-white shadow-lg' : 'card'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${primary ? 'text-white/60' : 'text-slate-500'}`}>
          {t(live ? 'happening_now' : primary ? 'best' : 'also_good')}
        </p>
        <span className={`font-display text-lg font-semibold ${primary ? 'text-shallows' : toneText[w.tone]}`}>{t(w.label)} · {w.score}</span>
      </div>
      <p dir="ltr" className="mt-1 text-start font-display text-[44px] font-semibold leading-none tabular-nums tracking-tight rtl:text-end">
        {fmtTime(w.start)}<span className={primary ? 'text-white/40' : 'text-slate-300'}>–</span>{fmtTime(w.end)}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {w.factors.map((f, n) => {
          const text = f.parts.length > 1 ? `${tm(f.parts[0])} (${tm(f.parts[1])})` : tm(f.parts[0]);
          return (
            <li key={n} className={`chip ${primary
              ? (f.effect === 'plus' ? 'bg-shallows/20 text-shallows' : f.effect === 'minus' ? 'bg-buoy/20 text-orange-200' : 'bg-white/10 text-white/80')
              : (f.effect === 'plus' ? 'bg-good/10 text-good' : f.effect === 'minus' ? 'bg-buoy/10 text-buoy' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300')}`}>
              {f.effect === 'plus' ? <Plus size={12} /> : f.effect === 'minus' ? <Minus size={12} /> : null}{text}
            </li>
          );
        })}
      </ul>
      {primary && <p className="mt-3 text-[11px] text-white/50">{t('window_note')}</p>}
    </section>
  );
}

function WeekView({ data, days, now, hours, extremes, onPick, today }: {
  data: Conditions; days: string[]; now: number; hours: FishingHour[]; extremes: TideExtreme[]; onPick: (d: string) => void; today: string;
}) {
  const { t, lang } = useT();
  return (
    <section className="card divide-y divide-slate-100 overflow-hidden dark:divide-white/10">
      {days.filter((d) => d >= today).map((d) => {
        const w = fishingWindows(data, hours, d, now, 1)[0];
        const from = toLocalMs(`${d}T00:00`);
        const moon = moonAt(from + 12 * 3600e3 - data.utcOffsetSeconds * 1000);
        const ext = extremes.filter((e) => dayKey(e.at) === d);
        const dh = hours.filter((x) => dayKey(x.at) === d);
        const winds = dh.map((x) => data.hourly.windSpeed[x.i]).filter((x): x is number => x != null);
        const best = dh.length ? Math.max(...dh.map((x) => x.score)) : null;
        return (
          <button key={d} onClick={() => onPick(d)} className="tap flex w-full items-center gap-3 px-4 py-3.5 text-start hover:bg-slate-50 dark:hover:bg-white/5">
            <div className="w-14 shrink-0 text-center">
              <p className="text-xs font-semibold uppercase text-slate-500">{d === today ? t('today') : dayName(lang, from)}</p>
              <p className="readout text-2xl">{new Date(from).getUTCDate()}</p>
            </div>
            <MoonIcon fraction={moon.fraction} size={26} />
            <div className="min-w-0 flex-1">
              {w ? (
                <p className="font-semibold tabular-nums"><bdi>{fmtTime(w.start)}–{fmtTime(w.end)}</bdi> <span className={`text-sm ${toneText[fishingTone(w.score)]}`}>{t(w.label)}</span></p>
              ) : <p className="muted text-sm">{best != null ? t('best_of_day', { label: t(fishingLabel(best)), score: best }) : t('no_data')}</p>}
              <p className="muted truncate text-xs tabular-nums">
                {ext.map((e) => `${t(e.type === 'high' ? 'h_short' : 'l_short')} ${fmtTime(e.at)}`).join(' · ')}
                {winds.length ? ` · ${t('wind_range', { v: `${Math.round(Math.min(...winds))}–${Math.round(Math.max(...winds))}` })}` : ''}
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-slate-400 rtl:rotate-180" />
          </button>
        );
      })}
    </section>
  );
}

function Fact({ label, tag, children }: { label: string; tag: 'live' | 'calc'; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between"><p className="eyebrow">{label}</p><SourceTag kind={tag} /></div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function HowWeEstimate() {
  const { t } = useT();
  return (
    <details className="card group p-4 text-sm">
      <summary className="flex min-h-[28px] cursor-pointer list-none items-center justify-between font-semibold">
        {t('how_title')} <ChevronRight size={16} className="text-slate-400 transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90" />
      </summary>
      <div className="muted mt-2 space-y-1.5 leading-relaxed">
        {(['how_1', 'how_2', 'how_3', 'how_4', 'how_5', 'how_6', 'how_7'] as const).map((k) => <p key={k}>{t(k)}</p>)}
      </div>
    </details>
  );
}
