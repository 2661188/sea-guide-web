import { createContext, useContext } from 'react';

export const ArtLang = createContext<'en' | 'ar'>('en');
const AR: Record<string, string> = {"5 turns, back through both loops": "5 لفّات ثم من الحلقتين", "6 wraps inside the loop, pull the tag end": "6 لفّات داخل الحلقة ثم اسحب الطرف", "all straps": "كل الأحزمة", "closed": "مغلقة", "snug fit": "مقاس محكم", "approach slowly at 30–45°": "اقترب ببطء بزاوية 30–45°", "boat on your right": "القارب على يمينك", "has priority": "له الأولوية", "you give way": "أنت تفسح الطريق", "bow into the wind, slow": "مقدمة القارب عكس الريح وببطء", "bow line held on shore": "حبل المقدمة ممسوك على البر", "drain plug in, straps off": "سدادة التصريف مركبة والأحزمة مفكوكة", "engine up before the ramp": "ارفع المحرك قبل المنحدر", "fenders out, lines ready": "الصدّامات للخارج والحبال جاهزة", "figure-eight turns, then a locking hitch": "لفّات على شكل 8 ثم عقدة قفل", "fixed loop": "حلقة ثابتة", "line up slowly, winch the bow": "اصطف ببطء واسحب المقدمة بالونش", "return upwind, engine off": "ارجع من جهة الريح وأطفئ المحرك قربه", "right over left, then left over right": "يمين فوق يسار ثم يسار فوق يمين", "ring or rail": "حلقة أو درابزين", "rope 5×": "الحبل 5×", "scope: rope at least 5 × the depth": "طول الحبل 5 أضعاف العمق على الأقل", "shout, point, throw": "اصرخ، أشر، ارمِ الطوق", "standing part": "الجزء الثابت", "tail": "الطرف", "thick rope (bight)": "حبل سميك (انحناءة)", "thin rope": "حبل رفيع", "to boat": "إلى القارب", "two half hitches": "نصف عقدتين", "wind / current": "الريح / التيار", "doubled line, overhand, loop over hook": "خيط مزدوج، عقدة بسيطة، الحلقة فوق الخطاف", "MAYDAY ×3": "ماي داي ×3", "boat name": "اسم القارب", "position": "الموقع", "problem": "المشكلة", "people on board": "عدد الأشخاص"};
const useL = () => { const l = useContext(ArtLang); return (s: string) => (l === 'ar' ? AR[s] ?? s : s); };

// Hand-drawn style SVG sketches for knots and boating skills. Ropes are drawn
// back-to-front with a halo, so a strand passing over another shows a gap.

const ROPE = '#C99A55', ROPE_DARK = '#7A5A2E', ROPE_LIGHT = '#F0D9A8';

function Rope({ d, color = ROPE, dark = ROPE_DARK }: { d: string; color?: string; dark?: string }) {
  return (
    <g fill="none" strokeLinejoin="round">
      <path d={d} className="stroke-[#F4F8FA] dark:stroke-[#0E3550]" strokeWidth="14" strokeLinecap="butt" />
      <path d={d} stroke={dark} strokeWidth="9.5" strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth="6.5" strokeLinecap="round" />
      <path d={d} stroke={ROPE_LIGHT} strokeWidth="1.3" strokeDasharray="2.5 5" strokeLinecap="round" opacity="0.9" />
    </g>
  );
}
const Line2 = (p: { d: string }) => <Rope {...p} color="#4B8FD6" dark="#1E4E86" />;

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" role="img" aria-label={label} direction="ltr">
      <rect width="240" height="150" rx="14" className="fill-[#F4F8FA] dark:fill-[#0E3550]" />
      {children}
    </svg>
  );
}
const Arrow = ({ d, color = '#FF6B35' }: { d: string; color?: string }) => (
  <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} strokeDasharray="5 4" />
  </g>
);
const Head = ({ x, y, r, color = '#FF6B35' }: { x: number; y: number; r: number; color?: string }) => (
  <path d="M0 0 L-8 -4.5 L-8 4.5 Z" fill={color} transform={`translate(${x},${y}) rotate(${r})`} />
);
const Water = ({ y = 70 }: { y?: number }) => (
  <g>
    <rect x="0" y={y} width="240" height={150 - y} rx="0" className="fill-sky-200/70 dark:fill-sky-900/60" />
    <path d={`M0 ${y} q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`} className="stroke-sky-400" strokeWidth="2" fill="none" />
  </g>
);
function Txt({ x, y, children, anchor = 'middle', size = 10, color }: { x: number; y: number; children: React.ReactNode; anchor?: 'start' | 'middle' | 'end'; size?: number; color?: string }) {
  const L = useL();
  return <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={700} className={color ? '' : 'fill-slate-500 dark:fill-slate-300'} fill={color}>{typeof children === 'string' ? L(children) : children}</text>;
}
const Post = ({ x, y1 = 20, y2 = 135, w = 26 }: { x: number; y1?: number; y2?: number; w?: number }) => (
  <g>
    <rect x={x - w / 2} y={y1} width={w} height={y2 - y1} rx="4" fill="#8B6B4A" />
    <path d={`M${x - w / 2 + 5} ${y1 + 10} v${y2 - y1 - 20} M${x + 3} ${y1 + 16} v${y2 - y1 - 34}`} stroke="#6B4F35" strokeWidth="1.2" />
  </g>
);

