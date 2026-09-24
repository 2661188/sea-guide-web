import { useCallback, useEffect, useRef, useState } from 'react';
import type { Conditions } from './marine/types';
import { load, save } from './storage';
import { toLocalMs, nowLocalMs } from './marine/time';

// In-memory cache shared across screens so switching tabs never refetches.
const memory = new Map<string, { data: Conditions; at: number }>();
const FRESH_MS = 10 * 60 * 1000;

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface ConditionsState {
  data: Conditions | null;
  status: LoadStatus;
  /** Translation key of the last error (err_no_internet, err_service, err_generic). */
  error: string | null;
  /** True when showing a saved copy because the network request failed. */
  offline: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/** Saved data is only usable while its forecast still covers the next few hours. */
function usable(c: Conditions | null): c is Conditions {
  if (!c || !c.hourly?.time?.length) return false;
  const last = toLocalMs(c.hourly.time[c.hourly.time.length - 1]);
  return last > nowLocalMs(c.utcOffsetSeconds) + 6 * 3600e3;
}

export function useConditions(spotId: string): ConditionsState {
  const [data, setData] = useState<Conditions | null>(() => memory.get(spotId)?.data ?? null);
  const [status, setStatus] = useState<LoadStatus>(data ? 'ready' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reqId = useRef(0);

  const fetchNow = useCallback(async (force: boolean) => {
    const id = ++reqId.current;
    const mem = memory.get(spotId);
    if (!force && mem && Date.now() - mem.at < FRESH_MS) {
      setData(mem.data); setStatus('ready'); setOffline(false); setError(null);
      return;
    }
    // Show the last saved copy instantly while we fetch.
    const saved = mem?.data ?? load<Conditions | null>(`cond:${spotId}`, null);
    if (usable(saved)) { setData(saved); setStatus('ready'); } else if (!mem) { setData(null); setStatus('loading'); }
    setRefreshing(true);
    try {
      let res: Response;
      try {
        res = await fetch(`/api/conditions?spot=${encodeURIComponent(spotId)}`);
      } catch {
        throw new Error('err_no_internet');
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status >= 500 ? 'err_service' : 'err_generic');
      if (id !== reqId.current) return;
      memory.set(spotId, { data: json, at: Date.now() });
      save(`cond:${spotId}`, json);
      setData(json); setStatus('ready'); setOffline(false); setError(null);
    } catch (e) {
      if (id !== reqId.current) return;
      const msg = e instanceof Error && e.message.startsWith('err_') ? e.message : 'err_generic';
      setError(msg);
      if (usable(saved)) { setOffline(true); setStatus('ready'); } else { setStatus('error'); }
    } finally {
      if (id === reqId.current) setRefreshing(false);
    }
  }, [spotId]);

  useEffect(() => { fetchNow(false); }, [fetchNow]);

  return { data, status, error, offline, refreshing, refresh: () => fetchNow(true) };
}
