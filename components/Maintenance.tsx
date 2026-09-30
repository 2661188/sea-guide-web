import { useState } from 'react';
import { Bell, Plus, Trash2, Wrench } from 'lucide-react';
import { useT } from '@/lib/i18n/LangContext';
import type { Key } from '@/lib/i18n/strings';
import { DEFAULT_MONTHS, dueDate, dueState, MAINT_KINDS, MaintItem, MaintKind, removeMaint, upsertMaint, useMaint } from '@/lib/maintenance';
import { requestNotifyPermission } from '@/lib/native/notify';
import { Sheet } from './Sheet';

const today = () => new Date().toISOString().slice(0, 10);
const TONE = { ok: 'bg-good/10 text-good', soon: 'bg-caution/15 text-amber-700 dark:text-amber-300', overdue: 'bg-bad/10 text-bad' };

/** Boat maintenance log: what was done when, and when it is next due. */
export function MaintenanceCard() {
  const { t, lang } = useT();
  const list = useMaint();
  const [edit, setEdit] = useState<MaintItem | null>(null);
  const name = (m: MaintItem) => m.label || t(`mk_${m.kind}` as Key);
  const fmt = (d: Date) => d.toLocaleDateString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const blank = (kind: MaintKind): MaintItem => ({ id: `${Date.now().toString(36)}`, kind, label: '', lastDate: today(), months: DEFAULT_MONTHS[kind], notes: '', remind: true });
  return (
    <section className="card space-y-3 p-4 text-sm">
      <p className="flex items-center gap-2"><Wrench size={18} className="text-lagoon dark:text-shallows" /><span className="muted">{t('mt_t')}</span></p>
      {list.length === 0 && <p className="muted text-xs">{t('mt_empty')}</p>}
      <ul className="divide-y divide-slate-100 dark:divide-white/10">
        {list.map((m) => {
          const st = dueState(m);
          return (
            <li key={m.id}>
              <button onClick={() => setEdit(m)} className="tap flex w-full items-center justify-between gap-2 py-2.5 text-start">
                <span className="min-w-0"><span className="block truncate font-semibold">{name(m)}</span><span className="muted block text-xs">{t('mt_next', { d: fmt(dueDate(m)) })}</span></span>
                <span className={`chip shrink-0 ${TONE[st]}`}>{t(`mt_${st}` as Key)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        {MAINT_KINDS.filter((k) => k === 'other' || !list.some((m) => m.kind === k)).map((k) => (
          <button key={k} onClick={() => setEdit(blank(k))} className="tap inline-flex h-9 items-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-semibold dark:bg-white/10"><Plus size={13} /> {t(`mk_${k}` as Key)}</button>
        ))}
      </div>
      <p className="muted text-[11px] leading-snug">{t('mt_note')}</p>
      {edit && <MaintSheet item={edit} isNew={!list.some((m) => m.id === edit.id)} onClose={() => setEdit(null)} />}
    </section>
  );
}

function MaintSheet({ item, isNew, onClose }: { item: MaintItem; isNew: boolean; onClose: () => void }) {
  const { t } = useT();
  const [m, setM] = useState(item);
  const [confirm, setConfirm] = useState(false);
  const saveIt = async () => {
    if (m.remind) await requestNotifyPermission();
    upsertMaint(m, t('mt_remind_title', { item: m.label || t(`mk_${m.kind}` as Key) }));
    onClose();
  };
  return (
    <Sheet title={m.label || t(`mk_${m.kind}` as Key)} onClose={onClose}>
      <div className="space-y-3 text-sm">
        {m.kind === 'other' && (
          <label className="block font-medium">{t('mt_name')}
            <input value={m.label} onChange={(e) => setM({ ...m, label: e.target.value })} maxLength={40} className="mt-1 h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block font-medium">{t('mt_last')}
            <input type="date" value={m.lastDate} max={today()} onChange={(e) => e.target.value && setM({ ...m, lastDate: e.target.value })} className="mt-1 h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10" />
          </label>
          <label className="block font-medium">{t('mt_every')}
            <select value={m.months} onChange={(e) => setM({ ...m, months: +e.target.value })} className="mt-1 h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base dark:bg-white/10">
              {[1, 3, 6, 12, 18, 24, 36, 48, 60].map((n) => <option key={n} value={n}>{t('mt_months', { n })}</option>)}
            </select>
          </label>
        </div>
        <label className="block font-medium">{t('notes')}
          <textarea value={m.notes} onChange={(e) => setM({ ...m, notes: e.target.value })} rows={2} maxLength={400} className="mt-1 w-full rounded-xl border-0 bg-slate-100 p-3 text-base dark:bg-white/10" />
        </label>
        <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={m.remind} onChange={(e) => setM({ ...m, remind: e.target.checked })} className="h-5 w-5" /><Bell size={15} /> {t('mt_remind')}</label>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={saveIt} className="tap h-12 rounded-2xl bg-abyss font-bold text-white">{t('save')}</button>
          {!isNew ? (
            <button onClick={() => { if (!confirm) { setConfirm(true); return; } removeMaint(m.id); onClose(); }} className={`tap inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl font-semibold ${confirm ? 'bg-bad text-white' : 'bg-bad/10 text-bad'}`}><Trash2 size={15} /> {confirm ? t('discard_confirm') : t('delete')}</button>
          ) : <button onClick={onClose} className="tap h-12 rounded-2xl bg-slate-100 font-semibold dark:bg-white/10">{t('cancel')}</button>}
        </div>
      </div>
    </Sheet>
  );
}
