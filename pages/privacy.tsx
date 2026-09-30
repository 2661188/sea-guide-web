import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useT } from '@/lib/i18n/LangContext';

// Privacy policy for the website and the Android app (linked from Google Play and Settings).
// Keep this in step with what the code actually does.
const UPDATED = '30 September 2026';

type Sec = { h: string; p: string[] };

const EN: Sec[] = [
  { h: 'In short', p: [
    'Bahrna has no accounts, no advertising and no analytics or tracking. Your trips, waypoints, routes, plans and settings are stored only on your phone (in the app’s own storage). We do not sell or share personal data.',
  ] },
  { h: 'Location', p: [
    'Bahrna uses your phone’s GPS to show your position, record trips, guide you to waypoints, return you to your start point and run the anchor alarm. Location is used only while you use these features.',
    'In the Android app, while a trip is recording or navigation / the anchor alarm is on, Android shows a notification (“Bahrna is using your location”) and GPS keeps working with the screen off. Bahrna does not ask for “Allow all the time” background location. Ending the trip or turning the feature off stops it.',
    'Your recorded tracks and positions stay on your phone. They leave the phone only when you choose to: exporting a GPX file, sharing a trip, or sending your position in an emergency message from the SOS screen (you pick the app and the recipient).',
  ] },
  { h: 'Microphone and voice (Ask Bahrna)', p: [
    'The microphone is on only while you hold the Ask Bahrna button (or for one short phrase after you tap it). Bahrna never records in the background.',
    'Speech is turned into text by your phone’s speech service (on Android this is normally Google’s speech recognition, which may process audio on Google’s servers under Google’s privacy policy). Bahrna itself does not store or upload your voice recordings. Answers are read aloud by your phone’s text-to-speech engine.',
  ] },
  { h: 'Online AI answers (optional)', p: [
    'Navigation questions (position, speed, time to go, distance, saved places) are answered on the phone. Only a question the phone cannot answer may be sent to Bahrna’s server and on to our AI provider (Anthropic) to generate a reply, together with the few facts needed to answer it, such as your approximate position, speed, current trip summary and boat settings. This happens only when the online AI is switched on for the service and you are connected. Bahrna does not keep these requests; the provider processes them under its own terms and does not use them to train models by default.',
  ] },
  { h: 'Weather, tides and maps', p: [
    'Marine forecasts come from Open-Meteo through Bahrna’s server, for the named fishing spot or station you choose — not your GPS position.',
    'Map, satellite and sea-chart tiles are downloaded from OpenStreetMap, Esri (ArcGIS), OpenSeaMap and GEBCO. Like any website, these services receive your device’s IP address and the map area being downloaded.',
  ] },
  { h: 'What is stored on your phone', p: [
    'Trips and track points (with your trip notes and the forecast at the start), waypoints, routes, trip plans, boat profile (including registration number and emergency contact, if you enter them), fuel log, maintenance log, catch log (species, sizes, photos you take, and the location only at the precision you choose: exact, area or not saved), home point, app language and settings, and the Instagram username you enter in Settings. Uninstalling the app or clearing its storage deletes them. Bahrna has no copy.',
    'Registration number and emergency contact are never sent to the AI service. Catch photos are shrunk and kept on the phone; nothing is published.',
    'Reminders and alarms (anchor alarm, arrival, off-course, maintenance reminders) are local notifications created on your phone. No push server is used.',
  ] },
  { h: 'Children', p: ['Bahrna is not directed at children under 13 and does not knowingly collect their data.'] },
  { h: 'Safety', p: [
    'Bahrna is a planning and awareness aid. It does not replace certified marine navigation equipment, official charts, weather warnings or a VHF radio, and it never contacts rescue services for you.',
  ] },
  { h: 'Changes and contact', p: [
    'If this policy changes, the new version will be posted on this page with a new date. Questions: use the developer contact email shown on Bahrna’s Google Play page.',
  ] },
];

