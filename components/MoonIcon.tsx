// Draws the lit part of the moon for a phase fraction (0 new → 0.5 full → 1 new).
export function MoonIcon({ fraction, size = 40 }: { fraction: number; size?: number }) {
  const r = 20;
  const c = Math.cos(2 * Math.PI * fraction);
  const rx = Math.abs(c) * r;
  const waxing = fraction < 0.5;
  const gibbous = c < 0;
  // Outer edge on the lit side, then the terminator (an ellipse) back to the top.
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1;
  const d = `M0,${-r} A${r},${r} 0 0 ${outerSweep} 0,${r} A${rx},${r} 0 0 ${innerSweep} 0,${-r} Z`;
  return (
    <svg width={size} height={size} viewBox="-22 -22 44 44" aria-hidden="true">
      <circle r={r} className="fill-slate-600 dark:fill-slate-700" />
      <path d={d} className="fill-amber-50 dark:fill-amber-100" stroke="#e2c98f" strokeWidth=".6" />
      <circle r={r} fill="none" className="stroke-slate-400/60" strokeWidth="1" />
    </svg>
  );
}
