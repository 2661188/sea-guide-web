import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BookOpen, ChevronDown, Fish, House, Map as MapIcon, RefreshCw, Route, ShipWheel, UserRound } from 'lucide-react';
import { useSpot } from '@/lib/SpotContext';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { spotName } from '@/lib/i18n/place';
import { fmtTime } from '@/lib/marine/time';
import { SpotSheet } from './SpotSheet';
import { CaptainSheet } from './CaptainSheet';

const TABS: { href: string; label: Key; Icon: typeof House }[] = [
  { href: '/', label: 'nav_home', Icon: House },
  { href: '/map', label: 'nav_map', Icon: MapIcon },
  { href: '/fishing', label: 'nav_fishing', Icon: Fish },
  { href: '/trips', label: 'nav_trips', Icon: Route },
  { href: '/learn', label: 'nav_learn', Icon: BookOpen },
];

interface Props {
  children: ReactNode;
  title?: string; // page title; omitted on Home (the spot is the title)
  status?: { refreshing: boolean; updatedAt?: string; utcOffsetSeconds?: number; onRefresh: () => void };
  showSpot?: boolean;
}

export function AppShell({ children, title, status, showSpot = true }: Props) {
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
    <div className="min-h-screen pb-[calc(76px+env(safe-area-inset-bottom))]">
      <header className="pt-safe sticky top-0 z-30 bg-salt/85 backdrop-blur-md dark:bg-[#041B2A]/85">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-2.5">
          <div className="min-w-0">
            {title ? (
              <h1 className="font-display text-[26px] font-semibold leading-none tracking-tight">{title}</h1>
            ) : (
              <p className="font-display text-lg font-semibold leading-none tracking-tight text-lagoon dark:text-shallows">
                {lang === 'ar'
                  ? <>بحرنا <span className="font-display text-sm font-medium opacity-70">Bahrna</span></>
                  : <>Bahrna <span lang="ar" className="font-sans text-sm font-medium opacity-70">بحرنا</span></>}
              </p>
            )}
            {showSpot && (
              <button onClick={() => setSpotOpen(true)} className="tap mt-1 flex items-center gap-1 text-start" aria-label={t('change_location', { name })}>
                <span className={`${title ? 'text-sm font-medium' : 'font-display text-[28px] font-semibold leading-tight'} truncate`}>{name}</span>
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
            <Link href="/profile" aria-label={t('profile_settings')}
              className={`tap grid h-10 w-10 place-items-center rounded-full shadow-sm ${router.pathname === '/profile' ? 'bg-abyss text-white' : 'bg-white text-slate-600 dark:bg-white/10 dark:text-slate-200'}`}>
              <UserRound size={18} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-1">{children}</main>

      <button onClick={() => setCaptainOpen(true)}
        className="tap fixed end-4 z-40 flex items-center gap-2 rounded-full bg-abyss py-3 pe-4 ps-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(6,40,61,.35)] ring-1 ring-white/10"
        style={{ bottom: 'calc(76px + env(safe-area-inset-bottom) + 12px)' }}>
        <ShipWheel size={20} className="text-shallows" /> {t('captain')}
      </button>

      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#06283D]/95">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map(({ href, label, Icon }) => {
            const active = router.pathname === href;
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? 'page' : undefined}
                  className={`flex h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? 'text-lagoon dark:text-shallows' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? 'bg-lagoon/12 dark:bg-shallows/15' : ''}`}>
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
