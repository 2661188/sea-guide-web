// Bahrna's own drawing of the traditional Arab star compass: 32 directions (every 11.25°)
// named after where stars rise (مطلع) on the east side and set (مغيب) on the west side.
import { useContext } from 'react';
import { ArtLang } from '@/components/LearnArt';

type P = { en: string; ar: string; major?: boolean };
// Rising points clockwise from north (index 1–15); the setting points mirror them.
const STARS: P[] = [
  { en: 'Al Fard', ar: 'الفرد' }, { en: 'Al Na\'sh', ar: 'النعش' }, { en: 'Al Naqa', ar: 'الناقة' }, { en: 'Al Ayyuq', ar: 'العيوق', major: true },
  { en: 'Al Waqi\'', ar: 'الواقع' }, { en: 'Al Simak', ar: 'السماك' }, { en: 'Al Thuraya', ar: 'الثريا' }, { en: '', ar: '', major: true },
  { en: 'Al Jawza', ar: 'الجوزاء' }, { en: 'Al Tir', ar: 'التير' }, { en: 'Al Iklil', ar: 'الإكليل' }, { en: 'Al Aqrab', ar: 'العقرب', major: true },
  { en: 'Al Himarain', ar: 'الحمارين' }, { en: 'Suhail', ar: 'سهيل' }, { en: 'Al Sulbar', ar: 'السلبار' },
];
export function compassPoints(): { deg: number; ar: string; en: string; major: boolean; card?: boolean }[] {
  const out: { deg: number; ar: string; en: string; major: boolean; card?: boolean }[] = [{ deg: 0, ar: 'الياه', en: 'Al Yah (N)', major: true, card: true }];
  STARS.forEach((s, i) => {
    const deg = (i + 1) * 11.25;
    out.push(s.en ? { deg, ar: `مطلع ${s.ar}`, en: `Rising of ${s.en}`, major: !!s.major } : { deg, ar: 'مطلع', en: 'Matla\' (E)', major: true, card: true });
  });
  out.push({ deg: 180, ar: 'قطب', en: 'Qutb (S)', major: true, card: true });
  STARS.forEach((s, i) => {
    const deg = 360 - (i + 1) * 11.25;
    out.push(s.en ? { deg, ar: `مغيب ${s.ar}`, en: `Setting of ${s.en}`, major: !!s.major } : { deg, ar: 'مغيب', en: 'Magheeb (W)', major: true, card: true });
  });
  return out;
}

