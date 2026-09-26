# Bahrna · بحرنا

A marine companion for UAE waters, in English and Arabic: tides, wind, waves, weather, moon and fishing windows for all seven emirates (Dubai by default).

Live: https://bahrna.vercel.app

## What's in the app (v0.5)
- **Home: Today at sea.** Conditions for your chosen water sport (8 sports), wind, waves, sea temperature and visibility, today's tide, fishing score with best windows, week-long tide and wind explorers (drag the dotted line), sports donut, 24-hour strip, gauges (wind, waves, UV), compass, daylight and moon, tide table and 7-day outlook.
- **Navigate.** Live GPS position, speed, course, coordinates. Start a trip to record your track on the phone (IndexedDB, works without mobile data). Return to start follows your recorded track back. SOS sheet with big coordinates, copy/share, call Coast Guard 996, save point. Offline base map from Natural Earth (not a nautical chart).
- **Trips.** Saved trips with track map and stats, saved points, and trip readiness checklists for every sport (add, delete, restore).
- **Fishing.** Score and best windows with factor bars, hour-by-hour, Today / Tomorrow / 7 days.
- **Learn.** 10 knots and 9 boating skills with sketches and step-by-step cards (EN/AR), emergency numbers.
- **Tide stations map.** 17 model tide points on both coasts, one batched provider call (/api/stations).
- **Settings.** Language, light/dark/auto, main activity, home spot, offline data, about, follow @rakoverlander.
- First-launch onboarding, PWA manifest and icons, Arabic RTL throughout.

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
