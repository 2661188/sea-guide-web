// Learn content (Guide): knots and boating skills in English and Arabic.
// General good practice for recreational boaters; not a substitute for a course.
import type { ComponentType } from 'react';
import * as Art from '@/components/LearnArt';

type T = { en: string; ar: string };
export type LearnCat = 'fishing_knots' | 'boat_knots' | 'anchoring' | 'docking' | 'mooring' | 'navigation' | 'launching' | 'recovery' | 'safety';
export interface LearnItem {
  id: string;
  cat: LearnCat;
  level: 'easy' | 'med' | 'adv';
  title: T;
  use: T;
  steps: T[];
  tip: T;
  Art: ComponentType;
}

export const CATS: { id: LearnCat; title: T }[] = [
  { id: 'boat_knots', title: { en: 'Boating knots', ar: 'عقد القوارب' } },
  { id: 'fishing_knots', title: { en: 'Fishing knots', ar: 'عقد الصيد' } },
  { id: 'anchoring', title: { en: 'Anchoring', ar: 'الإرساء' } },
  { id: 'docking', title: { en: 'Docking', ar: 'الرسو على الرصيف' } },
  { id: 'mooring', title: { en: 'Mooring', ar: 'الربط بالعوامة' } },
  { id: 'navigation', title: { en: 'Navigation', ar: 'الملاحة' } },
  { id: 'launching', title: { en: 'Launching', ar: 'الإنزال' } },
  { id: 'recovery', title: { en: 'Recovery', ar: 'الانتشال' } },
  { id: 'safety', title: { en: 'Safety', ar: 'السلامة' } },
];