// ---------------- KNOTS ----------------

export function FigureEight() {
  return (
    <Frame label="Figure-eight knot">
      <Rope d="M14 100 C60 100 80 100 104 96" />
      <Rope d="M104 96 C140 88 150 40 118 38 C92 36 88 66 108 80" />
      <Rope d="M108 80 C130 96 150 116 176 112 C198 108 200 84 180 78 C160 72 140 86 128 98" />
      <Rope d="M128 98 C120 106 118 110 116 100 C114 92 124 72 150 64 C170 58 200 60 226 56" />
      <Txt x={24} y={124} anchor="start">standing part</Txt>
      <Txt x={220} y={46} anchor="end">tail</Txt>
    </Frame>
  );
}

export function Bowline() {
  return (
    <Frame label="Bowline">
      <Rope d="M120 8 C120 30 120 40 118 52" />
      <Rope d="M118 52 C116 60 98 62 96 54 C94 44 112 38 128 44" />
      <Rope d="M140 72 C160 92 160 138 120 140 C80 142 78 96 104 72" />
      <Rope d="M128 44 C136 48 140 58 140 72" />
      <Rope d="M104 72 C112 62 112 52 132 36 C140 28 132 20 124 24 C118 28 110 40 108 58 C107 68 106 76 106 88" />
      <Txt x={132} y={14} anchor="start">standing part</Txt>
      <Txt x={120} y={120}>fixed loop</Txt>
      <Txt x={84} y={96} anchor="end">tail</Txt>
    </Frame>
  );
}

export function CleatHitch() {
  return (
    <Frame label="Cleat hitch">
      <rect x="0" y="118" width="240" height="32" fill="#A08060" opacity="0.35" />
      <path d="M100 86 h40 l6 26 h-52 z" fill="#8A96A3" />
      <path d="M34 74 Q40 62 70 64 Q120 60 170 64 Q200 62 206 74 Q200 86 170 84 Q120 88 70 84 Q40 86 34 74 Z" fill="#B7C2CC" stroke="#6E7B88" strokeWidth="2" />
      <Rope d="M4 146 C24 128 40 108 62 92" />
      <Rope d="M62 92 C100 100 150 100 186 92 C204 86 206 64 190 58" />
      <Rope d="M190 58 C160 56 100 90 56 90 C38 90 36 62 56 58" />
      <Rope d="M56 58 C96 54 146 86 188 90 C202 90 208 74 196 66 C186 60 174 64 168 72" />
      <Txt x={120} y={20}>figure-eight turns, then a locking hitch</Txt>
    </Frame>
  );
}

export function CloveHitch() {
  return (
    <Frame label="Clove hitch">
      <Post x={120} />
      <Rope d="M14 40 C60 40 90 50 108 60" />
      <Rope d="M132 68 C150 74 150 92 132 96" />
      <Rope d="M108 60 C116 64 126 66 132 68" />
      <Rope d="M132 96 C120 100 100 94 104 82 C108 72 124 78 132 84 C140 90 146 104 132 108" />
      <Rope d="M132 108 C124 112 112 110 108 104 C100 94 150 112 226 118" />
      <Txt x={20} y={30} anchor="start">to boat</Txt>
      <Txt x={220} y={136} anchor="end">tail</Txt>
    </Frame>
  );
}

