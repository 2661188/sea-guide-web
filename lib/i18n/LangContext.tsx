import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { DICT, Key, Lang, LANGS } from './strings';
import { load, save } from '../storage';

export type Vars = Record<string, string | number>;
/** A translatable message produced by non-UI code (e.g. the sea-state summary). */
export interface Msg { k: Key; v?: Vars }

interface LangCtx {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
  tm: (m: Msg) => string;
}

const Ctx = createContext<LangCtx | null>(null);

function initialLang(): Lang {
  const saved = load<Lang | ''>('lang', '');
  if (saved === 'en' || saved === 'ar') return saved;
  if (typeof navigator !== 'undefined' && /^ar\b/i.test(navigator.language)) return 'ar';
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => setLangState(initialLang()), []);
  const dir = LANGS.find((l) => l.id === lang)!.dir;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (l: Lang) => { setLangState(l); save('lang', l); };
  const t = useCallback((key: Key, vars?: Vars) => {
    let s = DICT[lang][key] ?? DICT.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [lang]);
  const tm = useCallback((m: Msg) => t(m.k, m.v), [t]);

  return <Ctx.Provider value={{ lang, dir, setLang, t, tm }}>{children}</Ctx.Provider>;
}

export function useT() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useT must be used inside LangProvider');
  return v;
}
