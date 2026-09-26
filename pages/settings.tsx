import { useEffect, useState } from 'react';
import { ExternalLink, Instagram, Monitor, Moon, Phone, Sun, Trash2 } from 'lucide-react';
import { AppShell, UaeFlag } from '@/components/AppShell';
import { ActivityIcon } from '@/components/ActivityIcon';
import { SectionTitle } from '@/components/ui';
import { useT } from '@/lib/i18n/LangContext';
import { LANGS } from '@/lib/i18n/strings';
import { useSpot } from '@/lib/SpotContext';
import { ACTIVITIES } from '@/lib/marine/activities';
import { EMIRATES, REGIONS, DEFAULT_REGION, findSpot } from '@/lib/regions';
import { spotName, contactLabel, forecastName } from '@/lib/i18n/place';
import { getTheme, setTheme, ThemePref } from '@/lib/theme';

const VERSION = '0.5';
const INSTAGRAM = 'rakoverlander';

interface SavedRow { id: string; bytes: number; at: string | null }

function readSaved(): SavedRow[] {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith('bahrna:cond:')).map((k) => {
      const raw = localStorage.getItem(k) ?? '';
      let at: string | null = null;
      try { at = JSON.parse(raw).fetchedAt ?? null; } catch { /* ignore */ }
      return { id: k.slice('bahrna:cond:'.length), bytes: raw.length * 2, at };
    });
  } catch { return []; }
}

