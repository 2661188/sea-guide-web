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
| `BAHRNA_KEYSTORE_BASE64` | the long text from `bahrna-upload-key.base64.txt` |
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

## 4. Data safety answers (matches the code as of v0.9 — check before submitting)

- Data collected and sent off the device:
  - **Location → Approximate + Precise**: *only if the online AI is enabled on the
    server* (questions the phone cannot answer are sent with position). Processed
    ephemerally, not stored, not shared for advertising, optional, purpose "App
    functionality". If `ANTHROPIC_API_KEY` is not set on Vercel, nothing is sent and you
    can answer "No data collected".
  - Voice: Bahrna does not upload audio; speech-to-text is done by the phone's speech
    service (Google), declared in the privacy policy.
- Encrypted in transit: Yes (HTTPS). Users can delete data: Yes (clear app data /
  uninstall; nothing is kept on a server). No accounts.

This is a guide, not legal advice — you are responsible for the declarations.

## 5. Local build (optional, for developers)

Node 22, JDK 21, Android Studio:
```
npm install
npm run android:sync     # build pages + copy into android/
npm run android:icons    # icons and splash screens
cd android && gradle wrapper && ./gradlew assembleDebug
```
