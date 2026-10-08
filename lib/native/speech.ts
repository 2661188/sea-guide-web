// Speech inside the Android app: the phone's own speech recogniser (Google speech
// services) and text-to-speech engine, through Capacitor plugins. The microphone is
// only open between pressing and releasing the button (or one short phrase after a tap).
import type { AiLang } from '@/lib/ai/speakable';
import { isIOSApp } from '@/lib/native/platform';

type Cb = { partial(t: string): void; final(t: string): void; error(code: string): void; end(): void };

async function sr() { return (await import('@capacitor-community/speech-recognition')).SpeechRecognition; }
async function tts() { return (await import('@capacitor-community/text-to-speech')).TextToSpeech; }

/** Maps the Android recogniser's messages to the same codes the web recogniser uses. */
export function mapSttError(msg: string): string {
  const m = (msg || '').toLowerCase();
  if (m.includes('permission')) return 'not-allowed';
  if (m.includes('network') || m.includes('server')) return 'network';
  if (m.includes('no match') || m.includes('no speech') || m.includes("didn't understand")) return 'no-speech';
  if (m.includes('not available')) return 'unsupported';
  if (m.includes('busy')) return 'busy';
  return 'stt-error';
}

/**
 * Listen once. `hold` = push-to-talk (listening ends when the button is released and
 * stop() is called); otherwise Android ends it at the end of the phrase.
 */
export function nativeListen(language: string, cb: Cb, hold: boolean) {
  if (isIOSApp()) return iosListen(language, cb, hold);
  let done = false;
  const finish = (text: string | null, err?: string) => {
    if (done) return;
    done = true;
    if (err) cb.error(err);
    else if (text) cb.final(text);
    cb.end();
  };
  let plugin: Awaited<ReturnType<typeof sr>> | null = null;
  (async () => {
    try {
      plugin = await sr();
      const { available } = await plugin.available();
      if (!available) { finish(null, 'unsupported'); return; }
      let perm = await plugin.checkPermissions();
      if (perm.speechRecognition !== 'granted') perm = await plugin.requestPermissions();
      if (perm.speechRecognition !== 'granted') { finish(null, 'not-allowed'); return; }
      if (done) return; // released before permission came back
      // partialResults:false: the call resolves with the result or rejects with the error.
      // (With partial results on, this plugin version never reports errors.)
      const res = await plugin.start({ language, maxResults: 3, partialResults: false, popup: false });
      const text = (res.matches ?? [])[0]?.trim() ?? '';
      if (text) cb.partial(text);
      finish(text || null, text ? undefined : 'no-speech');
    } catch (e) {
      finish(null, mapSttError(e instanceof Error ? e.message : String(e)));
    }
  })();
  // Safety net: never leave the microphone state "listening" for ever.
  setTimeout(() => { if (!done) { try { plugin?.stop(); } catch { /* ignore */ } } }, hold ? 60e3 : 12e3);
  return {
    // stop(): Android then delivers the final result (resolve above). The plugin's stop()
    // promise itself never settles, so it is not awaited.
    stop: () => { try { plugin?.stop(); } catch { /* ignore */ } },
    abort: () => { try { plugin?.stop(); } catch { /* ignore */ } finish(null); },
  };
}

let speakToken = 0;
let arLang: string | null = null;
async function arabicTag(): Promise<string> {
  if (arLang) return arLang;
  const t = await tts();
  for (const l of ['ar-AE', 'ar-SA', 'ar']) {
    try { if ((await t.isLanguageSupported({ lang: l })).supported) { arLang = l; return l; } } catch { /* next */ }
  }
  arLang = 'ar';
  return arLang;
}

export function nativeSpeak(text: string, lang: AiLang, cb: { start?(): void; end?(): void }) {
  const token = ++speakToken;
  let ended = false;
  const fin = () => { if (!ended && token === speakToken) { ended = true; cb.end?.(); } else ended = true; };
  (async () => {
    try {
      const t = await tts();
      const tag = lang === 'ar' ? await arabicTag() : 'en-GB';
      if (token !== speakToken) return;
      cb.start?.();
      await t.speak({ text, lang: tag, rate: lang === 'ar' ? 0.95 : 1.0, pitch: 1, volume: 1, queueStrategy: 0 });
    } catch { /* no voice for this language: the answer is still on screen */ }
    fin();
  })();
}

export function nativeStopSpeaking() {
  speakToken++;
  tts().then((t) => t.stop()).catch(() => { /* ignore */ });
}

/**
 * iPhone: Apple's recogniser does not end by itself at the end of a phrase, so we take
 * the running (partial) transcript and finish after a short silence (tap mode) or when
 * the button is released (push-to-talk).
 */
export function iosListen(language: string, cb: Cb, hold: boolean) {
  let done = false, text = '';
  let silence: ReturnType<typeof setTimeout> | null = null;
  let plugin: Awaited<ReturnType<typeof sr>> | null = null;
  let sub: { remove(): Promise<void> } | null = null;
  const cleanup = () => {
    if (silence) clearTimeout(silence);
    try { plugin?.stop(); } catch { /* ignore */ }
    sub?.remove().catch(() => { /* ignore */ });
  };
  const finish = (err?: string) => {
    if (done) return;
    done = true;
    cleanup();
    if (err) cb.error(err);
    else if (text) cb.final(text);
    else cb.error('no-speech');
    cb.end();
  };
  const armSilence = (ms: number) => {
    if (hold) return;
    if (silence) clearTimeout(silence);
    silence = setTimeout(() => finish(), ms);
  };
  (async () => {
    try {
      plugin = await sr();
      const { available } = await plugin.available();
      if (!available) { finish('unsupported'); return; }
      let perm = await plugin.checkPermissions();
      if (perm.speechRecognition !== 'granted') perm = await plugin.requestPermissions();
      if (perm.speechRecognition !== 'granted') { finish('not-allowed'); return; }
      if (done) return;
      sub = await plugin.addListener('partialResults', (d: { matches?: string[] }) => {
        const t = (d.matches ?? [])[0]?.trim() ?? '';
        if (!t || done) return;
        text = t;
        cb.partial(t);
        armSilence(1600);
      });
      await plugin.start({ language, maxResults: 3, partialResults: true, popup: false });
      armSilence(6000); // nothing said at all
    } catch (e) {
      finish(mapSttError(e instanceof Error ? e.message : String(e)));
    }
  })();
  setTimeout(() => finish(), hold ? 60e3 : 15e3);
  return {
    // Released: give the recogniser a moment to deliver the last words.
    stop: () => { setTimeout(() => finish(), 500); },
    abort: () => { text = ''; done = true; cleanup(); cb.end(); },
  };
}
