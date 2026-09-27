// On-device understanding of short spoken commands in English, Arabic (including
// everyday UAE/Gulf Arabic) and a mix of both. Works with no internet. Anything it
// cannot place confidently returns 'unknown' and may be sent to the language model.
import type { AiLang } from './speakable';

export type Intent =
  | 'emergency' | 'stop' | 'repeat' | 'yes' | 'no'
  | 'where' | 'speed' | 'course' | 'distance' | 'ttg' | 'eta' | 'travelled'
  | 'returnStart' | 'navigateTo' | 'saveWaypoint' | 'startTrip' | 'endTrip' | 'showTrip'
  | 'weather' | 'wind' | 'waves' | 'tide' | 'fishing' | 'fuel' | 'checklist' | 'plan'
  | 'summary' | 'history' | 'gps' | 'boat' | 'help' | 'unknown';

export type TargetRef = { kind: 'start' } | { kind: 'home' } | { kind: 'active' } | { kind: 'wpKind'; wpKind: string } | { kind: 'name'; name: string };

export interface Parsed {
  intent: Intent;
  lang: AiLang;
  text: string; // normalised text
  target?: TargetRef;
  wpKind?: string; // for saveWaypoint
  wpName?: string;
  day?: number; // 0 today, 1 tomorrow, 2 day after, -1 yesterday
  part?: 'morning' | 'afternoon' | 'evening' | null;
  hours?: number | null;
  activity?: string | null;
}

const AR_CHARS = /[\u0600-\u06FF]/g;
const LAT_CHARS = /[a-z]/gi;

/** Arabic when Arabic letters make up at least 30 % of the letters (after the wake word). */
export function detectLang(raw: string): AiLang {
  const s = stripWake(raw.toLowerCase());
  const ar = (s.match(AR_CHARS) || []).length, la = (s.match(LAT_CHARS) || []).length;
  if (!ar && !la) return 'en';
  return ar / (ar + la) >= 0.3 ? 'ar' : 'en';
}

function stripWake(s: string) {
  return s.replace(/^(hey|hi|ok|okay|يا)?\s*(bahrna|bahrana|bahr na|behrna|بحرنا|بحرنه)[\s,،:.!]*/i, '').trim();
}

