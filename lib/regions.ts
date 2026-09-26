// Region configuration. Add a new country by adding an entry here —
// nothing else in the app hard-codes locations, numbers or authorities.

export interface Spot {
  id: string;
  name: string;
  ar: string;
  area?: string; // shown under the name, e.g. the town the point sits off
  areaAr?: string;
  lat: number;
  lon: number;
  emirate: EmirateId;
}

export type EmirateId = 'abudhabi' | 'dubai' | 'sharjah' | 'ajman' | 'uaq' | 'rak' | 'fujairah';
export const EMIRATES: Record<EmirateId, { en: string; ar: string }> = {
  abudhabi: { en: 'Abu Dhabi', ar: 'أبوظبي' },
  dubai: { en: 'Dubai', ar: 'دبي' },
  sharjah: { en: 'Sharjah', ar: 'الشارقة' },
  ajman: { en: 'Ajman', ar: 'عجمان' },
  uaq: { en: 'Umm Al Quwain', ar: 'أم القيوين' },
  rak: { en: 'Ras Al Khaimah', ar: 'رأس الخيمة' },
  fujairah: { en: 'Fujairah', ar: 'الفجيرة' },
};

export interface EmergencyContact {
  label: string;
  labelAr: string;
  number: string;
  note?: string;
}

export interface Region {
  id: string;
  name: string;
  nameAr: string;
  timezone: string; // IANA name, passed to the data provider
  defaultSpot: string;
  spots: Spot[];
  emergency: EmergencyContact[];
  officialForecast: { name: string; nameAr: string; url: string };
}

export const REGIONS: Record<string, Region> = {
  uae: {
    id: 'uae',
    name: 'United Arab Emirates',
    nameAr: 'الإمارات العربية المتحدة',
    timezone: 'Asia/Dubai',
    defaultSpot: 'dubai',
    // Points are just offshore so the marine model returns sea (not land) cells.
    // Tide points off the main ports and marinas, west to east. They sit just
    // offshore so the marine model returns sea (not land) cells. These are model
    // points, not official harbour tide gauges.
    spots: [
      { id: 'ruwais', emirate: 'abudhabi', name: 'Ruwais', ar: 'الرويس', area: 'Al Dhafra coast', areaAr: 'ساحل الظفرة', lat: 24.17, lon: 52.72 },
      { id: 'dalma', emirate: 'abudhabi', name: 'Dalma Island', ar: 'جزيرة دلما', area: 'Al Dhafra islands', areaAr: 'جزر الظفرة', lat: 24.45, lon: 52.36 },
      { id: 'sirbaniyas', emirate: 'abudhabi', name: 'Sir Bani Yas', ar: 'صير بني ياس', area: 'Island west side', areaAr: 'غرب الجزيرة', lat: 24.33, lon: 52.52 },
      { id: 'mirfa', emirate: 'abudhabi', name: 'Mirfa', ar: 'المرفأ', area: 'Mirfa coast', areaAr: 'ساحل المرفأ', lat: 24.14, lon: 53.43 },
      { id: 'abudhabi', emirate: 'abudhabi', name: 'Abu Dhabi', ar: 'أبوظبي', area: 'Corniche', areaAr: 'الكورنيش', lat: 24.4794, lon: 54.3673 },
      { id: 'jebelali', emirate: 'dubai', name: 'Jebel Ali', ar: 'جبل علي', area: 'Jebel Ali coast', areaAr: 'ساحل جبل علي', lat: 25.05, lon: 55.02 },
      { id: 'dubai', emirate: 'dubai', name: 'Dubai Marina', ar: 'دبي مارينا', area: 'Dubai Marina', areaAr: 'دبي مارينا', lat: 25.0867, lon: 55.1264 },
      { id: 'portrashid', emirate: 'dubai', name: 'Port Rashid', ar: 'ميناء راشد', area: 'Old Dubai', areaAr: 'دبي القديمة', lat: 25.29, lon: 55.26 },
      { id: 'sharjah', emirate: 'sharjah', name: 'Sharjah', ar: 'الشارقة', area: 'Sharjah coast', areaAr: 'ساحل الشارقة', lat: 25.37, lon: 55.37 },
      { id: 'ajman', emirate: 'ajman', name: 'Ajman', ar: 'عجمان', area: 'Ajman coast', areaAr: 'ساحل عجمان', lat: 25.42, lon: 55.43 },
      { id: 'uaq', emirate: 'uaq', name: 'Umm Al Quwain', ar: 'أم القيوين', area: 'UAQ coast', areaAr: 'ساحل أم القيوين', lat: 25.58, lon: 55.55 },
      { id: 'rak', emirate: 'rak', name: 'Al Rams', ar: 'الرمس', area: 'Ras Al Khaimah', areaAr: 'رأس الخيمة', lat: 25.8076, lon: 55.9463 },
      { id: 'minasaqr', emirate: 'rak', name: 'Mina Saqr', ar: 'ميناء صقر', area: 'Ras Al Khaimah north', areaAr: 'شمال رأس الخيمة', lat: 26.0, lon: 56.03 },
      { id: 'dibba', emirate: 'fujairah', name: 'Dibba', ar: 'دبا', area: 'East coast north', areaAr: 'شمال الساحل الشرقي', lat: 25.62, lon: 56.31 },
      { id: 'khorfakkan', emirate: 'sharjah', name: 'Khor Fakkan', ar: 'خورفكان', area: 'East coast', areaAr: 'الساحل الشرقي', lat: 25.3533, lon: 56.3267 },
      { id: 'fujairah', emirate: 'fujairah', name: 'Fujairah', ar: 'الفجيرة', area: 'Fujairah port', areaAr: 'ميناء الفجيرة', lat: 25.1167, lon: 56.3333 },
      { id: 'kalba', emirate: 'sharjah', name: 'Kalba', ar: 'كلباء', area: 'East coast south', areaAr: 'جنوب الساحل الشرقي', lat: 25.03, lon: 56.39 },
    ],
    emergency: [
      { label: 'Coast Guard', labelAr: 'خفر السواحل', number: '996' },
      { label: 'Police', labelAr: 'الشرطة', number: '999' },
      { label: 'Ambulance', labelAr: 'الإسعاف', number: '998' },
      { label: 'Civil Defence', labelAr: 'الدفاع المدني', number: '997' },
    ],
    officialForecast: { name: 'National Center of Meteorology (NCM)', nameAr: 'المركز الوطني للأرصاد', url: 'https://www.ncm.gov.ae' },
  },
};

export const DEFAULT_REGION = 'uae';

export function findSpot(id: string | undefined): { region: Region; spot: Spot } | null {
  for (const region of Object.values(REGIONS)) {
    const spot = region.spots.find((s) => s.id === id);
    if (spot) return { region, spot };
  }
  return null;
}

export function defaultSpot() {
  const region = REGIONS[DEFAULT_REGION];
  return { region, spot: region.spots.find((s) => s.id === region.defaultSpot)! };
}
