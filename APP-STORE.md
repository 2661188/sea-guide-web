# Bahrna on the Apple App Store

No Mac is needed. GitHub's Mac servers build the iPhone app (workflow **iOS app**,
`.github/workflows/ios.yml`) and upload it to App Store Connect with an API key.

- Bundle ID: `ae.bahrna.app` (same as Google Play)
- iPhone only, portrait, iOS 15 or newer
- Version = `version` in package.json (0.11.0); build number = workflow run number
- Price: Free (a "Bahrna Pro" yearly subscription can be added later; safety features stay free)

## 1. After Apple approves your developer account

You get an email "Welcome to the Apple Developer Program". Then:

### a) Register the app ID
1. Open https://developer.apple.com/account/resources/identifiers/list
2. Click **+** → **App IDs** → Continue → **App** → Continue.
3. Description: `Bahrna`. Bundle ID: **Explicit** → `ae.bahrna.app`.
4. Don't tick any capability. Continue → Register.

### b) Create the app in App Store Connect
1. Open https://appstoreconnect.apple.com/apps → **+** → **New App**.
2. Platforms: **iOS**. Name: `Bahrna – بحرنا`. Primary language: **English (U.S.)**.
3. Bundle ID: pick `ae.bahrna.app`. SKU: `bahrna-ios`. User access: **Full Access**. Create.

### c) Make the API key for GitHub
1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**.
   (The first time, click **Request Access** and accept.)
2. **Team Keys** → **+** (Generate API Key). Name: `GitHub Bahrna`. Access: **Admin**.
   (Admin is needed so Apple's cloud signing can make the App Store certificate.)
3. Click **Download** next to the new key. You can download it ONLY ONCE. Keep the file
   `AuthKey_XXXXXXXXXX.p8` private (same as the Android upload key).
4. Note the **Key ID** (in the row) and the **Issuer ID** (above the list).

### d) Find your Team ID
https://developer.apple.com/account → **Membership details** → **Team ID** (10 characters).

## 2. Add 4 secrets on GitHub

GitHub → sea-guide-web → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret** (same screen as the Android secrets):

| Name | Value |
|---|---|
| `APPLE_TEAM_ID` | Team ID (10 characters) |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID (long, with dashes) |
| `ASC_KEY_P8` | open the .p8 file with Notepad, copy ALL the text including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` |

## 3. Build and upload

GitHub → **Actions** → **iOS app** → **Run workflow**. About 15–25 minutes.
Green tick = the build was uploaded. After Apple's processing (10–30 min) it appears in
App Store Connect → Bahrna → **TestFlight**.

- Without the secrets the workflow only checks the iPhone app compiles (nothing uploaded).
- Encryption question: already answered in the app ("no non-exempt encryption").

### Test on your iPhone (TestFlight)
App Store Connect → TestFlight → **Internal Testing** → **+** → add yourself → install the
**TestFlight** app on the iPhone → open the invite. Check before sending for review:
location permission (While Using, then Always when a trip starts), trip recording with the
screen locked, voice question in English and Arabic, spoken answers, notifications,
offline map, Arabic layout.

## 4. App Store page (App Store Connect → Bahrna → App Store tab)

- **Category**: Navigation; secondary: Weather.
- **Privacy Policy URL**: https://bahrna.vercel.app/privacy
- **Support URL**: https://bahrna.vercel.app (contact 2661188@gmail.com)
- **Screenshots**: iPhone 6.9" (1320 × 2868), English and Arabic. iPad not needed (iPhone-only app).
- **Text**: name, subtitle, description, keywords from `store/listing.md` (Apple limits:
  subtitle 30, keywords 100 characters).
- **Age rating**: answer "None" to everything → 4+.
- **App Privacy** → **Data Not Collected** (true while the online AI captain is switched
  off: location, trips, catches and boat data stay on the phone). Change this before
  turning the online captain on.
- **Price**: Free, all countries (or UAE + GCC first).
- **App Review notes** (paste):

  > Bahrna is a marine planning and awareness aid for boaters in UAE waters. No account or
  > login. Background location is used only after the user taps "Start trip" or starts
  > route guidance / the anchor alarm, to keep recording the track and give off-course,
  > arrival and anchor-drag alerts while the screen is locked. iOS shows the blue location
  > indicator during this time, and tracking stops when the user ends the trip. The
  > microphone and speech recognition are used only when the user asks a voice question.
  > Location data stays on the device.

Then **Add for Review** → **Submit**. Review usually takes 1–3 days.

## 5. Later: Bahrna Pro subscription

1. App Store Connect → **Business** → sign the **Paid Apps Agreement** (bank + tax).
2. Apply for the **App Store Small Business Program** (15% commission instead of 30%).
3. Create a subscription group "Bahrna Pro", yearly, 50 AED tier, with a free trial.
4. Billing through RevenueCat (one code base for Apple and Google). Safety stays free.