/** Lower-case, unify Arabic letter forms, drop diacritics/tatweel, Arabic-Indic digits → 0-9. */
export function normalise(raw: string): string {
  let s = raw.toLowerCase();
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
  s = s.replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  s = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  s = s.replace(/[’'`]/g, "'").replace(/[؟?!.,،؛;:"()]/g, ' ');
  s = stripWake(s);
  // "الـ fishing" → "fishing"
  s = s.replace(/(^|\s)(ال|لل|بال)ـ?\s+(?=[a-z])/g, '$1').replace(/ـ/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

const has = (s: string, re: RegExp) => re.test(s);

// ---------- vocabulary ----------
const EMERGENCY = /\b(mayday|sos|emergency|help me(?! (plan|with|find|to|understand|save|set|choose|pick))|(i|we) need help|^help$|sinking|taking (on )?water|man overboard|person overboard|fire on board|capsiz|engine (has )?(stopped|died|failed|dead|broke|won'?t start|is not starting)|(we'?re|we are|i'?m|i am|boat is) drifting|lost at sea|injur)|ماي ?داي|طواري|(نحتاج|ابي|ابغي|نبي|نبغي|اريد|بغيت) ?(مساعده|فزعه)|^مساعده|ساعدو(ني|نا)|الحقو(ني|نا)|فزعه|نغرق|يغرق|غرق|حريق|(عطلت|خربت|وقفت|طفت|تعطلت|انطفت|عطل|خربان|خربانه|معطل|معطله) ?(ال)?(ماكينه|مكينه|المكينه|الماكينه|محرك|المحرك|موتور|الموتور|مكاين)|(ال)?(ماكينه|مكينه|محرك|موتور) (عطلت|خربت|وقفت|طفت|تعطلت|انطفت|خربانه|معطله)|(ن|ي|ا)?نجرف|انجراف|سقط .*(بحر|ماي)|طاح .*(بحر|ماي)|انقلب/;

const STOP = /^(stop|stop talking|quiet|be quiet|shut up|enough|cancel that|ok stop|اسكت|بس|خلاص|وقف الكلام|سكوت|كفايه|وقف)$/;
const REPEAT = /\b(say (that|it) again|repeat( that)?|come again|pardon|what did you say|again please)\b|^again$|^what$|عيد|كرر|مره ثانيه|مره ثانيه|ما سمعت|ما فهمت|شو قلت|ايش قلت/;
const YES = /^(yes|yeah|yep|yup|sure|ok|okay|confirm|confirmed|do it|go ahead|please do|affirmative|correct|start|save|start it|save it|go|yes please|نعم|اي|ايه|ايوه|ايوا|اكيد|تمام|اوكي|اوك|يلا|زين|موافق|سو|سوها|احفظ|احفظه|ابدا|ابدا|بدا|شغل|صح|طيب|اي نعم|اي اكيد|يب)( please| لو سمحت| بليز)?$/;
const NO = /^(no|nope|nah|cancel|don'?t|do not|never ?mind|not now|stop it|abort|لا|لاء|لا|لا شكرا|لا خلاص|الغ|الغي|الغاء|كنسل|خلها|خله|بلاش|مب لازم|مو لازم|ما ابي|ما ابغي|لا تسوي)$/;

const W_START = /\b(start|starting point|the start|back|home|base|harbou?r|marina)\b|البدايه|نقطه البدايه|نقطه الانطلاق|الانطلاق|الرجوع|البيت|بيت|المرسي|الميناء|المارينا|الرجعه|للبدايه|للبيت|المنطلق/;
const W_HOME_WP = /\b(home|house)\b|البيت|بيت|للبيت/;

const KINDS: [RegExp, string][] = [
  [/\bfish(ing)?\b|\bspot\b.*fish|صيد|الصيد|حداق|سمك|فيشنق|فيشنج/, 'fish'],
  [/\banchor(age)?\b|مرسي|مرساه|انكر/, 'anchor'],
  [/\b(fuel|petrol|gas station|diesel)\b|بترول|وقود|ديزل|محطه/, 'fuel'],
  [/\b(home|house)\b|البيت|بيت/, 'home'],
  [/\bdiv(e|ing)\b|غوص/, 'dive'],
  [/\bmarina\b|مارينا|المارينا/, 'marina'],
  [/\b(ramp|slipway)\b|منزلق|سلب/, 'ramp'],
  [/\bhazard\b|خطر/, 'hazard'],
];
function kindIn(s: string): string | null {
  for (const [re, k] of KINDS) if (re.test(s)) return k;
  return null;
}

const AR_NUM: Record<string, number> = {
  'واحد': 1, 'وحده': 1, 'ساعه': 1, 'ساعتين': 2, 'اثنين': 2, 'ثنتين': 2, 'ثلاث': 3, 'ثلاثه': 3, 'اربع': 4, 'اربعه': 4, 'خمس': 5, 'خمسه': 5,
  'ست': 6, 'سته': 6, 'سبع': 7, 'سبعه': 7, 'ثمان': 8, 'ثمانيه': 8, 'ثماني': 8, 'تسع': 9, 'تسعه': 9, 'عشر': 10, 'عشره': 10,
};
const EN_NUM: Record<string, number> = { one: 1, an: 1, a: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };

function hoursIn(s: string): number | null {
  if (/ساعتين/.test(s)) return 2;
  if (/نص ساعه/.test(s)) return 0.5;
  let m = s.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b|ساعات|ساعه|ساعه)/);
  if (m) return Number(m[1]);
  m = s.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|an|a)\s+(?:and a half\s+)?hours?/);
  if (m) return EN_NUM[m[1]] + (/and a half/.test(m[0]) ? 0.5 : 0);
  m = s.match(/(واحد|ثلاث|ثلاثه|اربع|اربعه|خمس|خمسه|ست|سته|سبع|سبعه|ثمان|ثماني|ثمانيه|تسع|تسعه|عشر|عشره)\s+(ساعات|ساعه)/);
  if (m) return AR_NUM[m[1]];
  if (/half (a )?day|نص يوم/.test(s)) return 5;
  if (/all day|full day|يوم كامل|طول اليوم/.test(s)) return 8;
  return null;
}
function dayIn(s: string): number | undefined {
  if (/day after tomorrow|بعد باجر|بعد بكره|بعد بكرا|بعد غد/.test(s)) return 2;
  if (/tomorrow|باجر|بكره|بكرا|غدا|الغد|بكره/.test(s)) return 1;
  if (/yesterday|امس|البارحه|البارح/.test(s)) return -1;
  if (/today|tonight|this (morning|afternoon|evening)|now|اليوم|الحين|الحينه|هالحين|الليله/.test(s)) return 0;
  return undefined;
}
function partIn(s: string): Parsed['part'] {
  if (/morning|dawn|sunrise|early|الصبح|صباح|الصباح|الفجر|فجر|بدري|الشروق/.test(s)) return 'morning';
  if (/afternoon|noon|الظهر|العصر|عصر|ظهر/.test(s)) return 'afternoon';
  if (/evening|sunset|night|المغرب|مغرب|المسا|مساء|الليل|بالليل|الغروب/.test(s)) return 'evening';
  return null;
}
function activityIn(s: string): string | null {
  if (/fish|صيد|حداق|سمك/.test(s)) return 'fishing';
  if (/div|غوص/.test(s)) return 'diving';
  if (/jet ?ski|جت سكي|جيت سكي|دباب/.test(s)) return 'jetski';
  if (/kayak|كاياك|قوارب التجديف/.test(s)) return 'kayak';
  if (/sail|شراع/.test(s)) return 'sailing';
  if (/swim|سباحه/.test(s)) return 'swimming';
  if (/cruise|boat|trip|كشته|طلعه|نزهه|رحله/.test(s)) return 'boating';
  return null;
}

/** Target of a "how far / navigate to" request. */
function targetIn(s: string): TargetRef | undefined {
  const k = kindIn(s);
  if (k && k !== 'home') return { kind: 'wpKind', wpKind: k };
  if (W_HOME_WP.test(s)) return { kind: 'home' };
  if (W_START.test(s)) return { kind: 'start' };
  // "... to <name>" / "علي <name>"
  const m = s.match(/\b(?:to|towards|for)\s+(?:the\s+|my\s+)?([a-z0-9][a-z0-9 ]{1,30})$/) || s.match(/(?:الي|علي|لين|عند|ل)\s+(.{2,30})$/);
  if (m) {
    const name = m[1].replace(/^(ال)/, '').trim();
    if (name && !/^(it|there|here|go|get back|arrive)$/.test(name)) return { kind: 'name', name: m[1].trim() };
  }
  return undefined;
}

export function parse(raw: string, pendingConfirm = false): Parsed {
  const lang = detectLang(raw);
  const s = normalise(raw);
  const base = { lang, text: s };
  if (!s) return { ...base, intent: 'unknown' };

  // 1. Emergencies always win.
  if (has(s, EMERGENCY)) return { ...base, intent: 'emergency' };

  // 2. Conversation control.
  if (pendingConfirm && YES.test(s)) return { ...base, intent: 'yes' };
  if (pendingConfirm && NO.test(s)) return { ...base, intent: 'no' };
  if (STOP.test(s)) return { ...base, intent: 'stop' };
  if (has(s, REPEAT)) return { ...base, intent: 'repeat' };
  if (!pendingConfirm && YES.test(s)) return { ...base, intent: 'yes' };
  if (!pendingConfirm && NO.test(s)) return { ...base, intent: 'no' };

  // 3. Trip planning (before anything that mentions fuel, fishing or tomorrow).
  if (has(s, /\b(plan|organi[sz]e|prepare|arrange|set up)\b.*\b(trip|outing|day|fishing|dive|cruise)\b|\bi (want|would like|wanna|plan) to go (out|fishing|diving|cruising)|\bplan (me )?(a )?(fishing|trip)|خطط|خطط لي|رتب لي|رتب|جهز لي|نظم|ابي اطلع|ابغي اطلع|ابي اروح|ابغي اروح|ودي اطلع|بطلع|بنطلع|نبي نطلع|نبغي نطلع/)
      && !has(s, /\bhow (much|far|long)\b|كم/)) {
    return { ...base, intent: 'plan', day: dayIn(s) ?? 1, part: partIn(s), hours: hoursIn(s), activity: activityIn(s) ?? 'fishing' };
  }

  // 4. Trip recording.
  if (has(s, /\b(start|begin|resume)\b.*\b(record|recording|trip|tracking|track|logging)\b|\bstart tracking\b|(ابدا|ابدا|بدا|شغل|سجل|فعل) ?(ال)?(تسجيل|رحله|الرحله|التتبع|المسار)|سجل الرحله|سجل رحلتي/)) return { ...base, intent: 'startTrip' };
  if (has(s, /\b(stop|end|finish|terminate)\b.*\b(record|recording|trip|tracking|track|logging)\b|(وقف|اوقف|انهي|انه|خلص|سكر|طف) ?(ال)?(تسجيل|رحله|الرحله|التتبع)/)) return { ...base, intent: 'endTrip' };

  // 5. Explicit commands with a verb (save / go back) — not when phrased as a question.
  const isQ = has(s, /\b(how|what|what'?s|where|when|which|is|are|do|does|did|can|tell me)\b|(^|\s)(كم|وين|متي|شو|ايش|شلون|كيف|هل|قد ايش|چم)(\s|$)/);
  if (has(s, /\b(save|mark|store|add|drop|remember)\b.*\b(this|here|location|spot|place|position|point|waypoint|mark)\b|\bmark (this|here|it)\b|\bsave (it|this)\b|(احفظ|سجل|خزن|علم|ثبت|حط) ?(هالمكان|هذا المكان|المكان|الموقع|هالموقع|هذا الموقع|هني|هنا|النقطه|نقطه|علامه)|(احفظه|سجله|خزنه) |^(احفظه|سجله|خزنه)$|هذا المكان (حق|للصيد|لل)/)) {
    const nm = s.match(/\b(?:as|called|named|name it)\s+['"]?([a-z0-9][a-z0-9 ]{1,30})['"]?$/) || s.match(/(?:باسم|اسمه|سمه|سميه)\s+(.{2,30})$/);
    let wpName = nm ? nm[1].trim().replace(/^(a|an|the|my)\s+/, '') : undefined;
    // "as a fishing spot" names the type, not the waypoint
    if (wpName && (kindIn(wpName) || /^(spot|place|location|point|waypoint|mark|موقع|مكان|نقطه)$/.test(wpName))) wpName = undefined;
    return { ...base, intent: 'saveWaypoint', wpKind: kindIn(s) ?? 'mark', wpName };
  }
  if (has(s, /\b(summar)|لخص|ملخص/)) return { ...base, intent: 'summary' };
  if (!isQ && has(s, /\b(take|bring|get|guide|navigate|lead) (me|us)? ?(back )?(home|back)\b|\breturn (to )?(the )?(start|home|base)\b|\bgo back (to )?(the )?(start|home)\b|\bnavigat(e|ion) (back )?(to )?(the )?(start|home)\b|\bback to (the )?start\b|\breturn to start\b|رجعني|ارجعني|رجعنا|ارجعنا|ودني البيت|وديني البيت|وديني للبيت|خذني للبيت|خذني البيت|العوده (الي|لل)?(البدايه|البيت)|ارجع (الي |لل)?(البدايه|البيت)|نرجع (لل|الي )?(البدايه|البيت)|رجوع للبدايه/))
    return { ...base, intent: 'returnStart' };

  // 5. Questions (checked before navigation commands so "how long until I get back" is a question).
  if (isQ || has(s, /\b(eta|position|speed|course|heading|coordinates|weather|wind|waves?|tide|fuel|distance)\b/)) {
    if (has(s, /\b(yesterday|last week|this week|last month)\b|امس|البارحه|الاسبوع (الماضي|اللي طاف)|الشهر (الماضي|اللي طاف)/) && has(s, /\b(travel|go|went|cover|drive|trip|far|distance)\b|مشيت|قطعت|مشينا|قطعنا|رحله|رحلتي|المسافه/))
      return { ...base, intent: 'history', day: -1 };
    if (has(s, /\b(summar|last trip|previous trip|my last)\b|لخص|ملخص|رحلتي الاخيره|اخر رحله|الرحله الاخيره|الرحله اللي طافت/)) return { ...base, intent: 'summary' };
    if (has(s, /\b(how far|distance)\b.*\b(travel|travelled|traveled|come|gone|covered|done)\b|\bhow far have (i|we)\b|كم (مشيت|قطعت|مشينا|قطعنا)|المسافه اللي (قطعتها|مشيتها|قطعناها)/)) return { ...base, intent: 'travelled' };
    if (has(s, /\beta\b|\bwhen (will|do|would|shall|can) (i|we) (get|arrive|reach|be)|arrival time|what time.*(arrive|get)|متي (اوصل|بوصل|نوصل|بنوصل|راح اوصل)|وقت الوصول|موعد الوصول|اي تي اي|الوصول المتوقع/)) return { ...base, intent: 'eta', target: targetIn(s) };
    if (has(s, /\bhow long\b|\btime to go\b|\bhow (much|many) (more )?(time|minutes|hours)\b|كم (باقي )?(وقت|ساعه|دقيقه|دقايق)|قد ايش باقي وقت|كم ياخذ|كم بياخذ|كم يبي وقت|الوقت المتبقي|كم باقي علي الرجوع/)) return { ...base, intent: 'ttg', target: targetIn(s) };
    if (has(s, /\bhow far\b|\bdistance\b|\bhow many (miles|nautical)\b|كم باقي|كم بعيد|كم المسافه|قد ايش بعيد|المسافه|كم ميل|بعد ايش/)) return { ...base, intent: 'distance', target: targetIn(s) };
    if (has(s, /\b(fuel|petrol|gas|diesel)\b|بترول|ديزل|وقود|استهلاك|بانزين/)) return { ...base, intent: 'fuel' };
    if (has(s, /\b(take|bring|pack|carry)\b.*\b(with|along)\b|\bwhat (should|do) i (need|take|bring|check)\b|\bcheck(list)? before\b|before (leaving|i leave|going out|heading out)|\bsafety check|اخذ معاي|اخذ وياي|اشيل معاي|اشيل وياي|اخذ معي|احتاج اخذ|قبل اطلع|قبل لا اطلع|قبل الطلعه|قبل ما اطلع|اتاكد منه|قايمه|قايمه|تشيك ليست|شيك ليست/)) return { ...base, intent: 'checklist' };
    if (has(s, /\b(fish|fishing|bite|catch)\b|صيد|الصيد|حداق|السمك/)) return { ...base, intent: 'fishing', day: dayIn(s) ?? 0 };
    if (has(s, /\btides?\b|المد|الجزر|مد |ماي البحر|الماي/) || /(^| )مد$/.test(s)) return { ...base, intent: 'tide', day: dayIn(s) ?? 0 };
    if (has(s, /\bwinds?\b|رياح|الريح|ريح|الهوا|هوا|الرياح/)) return { ...base, intent: 'wind' };
    if (has(s, /\bwaves?\b|swell|الموج|موج|امواج/)) return { ...base, intent: 'waves' };
    if (has(s, /\b(weather|sea|conditions|forecast|outside)\b|الجو|الطقس|البحر|الحاله|الاحوال|التوقعات/)) return { ...base, intent: 'weather', day: dayIn(s) ?? 0 };
    if (has(s, /\bwhere (am i|are we|is the boat)\b|\bmy (position|location|coordinates)\b|\bcoordinates\b|\bposition\b|وين (انا|احنا|نحن|موقعي|صرت|صرنا|القارب)|موقعي|مكاني|احداثياتي|الاحداثيات|وين موقعنا/)) return { ...base, intent: 'where' };
    if (has(s, /\bspeed\b|how fast|\bknots\b|سرعتي|السرعه|سرعه|كم نمشي|كم عقده/)) return { ...base, intent: 'speed' };
    if (has(s, /\b(course|heading|bearing|direction)\b|which way|اتجاهي|الاتجاه|اتجاه|وين متجه|وين رايح|الكورس/)) return { ...base, intent: 'course' };
    if (has(s, /\bgps\b|signal|accuracy|الاشاره|الدقه|جي بي اس/)) return { ...base, intent: 'gps' };
    if (has(s, /\bmy boat\b|boat profile|قاربي|طرادي|لنشي/)) return { ...base, intent: 'boat' };
  }

  // 6. Commands.
  if (has(s, /\b(navigate|take me|take us|go|guide me|guide us|head|steer|bring me) (to|towards)\b|\bnavigate here\b|(وجهني|وديني|ودني|خذني|خذنا|روح|سير|نروح|وجهنا) ?(الي|علي|لين|عند|ل|لل)?/)) {
    const tg = targetIn(s);
    if (tg && (tg.kind === 'start')) return { ...base, intent: 'returnStart' };
    return { ...base, intent: 'navigateTo', target: tg ?? { kind: 'active' } };
  }
  if (has(s, /\bshow (me )?(my )?(trip|trips|track)\b|\bopen (my )?trips\b|(وريني|اعرض|افتح) ?(رحلتي|الرحلات|رحلاتي|المسار)/)) return { ...base, intent: 'showTrip' };
  if (has(s, /\bwhat can you do\b|\bhelp\b|شو تقدر تسوي|ايش تقدر تسوي|مساعده في ايش/)) return { ...base, intent: 'help' };

  // 7. Single keywords said on their own.
  if (has(s, /^(speed|سرعتي|السرعه)$/)) return { ...base, intent: 'speed' };
  if (has(s, /^(position|location|موقعي|الموقع)$/)) return { ...base, intent: 'where' };
  if (has(s, /^(wind|الريح|الهوا|الرياح)$/)) return { ...base, intent: 'wind' };
  if (has(s, /^(weather|الجو|الطقس|البحر)$/)) return { ...base, intent: 'weather', day: 0 };
  return { ...base, intent: 'unknown' };
}
