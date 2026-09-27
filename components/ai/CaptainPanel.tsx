import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardList, Copy, LifeBuoy, Loader2, Mic, Phone, RotateCcw, Send, Share2, Square, Volume2, WifiOff } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import { ask, cancelPending, confirmAction, getAi, repeatLast, setListenLang, startListening, stopAll, stopListening, useCaptain } from '@/lib/ai/captain';
import type { Card, Reply } from '@/lib/ai/answer';
import { sttSupported } from '@/lib/ai/voice';
import { activityName } from '@/lib/ai/planner';
import { fmtLat, fmtLon } from '@/lib/nav/geo';
import { fmtClock } from '@/lib/nav/eta';

function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => { const f = () => setOn(navigator.onLine); f(); window.addEventListener('online', f); window.addEventListener('offline', f); return () => { window.removeEventListener('online', f); window.removeEventListener('offline', f); }; }, []);
  return on;
}

/** Press-and-hold microphone. Tap (short press) also works: it listens until you stop talking. */
export function MicButton({ big = false, className = '' }: { big?: boolean; className?: string }) {
  const { t } = useT();
  const c = useCaptain();
  const downAt = useRef(0);
  const holding = useRef(false);
  const listening = c.status === 'listening';
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    if (listening) { stopListening(); return; }
    downAt.current = Date.now(); holding.current = true;
    startListening(true);
  };
  const onUp = () => {
    if (!holding.current) return;
    holding.current = false;
    // Short tap: keep listening until speech ends; long hold: release = done.
    if (Date.now() - downAt.current > 450) stopListening();
    else setTimeout(() => stopListening(), 6000);
  };
  const label = listening ? t('ai_listening') : c.status === 'thinking' ? t('ai_thinking') : c.status === 'speaking' ? t('ai_speaking') : big ? t('ai_hold') : t('ai_ask');
  return (
    <button data-chart-ui onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp} onContextMenu={(e) => e.preventDefault()}
      aria-label={t('ai_hold')} aria-pressed={listening}
      className={`tap select-none touch-none flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-white shadow-lg ${listening ? 'bg-bad ring-4 ring-bad/30' : 'bg-abyss dark:bg-[#0E3A55]'} ${big ? 'h-16 w-full rounded-2xl text-lg' : 'h-14 rounded-2xl px-4 text-sm'} ${className}`}>
      {listening ? <span className="relative grid place-items-center"><span className="absolute h-7 w-7 animate-ping rounded-full bg-white/40" /><Mic size={big ? 26 : 22} /></span>
        : c.status === 'thinking' ? <Loader2 size={big ? 24 : 20} className="animate-spin" />
        : c.status === 'speaking' ? <Volume2 size={big ? 24 : 20} />
        : <Mic size={big ? 26 : 22} />}
      <span>{label}</span>
    </button>
  );
}

function CardView(props: { card: Card; reply: Reply; pending: boolean }) {
  const { dir } = useT();
  // Cards follow the app language (the spoken reply may be in the other language).
  return <div dir={dir}><CardInner {...props} /></div>;
}