const AR: Sec[] = [
  { h: 'باختصار', p: [
    'بحرنا بدون حسابات وبدون إعلانات وبدون أدوات تتبع أو تحليلات. رحلاتك ونقاطك ومساراتك وخططك وإعداداتك تنحفظ فقط في هاتفك. لا نبيع ولا نشارك أي بيانات شخصية.',
  ] },
  { h: 'الموقع', p: [
    'يستخدم بحرنا GPS الهاتف لعرض موقعك وتسجيل الرحلات والتوجيه للنقاط والعودة لنقطة البداية وإنذار المرساة، فقط أثناء استخدامك لهذه الميزات.',
    'في تطبيق أندرويد، أثناء تسجيل رحلة أو تشغيل الملاحة أو إنذار المرساة، يظهر إشعار «بحرنا يستخدم موقعك» ويستمر GPS حتى والشاشة مطفأة. بحرنا لا يطلب إذن الموقع «طوال الوقت». إنهاء الرحلة أو إيقاف الميزة يوقفه.',
    'مساراتك ومواقعك تبقى في هاتفك، ولا تخرج منه إلا إذا اخترت أنت: تصدير ملف GPX، أو مشاركة رحلة، أو إرسال موقعك في رسالة طوارئ من شاشة SOS (أنت تختار التطبيق والمستلم).',
  ] },
  { h: 'الميكروفون والصوت (اسأل بحرنا)', p: [
    'الميكروفون يشتغل فقط وأنت ضاغط على زر «اسأل بحرنا» (أو لجملة قصيرة بعد الضغط). بحرنا لا يسجّل في الخلفية أبداً.',
    'تحويل الكلام إلى نص تقوم به خدمة الكلام في هاتفك (في أندرويد عادةً خدمة Google، وقد تعالج الصوت على خوادم Google حسب سياسة خصوصيتها). بحرنا نفسه لا يحفظ ولا يرفع تسجيلات صوتك. الإجابات تُقرأ بمحرك تحويل النص إلى كلام في هاتفك.',
  ] },
  { h: 'إجابات الذكاء الاصطناعي عبر الإنترنت (اختيارية)', p: [
    'أسئلة الملاحة (الموقع، السرعة، الوقت المتبقي، المسافة، الأماكن المحفوظة) تُجاب داخل الهاتف. فقط السؤال اللي ما يقدر الهاتف يجاوبه قد يُرسل إلى خادم بحرنا ثم إلى مزوّد الذكاء الاصطناعي (Anthropic) مع أقل معلومات لازمة مثل موقعك التقريبي وسرعتك وملخص الرحلة وإعدادات القارب، وذلك فقط إذا كانت الخدمة مفعّلة وأنت متصل. بحرنا لا يحتفظ بهذه الطلبات.',
  ] },
  { h: 'الطقس والمد والخرائط', p: [
    'توقعات البحر من Open-Meteo عبر خادم بحرنا، للموقع أو المحطة اللي تختارها وليس لموقع GPS الخاص بك.',
    'طبقات الخرائط والأقمار الصناعية والخرائط البحرية تُحمّل من OpenStreetMap وEsri وOpenSeaMap وGEBCO، وهذه الخدمات تستقبل عنوان IP لجهازك ومنطقة الخريطة المحمّلة مثل أي موقع إنترنت.',
  ] },
  { h: 'ما يُحفظ في هاتفك', p: [
    'الرحلات ونقاط المسار (مع ملاحظاتك والتوقعات عند بداية الرحلة)، النقاط، المسارات، خطط الرحلات، ملف القارب (ومنه رقم التسجيل وجهة اتصال الطوارئ إذا أدخلتها)، سجل الوقود، سجل الصيانة، سجل الصيد (النوع والمقاسات والصور اللي تلتقطها، والموقع بالدقة اللي تختارها فقط: دقيق أو منطقة أو بدون حفظ)، نقطة البيت، اللغة والإعدادات، واسم إنستغرام اللي تكتبه في الإعدادات. حذف التطبيق أو مسح بياناته يحذفها، ولا توجد نسخة لدى بحرنا.',
    'رقم التسجيل وجهة اتصال الطوارئ لا تُرسل أبداً لخدمة الذكاء الاصطناعي. صور الصيد تُصغّر وتبقى على الهاتف؛ لا يُنشر شيء.',
    'التذكيرات والتنبيهات (إنذار المخطاف، الوصول، الانحراف عن المسار، تذكير الصيانة) إشعارات محلية تُنشأ على هاتفك. لا يوجد خادم إشعارات.',
  ] },
  { h: 'الأطفال', p: ['بحرنا غير موجّه للأطفال دون 13 سنة ولا يجمع بياناتهم عن قصد.'] },
  { h: 'السلامة', p: [
    'بحرنا أداة مساعدة للتخطيط والوعي، ولا يغني عن أجهزة الملاحة البحرية المعتمدة أو الخرائط الرسمية أو تحذيرات الطقس أو جهاز VHF، ولا يتصل بخدمات الإنقاذ نيابة عنك.',
  ] },
  { h: 'التغييرات والتواصل', p: [
    'أي تغيير على هذه السياسة يُنشر في هذه الصفحة بتاريخ جديد. للاستفسار: استخدم بريد المطوّر الظاهر في صفحة بحرنا على Google Play.',
  ] },
];

export default function Privacy() {
  const { lang } = useT();
  const ar = lang === 'ar';
  const secs = ar ? AR : EN;
  return (
    <AppShell title={ar ? 'سياسة الخصوصية' : 'Privacy policy'} showSpot={false}>
      <article className="mx-auto max-w-2xl space-y-5 pb-8">
        <header>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-ink dark:text-white">{ar ? 'سياسة الخصوصية' : 'Privacy policy'}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ar ? 'بحرنا · آخر تحديث: ٣٠ سبتمبر ٢٠٢٦' : `Bahrna · Last updated: ${UPDATED}`}</p>
        </header>
        {secs.map((s) => (
          <section key={s.h} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
            <h2 className="text-lg font-bold text-ink dark:text-white">{s.h}</h2>
            {s.p.map((t, i) => <p key={i} className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{t}</p>)}
          </section>
        ))}
        <p className="text-center text-sm"><Link href="/settings" className="font-semibold text-lagoon underline dark:text-shallows">{ar ? 'رجوع إلى الإعدادات' : 'Back to Settings'}</Link></p>
      </article>
    </AppShell>
  );
}
