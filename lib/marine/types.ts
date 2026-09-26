// Normalised marine data used by every screen. Provider-specific shapes stop at
// lib/marine/providers — the UI never sees raw API responses.

export type Num = number | null;

export interface Conditions {
  spotId: string;
  /** When our server fetched from the provider (ISO, UTC). */
  fetchedAt: string;
  /** Seconds to add to UTC to get local wall-clock time at the spot. */
  utcOffsetSeconds: number;
  /** Model grid point actually used (may differ slightly from the spot). */
  grid: { lat: number; lon: number };
  source: { name: string; url: string; models: string };
  hourly: {
    time: string[]; // local "YYYY-MM-DDTHH:mm"
    seaLevel: Num[]; // m relative to mean sea level
    waveHeight: Num[]; // m (significant)
    waveDirection: Num[]; // degrees, direction waves come from
    wavePeriod: Num[]; // s
    seaTemp: Num[]; // °C
    windSpeed: Num[]; // knots
    windDirection: Num[]; // degrees, direction wind comes from
    windGusts: Num[]; // knots
    airTemp: Num[]; // °C
    humidity: Num[]; // %
    visibility: Num[]; // m
    weatherCode: Num[]; // WMO code
    precipProb: Num[]; // %
    uv: Num[]; // UV index
  };
  daily: {
    date: string[]; // local "YYYY-MM-DD"
    sunrise: string[]; // local "YYYY-MM-DDTHH:mm"
    sunset: string[];
  };
}

export interface ConditionsError {
  error: string;
}

/** Tide summary for one station (map). Times are local ms. */
export interface StationTide {
  id: string;
  level: number | null;
  trend: 'Rising' | 'Falling' | 'Slack' | null;
  next: { type: 'high' | 'low'; at: number; height: number }[];
  range: number | null; // today's high minus low, m
  series: Num[]; // next 24 hourly levels
}

export interface StationsResponse {
  fetchedAt: string;
  utcOffsetSeconds: number;
  nowLocal: number;
  stations: StationTide[];
}
