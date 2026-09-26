import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BookOpen, ChevronDown, Compass, Fish, House, Map as MapIcon, RefreshCw, Route, Settings, ShipWheel } from 'lucide-react';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { spotName } from '@/lib/i18n/place';
import { fmtTime } from '@/lib/marine/time';
import { SpotSheet } from './SpotSheet';
import { CaptainSheet } from './CaptainSheet';

const TABS: { href: string; label: Key; Icon: typeof House }[] = [
  { href: '/', label: 'nav_home', Icon: House },
  { href: '/navigate', label: 'nav_navigate', Icon: Compass },
  { href: '/fishing', label: 'nav_fishing', Icon: Fish },
  { href: '/trips', label: 'nav_trips', Icon: Route },
  { href: '/learn', label: 'nav_learn', Icon: BookOpen },
];
const EXTRA: { href: string; label: Key; Icon: typeof House }[] = [
  { href: '/map', label: 'stations_link', Icon: MapIcon },
  { href: '/settings', label: 'nav_settings', Icon: Settings },
];

/** UAE flag, drawn so it needs no image or emoji support. */
export function UaeFlag({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 6" className={className} aria-hidden="true">
      <rect width="12" height="2" fill="#00732F" /><rect y="2" width="12" height="2" fill="#fff" /><rect y="4" width="12" height="2" fill="#000" />
      <rect width="3" height="6" fill="#FF0000" />
    </svg>
  );
}

function MadeIn() {
  const { t } = useT();
  return (
    <p className="flex items-center justify-center gap-2 py-6 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
      <UaeFlag className="h-3 w-6 rounded-[2px] shadow-sm ring-1 ring-black/10" /> {t('made_in')}
    </p>
  );
}

/** Content width: phone column → wider tablet column → full desktop canvas. */
export const WRAP = 'mx-auto w-full max-w-xl px-4 md:max-w-3xl md:px-6 lg:max-w-6xl lg:px-8';

interface Props {
  children: ReactNode;
  title?: string; // page title; omitted on Home (the spot is the title)
  status?: { refreshing: boolean; updatedAt?: string; utcOffsetSeconds?: number; onRefresh: () => void };
  showSpot?: boolean;
  hideCaptain?: boolean;
}

function Brand() {
  const { lang } = useT();
  return (
    <p className="font-display text-lg font-semibold leading-none tracking-tight text-lagoon dark:text-shallows">
      {lang === 'ar'
        ? <>بحرنا <span className="font-display text-sm font-medium opacity-70">Bahrna</span></>
        : <>Bahrna <span lang="ar" className="font-sans text-sm font-medium opacity-70">بحرنا</span></>}
    </p>
  );
}

