// Finishes the iOS project after `npx cap add ios` (the ios/ folder is made fresh on
// GitHub's Mac for every build, so all iOS settings live here, in one place).
//  - permission texts shown by iOS (English + Arabic in the same text)
//  - background location for trip recording / navigation
//  - iPhone only, portrait only, 64-bit devices
//  - "no special encryption" answer for App Store export rules
//  - app icon without transparency (App Store rejects icons with an alpha channel)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const APP = 'ios/App/App';
const PLIST = join(APP, 'Info.plist');
const PBX = 'ios/App/App.xcodeproj/project.pbxproj';
if (!existsSync(PLIST)) { console.error('Run "npx cap add ios" first: ' + PLIST + ' is missing'); process.exit(1); }

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const str = (k, v) => `\t<key>${k}</key>\n\t<string>${esc(v)}</string>\n`;
const usage = {
  NSLocationWhenInUseUsageDescription:
    'Bahrna uses your location to show where you are on the sea map, record your trips and guide you to waypoints. ' +
    'يستخدم بحرنا موقعك لعرض مكانك على خريطة البحر وتسجيل رحلاتك وإرشادك إلى النقاط.',
  NSLocationAlwaysAndWhenInUseUsageDescription:
    'Bahrna keeps recording your trip and guiding you while the screen is off, only after you start a trip or navigation. Your track stays on your phone. ' +
    'يواصل بحرنا تسجيل رحلتك وإرشادك والشاشة مقفلة، فقط بعد ما تبدأ رحلة أو ملاحة. مسارك يبقى في هاتفك.',
  NSMicrophoneUsageDescription:
    'Bahrna uses the microphone only when you ask it a question by voice. ' +
    'يستخدم بحرنا الميكروفون فقط لما تسأله بصوتك.',
  NSSpeechRecognitionUsageDescription:
    'Bahrna turns your spoken question into text so it can answer you. ' +
    'يحوّل بحرنا سؤالك المنطوق إلى نص حتى يرد عليك.',
  NSCameraUsageDescription:
    'Bahrna lets you take a photo of your catch for your own catch log. ' +
    'يتيح لك بحرنا تصوير صيدك وحفظه في سجل صيدك.',
  NSPhotoLibraryUsageDescription:
    'Bahrna lets you pick a photo of your catch for your own catch log. ' +
    'يتيح لك بحرنا اختيار صورة صيدك لسجل صيدك.',
};

let p = readFileSync(PLIST, 'utf8');
// 64-bit devices only
p = p.replace(/<string>armv7<\/string>/, '<string>arm64</string>');
// iPhone: portrait only
p = p.replace(
  /(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/,
  '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2',
);
let add = '';
for (const [k, v] of Object.entries(usage)) if (!p.includes(`<key>${k}</key>`)) add += str(k, v);
if (!p.includes('<key>UIBackgroundModes</key>')) add += '\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>location</string>\n\t</array>\n';
if (!p.includes('<key>ITSAppUsesNonExemptEncryption</key>')) add += '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n';
if (!p.includes('<key>CFBundleLocalizations</key>')) add += '\t<key>CFBundleLocalizations</key>\n\t<array>\n\t\t<string>en</string>\n\t\t<string>ar</string>\n\t</array>\n';
const end = p.lastIndexOf('</dict>');
p = p.slice(0, end) + add + p.slice(end);
p = p.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, '$1Bahrna$2');
writeFileSync(PLIST, p);
console.log('Info.plist ready');

// Apple privacy manifest: no tracking, no data collected; reasons for the system APIs
// the app framework uses (settings storage, file dates, boot time, free space).
const reason = (cat, code) => `\t\t<dict>\n\t\t\t<key>NSPrivacyAccessedAPIType</key>\n\t\t\t<string>${cat}</string>\n\t\t\t<key>NSPrivacyAccessedAPITypeReasons</key>\n\t\t\t<array><string>${code}</string></array>\n\t\t</dict>\n`;
writeFileSync(join(APP, 'PrivacyInfo.xcprivacy'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>NSPrivacyTracking</key>
\t<false/>
\t<key>NSPrivacyTrackingDomains</key>
\t<array/>
\t<key>NSPrivacyCollectedDataTypes</key>
\t<array/>
\t<key>NSPrivacyAccessedAPITypes</key>
\t<array>
${reason('NSPrivacyAccessedAPICategoryUserDefaults', 'CA92.1')}${reason('NSPrivacyAccessedAPICategoryFileTimestamp', 'C617.1')}${reason('NSPrivacyAccessedAPICategorySystemBootTime', '35F9.1')}${reason('NSPrivacyAccessedAPICategoryDiskSpace', 'E174.1')}\t</array>
</dict>
</plist>
`);

// iPhone only (no iPad build, so no iPad screenshots or iPad review needed)
if (existsSync(PBX)) {
  let x = readFileSync(PBX, 'utf8');
  x = x.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = 1;');
  // add PrivacyInfo.xcprivacy to the app (file, group and "Copy Bundle Resources")
  if (!x.includes('PrivacyInfo.xcprivacy')) {
    const F = 'B4A11A0E2C00000000000001', B = 'B4A11A0E2C00000000000002';
    const cfgRef = x.match(/(\w{24}) \/\* capacitor\.config\.json \*\/ = \{isa = PBXFileReference/);
    const cfgBuild = x.match(/(\w{24}) \/\* capacitor\.config\.json in Resources \*\/ = \{isa = PBXBuildFile/);
    if (!cfgRef || !cfgBuild) { console.error('Xcode project layout changed: cannot add PrivacyInfo.xcprivacy'); process.exit(1); }
    x = x.replace('/* End PBXBuildFile section */', `\t\t${B} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${F} /* PrivacyInfo.xcprivacy */; };\n/* End PBXBuildFile section */`);
    x = x.replace('/* End PBXFileReference section */', `\t\t${F} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n/* End PBXFileReference section */`);
    x = x.replace(`\t\t\t\t${cfgRef[1]} /* capacitor.config.json */,\n`, (m) => m + `\t\t\t\t${F} /* PrivacyInfo.xcprivacy */,\n`);
    x = x.replace(`\t\t\t\t${cfgBuild[1]} /* capacitor.config.json in Resources */,\n`, (m) => m + `\t\t\t\t${B} /* PrivacyInfo.xcprivacy in Resources */,\n`);
    if ((x.match(/PrivacyInfo\.xcprivacy/g) || []).length !== 6) { console.error('Could not add PrivacyInfo.xcprivacy to the Xcode project'); process.exit(1); }
    console.log('Privacy manifest added');
  }
  writeFileSync(PBX, x);
  console.log('Xcode project: iPhone only');
}

// App icon: remove transparency
const ICONS = join(APP, 'Assets.xcassets/AppIcon.appiconset');
if (existsSync(ICONS)) {
  let sharp;
  try { sharp = (await import('sharp')).default; } catch { console.warn('sharp not installed: icon alpha not removed'); }
  if (sharp) {
    for (const f of readdirSync(ICONS).filter((n) => n.endsWith('.png'))) {
      const file = join(ICONS, f);
      const buf = await sharp(file).flatten({ background: '#05253A' }).removeAlpha().png().toBuffer();
      writeFileSync(file, buf);
      console.log('icon without alpha: ' + f);
    }
  }
}
