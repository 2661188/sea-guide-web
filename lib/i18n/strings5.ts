// v0.5 interface text (settings, checklists, wind explorer, dashboard, map, learn).
// Merged into the main dictionaries in strings.ts.

export const en5 = {
  nav_check: 'Checklist', nav_settings: 'Settings',
  made_in: 'Made in the Emirates',

  // Settings
  settings_title: 'Settings',
  follow_me: 'Follow me', follow_t: 'Sea trips, fishing and overlanding around the UAE.',
  follow_btn: 'Open Instagram',
  preferences: 'Preferences', theme: 'Appearance', theme_auto: 'Auto', theme_light: 'Light', theme_dark: 'Dark',
  default_activity: 'Main activity', default_spot: 'Home spot', change: 'Change',
  offline_data: 'Offline data',
  offline_t: 'The last forecast for each spot is kept on this phone, so the app still works at sea without signal.',
  saved_spots: '{n} spots saved', storage_used: '{kb} KB used', saved_at: 'Saved {time}', nothing_saved: 'Nothing saved yet. Open a spot while online to save it.',
  clear_forecasts: 'Clear saved forecasts', clear_all: 'Reset the app', clear_all_t: 'Removes forecasts, checklists and preferences from this device.',
  confirm_again: 'Tap again to confirm', done_label: 'Done',
  about: 'About', version: 'Version',

  // Checklists
  check_title: 'Ready to go?', check_for: 'Checklist for', check_sub: 'Tap items as you pack. Your list is saved on this phone.',
  add_item: 'Add your own item', add_btn: 'Add', delete_item: 'Delete {item}', reset_list: 'Restore ready-made list',
  clear_ticks: 'Untick all', progress: '{done} of {total} ready', all_ready: 'All set. Have a great time on the water.',
  edit_list: 'Edit list', finish_edit: 'Finish editing', custom: 'Yours',

  // Wind explorer
  wind_week: 'Wind explorer · 7 days', wind_hint: 'Drag the line or the slider to check the wind at any time this week.',
  wind_slider: 'Time to check the wind', gust_band: 'Gusts', mean_wind: 'Wind',
  bft: 'Force {n} · {name}',
  bft_0: 'Calm', bft_1: 'Light air', bft_2: 'Light breeze', bft_3: 'Gentle breeze', bft_4: 'Moderate breeze', bft_5: 'Fresh breeze', bft_6: 'Strong breeze', bft_7: 'Near gale', bft_8: 'Gale', bft_9: 'Strong gale', bft_10: 'Storm', bft_11: 'Violent storm', bft_12: 'Hurricane force',

  // Dashboard
  dash_title: 'Sea dashboard', sports_today: 'Sports right now', sports_split: '{good} good · {fair} fair · {poor} poor',
  of_sports: 'of 8 sports', hours_today: '{activity} · next 24 hours', best_hours: 'Best hours',
  tide_table: 'Tide table', type: 'Type', time: 'Time', height: 'Height', in_label: 'In',
  week_outlook: '7-day outlook', day: 'Day', max_wind: 'Wind', max_waves: 'Waves', rating: '{activity}',
  gauges: 'Right now', uv: 'UV index', uv_low: 'Low', uv_mod: 'Moderate', uv_high: 'High', uv_vhigh: 'Very high', uv_ext: 'Extreme',
  daylight: 'Daylight', daylight_left: '{h} h {m} min of daylight left', after_dark: 'After sunset', before_dawn: 'Before sunrise',
  air: 'Air', sea: 'Sea', temps: 'Temperature', compass: 'Wind direction', from_label: 'From',
  legend_good: 'Good', legend_fair: 'Fair', legend_poor: 'Poor', legend_none: 'No data', table_view: 'Hour-by-hour table',

  // Map
  map_title: 'UAE tide stations', map_sub: '{n} tide points along both coasts. Tap a point for its tide.',
  st_rising: 'Rising', st_falling: 'Falling', st_slack: 'Slack',
  st_next: 'Next', st_range: 'Range today', st_level: 'Now', set_home: 'Use as my spot', is_home: 'Your spot',
  open_maps: 'Directions', all_stations: 'All stations', station: 'Station', emirate: 'Emirate',
  arabian_gulf: 'Arabian Gulf', gulf_oman: 'Gulf of Oman', map_note: 'Model tide points, not official harbour gauges. Map: Natural Earth.',
  st_loading: 'Loading tides for all stations…', st_error: "Couldn't load station tides.",

  // Learn
  learn_title: 'Learn', knots: 'Knots', skills: 'Boating skills', safety_hdr: 'Safety & contacts',
  knots_sub: 'Knots every boater and angler should tie without thinking.', skills_sub: 'Core skills for day trips in UAE waters.',
  use_for: 'Use it for', steps: 'How to', tip: 'Tip', open: 'Open', difficulty: 'Level',
  lvl_easy: 'Easy', lvl_med: 'Medium', lvl_adv: 'Practice',
  step_n: 'Step {n}', of_n: '{n} steps',

  // Navigate
  nav_navigate: 'Navigate',
  gps_off: 'GPS off', gps_searching: 'GPS searching…', gps_searching_t: 'Move outdoors with a clear view of the sky.', gps_ok: 'GPS active', gps_weak: 'Weak GPS signal',
  gps_acc: '±{m} m', gps_denied: 'Location permission is off', gps_denied_t: 'Allow location for this site in your browser or phone settings, then tap Try again.',
  gps_unavail: 'Location unavailable', gps_unavail_t: 'Your phone could not get a position. Check that location is on.', gps_unsupported: 'This device cannot share its location.',
  perm_title: 'Use your location', perm_t: 'Bahrna uses your location to show your position, record your trip and help you return to your starting point. Your track stays on this phone.',
  perm_btn: 'Allow location', speed: 'Speed', cog: 'Course', distance: 'Distance', elapsed: 'Time', position: 'Position',
  start_trip: 'Start trip', end_trip: 'End trip', end_confirm: 'Tap again to end', return_start: 'Return to start', stop_return: 'Stop return',
  save_point: 'Save point', point_saved: 'Point saved', tracking: 'Recording', trip_resumed: 'Trip resumed after the app was closed.',
  to_start: 'To start', bearing: 'Bearing', eta: 'ETA', eta_na: 'Move to calculate', along_track: 'Along your track',
  follow_track: 'Follow your recorded track (orange) back to your starting point. A straight line may cross shallow water or hazards.',
  steer: 'Next track point', no_start: 'The start point is set at the first good GPS fix.',
  nav_aid: 'Navigation aid only, not certified navigation equipment. Keep a lookout and follow official charts and marine warnings.',
  fit: 'Show whole track', follow: 'Follow me', zoom_in: 'Zoom in', zoom_out: 'Zoom out',
  keep_open: 'Keep Bahrna open with the screen on while recording. Phones can pause web apps in the background.',
  sos: 'SOS', em_title: 'Emergency', em_coords: 'Your position', em_copy: 'Copy', em_copied: 'Copied', em_share: 'Share my location',
  em_call: 'Call Coast Guard {n}', em_call_police: 'Police {n}', em_save: 'Save this position', em_note: 'Read these coordinates to the Coast Guard. On VHF radio use channel 16.',
  em_no_fix: 'Waiting for a GPS position…', share_text: 'My position (Bahrna): {lat} {lon}',
  trip_complete: 'Trip complete', max_speed: 'Max speed', avg_speed: 'Avg speed', duration: 'Duration', start_pt: 'Start', end_pt: 'End',
  trip_name: 'Trip name', save_trip: 'Save trip', discard: 'Delete trip', discard_confirm: 'Tap again to delete',
  my_trips: 'My trips', no_trips: 'No trips yet. Start one from Navigate. Your track is saved on this phone.', back: 'Back', readiness: 'Trip readiness',
  trip_default: '{activity} trip', stations_link: 'Tide stations map', stations_t: 'Tide now at 17 points on both coasts.', waypoints: 'Saved points', wp_default: 'Point {n}',
  base_map: 'Base map: Natural Earth. Not a nautical chart. No depths or hazards shown.', recorded: 'Recorded',

  // Onboarding
  ob1_t: 'Your smart companion at sea.', ob2_h: 'Know the sea before you go.', ob2_t: 'Wind, waves, tide and weather for UAE waters.',
  ob3_h: 'Find your best fishing time.', ob3_t: 'Fishing windows from tide, light, moon and wind.',
  ob4_h: 'Navigate. Record. Return.', ob4_t: 'Record your track, even without mobile data, and follow it back to your start.',
  ob5_h: 'Plan. Go. Explore.', ob5_t: 'Checklists, knots and skills for every water sport.', ob_start: 'Start exploring', ob_skip: 'Skip', ob_next: 'Next',

  // Home
  all_day: 'All 24 hours', f_light: 'Light', today_at_sea: 'Today at sea', sea_conditions: 'Sea conditions', fish_today: 'Fishing today', top_windows: 'Best windows',
  updated_ago: 'Updated {m} min ago', updated_now: 'Updated just now', updated_h: 'Updated {h} h ago',
};

