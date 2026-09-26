import { useEffect, useState } from 'react';
import { Compass, Fish, ListChecks, Waves, Wind } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { load, save } from '@/lib/storage';

const SLIDES: { h?: Key; t: Key; icon: React.ReactNode }[] = [
  { t: 'ob1_t', icon: null },
  { h: 'ob2_h', t: 'ob2_t', icon: <span className="flex gap-3"><Wind size={34} /><Waves size={34} /></span> },
  { h: 'ob3_h', t: 'ob3_t', icon: <Fish size={44} /> },
  { h: 'ob4_h', t: 'ob4_t', icon: <Compass size={44} /> },
  { h: 'ob5_h', t: 'ob5_t', icon: <ListChecks size={44} /> },
];

/** Five short screens on first launch. Skippable; never shown again once finished. */
export function Onboarding() {
  const { t, lang, setLang } = useT();
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
  const [x0, setX0] = useState<number | null>(null);
  useEffect(() => { if (!load('onboarded', false)) setShow(true); }, []);
  if (!show) return null;
  const finish = () => { save('onboarded', true); setShow(false); };
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];
  const go = (d: number) => setI((n) => Math.max(0, Math.min(SLIDES.length - 1, n + d)));

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-gradient-to-b from-abyss via-[#07384F] to-[#0B5A5E] text-white"
      onPointerDown={(e) => setX0(e.clientX)}
      onPointerUp={(e) => { if (x0 != null && Math.abs(e.clientX - x0) > 50) go((e.clientX < x0 ? 1 : -1) * (lang === 'ar' ? -1 : 1)); setX0(null); }}>
      <div className="pt-safe flex items-center justify-between px-5 pt-4">
        <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="tap rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold">{lang === 'ar' ? 'English' : 'العربية'}</button>
        {!last && <button onClick={finish} className="tap px-2 py-2 text-sm font-semibold text-white/70">{t('ob_skip')}</button>}
      </div>

      <div key={i} className="animate-rise flex flex-1 flex-col items-center justify-center px-8 text-center">
        {i === 0 ? (
          <>
            <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
              <circle cx="60" cy="60" r="56" fill="rgba(255,255,255,.06)" stroke="rgba(127,212,208,.4)" strokeWidth="1.5" />
              <circle cx="82" cy="40" r="9" fill="#FF6B35" />
              <path d="M16 70c11 0 11-8 22-8s11 8 22 8 11-8 22-8 11 8 22 8" stroke="#7FD4D0" strokeWidth="6" fill="none" strokeLinecap="round">
                <animateTransform attributeName="transform" type="translate" values="0 0;-6 0;0 0" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M16 88c11 0 11-8 22-8s11 8 22 8 11-8 22-8 11 8 22 8" stroke="#E0F2FE" strokeWidth="6" fill="none" strokeLinecap="round">
                <animateTransform attributeName="transform" type="translate" values="0 0;6 0;0 0" dur="3s" repeatCount="indefinite" />
              </path>
            </svg>
            <h1 className="mt-6 font-display text-6xl font-bold tracking-tight">BAHRNA</h1>
            <p lang="ar" className="mt-1 text-4xl font-bold text-shallows">بحرنا</p>
            <p className="mt-5 text-lg text-white/85">{t(s.t)}</p>
          </>
        ) : (
          <>
            <span className="grid h-28 w-28 place-items-center rounded-[32px] bg-white/10 text-shallows ring-1 ring-white/20">{s.icon}</span>
            <h2 className="mt-8 font-display text-[40px] font-bold leading-[1.05]">{t(s.h!)}</h2>
            <p className="mt-4 max-w-xs text-base text-white/80">{t(s.t)}</p>
          </>
        )}
      </div>

      <div className="pb-safe px-6 pb-8">
        <div className="mb-6 flex justify-center gap-2">
          {SLIDES.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`${k + 1}`} className={`h-2 rounded-full transition-all ${k === i ? 'w-7 bg-shallows' : 'w-2 bg-white/30'}`} />)}
        </div>
        <button onClick={() => (last ? finish() : go(1))}
          className={`tap h-14 w-full rounded-2xl text-lg font-bold uppercase tracking-wide shadow-lg ${last ? 'bg-buoy text-white' : 'bg-white text-abyss'}`}>
          {last ? t('ob_start') : t('ob_next')}
        </button>
      </div>
    </div>
  );
}
