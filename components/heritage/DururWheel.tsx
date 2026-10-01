// Bahrna's own drawing of the traditional Emirati "Durur" (الدرور) calendar.
// The count starts with the rising of Suhail on 15 August; every ten days is a "dar".
// Safri, Shita and Seif are 100 days each; Qaith is 60 days + 5 days of "Al Masariq".
// Wind / star periods are the commonly cited traditional dates and are approximate.
import { useContext, useMemo } from 'react';
import { ArtLang } from '@/components/LearnArt';

const YEAR = 365;
const START = { m: 7, d: 15 }; // 15 August (month index 7)
const DAY0 = Date.UTC(2001, START.m, START.d); // a non-leap reference year

/** Day of the Durur year (0 = 15 Aug) for a date. 29 Feb counts with 28 Feb. */
export function dururDay(date: Date): number {
  let m = date.getMonth(), d = date.getDate();
  if (m === 1 && d === 29) d = 28;
  const t = Date.UTC(2001, m, d);
  return (((t - DAY0) / 864e5) % YEAR + YEAR) % YEAR;
}
const dayOf = (m: number, d: number) => (((Date.UTC(2001, m, d) - DAY0) / 864e5) % YEAR + YEAR) % YEAR;

type T = { en: string; ar: string };
export const SEASONS: { id: string; from: number; len: number; name: T; sub: T; fill: string; text: string }[] = [
  { id: 'safri', from: 0, len: 100, name: { en: 'Safri', ar: 'الصفري' }, sub: { en: 'autumn', ar: 'الخريف' }, fill: '#A3865B', text: '#fff' },
  { id: 'shita', from: 100, len: 100, name: { en: 'Shita', ar: 'الشتاء' }, sub: { en: 'winter', ar: 'الشتاء' }, fill: '#1F6F78', text: '#fff' },
  { id: 'seif', from: 200, len: 100, name: { en: 'Seif', ar: 'الصيف' }, sub: { en: 'spring', ar: 'الربيع' }, fill: '#6FAE5B', text: '#fff' },
  { id: 'qaith', from: 300, len: 65, name: { en: 'Qaith', ar: 'القيظ' }, sub: { en: 'summer', ar: 'الصيف' }, fill: '#E2614B', text: '#fff' },
];
const DAR_AR = ['العشر', 'العشرين', 'الثلاثين', 'الأربعين', 'الخمسين', 'الستين', 'السبعين', 'الثمانين', 'التسعين', 'المية'];

/** Which season / dar a Durur day falls in. */
export function dururAt(day: number) {
  const s = SEASONS.find((x) => day >= x.from && day < x.from + x.len)!;
  const inSeason = day - s.from;
  const masariq = s.id === 'qaith' && inSeason >= 60;
  const dar = masariq ? -1 : Math.floor(inSeason / 10); // 0 = first ten
  return { season: s, dar, masariq, dayInDar: masariq ? inSeason - 59 : (inSeason % 10) + 1 };
}
export const darName = (dar: number, masariq: boolean, lang: 'en' | 'ar') =>
  masariq ? (lang === 'ar' ? 'المسارق' : 'Al Masariq') : lang === 'ar' ? DAR_AR[dar] : `${(dar + 1) * 10}`;