export default function SettingsPage() {
  const { t, lang, setLang } = useT();
  const { spot, setSpotId, activity, setActivity, region } = useSpot();
  const [theme, setThemeState] = useState<ThemePref>('auto');
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => { setThemeState(getTheme()); setSaved(readSaved()); }, []);

  const chooseTheme = (p: ThemePref) => { setTheme(p); setThemeState(p); };
  const clearForecasts = () => {
    try { Object.keys(localStorage).filter((k) => k.startsWith('bahrna:cond:')).forEach((k) => localStorage.removeItem(k)); } catch { /* blocked */ }
    setSaved([]);
  };
  const resetAll = () => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
    try { Object.keys(localStorage).filter((k) => k.startsWith('bahrna:')).forEach((k) => localStorage.removeItem(k)); } catch { /* blocked */ }
    window.location.href = '/';
  };
  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const totalKb = Math.round(saved.reduce((s, r) => s + r.bytes, 0) / 1024);
  const coastGuard = region.emergency[0];
  const spots = REGIONS[DEFAULT_REGION].spots;

  return (
    <AppShell title={t('settings_title')} showSpot={false}>
      <div className="grid gap-3 pb-6 lg:grid-cols-2 lg:items-start lg:gap-4">
        <div className="space-y-3">
          {/* FOLLOW ME */}
          <SectionTitle>{t('follow_me')}</SectionTitle>
          <a href={`https://www.instagram.com/${INSTAGRAM}/`} target="_blank" rel="noreferrer"
            className="tap relative block overflow-hidden rounded-3xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] p-5 text-white shadow-lg">
            <svg viewBox="0 0 200 60" className="pointer-events-none absolute -bottom-2 end-0 w-2/3 opacity-20" aria-hidden="true">
              <path d="M0 40c20 0 20-10 40-10s20 10 40 10 20-10 40-10 20 10 40 10 20-10 40-10" stroke="#fff" strokeWidth="4" fill="none" />
              <path d="M0 55c20 0 20-10 40-10s20 10 40 10 20-10 40-10 20 10 40 10 20-10 40-10" stroke="#fff" strokeWidth="4" fill="none" />
            </svg>
            <span className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30"><Instagram size={28} /></span>
              <span className="min-w-0">
                <span className="block font-display text-[26px] font-semibold leading-none" dir="ltr">@{INSTAGRAM}</span>
                <span className="mt-1 block text-sm text-white/85">{t('follow_t')}</span>
              </span>
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#C13584]">
              {t('follow_btn')} <ExternalLink size={14} />
            </span>
          </a>

          {/* PREFERENCES */}
          <SectionTitle>{t('preferences')}</SectionTitle>
          <section className="card divide-y divide-slate-100 text-sm dark:divide-white/10">
            <Row label={t('language')}>
              <Segmented value={lang} onChange={(v) => setLang(v as 'en' | 'ar')} options={LANGS.map((l) => ({ id: l.id, label: l.label }))} />
            </Row>
            <Row label={t('theme')}>
              <Segmented value={theme} onChange={(v) => chooseTheme(v as ThemePref)} options={[
                { id: 'auto', label: t('theme_auto'), icon: <Monitor size={14} /> },
                { id: 'light', label: t('theme_light'), icon: <Sun size={14} /> },
                { id: 'dark', label: t('theme_dark'), icon: <Moon size={14} /> },
              ]} />
            </Row>
            <div className="px-4 py-3">
              <p className="font-medium">{t('default_activity')}</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {ACTIVITIES.map((a) => (
                  <button key={a} onClick={() => setActivity(a)} aria-pressed={a === activity}
                    className={`tap flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold leading-tight ${a === activity ? 'bg-abyss text-white dark:bg-shallows dark:text-abyss' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                    <ActivityIcon id={a} size={18} /> <span className="text-center">{t(`act_${a}`)}</span>
                  </button>
                ))}
              </div>
            </div>
            <Row label={t('default_spot')}>
              <select value={spot.id} onChange={(e) => setSpotId(e.target.value)} aria-label={t('default_spot')}
                className="h-9 max-w-[55%] rounded-lg border-0 bg-slate-100 px-2 text-sm font-semibold dark:bg-white/10">
                {Object.entries(EMIRATES).map(([em, name]) => (
                  <optgroup key={em} label={name[lang]}>
                    {spots.filter((s) => s.emirate === em).map((s) => <option key={s.id} value={s.id}>{spotName(s, lang)}</option>)}
                  </optgroup>
                ))}
              </select>
            </Row>
            <Row label={t('units')}><span className="muted text-end">{t('units_v')}</span></Row>
          </section>
        </div>

        <div className="space-y-3">
          {/* OFFLINE DATA */}
          <SectionTitle>{t('offline_data')}</SectionTitle>
          <section className="card p-4 text-sm">
            <p className="muted leading-snug">{t('offline_t')}</p>
            <div className="mt-3 flex gap-2">
              <span className="chip bg-lagoon/10 text-lagoon dark:text-shallows">{t('saved_spots', { n: saved.length })}</span>
              <span className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{t('storage_used', { kb: totalKb })}</span>
            </div>
            {saved.length ? (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
                {saved.map((r) => {
                  const f = findSpot(r.id);
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="font-medium">{f ? spotName(f.spot, lang) : r.id}</span>
                      <span className="muted text-xs tabular-nums">{fmt(r.at)} · {Math.max(1, Math.round(r.bytes / 1024))} KB</span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="muted mt-3 text-xs">{t('nothing_saved')}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={clearForecasts} disabled={!saved.length}
                className="tap inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 font-semibold text-lagoon disabled:opacity-40 dark:bg-white/10 dark:text-shallows">
                <Trash2 size={14} /> {t('clear_forecasts')}
              </button>
              <button onClick={resetAll}
                className={`tap inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-semibold ${confirmReset ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}>
                {confirmReset ? t('confirm_again') : t('clear_all')}
              </button>
            </div>
            <p className="muted mt-2 text-xs">{t('clear_all_t')}</p>
          </section>

          {/* ABOUT */}
          <SectionTitle>{t('about')}</SectionTitle>
          <section className="card space-y-2 p-4 text-sm leading-relaxed">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl font-semibold text-lagoon dark:text-shallows">Bahrna <span lang="ar" className="font-sans text-base">بحرنا</span></p>
              <span className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{t('version')} {VERSION}</span>
            </div>
            <p>{t('about_1')}</p>
            <p>{t('about_2')}</p>
            <p>{t('about_3')}</p>
            <p className="muted">{t('about_4')}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={region.officialForecast.url} target="_blank" rel="noreferrer" className="chip bg-lagoon/10 text-lagoon dark:text-shallows">{forecastName(region, lang)} <ExternalLink size={12} /></a>
              <a href={`tel:${coastGuard.number}`} className="chip bg-bad/10 text-bad"><Phone size={12} /> {contactLabel(coastGuard, lang)} {coastGuard.number}</a>
            </div>
            <p className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <UaeFlag className="h-3 w-6 rounded-[2px]" /> {t('made_in')}
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="font-medium">{label}</span>
      {children}
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; label: string; icon?: React.ReactNode }[] }) {
  return (
    <div role="radiogroup" className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/10">
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={`tap flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold ${value === o.id ? 'bg-white text-ink shadow-sm dark:bg-[#0A2B40] dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}
