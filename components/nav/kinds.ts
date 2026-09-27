import { Anchor, ArrowDownToLine, Fish, Fuel, House, MapPin, Sailboat, Star, TriangleAlert, Waves } from 'lucide-react';
import type { WpKind } from '@/lib/nav/db';
import type { Key } from '@/lib/i18n/strings';

export const WP_KINDS: { id: WpKind; color: string; Icon: typeof MapPin; label: Key }[] = [
  { id: 'fish', color: '#0E7C86', Icon: Fish, label: 'wk_fish' },
  { id: 'anchor', color: '#06283D', Icon: Anchor, label: 'wk_anchor' },
  { id: 'fuel', color: '#B45309', Icon: Fuel, label: 'wk_fuel' },
  { id: 'home', color: '#0E9F6E', Icon: House, label: 'wk_home' },
  { id: 'mark', color: '#7C3AED', Icon: MapPin, label: 'wk_mark' },
  { id: 'dive', color: '#0A84FF', Icon: Waves, label: 'wk_dive' },
  { id: 'marina', color: '#2563EB', Icon: Sailboat, label: 'wk_marina' },
  { id: 'ramp', color: '#64748B', Icon: ArrowDownToLine, label: 'wk_ramp' },
  { id: 'hazard', color: '#D64545', Icon: TriangleAlert, label: 'wk_hazard' },
  { id: 'fav', color: '#D99A0B', Icon: Star, label: 'wk_fav' },
];
export const kindOf = (k: WpKind | string) => WP_KINDS.find((x) => x.id === k) ?? WP_KINDS[4];