export function AppShell({ children, title, status, showSpot = true, hideCaptain = false }: Props) {
  const { spot } = useSpot();
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const [spotOpen, setSpotOpen] = useState(false);
  const [captainOpen, setCaptainOpen] = useState(false);
  // "Updated" time shown in the spot's local time, like every other time in the app.
  const updated = status?.updatedAt
    ? fmtTime(new Date(status.updatedAt).getTime() + (status.utcOffsetSeconds ?? 0) * 1000)
    : null;
  const name = spotName(spot, lang);

  return (
    <div className="min-h-screen pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-10 lg:ps-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-slate-200/80 bg-white px-4 py-6 dark:border-white/10 dark:bg-[#06283D] lg:flex">
        <div className="px-2"><Brand /><p className="muted mt-1 text-xs">{t('tagline')}</p></div>
        <nav aria-label="Main" className="mt-8 flex-1">
          <ul className="space-y-1">
            {TABS.map(({ href, label, Icon }) => {
              const active = router.pathname === href;
              return (
                <li key={href}>
                  <Link href={href} aria-current={active ? 'page' : undefined}
                    className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${active ? 'bg-lagoon/10 text-lagoon dark:bg-shallows/15 dark:text-shallows' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`}>
                    <Icon size={19} strokeWidth={active ? 2.3 : 1.9} /> {t(label)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className="mt-6 space-y-1 border-t border-slate-100 pt-4 dark:border-white/10">
            {EXTRA.map(({ href, label, Icon }) => {
              const active = router.pathname === href;
              return (
                <li key={href}>
                  <Link href={href} aria-current={active ? 'page' : undefined}
                    className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${active ? 'bg-lagoon/10 text-lagoon dark:bg-shallows/15 dark:text-shallows' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`}>
                    <Icon size={19} /> {t(label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button onClick={() => setCaptainOpen(true)}
          className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-abyss text-sm font-semibold text-white dark:bg-white/10">
          <ShipWheel size={20} className="text-shallows" /> {t('captain')}
        </button>
      </aside>

      <header className="pt-safe sticky top-0 z-30 bg-salt/85 backdrop-blur-md dark:bg-[#041B2A]/85">
        <div className={`${WRAP} flex items-center justify-between gap-2 py-2.5`}>
          <div className="min-w-0">
            {title ? (
              <h1 className="font-display text-[26px] font-semibold leading-none tracking-tight md:text-3xl">{title}</h1>
            ) : (
              <div className="lg:hidden"><Brand /></div>
            )}
            {showSpot && (
              <button onClick={() => setSpotOpen(true)} className="tap mt-1 flex items-center gap-1 text-start" aria-label={t('change_location', { name })}>
                <span className={`${title ? 'text-sm font-medium' : 'font-display text-[28px] font-semibold leading-tight md:text-[34px]'} truncate`}>{name}</span>
                <ChevronDown size={title ? 15 : 20} className="shrink-0 text-lagoon" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {status && (
              <button onClick={status.onRefresh} aria-label={t('refresh')}
                className="tap flex h-10 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium tabular-nums text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">
                <RefreshCw size={14} className={status.refreshing ? 'animate-spin' : ''} />
                {updated ?? '--:--'}
              </button>
            )}
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label={t('switch_lang')} title={t('switch_lang')}
              className="tap grid h-10 min-w-10 place-items-center rounded-full bg-white px-2.5 text-sm font-bold text-lagoon shadow-sm dark:bg-white/10 dark:text-shallows">
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <Link href="/settings" aria-label={t('nav_settings')}
              className={`tap grid h-10 w-10 place-items-center rounded-full shadow-sm lg:hidden ${router.pathname === '/settings' ? 'bg-abyss text-white' : 'bg-white text-slate-600 dark:bg-white/10 dark:text-slate-200'}`}>
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </header>

      <main className={`${WRAP} pt-1`}>{children}<MadeIn /></main>

      {/* Floating Captain on phones and tablets (desktop has it in the sidebar) */}
      {!hideCaptain && <button onClick={() => setCaptainOpen(true)}
        className="tap fixed end-4 z-40 flex items-center gap-2 rounded-full bg-abyss py-3 pe-4 ps-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(6,40,61,.35)] ring-1 ring-white/10 md:end-6 lg:hidden"
        style={{ bottom: 'calc(76px + env(safe-area-inset-bottom) + 12px)' }}>
        <ShipWheel size={20} className="text-shallows" /> {t('captain')}
      </button>}

      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#06283D]/95 lg:hidden">
        <ul className="mx-auto grid max-w-xl grid-cols-5 md:max-w-3xl">
          {TABS.map(({ href, label, Icon }) => {
            const active = router.pathname === href;
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? 'page' : undefined}
                  className={`flex h-[64px] flex-col items-center justify-center gap-1 px-0.5 text-center text-[10.5px] font-semibold leading-tight md:text-xs ${active ? 'text-lagoon dark:text-shallows' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`grid h-7 w-11 place-items-center rounded-full transition-colors ${active ? 'bg-lagoon/12 dark:bg-shallows/15' : ''}`}>
                    <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
                  </span>
                  {t(label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SpotSheet open={spotOpen} onClose={() => setSpotOpen(false)} />
      <CaptainSheet open={captainOpen} onClose={() => setCaptainOpen(false)} />
    </div>
  );
}
