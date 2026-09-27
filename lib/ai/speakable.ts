// Turning navigation numbers into clear spoken phrases (English and Arabic).
// Display text keeps digits; speech text spells Arabic numbers out so every
// Arabic voice reads them the same way ("سبعة فاصلة أربعة").
export type AiLang = 'en' | 'ar';

const ONES = ['صفر', 'واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
const TEENS = ['', 'إحدى عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرين', 'ثلاثين', 'أربعين', 'خمسين', 'ستين', 'سبعين', 'ثمانين', 'تسعين'];
/** Counting form used before a plural noun (3–10): ثلاث ساعات، خمس دقايق. */
const COUNT_F = ['', '', '', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع', 'عشر'];
export const arCount = (n: number) => (n >= 3 && n <= 10 ? COUNT_F[n] : arInt(n));
const HUNDREDS = ['', 'مية', 'ميتين', 'ثلاثمية', 'أربعمية', 'خمسمية', 'ستمية', 'سبعمية', 'ثمانمية', 'تسعمية'];

/** Whole numbers 0–999 999 in (lightly colloquial, clearly understood) Arabic words. */
export function arInt(n: number): string {
  n = Math.round(Math.abs(n));
  if (n <= 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) { const u = n % 10, t = Math.floor(n / 10); return u ? `${ONES[u]} و${TENS[t]}` : TENS[t]; }
  if (n < 1000) { const h = Math.floor(n / 100), r = n % 100; return r ? `${HUNDREDS[h]} و${arInt(r)}` : HUNDREDS[h]; }
  const th = Math.floor(n / 1000), r = n % 1000;
  const thw = th === 1 ? 'ألف' : th === 2 ? 'ألفين' : th <= 10 ? `${arInt(th)} آلاف` : `${arInt(th)} ألف`;
  return r ? `${thw} و${arInt(r)}` : thw;
}

/** Number with up to `dp` decimals in words: 7.4 → "سبعة فاصلة أربعة", in English digits stay ("7.4"). */
export function sayNum(n: number, lang: AiLang, dp = 1): string {
  const s = n.toFixed(dp).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  if (lang === 'en') return s;
  const [i, d] = s.split('.');
  return d ? `${arInt(Number(i))} فاصلة ${d.split('').map((c) => ONES[Number(c)]).join(' ')}` : arInt(Number(i));
}

/** Distance for speech: metres when very close, otherwise nautical miles. */
export function sayDist(nm: number, lang: AiLang): string {
  if (nm < 0.1) {
    const m = Math.round(nm * 1852);
    return lang === 'en' ? `${m} metres` : `${arInt(m)} متر`;
  }
  const v = nm < 10 ? Number(nm.toFixed(1)) : Math.round(nm);
  if (lang === 'en') return `${v} nautical ${v === 1 ? 'mile' : 'miles'}`;
  return `${sayNum(v, 'ar')} ميل بحري`;
}
export function showDist(nm: number): string {
  if (nm < 0.1) return `${Math.round(nm * 1852)} m`;
  return `${nm < 10 ? nm.toFixed(1) : Math.round(nm)} NM`;
}

export function saySpeed(kn: number, lang: AiLang): string {
  const v = Number(kn.toFixed(1));
  return lang === 'en' ? `${v} knots` : `${sayNum(v, 'ar')} عقدة`;
}

/** Bearing: English reads digit by digit like on the radio ("two one four degrees"). */
export function sayBearing(deg: number, lang: AiLang): string {
  const d = String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0');
  if (lang === 'en') return `${d.split('').join(' ')} degrees`;
  return `${arInt(Number(d))} درجة`;
}
export const showBearing = (deg: number) => `${String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0')}°`;

export function sayDuration(hours: number, lang: AiLang): string {
  const total = Math.max(1, Math.round(hours * 60));
  const h = Math.floor(total / 60), m = total % 60;
  if (lang === 'en') {
    const hs = h ? `${h} ${h === 1 ? 'hour' : 'hours'}` : '';
    const ms = m ? `${m} ${m === 1 ? 'minute' : 'minutes'}` : '';
    return [hs, ms].filter(Boolean).join(' ');
  }
  const hw = h === 0 ? '' : h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h <= 10 ? `${arCount(h)} ساعات` : `${arInt(h)} ساعة`;
  const mw = m === 0 ? '' : m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : m <= 10 ? `${arCount(m)} دقايق` : `${arInt(m)} دقيقة`;
  return [hw, mw].filter(Boolean).join(' و');
}
export function showDuration(hours: number): string {
  const total = Math.max(1, Math.round(hours * 60));
  const h = Math.floor(total / 60), m = total % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

export function sayClock(ms: number, lang: AiLang): string {
  const d = new Date(ms);
  const hh = d.getHours(), mm = d.getMinutes();
  if (lang === 'en') return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const part = hh < 12 ? 'الصبح' : hh < 16 ? 'الظهر' : hh < 19 ? 'العصر' : 'بالليل';
  return `${arInt(h12)}${mm ? ` و${mm <= 10 ? `${mm <= 2 ? arInt(mm) : arCount(mm)} دقايق` : `${arInt(mm)} دقيقة`}` : ''} ${part}`;
}

/** Coordinates spoken as degrees and decimal minutes. */
export function sayCoord(lat: number, lon: number, lang: AiLang): string {
  const part = (v: number, pos: string, neg: string, apos: string, aneg: string) => {
    const a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60;
    return lang === 'en'
      ? `${d} degrees ${m.toFixed(1)} minutes ${v >= 0 ? pos : neg}`
      : `${arInt(d)} درجة و${sayNum(Number(m.toFixed(1)), 'ar')} دقيقة ${v >= 0 ? apos : aneg}`;
  };
  return `${part(lat, 'north', 'south', 'شمال', 'جنوب')}، ${part(lon, 'east', 'west', 'شرق', 'غرب')}`.replace('،', lang === 'en' ? ',' : '،');
}

/** "1 saved waypoint" / "نقطة وحدة" / "ثلاث نقاط". */
export function sayCount(n: number, lang: AiLang, en: [string, string], ar: [string, string, string]): string {
  if (lang === 'en') return `${n} ${n === 1 ? en[0] : en[1]}`;
  if (n === 0) return `ولا ${ar[0]}`;
  if (n === 1) return `${ar[0]} وحدة`;
  if (n === 2) return ar[1];
  return n <= 10 ? `${arCount(n)} ${ar[2]}` : `${arInt(n)} ${ar[0]}`;
}
