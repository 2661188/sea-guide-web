import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { defaultSpot, findSpot, Region, Spot } from './regions';
import { load, save } from './storage';

interface SpotCtx { spot: Spot; region: Region; setSpotId: (id: string) => void }

const Ctx = createContext<SpotCtx | null>(null);

export function SpotProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState(defaultSpot().spot.id);
  useEffect(() => {
    const saved = load<string>('spot', '');
    if (saved && findSpot(saved)) setId(saved);
  }, []);
  const found = findSpot(id) ?? defaultSpot();
  const setSpotId = (next: string) => { if (findSpot(next)) { setId(next); save('spot', next); } };
  return <Ctx.Provider value={{ spot: found.spot, region: found.region, setSpotId }}>{children}</Ctx.Provider>;
}

export function useSpot() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSpot must be used inside SpotProvider');
  return v;
}
