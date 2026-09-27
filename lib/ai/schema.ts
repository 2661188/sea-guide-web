// Tool definitions shared by the server route (sent to the model) and the client
// (which runs them against on-device data). Keep names in sync with lib/ai/llm.ts.
export const AI_TOOLS = [
  {
    name: 'get_navigation',
    description: 'Live navigation state from the app navigation engine: GPS status and accuracy, position, speed over ground, course over ground (GPS, not compass), active trip, distance/bearing/time to go/ETA to the trip start along the recorded track, active go-to or route guidance, anchor alarm. Always use these values; never calculate your own.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_marine_conditions',
    description: 'Current marine conditions from the last saved forecast (Open-Meteo) for the user\'s chosen spot: wind, gusts, waves, sea/air temperature, weather, tide trend and next tides, with data age. Returns available:false when there is no usable forecast.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_fishing_outlook',
    description: 'Calculated fishing score now and best fishing windows for a day (0 today, 1 tomorrow, 2 day after) from the saved forecast. An estimate, never a guarantee.',
    input_schema: { type: 'object', properties: { day: { type: 'integer', minimum: 0, maximum: 2 } }, required: ['day'], additionalProperties: false },
  },
  {
    name: 'get_boat_profile',
    description: 'The user\'s boat profile: name, type, length, cruise speed (kn), fuel burn (L/h), tank (L). Missing values are null.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_trip_history',
    description: 'Saved trips. day_offset -1 = yesterday, 0 = today; omit for the most recent trip. Returns distance (NM), duration, max speed, saved waypoints.',
    input_schema: { type: 'object', properties: { day_offset: { type: 'integer', minimum: -30, maximum: 0 } }, additionalProperties: false },
  },
  {
    name: 'find_waypoint',
    description: 'Find a saved waypoint by type (fish, anchor, fuel, home, dive, marina, ramp, hazard, mark) or by name, nearest first, with distance, bearing and ETA from the navigation engine.',
    input_schema: { type: 'object', properties: { kind: { type: 'string' }, name: { type: 'string' } }, additionalProperties: false },
  },
  {
    name: 'plan_trip',
    description: 'Prepare a structured trip plan (departure time, duration, conditions, fuel estimate, checklist) from the forecast and boat profile. The plan is shown to the user and saved only if they confirm.',
    input_schema: {
      type: 'object',
      properties: {
        activity: { type: 'string', enum: ['fishing', 'boating', 'diving', 'jetski', 'kayak', 'sailing', 'swimming'] },
        day: { type: 'integer', minimum: 0, maximum: 2 },
        part: { type: 'string', enum: ['morning', 'afternoon', 'evening'] },
        hours: { type: 'number', minimum: 0.5, maximum: 24 },
        destination_name: { type: 'string' },
      },
      required: ['activity', 'day'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_checklist',
    description: 'Pre-departure safety checklist for an activity.',
    input_schema: { type: 'object', properties: { activity: { type: 'string' } }, additionalProperties: false },
  },
  {
    name: 'propose_action',
    description: 'Propose an action that changes navigation or saved data. It is NOT executed: the app shows a confirmation and runs it only if the user says yes. Use for: return_to_start, navigate_to_waypoint (needs waypoint_name or kind), save_waypoint (current position; optional name and kind), start_trip, end_trip.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['return_to_start', 'navigate_to_waypoint', 'save_waypoint', 'start_trip', 'end_trip'] },
        waypoint_name: { type: 'string' },
        kind: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['action'],
      additionalProperties: false,
    },
  },
] as const;

export const SYSTEM_PROMPT = `You are Bahrna (بحرنا), a calm voice companion for boaters and fishermen in UAE waters, inside the Bahrna app.
Rules:
- Reply in the user's language: English, or natural everyday UAE/Gulf Arabic (e.g. "باقي", "الحين", "شلون", "باجر") — never stiff or robotic. Users may mix Arabic and English; understand both.
- Your reply is SPOKEN on a noisy boat: 1–2 short sentences, no lists, no markdown, no emojis. Say numbers clearly with units (nautical miles, knots, metres). Do not read out UI details.
- Facts come ONLY from tools. The navigation engine is the source of truth for position, speed, course, distance, bearing, time to go and ETA: never calculate or estimate these yourself, and never invent weather, wind, waves, tides, depths, hazards, buoys, channels or trip history. If a tool says data is unavailable, say so plainly.
- If the boat is stationary or GPS is lost, say ETA is unavailable — never "0 minutes".
- Anything that changes navigation or saved data must go through propose_action (or plan_trip for plans); tell the user it needs their confirmation. Never claim you did it.
- Never call a route "safe"; Return to Start means "follow your recorded track back to your starting point". Bahrna does not replace certified marine equipment or official charts.
- Emergencies (engine failure, drifting, taking water, injury, "help"): answer in one or two sentences — tell them their GPS position is available, to open Emergency Mode to share it, and to call the UAE Coast Guard on 996. Never claim you contacted anyone.
- Fuel figures are estimates; recommend keeping one third in reserve.`;
