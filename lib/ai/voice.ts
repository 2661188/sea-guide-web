// Speech in and out. Uses the phone's own speech services through the browser:
//  - Speech to text: Web Speech API (on Android Chrome this is Google's recogniser;
//    it needs internet unless the phone has offline speech packs).
//  - Text to speech: speechSynthesis with an Arabic or English voice from the phone.
// The microphone is only on while the user holds (or taps) the button.
// In the Android app the WebView has neither, so the phone's native recogniser and
// text-to-speech engine are used through Capacitor plugins (see lib/native/speech.ts).
import type { AiLang } from './speakable';
import { isNative } from '@/lib/native/platform';
import { nativeListen, nativeSpeak, nativeStopSpeaking } from '@/lib/native/speech';

type Rec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
};

export function sttSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNative()) return true; // availability is checked when listening starts

  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}
export function ttsSupported(): boolean { return typeof window !== 'undefined' && (isNative() || 'speechSynthesis' in window); }

export const recLang = (l: AiLang) => (l === 'ar' ? 'ar-AE' : 'en-US');

export interface Listener { stop(): void; abort(): void }

/** Start listening. `hold` keeps listening until stop() (push-to-talk); otherwise it stops at the end of speech. */
export function listen(lang: AiLang, cb: { partial(t: string): void; final(t: string): void; error(code: string): void; end(): void }, hold: boolean): Listener | null {
  if (isNative()) return nativeListen(recLang(lang), cb, hold);
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const C = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!C) { cb.error('unsupported'); return null; }
  const r = new C();
  r.lang = recLang(lang);
  r.interimResults = true;
  r.continuous = hold;
  r.maxAlternatives = 3;
  let text = '', done = false, stopping = false;
  r.onresult = (e) => {
    let fin = '', inter = '';
    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) fin += res[0].transcript; else inter += res[0].transcript;
    }
    text = (fin + ' ' + inter).trim();
    cb.partial(text);
  };
  r.onerror = (e) => { if (e.error === 'aborted' || (e.error === 'no-speech' && stopping)) return; cb.error(e.error); };
  r.onend = () => { if (done) return; done = true; if (text) cb.final(text); cb.end(); };
  try { r.start(); } catch { cb.error('start'); return null; }
  return {
    stop: () => { stopping = true; try { r.stop(); } catch { /* already stopped */ } },
    abort: () => { done = true; try { r.abort(); } catch { /* ignore */ } cb.end(); },
  };
}

// ---------- speaking ----------
let voicesCache: SpeechSynthesisVoice[] = [];
function voices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try { window.speechSynthesis.onvoiceschanged = () => { voices(); }; } catch { /* ignore */ }
}

export function pickVoice(lang: AiLang): SpeechSynthesisVoice | null {
  const v = voices();
  const want = lang === 'ar' ? ['ar-AE', 'ar-SA', 'ar'] : ['en-GB', 'en-US', 'en'];
  for (const w of want) {
    const list = v.filter((x) => x.lang.replace('_', '-').toLowerCase().startsWith(w.toLowerCase()));
    const best = list.find((x) => /google|natural|neural|premium|enhanced/i.test(x.name)) ?? list[0];
    if (best) return best;
  }
  return null;
}
export const hasVoiceFor = (lang: AiLang) => !!pickVoice(lang);

export function speak(text: string, lang: AiLang, cb: { start?(): void; end?(): void } = {}) {
  if (!ttsSupported() || !text) { cb.end?.(); return; }
  if (isNative()) { nativeSpeak(text, lang, cb); return; }
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.lang = v?.lang ?? (lang === 'ar' ? 'ar-SA' : 'en-GB');
  u.rate = lang === 'ar' ? 0.95 : 1;
  u.pitch = 1;
  u.volume = 1;
  let ended = false;
  const fin = () => { if (!ended) { ended = true; cb.end?.(); } };
  u.onstart = () => cb.start?.();
  u.onend = fin;
  u.onerror = fin;
  s.speak(u);
  // Some Android builds never fire onend: time out based on length.
  setTimeout(() => { if (!s.speaking) fin(); }, Math.min(30000, 2500 + text.length * 90));
}

export function stopSpeaking() {
  if (isNative()) { nativeStopSpeaking(); return; }
  if (ttsSupported()) window.speechSynthesis.cancel();
}