const WINDS: { from: [number, number]; to: [number, number]; name: T; color: string }[] = [
  { from: [7, 15], to: [8, 30], name: { en: 'Al Kaws (humid SE)', ar: 'الكوس' }, color: '#5C6BC0' },
  { from: [9, 16], to: [11, 6], name: { en: 'Al Wasm', ar: 'الوسم' }, color: '#7E9CC9' },
  { from: [11, 7], to: [0, 15], name: { en: 'Al Murabbaniya', ar: 'المربعانية' }, color: '#4A90C2' },
  { from: [4, 7], to: [5, 6], name: { en: 'Kannat Al Thuraya', ar: 'كنة الثريا' }, color: '#E8A87C' },
  { from: [5, 7], to: [6, 16], name: { en: 'Al Bawarih (NW)', ar: 'البوارح' }, color: '#D9773F' },
];
const MONTHS: T[] = [
  { en: 'Jan', ar: 'يناير' }, { en: 'Feb', ar: 'فبراير' }, { en: 'Mar', ar: 'مارس' }, { en: 'Apr', ar: 'أبريل' },
  { en: 'May', ar: 'مايو' }, { en: 'Jun', ar: 'يونيو' }, { en: 'Jul', ar: 'يوليو' }, { en: 'Aug', ar: 'أغسطس' },
  { en: 'Sep', ar: 'سبتمبر' }, { en: 'Oct', ar: 'أكتوبر' }, { en: 'Nov', ar: 'نوفمبر' }, { en: 'Dec', ar: 'ديسمبر' },
];

