// v0.6 interface text: chart plotter, waypoints, routes, guidance, alarms, GPX, boat profile.
// Merged into the main dictionaries in strings.ts.

export const en6 = {
  // General
  save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', copy: 'Copy', share: 'Share', copied: 'Copied', ok: 'OK', undo: 'Undo', go: 'Go',
  unit_min: 'min', unit_h: 'h',

  // Chart
  chart: 'Chart', layers: 'Chart layers',
  ly_map: 'Map', ly_map_t: 'OpenStreetMap: coast, marinas, roads',
  ly_sat: 'Satellite', ly_sat_t: 'Esri imagery: reefs and shallows are often visible',
  ly_depth: 'Seabed relief', ly_depth_t: 'GEBCO depth shading (~450 m grid). Reference only',
  ly_offline: 'Offline', ly_offline_t: 'Built-in coastline. Works with no signal',
  ly_seamarks: 'Seamarks (OpenSeaMap)', ly_seamarks_t: 'Buoys, lights and beacons from the community map',
  chart_note: 'Not a nautical chart. Depths, buoys and hazards may be missing or wrong. Areas you view are kept on this phone for offline use.',
  tab_nav: 'Navigate', tab_marks: 'Waypoints', tab_routes: 'Routes', tab_tools: 'Tools',
  long_press_hint: 'Tip: press and hold anywhere on the chart to drop a waypoint.',

  // Waypoints
  add_wp: 'Add waypoint', new_wp: 'New waypoint', edit_wp: 'Waypoint', wp_name: 'Name', wp_type: 'Type',
  coordinates: 'Coordinates', coord_hint: 'Type or paste, e.g. 25°04.512′N 055°07.404′E or 25.0752, 55.1234',
  coord_bad: 'Check the coordinates: they could not be read.', depth_m: 'Depth (m)', notes: 'Notes',
  go_to: 'Go to', drop_here: 'Drop at crosshair', at_boat: 'At my boat', no_wps: 'No waypoints yet. Press and hold on the chart, or tap Add waypoint.',
  wk_mark: 'Mark', wk_fish: 'Fishing', wk_dive: 'Dive', wk_anchor: 'Anchorage', wk_marina: 'Marina', wk_ramp: 'Ramp', wk_fuel: 'Fuel', wk_hazard: 'Hazard', wk_fav: 'Favourite',

  // Routes
  route: 'Route', route_default: 'Route {n}', new_route: 'New route', edit_route: 'Edit route', route_name: 'Route name',
  plan_route: 'Plan route', plan_hint: 'Tap the chart to add points. Tap near a waypoint to use it.', plan_pts: '{n} points',
  plan_need2: 'Add at least 2 points.', route_saved: 'Route saved', save_route: 'Save route', no_routes: 'No routes yet. Tap New route and tap the chart to plan one.',
  n_points: '{n} points', start_away: 'start {d} away', my_position: 'My position', add_boat_pt: 'Add my position',
  navigate_route: 'Navigate', reverse: 'Reverse', edit_on_chart: 'Edit on chart', point: 'Point', brg: 'BRG', leg: 'Leg', dist: 'DTW',
  time_at: 'Time @ {kn} kn', fuel: 'Fuel',

  // Guidance
  going_to: 'Going to', leg_of: 'leg {n} of {total}', arrived: 'Arrived', rel_head: 'vs heading', true_north: 'north up',
  ttg: 'Time to go', xte: 'Off track', steer_left: 'Steer left', steer_right: 'Steer right', to_end: 'To the end', vmg: 'Speed made good',
  prev_wp: 'Back', next_wp: 'Next point', stop_nav: 'Stop',
  al_arrive: 'Reached {name}. Heading for the next point.', al_end: 'Arrived at {name}.', al_xte: 'Off course: steer back to the route line.',
  al_anchor: 'Anchor alarm: the boat has moved outside the circle.',

  // Anchor + alarms
  anchor_set: 'Anchor alarm', anchor_alarm: 'Anchor alarm', anchor_on: 'Anchor watch on', anchor_off: 'Turn off',
  anchor_t: 'Drop anchor first, then choose a radius. The alarm sounds if the boat drifts outside it. Keep this screen open.',
  anchor_drift: 'Distance from anchor', alarms: 'Alarms', arrive_radius: 'Arrival radius', xte_limit: 'Off-course limit (NM)', alarm_sound: 'Alarm sound',

  // GPX
  gpx_title: 'Import / export (GPX)', gpx_t: 'Move waypoints, routes and tracks to and from Navionics, Garmin, OpenCPN or Google Earth.',
  import_gpx: 'Import GPX', export_gpx: 'Export all', imported: 'Imported {w} waypoints, {r} routes, {t} tracks',
  import_bad: 'That file could not be read as GPX.',

  // Trips page
  routes_reg: 'Routes', tracks: 'Tracks', open_on_chart: 'Open on chart', save_as_route: 'Save as route', route_from_track: 'Route saved from the track',
  nav_registry: 'Your routes, waypoints and tracks are stored on this phone only.',

  // Boat + settings
  my_boat: 'My boat', boat_t: 'Used for route times and fuel estimates.', boat_name: 'Boat name', boat_type: 'Type',
  bt_speedboat: 'Speedboat', bt_fishing: 'Fishing boat', bt_yacht: 'Motor yacht', bt_sail: 'Sailboat', bt_jetski: 'Jet ski', bt_kayak: 'Kayak / SUP', bt_other: 'Other',
  length_ft: 'Length (ft)', cruise_kn: 'Cruise speed (kn)', burn_lph: 'Fuel use at cruise (L/h)', tank_l: 'Tank (L)', range_nm: 'Range about {nm} NM',
  map_cache: 'Saved chart tiles', tiles_saved: '{n} chart tiles saved for offline use', clear_tiles: 'Clear chart tiles',
};

