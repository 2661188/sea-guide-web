import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wind, Waves, Thermometer, Sunrise, Sunset, ArrowUp, ArrowDown, RefreshCw, MapPin, Fish, Anchor,
} from 'lucide-react';
import { fetchMarineData, MarineData } from '@/services/marineApi';
import {
  findExtremes, currentIndex, toLocalMs, nowLocalMs, fmtTime, fmtDay, dayKey, compass,
  seaState, fishingScore, scoreLabel, TideExtreme,
} from '@/services/tides';

interface Spot { name: string; ar: string; lat: number; lon: number }

const SPOTS: Record<string, Spot> = {
  dubai: { name: 'Dubai', ar: 'دبي', lat: 25.0867, lon: 55.1264 },
  abudhabi: { name: 'Abu Dhabi', ar: 'أبوظبي', lat: 24.4794, lon: 54.3673 },
  alrams: { name: 'Al Rams', ar: 'الرمس', lat: 25.8076, lon: 55.9463 },
  fujairah: { name: 'Fujairah', ar: 'الفجيرة', lat: 25.1167, lon: 56.3333 },
  khorfakkan: { name: 'Khor Fakkan', ar: 'خورفكان', lat: 25.3533, lon: 56.3267 },
};

const toneClasses: Record<string, string> = {
  good: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ok: 'bg-sky-50 text-sky-800 border-sky-200',
  caution: 'bg-amber-50 text-amber-800 border-amber-200',
  bad: 'bg-rose-50 text-rose-800 border-rose-200',
};