export function RoundTurn() {
  return (
    <Frame label="Round turn and two half hitches">
      <circle cx="56" cy="75" r="22" fill="none" stroke="#6E7B88" strokeWidth="7" />
      <path d="M20 75 h14" stroke="#6E7B88" strokeWidth="8" strokeLinecap="round" />
      <Rope d="M226 70 C180 70 110 70 74 64" />
      <Rope d="M74 64 C60 50 44 54 42 70 C40 86 56 94 72 88" />
      <Rope d="M72 88 C60 96 46 90 48 76 C50 62 66 58 80 70" />
      <Rope d="M80 70 C100 84 120 84 128 74 C134 64 122 58 116 68 C112 76 124 90 144 88 C158 86 156 70 146 70 C138 72 140 88 160 96 C178 102 200 100 214 104" />
      <Txt x={200} y={60} anchor="end">standing part</Txt>
      <Txt x={56} y={120}>ring or rail</Txt>
      <Txt x={140} y={122}>two half hitches</Txt>
    </Frame>
  );
}

export function SheetBend() {
  return (
    <Frame label="Sheet bend">
      <Line2 d="M226 64 C180 64 150 64 126 60 C100 56 96 88 126 90 C150 92 180 90 226 94" />
      <Rope d="M14 76 C50 76 80 76 110 76" />
      <Rope d="M110 76 C130 76 140 50 118 46 C100 44 96 68 100 76" />
      <Rope d="M100 76 C104 90 118 104 138 106 C150 108 150 96 140 90 C132 86 110 84 98 90" />
      <Txt x={20} y={66} anchor="start">thin rope</Txt>
      <Txt x={220} y={112} anchor="end">thick rope (bight)</Txt>
    </Frame>
  );
}

export function ReefKnot() {
  return (
    <Frame label="Reef knot">
      <Rope d="M14 64 C60 64 90 64 110 70 C126 76 128 92 112 94 C96 96 94 80 110 74" />
      <Line2 d="M226 88 C180 88 150 88 130 82 C114 76 112 60 128 58 C144 56 146 72 130 78" />
      <Rope d="M110 74 C124 68 140 66 150 70 C162 76 160 100 226 104" />
      <Line2 d="M130 78 C116 84 100 86 90 82 C78 76 80 52 14 48" />
      <Txt x={120} y={130}>right over left, then left over right</Txt>
    </Frame>
  );
}

export function ClinchKnot() {
  return (
    <Frame label="Improved clinch knot">
      <path d="M200 30 v60 a22 22 0 0 1 -44 0" fill="none" stroke="#6E7B88" strokeWidth="5" strokeLinecap="round" />
      <path d="M156 90 l-6 -8" stroke="#6E7B88" strokeWidth="5" strokeLinecap="round" />
      <circle cx="200" cy="24" r="7" fill="none" stroke="#6E7B88" strokeWidth="4" />
      <g fill="none" strokeLinecap="round">
        <path d="M14 70 C80 66 150 40 194 26" className="stroke-sky-600" strokeWidth="3" />
        <path d="M194 26 C170 50 120 72 90 72" className="stroke-sky-600" strokeWidth="3" />
        {[0, 1, 2, 3, 4].map((k) => <ellipse key={k} cx={104 + k * 14} cy={60 - k * 5} rx="6" ry="12" className="stroke-sky-500" strokeWidth="3" transform={`rotate(-20 ${104 + k * 14} ${60 - k * 5})`} />)}
        <path d="M90 72 C80 72 80 82 96 84 C110 86 100 60 100 50" className="stroke-sky-700" strokeWidth="3" />
      </g>
      <Txt x={120} y={124}>5 turns, back through both loops</Txt>
    </Frame>
  );
}

