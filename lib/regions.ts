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
}

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
    spots: [
      { id: 'abudhabi', name: 'Abu Dhabi', ar: 'أبوظبي', area: 'Corniche', areaAr: 'الكورنيش', lat: 24.4794, lon: 54.3673 },
      { id: 'dubai', name: 'Dubai', ar: 'دبي', area: 'Dubai Marina', areaAr: 'دبي مارينا', lat: 25.0867, lon: 55.1264 },
      { id: 'sharjah', name: 'Sharjah', ar: 'الشارقة', area: 'Sharjah coast', areaAr: 'ساحل الشارقة', lat: 25.37, lon: 55.37 },
      { id: 'ajman', name: 'Ajman', ar: 'عجمان', area: 'Ajman coast', areaAr: 'ساحل عجمان', lat: 25.42, lon: 55.43 },
      { id: 'uaq', name: 'Umm Al Quwain', ar: 'أم القيوين', area: 'UAQ coast', areaAr: 'ساحل أم القيوين', lat: 25.58, lon: 55.55 },
      { id: 'rak', name: 'Ras Al Khaimah', ar: 'رأس الخيمة', area: 'Al Rams', areaAr: 'الرمس', lat: 25.8076, lon: 55.9463 },
      { id: 'fujairah', name: 'Fujairah', ar: 'الفجيرة', area: 'Fujairah port', areaAr: 'ميناء الفجيرة', lat: 25.1167, lon: 56.3333 },
      { id: 'khorfakkan', name: 'Khor Fakkan', ar: 'خورفكان', area: 'East coast', areaAr: 'الساحل الشرقي', lat: 25.3533, lon: 56.3267 },
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
