// The voice captain: listens (push-to-talk), understands, answers from app data,
// asks before changing anything, and speaks the answer. One shared instance so the
// Navigate button and the Ask Bahrna sheet show the same conversation.
import { useEffect, useState } from 'react';
import { load, save } from '@/lib/storage';
import { parse } from './intents';
import { answer, Reply, tripSummary } from './answer';
import { Action, executeAction } from './tools';
import { askModel, AiUnavailable, Msg } from './llm';
import { listen, Listener, speak, stopSpeaking, sttSupported } from './voice';
import type { AiLang } from './speakable';
import { getTracker, holdGps, releaseGps, startGps } from '@/lib/nav/tracker';

const NAV_INTENTS = new Set(['where', 'speed', 'course', 'distance', 'ttg', 'eta', 'gps', 'saveWaypoint', 'navigateTo', 'emergency', 'travelled']);
let gpsTimer: ReturnType<typeof setTimeout> | null = null;
/** Asked a navigation question on a screen where GPS is off: switch it on briefly (only if the user already allowed location). */
async function ensureGps() {
  if (getTracker().gps !== 'off' || !load<boolean>('gpsAsked', false)) return;
  holdGps('captain', true);
  startGps();
  for (let i = 0; i < 16 && !getTracker().pos; i++) await new Promise((r) => setTimeout(r, 250));
  if (gpsTimer) clearTimeout(gpsTimer);
  gpsTimer = setTimeout(() => { holdGps('captain', false); if (location.pathname !== '/navigate') releaseGps(); }, 120e3);
}

export type CaptainStatus = 'idle' | 'listening' | 'thinking' | 'speaking';
export interface AiSettings { lang: 'auto' | 'en' | 'ar'; voice: boolean }
export const DEFAULT_AI: AiSettings = { lang: 'auto', voice: true };

export interface CaptainState {
  status: CaptainStatus;
  heard: string; // what the recogniser heard (live while listening)
  reply: Reply | null;
  error: string | null; // i18n key
  pending: Reply['pending'] | null;
  listenLang: AiLang;
  at: number; // when the last reply arrived
}

let st: CaptainState = { status: 'idle', heard: '', reply: null, error: null, pending: null, listenLang: 'en', at: 0 };
const subs = new Set<(s: CaptainState) => void>();
let listener: Listener | null = null;
let history: Msg[] = [];
let lastSpoken: Reply | null = null;

function emit(p: Partial<CaptainState>) { st = { ...st, ...p }; subs.forEach((f) => f(st)); }

export const getAi = (): AiSettings => ({ ...DEFAULT_AI, ...load<Partial<AiSettings>>('ai', {}) });
export function setAi(p: Partial<AiSettings>) { save('ai', { ...getAi(), ...p }); subs.forEach((f) => f(st)); }

/** Language the recogniser listens for: the AI language setting, or the app language in Auto. */
export function defaultListenLang(): AiLang {
  const a = getAi().lang;
  if (a !== 'auto') return a;
  return load<string>('lang', 'en') === 'ar' ? 'ar' : 'en';
}
export function setListenLang(l: AiLang) { emit({ listenLang: l }); }

function say(r: Reply) {
  lastSpoken = r;
  emit({ reply: r, status: 'idle', at: Date.now(), error: null });
  if (!getAi().voice || !r.speech) return;
  speak(r.speech, r.lang, {
    start: () => emit({ status: 'speaking' }),
    end: () => { if (st.status === 'speaking') emit({ status: 'idle' }); },
  });
}

const L = (lang: AiLang, en: string, ar: string) => (lang === 'en' ? en : ar);
const simple = (lang: AiLang, en: string, ar: string, extra: Partial<Reply> = {}): Reply => ({ lang, text: L(lang, en, ar), speech: L(lang, en, ar), source: 'app', ...extra });