export const LEARN: LearnItem[] = [
  {
    id: 'cleat', cat: 'boat_knots', level: 'easy', Art: Art.CleatHitch,
    title: { en: 'Cleat hitch', ar: 'عقدة المربط' },
    use: { en: 'Tying your boat to a dock cleat. Quick to tie and quick to release.', ar: 'ربط القارب بمربط الرصيف. سريعة الربط وسريعة الفك.' },
    steps: [
      { en: 'Take the line to the far horn of the cleat and make a full turn around the base.', ar: 'مرّر الحبل إلى القرن البعيد للمربط ولفّه لفة كاملة حول القاعدة.' },
      { en: 'Cross over the top of the cleat diagonally and go under the other horn.', ar: 'اعبر فوق المربط قطرياً ومرّر الحبل تحت القرن الآخر.' },
      { en: 'Cross back over the top to make a figure-eight. Repeat once.', ar: 'اعبر فوقه مرة أخرى لتكوّن شكل 8. كرّر مرة واحدة.' },
      { en: 'Finish with an underhand loop over the horn so the tail lies parallel to the last turn. Pull tight.', ar: 'أنهِ بحلقة مقلوبة فوق القرن بحيث يكون الطرف موازياً للّفة الأخيرة، ثم شدّ.' },
    ],
    tip: { en: 'One locking hitch is enough. Extra wraps make it harder to release in an emergency.', ar: 'عقدة قفل واحدة تكفي. اللفّات الزائدة تصعّب الفك في حالة الطوارئ.' },
  },
  {
    id: 'bowline', cat: 'boat_knots', level: 'med', Art: Art.Bowline,
    title: { en: 'Bowline', ar: 'عقدة البولين' },
    use: { en: 'A fixed loop that will not slip or jam: dock lines over a post, rescue loops, tying to a ring.', ar: 'حلقة ثابتة لا تنزلق ولا تنحشر: حبال الرصيف حول عمود، حلقات الإنقاذ، الربط بحلقة.' },
    steps: [
      { en: 'Make a small loop in the standing part, with the working end on top.', ar: 'اصنع حلقة صغيرة في الجزء الثابت، والطرف العامل من الأعلى.' },
      { en: 'Bring the end up through the small loop ("the rabbit comes out of the hole").', ar: 'أدخل الطرف من الأسفل عبر الحلقة الصغيرة («الأرنب يخرج من الجحر»).' },
      { en: 'Take it around behind the standing part ("around the tree").', ar: 'لفّه خلف الجزء الثابت («حول الشجرة»).' },
      { en: 'Go back down through the small loop ("back into the hole") and pull tight.', ar: 'أعده نزولاً عبر الحلقة الصغيرة («يعود إلى الجحر») ثم شدّ.' },
    ],
    tip: { en: 'Leave a tail at least 10 times the rope thickness. It can loosen when not under load.', ar: 'اترك طرفاً بطول 10 أضعاف سماكة الحبل على الأقل؛ قد ترتخي العقدة دون حمل.' },
  },
  {
    id: 'clove', cat: 'boat_knots', level: 'easy', Art: Art.CloveHitch,
    title: { en: 'Clove hitch', ar: 'العقدة المزدوجة' },
    use: { en: 'Hanging fenders from a rail, or a quick temporary tie to a post.', ar: 'تعليق الصدّامات على الدرابزين، أو ربط مؤقت سريع بعمود.' },
    steps: [
      { en: 'Wrap the line once around the post.', ar: 'لفّ الحبل مرة حول العمود.' },
      { en: 'Cross over the first turn and wrap around again.', ar: 'اعبر فوق اللفة الأولى ولفّ مرة أخرى.' },
      { en: 'Tuck the end under the second turn and pull both ends tight.', ar: 'أدخل الطرف تحت اللفة الثانية واسحب الطرفين بقوة.' },
    ],
    tip: { en: 'It can slip if the load changes direction. Add a half hitch for security.', ar: 'قد تنزلق إذا تغيّر اتجاه الشد. أضف نصف عقدة للأمان.' },
  },
  {
    id: 'eight', cat: 'boat_knots', level: 'easy', Art: Art.FigureEight,
    title: { en: 'Figure-eight stopper', ar: 'عقدة الثمانية' },
    use: { en: 'Stops a line from running out through a block or fairlead.', ar: 'تمنع الحبل من الانفلات عبر البكرة أو الموجّه.' },
    steps: [
      { en: 'Make a loop by passing the end over the standing part.', ar: 'اصنع حلقة بتمرير الطرف فوق الجزء الثابت.' },
      { en: 'Take the end around behind the standing part.', ar: 'لفّ الطرف خلف الجزء الثابت.' },
      { en: 'Pass it down through the first loop and pull tight — it looks like an 8.', ar: 'أدخله من الحلقة الأولى واسحب — ستبدو مثل الرقم 8.' },
    ],
    tip: { en: 'Easy to check by eye and easy to untie, even after heavy load.', ar: 'سهلة الفحص بالنظر وسهلة الفك حتى بعد حمل ثقيل.' },
  },
  {
    id: 'roundturn', cat: 'boat_knots', level: 'easy', Art: Art.RoundTurn,
    title: { en: 'Round turn & two half hitches', ar: 'لفة كاملة ونصف عقدتين' },
    use: { en: 'Mooring to a ring, post or rail when the line is under load.', ar: 'الربط بحلقة أو عمود أو درابزين عندما يكون الحبل مشدوداً.' },
    steps: [
      { en: 'Pass the end around the ring twice (a round turn). This holds the load.', ar: 'مرّر الطرف حول الحلقة مرتين (لفة كاملة)؛ هذه تتحمّل الشد.' },
      { en: 'Make a half hitch around the standing part.', ar: 'اصنع نصف عقدة حول الجزء الثابت.' },
      { en: 'Make a second half hitch the same way and snug both down.', ar: 'اصنع نصف عقدة ثانية بالطريقة نفسها وشدّهما.' },
    ],
    tip: { en: 'You can tie and untie it while the boat is pulling on the line.', ar: 'يمكنك ربطها وفكّها بينما القارب يشدّ الحبل.' },
  },
  {
    id: 'sheetbend', cat: 'boat_knots', level: 'med', Art: Art.SheetBend,
    title: { en: 'Sheet bend', ar: 'عقدة الوصل' },
    use: { en: 'Joining two ropes, even of different thickness.', ar: 'وصل حبلين معاً حتى لو اختلفت سماكتهما.' },
    steps: [
      { en: 'Make a bight (U-shape) in the thicker rope.', ar: 'اصنع انحناءة (شكل U) في الحبل الأسمك.' },
      { en: 'Pass the thin rope up through the bight and around behind both parts.', ar: 'أدخل الحبل الرفيع من الأسفل عبر الانحناءة ولفّه خلف الجزأين.' },
      { en: 'Tuck it under itself (not through the bight) and pull tight.', ar: 'أدخله تحت نفسه (وليس من الانحناءة) ثم شدّ.' },
    ],
    tip: { en: 'Both short ends should finish on the same side of the knot.', ar: 'يجب أن ينتهي الطرفان القصيران في الجهة نفسها من العقدة.' },
  },
  {
    id: 'reef', cat: 'boat_knots', level: 'easy', Art: Art.ReefKnot,
    title: { en: 'Reef knot', ar: 'العقدة المربعة' },
    use: { en: 'Tying bundles, sail ties and bandages. Not for joining ropes under load.', ar: 'ربط الحزم وأربطة الشراع والضمادات. لا تستخدمها لوصل حبال مشدودة.' },
    steps: [
      { en: 'Right end over left end and under.', ar: 'الطرف الأيمن فوق الأيسر ثم تحته.' },
      { en: 'Left end over right end and under.', ar: 'الطرف الأيسر فوق الأيمن ثم تحته.' },
      { en: 'Pull tight. Both ends lie flat alongside their own part.', ar: 'شدّ. يستقر كل طرف بمحاذاة جزئه.' },
    ],
    tip: { en: 'If it looks crooked you tied a granny knot. Redo the second step the other way.', ar: 'إذا بدت مائلة فقد ربطت عقدة خاطئة. أعد الخطوة الثانية بالاتجاه المعاكس.' },
  },
  {
    id: 'clinch', cat: 'fishing_knots', level: 'easy', Art: Art.ClinchKnot,
    title: { en: 'Improved clinch knot', ar: 'عقدة الكلينش المحسّنة' },
    use: { en: 'Tying hooks, swivels and lures to monofilament line.', ar: 'ربط الخطاطيف والوصلات الدوّارة والطعوم بخيط النايلون.' },
    steps: [
      { en: 'Pass the line through the eye of the hook.', ar: 'أدخل الخيط من عين الخطاف.' },
      { en: 'Wrap the tag end around the line 5–7 times.', ar: 'لفّ الطرف حول الخيط 5 إلى 7 مرات.' },
      { en: 'Put the end through the small loop by the eye, then back through the big loop.', ar: 'أدخل الطرف من الحلقة الصغيرة عند العين، ثم من الحلقة الكبيرة.' },
      { en: 'Wet the knot, pull slowly tight and trim.', ar: 'بلّل العقدة، شدّها ببطء ثم قصّ الزائد.' },
    ],
    tip: { en: 'Always wet fishing knots before tightening so friction does not weaken the line.', ar: 'بلّل عقد الصيد دائماً قبل الشد حتى لا يضعف الاحتكاك الخيط.' },
  },
  {
    id: 'palomar', cat: 'fishing_knots', level: 'easy', Art: Art.PalomarKnot,
    title: { en: 'Palomar knot', ar: 'عقدة بالومار' },
    use: { en: 'One of the strongest hook knots, great for braided line.', ar: 'من أقوى عقد الخطاف، ممتازة للخيط المجدول.' },
    steps: [
      { en: 'Double 15 cm of line and pass the loop through the eye.', ar: 'اثنِ 15 سم من الخيط وأدخل الحلقة من العين.' },
      { en: 'Tie a loose overhand knot with the doubled line.', ar: 'اربط عقدة بسيطة مرتخية بالخيط المزدوج.' },
      { en: 'Pass the loop over the whole hook.', ar: 'مرّر الحلقة فوق الخطاف كاملاً.' },
      { en: 'Wet, pull both strands tight and trim.', ar: 'بلّل، اسحب الخيطين بقوة ثم قصّ.' },
    ],
    tip: { en: 'Keep the doubled line from twisting as you tie.', ar: 'امنع الخيط المزدوج من الالتفاف أثناء الربط.' },
  },
  {
    id: 'uni', cat: 'fishing_knots', level: 'med', Art: Art.UniKnot,
    title: { en: 'Uni knot', ar: 'عقدة يوني' },
    use: { en: 'A reliable all-round knot for hooks, and for joining two lines (double uni).', ar: 'عقدة موثوقة لكل الاستخدامات: للخطاف ولوصل خيطين (يوني مزدوجة).' },
    steps: [
      { en: 'Pass the line through the eye and lay the end back along the line.', ar: 'أدخل الخيط من العين وأعد الطرف بمحاذاة الخيط.' },
      { en: 'Form a loop with the end.', ar: 'كوّن حلقة بالطرف.' },
      { en: 'Wrap the end through the loop and around both lines 6 times.', ar: 'لفّ الطرف داخل الحلقة وحول الخيطين 6 مرات.' },
      { en: 'Pull the tag end, then slide the knot down to the eye.', ar: 'اسحب الطرف ثم أنزل العقدة حتى العين.' },
    ],
    tip: { en: 'For fluorocarbon, 4–5 wraps seat better than 6.', ar: 'مع خيط الفلوروكربون، 4 إلى 5 لفّات أفضل من 6.' },
  },
  {
    id: 'anchor', cat: 'anchoring', level: 'med', Art: Art.Anchoring,
    title: { en: 'Anchoring', ar: 'رمي المرساة' },
    use: { en: 'Holding position to fish, swim or rest.', ar: 'تثبيت القارب للصيد أو السباحة أو الاستراحة.' },
    steps: [
      { en: 'Choose sand or mud away from coral, channels and other boats. Check the depth.', ar: 'اختر قاعاً رملياً أو طينياً بعيداً عن المرجان والممرات والقوارب. تحقّق من العمق.' },
      { en: 'Head slowly into the wind or current and stop over the spot.', ar: 'اتجه ببطء عكس الريح أو التيار وتوقف فوق المكان.' },
      { en: 'Lower the anchor to the bottom — never throw it.', ar: 'أنزل المرساة حتى القاع — لا ترمها.' },
      { en: 'Drift back while paying out rope: at least 5 times the depth (7× in wind).', ar: 'تراجع مع إرخاء الحبل: 5 أضعاف العمق على الأقل (7 أضعاف مع الريح).' },
      { en: 'Cleat off and check landmarks to be sure the anchor is holding.', ar: 'اربط الحبل بالمربط وراقب معالم ثابتة للتأكد من ثبات المرساة.' },
    ],
    tip: { en: 'Never anchor from the stern of a small boat — waves can swamp it.', ar: 'لا ترسُ من مؤخرة قارب صغير أبداً — قد تغمره الأمواج.' },
  },
  {
    id: 'dock', cat: 'docking', level: 'med', Art: Art.Docking,
    title: { en: 'Coming alongside', ar: 'الاقتراب من الرصيف' },
    use: { en: 'Berthing at a marina pontoon or fuel dock.', ar: 'الرسو على رصيف المرسى أو محطة الوقود.' },
    steps: [
      { en: 'Put fenders out and prepare bow and stern lines before you arrive.', ar: 'أخرج الصدّامات وجهّز حبلي المقدمة والمؤخرة قبل الوصول.' },
      { en: 'Check wind and current — approach against the stronger one.', ar: 'راقب الريح والتيار — اقترب عكس الأقوى منهما.' },
      { en: 'Approach at dead-slow speed, 30–45° to the dock.', ar: 'اقترب بأبطأ سرعة وبزاوية 30–45° من الرصيف.' },
      { en: 'Near the dock, turn parallel and use a short burst of reverse to stop.', ar: 'قرب الرصيف استدر موازياً واستخدم دفعة قصيرة للخلف للتوقف.' },
      { en: 'Step off (don\'t jump) with the bow line and secure with a cleat hitch.', ar: 'انزل بهدوء (لا تقفز) مع حبل المقدمة واربطه بعقدة المربط.' },
    ],
    tip: { en: 'Only go as fast as you are willing to hit the dock.', ar: 'لا تتجاوز سرعة تقبل أن تصطدم بها بالرصيف.' },
  },
  {
    id: 'moor', cat: 'mooring', level: 'med', Art: Art.Mooring,
    title: { en: 'Picking up a mooring buoy', ar: 'الربط بعوامة الرسو' },
    use: { en: 'Using a fixed mooring instead of anchoring — protects coral and seabed.', ar: 'استخدام عوامة ثابتة بدل المرساة — يحمي المرجان وقاع البحر.' },
    steps: [
      { en: 'Look at how moored boats are lying: they point into the wind or current.', ar: 'انظر إلى اتجاه القوارب المربوطة؛ فهي تشير عكس الريح أو التيار.' },
      { en: 'Approach from downwind, pointing the same way, very slowly.', ar: 'اقترب من جهة اتجاه الريح وبالاتجاه نفسه وببطء شديد.' },
      { en: 'Crew signals the distance to the buoy with hand signs.', ar: 'يعطي أحد الطاقم إشارات يدوية للمسافة إلى العوامة.' },
      { en: 'Catch the pickup line with a boathook and secure it to the bow cleat.', ar: 'التقط حبل العوامة بالخطاف واربطه بمربط المقدمة.' },
    ],
    tip: { en: 'Keep the propeller away from the mooring line.', ar: 'أبقِ المروحة بعيدة عن حبل العوامة.' },
  },
  {
    id: 'rules', cat: 'navigation', level: 'easy', Art: Art.RulesOfRoad,
    title: { en: 'Who gives way?', ar: 'من يفسح الطريق؟' },
    use: { en: 'The basic rules for avoiding collisions between boats.', ar: 'القواعد الأساسية لتجنّب التصادم بين القوارب.' },
    steps: [
      { en: 'Crossing: the boat that has the other on its right (starboard) gives way.', ar: 'التقاطع: القارب الذي يرى الآخر على يمينه يفسح الطريق.' },
      { en: 'Head-on: both boats turn to their right.', ar: 'وجهاً لوجه: يستدير القاربان إلى اليمين.' },
      { en: 'Overtaking: the boat overtaking keeps clear.', ar: 'التجاوز: القارب المتجاوز يبتعد عن الآخر.' },
      { en: 'Power gives way to sail, and everyone keeps clear of ships and fishing nets.', ar: 'القارب الآلي يفسح للشراعي، والجميع يبتعد عن السفن وشباك الصيد.' },
      { en: 'At night: red light is the left side, green the right side.', ar: 'ليلاً: الضوء الأحمر يسار القارب والأخضر يمينه.' },
    ],
    tip: { en: 'Make your turn early and obvious so the other skipper understands.', ar: 'نفّذ الانعطاف مبكراً وبوضوح ليفهم القائد الآخر.' },
  },
  {
    id: 'launch', cat: 'launching', level: 'med', Art: Art.Launching,
    title: { en: 'Launching from a ramp', ar: 'إنزال القارب من المنحدر' },
    use: { en: 'Getting the boat off the trailer quickly and safely.', ar: 'إنزال القارب عن المقطورة بسرعة وأمان.' },
    steps: [
      { en: 'In the prep area: drain plug in, straps off, gear loaded, lines attached.', ar: 'في منطقة التجهيز: ركّب سدادة التصريف، فكّ الأحزمة، حمّل المعدات، واربط الحبال.' },
      { en: 'Reverse slowly down the ramp until the boat starts to float.', ar: 'ارجع ببطء على المنحدر حتى يبدأ القارب بالطفو.' },
      { en: 'Someone on shore holds the bow line.', ar: 'يمسك شخص على البر بحبل المقدمة.' },
      { en: 'Release the winch strap and push the boat off. Move the car quickly.', ar: 'فكّ حزام الونش وادفع القارب. أبعد السيارة بسرعة.' },
    ],
    tip: { en: 'Check the drain plug twice. It is the most common launch mistake.', ar: 'تحقّق من سدادة التصريف مرتين؛ فهي الخطأ الأكثر شيوعاً.' },
  },
  {
    id: 'recover', cat: 'recovery', level: 'med', Art: Art.Recovery,
    title: { en: 'Recovering onto a trailer', ar: 'تحميل القارب على المقطورة' },
    use: { en: 'Bringing the boat back onto the trailer at the end of the day.', ar: 'إعادة القارب إلى المقطورة في نهاية اليوم.' },
    steps: [
      { en: 'Back the trailer in until about two-thirds of the rollers are wet.', ar: 'أرجِع المقطورة حتى تغمر المياه ثلثي البكرات تقريباً.' },
      { en: 'Line the boat up with the trailer and approach slowly.', ar: 'اجعل القارب على خط المقطورة واقترب ببطء.' },
      { en: 'Attach the winch strap to the bow eye and winch the boat up.', ar: 'اربط حزام الونش بعين المقدمة واسحب القارب.' },
      { en: 'Raise the engine, pull out, then secure straps and remove the plug.', ar: 'ارفع المحرك، اخرج من الماء، ثم ثبّت الأحزمة وأزل السدادة.' },
    ],
    tip: { en: 'Rinse the engine and trailer with fresh water — salt water corrodes fast.', ar: 'اغسل المحرك والمقطورة بماء عذب — الملح يسبّب التآكل بسرعة.' },
  },
  {
    id: 'mob', cat: 'safety', level: 'adv', Art: Art.ManOverboard,
    title: { en: 'Person overboard', ar: 'سقوط شخص في البحر' },
    use: { en: 'What to do if someone falls in the water.', ar: 'ما يجب فعله إذا سقط شخص في الماء.' },
    steps: [
      { en: 'Shout "Man overboard!" and keep pointing at the person. Never lose sight.', ar: 'اصرخ «رجل في البحر!» واستمر بالإشارة إليه. لا تفقده من نظرك.' },
      { en: 'Throw a lifebuoy or anything that floats.', ar: 'ارمِ طوق النجاة أو أي شيء يطفو.' },
      { en: 'Save the position (Save point in Bahrna Navigate).', ar: 'احفظ الموقع (زر «حفظ نقطة» في ملاحة بحرنا).' },
      { en: 'Turn back and approach from downwind, slowly.', ar: 'استدر وارجع من جهة اتجاه الريح وببطء.' },
      { en: 'Stop the engine before the person is near the propeller. Help them aboard at the stern ladder.', ar: 'أطفئ المحرك قبل اقتراب الشخص من المروحة، وساعده للصعود من سلّم المؤخرة.' },
    ],
    tip: { en: 'If you cannot recover them quickly, call the Coast Guard (996) or a Mayday on VHF 16.', ar: 'إذا لم تتمكن من انتشاله بسرعة، اتصل بخفر السواحل (996) أو نداء استغاثة على القناة 16.' },
  },
  {
    id: 'mayday', cat: 'safety', level: 'easy', Art: Art.Mayday,
    title: { en: 'Mayday call on VHF', ar: 'نداء الاستغاثة على اللاسلكي' },
    use: { en: 'Calling for help when life or the boat is in immediate danger.', ar: 'طلب المساعدة عند وجود خطر مباشر على الأرواح أو القارب.' },
    steps: [
      { en: 'Select channel 16, high power. Press and hold the talk button.', ar: 'اختر القناة 16 بقوة عالية، واضغط زر التحدث باستمرار.' },
      { en: 'Say "MAYDAY, MAYDAY, MAYDAY, this is [boat name] ×3".', ar: 'قل «ماي داي، ماي داي، ماي داي، هنا [اسم القارب]» ثلاث مرات.' },
      { en: 'Give your position — read it from Bahrna SOS.', ar: 'أعطِ موقعك — اقرأه من شاشة النجدة في بحرنا.' },
      { en: 'Say what is wrong, what help you need and how many people are on board.', ar: 'قل ما المشكلة، وما المساعدة المطلوبة، وعدد الأشخاص على متن القارب.' },
      { en: 'Release the button and listen. Repeat if nobody answers.', ar: 'اترك الزر واستمع. كرّر إذا لم يرد أحد.' },
    ],
    tip: { en: 'By phone, the UAE Coast Guard number is 996.', ar: 'رقم خفر السواحل في الإمارات عبر الهاتف هو 996.' },
  },
  {
    id: 'lifejacket', cat: 'safety', level: 'easy', Art: Art.LifeJacket,
    title: { en: 'Wearing a life jacket', ar: 'ارتداء سترة النجاة' },
    use: { en: 'The single most effective piece of safety gear — if it is worn and fits.', ar: 'أهم معدات السلامة على الإطلاق — إذا كانت مرتدية ومناسبة المقاس.' },
    steps: [
      { en: 'Choose the right size for body weight; children need child jackets with a crotch strap.', ar: 'اختر المقاس المناسب للوزن؛ الأطفال يحتاجون سترات خاصة بحزام سفلي.' },
      { en: 'Close every buckle and zip, then tighten the straps.', ar: 'أغلق كل الإبزيمات والسحّاب ثم شدّ الأحزمة.' },
      { en: 'Lift at the shoulders — it should not slide up past the chin.', ar: 'ارفعها من الكتفين — يجب ألا ترتفع فوق الذقن.' },
      { en: 'Check inflatable jackets\' gas cylinder and indicator before every trip.', ar: 'افحص أسطوانة الغاز ومؤشر السترات القابلة للنفخ قبل كل رحلة.' },
    ],
    tip: { en: 'Wear it, don\'t stow it: there is rarely time to put one on in an emergency.', ar: 'ارتدِها ولا تخزّنها: نادراً ما يتوفر وقت لارتدائها في الطوارئ.' },
  },
];
