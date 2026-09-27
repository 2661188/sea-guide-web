// Turns an understood request into a short spoken + written reply, using only
// values from the app's tools. Replies are deliberately brief for a noisy boat.
import type { Parsed } from './intents';
import type { AiLang } from './speakable';
import { sayBearing, sayClock, sayCoord, sayCount, sayDist, sayDuration, sayNum, saySpeed, showBearing, showDist, showDuration } from './speakable';
import type { EtaResult } from '@/lib/nav/eta';
import { fmtClock } from '@/lib/nav/eta';
import { fmtLat, fmtLon } from '@/lib/nav/geo';
import type { Trip, TripPlan, WpKind } from '@/lib/nav/db';
import {
  Action, createTripPlan, findWaypoint, getBoatProfile, getCurrentMarineConditions, getFishingConditions, getNavigation,
  getTripHistory, toPoint, waypointsDuring,
} from './tools';
import { buildChecklist, activityName } from './planner';

export type Card =
  | { type: 'confirm'; action: Action; title: string; yes: string }
  | { type: 'plan'; plan: TripPlan }
  | { type: 'emergency'; pos: { lat: number; lon: number } | null; accuracyM: number | null }
  | { type: 'checklist'; items: { en: string; ar: string }[] }
  | { type: 'link'; href: string; label: string };

export interface Reply {
  lang: AiLang;
  text: string; // shown
  speech: string; // spoken
  card?: Card;
  pending?: { action: Action } | { offer: 'summary'; trip: Trip };
  source: 'app' | 'ai' | 'none';
  unknown?: boolean;
}

const L = (lang: AiLang, en: string, ar: string) => (lang === 'en' ? en : ar);
/** Keep coordinates left-to-right inside Arabic text. */
const ltr = (s: string) => `\u2066${s}\u2069`;
const reply = (lang: AiLang, text: string, speech = text, extra: Partial<Reply> = {}): Reply => ({ lang, text, speech, source: 'app', ...extra });
const both = (lang: AiLang, en: [string, string], ar: [string, string], extra: Partial<Reply> = {}) =>
  lang === 'en' ? reply(lang, en[0], en[1], extra) : reply(lang, ar[0], ar[1], extra);

const KIND_NAME: Record<string, { en: string; ar: string }> = {
  fish: { en: 'Fishing Spot', ar: 'موقع صيد' }, anchor: { en: 'Anchorage', ar: 'مرسى' }, fuel: { en: 'Fuel', ar: 'وقود' },
  home: { en: 'Home', ar: 'البيت' }, dive: { en: 'Dive Site', ar: 'موقع غوص' }, marina: { en: 'Marina', ar: 'مارينا' },
  ramp: { en: 'Ramp', ar: 'منزلق' }, hazard: { en: 'Hazard', ar: 'خطر' }, mark: { en: 'Waypoint', ar: 'نقطة' },
};

/** Why there is no time estimate, in words. */
function etaReason(e: EtaResult, lang: AiLang): string {
  switch (e.status) {
    case 'stationary': return L(lang, "ETA unavailable while you're stationary.", 'وقت الوصول غير متاح وأنت واقف.');
    case 'notclosing': return L(lang, "You're not heading towards it right now, so there's no ETA.", 'أنت مب متجه له الحين، فما في وقت وصول.');
    case 'lost': return L(lang, 'GPS signal is lost, so there is no reliable ETA.', 'إشارة الـ GPS مقطوعة، فما أقدر أحسب وقت الوصول.');
    case 'nofix': return L(lang, 'No GPS position yet.', 'ما في موقع GPS لين الحين.');
    case 'arrived': return L(lang, "You're there.", 'وصلت.');
    case 'toolong': return L(lang, 'At this speed it would take more than two days.', 'على هالسرعة بتاخذ أكثر من يومين.');
    default: return '';
  }
}

function noFix(lang: AiLang, gps: string, age: number | null): Reply {
  if (gps === 'lost') return both(lang,
    [`GPS signal lost. Last position ${age ?? '?'} s ago.`, `GPS signal lost. The last position is ${age ?? 'some'} seconds old.`],
    [`انقطعت إشارة الـ GPS. آخر موقع قبل ${age ?? '?'} ثانية.`, `انقطعت إشارة الـ GPS. آخر موقع قبل ${age != null ? sayNum(age, 'ar', 0) : 'فترة'} ثانية.`]);
  if (gps === 'off' || gps === 'denied') return both(lang,
    ['Location is off. Open Navigate and allow location.', 'Location is off. Open Navigate and allow location.'],
    ['الموقع مقفل. افتح صفحة الملاحة وفعّل الموقع.', 'الموقع مقفل. افتح صفحة الملاحة وفعّل الموقع.']);
  return both(lang, ['Searching for GPS…', 'Still searching for a GPS position.'], ['جارٍ البحث عن GPS…', 'لين الحين أدور على موقع GPS.']);
}

