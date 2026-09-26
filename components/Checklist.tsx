import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { ActivityIcon } from './ActivityIcon';
import { SectionTitle, SourceTag } from './ui';
import { useT } from '@/lib/i18n/LangContext';
import { useSpot } from '@/lib/SpotContext';
import { ACTIVITIES, ActivityId } from '@/lib/marine/activities';
import { itemText, loadList, resetList, saveList, SavedList } from '@/lib/checklists';

export function Checklist() {
  const { t, lang } = useT();
  const { activity } = useSpot();
  const [sport, setSport] = useState<ActivityId>('boating');
  const [list, setList] = useState<SavedList | null>(null);
  const [all, setAll] = useState<Record<string, [number, number]>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setSport(activity), [activity]);
  useEffect(() => { setList(loadList(sport)); setEditing(false); }, [sport]);
  useEffect(() => {
    const m: Record<string, [number, number]> = {};
    for (const a of ACTIVITIES) { const l = loadList(a); m[a] = [l.items.filter((i) => l.done[i.id]).length, l.items.length]; }
    setAll(m);
  }, [list]);

  const update = (next: SavedList) => { setList(next); saveList(sport, next); };
  if (!list) return <div className="h-96" />;

  const toggle = (id: string) => update({ ...list, done: { ...list.done, [id]: !list.done[id] } });
  const remove = (id: string) => { const done = { ...list.done }; delete done[id]; update({ items: list.items.filter((i) => i.id !== id), done }); };
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    update({ ...list, items: [...list.items, { id: `u${Date.now().toString(36)}`, text }] });
    setDraft('');
    inputRef.current?.focus();
  };
  const count = list.items.filter((i) => list.done[i.id]).length;
  const total = list.items.length;
  const pct = total ? count / total : 0;
  const R = 26, C = 2 * Math.PI * R;

  return (
      <div className="grid gap-3 lg:grid-cols-12 lg:items-start lg:gap-4">
        <section className="card overflow-hidden lg:col-span-7">
          {/* Sport picker (dropdown) + progress ring */}
          <div className="flex items-center gap-4 bg-gradient-to-br from-abyss to-[#0B4A5C] px-4 py-4 text-white">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{t('check_for')}</p>
              <label className="relative mt-1 flex items-center">
                <span className="pointer-events-none absolute start-2.5 text-shallows"><ActivityIcon id={sport} size={20} /></span>
                <select value={sport} onChange={(e) => setSport(e.target.value as ActivityId)} aria-label={t('choose_activity')}
                  className="h-12 w-full appearance-none rounded-xl border-0 bg-white/10 pe-9 ps-10 font-display text-2xl font-semibold text-white ring-1 ring-white/20 focus:ring-2 focus:ring-shallows">
                  {ACTIVITIES.map((a) => <option key={a} value={a} className="text-ink">{t(`act_${a}`)}</option>)}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute end-3 text-white/70" />
              </label>
              <p className="mt-2 text-xs text-white/70">{t('check_sub')}</p>
            </div>
            <div className="relative grid h-[68px] w-[68px] shrink-0 place-items-center" aria-label={t('progress', { done: count, total })}>
              <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
                <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
                <circle cx="32" cy="32" r={R} fill="none" stroke={pct === 1 ? '#0E9F6E' : '#7FD4D0'} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${C * pct} ${C}`} style={{ transition: 'stroke-dasharray .4s' }} />
              </svg>
              <span className="readout text-xl"><bdi>{count}/{total}</bdi></span>
            </div>
          </div>

          {pct === 1 && total > 0 && (
            <p className="flex items-center gap-2 bg-good/10 px-4 py-2.5 text-sm font-semibold text-good"><Check size={16} /> {t('all_ready')}</p>
          )}

          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {list.items.map((item) => {
              const text = itemText(sport, item, lang);
              const on = !!list.done[item.id];
              return (
                <li key={item.id} className="flex items-center">
                  <button onClick={() => toggle(item.id)} role="checkbox" aria-checked={on} disabled={editing}
                    className="flex min-h-[54px] flex-1 items-center gap-3 px-4 py-3 text-start disabled:cursor-default">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors ${on ? 'border-good bg-good text-white' : 'border-slate-300 dark:border-white/25'}`}>
                      {on && <Check size={15} strokeWidth={3} />}
                    </span>
                    <span className={`text-sm leading-snug ${on ? 'text-slate-400 line-through' : ''}`}>{text}</span>
                    {item.text && <span className="chip shrink-0 bg-lagoon/10 py-0.5 text-[10px] text-lagoon dark:text-shallows">{t('custom')}</span>}
                  </button>
                  {editing && (
                    <button onClick={() => remove(item.id)} aria-label={t('delete_item', { item: text })}
                      className="tap me-3 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bad/10 text-bad"><X size={16} /></button>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Add your own item */}
          <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2 border-t border-slate-100 p-3 dark:border-white/10">
            <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('add_item')} aria-label={t('add_item')} maxLength={120}
              className="h-11 min-w-0 flex-1 rounded-xl border-0 bg-slate-100 px-3 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-lagoon dark:bg-white/10" />
            <button type="submit" disabled={!draft.trim()} className="tap flex h-11 shrink-0 items-center gap-1 rounded-xl bg-lagoon px-4 text-sm font-semibold text-white disabled:opacity-40">
              <Plus size={16} /> {t('add_btn')}
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm dark:border-white/10">
            <button onClick={() => setEditing(!editing)} className={`tap flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${editing ? 'bg-abyss text-white' : 'text-lagoon dark:text-shallows'}`}>
              <Pencil size={14} /> {t(editing ? 'finish_edit' : 'edit_list')}
            </button>
            <button onClick={() => update({ ...list, done: {} })} disabled={!count} className="tap flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-lagoon disabled:opacity-40 dark:text-shallows">
              <RotateCcw size={14} /> {t('clear_ticks')}
            </button>
            <button onClick={() => setList(resetList(sport))} className="tap ms-auto rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500">{t('reset_list')}</button>
          </div>
        </section>

        <div className="space-y-3 lg:col-span-5">
          {/* Progress for every sport */}
          <SectionTitle right={<SourceTag kind="info" />}>{t('activities').split(' · ')[0]}</SectionTitle>
          <section className="card grid grid-cols-2 gap-px overflow-hidden bg-slate-100 dark:bg-white/10">
            {ACTIVITIES.map((a) => {
              const [d, n] = all[a] ?? [0, 0];
              return (
                <button key={a} onClick={() => { setSport(a); document.getElementById('readiness')?.scrollIntoView({ behavior: 'smooth' }); }} aria-pressed={a === sport}
                  className={`flex flex-col gap-2 p-3 text-start ${a === sport ? 'bg-lagoon/10' : 'bg-white dark:bg-[#0A2B40]'}`}>
                  <span className="flex items-center gap-2 text-sm font-semibold"><ActivityIcon id={a} size={17} className="text-lagoon dark:text-shallows" /> {t(`act_${a}`)}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <span className={`block h-full rounded-full ${d === n && n ? 'bg-good' : 'bg-lagoon'}`} style={{ width: `${n ? (d / n) * 100 : 0}%` }} />
                  </span>
                  <span className="muted text-[11px] tabular-nums">{t('progress', { done: d, total: n })}</span>
                </button>
              );
            })}
          </section>
        </div>
      </div>
  );
}