export const ar6: Record<keyof typeof en6, string> = {
  save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', copy: 'نسخ', share: 'مشاركة', copied: 'تم النسخ', ok: 'حسناً', undo: 'تراجع', go: 'انطلق',
  unit_min: 'د', unit_h: 'س',

  chart: 'الخريطة', layers: 'طبقات الخريطة',
  ly_map: 'خريطة', ly_map_t: 'OpenStreetMap: الساحل والمراسي والطرق',
  ly_sat: 'قمر صناعي', ly_sat_t: 'صور Esri: تظهر الشعاب والمياه الضحلة غالباً',
  ly_depth: 'تضاريس القاع', ly_depth_t: 'تظليل الأعماق من GEBCO (شبكة ~450 م). للاسترشاد فقط',
  ly_offline: 'بدون إنترنت', ly_offline_t: 'خط ساحل مدمج يعمل بدون إشارة',
  ly_seamarks: 'العلامات البحرية (OpenSeaMap)', ly_seamarks_t: 'العوامات والفنارات والإشارات من الخريطة المجتمعية',
  chart_note: 'ليست خريطة بحرية معتمدة. قد تكون الأعماق والعوامات والمخاطر ناقصة أو غير دقيقة. تُحفظ المناطق التي تتصفحها على هاتفك للاستخدام بدون إنترنت.',
  tab_nav: 'الملاحة', tab_marks: 'النقاط', tab_routes: 'المسارات', tab_tools: 'أدوات',
  long_press_hint: 'تلميح: اضغط مطولاً على أي مكان في الخريطة لإضافة نقطة.',

  add_wp: 'إضافة نقطة', new_wp: 'نقطة جديدة', edit_wp: 'نقطة', wp_name: 'الاسم', wp_type: 'النوع',
  coordinates: 'الإحداثيات', coord_hint: 'اكتب أو الصق، مثل 25°04.512′N 055°07.404′E أو 25.0752, 55.1234',
  coord_bad: 'تحقق من الإحداثيات: تعذّرت قراءتها.', depth_m: 'العمق (م)', notes: 'ملاحظات',
  go_to: 'اذهب إلى', drop_here: 'ضع عند العلامة', at_boat: 'عند قاربي', no_wps: 'لا توجد نقاط بعد. اضغط مطولاً على الخريطة أو اختر إضافة نقطة.',
  wk_mark: 'علامة', wk_fish: 'صيد', wk_dive: 'غوص', wk_anchor: 'مرسى', wk_marina: 'مارينا', wk_ramp: 'منزلق', wk_fuel: 'وقود', wk_hazard: 'خطر', wk_fav: 'مفضلة',

  route: 'المسار', route_default: 'مسار {n}', new_route: 'مسار جديد', edit_route: 'تعديل المسار', route_name: 'اسم المسار',
  plan_route: 'خطط مساراً', plan_hint: 'اضغط على الخريطة لإضافة نقاط. اضغط قرب نقطة محفوظة لاستخدامها.', plan_pts: '{n} نقاط',
  plan_need2: 'أضف نقطتين على الأقل.', route_saved: 'تم حفظ المسار', save_route: 'حفظ المسار', no_routes: 'لا توجد مسارات بعد. اختر مسار جديد واضغط على الخريطة للتخطيط.',
  n_points: '{n} نقاط', start_away: 'البداية على بعد {d}', my_position: 'موقعي', add_boat_pt: 'أضف موقعي',
  navigate_route: 'ابدأ الملاحة', reverse: 'عكس الاتجاه', edit_on_chart: 'تعديل على الخريطة', point: 'النقطة', brg: 'الاتجاه', leg: 'المرحلة', dist: 'المسافة',
  time_at: 'الوقت بسرعة {kn} عقدة', fuel: 'الوقود',

  going_to: 'متجه إلى', leg_of: 'المرحلة {n} من {total}', arrived: 'وصلت', rel_head: 'نسبة لاتجاهك', true_north: 'الشمال للأعلى',
  ttg: 'الوقت المتبقي', xte: 'الانحراف', steer_left: 'انعطف يساراً', steer_right: 'انعطف يميناً', to_end: 'حتى النهاية', vmg: 'السرعة الفعلية نحو الهدف',
  prev_wp: 'السابق', next_wp: 'النقطة التالية', stop_nav: 'إيقاف',
  al_arrive: 'وصلت إلى {name}. التوجه إلى النقطة التالية.', al_end: 'وصلت إلى {name}.', al_xte: 'خرجت عن المسار: عد إلى خط المسار.',
  al_anchor: 'إنذار المرساة: خرج القارب من الدائرة.',

  anchor_set: 'إنذار المرساة', anchor_alarm: 'إنذار المرساة', anchor_on: 'مراقبة المرساة مفعّلة', anchor_off: 'إيقاف',
  anchor_t: 'أنزل المرساة أولاً ثم اختر نصف القطر. يُطلق الإنذار إذا انجرف القارب خارجه. أبقِ هذه الشاشة مفتوحة.',
  anchor_drift: 'البعد عن المرساة', alarms: 'الإنذارات', arrive_radius: 'نطاق الوصول', xte_limit: 'حد الانحراف (ميل)', alarm_sound: 'صوت الإنذار',

  gpx_title: 'استيراد / تصدير (GPX)', gpx_t: 'انقل النقاط والمسارات والرحلات من وإلى Navionics وGarmin وOpenCPN وGoogle Earth.',
  import_gpx: 'استيراد GPX', export_gpx: 'تصدير الكل', imported: 'تم استيراد {w} نقاط و{r} مسارات و{t} رحلات',
  import_bad: 'تعذّرت قراءة الملف بصيغة GPX.',

  routes_reg: 'المسارات', tracks: 'الرحلات المسجلة', open_on_chart: 'افتح على الخريطة', save_as_route: 'احفظ كمسار', route_from_track: 'تم حفظ مسار من الرحلة',
  nav_registry: 'مساراتك ونقاطك ورحلاتك محفوظة على هذا الهاتف فقط.',

  my_boat: 'قاربي', boat_t: 'يُستخدم لحساب أوقات المسار والوقود.', boat_name: 'اسم القارب', boat_type: 'النوع',
  bt_speedboat: 'قارب سريع', bt_fishing: 'قارب صيد', bt_yacht: 'يخت', bt_sail: 'قارب شراعي', bt_jetski: 'جت سكي', bt_kayak: 'كاياك / لوح', bt_other: 'أخرى',
  length_ft: 'الطول (قدم)', cruise_kn: 'سرعة الإبحار (عقدة)', burn_lph: 'استهلاك الوقود (لتر/ساعة)', tank_l: 'الخزان (لتر)', range_nm: 'المدى نحو {nm} ميل',
  map_cache: 'أجزاء الخريطة المحفوظة', tiles_saved: '{n} جزءاً من الخريطة محفوظة للاستخدام بدون إنترنت', clear_tiles: 'مسح أجزاء الخريطة',
};
