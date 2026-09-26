import { Fish, Sailboat, Ship } from 'lucide-react';
import type { ActivityId } from '@/lib/marine/activities';

// Lucide has no kayak, jet ski, kite or dive icons, so those are drawn here
// on the same 24px grid and 2px round stroke so they sit with the others.
function Svg({ size, children, className }: { size: number; children: React.ReactNode; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const waves = 'M2 20c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 2-1';

export function ActivityIcon({ id, size = 20, className = '' }: { id: ActivityId; size?: number; className?: string }) {
  switch (id) {
    case 'boating': return <Ship size={size} className={className} aria-hidden="true" />;
    case 'fishing': return <Fish size={size} className={className} aria-hidden="true" />;
    case 'sailing': return <Sailboat size={size} className={className} aria-hidden="true" />;
    case 'kayak':
      return (
        <Svg size={size} className={className}>
          <path d="M2.5 14.5c3.5 2.2 15.5 2.2 19 0-3.5-2.2-15.5-2.2-19 0z" />
          <path d="M6 20.5 18 4.5" />
          <path d="m16.4 3.4 3.2 2.4" />
          <path d="m4.4 19.4 3.2 2.4" />
        </Svg>
      );
    case 'jetski':
      return (
        <Svg size={size} className={className}>
          <path d="M2.5 16.5h13.2a3 3 0 0 0 2.5-1.3L21 11" />
          <path d="M6 13.5h5.5" />
          <path d="M14.5 13.5 17 8h2.5" />
          <path d={waves} />
        </Svg>
      );
    case 'kite':
      return (
        <Svg size={size} className={className}>
          <path d="M3.5 7.5C7 3.5 17 3.5 20.5 7.5" />
          <path d="M3.5 7.5 11 17" />
          <path d="M20.5 7.5 13 17" />
          <path d="M8.5 19.5h7" />
        </Svg>
      );
    case 'diving':
      return (
        <Svg size={size} className={className}>
          <path d="M2.5 9.5a2.5 2.5 0 0 1 2.5-2.5h9a2.5 2.5 0 0 1 2.5 2.5v2a3 3 0 0 1-3 3h-1.5L10 13l-2 1.5H5.5a3 3 0 0 1-3-3z" />
          <path d="M20.5 3.5v11a4 4 0 0 1-4 4H14" />
        </Svg>
      );
    case 'swimming':
      return (
        <Svg size={size} className={className}>
          <circle cx="17.5" cy="6.5" r="2" />
          <path d="m3.5 12.5 5-3.5 4 3 3.5-2" />
          <path d="M2 16c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 2-1" />
          <path d={waves} />
        </Svg>
      );
  }
}
