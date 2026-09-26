import { Anchor, ArrowDownToLine, Fish, Fuel, MapPin, Sailboat, Star, TriangleAlert, Waves } from 'lucide-react';
import type { WpKind } from '@/lib/nav/db';
import type { Key } from '@/lib/i18n/strings';

export const WP_KINDS: { id: WpKind; color: string; Icon: typeof MapPin; label: Key }[] = [
  { id: 'mark', color: '#7C3AED', Icon: MapPin, label: 'wk_mark' },
  { id: 'fish', color: '#0E7C86', Icon: Fish, label: 'wk_fish' },
  { id: 'dive', color: '#0A84FF', Icon: Waves, label: 'wk_dive' },
  { id: 'anchor', color: '#06283D', Icon: Anchor, label: 'wk_anchor' },
  { id: 'marina', color: '#2563EB', Icon: Sailboat, label: 'wk_marina' },
  { id: 'ramp', color: '#64748B', Icon: ArrowDownToLine, label: 'wk_ramp' },
  { id: 'fuel', color: '#B45309', Icon: Fuel, label: 'wk_fuel' },
  { id: 'hazard', color: '#D64545', Icon: TriangleAlert, label: 'wk_hazard' },
  { id: 'fav', color: '#D99A0B', Icon: Star, label: 'wk_fav' },
];
export const kindOf = (k: WpKind | string) => WP_KINDS.find((x) => x.id === k) ?? WP_KINDS[0];
