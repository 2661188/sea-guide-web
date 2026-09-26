import { useCallback, useEffect, useState } from 'react';
import type { StationsResponse } from './marine/types';
import { load, save } from './storage';

let memo: { data: StationsResponse; at: number } | null = null;

/** Tide summary for all stations, cached in memory and on the device. */
export function useStations() {
  const [data, setData] = useState<StationsResponse | null>(memo?.data ?? null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(memo ? 'ready' : 'loading');
  const [offline, setOffline] = useState(false);

  const fetchNow = useCallback(async (force = false) => {
    if (!force && memo && Date.now() - memo.at < 10 * 60e3) { setData(memo.data); setStatus('ready'); return; }
    const saved = memo?.data ?? load<StationsResponse | null>('stations', null);
    if (saved) { setData(saved); setStatus('ready'); }
    try {
      const res = await fetch('/api/stations');
      if (!res.ok) throw new Error();
      const json: StationsResponse = await res.json();
      memo = { data: json, at: Date.now() };
      save('stations', json);
      setData(json); setStatus('ready'); setOffline(false);
    } catch {
      if (saved) setOffline(true); else setStatus('error');
    }
  }, []);

  useEffect(() => { fetchNow(); }, [fetchNow]);
  return { data, status, offline, refresh: () => fetchNow(true) };
}