function TideChart({ data, idx, extremes }: { data: MarineData; idx: number; extremes: TideExtreme[] }) {
  const hours = 25;
  const start = Math.max(0, idx - 2);
  const pts = data.seaLevel.slice(start, start + hours).map((v) => v ?? 0);
  if (pts.length < 3) return null;
  const W = 340, H = 120, pad = 14;
  const min = Math.min(...pts) - 0.1, max = Math.max(...pts) + 0.1;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1)},${H} L${x(0)},${H} Z`;
  const startMs = toLocalMs(data.time[start]);
  const endMs = startMs + (pts.length - 1) * 3600e3;
  const xAt = (ms: number) => pad + ((ms - startMs) / (endMs - startMs)) * (W - pad * 2);
  const nowX = xAt(nowLocalMs());
  const visible = extremes.filter((e) => e.at >= startMs && e.at <= endMs);

  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Tide curve for the next 24 hours">
      <defs>
        <linearGradient id="tideFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#tideFill)" />
      <path d={line} fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinejoin="round" />
      {visible.map((e) => (
        <g key={e.at}>
          <circle cx={xAt(e.at)} cy={y(e.height)} r="3.5" fill={e.type === 'high' ? '#0369a1' : '#f59e0b'} />
          <text x={xAt(e.at)} y={e.type === 'high' ? y(e.height) - 7 : y(e.height) + 14}
            textAnchor="middle" fontSize="9.5" fill="#334155" fontWeight="600">{fmtTime(e.at)}</text>
        </g>
      ))}
      <line x1={nowX} x2={nowX} y1={4} y2={H} stroke="#0f172a" strokeDasharray="3 3" strokeWidth="1" />
      <text x={nowX} y={H + 13} textAnchor="middle" fontSize="10" fill="#0f172a" fontWeight="700">Now</text>
    </svg>
  );
}

export default function Home() {
  const [spotKey, setSpotKey] = useState('dubai');
  const [data, setData] = useState<MarineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<number | null>(null);
  const spot = SPOTS[spotKey];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMarineData(spot.lat, spot.lon));
      setUpdated(nowLocalMs());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load data');
    } finally {
      setLoading(false);
    }
  }, [spot.lat, spot.lon]);

  useEffect(() => { load(); }, [load]);

  const view = useMemo(() => {
    if (!data || !data.time?.length) return null;
    const idx = currentIndex(data.time);
    const now = nowLocalMs();
    const extremes = findExtremes(data.time, data.seaLevel);
    const upcoming = extremes.filter((e) => e.at > now);
    const nextHigh = upcoming.find((e) => e.type === 'high');
    const nextLow = upcoming.find((e) => e.type === 'low');
    const lvl = data.seaLevel[idx] ?? 0;
    const lvlNext = data.seaLevel[idx + 1] ?? lvl;
    const rate = lvlNext - lvl;
    const trend = Math.abs(rate) < 0.03 ? 'Slack' : rate > 0 ? 'Rising' : 'Falling';
    const wind = data.windSpeed[idx] ?? 0;
    const gust = data.windGusts[idx] ?? wind;
    const wave = data.waveHeight[idx] ?? 0;
    const sunEvents = [...data.sunrise, ...data.sunset].map(toLocalMs);
    const minsToSun = Math.min(...sunEvents.map((t) => Math.abs(t - now) / 60000));
    const score = fishingScore({ windKn: wind, waveM: wave, tideRateMPerHr: rate, minutesToSunEvent: minsToSun });
    const today = dayKey(now);
    const todayIdx = Math.max(0, data.sunrise.findIndex((s) => s.startsWith(today)));

    const byDay: { key: string; label: string; items: TideExtreme[] }[] = [];
    extremes.forEach((e) => {
      const k = dayKey(e.at);
      let g = byDay.find((d) => d.key === k);
      if (!g) { g = { key: k, label: fmtDay(e.at), items: [] }; byDay.push(g); }
      g.items.push(e);
    });

    return {
      idx, extremes, nextHigh, nextLow, lvl, trend, wind, gust, wave,
      windDir: compass(data.windDirection[idx] ?? 0),
      sst: data.seaTemp[idx],
      sea: seaState(wind, gust, wave),
      score,
      sunrise: data.sunrise[todayIdx]?.slice(11, 16),
      sunset: data.sunset[todayIdx]?.slice(11, 16),
      days: byDay.filter((d) => d.key >= today),
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10">
      <header className="sticky top-0 z-10 bg-gradient-to-b from-sky-900 to-sky-800 text-white pt-safe shadow-md">
        <div className="max-w-xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight leading-none">
                Baharna <span className="font-semibold text-sky-200 text-xl" lang="ar">بحرنا</span>
              </h1>
              <p className="text-sky-200 text-xs mt-1">Tides, sea &amp; fishing — UAE</p>
            </div>
            <button onClick={load} aria-label="Refresh"
              className="flex items-center gap-1 text-xs text-sky-100 bg-white/10 active:bg-white/20 rounded-full px-3 py-1.5">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {updated ? fmtTime(updated) : '--:--'}
            </button>
          </div>
          <div className="mt-3 -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
            {Object.entries(SPOTS).map(([k, s]) => (
              <button key={k} onClick={() => setSpotKey(k)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  k === spotKey ? 'bg-white text-sky-900' : 'bg-white/10 text-sky-50 active:bg-white/20'}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin size={15} /> {spot.name} <span lang="ar">· {spot.ar}</span>
        </div>

        {loading && !view && (
          <div className="py-24 text-center text-slate-500">
            <RefreshCw className="mx-auto animate-spin mb-3" /> Loading live sea data…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm">
            Couldn&apos;t load data: {error}
            <button onClick={load} className="block mt-2 font-semibold underline">Try again</button>
          </div>
        )}

        {view && (
          <>
            {/* Tide now */}
            <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Tide now</p>
                  <p className="text-3xl font-bold mt-1 flex items-center gap-2">
                    {view.trend === 'Rising' && <ArrowUp className="text-sky-600" />}
                    {view.trend === 'Falling' && <ArrowDown className="text-amber-500" />}
                    {view.trend}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">{view.lvl >= 0 ? '+' : ''}{view.lvl.toFixed(2)} m vs mean sea level</p>
                </div>
                <div className="text-right text-sm space-y-1.5">
                  {view.nextHigh && (
                    <div><span className="text-slate-500">Next high </span>
                      <span className="font-bold text-sky-700">{fmtTime(view.nextHigh.at)}</span></div>
                  )}
                  {view.nextLow && (
                    <div><span className="text-slate-500">Next low </span>
                      <span className="font-bold text-amber-600">{fmtTime(view.nextLow.at)}</span></div>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <TideChart data={data!} idx={view.idx} extremes={view.extremes} />
              </div>
            </section>

            {/* Sea state + fishing */}
            <section className="grid grid-cols-2 gap-3">
              <div className={`rounded-2xl border p-4 ${toneClasses[view.sea.tone]}`}>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-80">
                  <Anchor size={14} /> Boating
                </div>
                <p className="font-bold mt-2 leading-snug">{view.sea.label}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Fish size={14} /> Fishing
                </div>
                <p className="mt-1"><span className="text-3xl font-bold">{view.score}</span>
                  <span className="text-slate-400 text-sm">/100</span></p>
                <p className="text-sm font-semibold text-sky-700">{scoreLabel(view.score)}</p>
              </div>
            </section>

            {/* Conditions */}
            <section className="grid grid-cols-2 gap-3">
              <Stat icon={<Wind size={16} />} label="Wind" value={`${Math.round(view.wind)} kn ${view.windDir}`}
                sub={`Gusts ${Math.round(view.gust)} kn`} />
              <Stat icon={<Waves size={16} />} label="Waves" value={`${view.wave.toFixed(1)} m`} sub="Significant height" />
              <Stat icon={<Thermometer size={16} />} label="Sea temp"
                value={view.sst != null ? `${view.sst.toFixed(1)}°C` : '—'} sub="Surface" />
              <Stat icon={<Sunrise size={16} />} label="Sun" value={`${view.sunrise ?? '--'}`}
                sub={<span className="flex items-center gap-1"><Sunset size={13} /> {view.sunset ?? '--'}</span>} />
            </section>

            {/* 7-day tides */}
            <section className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
              <h2 className="px-4 pt-4 pb-2 font-bold">Tide times — 7 days</h2>
              <ul className="divide-y divide-slate-100">
                {view.days.map((d) => (
                  <li key={d.key} className="px-4 py-3 flex items-start gap-3">
                    <span className="w-24 shrink-0 text-sm font-semibold text-slate-600">{d.label}</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {d.items.map((e) => (
                        <span key={e.at} className="flex items-center gap-1 tabular-nums">
                          {e.type === 'high'
                            ? <ArrowUp size={13} className="text-sky-600" />
                            : <ArrowDown size={13} className="text-amber-500" />}
                          <span className="font-semibold">{fmtTime(e.at)}</span>
                          <span className="text-slate-400 text-xs">{e.height.toFixed(2)}m</span>
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <p className="text-xs text-slate-400 leading-relaxed px-1">
              Forecast data from Open-Meteo (model-based, not official tide tables). Times are UAE time.
              The fishing score is a rule of thumb, not a guarantee. Always check official marine
              forecasts (NCM) and follow UAE maritime and fishing regulations before going out.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon} {label}
      </div>
      <p className="text-xl font-bold mt-1.5">{value}</p>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}