function CardInner({ card, reply, pending }: { card: Card; reply: Reply; pending: boolean }) {
  const { t, lang } = useT();
  const l = reply.lang;
  if (card.type === 'confirm') {
    return pending ? (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => confirmAction(card.action, l)} className="tap flex h-14 items-center justify-center gap-2 rounded-2xl bg-good text-lg font-bold text-white"><Check size={20} /> {card.yes}</button>
        <button onClick={cancelPending} className="tap h-14 rounded-2xl bg-slate-100 text-lg font-semibold dark:bg-white/10">{t('cancel')}</button>
      </div>
    ) : null;
  }
  if (card.type === 'plan') {
    const p = card.plan;
    const c = p.conditions;
    return (
      <div className="mt-3 rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
        <p className="eyebrow">{t('ai_plan')}</p>
        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div><dt className="muted text-xs">{t('ai_departure')}</dt><dd className="font-display text-xl font-semibold tabular-nums">{p.departure}</dd></div>
          <div><dt className="muted text-xs">{t('ai_activity')}</dt><dd className="font-semibold">{activityName(p.activity, lang)}</dd></div>
          <div><dt className="muted text-xs">{t('ai_duration')}</dt><dd className="font-semibold">{p.durationH} {t('unit_h')}</dd></div>
          <div><dt className="muted text-xs">{t('ai_date')}</dt><dd className="font-semibold tabular-nums">{p.date}</dd></div>
          <div className="col-span-2"><dt className="muted text-xs">{t('ai_conditions')}</dt>
            <dd className="font-semibold">{c && c.windMaxKn != null
              ? `${t('ai_wind_to', { v: Math.round(c.windMaxKn) })}${c.waveMaxM != null ? ` · ${t('ai_waves_to', { v: c.waveMaxM.toFixed(1) })}` : ''}${c.tide.length ? ` · ${c.tide.map((x) => `${x.type === 'high' ? t('high_tide') : t('low_tide')} ${fmtClock(x.at)}`).join(', ')}` : ''}`
              : t('ai_no_forecast')}</dd>
            {c && <dd className="muted text-[11px]">{t('ai_source', { s: c.source })}</dd>}</div>
          <div className="col-span-2"><dt className="muted text-xs">{t('ai_fuel')}</dt>
            <dd className="font-semibold">{p.fuelL != null ? t('ai_fuel_v', { l: Math.round(p.fuelL), c: Math.round(p.fuelCarryL!), d: p.distanceNm!.toFixed(1), to: p.destination!.name }) : p.fuelPerHourL ? t('ai_fuel_ph', { l: p.fuelPerHourL }) : t('ai_fuel_na')}</dd></div>
        </dl>
        <ul className="mt-2 space-y-1">{p.checklist.slice(0, 6).map((i) => <li key={i.id} className="flex gap-1.5"><Check size={15} className="mt-0.5 shrink-0 text-good" />{lang === 'ar' ? i.ar : i.en}</li>)}</ul>
        {pending && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => confirmAction({ type: 'savePlan', plan: p }, l)} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-good font-bold text-white"><Check size={18} /> {t('ai_create_trip')}</button>
            <button onClick={cancelPending} className="tap h-12 rounded-2xl bg-slate-100 font-semibold dark:bg-white/10">{t('cancel')}</button>
          </div>
        )}
      </div>
    );
  }
  if (card.type === 'emergency') {
    const pos = card.pos;
    const text = pos ? `${fmtLat(pos.lat)} ${fmtLon(pos.lon)}` : '';
    const link = pos ? `https://maps.google.com/?q=${pos.lat.toFixed(5)},${pos.lon.toFixed(5)}` : '';
    return (
      <div className="mt-3 space-y-2">
        {pos && <p dir="ltr" className="rounded-2xl bg-bad/10 p-3 text-center font-display text-2xl font-bold tabular-nums text-bad">{text}<span className="block text-xs font-semibold">±{card.accuracyM} m</span></p>}
        <div className="grid grid-cols-2 gap-2">
          <a href="tel:996" className="tap flex h-14 items-center justify-center gap-2 rounded-2xl bg-bad text-lg font-bold text-white"><Phone size={20} /> 996</a>
          <Link href="/navigate?sos=1" className="tap flex h-14 items-center justify-center gap-2 rounded-2xl bg-abyss text-sm font-bold text-white"><LifeBuoy size={18} /> {t('ai_open_sos')}</Link>
        </div>
        {pos && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigator.clipboard?.writeText(`${text}\n${link}`).catch(() => {})} className="tap flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10"><Copy size={15} /> {t('copy')}</button>
            <button onClick={() => { navigator.share?.({ title: 'Bahrna', text, url: link }).catch(() => {}); }} className="tap flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10"><Share2 size={15} /> {t('share')}</button>
          </div>
        )}
      </div>
    );
  }
  if (card.type === 'checklist') {
    return <ul className="mt-2 space-y-1 text-sm">{card.items.map((i, k) => <li key={k} className="flex gap-1.5"><ClipboardList size={15} className="mt-0.5 shrink-0 text-lagoon" />{lang === 'ar' ? i.ar : i.en}</li>)}</ul>;
  }
  if (card.type === 'link') return <Link href={card.href} className="tap mt-3 inline-flex h-11 items-center rounded-full bg-abyss px-4 text-sm font-semibold text-white">{card.label}</Link>;
  return null;
}

