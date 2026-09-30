// Safety Center: emergency numbers, your position for a rescue call, share location
// (only after you confirm), Emergency Mode, Return to Start, the pre-departure checklist
// and your own emergency contact. Bahrna never contacts anyone by itself.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BookOpen, ChevronRight, Copy, LifeBuoy, LocateFixed, Phone, Share2, Siren, Undo2, UserRound } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Checklist } from '@/components/Checklist';
import { SectionTitle } from '@/components/ui';
import { useT } from '@/lib/i18n/LangContext';
import { useSpot } from '@/lib/SpotContext';
import { fmtLat, fmtLon } from '@/lib/nav/geo';
import { getTracker, holdGps, releaseGps, setReturning, startGps, useTracker } from '@/lib/nav/tracker';
import { useNavSettings } from '@/lib/nav/settings';
import { load, save } from '@/lib/storage';

const ageText = (ms: number, lang: 'en' | 'ar') => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 90) return lang === 'ar' ? `قبل ${s} ث` : `${s} s ago`;
  const m = Math.round(s / 60);
  return lang === 'ar' ? `قبل ${m} د` : `${m} min ago`;
};

export default function Safety() {
  const { t, lang } = useT();
  const router = useRouter();
  const { region } = useSpot();
  const s = useTracker();
  const [nav] = useNavSettings();
  const [live, setLive] = useState(false);
  const [confirmShare, setConfirmShare] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, tick] = useState(0);

  // GPS runs only after the user taps "Show my position" (and stops when leaving the page,
  // unless a trip or another feature still needs it).
  useEffect(() => {
    const iv = setInterval(() => tick((n) => n + 1), 5000);
    return () => { clearInterval(iv); holdGps('safety', false); releaseGps(); };
  }, []);
  const locate = () => { save('gpsAsked', true); holdGps('safety', true); startGps(); setLive(true); };
  useEffect(() => { if (getTracker().gps !== 'off' && load<boolean>('gpsAsked', false)) setLive(true); }, []);

  const pos = s.pos;
  const age = s.lastFixAt ? Date.now() - s.lastFixAt : null;
  const stale = age != null && age > 60e3;
  const coords = pos ? `${fmtLat(pos.lat)} ${fmtLon(pos.lon)}` : '';
  const link = pos ? `https://maps.google.com/?q=${pos.lat.toFixed(5)},${pos.lon.toFixed(5)}` : '';

  const doShare = async () => {
    setConfirmShare(false);
    if (!pos) return;
    const text = t('share_text', { lat: fmtLat(pos.lat), lon: fmtLon(pos.lon) });
    try {
      if (navigator.share) await navigator.share({ title: t('app_name'), text, url: link });
      else { await navigator.clipboard.writeText(`${text} ${link}`); setMsg(t('em_copied')); }
    } catch { /* cancelled */ }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(`${coords}\n${pos!.lat.toFixed(5)}, ${pos!.lon.toFixed(5)}\n${link}`); setMsg(t('em_copied')); } catch { /* blocked */ } };
  const canReturn = !!s.trip && !!s.trip.start;

  return (
    <AppShell title={t('sf_title')} showSpot={false}>
      <div className="space-y-3 pb-20">
        <p className="muted text-sm leading-snug">{t('sf_intro')}</p>

        {/* Emergency numbers — tap to call from the phone */}
        <section className="card p-4">
          <p className="flex items-center gap-2 font-semibold"><Phone size={18} className="text-bad" /> {t('sf_numbers')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {region.emergency.map((e, k) => (
              <a key={e.number} href={`tel:${e.number}`} className={`tap flex h-16 flex-col items-center justify-center rounded-2xl font-bold ${k === 0 ? 'bg-bad text-white shadow-lg' : 'bg-bad/10 text-bad'}`}>
                <span className="text-2xl tabular-nums">{e.number}</span>
                <span className="text-xs font-semibold">{lang === 'ar' ? e.labelAr : e.label}</span>
              </a>
            ))}
          </div>
          <p className="muted mt-2 text-[11px] leading-snug">{t('sf_numbers_note')}</p>
        </section>

        {/* Emergency location */}
        <section className="rounded-3xl bg-slate-900 p-4 text-white shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">{t('em_coords')}</p>
          {pos ? (
            <>
              <p dir="ltr" className="mt-1 font-display text-[30px] font-bold leading-tight tabular-nums">{fmtLat(pos.lat)}</p>
              <p dir="ltr" className="font-display text-[30px] font-bold leading-tight tabular-nums">{fmtLon(pos.lon)}</p>
              <p dir="ltr" className="mt-1 text-xs tabular-nums text-white/70">{pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}</p>
              <p className="mt-1 text-xs text-white/70">{t('sf_accuracy', { m: Math.round(pos.acc) })}{age != null ? ` · ${ageText(age, lang)}` : ''}</p>
              {stale && <p className="mt-1 text-xs font-semibold text-amber-300">{t('sf_last_known')}</p>}
            </>
          ) : (
            <p className="mt-2 text-base font-semibold">{live ? t('em_no_fix') : t('sf_no_pos')}</p>
          )}
          {!live && (
            <button onClick={locate} className="tap mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-slate-900"><LocateFixed size={18} /> {t('sf_locate')}</button>
          )}
          {pos && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmShare(true)} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 font-semibold"><Share2 size={17} /> {t('em_share')}</button>
              <button onClick={copy} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 font-semibold"><Copy size={17} /> {t('em_copy')}</button>
            </div>
          )}
          {confirmShare && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-slate-900">
              <p className="text-sm font-semibold">{t('sf_share_q')}</p>
              <p className="mt-1 text-xs text-slate-600">{t('sf_share_t')}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={doShare} className="tap h-11 rounded-xl bg-bad font-bold text-white">{t('sf_share_yes')}</button>
                <button onClick={() => setConfirmShare(false)} className="tap h-11 rounded-xl bg-slate-100 font-semibold">{t('cancel')}</button>
              </div>
            </div>
          )}
          {msg && <p className="mt-2 text-xs font-semibold text-shallows">{msg}</p>}
          <p className="mt-3 text-[11px] leading-snug text-white/60">{t('sf_loc_note')}</p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => router.push('/navigate?sos=1')} className="tap flex h-16 items-center justify-center gap-2 rounded-2xl bg-bad text-base font-bold text-white shadow-lg"><Siren size={20} /> {t('sf_em_mode')}</button>
          <button onClick={() => { setReturning(true); router.push('/navigate'); }} disabled={!canReturn}
            className="tap flex h-16 items-center justify-center gap-2 rounded-2xl bg-abyss text-base font-bold text-white disabled:opacity-40"><Undo2 size={20} /> {t('return_start')}</button>
        </div>
        {!canReturn && <p className="muted -mt-1 text-[11px]">{t('sf_return_note')}</p>}

        {/* The user's own emergency contact (stays on the phone) */}
        <section className="card p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><UserRound size={18} className="text-lagoon dark:text-shallows" /> {t('sf_contact')}</p>
          {nav.emergencyPhone ? (
            <a href={`tel:${nav.emergencyPhone.replace(/\s/g, '')}`} className="tap mt-3 flex h-14 items-center justify-center gap-2 rounded-2xl bg-lagoon/10 font-bold text-lagoon dark:text-shallows">
              <Phone size={18} /> {nav.emergencyName || t('sf_contact')} · <span dir="ltr" className="tabular-nums">{nav.emergencyPhone}</span>
            </a>
          ) : (
            <Link href="/settings" className="tap mt-2 inline-flex items-center gap-1 font-semibold text-lagoon underline dark:text-shallows">{t('sf_contact_add')}</Link>
          )}
          <p className="muted mt-2 text-[11px]">{t('sf_contact_note')}</p>
        </section>

        {/* Pre-departure checklist (same list as on Trips) */}
        <div id="checklist" className="scroll-mt-20">
          <SectionTitle>{t('readiness')}</SectionTitle>
          <div className="mt-2"><Checklist /></div>
        </div>

        {/* Lessons */}
        <section className="card divide-y divide-slate-100 p-2 text-sm dark:divide-white/10">
          {(['mob', 'mayday', 'lifejacket'] as const).map((id) => (
            <Link key={id} href={`/learn?lesson=${id}`} className="tap flex items-center justify-between gap-2 px-2 py-3 font-semibold">
              <span className="flex items-center gap-2"><BookOpen size={16} className="text-lagoon dark:text-shallows" /> {t(`sf_l_${id}`)}</span>
              <ChevronRight size={16} className="muted rtl:rotate-180" />
            </Link>
          ))}
        </section>

        <p className="muted flex items-start gap-2 text-[11px] leading-snug"><LifeBuoy size={14} className="mt-0.5 shrink-0" /> {t('sf_disclaimer')}</p>
      </div>
    </AppShell>
  );
}
