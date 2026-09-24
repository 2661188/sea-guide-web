# Bahrna · بحرنا

A marine companion for UAE waters, in English and Arabic: tides, wind, waves, weather, moon and fishing windows for all seven emirates (Dubai by default).

Live: https://bahrna.vercel.app

## What's in the app (v0.3)
- **Home — Today on the water.** A sea-state summary for the next 6 hours (Favourable / Moderate / Challenging / Rough, with reasons), the tide curve with a "now" marker, next high and low tide, wind and gusts, waves and period, weather, air and sea temperature, humidity, visibility, sunrise/sunset and moon phase.
- **Fishing.** Hour-by-hour estimate, best windows (up to 3 h) with the factors behind them, and Today / Tomorrow / 7 days views.
- **Trips.** Pre-departure checklist saved on the phone and usable offline.
- **Learn.** UAE emergency numbers (Coast Guard 996) and the official forecast link.
- **Captain.** Quick answers built only from live app data (a full AI chat is planned).
- **Arabic and English.** Full right-to-left layout; switch with the ع / EN button or in Profile.
- Every figure is labelled **Forecast** (live data), **Estimate** (calculated by Bahrna) or **Guide** (general information).

## Data
- Open-Meteo Marine API: sea level (tide), wave height, direction and period, sea surface temperature.
- Open-Meteo Forecast API: wind, gusts, air temperature, humidity, visibility, weather, rain chance, sunrise and sunset.
- Moon phase: calculated in the app.
- `/api/conditions?spot=…` merges both calls and is cached at Vercel's edge for 15 minutes. The browser keeps the last forecast for offline use.
- Open-Meteo's free tier is for **non-commercial use only**. A paid plan is needed before any commercial launch.
- Tides are modelled sea level, not official harbour tide tables.

## Code map
- `lib/regions.ts`: countries, spots, emergency numbers and official sources. Add a country here.
- `lib/i18n/`: English and Arabic text and the language switch.
- `lib/marine/`: data provider, tides, moon, weather codes, and the sea-state and fishing estimates.
- `pages/`: Home, Fishing, Map, Trips, Learn, Profile, and `api/conditions`.

Local test data: `MARINE_MOCK=1 npm run dev` (use `error` or `gaps` to test failure states).

Not a certified navigation or safety system. Always check official forecasts before going out.