export function PalomarKnot() {
  return (
    <Frame label="Palomar knot">
      <path d="M150 20 v64 a20 20 0 0 1 -40 0" fill="none" stroke="#6E7B88" strokeWidth="5" strokeLinecap="round" />
      <circle cx="150" cy="14" r="6" fill="none" stroke="#6E7B88" strokeWidth="4" />
      <g fill="none" strokeLinecap="round">
        <path d="M20 60 C80 60 120 30 146 16" className="stroke-sky-600" strokeWidth="3" />
        <path d="M20 68 C80 68 124 34 154 16" className="stroke-sky-600" strokeWidth="3" />
        <path d="M150 12 C170 30 190 70 176 100 C164 124 120 120 120 100 C120 84 140 76 150 30" className="stroke-sky-500" strokeWidth="3" />
        <ellipse cx="96" cy="50" rx="12" ry="18" className="stroke-sky-700" strokeWidth="3" transform="rotate(-25 96 50)" />
      </g>
      <Txt x={120} y={140}>doubled line, overhand, loop over hook</Txt>
    </Frame>
  );
}

export function UniKnot() {
  return (
    <Frame label="Uni knot">
      <circle cx="210" cy="75" r="8" fill="none" stroke="#6E7B88" strokeWidth="4" />
      <g fill="none" strokeLinecap="round">
        <path d="M14 70 C80 70 150 70 202 72" className="stroke-sky-600" strokeWidth="3" />
        <path d="M202 78 C150 80 120 80 70 80 C40 80 40 110 70 112 C90 114 100 100 100 90" className="stroke-sky-600" strokeWidth="3" />
        {[0, 1, 2, 3, 4, 5].map((k) => <ellipse key={k} cx={110 + k * 13} cy={80} rx="5.5" ry="14" className="stroke-sky-500" strokeWidth="3" />)}
      </g>
      <Txt x={120} y={132}>6 wraps inside the loop, pull the tag end</Txt>
    </Frame>
  );
}

// ---------------- SKILLS ----------------

function Boat({ x, y, s = 1, flip = false, color = '#FFFFFF' }: { x: number; y: number; s?: number; flip?: boolean; color?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <path d="M-40 -6 L38 -6 L30 10 L-34 10 Z" fill={color} stroke="#06283D" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M-14 -6 L-10 -20 L14 -20 L18 -6" fill="#CFE3EC" stroke="#06283D" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M-34 3 H32" stroke="#0E7C86" strokeWidth="3" />
    </g>
  );
}
function BoatTop({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 -34 C14 -20 16 0 14 26 L-14 26 C-16 0 -14 -20 0 -34 Z" fill="#fff" stroke="#06283D" strokeWidth="2.5" />
      <rect x="-8" y="-4" width="16" height="14" rx="3" fill="#CFE3EC" stroke="#06283D" strokeWidth="2" />
      <circle cx="-13" cy="-6" r="2.6" fill="#D64545" /><circle cx="13" cy="-6" r="2.6" fill="#0E9F6E" />
    </g>
  );
}

export function Anchoring() {
  return (
    <Frame label="Anchoring">
      <Water y={46} />
      <rect x="0" y="126" width="240" height="24" fill="#D9C39A" />
      <Boat x={60} y={44} s={0.9} />
      <path d="M92 50 C130 80 170 110 196 124" fill="none" stroke="#6E7B88" strokeWidth="2.5" strokeDasharray="1 0" />
      <path d="M196 124 h22" stroke="#6E7B88" strokeWidth="3" />
      <g transform="translate(212,122)" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round">
        <path d="M0 -12 v14 M-8 -2 q8 10 16 0" /><circle cy="-15" r="3" />
      </g>
      <path d="M30 128 v-6 M30 70 v-6" stroke="#FF6B35" strokeWidth="2" />
      <path d="M30 70 V122" stroke="#FF6B35" strokeWidth="2" strokeDasharray="3 3" />
      <Txt x={26} y={100} anchor="end" color="#FF6B35">1</Txt>
      <Txt x={150} y={84} color="#FF6B35">rope 5×</Txt>
      <Txt x={120} y={144}>scope: rope at least 5 × the depth</Txt>
    </Frame>
  );
}