/** Resolve the point a distance/ETA question is about. */
async function resolveTarget(p: Parsed): Promise<{ label: [string, string]; point: { lat: number; lon: number } | null; toStart?: boolean; wpId?: string } | null> {
  const n = getNavigation();
  const t = p.target;
  if (!t || t.kind === 'active') {
    if (n.returning || (!n.guide && n.trip?.start)) return { label: ['your starting point', 'نقطة البداية'], point: n.trip?.start ?? null, toStart: true };
    if (n.guide) return { label: [n.guide.target || n.guide.name, n.guide.target || n.guide.name], point: null };
    return null;
  }
  if (t.kind === 'start') return { label: ['your starting point', 'نقطة البداية'], point: n.trip?.start ?? null, toStart: true };
  if (t.kind === 'home') {
    const h = await findWaypoint({ kind: 'home' });
    if (h) return { label: [h.name || 'Home', h.name || 'البيت'], point: h, wpId: h.id };
    return { label: ['your starting point', 'نقطة البداية'], point: n.trip?.start ?? null, toStart: true };
  }
  const w = t.kind === 'wpKind' ? await findWaypoint({ kind: t.wpKind }) : await findWaypoint({ name: t.name });
  if (w) return { label: [w.name, w.name], point: w, wpId: w.id };
  const k = t.kind === 'wpKind' ? KIND_NAME[t.wpKind] : { en: t.name, ar: t.name };
  return { label: [k?.en ?? 'that place', k?.ar ?? 'هالمكان'], point: null };
}