export function StarCompass({ compact = false }: { compact?: boolean }) {
  const lang = useContext(ArtLang);
  const ar = lang === 'ar';
  const pts = compassPoints();
  const C = 200, R = compact ? 118 : 108;
  const p = (r: number, deg: number) => { const a = ((deg - 90) * Math.PI) / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)] as const; };
  const star = (len: number, w: number, deg: number, light: string, dark: string) => {
    const [tx, ty] = p(len, deg), [lx, ly] = p(w, deg - 45), [rx, ry] = p(w, deg + 45);
    return (
      <g key={`${deg}-${len}`}>
        <path d={`M${C} ${C}L${tx} ${ty}L${lx} ${ly}Z`} fill={light} />
        <path d={`M${C} ${C}L${tx} ${ty}L${rx} ${ry}Z`} fill={dark} />
      </g>
    );
  };
  const font = ar ? "'Noto Sans Arabic','Segoe UI',Tahoma,sans-serif" : 'inherit';
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" role="img" direction="ltr" style={{ fontFamily: font }}
      aria-label={ar ? 'بوصلة النجوم العربية' : 'Arabic star compass'}>
      <rect width="400" height="400" className="fill-[#F4F9FC] dark:fill-[#0E3550]" />
      <circle cx={C} cy={C} r={R + 4} fill="none" stroke="#1E5A87" strokeWidth="3" />
      <circle cx={C} cy={C} r={R - 14} fill="none" stroke="#7FB6D9" strokeWidth="1" />
      {pts.map((q) => {
        const [x0, y0] = p(R + 4, q.deg), [x1, y1] = p(R - (q.card ? 14 : q.major ? 10 : 6), q.deg);
        return <line key={`t${q.deg}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#1E5A87" strokeWidth={q.major ? 2 : 1} />;
      })}
      {/* Rose: 8 long points + 8 short */}
      {[45, 135, 225, 315].map((d) => star(R * 0.62, R * 0.12, d, '#8CC8EA', '#1E5A87'))}
      {[0, 90, 180, 270].map((d) => star(R * 0.98, R * 0.16, d, '#9ED3F0', '#16507A'))}
      <circle cx={C} cy={C} r="5" fill="#fff" stroke="#16507A" strokeWidth="2" />
      {/* Degree labels every 45° */}
      {[45, 135, 225, 315].map((d) => { const [x, y] = p(R - 26, d); return <text key={`d${d}`} x={x} y={y} fontSize="10" fontWeight="700" fill="#1E5A87" textAnchor="middle" dominantBaseline="central">{d}°</text>; })}
      {/* Names: cardinal points level, star points written along the radius (like the traditional drawing) */}
      {pts.map((q) => {
        if (compact && !q.major) return null;
        const label = ar ? q.ar : q.en;
        if (q.card && !compact) {
          // Inside the ring, beside each needle tip, so they never collide with the star names.
          const pos: Record<number, [number, number, 'start' | 'end']> = { 0: [C + 8, C - R + 26, 'start'], 180: [C + 8, C + R - 26, 'start'], 90: [C + R + 9, C, 'start'], 270: [C - R - 9, C, 'end'] };
          const [x, y, anchor] = pos[q.deg];
          return <text key={`n${q.deg}`} x={x} y={y} fontSize={q.deg % 180 ? 11 : 12} fontWeight={800} textAnchor={anchor} dominantBaseline="central" className="fill-[#0B2E4A] dark:fill-white">{label}</text>;
        }
        if (q.card) {
          const [x, y] = p(R + 12, q.deg);
          const anchor = q.deg === 90 ? 'start' : q.deg === 270 ? 'end' : 'middle';
          const dy = q.deg === 0 ? -6 : q.deg === 180 ? 8 : 0;
          return <text key={`n${q.deg}`} x={x} y={y + dy} fontSize={compact ? 15 : 13} fontWeight={800} textAnchor={anchor} dominantBaseline="central" className="fill-[#0B2E4A] dark:fill-white">{label}</text>;
        }
        const right = q.deg < 180;
        const [x, y] = p(R + 9, q.deg);
        const rot = right ? q.deg - 90 : q.deg + 90;
        const name = ar ? q.ar.replace(/^(مطلع|مغيب) /, '') : q.en.replace(/^(Rising|Setting) of /, '');
        return (
          <text key={`n${q.deg}`} x={x} y={y} transform={`rotate(${rot} ${x} ${y})`} fontSize={compact ? 11 : ar ? 11 : 10} fontWeight={q.major ? 800 : 600}
            textAnchor={right ? 'start' : 'end'} dominantBaseline="central" className={q.major ? 'fill-[#0B2E4A] dark:fill-white' : 'fill-[#1E4E70] dark:fill-[#CFE6F5]'}>{name}</text>
        );
      })}
      {!compact && (
        <>
          <text x="392" y="392" fontSize="11" fontWeight="700" textAnchor="end" className="fill-[#1E5A87] dark:fill-[#9ED3F0]">{ar ? 'الشرق: مطالع النجوم' : 'East: where stars rise'}</text>
          <text x="8" y="392" fontSize="11" fontWeight="700" textAnchor="start" className="fill-[#1E5A87] dark:fill-[#9ED3F0]">{ar ? 'الغرب: مغاربها' : 'West: where they set'}</text>
        </>
      )}
    </svg>
  );
}