export function Docking() {
  return (
    <Frame label="Docking">
      <rect x="0" y="0" width="240" height="150" className="fill-sky-200/70 dark:fill-sky-900/60" />
      <rect x="0" y="108" width="240" height="42" fill="#B48A5A" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <path key={k} d={`M${k * 32} 108 v42`} stroke="#8B6B4A" strokeWidth="1.5" />)}
      <BoatTop x={90} y={52} r={-60} s={0.95} />
      <Arrow d="M110 44 C140 60 160 78 170 92" />
      <Head x={170} y={92} r={55} />
      <g opacity="0.45"><BoatTop x={186} y={94} r={-90} s={0.95} /></g>
      {[160, 184, 208].map((x) => <rect key={x} x={x - 4} y={98} width="8" height="10" rx="3" fill="#FF6B35" />)}
      <Txt x={10} y={20} anchor="start">approach slowly at 30–45°</Txt>
      <Txt x={232} y={132} anchor="end" color="#fff">fenders out, lines ready</Txt>
    </Frame>
  );
}

export function Mooring() {
  return (
    <Frame label="Picking up a mooring">
      <rect x="0" y="0" width="240" height="150" className="fill-sky-200/70 dark:fill-sky-900/60" />
      {[30, 60, 90, 120].map((y) => <path key={y} d={`M10 ${y} h26`} stroke="#0E7C86" strokeWidth="2" />)}
      {[30, 60, 90, 120].map((y) => <Head key={y} x={40} y={y} r={0} color="#0E7C86" />)}
      <Txt x={8} y={144} anchor="start" color="#0E7C86">wind / current</Txt>
      <circle cx="96" cy="75" r="9" fill="#FF6B35" stroke="#fff" strokeWidth="2.5" />
      <BoatTop x={170} y={75} r={-90} s={1.05} />
      <path d="M134 72 L110 76" stroke="#6E7B88" strokeWidth="3" strokeLinecap="round" />
      <Arrow d="M210 110 C190 106 160 100 140 92" />
      <Txt x={170} y={30}>bow into the wind, slow</Txt>
    </Frame>
  );
}

export function RulesOfRoad() {
  return (
    <Frame label="Crossing rule">
      <rect x="0" y="0" width="240" height="150" className="fill-sky-200/70 dark:fill-sky-900/60" />
      <BoatTop x={80} y={100} r={0} s={0.9} />
      <BoatTop x={170} y={50} r={-90} s={0.9} />
      <Arrow d="M80 64 V20" color="#0E7C86" /><Head x={80} y={20} r={-90} color="#0E7C86" />
      <Arrow d="M136 50 H104" color="#FF6B35" /><Head x={104} y={50} r={180} />
      <Arrow d="M80 64 C78 50 60 40 44 36" color="#0E9F6E" /><Head x={44} y={36} r={-160} color="#0E9F6E" />
      <Txt x={80} y={142}>you give way</Txt>
      <Txt x={176} y={86}>boat on your right</Txt>
      <Txt x={176} y={98}>has priority</Txt>
    </Frame>
  );
}

export function Launching() {
  return (
    <Frame label="Launching from a trailer">
      <path d="M0 50 L240 132 L240 150 L0 150 Z" fill="#B9B2A5" />
      <path d="M120 150 L120 92 Q180 96 240 92 V150 Z" className="fill-sky-300/80 dark:fill-sky-800/80" />
      <g transform="translate(118,86) rotate(19)">
        <rect x="-70" y="10" width="110" height="6" fill="#475569" />
        <circle cx="-40" cy="22" r="8" fill="#1F2937" /><circle cx="-18" cy="22" r="8" fill="#1F2937" />
        <Boat x={-10} y={-4} s={0.9} />
      </g>
      <g transform="translate(36,58) rotate(19)">
        <rect x="-30" y="-24" width="54" height="26" rx="6" fill="#0E7C86" />
        <circle cx="-16" cy="4" r="8" fill="#1F2937" /><circle cx="14" cy="4" r="8" fill="#1F2937" />
      </g>
      <Txt x={170} y={30}>drain plug in, straps off</Txt>
      <Txt x={170} y={42}>bow line held on shore</Txt>
    </Frame>
  );
}