export async function ask(raw: string) {
  const text = raw.trim();
  if (!text) { emit({ status: 'idle' }); return; }
  stopSpeaking();
  emit({ status: 'thinking', heard: text, error: null });
  const p = parse(text, !!st.pending);
  const setting = getAi().lang;
  const lang: AiLang = setting === 'auto' ? p.lang : setting;
  p.lang = lang;

  try {
    if (p.intent === 'stop') { stopSpeaking(); emit({ status: 'idle' }); return; }
    if (p.intent === 'repeat') { if (lastSpoken) say(lastSpoken); else emit({ status: 'idle' }); return; }

    if ((p.intent === 'yes' || p.intent === 'no') && st.pending) {
      const pend = st.pending;
      emit({ pending: null });
      if (p.intent === 'no') { say(simple(lang, 'Cancelled.', 'تم الإلغاء.')); return; }
      if ('offer' in pend) { say(await tripSummary(pend.trip, lang, L(lang, 'Your trip', 'رحلتك'))); return; }
      await confirmAction(pend.action, lang);
      return;
    }
    if (p.intent === 'yes' || p.intent === 'no') { say(simple(lang, 'There is nothing to confirm.', 'ما في شي أأكده.')); return; }

    if (NAV_INTENTS.has(p.intent)) await ensureGps();
    let r = await answer(p);
    if (r.unknown) {
      try {
        const m = await askModel(history, text, lang);
        history = m.history;
        r = m.reply.text ? m.reply : r;
      } catch (e) {
        if (e instanceof AiUnavailable && e.code === 'offline') {
          r = simple(lang, 'AI is currently offline. Navigation and trip recording are still available.', 'المساعد الذكي غير متصل حالياً. الملاحة وتسجيل الرحلة شغالين.', { unknown: true, source: 'none' });
        }
        // not configured / error: keep the on-device "didn't catch that" reply.
      }
    }
    emit({ pending: r.pending ?? null });
    say(r);
  } catch {
    say(simple(lang, 'Something went wrong. Navigation is not affected.', 'صار خطأ. الملاحة ما تأثرت.'));
  }
}

/** Run a confirmed action (from a voice "yes" or the on-screen button). */
export async function confirmAction(action: Action, lang: AiLang = st.reply?.lang ?? 'en') {
  emit({ pending: null, status: 'thinking' });
  const res = await executeAction(action).catch(() => ({ ok: false } as { ok: boolean }));
  if (!res.ok) { say(simple(lang, "That didn't work. Please use the button on the screen.", 'ما زبطت. استخدم الزر على الشاشة.')); return; }
  switch (action.type) {
    case 'returnStart': say(simple(lang, 'Return to Start is on. Follow your recorded track back to your starting point.', 'العودة للبداية شغالة. اتبع مسارك المسجّل للعودة إلى نقطة الانطلاق.')); break;
    case 'navigateTo': say(simple(lang, `Navigating to ${action.target.name}.`, `التوجه إلى ${action.target.name}.`)); break;
    case 'saveWaypoint': say(simple(lang, `Saved “${action.name}”.`, `انحفظ «${action.name}».`)); break;
    case 'startTrip': say(simple(lang, 'Trip recording started.', 'بدأ تسجيل الرحلة.')); break;
    case 'endTrip': {
      const trip = 'trip' in res ? res.trip : null;
      const r = simple(lang, 'Trip complete and saved. Would you like a summary?', 'انتهت الرحلة وانحفظت. تبي ملخص؟');
      if (trip) { r.pending = { offer: 'summary', trip }; emit({ pending: r.pending }); }
      say(r);
      break;
    }
    case 'savePlan': say(simple(lang, 'Trip plan saved. You’ll find it in Trips.', 'انحفظت خطة الرحلة. بتلقاها في الرحلات.', { card: { type: 'link', href: '/trips', label: L(lang, 'Open Trips', 'افتح الرحلات') } })); break;
  }
}

export function cancelPending() {
  const lang = st.reply?.lang ?? 'en';
  emit({ pending: null });
  say(simple(lang, 'Cancelled.', 'تم الإلغاء.'));
}

export function startListening(hold: boolean) {
  stopSpeaking(); // barge-in: talking over Bahrna stops it
  listener?.abort();
  if (!sttSupported()) { emit({ status: 'idle', error: 'ai_no_stt' }); return; }
  const lang = st.listenLang;
  emit({ status: 'listening', heard: '', error: null });
  listener = listen(lang, {
    partial: (t) => emit({ heard: t }),
    final: (t) => { ask(t); },
    error: (code) => emit({ status: 'idle', error: code === 'not-allowed' || code === 'service-not-allowed' ? 'ai_mic_denied' : code === 'network' ? 'ai_stt_offline' : code === 'no-speech' ? 'ai_no_speech' : 'ai_stt_error' }),
    end: () => { listener = null; if (st.status === 'listening') emit({ status: 'idle' }); },
  }, hold);
}
export function stopListening() { listener?.stop(); }
export function stopAll() { listener?.abort(); stopSpeaking(); emit({ status: 'idle' }); }
export function repeatLast() { if (lastSpoken) say(lastSpoken); }

export function useCaptain(): CaptainState {
  const [s, setS] = useState(st);
  useEffect(() => {
    if (!st.at && !st.heard) emit({ listenLang: defaultListenLang() });
    subs.add(setS); setS(st);
    return () => { subs.delete(setS); };
  }, []);
  return s;
}
