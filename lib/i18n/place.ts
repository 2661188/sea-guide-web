import type { Lang } from './strings';
import type { EmergencyContact, Region, Spot } from '../regions';

// Region data carries both languages; these pick the right one.
export const spotName = (s: Spot, lang: Lang) => (lang === 'ar' ? s.ar : s.name);
export const spotArea = (s: Spot, lang: Lang) => (lang === 'ar' ? s.areaAr ?? s.area : s.area);
export const regionName = (r: Region, lang: Lang) => (lang === 'ar' ? r.nameAr : r.name);
export const contactLabel = (e: EmergencyContact, lang: Lang) => (lang === 'ar' ? e.labelAr : e.label);
export const forecastName = (r: Region, lang: Lang) => (lang === 'ar' ? r.officialForecast.nameAr : r.officialForecast.name);