export function Recovery() {
  return (
    <Frame label="Recovering onto a trailer">
      <path d="M0 50 L240 132 L240 150 L0 150 Z" fill="#B9B2A5" />
      <path d="M120 150 L120 92 Q180 96 240 92 V150 Z" className="fill-sky-300/80 dark:fill-sky-800/80" />
      <g transform="translate(118,86) rotate(19)">
        <rect x="-70" y="10" width="110" height="6" fill="#475569" />
        <circle cx="-40" cy="22" r="8" fill="#1F2937" /><circle cx="-18" cy="22" r="8" fill="#1F2937" />
        <rect x="-74" y="-14" width="8" height="26" fill="#475569" />
      </g>
      <Boat x={196} y={96} s={0.9} flip />
      <path d="M52 64 C100 80 140 88 158 92" stroke="#6E7B88" strokeWidth="2.5" strokeDasharray="6 4" fill="none" />
      <Arrow d="M214 118 H176" /><Head x={176} y={118} r={180} />
      <Txt x={10} y={22} anchor="start">line up slowly, winch the bow</Txt>
      <Txt x={10} y={34} anchor="start">engine up before the ramp</Txt>
    </Frame>
  );
}

export function ManOverboard() {
  return (
    <Frame label="Person overboard">
      <rect x="0" y="0" width="240" height="150" className="fill-sky-200/70 dark:fill-sky-900/60" />
      <Arrow d="M140 120 C200 110 210 40 160 30 C110 22 90 60 110 80" color="#0E7C86" />
      <Head x={110} y={80} r={60} color="#0E7C86" />
      <BoatTop x={140} y={120} r={-80} s={0.7} />
      <circle cx="96" cy="94" r="7" fill="#F2C29A" stroke="#06283D" strokeWidth="2" />
      <path d="M90 102 q6 6 12 0" stroke="#06283D" strokeWidth="2" fill="none" />
      <circle cx="72" cy="98" r="10" fill="none" stroke="#FF6B35" strokeWidth="6" />
      <circle cx="72" cy="98" r="10" fill="none" stroke="#fff" strokeWidth="6" strokeDasharray="4 7.7" />
      <Txt x={10} y={24} anchor="start">shout, point, throw</Txt>
      <Txt x={10} y={36} anchor="start">return upwind, engine off</Txt>
    </Frame>
  );
}

export function Mayday() {
  const L = useL();
  return (
    <Frame label="Distress call on VHF">
      <rect x="28" y="26" width="72" height="104" rx="10" fill="#1F2937" />
      <rect x="38" y="38" width="52" height="28" rx="3" fill="#86EFAC" />
      <text x="64" y="58" textAnchor="middle" fontSize="16" fontWeight="800" fill="#064E3B" direction="ltr">16</text>
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={46 + c * 18} cy={82 + r * 14} r="4" fill="#475569" />))}
      <rect x="84" y="6" width="6" height="22" rx="2" fill="#1F2937" />
      <path d="M104 50 q8 10 0 20 M112 44 q14 16 0 32" stroke="#FF6B35" strokeWidth="3" fill="none" strokeLinecap="round" />
      {['MAYDAY ×3', 'boat name', 'position', 'problem', 'people on board'].map((l, k) => (
        <g key={l}><circle cx="136" cy={38 + k * 20} r="3" fill={k === 0 ? '#D64545' : '#0E7C86'} /><text x="144" y={42 + k * 20} fontSize="11" fontWeight={k === 0 ? 800 : 600} className={k === 0 ? 'fill-bad' : 'fill-slate-600 dark:fill-slate-200'}>{L(l)}</text></g>
      ))}
    </Frame>
  );
}

export function LifeJacket() {
  return (
    <Frame label="Life jacket">
      <path d="M86 24 Q120 44 154 24 L178 44 Q170 80 176 128 H64 Q70 80 62 44 Z" fill="#FF6B35" stroke="#9A3412" strokeWidth="2.5" />
      <path d="M106 30 Q120 60 134 30" fill="#F4F8FA" className="dark:fill-[#0E3550]" />
      <path d="M120 58 V128" stroke="#9A3412" strokeWidth="2" />
      {[76, 100].map((y) => <g key={y}><rect x="68" y={y} width="104" height="8" rx="3" fill="#1F2937" /><rect x="114" y={y - 2} width="12" height="12" rx="2" fill="#94A3B8" /></g>)}
      <rect x="70" y="40" width="10" height="14" rx="2" fill="#E5E7EB" />
      <Txt x={200} y={68} anchor="middle">snug fit</Txt>
      <Txt x={200} y={82} anchor="middle">all straps</Txt>
      <Txt x={200} y={96} anchor="middle">closed</Txt>
    </Frame>
  );
}
