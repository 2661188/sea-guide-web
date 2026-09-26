import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { defaultSpot, findSpot, Region, Spot } from './regions';
import { load, save } from './storage';
import { ACTIVITIES, ActivityId } from './marine/activities';

interface SpotCtx {
  spot: Spot;
  region: Region;
  setSpotId: (id: string) => void;
  activity: ActivityId;
  setActivity: (a: ActivityId) => void;
}

const Ctx = createContext<SpotCtx | null>(null);

/** The user's chosen spot and main activity, remembered on the device. */
export function SpotProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState(defaultSpot().spot.id);
  const [activity, setAct] = useState<ActivityId>('boating');
  useEffect(() => {
    const saved = load<string>('spot', '');
    if (saved && findSpot(saved)) setId(saved);
    const a = load<string>('activity', '');
    if ((ACTIVITIES as string[]).includes(a)) setAct(a as ActivityId);
  }, []);
  const found = findSpot(id) ?? defaultSpot();
  const setSpotId = (next: string) => { if (findSpot(next)) { setId(next); save('spot', next); } };
  const setActivity = (a: ActivityId) => { setAct(a); save('activity', a); };
  return (
    <Ctx.Provider value={{ spot: found.spot, region: found.region, setSpotId, activity, setActivity }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSpot() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSpot must be used inside SpotProvider');
  return v;
}
