// Ready-made pre-departure checklists for every water sport (Guide content).
// Users can add and delete items; their version is saved on the device.
import type { ActivityId } from './marine/activities';
import { load, save } from './storage';

type T = { en: string; ar: string };

const common = {
  forecast: { en: 'Checked the forecast and tide in Bahrna and the NCM', ar: 'راجعت التوقعات والمد في بحرنا والمركز الوطني للأرصاد' },
  told: { en: 'Told someone ashore where I am going and when I will be back', ar: 'أخبرت شخصاً على البر بوجهتي وموعد عودتي' },
  phone: { en: 'Phone charged, in a waterproof pouch', ar: 'الهاتف مشحون وفي حقيبة مقاومة للماء' },
  water: { en: 'Plenty of drinking water', ar: 'كمية كافية من مياه الشرب' },
  sun: { en: 'Sunscreen, hat and sunglasses', ar: 'واقي شمس وقبعة ونظارة شمسية' },
  lifejacket: { en: 'Life jacket that fits, worn or within reach', ar: 'سترة نجاة مناسبة المقاس، مرتدية أو في المتناول' },
  firstaid: { en: 'Small first-aid kit', ar: 'حقيبة إسعافات أولية صغيرة' },
  whistle: { en: 'Whistle attached to the life jacket', ar: 'صافرة مثبتة على سترة النجاة' },
};

