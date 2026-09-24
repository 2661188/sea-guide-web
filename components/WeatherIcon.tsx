import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react';
import type { WeatherKind } from '@/lib/marine/weather';

export function WeatherIcon({ kind, size = 22, className = '' }: { kind?: WeatherKind; size?: number; className?: string }) {
  const I = kind === 'clear' ? Sun : kind === 'partly' ? CloudSun : kind === 'fog' ? CloudFog
    : kind === 'rain' || kind === 'drizzle' ? CloudRain : kind === 'storm' ? CloudLightning : kind === 'snow' ? Snowflake : Cloud;
  return <I size={size} className={className} aria-hidden="true" />;
}