export async function answer(p: Parsed): Promise<Reply> {
  const lang = p.lang;
  const n = getNavigation();

  switch (p.intent) {
    case 'emergency': {
      const pos = n.pos;
      const coords = pos ? ltr(`${fmtLat(pos.lat)} ${fmtLon(pos.lon)}`) : '';
      return both(lang,
        [pos ? `Emergency help. Your position: ${coords} (±${n.accuracyM} m). Open Emergency Mode to share it and call the Coast Guard (996).` : 'Emergency help. No GPS position yet. Call the Coast Guard (996) and describe where you are.',
          pos ? `I can help with the next steps. Your GPS position is available. Open Emergency Mode to share your location and call the Coast Guard on 9 9 6.` : `I don't have a GPS position yet. Call the Coast Guard on 9 9 6 now and describe where you are.`],
        [pos ? `مساعدة طارئة. موقعك: ${coords} (${ltr(`±${n.accuracyM}`)} م). افتح وضع الطوارئ عشان ترسل موقعك وتتصل بخفر السواحل 996.` : 'مساعدة طارئة. ما في موقع GPS لين الحين. اتصل بخفر السواحل 996 ووصف مكانك.',
          pos ? 'أقدر أساعدك بالخطوات الجاية. موقعك متوفر. افتح وضع الطوارئ عشان ترسل موقعك وتتصل بخفر السواحل تسعة تسعة ستة.' : 'ما عندي موقع GPS لين الحين. اتصل بخفر السواحل تسعة تسعة ستة الحين ووصف مكانك.'],
        { card: { type: 'emergency', pos, accuracyM: n.accuracyM } });
    }

    case 'where': {
      if (!n.pos || !n.hasFix) return noFix(lang, n.gps, n.lastFixAgeS);
      const { lat, lon } = n.pos;
      return both(lang,
        [`${fmtLat(lat)}  ${fmtLon(lon)} · ±${n.accuracyM} m`, `You're at ${sayCoord(lat, lon, 'en')}. Accuracy plus or minus ${n.accuracyM} metres.`],
        [`${ltr(`${fmtLat(lat)}  ${fmtLon(lon)}`)} · ${ltr(`±${n.accuracyM}`)} م`, `موقعك ${sayCoord(lat, lon, 'ar')}. الدقة تقريباً ${sayNum(n.accuracyM ?? 0, 'ar', 0)} متر.`]);
    }

    case 'speed': {
      if (!n.hasFix) return noFix(lang, n.gps, n.lastFixAgeS);
      const v = n.speedKn ?? 0;
      if (!n.moving) return both(lang, [`${v.toFixed(1)} kn — you're not moving.`, "You're stationary."], [`${v.toFixed(1)} عقدة — القارب واقف.`, 'القارب واقف الحين.']);
      return both(lang, [`${v.toFixed(1)} kn`, `${saySpeed(v, 'en')}.`], [`${v.toFixed(1)} عقدة`, `سرعتك ${saySpeed(v, 'ar')}.`]);
    }

    case 'course': {
      if (!n.hasFix) return noFix(lang, n.gps, n.lastFixAgeS);
      if (n.cogDeg == null) return both(lang, ['No course while stationary.', "You're not moving, so there's no GPS course."], ['ما في اتجاه والقارب واقف.', 'القارب واقف، فما في اتجاه من الـ GPS.']);
      return both(lang, [`Course over ground ${showBearing(n.cogDeg)} (GPS)`, `Your course over ground is ${sayBearing(n.cogDeg, 'en')}.`],
        [`الاتجاه ${showBearing(n.cogDeg)} (GPS)`, `اتجاهك ${sayBearing(n.cogDeg, 'ar')}.`]);
    }

    case 'distance': case 'ttg': case 'eta': {
      if (!n.pos) return noFix(lang, n.gps, n.lastFixAgeS);
      const tg = await resolveTarget(p);
      if (!tg) return both(lang, ['No destination set.', "There's no destination or trip start yet. Start a trip or pick a waypoint."], ['ما في وجهة.', 'ما في وجهة ولا نقطة بداية. ابدأ رحلة أو اختار نقطة.']);
      let dist: number, brg: number, eta: EtaResult;
      if (tg.toStart) {
        if (!n.toStart) return both(lang, ['Start point not saved yet.', "Your start point isn't saved yet. It's recorded once GPS is accurate."], ['نقطة البداية مب محفوظة.', 'نقطة البداية لين الحين مب محفوظة. تنحفظ لما تكون دقة الـ GPS زينة.']);
        dist = n.toStart.alongNm; brg = n.toStart.bearing; eta = n.toStart.eta;
      } else if (tg.point) {
        const r = toPoint(tg.point)!; dist = r.distNm; brg = r.bearing; eta = r.eta;
      } else if (n.guide && !p.target) {
        dist = n.guide.dtwNm; brg = n.guide.bearing; eta = n.guide.eta;
      } else {
        return both(lang, [`No saved ${tg.label[0]} found.`, `I can't find a saved ${tg.label[0]}.`], [`ما لقيت ${tg.label[1]} محفوظ.`, `ما لقيت ${tg.label[1]} محفوظ.`]);
      }
      const nm = L(lang, tg.label[0], tg.label[1]);
      const along = tg.toStart ? L(lang, ' along your track', ' على مسارك') : '';
      if (n.gps === 'lost') {
        return both(lang, [`${showDist(dist)} to ${nm} (from last GPS position). ${etaReason(eta, 'en')}`, `From your last known position, ${nm} is ${sayDist(dist, 'en')} away. ${etaReason(eta, 'en')}`],
          [`${showDist(dist)} إلى ${nm} (من آخر موقع). ${etaReason(eta, 'ar')}`, `من آخر موقع معروف، باقي ${sayDist(dist, 'ar')} على ${nm}. ${etaReason(eta, 'ar')}`]);
      }
      const ok = eta.status === 'ok';
      if (p.intent === 'eta' && ok) {
        return both(lang, [`ETA ${fmtClock(eta.etaMs)} · ${showDuration(eta.hours!)} · ${showDist(dist)}`, `You'll reach ${nm} at about ${sayClock(eta.etaMs!, 'en')}, in ${sayDuration(eta.hours!, 'en')}.`],
          [`الوصول ${fmtClock(eta.etaMs)} · ${showDuration(eta.hours!)} · ${showDist(dist)}`, `بتوصل ${nm} تقريباً الساعة ${sayClock(eta.etaMs!, 'ar')}، يعني بعد ${sayDuration(eta.hours!, 'ar')}.`]);
      }
      const tail = ok
        ? [` At your current speed, about ${sayDuration(eta.hours!, 'en')} to go.`, ` على سرعتك الحالية، تحتاج تقريباً ${sayDuration(eta.hours!, 'ar')}.`]
        : [` ${etaReason(eta, 'en')}`, ` ${etaReason(eta, 'ar')}`];
      return both(lang,
        [`${showDist(dist)} to ${nm}${along} · ${showBearing(brg)}${ok ? ` · ${showDuration(eta.hours!)} · ETA ${fmtClock(eta.etaMs)}` : ''}${ok ? '' : `. ${etaReason(eta, 'en')}`}`,
          `You're ${sayDist(dist, 'en')} from ${nm}${along}.${tail[0]}`],
        [`${showDist(dist)} إلى ${nm}${along} · ${showBearing(brg)}${ok ? ` · ${showDuration(eta.hours!)} · الوصول ${fmtClock(eta.etaMs)}` : ''}${ok ? '' : `. ${etaReason(eta, 'ar')}`}`,
          `باقي تقريباً ${sayDist(dist, 'ar')} على ${nm}${along}.${tail[1]}`]);
    }

    case 'travelled': {
      if (!n.trip) return both(lang, ['No trip is recording.', "You're not recording a trip right now."], ['ما في رحلة قيد التسجيل.', 'ما في رحلة تتسجل الحين.']);
      const mins = (Date.now() - n.trip.startedAt) / 3600e3;
      return both(lang, [`${showDist(n.trip.distanceNm)} in ${showDuration(mins)}`, `You've travelled ${sayDist(n.trip.distanceNm, 'en')} in ${sayDuration(mins, 'en')}.`],
        [`${showDist(n.trip.distanceNm)} خلال ${showDuration(mins)}`, `قطعت ${sayDist(n.trip.distanceNm, 'ar')} خلال ${sayDuration(mins, 'ar')}.`]);
    }

    case 'gps': {
      if (!n.pos || n.gps === 'lost' || n.gps === 'off' || n.gps === 'searching') return noFix(lang, n.gps, n.lastFixAgeS);
      const good = n.gps === 'ok';
      return both(lang, [`${good ? 'GPS active' : 'GPS accuracy low'} · ±${n.accuracyM} m`, `${good ? 'GPS is active' : 'GPS accuracy is low'}, plus or minus ${n.accuracyM} metres.`],
        [`${good ? 'GPS شغال' : 'دقة GPS منخفضة'} · ±${n.accuracyM} م`, `${good ? 'الـ GPS شغال' : 'دقة الـ GPS منخفضة'}، تقريباً ${sayNum(n.accuracyM ?? 0, 'ar', 0)} متر.`]);
    }

    case 'returnStart': {
      if (!n.trip) return both(lang, ['No trip is recording, so there is no start point.', "There's no active trip, so I don't have a starting point. Start a trip first."], ['ما في رحلة، فما في نقطة بداية.', 'ما في رحلة شغالة، فما عندي نقطة بداية. ابدأ رحلة أول.']);
      if (!n.toStart) return both(lang, ['Start point not saved yet.', "Your start point isn't saved yet."], ['نقطة البداية مب محفوظة.', 'نقطة البداية لين الحين مب محفوظة.']);
      if (n.returning) return both(lang, [`Already returning · ${showDist(n.toStart.alongNm)}`, `Return to Start is already on. ${sayDist(n.toStart.alongNm, 'en')} to go.`], [`العودة شغالة · ${showDist(n.toStart.alongNm)}`, `العودة للبداية شغالة. باقي ${sayDist(n.toStart.alongNm, 'ar')}.`]);
      const d = n.toStart.alongNm;
      return both(lang,
        [`Your starting point is ${showDist(d)} away. Start Return to Start?`, `Your starting point is ${sayDist(d, 'en')} away. Would you like me to start Return to Start?`],
        [`نقطة البداية على بعد ${showDist(d)}. تبي أشغل العودة للبداية؟`, `نقطة البداية على بعد ${sayDist(d, 'ar')}. تبيني أشغل العودة للبداية؟`],
        { card: { type: 'confirm', action: { type: 'returnStart' }, title: L(lang, 'Return to Start', 'العودة للبداية'), yes: L(lang, 'Start', 'ابدأ') }, pending: { action: { type: 'returnStart' } } });
    }

    case 'navigateTo': {
      const tg = await resolveTarget(p);
      if (!tg?.point) return both(lang, ["I couldn't find that waypoint.", "I couldn't find that waypoint. Say its name, or pick it on the chart."], ['ما لقيت هالنقطة.', 'ما لقيت هالنقطة. قول اسمها أو اختارها من الخريطة.']);
      const r = toPoint(tg.point);
      const nm = L(lang, tg.label[0], tg.label[1]);
      const action: Action = { type: 'navigateTo', target: { lat: tg.point.lat, lon: tg.point.lon, name: tg.label[0], wpId: tg.wpId } };
      return both(lang,
        [`Navigate to ${nm}${r ? ` · ${showDist(r.distNm)} · ${showBearing(r.bearing)}` : ''}?`, `Navigate to ${nm}${r ? `, ${sayDist(r.distNm, 'en')} away` : ''}?`],
        [`التوجه إلى ${nm}${r ? ` · ${showDist(r.distNm)} · ${showBearing(r.bearing)}` : ''}؟`, `أوجهك إلى ${nm}${r ? `، على بعد ${sayDist(r.distNm, 'ar')}` : ''}؟`],
        { card: { type: 'confirm', action, title: L(lang, 'Navigate here', 'انطلق إلى هنا'), yes: L(lang, 'Navigate', 'انطلق') }, pending: { action } });
    }

    case 'saveWaypoint': {
      if (!n.pos || !n.hasFix) return noFix(lang, n.gps, n.lastFixAgeS);
      const kind = (p.wpKind || 'mark') as WpKind;
      const name = p.wpName || L(lang, KIND_NAME[kind]?.en ?? 'Waypoint', KIND_NAME[kind]?.ar ?? 'نقطة');
      const action: Action = { type: 'saveWaypoint', name, kind, lat: n.pos.lat, lon: n.pos.lon };
      return both(lang, [`Save this location as “${name}”?`, `Save this location as ${name}?`], [`أحفظ هالمكان باسم «${name}»؟`, `أحفظ هالمكان باسم ${name}؟`],
        { card: { type: 'confirm', action, title: L(lang, 'Save waypoint', 'حفظ نقطة'), yes: L(lang, 'Save', 'احفظ') }, pending: { action } });
    }

    case 'startTrip': {
      if (n.trip) return both(lang, ['A trip is already recording.', 'A trip is already recording.'], ['في رحلة تتسجل الحين.', 'في رحلة تتسجل الحين.']);
      const action: Action = { type: 'startTrip' };
      return both(lang, ['Start recording a trip?', 'Start recording a trip?'], ['أبدأ تسجيل الرحلة؟', 'أبدأ تسجيل الرحلة؟'],
        { card: { type: 'confirm', action, title: L(lang, 'Start trip', 'ابدأ الرحلة'), yes: L(lang, 'Start', 'ابدأ') }, pending: { action } });
    }

    case 'endTrip': {
      if (!n.trip) return both(lang, ['No trip is recording.', "There's no trip recording."], ['ما في رحلة تتسجل.', 'ما في رحلة تتسجل.']);
      const action: Action = { type: 'endTrip' };
      return both(lang, ['End trip? Your route will be saved.', 'End the trip? Your route will be saved.'], ['إنهاء الرحلة؟ سيتم حفظ مسارك.', 'أنهي الرحلة؟ بينحفظ مسارك.'],
        { card: { type: 'confirm', action, title: L(lang, 'End trip', 'إنهاء الرحلة'), yes: L(lang, 'End & save', 'إنهاء وحفظ') }, pending: { action } });
    }

    case 'showTrip':
      return both(lang, ['Your trips are in Trips.', 'Opening your trips.'], ['رحلاتك في صفحة الرحلات.', 'هذي رحلاتك.'], { card: { type: 'link', href: '/trips', label: L(lang, 'Open Trips', 'افتح الرحلات') } });

    case 'weather': case 'wind': case 'waves': case 'tide': {
      const m = getCurrentMarineConditions();
      if (!m.available || !m.now) return both(lang, ["I don't have fresh marine conditions right now.", "I don't have fresh marine conditions right now, so I can't give you a reliable answer."],
        ['ما عندي بيانات بحرية محدثة الحين.', 'ما عندي بيانات بحرية محدثة الحين، فما أقدر أعطيك جواب أكيد.']);
      const c = m.now;
      const old = (m.ageMin ?? 0) > 180;
      const stale = old ? L(lang, ` (forecast from ${Math.round((m.ageMin ?? 0) / 60)} h ago)`, ` (توقعات قبل ${Math.round((m.ageMin ?? 0) / 60)} ساعة)`) : '';
      const staleS = old ? L(lang, ' This forecast is a few hours old.', ' هالتوقعات قديمة شوي.') : '';
      const trend = c.tideTrend === 'Rising' ? L(lang, 'rising', 'المد طالع') : c.tideTrend === 'Falling' ? L(lang, 'falling', 'الماي نازل') : c.tideTrend === 'Slack' ? L(lang, 'slack', 'المد راكد') : null;
      const nt = c.nextTides[0];
      const ntText = nt ? L(lang, `${nt.type === 'high' ? 'High' : 'Low'} tide at ${fmtClock(nt.at)}`, `${nt.type === 'high' ? 'المد العالي' : 'الجزر'} الساعة ${fmtClock(nt.at)}`) : '';
      const ntSay = nt ? L(lang, `${nt.type === 'high' ? 'High' : 'Low'} tide at ${sayClock(nt.at, 'en')}.`, `${nt.type === 'high' ? 'المد العالي' : 'الجزر'} الساعة ${sayClock(nt.at, 'ar')}.`) : '';
      if (p.intent === 'tide') {
        if (!trend && !nt) return both(lang, ['Tide data unavailable.', "I don't have tide data right now."], ['بيانات المد غير متوفرة.', 'ما عندي بيانات المد الحين.']);
        return both(lang, [`Tide ${trend ?? ''}. ${ntText}${stale}`, `The tide is ${trend ?? 'unknown'}. ${ntSay}${staleS}`], [`${trend ?? ''}. ${ntText}${stale}`, `${trend ?? ''}. ${ntSay}${staleS}`]);
      }
      const wind = c.windKn != null ? Math.round(c.windKn) : null, gust = c.gustKn != null ? Math.round(c.gustKn) : null;
      const wave = c.waveM != null ? Number(c.waveM.toFixed(1)) : null;
      if (p.intent === 'wind') {
        if (wind == null) return both(lang, ['Wind data unavailable.', "I don't have wind data right now."], ['بيانات الرياح غير متوفرة.', 'ما عندي بيانات الرياح الحين.']);
        return both(lang, [`Wind ${wind} kn${gust ? `, gusts ${gust}` : ''}${stale}`, `Wind is ${wind} knots${gust ? `, gusting ${gust}` : ''}.${staleS}`],
          [`الرياح ${wind} عقدة${gust ? `، هبات ${gust}` : ''}${stale}`, `الرياح ${sayNum(wind, 'ar', 0)} عقدة${gust ? `، والهبات توصل ${sayNum(gust, 'ar', 0)}` : ''}.${staleS}`]);
      }
      if (p.intent === 'waves') {
        if (wave == null) return both(lang, ['Wave data unavailable.', "I don't have wave data right now."], ['بيانات الموج غير متوفرة.', 'ما عندي بيانات الموج الحين.']);
        return both(lang, [`Waves ${wave} m${stale}`, `Waves are around ${wave} metres.${staleS}`], [`الموج ${wave} م${stale}`, `الموج تقريباً ${sayNum(wave, 'ar')} متر.${staleS}`]);
      }
      const partsEn = [wind != null ? `Wind ${wind} kn` : null, wave != null ? `waves ${wave} m` : null, trend ? `tide ${trend}` : null].filter(Boolean).join(', ');
      const partsAr = [wind != null ? `الرياح ${wind} عقدة` : null, wave != null ? `الموج ${wave} م` : null, trend].filter(Boolean).join('، ');
      const sayEn = [wind != null ? `Wind is ${wind} knots` : null, wave != null ? `waves are around ${wave} metres` : null, trend ? `and the tide is ${trend}` : null].filter(Boolean).join(', ');
      const sayAr = [wind != null ? `الرياح ${sayNum(wind, 'ar', 0)} عقدة` : null, wave != null ? `والموج تقريباً ${sayNum(wave, 'ar')} متر` : null, trend ? `و${trend}` : null].filter(Boolean).join('، ');
      return both(lang, [`${partsEn}.${stale}`, `${sayEn}.${staleS} Conditions can change, so keep checking.`], [`${partsAr}.${stale}`, `${sayAr}.${staleS} الأحوال تتغير، فخلك متابع.`]);
    }

    case 'fishing': {
      const f = getFishingConditions(p.day ?? 0);
      if (!f) return both(lang, ["I don't have fresh marine conditions, so I can't give a reliable fishing outlook.", "I don't have fresh marine conditions right now, so I can't give you a reliable fishing assessment."],
        ['ما عندي بيانات بحرية محدثة، فما أقدر أقيّم الصيد.', 'ما عندي بيانات بحرية محدثة الحين، فما أقدر أعطيك تقييم أكيد للصيد.']);
      const lvl = (s: number) => (s >= 70 ? ['good', 'زين'] : s >= 50 ? ['fair', 'متوسط'] : ['poor', 'ضعيف']);
      const toClock = (localMs: number) => new Date(localMs).toISOString().slice(11, 16);
      const w = f.windows[0];
      const when = p.day === 1 ? L(lang, 'Tomorrow', 'باجر') : L(lang, 'Today', 'اليوم');
      const winEn = f.windows.map((x) => `${toClock(x.start)}–${toClock(x.end)}`).join(' and ');
      const winAr = f.windows.map((x) => `${toClock(x.start)}–${toClock(x.end)}`).join(' و ');
      if (p.day === 0 && f.nowScore != null) {
        const [e, a] = lvl(f.nowScore);
        return both(lang,
          [`Fishing outlook now: ${e} (${f.nowScore}/100).${w ? ` Best: ${winEn}.` : ''}`, `Based on the available conditions, the fishing outlook right now is ${e}.${w ? ` The best window today is ${winEn}.` : ''} It's an estimate, not a guarantee.`],
          [`تقييم الصيد الحين: ${a} (${f.nowScore}/100).${w ? ` أفضل وقت: ${winAr}.` : ''}`, `حسب البيانات المتوفرة، الصيد الحين ${a}.${w ? ` أفضل وقت اليوم ${winAr}.` : ''} هذا تقدير مب ضمان.`]);
      }
      if (!w) return both(lang, [`${when}: no strong fishing window in the forecast.`, `${when} there's no strong fishing window in the forecast.`], [`${when}: ما في وقت قوي للصيد في التوقعات.`, `${when} ما في وقت قوي للصيد في التوقعات.`]);
      return both(lang, [`${when} best fishing: ${winEn} (${lvl(w.score)[0]}).`, `${when} the best fishing time is ${winEn}. It's an estimate.`], [`${when} أفضل وقت للصيد: ${winAr} (${lvl(w.score)[1]}).`, `${when} أفضل وقت للصيد ${winAr}. هذا تقدير.`]);
    }

    case 'fuel': {
      const b = getBoatProfile();
      if (!b.burnLph) return both(lang, ['Add your fuel burn in Settings → My boat for fuel estimates.', "I don't know your boat's fuel burn yet. Add it in Settings, under My boat."], ['أضف استهلاك الوقود في الإعدادات ← قاربي.', 'ما أعرف استهلاك قاربك للوقود. أضفه في الإعدادات تحت قاربي.']);
      const tg = n.returning || n.guide || n.trip?.start ? (n.toStart && (n.returning || !n.guide) ? { d: n.toStart.alongNm, en: 'back to your start', ar: 'للرجوع للبداية' } : n.guide ? { d: n.guide.remainingNm, en: `to ${n.guide.target || n.guide.name}`, ar: `إلى ${n.guide.target || n.guide.name}` } : null) : null;
      if (tg && b.cruiseKn > 0) {
        const l = (tg.d / b.cruiseKn) * b.burnLph;
        return both(lang, [`≈ ${Math.round(l)} L ${tg.en} at ${b.cruiseKn} kn (estimate). Keep a third in reserve.`, `About ${Math.round(l)} litres ${tg.en} at your cruise speed. That's an estimate, so keep a third in reserve.`],
          [`≈ ${Math.round(l)} لتر ${tg.ar} على ${b.cruiseKn} عقدة (تقدير). خل الثلث احتياط.`, `تقريباً ${sayNum(Math.round(l), 'ar', 0)} لتر ${tg.ar} على سرعة الكروز. هذا تقدير، فخل الثلث احتياط.`]);
      }
      return both(lang, [`Your boat uses about ${b.burnLph} L per hour at ${b.cruiseKn} kn (estimate). Set a destination for a trip figure.`, `At cruise speed your boat uses about ${b.burnLph} litres an hour. That's an estimate. Pick a destination and I'll work out the trip.`],
        [`قاربك يستهلك تقريباً ${b.burnLph} لتر بالساعة على ${b.cruiseKn} عقدة (تقدير). حدد وجهة عشان أحسب الرحلة.`, `على سرعة الكروز قاربك يستهلك تقريباً ${sayNum(b.burnLph, 'ar', 0)} لتر بالساعة. هذا تقدير. حدد وجهة وأحسب لك الرحلة.`]);
    }

    case 'checklist': {
      const items = buildChecklist('boating').slice(0, 6);
      return both(lang, ['Before you leave, check:', 'Before you leave: fuel with a third in reserve, life jackets for everyone, VHF on channel 16, the forecast, and tell someone ashore when you will be back.'],
        ['قبل ما تطلع، تأكد من:', 'قبل ما تطلع: البترول مع احتياط الثلث، سترات نجاة للكل، اللاسلكي على القناة ستة عشر، التوقعات، وخبر حد على البر متى بترجع.'],
        { card: { type: 'checklist', items } });
    }

    case 'plan': {
      const plan = await createTripPlan({ activity: p.activity ?? 'fishing', day: p.day ?? 1, part: p.part ?? null, hours: p.hours ?? null });
      const act = activityName(plan.activity, lang);
      const when = p.day === 0 ? L(lang, 'today', 'اليوم') : p.day === 2 ? L(lang, 'the day after tomorrow', 'بعد باجر') : L(lang, 'tomorrow', 'باجر');
      const cond = plan.conditions;
      const condEn = cond && cond.windMaxKn != null ? ` Forecast wind up to ${Math.round(cond.windMaxKn)} kn${cond.waveMaxM != null ? `, waves up to ${cond.waveMaxM.toFixed(1)} m` : ''}.` : ' No forecast is available for that time yet.';
      const condAr = cond && cond.windMaxKn != null ? ` التوقعات: رياح لين ${Math.round(cond.windMaxKn)} عقدة${cond.waveMaxM != null ? `، وموج لين ${cond.waveMaxM.toFixed(1)} م` : ''}.` : ' ما في توقعات لهالوقت لين الحين.';
      const condSayAr = cond && cond.windMaxKn != null ? ` الرياح لين ${sayNum(Math.round(cond.windMaxKn), 'ar', 0)} عقدة${cond.waveMaxM != null ? ` والموج لين ${sayNum(Number(cond.waveMaxM.toFixed(1)), 'ar')} متر` : ''}.` : ' ما في توقعات لهالوقت لين الحين.';
      const hrs = plan.durationH;
      return both(lang,
        [`${act} ${when}, leaving ${plan.departure}, ${hrs} h.${condEn} Create this trip?`, `Here's a ${hrs}-hour ${act.toLowerCase()} plan for ${when}, leaving at ${plan.departure}.${condEn} Create this trip?`],
        [`${act} ${when}، الانطلاق ${plan.departure}، لمدة ${hrs} ${hrs <= 10 && hrs >= 3 ? 'ساعات' : 'ساعة'}.${condAr} أسوي هالرحلة؟`, `جهزت لك رحلة ${act} ${when}، الانطلاق الساعة ${plan.departure}، لمدة ${sayDuration(hrs, 'ar')}.${condSayAr} أسوي هالرحلة؟`],
        { card: { type: 'plan', plan }, pending: { action: { type: 'savePlan', plan } } });
    }

    case 'summary': case 'history': {
      const trips = await getTripHistory(p.intent === 'history' ? (p.day ?? -1) : null);
      if (!trips.length) return p.intent === 'history'
        ? both(lang, ["I don't have a saved trip for yesterday.", "I don't have a saved trip for yesterday."], ['ما عندي رحلة محفوظة لأمس.', 'ما عندي رحلة محفوظة لأمس.'])
        : both(lang, ["You don't have any saved trips yet.", "You don't have any saved trips yet."], ['ما عندك رحلات محفوظة لين الحين.', 'ما عندك رحلات محفوظة لين الحين.']);
      return tripSummary(trips[0], lang, p.intent === 'history' ? L(lang, "Yesterday's trip", 'رحلة أمس') : L(lang, 'Your last trip', 'آخر رحلة'));
    }

    case 'boat': {
      const b = getBoatProfile();
      return both(lang, [`${b.name || 'Your boat'} · cruise ${b.cruiseKn} kn${b.burnLph ? ` · ${b.burnLph} L/h` : ''}${b.tankL ? ` · tank ${b.tankL} L` : ''}`, `${b.name || 'Your boat'}: cruise speed ${b.cruiseKn} knots${b.burnLph ? `, about ${b.burnLph} litres an hour` : ''}.`],
        [`${b.name || 'قاربك'} · الكروز ${b.cruiseKn} عقدة${b.burnLph ? ` · ${b.burnLph} لتر/س` : ''}${b.tankL ? ` · الخزان ${b.tankL} لتر` : ''}`, `${b.name || 'قاربك'}: سرعة الكروز ${sayNum(b.cruiseKn, 'ar')} عقدة${b.burnLph ? `، والاستهلاك تقريباً ${sayNum(b.burnLph, 'ar', 0)} لتر بالساعة` : ''}.`]);
    }

    case 'help':
      return both(lang, ['Try: “How far to the start?”, “What’s the wind?”, “Save this as a fishing spot”, “Take me home”, “Plan a fishing trip tomorrow morning”.', 'You can ask where you are, your speed, how far to the start, the wind or the sea, save a spot, go back to the start, or plan a trip.'],
        ['جرب: «كم باقي على البداية؟»، «شلون الرياح؟»، «احفظ هالمكان كموقع صيد»، «رجعني للبداية»، «خطط لي رحلة صيد باجر الصبح».', 'تقدر تسألني وين موقعك، سرعتك، كم باقي على البداية، الرياح أو البحر، تحفظ مكان، ترجع للبداية، أو تخطط رحلة.']);

    default:
      return { ...both(lang, ["Sorry, I didn't catch that.", "Sorry, I didn't catch that. Try again, or say help."], ['آسف، ما فهمت.', 'آسف، ما فهمت عليك. عيد مرة ثانية أو قول مساعدة.']), unknown: true, source: 'none' };
  }
}

export async function tripSummary(t: Trip, lang: AiLang, lead: string): Promise<Reply> {
  const dur = ((t.endedAt ?? Date.now()) - t.startedAt) / 3600e3;
  const wps = await waypointsDuring(t);
  return both(lang,
    [`${lead}: ${showDist(t.distanceNm)} · ${showDuration(dur)} · max ${t.maxKn.toFixed(0)} kn · ${wps} waypoints`, `${lead} was ${sayDist(t.distanceNm, 'en')} over ${sayDuration(dur, 'en')}, with a maximum speed of ${Math.round(t.maxKn)} knots and ${sayCount(wps, 'en', ['saved waypoint', 'saved waypoints'], ['', '', ''])}.`],
    [`${lead}: ${showDist(t.distanceNm)} · ${showDuration(dur)} · أقصى سرعة ${t.maxKn.toFixed(0)} عقدة · ${wps} نقاط`, `${lead} كانت ${sayDist(t.distanceNm, 'ar')} خلال ${sayDuration(dur, 'ar')}، وأقصى سرعة ${sayNum(Math.round(t.maxKn), 'ar', 0)} عقدة، و${sayCount(wps, 'ar', ['', ''], ['نقطة', 'نقطتين', 'نقاط'])} محفوظة.`]);
}