export type Key5 = keyof typeof en5;

export const ar5: Record<Key5, string> = {
  nav_check: 'التجهيز', nav_settings: 'الإعدادات',
  made_in: 'صُنع في الإمارات',

  settings_title: 'الإعدادات',
  follow_me: 'تابعني', follow_t: 'رحلات بحرية وصيد ومغامرات برية في الإمارات.',
  follow_btn: 'فتح إنستغرام',
  preferences: 'التفضيلات', theme: 'المظهر', theme_auto: 'تلقائي', theme_light: 'فاتح', theme_dark: 'داكن',
  default_activity: 'النشاط الرئيسي', default_spot: 'موقعي', change: 'تغيير',
  offline_data: 'البيانات دون اتصال',
  offline_t: 'تُحفظ آخر توقعات لكل موقع على هذا الهاتف، ليعمل التطبيق في البحر دون إشارة.',
  saved_spots: '{n} مواقع محفوظة', storage_used: '{kb} كيلوبايت مستخدمة', saved_at: 'حُفظ {time}', nothing_saved: 'لا شيء محفوظ بعد. افتح موقعاً أثناء الاتصال لحفظه.',
  clear_forecasts: 'مسح التوقعات المحفوظة', clear_all: 'إعادة ضبط التطبيق', clear_all_t: 'يحذف التوقعات وقوائم التحقق والتفضيلات من هذا الجهاز.',
  confirm_again: 'اضغط مرة أخرى للتأكيد', done_label: 'تم',
  about: 'حول التطبيق', version: 'الإصدار',

  check_title: 'جاهز للانطلاق؟', check_for: 'قائمة التحقق لـ', check_sub: 'اضغط على كل عنصر عند تجهيزه. تُحفظ قائمتك على هذا الهاتف.',
  add_item: 'أضف عنصراً خاصاً بك', add_btn: 'إضافة', delete_item: 'حذف {item}', reset_list: 'استعادة القائمة الجاهزة',
  clear_ticks: 'إلغاء كل العلامات', progress: '{done} من {total} جاهز', all_ready: 'كل شيء جاهز. استمتع بوقتك في البحر.',
  edit_list: 'تعديل القائمة', finish_edit: 'إنهاء التعديل', custom: 'خاص بك',

  wind_week: 'مستكشف الرياح · 7 أيام', wind_hint: 'اسحب الخط أو المؤشر لمعرفة الرياح في أي وقت هذا الأسبوع.',
  wind_slider: 'الوقت المطلوب للرياح', gust_band: 'الهبّات', mean_wind: 'الرياح',
  bft: 'القوة {n} · {name}',
  bft_0: 'هادئ', bft_1: 'نسيم خفيف جداً', bft_2: 'نسيم خفيف', bft_3: 'نسيم لطيف', bft_4: 'نسيم معتدل', bft_5: 'نسيم منعش', bft_6: 'رياح قوية', bft_7: 'شبه عاصفة', bft_8: 'عاصفة', bft_9: 'عاصفة قوية', bft_10: 'عاصفة شديدة', bft_11: 'عاصفة عنيفة', bft_12: 'إعصار',

  dash_title: 'لوحة البحر', sports_today: 'الرياضات الآن', sports_split: '{good} جيد · {fair} مقبول · {poor} غير مناسب',
  of_sports: 'من 8 رياضات', hours_today: '{activity} · الساعات الـ24 القادمة', best_hours: 'أفضل الساعات',
  tide_table: 'جدول المد والجزر', type: 'النوع', time: 'الوقت', height: 'الارتفاع', in_label: 'بعد',
  week_outlook: 'توقعات 7 أيام', day: 'اليوم', max_wind: 'الرياح', max_waves: 'الأمواج', rating: '{activity}',
  gauges: 'الآن', uv: 'مؤشر الأشعة فوق البنفسجية', uv_low: 'منخفض', uv_mod: 'متوسط', uv_high: 'مرتفع', uv_vhigh: 'مرتفع جداً', uv_ext: 'شديد',
  daylight: 'ضوء النهار', daylight_left: 'متبقٍ {h} س {m} د من ضوء النهار', after_dark: 'بعد الغروب', before_dawn: 'قبل الشروق',
  air: 'الهواء', sea: 'البحر', temps: 'الحرارة', compass: 'اتجاه الرياح', from_label: 'من',
  legend_good: 'جيد', legend_fair: 'مقبول', legend_poor: 'غير مناسب', legend_none: 'لا بيانات', table_view: 'جدول ساعة بساعة',

  map_title: 'محطات المد والجزر في الإمارات', map_sub: '{n} نقطة للمد والجزر على الساحلين. اضغط على نقطة لمعرفة المد.',
  st_rising: 'مد', st_falling: 'جزر', st_slack: 'ركود',
  st_next: 'التالي', st_range: 'المدى اليوم', st_level: 'الآن', set_home: 'اجعله موقعي', is_home: 'موقعك',
  open_maps: 'الاتجاهات', all_stations: 'كل المحطات', station: 'المحطة', emirate: 'الإمارة',
  arabian_gulf: 'الخليج العربي', gulf_oman: 'خليج عُمان', map_note: 'نقاط مد وجزر من نموذج رقمي، وليست مقاييس موانئ رسمية. الخريطة: Natural Earth.',
  st_loading: 'جارٍ تحميل المد والجزر لكل المحطات…', st_error: 'تعذّر تحميل بيانات المحطات.',

  learn_title: 'تعلّم', knots: 'العقد', skills: 'مهارات القيادة', safety_hdr: 'السلامة وأرقام الطوارئ',
  knots_sub: 'عقد يجب أن يربطها كل بحّار وصيّاد دون تفكير.', skills_sub: 'مهارات أساسية للرحلات النهارية في مياه الإمارات.',
  use_for: 'تُستخدم لـ', steps: 'الطريقة', tip: 'نصيحة', open: 'فتح', difficulty: 'المستوى',
  lvl_easy: 'سهل', lvl_med: 'متوسط', lvl_adv: 'تحتاج تمريناً',
  step_n: 'الخطوة {n}', of_n: '{n} خطوات',

  nav_navigate: 'الملاحة',
  gps_off: 'GPS متوقف', gps_searching: 'جارٍ البحث عن GPS…', gps_searching_t: 'تحرّك إلى مكان مكشوف للسماء.', gps_ok: 'GPS يعمل', gps_weak: 'إشارة GPS ضعيفة',
  gps_acc: '±{m} م', gps_denied: 'إذن الموقع مغلق', gps_denied_t: 'اسمح بالموقع لهذا الموقع من إعدادات المتصفح أو الهاتف، ثم اضغط «حاول مرة أخرى».',
  gps_unavail: 'الموقع غير متاح', gps_unavail_t: 'لم يتمكن الهاتف من تحديد موقعك. تأكد من تشغيل خدمة الموقع.', gps_unsupported: 'هذا الجهاز لا يستطيع مشاركة موقعه.',
  perm_title: 'استخدام موقعك', perm_t: 'يستخدم بحرنا موقعك لعرض مكانك وتسجيل رحلتك ومساعدتك على العودة إلى نقطة الانطلاق. يبقى مسارك على هذا الهاتف فقط.',
  perm_btn: 'السماح بالموقع', speed: 'السرعة', cog: 'الاتجاه', distance: 'المسافة', elapsed: 'المدة', position: 'الموقع',
  start_trip: 'ابدأ الرحلة', end_trip: 'إنهاء الرحلة', end_confirm: 'اضغط مرة أخرى للإنهاء', return_start: 'العودة للبداية', stop_return: 'إيقاف العودة',
  save_point: 'حفظ نقطة', point_saved: 'تم حفظ النقطة', tracking: 'جارٍ التسجيل', trip_resumed: 'استُؤنفت الرحلة بعد إغلاق التطبيق.',
  to_start: 'إلى البداية', bearing: 'الاتجاه', eta: 'الوصول المتوقع', eta_na: 'تحرّك لحسابه', along_track: 'على مسارك',
  follow_track: 'اتبع مسارك المسجّل (البرتقالي) للعودة إلى نقطة البداية. الخط المستقيم قد يمر فوق مياه ضحلة أو مخاطر.',
  steer: 'النقطة التالية على المسار', no_start: 'تُحدَّد نقطة البداية عند أول قراءة GPS دقيقة.',
  nav_aid: 'أداة مساعدة للملاحة فقط وليست جهاز ملاحة معتمداً. راقب محيطك واتبع الخرائط البحرية والتحذيرات الرسمية.',
  fit: 'عرض المسار كاملاً', follow: 'تتبّعني', zoom_in: 'تكبير', zoom_out: 'تصغير',
  keep_open: 'أبقِ بحرنا مفتوحاً والشاشة مضاءة أثناء التسجيل. قد يوقف الهاتف تطبيقات الويب في الخلفية.',
  sos: 'نجدة', em_title: 'الطوارئ', em_coords: 'موقعك', em_copy: 'نسخ', em_copied: 'تم النسخ', em_share: 'مشاركة موقعي',
  em_call: 'اتصل بخفر السواحل {n}', em_call_police: 'الشرطة {n}', em_save: 'حفظ هذا الموقع', em_note: 'اقرأ هذه الإحداثيات لخفر السواحل. على اللاسلكي VHF استخدم القناة 16.',
  em_no_fix: 'بانتظار تحديد الموقع…', share_text: 'موقعي (بحرنا): {lat} {lon}',
  trip_complete: 'انتهت الرحلة', max_speed: 'أعلى سرعة', avg_speed: 'متوسط السرعة', duration: 'المدة', start_pt: 'البداية', end_pt: 'النهاية',
  trip_name: 'اسم الرحلة', save_trip: 'حفظ الرحلة', discard: 'حذف الرحلة', discard_confirm: 'اضغط مرة أخرى للحذف',
  my_trips: 'رحلاتي', no_trips: 'لا توجد رحلات بعد. ابدأ رحلة من صفحة الملاحة، ويُحفظ مسارك على هذا الهاتف.', back: 'رجوع', readiness: 'جاهزية الرحلة',
  trip_default: 'رحلة {activity}', stations_link: 'خريطة محطات المد والجزر', stations_t: 'حالة المد الآن في 17 نقطة على الساحلين.', waypoints: 'النقاط المحفوظة', wp_default: 'نقطة {n}',
  base_map: 'الخريطة الأساسية: Natural Earth. ليست خريطة بحرية ولا تعرض الأعماق أو المخاطر.', recorded: 'مسجّل',

  ob1_t: 'رفيقك الذكي في البحر.', ob2_h: 'اعرف البحر قبل أن تبحر.', ob2_t: 'الرياح والأمواج والمد والجزر والطقس في مياه الإمارات.',
  ob3_h: 'اعرف أفضل وقت للصيد.', ob3_t: 'فترات صيد مبنية على المد والضوء والقمر والرياح.',
  ob4_h: 'أبحر. سجّل. ارجع.', ob4_t: 'سجّل مسارك حتى دون بيانات الجوال، واتبعه للعودة إلى نقطة البداية.',
  ob5_h: 'خطّط. انطلق. استكشف.', ob5_t: 'قوائم تجهيز وعقد ومهارات لكل رياضة بحرية.', ob_start: 'ابدأ الاستكشاف', ob_skip: 'تخطي', ob_next: 'التالي',

  all_day: 'طوال 24 ساعة', f_light: 'الضوء', today_at_sea: 'البحر اليوم', sea_conditions: 'حالة البحر', fish_today: 'حالة الصيد اليوم', top_windows: 'أفضل الأوقات',
  updated_ago: 'آخر تحديث قبل {m} د', updated_now: 'حُدِّث الآن', updated_h: 'آخر تحديث قبل {h} س',
};