export const CHECKLISTS: Record<ActivityId, Record<string, T>> = {
  boating: {
    forecast: common.forecast, told: common.told,
    fuel: { en: 'Fuel for the trip plus one third in reserve', ar: 'وقود للرحلة مع احتياطي الثلث' },
    lifejackets: { en: 'A life jacket for every person on board', ar: 'سترة نجاة لكل شخص على متن القارب' },
    vhf: { en: 'VHF radio on channel 16 and phone charged', ar: 'جهاز لاسلكي VHF على القناة 16 والهاتف مشحون' },
    engine: { en: 'Engine, battery and bilge pump checked', ar: 'فحص المحرك والبطارية ومضخة الآسن' },
    kill: { en: 'Kill cord attached to the skipper', ar: 'حبل إيقاف المحرك مربوط بالقائد' },
    anchor: { en: 'Anchor, chain and enough rope', ar: 'المرساة والسلسلة وحبل كافٍ' },
    flares: { en: 'Flares and fire extinguisher in date', ar: 'مشاعل استغاثة وطفاية حريق صالحة' },
    docs: { en: 'Boat licence and registration on board', ar: 'رخصة القارب وتسجيله على متنه' },
    water: common.water, firstaid: common.firstaid,
  },
  fishing: {
    forecast: common.forecast, told: common.told,
    licence: { en: 'Fishing licence valid for this emirate', ar: 'رخصة صيد سارية لهذه الإمارة' },
    rods: { en: 'Rods, reels and spare line', ar: 'السنانير والبكرات وخيط احتياطي' },
    tackle: { en: 'Hooks, weights, lures and pliers', ar: 'الخطاطيف والأثقال والطُعوم الصناعية والكمّاشة' },
    bait: { en: 'Bait kept cool', ar: 'الطُعم محفوظ بارداً' },
    icebox: { en: 'Ice box for the catch', ar: 'صندوق ثلج للصيد' },
    rules: { en: 'Know the size limits and banned species', ar: 'معرفة الأحجام المسموحة والأنواع الممنوعة' },
    knife: { en: 'Knife and towel', ar: 'سكين ومنشفة' },
    lifejacket: common.lifejacket, sun: common.sun, water: common.water,
  },
  jetski: {
    forecast: common.forecast, told: common.told,
    licence: { en: 'Jet ski licence and registration', ar: 'رخصة الدراجة المائية وتسجيلها' },
    lifejacket: common.lifejacket,
    lanyard: { en: 'Safety lanyard clipped to your wrist or vest', ar: 'حبل الأمان مثبت بالمعصم أو السترة' },
    fuel: { en: 'Full tank and a plan to return at half', ar: 'خزان ممتلئ وخطة للعودة عند النصف' },
    zones: { en: 'Know the permitted zones and speed limits', ar: 'معرفة المناطق المسموحة وحدود السرعة' },
    boots: { en: 'Water shoes and goggles', ar: 'حذاء مائي ونظارة' },
    phone: common.phone, sun: common.sun, water: common.water,
  },
  kayak: {
    forecast: common.forecast, told: common.told,
    lifejacket: common.lifejacket,
    paddle: { en: 'Paddle, plus a leash for the paddle', ar: 'مجداف مع حبل تثبيت له' },
    leash: { en: 'Board leash (SUP)', ar: 'حبل تثبيت اللوح (التجديف وقوفاً)' },
    drybag: { en: 'Dry bag for keys and phone', ar: 'حقيبة جافة للمفاتيح والهاتف' },
    whistle: common.whistle,
    offshore: { en: 'No offshore wind today (it blows you out to sea)', ar: 'لا توجد رياح نحو البحر اليوم (تدفعك بعيداً عن الشاطئ)' },
    route: { en: 'Route planned with the tide, back before sunset', ar: 'مسار مخطط حسب المد والعودة قبل الغروب' },
    sun: common.sun, water: common.water,
  },
  sailing: {
    forecast: common.forecast, told: common.told,
    lifejackets: { en: 'Life jacket for every crew member', ar: 'سترة نجاة لكل أفراد الطاقم' },
    rigging: { en: 'Rigging, shackles and pins checked', ar: 'فحص الأشرعة والأقفال والمسامير' },
    reef: { en: 'Know how to reef before the wind builds', ar: 'معرفة طريقة تقليص الشراع قبل اشتداد الرياح' },
    sheets: { en: 'Sheets and halyards free of knots', ar: 'حبال الشراع خالية من العقد' },
    vhf: { en: 'VHF radio on channel 16', ar: 'جهاز لاسلكي VHF على القناة 16' },
    bailer: { en: 'Bailer or pump on board', ar: 'أداة أو مضخة لنزح الماء' },
    knife: { en: 'Rigging knife', ar: 'سكين للحبال' },
    sun: common.sun, water: common.water,
  },
  kite: {
    forecast: common.forecast, told: common.told,
    wind: { en: 'Wind 12–25 kn and not offshore', ar: 'رياح بين 12 و25 عقدة وليست نحو البحر' },
    lines: { en: 'Lines checked for knots and wear', ar: 'فحص الحبال من العقد والتآكل' },
    release: { en: 'Quick release tested', ar: 'اختبار نظام الفك السريع' },
    leash: { en: 'Safety leash attached', ar: 'حبل الأمان مثبت' },
    vest: { en: 'Impact vest and helmet', ar: 'سترة واقية وخوذة' },
    spot: { en: 'Permitted kite beach with clear launch area', ar: 'شاطئ مخصص للكايت بمساحة إطلاق خالية' },
    buddy: { en: 'A buddy on the beach to help launch and land', ar: 'مرافق على الشاطئ للمساعدة في الإطلاق والهبوط' },
    sun: common.sun, water: common.water,
  },
  diving: {
    forecast: common.forecast, told: common.told,
    buddy: { en: 'Dive buddy and a plan (depth, time, air)', ar: 'رفيق غوص وخطة (العمق والوقت والهواء)' },
    cert: { en: 'Certification card and dive log', ar: 'بطاقة الشهادة وسجل الغوص' },
    gear: { en: 'Mask, fins, snorkel and wetsuit', ar: 'القناع والزعانف وأنبوب التنفس وبدلة الغوص' },
    tank: { en: 'Tank full, regulator and BCD tested', ar: 'الأسطوانة ممتلئة واختبار المنظم وسترة الطفو' },
    flag: { en: 'Dive flag or surface marker buoy', ar: 'علم الغوص أو عوامة سطحية' },
    slack: { en: 'Dive near slack tide (weak current)', ar: 'الغوص قرب وقت ركود المد (تيار ضعيف)' },
    nofly: { en: 'No flying within 18 hours after diving', ar: 'عدم الطيران خلال 18 ساعة بعد الغوص' },
    water: common.water, firstaid: common.firstaid,
  },
  swimming: {
    forecast: common.forecast,
    flags: { en: 'Swim at a beach with lifeguards and check the flags', ar: 'السباحة في شاطئ به منقذون ومراجعة الأعلام' },
    buddy: { en: 'Swim with a buddy', ar: 'السباحة مع مرافق' },
    current: { en: 'Know how to escape a rip current (swim parallel to shore)', ar: 'معرفة الخروج من التيار الساحب (السباحة موازياً للشاطئ)' },
    jelly: { en: 'Watch for jellyfish; vinegar in the bag', ar: 'الانتباه لقناديل البحر؛ خل في الحقيبة' },
    kids: { en: 'Children within arm\'s reach at all times', ar: 'الأطفال في متناول اليد دائماً' },
    heat: { en: 'Avoid midday heat (11:00–15:00)', ar: 'تجنب حرارة الظهيرة (11:00–15:00)' },
    goggles: { en: 'Goggles and swim cap', ar: 'نظارة وقبعة سباحة' },
    sun: common.sun, water: common.water,
  },
};

export interface ListItem { id: string; text?: string } // text set = the user's own item
export interface SavedList { items: ListItem[]; done: Record<string, boolean> }

const defaults = (a: ActivityId): SavedList => ({ items: Object.keys(CHECKLISTS[a]).map((id) => ({ id })), done: {} });

export function loadList(a: ActivityId): SavedList {
  const all = load<Record<string, SavedList>>('checklists', {});
  const l = all[a];
  return l && Array.isArray(l.items) ? l : defaults(a);
}

export function saveList(a: ActivityId, list: SavedList) {
  const all = load<Record<string, SavedList>>('checklists', {});
  all[a] = list;
  save('checklists', all);
}

export const resetList = (a: ActivityId) => { const d = defaults(a); saveList(a, d); return d; };

export function itemText(a: ActivityId, item: ListItem, lang: 'en' | 'ar') {
  return item.text ?? CHECKLISTS[a][item.id]?.[lang] ?? item.id;
}
