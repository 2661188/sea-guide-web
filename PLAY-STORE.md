# Bahrna for Android — build, install and Google Play

The Android app is the same Bahrna code wrapped with Capacitor. Its pages are bundled
inside the app (they open with no internet); weather, tides and the optional online AI
come from the live site `https://bahrna.vercel.app/api`.

What the app adds over the website:

| Feature | Website | Android app |
|---|---|---|
| GPS while screen is off / app in background | Stops | Keeps recording during a trip, route guidance or anchor alarm (notification "Bahrna is using your location") |
| Voice input (Ask Bahrna) | Chrome's recogniser | Phone's native speech recogniser |
| Spoken answers | Browser voices | Phone's text-to-speech engine |
| Screen stays on while navigating | Wake Lock (some browsers) | Native keep-awake |

Permissions, each asked only when first needed: precise location (while using the app),
microphone, notifications (Android 13+, for the location notification). "Allow all the
time" background location is **not** requested.

## 1. Builds happen on GitHub (no computer setup)

Every push to `main` runs **Actions → Android app**. It produces:

- **Bahrna Test** APK — always. Installs next to the Play version (`ae.bahrna.app.test`),
  signed with a fixed test key so each new test build installs as an update.
  Download: repository → **Releases → "Latest test build"** → tap the `.apk` on your phone.
- **Google Play bundle (.aab) + release APK** — only after the upload-key secrets below
  are added. Download: **Actions → latest run → Artifacts → Bahrna-GooglePlay**.

To rebuild by hand: **Actions → Android app → Run workflow**.

## 2. Upload key (signing) — keep it safe

Google Play needs every upload signed with the same *upload key*. The key is **never**
stored in this repository. Add it once as repository secrets:
**Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `BAHRNA_KEYSTORE_BASE64` | the long text block in `bahrna-upload-key-SECRETS.txt` (on your PC, folder `upload-key-KEEP-PRIVATE`) |
| `BAHRNA_KEYSTORE_PASSWORD` | the password |
| `BAHRNA_KEY_ALIAS` | `bahrna-upload` |
| `BAHRNA_KEY_PASSWORD` | the same password |

Keep the `.jks` file and password in a password manager or a safe cloud folder. With
Play App Signing (the default) a lost upload key can be reset through Play support, but
it takes days.

## 3. Google Play Console (you do these steps)

1. Create a developer account at play.google.com/console (one-time fee, identity check).
   New personal accounts must run a **closed test with at least 12 testers for 14 days**
   before production.
2. **Create app** → name "Bahrna – بحرنا", default language English, App, Free.
3. **Testing → Closed testing → Create track** → upload the `.aab` → add testers' emails.
4. **App content** (each is a short form):
   - Privacy policy URL: `https://bahrna.vercel.app/privacy`
   - Ads: No ads.
   - App access: all features available without login.
   - Content rating questionnaire: reference app, no user-generated content.
   - Target audience: 18+ (or 13+), not designed for children.
   - Data safety: see section 4.
   - **Foreground service permission (location)**: explain "Records the user's boat
     trip and gives return-to-start / route guidance / anchor-drag alarm while the
     screen is off. Starts only when the user starts a trip, route guidance or anchor
     alarm; stops when they end it." Attach a short screen recording of starting a
     trip and the notification.
   - Health / financial / government: not applicable.
5. **Store listing**: texts in `store/listing.md`, icon 512×512, feature graphic
   1024×500, at least 2 phone screenshots.
6. After 14 days of closed testing: **Apply for production** → release.

Each Play upload needs a higher build number: the workflow uses the GitHub run number,
so simply push a change (or Run workflow) and upload the new `.aab`.

## 4. Data safety answers (matches the code as of v0.11, 30 Sep 2026 — check before submitting)

Checked live on 30 Sep 2026: `https://bahrna.vercel.app/api/captain` reports
`{"enabled":false}` (no AI key on the server), so **nothing personal leaves the phone**.

- **Does your app collect or share any of the required user data types? → No.**
  Trips, GPS tracks, waypoints, catches and catch photos, boat profile (incl. registration
  and emergency contact), fuel and maintenance logs all stay in the app's storage on the
  phone. Forecasts are requested for the chosen *spot*, not the GPS position. Reminders and
  alarms are local notifications (no push server). Sharing a trip or location only happens
  when the user taps Share and picks an app — that is user-initiated, not collection.
- Voice: Bahrna does not upload audio; speech-to-text is done by the phone's own speech
  service (Google on Android), stated in the privacy policy.
- Map tiles come from OpenStreetMap / Esri / OpenSeaMap / GEBCO; like any web map they see
  the device's IP address and the map area (stated in the privacy policy).
- **If you later switch on the online AI** (add `ANTHROPIC_API_KEY` on Vercel), change the
  answer to: Location → Approximate + Precise location, collected, not shared, processed
  ephemerally, optional, purpose "App functionality". Update the listing before doing so.
- Encrypted in transit: Yes (HTTPS). Account deletion: not applicable (no accounts).

## 4b. Other App content answers

| Form | Answer |
|---|---|
| Ads | No, the app has no ads |
| App access | All functionality is available without special access (no login) |
| Content rating (IARC) | Category "Reference, News, or Educational" / utility. No violence, sex, language, drugs, gambling. No user-to-user interaction or sharing of location with other users. No purchases. Expected rating: Everyone / 3+ |
| Target audience | 18 and over (boating and navigation). Not designed for children |
| News app | No |
| Health / Financial / Government | No |
| Data safety | Section 4 |
| Foreground service (location) | See section 3, step 4 — needs a short video |
| Exact alarms | Not requested (removed on purpose) |
| Photo & video permissions | Not requested (the catch photo uses the system picker) |

## 4c. Before you press "Send for review"

- The four upload-key secrets are added and the newest **Actions → Android app** run shows
  the **Bahrna-GooglePlay** artifact (the `.aab`).
- The device checklist from the v0.11 audit is done on a real phone/tablet: trip with
  screen off for 30+ min, anchor alarm notification with screen off, a reminder
  notification, microphone in Arabic and English, share sheet, dialler, catch photo.
- The foreground-service video is recorded (start a trip → notification visible → end trip).
- A public support email is set in Play Console.

This is a guide, not legal advice — you are responsible for the declarations.

## 5. Local build (optional, for developers)

Node 22, JDK 21, Android Studio:
```
npm install
npm run android:sync     # build pages + copy into android/
npm run android:icons    # icons and splash screens
cd android && gradle wrapper && ./gradlew assembleDebug
```