const C = 200; // centre
const ang = (day: number) => (day / YEAR) * 2 * Math.PI - Math.PI / 2; // 15 Aug at the top, clockwise
const pt = (r: number, a: number) => [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
function arc(r0: number, r1: number, d0: number, d1: number) {
  const a0 = ang(d0), a1 = ang(d1), big = (d1 - d0) % YEAR > YEAR / 2 ? 1 : 0;
  const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${big} 0 ${x3} ${y3}Z`;
}
/** Path for text along an arc (flipped on the lower half so it reads upright). */
function textArc(r: number, d0: number, d1: number) {
  const mid = ang((d0 + d1) / 2), lower = Math.sin(mid) > 0.15;
  const a0 = ang(lower ? d1 : d0), a1 = ang(lower ? d0 : d1);
  const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  const big = Math.abs(d1 - d0) > YEAR / 2 ? 1 : 0;
  return `M${x0} ${y0}A${r} ${r} 0 ${big} ${lower ? 0 : 1} ${x1} ${y1}`;
}
const span = (a: number, b: number) => (b >= a ? b - a : b + YEAR - a);

export function DururWheel({ showToday = true, compact = false }: { showToday?: boolean; compact?: boolean }) {
  const lang = useContext(ArtLang);
  const ar = lang === 'ar';
  const today = useMemo(() => dururDay(new Date()), []);
  const now = dururAt(today);
  const font = ar ? "'Noto Sans Arabic','Segoe UI',Tahoma,sans-serif" : 'inherit';
  const id = compact ? 'dw-c' : 'dw';
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" role="img" direction="ltr" style={{ fontFamily: font }}
      aria-label={ar ? 'تقويم الدرور' : 'Durur calendar'}>
      <rect width="400" height="400" className="fill-[#FBF7EF] dark:fill-[#0E3550]" />
      {/* Months (outer ring) */}
      <circle cx={C} cy={C} r={194} className="fill-white stroke-[#B79A63] dark:fill-[#0A2B40]" strokeWidth="3" />
      {MONTHS.map((m, i) => {
        const d0 = dayOf(i, 1), d1 = dayOf(i, i === 1 ? 28 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i]) + 1;
        const [x, y] = pt(194, ang(d0)), [xi, yi] = pt(172, ang(d0));
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={xi} y2={yi} stroke="#B79A63" strokeWidth="1" />
            <path id={`${id}-m${i}`} d={textArc(180, d0, d1)} fill="none" />
            <text fontSize="11" fontWeight="700" className="fill-[#6B5530] dark:fill-[#E9D8B4]"><textPath href={`#${id}-m${i}`} startOffset="50%" textAnchor="middle">{m[lang]}</textPath></text>
          </g>
        );
      })}
      {/* Winds / star periods */}
      <circle cx={C} cy={C} r={172} className="fill-[#EEF5F8] dark:fill-[#123E5A]" />
      {WINDS.map((w, i) => {
        const d0 = dayOf(...w.from), d1 = d0 + span(d0, dayOf(...w.to)) + 1;
        return (
          <g key={i}>
            <path d={arc(150, 170, d0, d1)} fill={w.color} opacity="0.9" />
            <path id={`${id}-w${i}`} d={textArc(157, d0, d1)} fill="none" />
            <text fontSize={ar ? 10 : 8} fontWeight="700" fill="#fff"><textPath href={`#${id}-w${i}`} startOffset="50%" textAnchor="middle">{w.name[lang]}</textPath></text>
          </g>
        );
      })}
      {/* Durur (tens of days) */}
      {SEASONS.flatMap((s) => {
        const n = s.id === 'qaith' ? 7 : 10;
        return Array.from({ length: n }, (_, k) => {
          const d0 = s.from + k * 10, d1 = Math.min(s.from + s.len, d0 + 10);
          const masariq = s.id === 'qaith' && k === 6;
          const mid = ang((d0 + d1) / 2), deg = (mid * 180) / Math.PI;
          const flip = Math.cos(mid) < 0;
          const [tx, ty] = pt(127, mid);
          const active = now.season.id === s.id && (masariq ? now.masariq : now.dar === k && !now.masariq);
          return (
            <g key={`${s.id}${k}`}>
              <path d={arc(104, 148, d0, d1)} fill={s.fill} opacity={active && showToday ? 1 : k % 2 ? 0.78 : 0.92} stroke="#fff" strokeWidth="0.8" />
              <text x={tx} y={ty} fontSize={ar ? (masariq ? 6.5 : 7.5) : 8} fontWeight="700" fill="#fff" textAnchor="middle" dominantBaseline="central"
                transform={`rotate(${flip ? deg + 180 : deg} ${tx} ${ty})`}>{darName(masariq ? -1 : k, masariq, lang)}</text>
            </g>
          );
        });
      })}
      {/* Seasons */}
      {SEASONS.map((s) => (
        <g key={s.id}>
          <path d={arc(56, 102, s.from, s.from + s.len)} fill={s.fill} stroke="#fff" strokeWidth="1.5" />
          <path id={`${id}-s${s.id}`} d={textArc(80, s.from, s.from + s.len)} fill="none" />
          <text fontSize="13" fontWeight="800" fill={s.text}><textPath href={`#${id}-s${s.id}`} startOffset="50%" textAnchor="middle">{s.name[lang]}<tspan fontSize="9" fontWeight="600"> ({s.sub[lang]})</tspan></textPath></text>
        </g>
      ))}
      {/* Centre */}
      <circle cx={C} cy={C} r={54} className="fill-white dark:fill-[#0A2B40]" stroke="#B79A63" strokeWidth="2" />
      {/* Suhail marker */}
      <g>
        <path d={`M${C} 2 l5 9 l-10 0z`} fill="#C0392B" />
      </g>
      {showToday && (() => {
        const a = ang(today + 0.5); const [x0, y0] = pt(56, a), [x1, y1] = pt(192, a);
        return (
          <g>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#0B1F2E" strokeWidth="2.2" className="dark:stroke-white" />
            <circle cx={x1} cy={y1} r="4" fill="#FF6B35" stroke="#fff" strokeWidth="1.5" />
            <text x={C} y={C - 16} fontSize="9" fontWeight="600" textAnchor="middle" className="fill-slate-500 dark:fill-slate-300">{ar ? 'اليوم' : 'Today'}</text>
            <text x={C} y={C + 2} fontSize={ar ? 15 : 14} fontWeight="800" textAnchor="middle" className="fill-[#0B1F2E] dark:fill-white">{ar ? darName(now.dar, now.masariq, 'ar') : now.masariq ? 'Al Masariq' : `Day ${(now.dar) * 10 + now.dayInDar}`}</text>
            <text x={C} y={C + 19} fontSize="10" fontWeight="700" textAnchor="middle" fill={now.season.fill}>{now.season.name[lang]}</text>
          </g>
        );
      })()}
      {!showToday && <text x={C} y={C + 5} fontSize="14" fontWeight="800" textAnchor="middle" className="fill-[#6B5530] dark:fill-[#E9D8B4]">{ar ? 'الدرور' : 'Durur'}</text>}
    </svg>
  );
}