/** The conversation view: status, what Bahrna heard, the answer and any confirmation. */
export function CaptainPanel({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useT();
  const c = useCaptain();
  const online = useOnline();
  const [typed, setTyped] = useState('');
  const [stt, setStt] = useState(true);
  useEffect(() => setStt(sttSupported()), []);
  const r = c.reply;
  const hasPending = !!c.pending;

  return (
    <div className="space-y-3">
      {!online && <p className="flex items-start gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium leading-snug dark:bg-white/10"><WifiOff size={14} className="mt-0.5 shrink-0" />{t('ai_offline_note')}</p>}

      {(c.heard || c.status === 'listening') && (
        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
          <p className="eyebrow">{t('ai_you_said')}</p>
          <p className="mt-0.5 text-base font-medium" dir="auto">{c.heard ? `“${c.heard}”` : '…'}</p>
        </div>
      )}
      {c.error && <p className="rounded-xl bg-caution/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-200">{t(c.error as 'ai_no_stt')}</p>}
      {r && c.status !== 'listening' && (
        <div className="rounded-2xl bg-lagoon/5 p-3 ring-1 ring-lagoon/15 dark:bg-shallows/5" dir={r.lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Bahrna</p>
            <span className="flex gap-1">
              {c.status === 'speaking'
                ? <button onClick={stopAll} aria-label={t('ai_stop')} className="tap grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-white/10"><Square size={14} fill="currentColor" /></button>
                : <button onClick={repeatLast} aria-label={t('ai_repeat')} className="tap grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-white/10"><RotateCcw size={15} /></button>}
            </span>
          </div>
          <p className={`mt-1 font-semibold leading-snug ${compact ? 'text-lg' : 'text-xl'}`} dir="auto">{r.text}</p>
          {r.source === 'ai' && <p className="muted mt-1 text-[11px]">{t('ai_by_model')}</p>}
          {r.card && <CardView card={r.card} reply={r} pending={hasPending} />}
        </div>
      )}

      {!compact && (
        <>
          <div className="flex items-center gap-2">
            <MicButton big className="flex-1" />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="muted">{t('ai_listen_in')}</span>
            <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/10">
              {(['en', 'ar'] as const).map((l) => (
                <button key={l} onClick={() => setListenLang(l)} aria-pressed={c.listenLang === l}
                  className={`tap h-8 rounded-full px-3 font-semibold ${c.listenLang === l ? 'bg-white shadow-sm dark:bg-[#0A2B40]' : ''}`}>{l === 'en' ? 'English' : 'العربية'}</button>
              ))}
            </div>
          </div>
          {!stt && <p className="muted text-xs">{t('ai_no_stt')}</p>}
          <form onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { ask(typed); setTyped(''); } }} className="flex gap-2">
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('ai_type')} dir="auto" aria-label={t('ai_type')}
              className="h-12 min-w-0 flex-1 rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
            <button type="submit" aria-label={t('ai_send')} className="tap grid h-12 w-12 place-items-center rounded-xl bg-abyss text-white"><Send size={18} className="rtl:-scale-x-100" /></button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {(lang === 'ar'
              ? ['كم باقي على البداية؟', 'شلون البحر؟', 'متى أفضل وقت للصيد؟', 'احفظ هالمكان كموقع صيد', 'خطط لي رحلة صيد باجر الصبح', 'شو أحتاج آخذ معاي؟']
              : ['How far to the start?', 'How’s the sea?', 'Best fishing time?', 'Save this as a fishing spot', 'Plan a fishing trip tomorrow morning', 'What should I take?']
            ).map((q) => <button key={q} onClick={() => ask(q)} className="tap rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold dark:bg-white/10" dir="auto">{q}</button>)}
          </div>
          <p className="muted text-[11px] leading-snug">{t('ai_privacy')}{getAi().voice ? '' : ` ${t('ai_voice_off')}`}</p>
        </>
      )}
    </div>
  );
}
