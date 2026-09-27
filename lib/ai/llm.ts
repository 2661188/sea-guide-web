// Language-model fallback for questions the on-device engine does not understand.
// The model runs on our server (/api/captain, key never in the app); its tools run
// HERE on the phone against local data, so trips and positions never leave the
// device except the small facts a tool returns for the current question.
import type { AiLang } from './speakable';
import { buildContext, contextForModel } from './context';
import { Action, createTripPlan, findWaypoint, getFishingConditions, getTripHistory, toPoint, waypointsDuring } from './tools';
import { buildChecklist } from './planner';
import type { Card, Reply } from './answer';
import type { WpKind } from '@/lib/nav/db';

type Block = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } | { type: 'tool_result'; tool_use_id: string; content: string };
export interface Msg { role: 'user' | 'assistant'; content: string | Block[] }

export class AiUnavailable extends Error { constructor(public code: 'offline' | 'not_configured' | 'error') { super(code); } }

async function runTool(name: string, input: Record<string, unknown>, out: { card?: Card; pending?: Reply['pending'] }, lang: AiLang): Promise<unknown> {
  const ctx = buildContext();
  const m = contextForModel(ctx);
  switch (name) {
    case 'get_navigation': return m.nav;
    case 'get_marine_conditions': return m.marine;
    case 'get_boat_profile': return m.boat;
    case 'get_fishing_outlook': {
      const f = getFishingConditions(Number(input.day ?? 0));
      if (!f) return { available: false };
      const c = (ms: number) => new Date(ms).toISOString().slice(11, 16);
      return { available: true, nowScore: f.nowScore, windows: f.windows.map((w) => ({ from: c(w.start), to: c(w.end), score: w.score })), note: 'calculated estimate' };
    }
    case 'get_trip_history': {
      const l = await getTripHistory(input.day_offset == null ? null : Number(input.day_offset));
      return Promise.all(l.slice(0, 3).map(async (t) => ({ name: t.name, date: new Date(t.startedAt).toDateString(), distanceNm: Number(t.distanceNm.toFixed(1)), durationMin: Math.round(((t.endedAt ?? Date.now()) - t.startedAt) / 60000), maxKn: Math.round(t.maxKn), waypoints: await waypointsDuring(t) })));
    }
    case 'find_waypoint': {
      const w = await findWaypoint({ kind: input.kind as string | undefined, name: input.name as string | undefined });
      if (!w) return { found: false };
      const r = toPoint(w);
      return { found: true, name: w.name, kind: w.kind, distanceNm: r ? Number(r.distNm.toFixed(2)) : null, bearingDeg: r ? Math.round(r.bearing) : null, eta: r ? (r.eta.status === 'ok' ? { timeToGoMin: Math.round(r.eta.hours! * 60) } : { status: r.eta.status }) : null };
    }
    case 'get_checklist': return buildChecklist(String(input.activity ?? 'boating')).map((i) => (lang === 'ar' ? i.ar : i.en));
    case 'plan_trip': {
      const plan = await createTripPlan({ activity: String(input.activity ?? 'fishing'), day: Number(input.day ?? 1), part: (input.part as 'morning') ?? null, hours: input.hours == null ? null : Number(input.hours), destinationName: input.destination_name as string | undefined });
      out.card = { type: 'plan', plan };
      out.pending = { action: { type: 'savePlan', plan } };
      return { status: 'shown_to_user_awaiting_confirmation', departure: plan.departure, date: plan.date, durationH: plan.durationH, conditions: plan.conditions, fuelL: plan.fuelL, destination: plan.destination?.name ?? null };
    }
    case 'propose_action': {
      const nav = ctx.nav;
      let action: Action | null = null;
      const a = String(input.action);
      if (a === 'return_to_start') { if (!nav.toStart) return { error: 'no active trip start point' }; action = { type: 'returnStart' }; }
      if (a === 'start_trip') { if (nav.trip) return { error: 'a trip is already recording' }; action = { type: 'startTrip' }; }
      if (a === 'end_trip') { if (!nav.trip) return { error: 'no trip recording' }; action = { type: 'endTrip' }; }
      if (a === 'save_waypoint') { if (!nav.pos || !nav.hasFix) return { error: 'no GPS fix' }; action = { type: 'saveWaypoint', name: String(input.name || (lang === 'ar' ? 'نقطة' : 'Waypoint')), kind: (String(input.kind || 'mark') as WpKind), lat: nav.pos.lat, lon: nav.pos.lon }; }
      if (a === 'navigate_to_waypoint') {
        const w = await findWaypoint({ kind: input.kind as string | undefined, name: input.waypoint_name as string | undefined });
        if (!w) return { error: 'waypoint not found' };
        action = { type: 'navigateTo', target: { lat: w.lat, lon: w.lon, name: w.name, wpId: w.id } };
      }
      if (!action) return { error: 'unknown action' };
      out.pending = { action };
      out.card = { type: 'confirm', action, title: lang === 'ar' ? 'تأكيد' : 'Confirm', yes: lang === 'ar' ? 'نعم' : 'Yes' };
      return { status: 'awaiting_user_confirmation' };
    }
  }
  return { error: 'unknown tool' };
}

/** Ask the model; runs up to 4 tool rounds. Throws AiUnavailable when it cannot be reached. */
export async function askModel(history: Msg[], text: string, lang: AiLang): Promise<{ reply: Reply; history: Msg[] }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new AiUnavailable('offline');
  // History keeps only plain text turns, so tool blocks can never be cut in half.
  const msgs: Msg[] = [...history.slice(-6), { role: 'user', content: text }];
  const out: { card?: Card; pending?: Reply['pending'] } = {};
  for (let round = 0; round < 5; round++) {
    let res: Response;
    try {
      res = await fetch('/api/captain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, lang }) });
    } catch { throw new AiUnavailable('offline'); }
    if (res.status === 503) throw new AiUnavailable('not_configured');
    if (!res.ok) throw new AiUnavailable('error');
    const data = await res.json() as { content: Block[]; stop_reason: string };
    msgs.push({ role: 'assistant', content: data.content });
    const uses = data.content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
    if (data.stop_reason !== 'tool_use' || !uses.length) {
      const said = data.content.filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text').map((b) => b.text).join(' ').trim();
      return { reply: { lang, text: said, speech: said, source: 'ai', ...out }, history: [...history.slice(-6), { role: 'user', content: text }, { role: 'assistant', content: said || '…' }] };
    }
    const results: Block[] = [];
    for (const u of uses) {
      let r: unknown;
      try { r = await runTool(u.name, u.input ?? {}, out, lang); } catch { r = { error: 'tool failed' }; }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(r) });
    }
    msgs.push({ role: 'user', content: results });
  }
  throw new AiUnavailable('error');
}
